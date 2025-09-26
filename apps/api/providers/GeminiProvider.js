const { BaseProvider } = require('./BaseProvider');

/**
 * Adapter para Google Gemini models
 * Implementa la interfaz común para acceder a la API de Gemini
 */
class GeminiProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    this.baseURL = config.baseURL || 'https://generativelanguage.googleapis.com/v1beta';
    
    if (!this.apiKey) {
      throw new Error('Gemini API key es requerida');
    }
  }

  /**
   * Implementación del chat para Gemini
   */
  async chat({ model, messages, temperature = 0.7, stream = true, signal }) {
    this.validateParams({ model, messages, temperature });
    this.debug('Enviando request a Gemini', { model, messageCount: messages.length, stream });

    const controller = this.createTimeoutController(signal);
    
    // Gemini tiene un formato diferente para los mensajes
    const contents = this.formatMessages(messages);
    
    const requestBody = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: 2000,
        topP: 0.8,
        topK: 10
      }
    };

    try {
      const endpoint = stream 
        ? `${this.baseURL}/models/${model}:streamGenerateContent`
        : `${this.baseURL}/models/${model}:generateContent`;
      
      const response = await fetch(`${endpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: this.getBaseHeaders(),
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
        const content = data.candidates[0]?.content?.parts[0]?.text || '';
        
        return {
          content,
          model,
          usage: data.usageMetadata
        };
      }

    } catch (error) {
      this.debug('Error en Gemini request', { error: error.message });
      
      if (error.name === 'AbortError') {
        throw new Error('Request cancelado por timeout');
      }
      
      throw error;
    }
  }

  /**
   * Convertir mensajes al formato de Gemini
   */
  formatMessages(messages) {
    const contents = [];
    
    for (const message of messages) {
      // Filtrar mensajes de error
      if (message.isError) {
        continue;
      }
      
      // Gemini maneja system prompt de forma diferente
      if (message.role === 'system') {
        // El system prompt se puede agregar como parte del primer user message
        continue;
      }
      
      // Mapear roles
      let role = message.role;
      if (role === 'assistant') {
        role = 'model';
      }
      
      contents.push({
        role,
        parts: [{ text: message.content }]
      });
    }
    
    // Si había un system prompt, agregarlo al primer mensaje del usuario
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage && contents.length > 0 && contents[0].role === 'user') {
      const originalText = contents[0].parts[0].text;
      contents[0].parts[0].text = `${systemMessage.content}\n\nUsuario: ${originalText}`;
    }
    
    return contents;
  }

  /**
   * Procesar stream de Gemini para convertir a formato común
   */
  static async *processStream(stream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          yield { done: true };
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Gemini envía objetos JSON separados por líneas
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          try {
            const parsed = JSON.parse(trimmed);
            
            // Extraer contenido del formato de Gemini
            const candidate = parsed.candidates?.[0];
            const content = candidate?.content?.parts?.[0]?.text;
            
            if (content) {
              yield { delta: content };
            }
            
            // Verificar si terminó
            if (candidate?.finishReason) {
              yield { done: true };
              return;
            }
            
          } catch (e) {
            // Ignorar líneas que no son JSON válido
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
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-pro'
    ];

    if (!validModels.includes(model)) {
      throw new Error(`Modelo Gemini no válido: ${model}. Modelos disponibles: ${validModels.join(', ')}`);
    }
  }
}

module.exports = { GeminiProvider };