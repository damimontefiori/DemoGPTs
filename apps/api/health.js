/**
 * Health Check Function - Netlify Function
 * Endpoint para verificar el estado de la API
 */

const cors = require('./middlewares/simple-cors');

/**
 * Verifica el estado de la API y los proveedores configurados
 */
exports.handler = async (event, context) => {
  // Aplicar CORS
  const corsResponse = cors(event);
  if (corsResponse) {
    return corsResponse;
  }

  // Solo permitir GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Method not allowed',
        allowed: ['GET']
      }),
    };
  }

  try {
    // Verificar variables de entorno necesarias
    const requiredEnvVars = [
      'OPENAI_API_KEY',
      'GOOGLE_API_KEY',
      'ANTHROPIC_API_KEY',
      'AZURE_OPENAI_API_KEY',
      'AZURE_OPENAI_ENDPOINT'
    ];

    const envStatus = {};
    let allConfigured = true;

    requiredEnvVars.forEach(envVar => {
      const isConfigured = !!process.env[envVar];
      envStatus[envVar] = isConfigured ? 'configured' : 'missing';
      if (!isConfigured) {
        allConfigured = false;
      }
    });

    // Verificar conectividad básica
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();

    const healthData = {
      status: allConfigured ? 'healthy' : 'degraded',
      timestamp,
      uptime: Math.floor(uptime),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      providers: {
        openai: envStatus.OPENAI_API_KEY === 'configured',
        gemini: envStatus.GOOGLE_API_KEY === 'configured',
        anthropic: envStatus.ANTHROPIC_API_KEY === 'configured',
        azure: envStatus.AZURE_OPENAI_API_KEY === 'configured' && 
               envStatus.AZURE_OPENAI_ENDPOINT === 'configured'
      },
      endpoints: {
        chat: '/api/chat',
        image: '/api/image',
        health: '/api/health'
      }
    };

    // Si en modo debug, incluir más detalles
    if (process.env.DEBUG_MODE === 'true') {
      healthData.debug = {
        envVars: envStatus,
        netlifyContext: {
          functionName: context.functionName,
          functionVersion: context.functionVersion,
          memoryLimitInMB: context.memoryLimitInMB,
          timeRemaining: context.getRemainingTimeInMillis()
        }
      };
    }

    return {
      statusCode: allConfigured ? 200 : 206,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(healthData, null, 2),
    };

  } catch (error) {
    console.error('Health check failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        status: 'error',
        message: 'Health check failed',
        timestamp: new Date().toISOString(),
        error: process.env.DEBUG_MODE === 'true' ? error.message : 'Internal server error'
      }),
    };
  }
};