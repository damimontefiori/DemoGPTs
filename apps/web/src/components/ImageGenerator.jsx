import { useState } from 'react'
import { APIService, RequestUtils } from '../services/api'

const IMAGE_SIZES = [
  { value: '1024x1024', label: '1024×1024 (Cuadrado)' },
  { value: '1792x1024', label: '1792×1024 (Paisaje)' },
  { value: '1024x1792', label: '1024×1792 (Retrato)' }
]

const IMAGE_QUALITIES = [
  { value: 'standard', label: 'Estándar', description: 'Calidad normal, más rápido' },
  { value: 'hd', label: 'HD', description: 'Alta calidad, más detallado' }
]

function ImageGenerator({ onRequestLog }) {
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState('1024x1024')
  const [quality, setQuality] = useState('standard')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState([])

  const generateImage = async () => {
    if (!prompt.trim() || isGenerating) return

    setIsGenerating(true)
    const startTime = Date.now()

    try {
      const { data, requestData, latency } = await APIService.generateImage({
        prompt: prompt.trim(),
        size,
        quality
      })

      // Crear objeto de imagen para mostrar
      const imageResult = {
        id: Date.now(),
        prompt: prompt.trim(),
        revised_prompt: data.revised_prompt,
        image: data.image,
        size,
        quality,
        timestamp: new Date().toISOString(),
        latency
      }

      // Agregar al inicio de la lista
      setGeneratedImages(prev => [imageResult, ...prev.slice(0, 4)]) // Mantener solo 5 imágenes

      // Log del request
      const log = RequestUtils.createRequestLog('image', requestData, data, latency)
      onRequestLog(log)

      // Limpiar prompt
      setPrompt('')

    } catch (error) {
      console.error('Error generando imagen:', error)

      // Log del error
      const log = RequestUtils.createRequestLog(
        'image',
        { prompt, size, quality },
        null,
        Date.now() - startTime,
        error
      )
      onRequestLog(log)

      // Mostrar error
      alert(`Error generando imagen: ${error.message}`)

    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      generateImage()
    }
  }

  const downloadImage = (imageData, prompt) => {
    try {
      const link = document.createElement('a')
      link.href = imageData
      link.download = `dalle3-${prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error descargando imagen:', error)
    }
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <span className="w-6 h-6 bg-ai-purple rounded-full flex items-center justify-center text-white text-sm mr-2">
            🎨
          </span>
          Generador de Imágenes
        </h2>
        
        <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
          DALL·E 3 via Azure
        </span>
      </div>

      {/* Formulario de generación */}
      <div className="space-y-4 mb-6">
        {/* Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción de la imagen
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe la imagen que quieres generar... (Ctrl+Enter para generar)"
            className="input-field resize-none"
            rows="3"
            disabled={isGenerating}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{prompt.length} caracteres</span>
            <span>Ctrl+Enter para generar</span>
          </div>
        </div>

        {/* Configuraciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tamaño */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tamaño
            </label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="select-field"
              disabled={isGenerating}
            >
              {IMAGE_SIZES.map((sizeOption) => (
                <option key={sizeOption.value} value={sizeOption.value}>
                  {sizeOption.label}
                </option>
              ))}
            </select>
          </div>

          {/* Calidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calidad
            </label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="select-field"
              disabled={isGenerating}
            >
              {IMAGE_QUALITIES.map((qualityOption) => (
                <option key={qualityOption.value} value={qualityOption.value}>
                  {qualityOption.label} - {qualityOption.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botón generar */}
        <button
          onClick={generateImage}
          disabled={isGenerating || !prompt.trim()}
          className="w-full btn-primary py-3 text-base font-semibold"
        >
          {isGenerating ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Generando imagen...</span>
            </div>
          ) : (
            '🎨 Generar Imagen'
          )}
        </button>

        {/* Ejemplos de prompts */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-xs font-medium text-gray-700 mb-2">💡 Ejemplos de prompts:</p>
          <div className="grid grid-cols-1 gap-1 text-xs">
            <button
              onClick={() => setPrompt("Un gato programador trabajando en una laptop, estilo pixar")}
              className="text-left text-ai-blue hover:text-blue-600 hover:underline"
            >
              • Un gato programador trabajando en una laptop, estilo pixar
            </button>
            <button
              onClick={() => setPrompt("Paisaje futurista con ciudades flotantes, atardecer cyberpunk")}
              className="text-left text-ai-blue hover:text-blue-600 hover:underline"
            >
              • Paisaje futurista con ciudades flotantes, atardecer cyberpunk  
            </button>
            <button
              onClick={() => setPrompt("Robot chef cocinando en una cocina moderna, ilustración colorida")}
              className="text-left text-ai-blue hover:text-blue-600 hover:underline"
            >
              • Robot chef cocinando en una cocina moderna, ilustración colorida
            </button>
          </div>
        </div>
      </div>

      {/* Galería de imágenes generadas */}
      {generatedImages.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Imágenes Generadas</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
            {generatedImages.map((imageResult) => (
              <ImageResult 
                key={imageResult.id} 
                imageResult={imageResult}
                onDownload={downloadImage}
              />
            ))}
          </div>
        </div>
      )}

      {/* Información educativa */}
      <div className="mt-6 p-3 bg-purple-50 rounded-lg border border-purple-200">
        <h3 className="text-sm font-semibold text-purple-800 mb-1">
          🎯 Concepto: Generación de Imágenes con IA
        </h3>
        <p className="text-xs text-purple-700">
          DALL·E 3 convierte texto en imágenes usando redes neuronales. 
          Experimenta con diferentes descripciones y observa cómo la IA interpreta tus palabras.
        </p>
      </div>
    </div>
  )
}

// Componente para mostrar resultados de imagen
function ImageResult({ imageResult, onDownload }) {
  const [showFullPrompt, setShowFullPrompt] = useState(false)

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex flex-col lg:flex-row space-y-3 lg:space-y-0 lg:space-x-4">
        
        {/* Imagen */}
        <div className="flex-shrink-0">
          <img
            src={imageResult.image}
            alt={imageResult.prompt}
            className="w-32 h-32 object-cover rounded-lg shadow-sm"
          />
        </div>

        {/* Detalles */}
        <div className="flex-1 min-w-0">
          {/* Prompt original */}
          <div className="mb-2">
            <p className="text-xs text-gray-500 font-medium">Tu prompt:</p>
            <p className="text-sm text-gray-800 truncate">{imageResult.prompt}</p>
          </div>

          {/* Prompt mejorado por DALL·E */}
          {imageResult.revised_prompt && (
            <div className="mb-2">
              <button
                onClick={() => setShowFullPrompt(!showFullPrompt)}
                className="text-xs text-ai-purple hover:text-purple-600 font-medium"
              >
                Prompt mejorado por IA {showFullPrompt ? '▲' : '▼'}
              </button>
              {showFullPrompt && (
                <p className="text-xs text-gray-600 mt-1 bg-white p-2 rounded border">
                  {imageResult.revised_prompt}
                </p>
              )}
            </div>
          )}

          {/* Metadatos */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span>{imageResult.size}</span>
            <span className="capitalize">{imageResult.quality}</span>
            <span>{imageResult.latency}ms</span>
            <span>{new Date(imageResult.timestamp).toLocaleTimeString()}</span>
          </div>

          {/* Acciones */}
          <div className="flex space-x-2 mt-3">
            <button
              onClick={() => onDownload(imageResult.image, imageResult.prompt)}
              className="text-xs btn-secondary py-1 px-3"
            >
              📥 Descargar
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(imageResult.prompt)}
              className="text-xs btn-secondary py-1 px-3"
            >
              📋 Copiar Prompt
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageGenerator