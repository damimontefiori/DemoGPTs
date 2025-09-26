import { useState } from 'react'
import Header from './components/Header'
import ProviderSelector from './components/ProviderSelector'
import ChatInterface from './components/ChatInterface'
import ImageGenerator from './components/ImageGenerator'
import RequestInspector from './components/RequestInspector'

function App() {
  // Estado global de la aplicación
  const [selectedProvider, setSelectedProvider] = useState('openai')
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini')
  const [requestLogs, setRequestLogs] = useState([])
  const [isStreaming, setIsStreaming] = useState(true)

  // Función para agregar logs de requests
  const addRequestLog = (log) => {
    setRequestLogs(prev => [log, ...prev].slice(0, 10)) // Mantener solo los últimos 10
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />
      
      {/* Layout principal */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Columna izquierda: Configuración */}
          <div className="lg:col-span-1 space-y-6">
            <ProviderSelector
              selectedProvider={selectedProvider}
              selectedModel={selectedModel}
              onProviderChange={setSelectedProvider}
              onModelChange={setSelectedModel}
              isStreaming={isStreaming}
              onStreamingChange={setIsStreaming}
            />
            
            <RequestInspector 
              requestLogs={requestLogs}
            />
          </div>
          
          {/* Columna derecha: Interfaces principales */}
          <div className="lg:col-span-2 space-y-6">
            <ChatInterface
              provider={selectedProvider}
              model={selectedModel}
              isStreaming={isStreaming}
              onRequestLog={addRequestLog}
            />
            
            <ImageGenerator
              onRequestLog={addRequestLog}
            />
          </div>
          
        </div>
      </div>
      
      {/* Footer educativo */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p className="mb-2">
            <span className="font-semibold text-ai-blue">Demo Educativa:</span> 
            {' '}Integración de APIs de Modelos Generativos
          </p>
          <p className="text-sm">
            Aprende conceptos de APIs, Patrón Adapter, Streaming y Seguridad
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App