# 🚀 Guía de Despliegue en Netlify

## Paso 1: Crear Repositorio en GitHub

1. Ve a [GitHub.com](https://github.com/new)
2. Crea un repositorio con el nombre: `DemoGPTs`
3. Descripción: `Demo educativo para integración con APIs de modelos generativos de IA`
4. Selecciona **Público**
5. **NO** marques "Initialize with README"
6. Clic en "Create repository"

## Paso 2: Subir Código a GitHub

Una vez creado el repositorio, ejecuta:

```bash
# Ya tienes el código preparado, solo falta el push
git push -u origin master
```

## Paso 3: Configurar Netlify

### 3.1 Conectar con GitHub
1. Ve a [Netlify.com](https://netlify.com) e inicia sesión
2. Clic en "New site from Git"
3. Selecciona "GitHub"
4. Busca y selecciona tu repositorio `DemoGPTs`

### 3.2 Configuración de Build
```
Site name: demo-gpts-[tu-usuario]
Branch to deploy: master
Build command: cd apps/web && npm run build
Publish directory: apps/web/dist
Functions directory: apps/api
```

### 3.3 Variables de Entorno
Ve a Site Settings → Environment Variables y agrega:

```bash
# OpenAI
OPENAI_API_KEY=tu-clave-openai-aqui

# Gemini  
GOOGLE_API_KEY=tu-clave-gemini-aqui
GEMINI_API_KEY=tu-clave-gemini-aqui

# Anthropic
ANTHROPIC_API_KEY=tu-clave-anthropic-aqui

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://tu-recurso.openai.azure.com
AZURE_OPENAI_API_KEY=tu-clave-azure-aqui
AZURE_OPENAI_KEY=tu-clave-azure-aqui
AZURE_OPENAI_API_VERSION=2024-02-01
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4
AZURE_OPENAI_IMAGE_DEPLOYMENT=dall-e-3

# Configuración adicional
NODE_ENV=production
ALLOWED_ORIGINS=https://tu-sitio.netlify.app
DEBUG_MODE=false
```

## Paso 4: Desplegar

1. Clic en "Deploy site"
2. Netlify construirá automáticamente tu aplicación
3. Una vez completado, tendrás una URL como: `https://amazing-site-name.netlify.app`

## Paso 5: Verificar Funcionamiento

### 5.1 Health Check
Visita: `https://tu-sitio.netlify.app/.netlify/functions/health`

Deberías ver algo como:
```json
{
  "status": "healthy",
  "providers": {
    "openai": true,
    "gemini": true,
    "anthropic": true,
    "azure": true
  }
}
```

### 5.2 Probar Funcionalidades
1. **Chat**: Selecciona un proveedor y envía un mensaje
2. **Imágenes**: Genera una imagen con DALL-E
3. **Inspector**: Ve las peticiones HTTP en tiempo real

## Troubleshooting

### ❌ Error: "Function not found"
- Verifica que `Functions directory` esté configurado como `apps/api`

### ❌ Error: "Build failed"
- Verifica que `Build command` sea: `cd apps/web && npm run build`
- Verifica que `Publish directory` sea: `apps/web/dist`

### ❌ Error: "API not configured"
- Verifica las variables de entorno en Netlify
- Usa el health check para diagnosticar

### ❌ Error de CORS
- Agrega tu dominio de Netlify a `ALLOWED_ORIGINS`
- Formato: `https://tu-sitio.netlify.app`

## 🎉 ¡Listo!

Una vez configurado, tu aplicación estará disponible globalmente y podrás:

- Compartir la URL con tus estudiantes
- Usar todas las funcionalidades de IA
- Tener actualizaciones automáticas cuando hagas push a GitHub
- Monitorear el uso desde el dashboard de Netlify

## URLs Importantes

- **Aplicación**: `https://tu-sitio.netlify.app`
- **Health Check**: `https://tu-sitio.netlify.app/.netlify/functions/health`
- **Dashboard Netlify**: `https://app.netlify.com/sites/tu-sitio`
- **Repositorio GitHub**: `https://github.com/damidepadua/DemoGPTs`