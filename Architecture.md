# Arquitectura de la Demo: APIs de Modelos Generativos

## Objetivo Educativo

Esta demo está diseñada para enseñar a estudiantes cómo integrar y utilizar múltiples APIs de modelos generativos de manera unificada. Se enfoca en conceptos fundamentales como:

- **Integración con múltiples proveedores** (OpenAI, Google Gemini, Anthropic Claude, Azure OpenAI)
- **Patrones de diseño** (Adapter pattern para abstraer diferencias entre APIs)
- **Streaming en tiempo real** (Server-Sent Events para experiencia tipo ChatGPT)
- **Generación de imágenes** (DALL·E 3 vía Azure OpenAI)
- **Buenas prácticas de seguridad** (manejo de claves API, CORS, rate limiting)

## Stack Tecnológico

### Frontend
- **React** con **Vite** para desarrollo rápido
- **Tailwind CSS** para estilos
- **SPA (Single Page Application)** para simplicidad

### Backend
- **Netlify Functions** (serverless)
- **JavaScript/TypeScript** para máxima portabilidad
- **Pattern Adapter** para unificar APIs

### Arquitectura Serverless
- Sin base de datos (para mantener simplicidad)
- Funciones bajo demanda
- Escalado automático
- Costo mínimo para demo

## Estructura del Proyecto

```
demo-generative-apis/
├── apps/
│   ├── web/                    # Frontend React + Vite
│   │   ├── src/
│   │   │   ├── components/     # Componentes UI
│   │   │   ├── services/       # Cliente API
│   │   │   └── App.jsx         # Componente principal de la aplicación React
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   └── api/                    # Netlify Functions
│       ├── providers/          # Adapters por proveedor
│       │   ├── openai.js       # Adapter OpenAI
│       │   ├── gemini.js       # Adapter Google Gemini
│       │   ├── anthropic.js    # Adapter Claude
│       │   ├── azure-chat.js   # Adapter Azure OpenAI (chat)
│       │   └── azure-image.js  # Adapter Azure OpenAI (imágenes)
│       │
│       ├── middlewares/        # Funciones auxiliares
│       │   ├── cors.js         # Configuración CORS
│       │   ├── ratelimit.js    # Rate limiting básico
│       │   └── validate.js     # Validación de inputs
│       │
│       ├── chat.js             # Endpoint unificado para chat
│       ├── image.js            # Endpoint para generación de imágenes
│       └── health.js           # Health check
│
├── lib/
│   └── prompts/
│       ├── system.md           # Prompts del sistema
│       └── examples.json       # Ejemplos de few-shot
│
├── netlify.toml                # Configuración Netlify
├── package.json
├── .env.example               # Plantilla variables de entorno
├── .gitignore
└── README.md
```

## APIs y Contratos Unificados

### 1. Endpoint de Chat (POST /api/chat)

**Propósito**: Unificar el acceso a modelos de texto de diferentes proveedores

```json
// Request
{
  "provider": "openai|gemini|anthropic|azure",
  "model": "gpt-4o-mini|gemini-1.5-pro|claude-3-5-sonnet|deployment-name",
  "messages": [
    {"role": "system", "content": "Eres un asistente útil"},
    {"role": "user", "content": "Explica qué es la programación"}
  ],
  "temperature": 0.7,
  "stream": true
}
```

**Response (Streaming)**:
```
Content-Type: text/event-stream
Cache-Control: no-cache

data: {"delta": "Hola"}

data: {"delta": " mundo"}

data: {"done": true}
```

**Response (No Streaming)**:
```json
{
  "content": "La programación es el proceso de crear...",
  "provider": "openai",
  "model": "gpt-4o-mini"
}
```

### 2. Endpoint de Imágenes (POST /api/image)

**Propósito**: Generar imágenes usando DALL·E 3 vía Azure OpenAI

```json
// Request
{
  "prompt": "Un gato programando en una computadora, estilo pixar",
  "size": "1024x1024",
  "quality": "standard"
}

// Response
{
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "prompt": "Un gato programando en una computadora, estilo pixar",
  "revised_prompt": "A cartoon cat typing on a computer..."
}
```

## Patrón Adapter: Abstracción de APIs

### Concepto Educativo
Cada proveedor tiene su propia API con diferentes:
- Formatos de request/response
- Esquemas de autenticación
- Manejo de streaming
- Códigos de error

Los **adapters** proporcionan una **interfaz unificada**:

```javascript
// Interfaz común para todos los providers
class BaseProvider {
  async chat({model, messages, temperature, stream, signal}) {
    // Implementación específica por proveedor
  }
}

// Ejemplo: OpenAI Adapter
class OpenAIProvider extends BaseProvider {
  async chat({model, messages, temperature = 0.7, stream = true, signal}) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        stream
      }),
      signal
    });
    
    return stream ? response.body : await response.json();
  }
}
```

## Variables de Entorno

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Google Gemini
GEMINI_API_KEY=AI...

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-...

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://mi-recurso.openai.azure.com
AZURE_OPENAI_KEY=...
AZURE_OPENAI_API_VERSION=2024-06-01
AZURE_OPENAI_DEPLOYMENT_CHAT=gpt-4o-mini
AZURE_OPENAI_DEPLOYMENT_IMAGE=dall-e-3

# Configuración de la aplicación
ALLOWED_ORIGINS=http://localhost:5173,https://mi-demo.netlify.app
NODE_ENV=development
```

## Flujo de Datos

### Chat con Streaming
1. **Frontend** → Select proveedor + modelo + prompt
2. **API Gateway** (Netlify) → `/api/chat`
3. **Middleware** → Validación + CORS + Rate Limit
4. **Adapter** → Convierte request al formato del proveedor
5. **Provider API** → Respuesta en streaming
6. **SSE Pipeline** → Convierte stream a Server-Sent Events
7. **Frontend** → Renderiza respuesta en tiempo real

### Generación de Imágenes
1. **Frontend** → Prompt + configuración
2. **API** → `/api/image`
3. **Azure Adapter** → DALL·E 3 API
4. **Response** → Base64 image data
5. **Frontend** → Renderiza imagen

## Características de Seguridad

### 1. Manejo Seguro de Claves
- **Nunca** exponer API keys al frontend
- Variables de entorno en el backend
- Validación de origen con CORS

### 2. Rate Limiting
```javascript
// Implementación básica in-memory
const rateLimiter = {
  requests: new Map(),
  
  check(ip) {
    const now = Date.now();
    const requests = this.requests.get(ip) || [];
    
    // Limpiar requests antiguos (ventana de 1 minuto)
    const recent = requests.filter(time => now - time < 60000);
    
    if (recent.length >= 10) { // Máximo 10 requests por minuto
      throw new Error('Rate limit exceeded');
    }
    
    recent.push(now);
    this.requests.set(ip, recent);
  }
};
```

### 3. Validación de Inputs
```javascript
// Esquema de validación
const chatSchema = {
  provider: ['openai', 'gemini', 'anthropic', 'azure'],
  model: 'string',
  messages: 'array',
  temperature: (val) => val >= 0 && val <= 2,
  stream: 'boolean'
};
```

## Configuración de Netlify

### netlify.toml
```toml
[build]
  command = "npm run build"
  publish = "apps/web/dist"

[functions]
  directory = "apps/api"
  node_bundler = "esbuild"
  
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

# Variables de entorno se configuran en el dashboard de Netlify
```

## Interfaz de Usuario Educativa

### Componentes Principales

1. **ProviderSelector**: Dropdown para elegir proveedor
2. **ModelSelector**: Lista de modelos disponibles por proveedor
3. **ChatInterface**: 
   - Textarea para el prompt
   - Toggle para streaming on/off
   - Área de respuesta en tiempo real
4. **ImageGenerator**:
   - Input para prompt de imagen
   - Configuración de tamaño y calidad
   - Preview de imagen generada
5. **RequestInspector**: 
   - Muestra el JSON del request (sin claves)
   - Logs de respuesta
   - Métricas (latencia, tokens, etc.)

### Valor Educativo de la UI
- **Transparencia**: Los estudiantes ven exactamente qué se envía a cada API
- **Comparación**: Pueden probar el mismo prompt en diferentes modelos
- **Experimentación**: Ajustar parámetros y ver efectos inmediatos
- **Debugging**: Inspector de requests/responses para entender el flujo

## Conceptos Educativos Cubiertos

### 1. **API Integration Patterns**
- REST APIs vs Streaming APIs
- Autenticación (API Keys, Bearer tokens)
- Headers y body formatting
- Error handling y retry logic

### 2. **Architectural Patterns**
- **Adapter Pattern**: Abstraer diferencias entre APIs
- **Middleware Pattern**: Cross-cutting concerns
- **Serverless Architecture**: Functions as a Service

### 3. **Frontend-Backend Communication**
- **Server-Sent Events (SSE)** para streaming
- **Fetch API** para requests HTTP
- **CORS** y políticas de origen
- **Estado asíncrono** en React

### 4. **Security Best Practices**
- **Environment variables** para secretos
- **Rate limiting** básico
- **Input validation** y sanitización
- **Error messages** que no exponen información sensible

### 5. **Performance Considerations**
- **Streaming** vs batch processing
- **Timeouts** y manejo de conexiones lentas
- **Caching strategies** (headers HTTP)

## Extensibilidad Future

Esta arquitectura permite agregar fácilmente:
- **Nuevos proveedores** (implementando la interfaz común)
- **Nuevos tipos de contenido** (audio, video)
- **Persistencia** (guardar conversaciones)
- **Autenticación de usuarios**
- **Métricas avanzadas**
- **Testing automatizado**

## Ventajas Pedagógicas

1. **Simplicidad**: Sin complejidad innecesaria, enfoque en conceptos core
2. **Modularidad**: Cada concepto en su propio módulo
3. **Observabilidad**: Los estudiantes pueden ver todo el flujo
4. **Experimentación**: Fácil probar y modificar
5. **Escalabilidad**: Base sólida para proyectos más complejos
6. **Industria-relevante**: Patrones y tecnologías usadas en producción

Esta arquitectura proporciona una base sólida para que tus alumnos entiendan tanto los aspectos técnicos como los conceptos de diseño involucrados en la integración con APIs de modelos generativos modernos.