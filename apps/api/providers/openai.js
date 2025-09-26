const { BaseProvider } = require('./base');

/**
 * Adapter para OpenAI GPT models
 * Implementa la interfaz común para acceder a la API de OpenAI
 */
class OpenAIProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key es requerida');
    }
  }

  /**
   * Implementación del chat para OpenAI
   */
  async chat({ model, messages, temperature = 0.7, stream = true, signal }) {
    this.validateParams({ model, messages, temperature });
    this.debug('Enviando request a OpenAI', { model, messageCount: messages.length, stream });

    const controller = this.createTimeoutController(signal);
    
    const requestBody = {
      model,
      messages: this.formatMessages(messages),
      temperature,
      stream,
      max_tokens: 2000, // Límite razonable para demo
      user: 'demo-student' // Identificador para tracking
    };

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          ...this.getBaseHeaders(),
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!response.ok) {
        throw await this.handleError(response);
      }

      if (stream) {
        // Retornar el ReadableStream para streaming
        return response.body;
      } else {
        // Respuesta completa
        const data = await response.json();
        return {
          content: data.choices[0]?.message?.content || '',
          model: data.model,
          usage: data.usage
        };
      }

    } catch (error) {
      this.debug('Error en OpenAI request', { error: error.message });
      
      if (error.name === 'AbortError') {
        throw new Error('Request cancelado por timeout');
      }
      
      throw error;
    }
  }

  /**
   * OpenAI usa el formato estándar, no necesita transformación
   */
  formatMessages(messages) {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Procesar stream de OpenAI para convertir a formato común
   * @param {ReadableStream} stream - Stream de OpenAI
   * @returns {AsyncGenerator} Generador de chunks normalizados
   */
  static async *processStream(stream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              yield { done: true };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices[0]?.delta?.content;
              
              if (delta) {
                yield { delta };
              }
            } catch (e) {
              // Ignorar líneas que no son JSON válido
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Validar que el modelo esté disponible
   * @param {string} model - Nombre del modelo
   */
  validateModel(model) {
    const validModels = [
      'gpt-4o',
      'gpt-4o-mini', 
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo'
    ];

    if (!validModels.includes(model)) {
      throw new Error(`Modelo OpenAI no válido: ${model}. Modelos disponibles: ${validModels.join(', ')}`);
    }
  }
}

module.exports = { OpenAIProvider };