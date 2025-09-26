const { BaseProvider } = require('./BaseProvider');

/**
 * Adapter para Azure OpenAI (Chat)
 * Implementa la interfaz común para acceder a Azure OpenAI Service
 */
class AzureChatProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.AZURE_OPENAI_KEY;
    this.endpoint = config.endpoint || process.env.AZURE_OPENAI_ENDPOINT;
    this.apiVersion = config.apiVersion || process.env.AZURE_OPENAI_API_VERSION || '2024-06-01';
    
    if (!this.apiKey || !this.endpoint) {
      throw new Error('Azure OpenAI API key y endpoint son requeridos');
    }
    
    // Asegurar que endpoint termine sin slash
    this.endpoint = this.endpoint.replace(/\/$/, '');
  }

  /**
   * Implementación del chat para Azure OpenAI
   */
  async chat({ model, messages, temperature = 0.7, stream = true, signal }) {
    this.validateParams({ model, messages, temperature });
    this.debug('Enviando request a Azure OpenAI', { model, messageCount: messages.length, stream });

    const controller = this.createTimeoutController(signal);
    
    // En Azure, "model" es en realidad el deployment name
    const deploymentName = model;
    
    const requestBody = {
      messages: this.formatMessages(messages),
      temperature,
      max_tokens: 2000,
      stream,
      user: 'demo-student'
    };

    try {
      const url = `${this.endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${this.apiVersion}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.getBaseHeaders(),
          'api-key': this.apiKey
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
      this.debug('Error en Azure OpenAI request', { error: error.message });
      
      if (error.name === 'AbortError') {
        throw new Error('Request cancelado por timeout');
      }
      
      throw error;
    }
  }

  /**
   * Azure OpenAI usa el mismo formato que OpenAI
   */
  formatMessages(messages) {
    return messages
      .filter(msg => !msg.isError) // Filtrar mensajes de error
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));
  }

  /**
   * Procesar stream de Azure OpenAI (mismo formato que OpenAI)
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
   * Validar deployment name (en Azure no validamos modelos específicos)
   */
  validateModel(deploymentName) {
    if (!deploymentName || typeof deploymentName !== 'string') {
      throw new Error('Deployment name es requerido para Azure OpenAI');
    }
    
    if (deploymentName.length < 1 || deploymentName.length > 64) {
      throw new Error('Deployment name debe tener entre 1 y 64 caracteres');
    }
  }
}

module.exports = { AzureChatProvider };