/**
 * Middleware para manejar CORS (Cross-Origin Resource Sharing)
 * Controla qué dominios pueden acceder a nuestra API
 */

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

/**
 * Configurar headers de CORS para una respuesta
 * @param {Object} event - Evento de Netlify Function
 * @param {Object} headers - Headers existentes (opcional)
 * @returns {Object} Headers con CORS configurado
 */
function setCorsHeaders(event, headers = {}) {
  const origin = event.headers.origin || event.headers.Origin;
  
  // Verificar si el origen está permitido
  const isAllowed = ALLOWED_ORIGINS.includes('*') || 
                   ALLOWED_ORIGINS.includes(origin) ||
                   (process.env.NODE_ENV === 'development' && origin?.includes('localhost'));

  const corsHeaders = {
    ...headers,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400', // 24 horas
    'Vary': 'Origin'
  };

  if (isAllowed && origin) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
  } else {
    // Si no está permitido, no agregar headers de CORS
    // Esto causará que el navegador bloquee la request
  }

  return corsHeaders;
}

/**
 * Manejar preflight requests (OPTIONS)
 * @param {Object} event - Evento de Netlify Function
 * @returns {Object} Respuesta para preflight
 */
function handlePreflight(event) {
  const headers = setCorsHeaders(event);
  
  return {
    statusCode: 200,
    headers,
    body: ''
  };
}

/**
 * Validar origen de la request
 * @param {Object} event - Evento de Netlify Function
 * @returns {boolean} True si el origen está permitido
 */
function validateOrigin(event) {
  const origin = event.headers.origin || event.headers.Origin;
  
  // En desarrollo, permitir localhost
  if (process.env.NODE_ENV === 'development' && origin?.includes('localhost')) {
    return true;
  }
  
  // Verificar lista de orígenes permitidos
  return ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin);
}

/**
 * Respuesta de error por CORS
 * @param {string} message - Mensaje de error
 * @returns {Object} Respuesta de error
 */
function corsError(message = 'Origen no permitido') {
  return {
    statusCode: 403,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      error: {
        type: 'cors_error',
        message: message
      }
    })
  };
}

/**
 * Wrapper para aplicar CORS a una función
 * @param {Function} handler - Función handler original
 * @returns {Function} Handler con CORS aplicado
 */
function withCors(handler) {
  return async (event, context) => {
    // Manejar preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return handlePreflight(event);
    }

    // Validar origen (opcional, comentado para demo)
    // if (!validateOrigin(event)) {
    //   return corsError();
    // }

    try {
      // Ejecutar handler original
      const response = await handler(event, context);
      
      // Agregar headers de CORS a la respuesta
      const corsHeaders = setCorsHeaders(event, response.headers);
      
      return {
        ...response,
        headers: corsHeaders
      };
      
    } catch (error) {
      // Manejar errores con CORS
      const corsHeaders = setCorsHeaders(event);
      
      return {
        statusCode: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: {
            type: 'internal_error',
            message: 'Error interno del servidor'
          }
        })
      };
    }
  };
}

/**
 * Log de información de CORS (para debugging)
 * @param {Object} event - Evento de Netlify Function
 */
function logCorsInfo(event) {
  if (process.env.NODE_ENV === 'development') {
    const origin = event.headers.origin || event.headers.Origin;
    const method = event.httpMethod;
    
    console.log(`[CORS] ${method} request desde: ${origin || 'sin origen'}`);
    console.log(`[CORS] Orígenes permitidos:`, ALLOWED_ORIGINS);
    console.log(`[CORS] Origen válido:`, validateOrigin(event));
  }
}

module.exports = {
  setCorsHeaders,
  handlePreflight,
  validateOrigin,
  corsError,
  withCors,
  logCorsInfo,
  ALLOWED_ORIGINS
};