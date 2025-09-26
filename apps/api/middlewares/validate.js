/**
 * Middleware para validación de inputs
 * Valida y sanitiza los datos de entrada antes de procesarlos
 */

/**
 * Esquemas de validación para diferentes endpoints
 */
const VALIDATION_SCHEMAS = {
  chat: {
    provider: {
      type: 'string',
      required: true,
      enum: ['openai', 'gemini', 'anthropic', 'azure'],
      message: 'Provider debe ser uno de: openai, gemini, anthropic, azure'
    },
    model: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 100,
      message: 'Model es requerido y debe tener entre 1 y 100 caracteres'
    },
    messages: {
      type: 'array',
      required: true,
      minItems: 1,
      maxItems: 50,
      message: 'Messages debe ser un array con 1-50 elementos'
    },
    temperature: {
      type: 'number',
      required: false,
      min: 0,
      max: 2,
      default: 0.7,
      message: 'Temperature debe estar entre 0 y 2'
    },
    stream: {
      type: 'boolean',
      required: false,
      default: true,
      message: 'Stream debe ser un boolean'
    }
  },
  
  image: {
    prompt: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 4000,
      message: 'Prompt es requerido y debe tener entre 1 y 4000 caracteres'
    },
    size: {
      type: 'string',
      required: false,
      enum: ['1024x1024', '1792x1024', '1024x1792'],
      default: '1024x1024',
      message: 'Size debe ser uno de: 1024x1024, 1792x1024, 1024x1792'
    },
    quality: {
      type: 'string',
      required: false,
      enum: ['standard', 'hd'],
      default: 'standard',
      message: 'Quality debe ser: standard o hd'
    }
  }
};

/**
 * Validar un valor individual según su esquema
 * @param {any} value - Valor a validar
 * @param {Object} schema - Esquema de validación
 * @param {string} fieldName - Nombre del campo
 * @returns {Object} { isValid, value, error }
 */
function validateField(value, schema, fieldName) {
  // Aplicar valor por defecto si no se proporciona
  if (value === undefined || value === null) {
    if (schema.required) {
      return {
        isValid: false,
        error: `${fieldName}: ${schema.message || 'Campo requerido'}`
      };
    }
    return {
      isValid: true,
      value: schema.default
    };
  }

  // Validar tipo
  if (schema.type === 'string' && typeof value !== 'string') {
    return {
      isValid: false,
      error: `${fieldName}: debe ser un string`
    };
  }

  if (schema.type === 'number' && typeof value !== 'number') {
    return {
      isValid: false,
      error: `${fieldName}: debe ser un número`
    };
  }

  if (schema.type === 'boolean' && typeof value !== 'boolean') {
    return {
      isValid: false,
      error: `${fieldName}: debe ser un boolean`
    };
  }

  if (schema.type === 'array' && !Array.isArray(value)) {
    return {
      isValid: false,
      error: `${fieldName}: debe ser un array`
    };
  }

  // Validaciones específicas por tipo
  if (schema.type === 'string') {
    if (schema.minLength && value.length < schema.minLength) {
      return {
        isValid: false,
        error: `${fieldName}: debe tener al menos ${schema.minLength} caracteres`
      };
    }
    
    if (schema.maxLength && value.length > schema.maxLength) {
      return {
        isValid: false,
        error: `${fieldName}: no puede tener más de ${schema.maxLength} caracteres`
      };
    }
  }

  if (schema.type === 'number') {
    if (schema.min !== undefined && value < schema.min) {
      return {
        isValid: false,
        error: `${fieldName}: debe ser mayor o igual a ${schema.min}`
      };
    }
    
    if (schema.max !== undefined && value > schema.max) {
      return {
        isValid: false,
        error: `${fieldName}: debe ser menor o igual a ${schema.max}`
      };
    }
  }

  if (schema.type === 'array') {
    if (schema.minItems && value.length < schema.minItems) {
      return {
        isValid: false,
        error: `${fieldName}: debe tener al menos ${schema.minItems} elementos`
      };
    }
    
    if (schema.maxItems && value.length > schema.maxItems) {
      return {
        isValid: false,
        error: `${fieldName}: no puede tener más de ${schema.maxItems} elementos`
      };
    }
  }

  // Validar enum
  if (schema.enum && !schema.enum.includes(value)) {
    return {
      isValid: false,
      error: schema.message || `${fieldName}: ${value} no es un valor válido`
    };
  }

  return {
    isValid: true,
    value: value
  };
}

/**
 * Validar mensajes de chat específicamente
 * @param {Array} messages - Array de mensajes
 * @returns {Object} { isValid, messages, error }
 */
function validateMessages(messages) {
  if (!Array.isArray(messages)) {
    return {
      isValid: false,
      error: 'Messages debe ser un array'
    };
  }

  const validatedMessages = [];
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    
    if (!message || typeof message !== 'object') {
      return {
        isValid: false,
        error: `Message ${i}: debe ser un objeto`
      };
    }

    // Validar role
    if (!message.role || typeof message.role !== 'string') {
      return {
        isValid: false,
        error: `Message ${i}: role es requerido y debe ser un string`
      };
    }

    const validRoles = ['system', 'user', 'assistant'];
    if (!validRoles.includes(message.role)) {
      return {
        isValid: false,
        error: `Message ${i}: role debe ser uno de: ${validRoles.join(', ')}`
      };
    }

    // Validar content
    if (!message.content || typeof message.content !== 'string') {
      return {
        isValid: false,
        error: `Message ${i}: content es requerido y debe ser un string`
      };
    }

    if (message.content.length > 10000) {
      return {
        isValid: false,
        error: `Message ${i}: content no puede tener más de 10,000 caracteres`
      };
    }

    validatedMessages.push({
      role: message.role,
      content: message.content.trim()
    });
  }

  return {
    isValid: true,
    messages: validatedMessages
  };
}

/**
 * Validar datos de entrada según un esquema
 * @param {Object} data - Datos a validar
 * @param {string} schemaName - Nombre del esquema a usar
 * @returns {Object} { isValid, data, errors }
 */
function validateInput(data, schemaName) {
  const schema = VALIDATION_SCHEMAS[schemaName];
  
  if (!schema) {
    return {
      isValid: false,
      errors: [`Esquema de validación '${schemaName}' no encontrado`]
    };
  }

  const validatedData = {};
  const errors = [];

  // Validar cada campo del esquema
  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const result = validateField(data[fieldName], fieldSchema, fieldName);
    
    if (!result.isValid) {
      errors.push(result.error);
    } else {
      if (result.value !== undefined) {
        validatedData[fieldName] = result.value;
      }
    }
  }

  // Validación especial para messages
  if (schemaName === 'chat' && validatedData.messages) {
    const messageValidation = validateMessages(validatedData.messages);
    
    if (!messageValidation.isValid) {
      errors.push(messageValidation.error);
    } else {
      validatedData.messages = messageValidation.messages;
    }
  }

  return {
    isValid: errors.length === 0,
    data: validatedData,
    errors
  };
}

/**
 * Sanitizar string removiendo caracteres peligrosos
 * @param {string} str - String a sanitizar
 * @returns {string} String sanitizado
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  // Remover caracteres de control (excepto \n, \r, \t)
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Crear respuesta de error de validación
 * @param {Array} errors - Lista de errores
 * @returns {Object} Respuesta HTTP de error
 */
function validationErrorResponse(errors) {
  return {
    statusCode: 400,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      error: {
        type: 'validation_error',
        message: 'Datos de entrada no válidos',
        details: errors
      }
    })
  };
}

/**
 * Wrapper para aplicar validación a una función
 * @param {Function} handler - Función handler original
 * @param {string} schemaName - Nombre del esquema a usar
 * @returns {Function} Handler con validación aplicada
 */
function withValidation(handler, schemaName) {
  return async (event, context) => {
    try {
      // Parsear body
      let data = {};
      if (event.body) {
        try {
          data = JSON.parse(event.body);
        } catch (e) {
          return validationErrorResponse(['Body debe ser JSON válido']);
        }
      }

      // Validar datos
      const validation = validateInput(data, schemaName);
      
      if (!validation.isValid) {
        logValidation(event, validation.errors, 'INVALID');
        return validationErrorResponse(validation.errors);
      }

      // Agregar datos validados al evento
      event.validatedData = validation.data;
      
      logValidation(event, [], 'VALID');
      
      // Ejecutar handler original
      return await handler(event, context);
      
    } catch (error) {
      logValidation(event, [error.message], 'ERROR');
      throw error;
    }
  };
}

/**
 * Log de información de validación
 * @param {Object} event - Evento de Netlify Function
 * @param {Array} errors - Errores de validación
 * @param {string} status - Estado de la validación
 */
function logValidation(event, errors, status) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[VALIDATION] ${status} - ${event.path || event.httpMethod}`);
    if (errors.length > 0) {
      console.log(`[VALIDATION] Errores:`, errors);
    }
  }
}

module.exports = {
  validateInput,
  validateField,
  validateMessages,
  sanitizeString,
  validationErrorResponse,
  withValidation,
  logValidation,
  VALIDATION_SCHEMAS
};