/**
 * Adapter para Azure OpenAI DALL·E 3 (Generación de Imágenes)
 * Maneja específicamente la generación de imágenes via Azure OpenAI
 */
class AzureImageProvider {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.AZURE_OPENAI_KEY;
    this.endpoint = config.endpoint || process.env.AZURE_OPENAI_ENDPOINT;
    this.apiVersion = config.apiVersion || process.env.AZURE_OPENAI_API_VERSION || '2024-06-01';
    this.deployment = config.deployment || process.env.AZURE_OPENAI_DEPLOYMENT_IMAGE || 'dall-e-3';
    this.timeoutMs = config.timeoutMs || 120000; // 2 minutos para imágenes
    
    if (!this.apiKey || !this.endpoint) {
      throw new Error('Azure OpenAI API key y endpoint son requeridos');
    }
    
    // Asegurar que endpoint termine sin slash
    this.endpoint = this.endpoint.replace(/\/$/, '');
  }

  /**
   * Generar imagen usando DALL·E 3 en Azure
   */
  async generateImage({ prompt, size = '1024x1024', quality = 'standard', signal }) {
    this.validateParams({ prompt, size, quality });
    this.debug('Generando imagen con Azure DALL·E 3', { prompt: prompt.slice(0, 50), size, quality });

    const controller = this.createTimeoutController(signal);
    
    const requestBody = {
      prompt,
      size,
      quality,
      n: 1, // DALL·E 3 solo permite 1 imagen por request
      response_format: 'b64_json' // Recibir como base64
    };

    try {
      const url = `${this.endpoint}/openai/deployments/${this.deployment}/images/generations?api-version=${this.apiVersion}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
          'User-Agent': 'Demo-Generative-APIs/1.0'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!response.ok) {
        throw await this.handleError(response);
      }

      const data = await response.json();
      const imageData = data.data[0];
      
      return {
        image: `data:image/png;base64,${imageData.b64_json}`,
        prompt: prompt,
        revised_prompt: imageData.revised_prompt || prompt,
        size: size,
        quality: quality
      };

    } catch (error) {
      this.debug('Error generando imagen', { error: error.message });
      
      if (error.name === 'AbortError') {
        throw new Error('Generación de imagen cancelada por timeout');
      }
      
      throw error;
    }
  }

  /**
   * Validar parámetros de generación de imagen
   */
  validateParams({ prompt, size, quality }) {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('El prompt es requerido y debe ser un string');
    }

    if (prompt.length < 1) {
      throw new Error('El prompt no puede estar vacío');
    }

    if (prompt.length > 4000) {
      throw new Error('El prompt no puede tener más de 4000 caracteres');
    }

    const validSizes = ['1024x1024', '1792x1024', '1024x1792'];
    if (!validSizes.includes(size)) {
      throw new Error(`Tamaño no válido: ${size}. Tamaños disponibles: ${validSizes.join(', ')}`);
    }

    const validQualities = ['standard', 'hd'];
    if (!validQualities.includes(quality)) {
      throw new Error(`Calidad no válida: ${quality}. Calidades disponibles: ${validQualities.join(', ')}`);
    }
  }

  /**
   * Crear controller para timeout
   */
  createTimeoutController(externalSignal) {
    const controller = new AbortController();
    
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    if (externalSignal) {
      externalSignal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        controller.abort();
      });
    }

    controller.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    });

    return controller;
  }

  /**
   * Manejar errores de la API
   */
  async handleError(response) {
    let errorMessage = `Error ${response.status}`;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
    } catch (e) {
      errorMessage = response.statusText || errorMessage;
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.provider = 'AzureImageProvider';
    
    return error;
  }

  /**
   * Debug logging
   */
  debug(message, data = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AzureImageProvider] ${message}`, data);
    }
  }
}

module.exports = { AzureImageProvider };