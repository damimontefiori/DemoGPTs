/**
 * Chat Function - Netlify Function (Simplified)
 * Endpoint simplificado para chat sin middlewares complejos
 */

// Importar solo los adaptadores necesarios
const OpenAIProvider = require('./providers/OpenAIProvider');
const GeminiProvider = require('./providers/GeminiProvider');
const AnthropicProvider = require('./providers/AnthropicProvider');
const AzureChatProvider = require('./providers/AzureChatProvider');



/**
 * Handler principal simplificado
 */
exports.handler = async (event, context) => {
  // CORS simple
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
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
        error: 'Method not allowed'
      }),
    };
  }

  try {
    // Parsear request
    let requestData;
    try {
      requestData = JSON.parse(event.body || '{}');
    } catch (error) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'JSON inválido'
        }),
      };
    }

    // Validación básica
    if (!requestData.provider || !requestData.messages || !Array.isArray(requestData.messages)) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Se requieren "provider" y "messages"'
        }),
      };
    }

    const { 
      provider: providerType, 
      messages, 
      options = {},
      streaming = false,
      model = 'gpt-4',
      temperature = 0.7,
      maxTokens = 2000
    } = requestData;

    console.log('Processing chat request:', { providerType, messageCount: messages.length, model });

    // Crear instancia del proveedor con try-catch individual
    let provider;
    try {
      switch (providerType.toLowerCase()) {
        case 'openai':
          if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY no configurada');
          }
          provider = new OpenAIProvider({
            apiKey: process.env.OPENAI_API_KEY
          });
          break;

        case 'gemini':
          if (!process.env.GOOGLE_API_KEY) {
            throw new Error('GOOGLE_API_KEY no configurada');
          }
          provider = new GeminiProvider({
            apiKey: process.env.GOOGLE_API_KEY
          });
          break;

        case 'anthropic':
          if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY no configurada');
          }
          provider = new AnthropicProvider({
            apiKey: process.env.ANTHROPIC_API_KEY
          });
          break;

        case 'azure':
          if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
            throw new Error('Azure OpenAI no configurado');
          }
          provider = new AzureChatProvider({
            apiKey: process.env.AZURE_OPENAI_API_KEY,
            endpoint: process.env.AZURE_OPENAI_ENDPOINT,
            apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
            deployment: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-4'
          });
          break;

        default:
          throw new Error(`Proveedor no soportado: ${providerType}`);
      }
    } catch (error) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: error.message,
          provider: providerType
        }),
      };
    }

    // Llamada directa al provider sin funciones intermedias
    try {
      console.log('Calling provider with params:', { model, temperature, maxTokens });
      
      const response = await provider.chat({
        model: model,
        messages: messages,
        temperature: temperature,
        maxTokens: maxTokens,
        stream: false
      });

      console.log('Provider response received:', { hasContent: !!response.content });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          provider: providerType,
          response: response.content || response.text || '',
          metadata: response.metadata || {},
          usage: response.usage || {}
        }),
      };

    } catch (providerError) {
      console.error('Provider error:', providerError);
      
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: providerError.message,
          provider: providerType,
          details: providerError.stack
        }),
      };
    }

  } catch (error) {
    console.error('Chat function error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Error interno del servidor',
        message: error.message,
        stack: error.stack
      }),
    };
  }
};