import { useState } from 'react'

function RequestInspector({ requestLogs }) {
  const [selectedLog, setSelectedLog] = useState(null)
  const [showOnlyErrors, setShowOnlyErrors] = useState(false)

  // Filtrar logs según configuración
  const filteredLogs = requestLogs.filter(log => {
    if (showOnlyErrors) {
      return log.error !== null
    }
    return true
  })

  // Calcular estadísticas
  const stats = {
    total: requestLogs.length,
    errors: requestLogs.filter(log => log.error).length,
    avgLatency: requestLogs.length > 0 
      ? Math.round(requestLogs.reduce((sum, log) => sum + log.latency, 0) / requestLogs.length)
      : 0,
    byType: requestLogs.reduce((acc, log) => {
      acc[log.type] = (acc[log.type] || 0) + 1
      return acc
    }, {}),
    byProvider: requestLogs.reduce((acc, log) => {
      const provider = log.request?.provider || 'unknown'
      acc[provider] = (acc[provider] || 0) + 1
      return acc
    }, {})
  }

  const getStatusColor = (log) => {
    if (log.error) return 'text-red-600 bg-red-50'
    return 'text-green-600 bg-green-50'
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'chat': return '💬'
      case 'image': return '🎨'
      case 'health': return '❤️'
      default: return '❓'
    }
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <span className="w-6 h-6 bg-ai-orange rounded-full flex items-center justify-center text-white text-sm mr-2">
            🔍
          </span>
          Inspector de Requests
        </h2>
        
        <div className="flex items-center space-x-2">
          <label className="flex items-center text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyErrors}
              onChange={(e) => setShowOnlyErrors(e.target.checked)}
              className="w-3 h-3 text-red-600 border-gray-300 rounded mr-1"
            />
            Solo errores
          </label>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-xs text-blue-600 font-medium">Total Requests</div>
          <div className="text-lg font-bold text-blue-800">{stats.total}</div>
        </div>
        
        <div className="bg-red-50 p-3 rounded-lg">
          <div className="text-xs text-red-600 font-medium">Errores</div>
          <div className="text-lg font-bold text-red-800">{stats.errors}</div>
        </div>
        
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-xs text-green-600 font-medium">Latencia Promedio</div>
          <div className="text-lg font-bold text-green-800">{stats.avgLatency}ms</div>
        </div>
        
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="text-xs text-purple-600 font-medium">Providers</div>
          <div className="text-lg font-bold text-purple-800">
            {Object.keys(stats.byProvider).length}
          </div>
        </div>
      </div>

      {/* Lista de logs */}
      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
        {filteredLogs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-3xl mb-2">📊</div>
            <p>No hay requests aún</p>
            <p className="text-sm">Los requests aparecerán aquí mientras usas la app</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <LogEntry
              key={log.id}
              log={log}
              isSelected={selectedLog?.id === log.id}
              onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
              getStatusColor={getStatusColor}
              getTypeIcon={getTypeIcon}
            />
          ))
        )}
      </div>

      {/* Detalles del log seleccionado */}
      {selectedLog && (
        <LogDetails 
          log={selectedLog} 
          onClose={() => setSelectedLog(null)}
        />
      )}

      {/* Información educativa */}
      <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
        <h3 className="text-sm font-semibold text-orange-800 mb-1">
          🔬 Concepto: Observabilidad
        </h3>
        <p className="text-xs text-orange-700">
          Monitorear requests es crucial para debuggear y optimizar. 
          Observa latencias, errores y patrones de uso en tiempo real.
        </p>
      </div>
    </div>
  )
}

// Componente para cada entrada de log
function LogEntry({ log, isSelected, onClick, getStatusColor, getTypeIcon }) {
  const timestamp = new Date(log.timestamp).toLocaleTimeString()
  const provider = log.request?.provider || 'N/A'

  return (
    <div 
      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'border-ai-orange bg-orange-50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-lg">{getTypeIcon(log.type)}</span>
          
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium capitalize">{log.type}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(log)}`}>
                {log.error ? 'Error' : 'OK'}
              </span>
            </div>
            
            <div className="text-xs text-gray-500 flex items-center space-x-2">
              <span>{timestamp}</span>
              <span>•</span>
              <span>{provider}</span>
              <span>•</span>
              <span>{log.latency}ms</span>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-gray-400">
          {isSelected ? '▲' : '▼'}
        </div>
      </div>
    </div>
  )
}

// Componente para detalles del log
function LogDetails({ log, onClose }) {
  const [activeTab, setActiveTab] = useState('request')

  const tabs = [
    { id: 'request', label: 'Request', icon: '📤' },
    { id: 'response', label: 'Response', icon: '📥' },
    { id: 'error', label: 'Error', icon: '❌', show: !!log.error }
  ].filter(tab => tab.show !== false)

  return (
    <div className="mt-4 border border-orange-200 rounded-lg bg-orange-50">
      {/* Header de detalles */}
      <div className="flex items-center justify-between p-3 border-b border-orange-200">
        <h4 className="font-semibold text-orange-800">
          Detalles del Request
        </h4>
        <button
          onClick={onClose}
          className="text-orange-600 hover:text-orange-800 text-sm"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-orange-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-orange-500 text-orange-800 bg-white'
                : 'border-transparent text-orange-600 hover:text-orange-800'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido de tabs */}
      <div className="p-3">
        {activeTab === 'request' && (
          <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
            {JSON.stringify(log.request, null, 2)}
          </pre>
        )}

        {activeTab === 'response' && (
          <div>
            {log.response ? (
              <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                {JSON.stringify(log.response, null, 2)}
              </pre>
            ) : (
              <div className="text-sm text-gray-600 text-center py-4">
                No hay respuesta disponible
              </div>
            )}
          </div>
        )}

        {activeTab === 'error' && log.error && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-red-700 mb-1">
                Mensaje de Error:
              </label>
              <div className="text-sm bg-red-100 text-red-800 p-2 rounded border">
                {log.error.message}
              </div>
            </div>
            
            {log.error.status && (
              <div>
                <label className="block text-xs font-medium text-red-700 mb-1">
                  Código de Estado:
                </label>
                <div className="text-sm bg-red-100 text-red-800 p-2 rounded border">
                  {log.error.status}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metadatos */}
      <div className="px-3 pb-3 text-xs text-orange-700">
        <div className="flex justify-between items-center">
          <span>ID: {log.id}</span>
          <span>Latencia: {log.latency}ms</span>
        </div>
      </div>
    </div>
  )
}

export default RequestInspector