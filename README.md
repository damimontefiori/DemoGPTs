# Demo GPTs - Aplicación Educativa de APIs de IA

Una aplicación demo completa para enseñar a los estudiantes cómo integrar múltiples APIs de modelos generativos de inteligencia artificial.

## 🎯 Propósito Educativo

Esta aplicación fue diseñada específicamente para estudiantes que desean aprender:

- **Integración de APIs**: Cómo conectar con diferentes proveedores de IA
- **Arquitectura de Adaptadores**: Patrón para unificar múltiples APIs  
- **Streaming en Tiempo Real**: Server-Sent Events para respuestas dinámicas
- **Seguridad Web**: CORS, rate limiting y validación de datos
- **Desarrollo Full-Stack**: React frontend + Netlify Functions backend

## 🏗️ Arquitectura

```
Demo GPTs/
├── apps/
│   ├── web/                    # Frontend React + Vite + Tailwind
│   │   ├── src/
│   │   │   ├── components/     # Componentes UI principales
│   │   │   ├── services/       # Cliente API
│   │   │   └── styles/         # CSS y Tailwind
│   │   └── package.json
│   └── api/                    # Backend Serverless
│       ├── providers/          # Adaptadores de IA
│       ├── middlewares/        # Seguridad y validación
│       ├── *.js               # Netlify Functions
│       └── package.json
├── lib/
│   └── prompts/               # Prompts educativos
├── docs/                      # Documentación adicional
└── netlify.toml              # Configuración de despliegue
```

## � Inicio Rápido

### 1. Prerrequisitos

- Node.js 18+ instalado
- Al menos una cuenta en los proveedores de IA:
  - [OpenAI](https://platform.openai.com/) 
  - [Google AI](https://makersuite.google.com/)
  - [Anthropic](https://console.anthropic.com/)
  - [Azure OpenAI](https://azure.microsoft.com/products/ai-services/openai-service)

### 2. Instalación Completa

```bash
# 1. Clonar el proyecto
git clone <tu-repositorio>
cd DemoGPTs

# 2. Instalar dependencias raíz (Netlify CLI)
npm install

# 3. Instalar dependencias del frontend
cd apps/web
npm install

# 4. Instalar dependencias del backend  
cd ../api
npm install

# 5. Volver al directorio raíz
cd ../..
```

### 3. Configuración

```bash
# 1. Copiar archivo de ejemplo
cp .env.example .env

# 2. Editar .env con tus claves API
# Solo necesitas configurar UNA API para empezar
```

**Ejemplo de configuración mínima:**
```bash
# Elige una de estas opciones:
OPENAI_API_KEY=sk-tu-clave-aqui
# O
GEMINI_API_KEY=AIza-tu-clave-aqui  
# O
ANTHROPIC_API_KEY=sk-ant-tu-clave-aqui
```

### 4. Ejecutar en Desarrollo

```bash
# Opción 1: Netlify Dev (completo)
npm run dev
# Seleccionar: demo-generative-apis-frontend

# Opción 2: Solo frontend (desarrollo rápido)
cd apps/web && npm run dev
# Disponible en: http://localhost:5173
```

## 🚀 Despliegue en Producción

### Netlify (Recomendado)

1. **Conectar repositorio:**
   - Ve a [Netlify](https://netlify.com)
   - "New site from Git" → GitHub → Selecciona `DemoGPTs`

2. **Configuración de build:**
   ```
   Build command: cd apps/web && npm run build
   Publish directory: apps/web/dist
   Functions directory: apps/api
   ```

3. **Variables de entorno:**
   ```
   OPENAI_API_KEY=tu-clave-openai
   GOOGLE_API_KEY=tu-clave-gemini
   ANTHROPIC_API_KEY=tu-clave-anthropic
   AZURE_OPENAI_ENDPOINT=tu-endpoint-azure
   AZURE_OPENAI_API_KEY=tu-clave-azure
   ```

4. **¡Deploy automático!** 🎉

## 🔑 Variables de Entorno Requeridas

Ver `.env.example` para la lista completa de variables necesarias.

## 🚀 Deploy

Deploy automático a Netlify conectando el repositorio Git.

## 📚 Uso Educativo

Esta demo está diseñada para enseñar:

1. **Integración de APIs**: Cómo conectar diferentes servicios de IA
2. **Patrón Adapter**: Abstraer diferencias entre proveedores
3. **Streaming**: Respuestas en tiempo real tipo ChatGPT
4. **Seguridad**: Manejo seguro de API keys y rate limiting
5. **Arquitectura Serverless**: Funciones bajo demanda

## 🤝 Contribuciones

Este es un proyecto educativo. Las contribuciones son bienvenidas para mejorar la experiencia de aprendizaje.

## 📄 Licencia

MIT License - Uso educativo libre.