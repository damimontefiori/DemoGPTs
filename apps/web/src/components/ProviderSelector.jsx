import { useState } from 'react'

// Configuración de proveedores y modelos
const PROVIDERS_CONFIG = {
  openai: {
    name: 'OpenAI',
    color: 'bg-green-500',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4O Mini', description: 'Rápido y económico' },
      { id: 'gpt-4o', name: 'GPT-4O', description: 'Más avanzado' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Clásico y confiable' }
    ]
  },
  gemini: {
    name: 'Google Gemini',
    color: 'bg-blue-500', 
    models: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Modelo principal' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Más rápido' }
    ]
  },
  anthropic: {
    name: 'Anthropic Claude',
    color: 'bg-orange-500',
    models: [
      { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Más reciente' },
      { id: 'claude-3-haiku', name: 'Claude 3 Haiku', description: 'Rápido y eficiente' }
    ]
  },
  azure: {
    name: 'Azure OpenAI',
    color: 'bg-blue-600',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4O Mini (Azure)', description: 'Via Azure' },
      { id: 'gpt-4o', name: 'GPT-4O (Azure)', description: 'Via Azure' }
    ]
  }
}

function ProviderSelector({ 
  selectedProvider, 
  selectedModel, 
  onProviderChange, 
  onModelChange,
  isStreaming,
  onStreamingChange 
}) {
  const [temperature, setTemperature] = useState(0.7)

  const currentProvider = PROVIDERS_CONFIG[selectedProvider]
  const availableModels = currentProvider?.models || []

  // Cambiar proveedor y seleccionar primer modelo disponible
  const handleProviderChange = (provider) => {
    onProviderChange(provider)
    const firstModel = PROVIDERS_CONFIG[provider]?.models[0]
    if (firstModel) {
      onModelChange(firstModel.id)
    }
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="w-6 h-6 bg-ai-blue rounded-full flex items-center justify-center text-white text-sm mr-2">
          ⚙️
        </span>
        Configuración
      </h2>

      <div className="space-y-4">
        {/* Selector de Proveedor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Proveedor de IA
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PROVIDERS_CONFIG).map(([key, provider]) => (
              <button
                key={key}
                onClick={() => handleProviderChange(key)}
                className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                  selectedProvider === key
                    ? 'border-ai-blue bg-blue-50 text-ai-blue'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${provider.color}`}></div>
                  <span className="font-medium text-sm">{provider.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selector de Modelo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modelo
          </label>
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="select-field"
          >
            {availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} - {model.description}
              </option>
            ))}
          </select>
          
          {/* Info del modelo seleccionado */}
          {selectedModel && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
              <strong>Proveedor:</strong> {currentProvider?.name}
              <br />
              <strong>Modelo:</strong> {availableModels.find(m => m.id === selectedModel)?.name}
            </div>
          )}
        </div>

        {/* Control de Temperatura */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Temperatura (Creatividad): {temperature}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Preciso (0.0)</span>
            <span>Equilibrado (1.0)</span>
            <span>Creativo (2.0)</span>
          </div>
          
          <div className="mt-2 text-xs text-gray-600">
            {temperature < 0.3 && "🎯 Respuestas muy precisas y determinísticas"}
            {temperature >= 0.3 && temperature < 0.8 && "⚖️ Balance entre precisión y creatividad"}
            {temperature >= 0.8 && temperature < 1.5 && "🎨 Respuestas más creativas y variadas"}
            {temperature >= 1.5 && "🚀 Máxima creatividad, respuestas impredecibles"}
          </div>
        </div>

        {/* Toggle de Streaming */}
        <div>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isStreaming}
              onChange={(e) => onStreamingChange(e.target.checked)}
              className="w-4 h-4 text-ai-blue border-gray-300 rounded focus:ring-ai-blue"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                Streaming en Tiempo Real
              </span>
              <p className="text-xs text-gray-500">
                Ver respuestas palabra por palabra (como ChatGPT)
              </p>
            </div>
          </label>
        </div>

        {/* Información educativa */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-800 mb-1">
            💡 Concepto: Patrón Adapter
          </h3>
          <p className="text-xs text-blue-700">
            Cada proveedor tiene una API diferente, pero nuestros "adapters" 
            traducen todo a un formato común. Cambia de proveedor sin cambiar código.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ProviderSelector