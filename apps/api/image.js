/**
 * Image Generation Function - Netlify Function
 * Endpoint para generación de imágenes con múltiples proveedores
 */

const cors = require('./middlewares/cors');
const rateLimit = require('./middlewares/ratelimit');
const { validateImageRequest } = require('./middlewares/validate');

// Importar adaptadores de imagen
const OpenAIProvider = require('./providers/OpenAIProvider');
const AzureImageProvider = require('./providers/AzureImageProvider');

/**
 * Factory para crear instancias de proveedores de imagen
 */
function createImageProvider(providerType, config = {}) {
  switch (providerType.toLowerCase()) {
    case 'openai':
    case 'dalle':
      return new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        ...config
      });

    case 'azure':
    case 'azure-dalle':
      return new AzureImageProvider({
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
        deployment: process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT || 'dalle-3',
        ...config
      });

    default:
      throw new Error(`Proveedor de imágenes no soportado: ${providerType}`);
  }
}

/**
 * Convierte imagen a base64 si es necesario
 */
async function processImageResponse(response, returnBase64 = false) {
  if (!response.images || response.images.length === 0) {
    throw new Error('No se generaron imágenes');
  }

  const processedImages = await Promise.all(
    response.images.map(async (image, index) => {
      const imageData = {
        index,
        url: image.url || null,
        revisedPrompt: image.revisedPrompt || image.revised_prompt || null,
        size: image.size || null,
        quality: image.quality || null
      };

      // Si se solicita base64 y tenemos URL, convertir
      if (returnBase64 && image.url && !image.b64_json) {
        try {
          const fetch = (await import('node-fetch')).default;
          const imageResponse = await fetch(image.url);
          const imageBuffer = await imageResponse.buffer();
          imageData.base64 = imageBuffer.toString('base64');
          imageData.mimeType = imageResponse.headers.get('content-type') || 'image/png';
        } catch (error) {
          console.warn('No se pudo convertir imagen a base64:', error.message);
          // Mantener la URL original si la conversión falla
        }
      } else if (image.b64_json) {
        imageData.base64 = image.b64_json;
        imageData.mimeType = 'image/png';
      }

      return imageData;
    })
  );

  return {
    ...response,
    images: processedImages
  };
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
    // Verificar rate limiting (más restrictivo para imágenes)
    const rateLimitResponse = await rateLimit(event, {
      windowMs: 300000, // 5 minutos
      maxRequests: 10, // 10 requests por 5 minutos
      message: 'Límite de generación de imágenes alcanzado, intenta de nuevo más tarde'
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
    const validation = validateImageRequest(requestData);
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
      prompt,
      options = {}
    } = requestData;

    // Crear instancia del proveedor
    let provider;
    try {
      provider = createImageProvider(providerType, options.providerConfig || {});
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

    // Verificar que el proveedor soporte generación de imágenes
    if (!provider.supportsImageGeneration()) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: `El proveedor ${providerType} no soporta generación de imágenes`,
          provider: providerType
        }),
      };
    }

    console.log(`Generando imagen con ${providerType}: "${prompt}"`);

    // Generar imagen
    const startTime = Date.now();
    const response = await provider.generateImage(prompt, {
      size: options.size || '1024x1024',
      quality: options.quality || 'standard',
      n: options.n || 1,
      responseFormat: options.responseFormat || 'url',
      style: options.style,
      ...options
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Procesar respuesta
    const processedResponse = await processImageResponse(response, options.returnBase64);

    // Preparar metadata
    const metadata = {
      provider: providerType,
      model: provider.getModelInfo?.()?.name || 'unknown',
      duration,
      timestamp: new Date().toISOString(),
      prompt: {
        original: prompt,
        revised: processedResponse.images[0]?.revisedPrompt || null
      },
      options: {
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
        style: options.style || null,
        n: options.n || 1
      },
      usage: response.usage || {}
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        provider: providerType,
        images: processedResponse.images,
        metadata,
        count: processedResponse.images.length
      }),
    };

  } catch (error) {
    console.error('Image generation error:', error);
    
    // Determinar tipo de error y código de estado apropiado
    let statusCode = 500;
    let errorMessage = 'Error interno del servidor';

    if (error.message.includes('quota') || error.message.includes('billing')) {
      statusCode = 402;
      errorMessage = 'Cuota o facturación agotada para este proveedor';
    } else if (error.message.includes('content policy') || error.message.includes('safety')) {
      statusCode = 400;
      errorMessage = 'El prompt viola las políticas de contenido';
    } else if (error.message.includes('rate limit')) {
      statusCode = 429;
      errorMessage = 'Límite de velocidad del proveedor alcanzado';
    } else if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      statusCode = 401;
      errorMessage = 'Error de autenticación con el proveedor';
    }

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: errorMessage,
        provider: requestData?.provider || 'unknown',
        details: process.env.DEBUG_MODE === 'true' ? {
          originalError: error.message,
          stack: error.stack
        } : undefined
      }),
    };
  }
};