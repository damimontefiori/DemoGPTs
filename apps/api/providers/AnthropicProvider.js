const { BaseProvider } = require('./BaseProvider');

/**
 * Adapter para Anthropic Claude models
 * Implementa la interfaz común para acceder a la API de Claude
 */
class AnthropicProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    this.baseURL = config.baseURL || 'https://api.anthropic.com/v1';
    
    if (!this.apiKey) {
      throw new Error('Anthropic API key es requerida');
    }
  }

  /**
   * Implementación del chat para Anthropic Claude
   */
  async chat({ model, messages, temperature = 0.7, stream = true, signal }) {
    this.validateParams({ model, messages, temperature });
    this.debug('Enviando request a Anthropic', { model, messageCount: messages.length, stream });

    const controller = this.createTimeoutController(signal);
    
    // Separar system prompt del resto de mensajes
    const { systemPrompt, conversationMessages } = this.formatMessages(messages);
    
    const requestBody = {
      model,
      messages: conversationMessages,
      max_tokens: 2000,
      temperature,
      stream
    };
    
    // Agregar system prompt si existe
    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }

    try {
      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          ...this.getBaseHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
          'anthropic-version': '2023-06-01'
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
        const content = data.content[0]?.text || '';
        
        return {
          content,
          model: data.model,
          usage: data.usage
        };
      }

    } catch (error) {
      this.debug('Error en Anthropic request', { error: error.message });
      
      if (error.name === 'AbortError') {
        throw new Error('Request cancelado por timeout');
      }
      
      throw error;
    }
  }

  /**
   * Convertir mensajes al formato de Anthropic
   */
  formatMessages(messages) {
    let systemPrompt = '';
    const conversationMessages = [];
    
    for (const message of messages) {
      // Filtrar mensajes de error
      if (message.isError) {
        continue;
      }
      
      if (message.role === 'system') {
        // Anthropic maneja system prompts por separado
        systemPrompt = message.content;
        continue;
      }
      
      conversationMessages.push({
        role: message.role,
        content: message.content
      });
    }
    
    return {
      systemPrompt: systemPrompt || undefined,
      conversationMessages
    };
  }

  /**
   * Procesar stream de Anthropic para convertir a formato común
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
            
            // Anthropic envía eventos especiales
            if (data === '[DONE]') {
              yield { done: true };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              
              // Manejar diferentes tipos de eventos
              switch (parsed.type) {
                case 'content_block_delta':
                  if (parsed.delta?.text) {
                    yield { delta: parsed.delta.text };
                  }
                  break;
                  
                case 'message_stop':
                  yield { done: true };
                  return;
                  
                case 'content_block_stop':
                  // Continuar procesando, pueden haber más bloques
                  break;
                  
                case 'error':
                  throw new Error(parsed.error?.message || 'Error en stream de Anthropic');
              }
              
            } catch (e) {
              // Ignorar líneas que no son JSON válido
              continue;
            }
          } else if (line.startsWith('event: ')) {
            // Anthropic también envía líneas de evento, pero las procesamos en data:
            continue;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Validar que el modelo esté disponible
   */
  validateModel(model) {
    const validModels = [
      'claude-3-5-sonnet-20240620',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      // Aliases más simples
      'claude-3-5-sonnet',
      'claude-3-opus',
      'claude-3-sonnet',
      'claude-3-haiku'
    ];

    if (!validModels.includes(model)) {
      throw new Error(`Modelo Claude no válido: ${model}. Modelos disponibles: ${validModels.join(', ')}`);
    }
  }
}

module.exports = { AnthropicProvider };