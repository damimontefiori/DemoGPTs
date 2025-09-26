/**
 * Chat Function - Netlify Function
 * Endpoint principal para interacciones de chat con múltiples proveedores de IA
 * Soporta streaming mediante Server-Sent Events (SSE)
 */

const cors = require('./middlewares/cors');
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
  return new Promise((resolve, reject) => {
    let buffer = '';
    let metadata = null;

    // Headers para SSE
    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    try {
      // Iniciar streaming
      const stream = provider.streamChat(messages, {
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2000,
        ...options
      });

      let chunks = [];
      
      stream.on('data', (chunk) => {
        chunks.push(`data: ${JSON.stringify({
          type: 'content',
          content: chunk.content || chunk.text || '',
          delta: chunk.delta || chunk.content || chunk.text || '',
          provider: provider.name
        })}\n\n`);
      });

      stream.on('metadata', (meta) => {
        metadata = meta;
        chunks.push(`data: ${JSON.stringify({
          type: 'metadata',
          metadata: meta,
          provider: provider.name
        })}\n\n`);
      });

      stream.on('error', (error) => {
        chunks.push(`data: ${JSON.stringify({
          type: 'error',
          error: error.message,
          provider: provider.name
        })}\n\n`);
        
        chunks.push(`data: ${JSON.stringify({
          type: 'done'
        })}\n\n`);
        
        reject({
          statusCode: 500,
          headers,
          body: chunks.join('')
        });
      });

      stream.on('end', () => {
        chunks.push(`data: ${JSON.stringify({
          type: 'done',
          metadata,
          provider: provider.name
        })}\n\n`);

        resolve({
          statusCode: 200,
          headers,
          body: chunks.join('')
        });
      });

    } catch (error) {
      reject({
        statusCode: 500,
        headers,
        body: `data: ${JSON.stringify({
          type: 'error',
          error: error.message
        })}\n\n`
      });
    }
  });
}

/**
 * Maneja chat sin streaming
 */
async function handleNormalChat(provider, messages, options = {}) {
  try {
    const response = await provider.chat(messages, {
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 2000,
      ...options
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      streaming = false 
    } = requestData;

    // Crear instancia del proveedor
    let provider;
    try {
      provider = createProvider(providerType, options.providerConfig || {});
    } catch (error) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message
        }),
      };
    }

    // Verificar que el proveedor esté configurado
    if (!provider.isConfigured()) {
      return {
        statusCode: 503,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: `El proveedor ${providerType} no está configurado correctamente`,
          provider: providerType
        }),
      };
    }

    // Procesar según el modo (streaming o normal)
    if (streaming) {
      return await handleStreamingChat(provider, messages, options);
    } else {
      return await handleNormalChat(provider, messages, options);
    }

  } catch (error) {
    console.error('Chat function error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Error interno del servidor',
        message: process.env.DEBUG_MODE === 'true' ? error.message : undefined
      }),
    };
  }
};