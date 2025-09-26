// Configuración base de la API
const API_BASE_URL = import.meta.env.DEV 
  ? 'http://localhost:8888/.netlify/functions' 
  : '/.netlify/functions';

const API_ENDPOINTS = {
  chat: `${API_BASE_URL}/chat`,
  image: `${API_BASE_URL}/image`, 
  health: `${API_BASE_URL}/health`
};

// Clase para manejar errores de API
export class APIError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.details = details;
  }
}

// Servicio principal de la API
export class APIService {
  
  /**
   * Enviar mensaje de chat con streaming opcional
   */
  static async sendChatMessage({ provider, messages, options = {}, streaming = true }) {
    const requestData = {
      provider,
      messages,
      options: {
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2000,
        ...options
      },
      streaming
    };

    const startTime = Date.now();

    try {
      const response = await fetch(API_ENDPOINTS.chat, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
        throw new APIError(
          error.message || 'Error en la solicitud',
          response.status,
          error
        );
      }

      // Si es streaming, devolver el stream
      if (streaming) {
        return {
          stream: response.body,
          requestData,
          startTime
        };
      }

      // Si no es streaming, devolver JSON
      const data = await response.json();
      return {
        data,
        requestData,
        latency: Date.now() - startTime
      };

    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      throw new APIError(
        'Error de conexión con la API',
        0,
        { originalError: error.message }
      );
    }
  }

  /**
   * Leer stream de Server-Sent Events
   */
  static async *readStreamingResponse(stream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Decodificar chunk y agregarlo al buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Procesar líneas completas del buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Guardar línea incompleta

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remover "data: "
            
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              
              // Manejar diferentes tipos de eventos SSE
              switch (parsed.type) {
                case 'content':
                  yield {
                    type: 'content',
                    content: parsed.delta || parsed.content || '',
                    provider: parsed.provider
                  };
                  break;
                case 'metadata':
                  yield {
                    type: 'metadata',
                    metadata: parsed.metadata,
                    provider: parsed.provider
                  };
                  break;
                case 'error':
                  yield {
                    type: 'error',
                    error: parsed.error,
                    provider: parsed.provider
                  };
                  break;
                case 'done':
                  yield {
                    type: 'done',
                    metadata: parsed.metadata,
                    provider: parsed.provider
                  };
                  return;
                default:
                  // Formato legacy o desconocido
                  yield parsed;
              }
            } catch (e) {
              // Ignorar líneas que no son JSON válido
              console.warn('Línea SSE inválida:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Generar imagen con múltiples proveedores
   */
  static async generateImage({ provider, prompt, options = {} }) {
    const requestData = { 
      provider,
      prompt, 
      options: {
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
        n: options.n || 1,
        responseFormat: options.responseFormat || 'url',
        returnBase64: options.returnBase64 || false,
        ...options
      }
    };
    
    const startTime = Date.now();

    try {
      const response = await fetch(API_ENDPOINTS.image, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
        throw new APIError(
          error.message || 'Error generando imagen',
          response.status,
          error
        );
      }

      const data = await response.json();
      
      return {
        data,
        requestData,
        latency: Date.now() - startTime
      };

    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      throw new APIError(
        'Error de conexión al generar imagen',
        0,
        { originalError: error.message }
      );
    }
  }

  /**
   * Health check de la API
   */
  static async checkHealth() {
    try {
      const response = await fetch(API_ENDPOINTS.health, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      throw new APIError(
        'API no disponible',
        0,
        { originalError: error.message }
      );
    }
  }
}

// Utilidades para formatear requests y logs
export const RequestUtils = {
  /**
   * Crear log de request para el inspector
   */
  createRequestLog(type, requestData, response, latency, error = null) {
    return {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      type, // 'chat', 'image', 'health'
      request: {
        ...requestData,
        // No incluir información sensible
      },
      response: error ? null : {
        status: 'success',
        data: response?.data ? Object.keys(response.data) : null
      },
      error: error ? {
        message: error.message,
        status: error.status
      } : null,
      latency: latency || 0
    };
  },

  /**
   * Formatear mensajes para diferentes proveedores
   */
  formatMessagesForProvider(messages, provider) {
    // Por ahora todos usan el mismo formato
    // En el futuro se puede personalizar por proveedor
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }
};