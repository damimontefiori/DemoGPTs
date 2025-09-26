/**
 * Middleware para Rate Limiting
 * Controla la cantidad de requests por IP para prevenir abuso
 */

// Almacén in-memory para el rate limiting (en producción usar Redis o DB)
const requestStore = new Map();

// Configuración por defecto
const DEFAULT_CONFIG = {
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: parseInt(process.env.RATE_LIMIT_PER_MINUTE) || 10,
  skipSuccessfulRequests: false,
  skipFailedRequests: false
};

/**
 * Obtener IP del cliente desde el evento de Netlify
 * @param {Object} event - Evento de Netlify Function
 * @returns {string} IP del cliente
 */
function getClientIP(event) {
  // Netlify proporciona la IP en diferentes headers
  const ip = event.headers['x-forwarded-for'] ||
            event.headers['x-real-ip'] ||
            event.headers['cf-connecting-ip'] || // Cloudflare
            'unknown';
            
  // x-forwarded-for puede contener múltiples IPs, tomar la primera
  return ip.split(',')[0].trim();
}

/**
 * Limpiar requests antiguos del store
 * @param {number} windowMs - Ventana de tiempo en milisegundos
 */
function cleanupOldRequests(windowMs) {
  const now = Date.now();
  const cutoff = now - windowMs;
  
  for (const [ip, requests] of requestStore.entries()) {
    // Filtrar requests dentro de la ventana de tiempo
    const recentRequests = requests.filter(timestamp => timestamp > cutoff);
    
    if (recentRequests.length === 0) {
      requestStore.delete(ip);
    } else {
      requestStore.set(ip, recentRequests);
    }
  }
}

/**
 * Verificar si una IP ha excedido el límite
 * @param {string} ip - IP del cliente
 * @param {Object} config - Configuración del rate limit
 * @returns {Object} Resultado de la verificación
 */
function checkRateLimit(ip, config = DEFAULT_CONFIG) {
  const now = Date.now();
  const cutoff = now - config.windowMs;
  
  // Obtener requests recientes para esta IP
  const requests = requestStore.get(ip) || [];
  const recentRequests = requests.filter(timestamp => timestamp > cutoff);
  
  // Verificar si excede el límite
  const isLimited = recentRequests.length >= config.maxRequests;
  
  // Calcular tiempo hasta reset
  const oldestRequest = Math.min(...recentRequests);
  const resetTime = oldestRequest + config.windowMs;
  const retryAfter = Math.max(0, Math.ceil((resetTime - now) / 1000));
  
  return {
    isLimited,
    current: recentRequests.length,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - recentRequests.length),
    resetTime,
    retryAfter
  };
}

/**
 * Registrar un nuevo request
 * @param {string} ip - IP del cliente
 */
function recordRequest(ip) {
  const now = Date.now();
  const requests = requestStore.get(ip) || [];
  
  requests.push(now);
  requestStore.set(ip, requests);
  
  // Limpiar requests antiguos periódicamente
  if (Math.random() < 0.1) { // 10% de probabilidad
    cleanupOldRequests(DEFAULT_CONFIG.windowMs);
  }
}

/**
 * Crear respuesta de rate limit excedido
 * @param {Object} rateInfo - Información del rate limit
 * @returns {Object} Respuesta HTTP
 */
function rateLimitResponse(rateInfo) {
  return {
    statusCode: 429,
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': rateInfo.limit.toString(),
      'X-RateLimit-Remaining': rateInfo.remaining.toString(),
      'X-RateLimit-Reset': rateInfo.resetTime.toString(),
      'Retry-After': rateInfo.retryAfter.toString()
    },
    body: JSON.stringify({
      error: {
        type: 'rate_limit_exceeded',
        message: 'Demasiadas solicitudes. Intenta nuevamente en unos momentos.',
        limit: rateInfo.limit,
        current: rateInfo.current,
        retryAfter: rateInfo.retryAfter
      }
    })
  };
}

/**
 * Agregar headers de rate limit a una respuesta
 * @param {Object} response - Respuesta original
 * @param {Object} rateInfo - Información del rate limit
 * @returns {Object} Respuesta con headers de rate limit
 */
function addRateLimitHeaders(response, rateInfo) {
  return {
    ...response,
    headers: {
      ...(response.headers || {}),
      'X-RateLimit-Limit': rateInfo.limit.toString(),
      'X-RateLimit-Remaining': rateInfo.remaining.toString(),
      'X-RateLimit-Reset': rateInfo.resetTime.toString()
    }
  };
}

/**
 * Wrapper para aplicar rate limiting a una función
 * @param {Function} handler - Función handler original
 * @param {Object} config - Configuración del rate limit
 * @returns {Function} Handler con rate limiting aplicado
 */
function withRateLimit(handler, config = DEFAULT_CONFIG) {
  return async (event, context) => {
    const ip = getClientIP(event);
    
    // Verificar rate limit
    const rateInfo = checkRateLimit(ip, config);
    
    if (rateInfo.isLimited) {
      logRateLimit(ip, rateInfo, 'BLOCKED');
      return rateLimitResponse(rateInfo);
    }
    
    // Registrar el request
    recordRequest(ip);
    
    try {
      // Ejecutar handler original
      const response = await handler(event, context);
      
      // Agregar headers de rate limit
      const responseWithHeaders = addRateLimitHeaders(response, {
        ...rateInfo,
        remaining: rateInfo.remaining - 1
      });
      
      logRateLimit(ip, rateInfo, 'ALLOWED');
      return responseWithHeaders;
      
    } catch (error) {
      // En caso de error, el request ya fue contado
      logRateLimit(ip, rateInfo, 'ERROR');
      throw error;
    }
  };
}

/**
 * Log de información de rate limiting
 * @param {string} ip - IP del cliente
 * @param {Object} rateInfo - Información del rate limit
 * @param {string} action - Acción tomada (ALLOWED, BLOCKED, ERROR)
 */
function logRateLimit(ip, rateInfo, action) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[RATE_LIMIT] ${action} - IP: ${ip}, Current: ${rateInfo.current}/${rateInfo.limit}, Remaining: ${rateInfo.remaining}`);
  }
}

/**
 * Obtener estadísticas del rate limiting
 * @returns {Object} Estadísticas actuales
 */
function getRateLimitStats() {
  const stats = {
    totalIPs: requestStore.size,
    totalRequests: 0,
    topIPs: []
  };
  
  const ipCounts = [];
  
  for (const [ip, requests] of requestStore.entries()) {
    const count = requests.length;
    stats.totalRequests += count;
    ipCounts.push({ ip, count });
  }
  
  // Ordenar por número de requests
  stats.topIPs = ipCounts
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
    
  return stats;
}

/**
 * Limpiar manualmente el store (para testing o mantenimiento)
 */
function clearRateLimitStore() {
  requestStore.clear();
}

module.exports = {
  withRateLimit,
  checkRateLimit,
  recordRequest,
  getClientIP,
  rateLimitResponse,
  addRateLimitHeaders,
  getRateLimitStats,
  clearRateLimitStore,
  logRateLimit,
  DEFAULT_CONFIG
};