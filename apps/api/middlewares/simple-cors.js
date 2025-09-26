/**
 * Middleware CORS simple para Netlify Functions
 */

function cors(event) {
  // Manejar preflight requests (OPTIONS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }
  
  // Para otros métodos, no devolver nada (continuar con la función)
  return null;
}

module.exports = cors;