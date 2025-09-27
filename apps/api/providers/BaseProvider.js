/**
 * Clase base para todos los proveedores de IA
 * Define la interfaz común que deben implementar todos los adapters
 */
class BaseProvider {
  constructor(config = {}) {
    this.config = config;
    this.timeoutMs = config.timeoutMs || 60000; // 60 segundos por defecto
  }

  /**
   * Método principal para enviar mensajes de chat
   * @param {Object} params - Parámetros del chat
   * @param {string} params.model - Nombre del modelo
   * @param {Array} params.messages - Array de mensajes {role, content}
   * @param {number} params.temperature - Creatividad (0-2)
   * @param {boolean} params.stream - Si usar streaming
   * @param {AbortSignal} params.signal - Señal para cancelar request
   * @returns {Promise<ReadableStream|Object>} Stream o respuesta completa
   */
  async chat({ model, messages, temperature = 0.7, stream = true, signal }) {
    throw new Error('El método chat() debe ser implementado por cada proveedor');
  }

  /**
   * Filtrar mensajes válidos (sin errores y con contenido)
   * @param {Array} messages - Mensajes sin filtrar
   * @returns {Array} Mensajes válidos
   */
  filterValidMessages(messages) {
    return messages.filter(msg => 
      !msg.isError && 
      msg.content !== undefined && 
      msg.content !== null && 
      msg.content.toString().trim() !== ''
    );
  }

  /**
   * Normalizar mensajes al formato del proveedor
   * @param {Array} messages - Mensajes en formato estándar
   * @returns {Array} Mensajes en formato específico del proveedor
   */
  formatMessages(messages) {
    // Implementación por defecto: mantener formato estándar
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Crear headers HTTP comunes
   * @returns {Object} Headers base
   */
  getBaseHeaders() {
    return {
      'Content-Type': 'application/json',
      'User-Agent': 'Demo-Generative-APIs/1.0'
    };
  }

  /**
   * Manejar errores de la API
   * @param {Response} response - Respuesta HTTP
   * @returns {Error} Error formateado
   */
  async handleError(response) {
    let errorMessage = `Error ${response.status}`;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
    } catch (e) {
      // Si no se puede parsear como JSON, usar status text
      errorMessage = response.statusText || errorMessage;
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.provider = this.constructor.name;
    
    return error;
  }

  /**
   * Crear controller para timeout
   * @param {AbortSignal} externalSignal - Señal externa opcional
   * @returns {AbortController} Controller con timeout
   */
  createTimeoutController(externalSignal) {
    const controller = new AbortController();
    
    // Timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    // Si hay señal externa, propagar abort
    if (externalSignal) {
      externalSignal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        controller.abort();
      });
    }

    // Limpiar timeout cuando se complete
    controller.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    });

    return controller;
  }

  /**
   * Validar parámetros comunes
   * @param {Object} params - Parámetros a validar
   */
  validateParams(params) {
    if (!params.model) {
      throw new Error('El parámetro "model" es requerido');
    }

    if (!Array.isArray(params.messages) || params.messages.length === 0) {
      throw new Error('El parámetro "messages" debe ser un array no vacío');
    }

    if (params.temperature !== undefined && (params.temperature < 0 || params.temperature > 2)) {
      throw new Error('El parámetro "temperature" debe estar entre 0 y 2');
    }

    // Filtrar mensajes válidos antes de validar
    const validMessages = this.filterValidMessages(params.messages);
    
    if (validMessages.length === 0) {
      throw new Error('No hay mensajes válidos para procesar');
    }

    // Validar que todos los mensajes válidos tengan role y content
    validMessages.forEach((msg, index) => {
      if (!msg.role || !msg.content) {
        throw new Error(`Mensaje ${index}: debe tener "role" y "content"`);
      }
    });
  }

  /**
   * Log de debugging (solo en desarrollo)
   * @param {string} message - Mensaje a loggear
   * @param {Object} data - Datos adicionales
   */
  debug(message, data = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.constructor.name}] ${message}`, data);
    }
  }
}

module.exports = { BaseProvider };