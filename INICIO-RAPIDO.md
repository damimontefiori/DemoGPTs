# 🚀 Guía de Inicio Rápido - Demo GPTs

## ✅ Estado de Configuración
- **OpenAI GPT-4**: ✅ Configurado
- **Google Gemini**: ✅ Configurado  
- **Anthropic Claude**: ✅ Configurado
- **Azure DALL-E**: ✅ Configurado

## 🎯 Ejecutar la Aplicación

### Opción 1: Netlify Dev (Recomendado para producción)
```bash
# Desde el directorio raíz
npm run dev
# Seleccionar: demo-generative-apis-frontend
```

### Opción 2: Frontend Solo (Para desarrollo rápido)
```bash
# Desde el directorio raíz
cd apps/web
npm run dev
# Abrir: http://localhost:5173
```

### Opción 3: Probar APIs (Script de verificación)
```bash
# Desde el directorio raíz
node test-apis.js
```

## 🔧 Endpoints Disponibles

Cuando uses Netlify Dev (puerto 8888):
- **Frontend**: http://localhost:8888
- **API Chat**: http://localhost:8888/.netlify/functions/chat
- **API Imágenes**: http://localhost:8888/.netlify/functions/image
- **Health Check**: http://localhost:8888/.netlify/functions/health

## 🧪 Probar Funcionalidades

### Chat Multi-Proveedor
1. Abre la aplicación
2. Selecciona un proveedor (OpenAI, Gemini, Claude)
3. Escribe un mensaje
4. Ve la respuesta en tiempo real con streaming

### Generación de Imágenes  
1. Ve a la sección "Generar Imagen"
2. Selecciona OpenAI o Azure
3. Describe una imagen
4. Ve el resultado generado

### Inspector de Peticiones
1. Realiza cualquier acción
2. Ve la pestaña "Inspector"
3. Examina las peticiones HTTP reales
4. Aprende la estructura de las APIs

## 🎓 Para Estudiantes

### Ejercicios Básicos
- [ ] Hacer una pregunta a cada proveedor
- [ ] Comparar las respuestas entre modelos  
- [ ] Generar una imagen con DALL-E
- [ ] Inspeccionar las peticiones HTTP

### Ejercicios Avanzados
- [ ] Experimentar con diferentes parámetros
- [ ] Observar el streaming en tiempo real
- [ ] Ver cómo se manejan los errores
- [ ] Explorar el código fuente

## 🔍 Debugging

Si algo no funciona:

1. **Verificar APIs**: `node test-apis.js`
2. **Verificar .env**: Revisar que las claves sean correctas
3. **Verificar puertos**: Asegurarse que no estén en uso
4. **Health Check**: Visitar `/health` endpoint

## 📚 Documentación Completa

- `Architecture.md` - Arquitectura técnica detallada
- `Informe_Docente.md` - Guía pedagógica para profesores
- `README.md` - Documentación general del proyecto

## ✨ ¡Todo Listo!

La aplicación está **100% funcional** con todas las APIs configuradas. 
¡Disfruta explorando las capacidades de la IA generativa! 🤖🎨