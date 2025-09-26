import { useState, useEffect } from 'react'
import { APIService } from '../services/api'

function Header() {
  const [healthStatus, setHealthStatus] = useState('checking')
  const [lastCheck, setLastCheck] = useState(null)

  // Verificar salud de la API al cargar
  useEffect(() => {
    checkAPIHealth()
  }, [])

  const checkAPIHealth = async () => {
    setHealthStatus('checking')
    try {
      const health = await APIService.checkHealth()
      setHealthStatus('healthy')
      setLastCheck(new Date())
    } catch (error) {
      setHealthStatus('error')
      setLastCheck(new Date())
    }
  }

  const getHealthStatusColor = () => {
    switch (healthStatus) {
      case 'healthy': return 'text-green-600'
      case 'error': return 'text-red-600'
      case 'checking': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const getHealthStatusText = () => {
    switch (healthStatus) {
      case 'healthy': return 'API Funcionando'
      case 'error': return 'API No Disponible'
      case 'checking': return 'Verificando...'
      default: return 'Desconocido'
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          
          {/* Logo y título */}
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-ai-blue to-ai-purple rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">🤖</span>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-gradient">
                Demo: APIs Generativas
              </h1>
              <p className="text-sm text-gray-600">
                Integración Unificada de Múltiples Proveedores de IA
              </p>
            </div>
          </div>

          {/* Estado de la API */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  healthStatus === 'healthy' ? 'bg-green-500' : 
                  healthStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                } ${healthStatus === 'checking' ? 'animate-pulse' : ''}`}></div>
                <span className={`text-sm font-medium ${getHealthStatusColor()}`}>
                  {getHealthStatusText()}
                </span>
              </div>
              
              {lastCheck && (
                <p className="text-xs text-gray-500">
                  Última verificación: {lastCheck.toLocaleTimeString()}
                </p>
              )}
              
              {/* Crédito del autor */}
              <p className="text-xs text-gray-400 mt-1">
                by <a 
                  href="https://www.linkedin.com/in/damian-montefiori" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-ai-blue transition-colors duration-200"
                >
                  Dami Montefiori
                </a>
              </p>
            </div>

            <button
              onClick={checkAPIHealth}
              disabled={healthStatus === 'checking'}
              className="btn-secondary text-xs"
            >
              {healthStatus === 'checking' ? 'Verificando...' : 'Verificar'}
            </button>
          </div>
        </div>

        {/* Navegación / pestañas educativas */}
        <nav className="mt-4 border-t border-gray-100 pt-4">
          <div className="flex space-x-6">
            <div className="flex items-center space-x-2 text-sm">
              <span className="w-3 h-3 bg-ai-blue rounded-full"></span>
              <span className="font-medium text-gray-700">Chat con Streaming</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="w-3 h-3 bg-ai-purple rounded-full"></span>
              <span className="font-medium text-gray-700">Generación de Imágenes</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="w-3 h-3 bg-ai-orange rounded-full"></span>
              <span className="font-medium text-gray-700">Inspector de Requests</span>
            </div>
          </div>
        </nav>
      </div>
    </header>
  )
}

export default Header