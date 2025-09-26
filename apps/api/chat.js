/**
 * Versión simplificada para debugging del error 502
 */

const cors = require('./middlewares/simple-cors');

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Method not allowed',
        allowed: ['POST']
      }),
    };
  }

  try {
    // Parsear request
    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (error) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'JSON inválido',
          details: error.message
        }),
      };
    }

    // Log básico
    console.log('Debug chat request:', JSON.stringify(requestData, null, 2));

    // Respuesta de prueba exitosa
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        debug: true,
        receivedData: requestData,
        provider: requestData.provider || 'unknown',
        messageCount: Array.isArray(requestData.messages) ? requestData.messages.length : 0
      }),
    };

  } catch (error) {
    console.error('Debug chat error:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Error en función de debug',
        message: error.message,
        stack: error.stack
      }),
    };
  }
};