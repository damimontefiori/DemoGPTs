/**
 * Chat Function - Netlify Function
 * Endpoint principal para interacciones de chat con múltiples proveedores de IA
 * Soporta streaming mediante Server-Sent Events (SSE)
 */

const cors = require('./middlewares/simple-cors');
const rateLimit = require('./middlewares/ratelimit');
const { validateChatRequest } = require('./middlewares/validate');

// Importar todos los adaptadores
const OpenAIProvider = require('./providers/OpenAIProvider');
const GeminiProvider = require('./providers/GeminiProvider');
const AnthropicProvider = require('./providers/AnthropicProvider');
const AzureChatProvider = require('./providers/AzureChatProvider');

/**
 * Factory para crear instancias de proveedores
 */
function createProvider(providerType, config = {}) {
  switch (providerType.toLowerCase()) {
    case 'openai':
      return new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        ...config
      });

    case 'gemini':
      return new GeminiProvider({
        apiKey: process.env.GOOGLE_API_KEY,
        ...config
      });

    case 'anthropic':
      return new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY,
        ...config
      });

    case 'azure':
      return new AzureChatProvider({
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
        deployment: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-4',
        ...config
      });

    default:
      throw new Error(`Proveedor no soportado: ${providerType}`);
  }
}

/**
 * Maneja streaming mediante Server-Sent Events
 */
async function handleStreamingChat(provider, messages, options = {}) {
  // Por ahora, para simplificar y evitar errores 502, vamos a usar respuesta no-streaming
  // pero formateada como Server-Sent Events
  
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    // Usar respuesta no-streaming por ahora
    const response = await provider.chat({
      model: options.model || 'gpt-4',
      messages: messages,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 2000,
      stream: false,
      ...options
    });

    const chunks = [];
    
    // Simular streaming enviando la respuesta completa
    chunks.push(`data: ${JSON.stringify({
      type: 'content',
      content: response.content || response.text || '',
      delta: response.content || response.text || '',
      provider: provider.name
    })}\n\n`);

    chunks.push(`data: ${JSON.stringify({
      type: 'done',
      metadata: response.metadata || {},
      provider: provider.name
    })}\n\n`);

    return {
      statusCode: 200,
      headers,
      body: chunks.join('')
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: `data: ${JSON.stringify({
        type: 'error',
        error: error.message
      })}\n\n`
    };
  }
}

/**
 * Maneja chat sin streaming
 */
async function handleNormalChat(provider, messages, options = {}) {
  try {
    const response = await provider.chat({
      model: options.model || 'gpt-4',
      messages: messages,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 2000,
      stream: false,
      ...options
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        provider: provider.name,
        response: response.content || response.text,
        metadata: response.metadata || {},
        usage: response.usage || {}
      }),
    };

  } catch (error) {
    console.error(`Chat error with ${provider.name}:`, error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        provider: provider.name
      }),
    };
  }
}

/**
 * Handler principal
 */
exports.handler = async (event, context) => {
  // Aplicar CORS
  const corsResponse = cors(event);
  if (corsResponse) {
    return corsResponse;
  }

  // Solo permitir POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Method not allowed',
        allowed: ['POST']
      }),
    };
  }

  try {
    // Verificar rate limiting
    const rateLimitResponse = await rateLimit(event, {
      windowMs: 60000, // 1 minuto
      maxRequests: 30, // 30 requests por minuto
      message: 'Demasiadas solicitudes, intenta de nuevo más tarde'
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parsear y validar request
    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (error) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'JSON inválido en el cuerpo de la solicitud'
        }),
      };
    }

    // Validar estructura de datos
    const validation = validateChatRequest(requestData);
    if (!validation.isValid) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Datos de solicitud inválidos',
          details: validation.errors
        }),
      };
    }

    const { 
      provider: providerType, 
      messages, 
      options = {},
      streaming = false,
      model,
      temperature,
      maxTokens
    } = requestData;

    // Combinar parámetros del nivel superior con options
    const finalOptions = {
      ...options,
      ...(model && { model }),
      ...(temperature && { temperature }),
      ...(maxTokens && { maxTokens })
    };

    // Crear instancia del proveedor
    let provider;
    try {
      provider = createProvider(providerType, finalOptions.providerConfig || {});
    } catch (error) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: error.message
        }),
      };
    }

    // Verificar que el proveedor esté configurado
    if (!provider.isConfigured()) {
      return {
        statusCode: 503,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: `El proveedor ${providerType} no está configurado correctamente`,
          provider: providerType
        }),
      };
    }

    // Procesar según el modo (streaming o normal)
    if (streaming) {
      return await handleStreamingChat(provider, messages, finalOptions);
    } else {
      return await handleNormalChat(provider, messages, finalOptions);
    }

  } catch (error) {
    console.error('Chat function error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request data:', JSON.stringify(requestData, null, 2));
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Error interno del servidor',
        message: error.message, // Siempre mostrar el mensaje para debugging
        details: {
          type: error.constructor.name,
          stack: error.stack
        }
      }),
    };
  }
};