import { useState, useRef, useEffect } from 'react'
import { APIService, RequestUtils } from '../services/api'

function ChatInterface({ provider, model, isStreaming, onRequestLog }) {
  const [messages, setMessages] = useState([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Auto-scroll al final de los mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // Ajustar altura del textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }

  // Enviar mensaje
  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return

    const userMessage = { role: 'user', content: currentMessage.trim() }
    const newMessages = [...messages, userMessage]
    
    setMessages(newMessages)
    setCurrentMessage('')
    setIsLoading(true)
    setStreamingText('')

    // Preparar mensajes para la API
    const apiMessages = [
      { role: 'system', content: 'Eres un asistente educativo que ayuda a explicar conceptos de programación y APIs.' },
      ...newMessages
    ]

    const startTime = Date.now()

    try {
      if (isStreaming) {
        // Modo streaming
        const { stream, requestData } = await APIService.sendChatMessage({
          provider,
          model,
          messages: apiMessages,
          temperature: 0.7,
          stream: true
        })

        let assistantMessage = ''
        
        // Leer el stream
        for await (const chunk of APIService.readStreamingResponse(stream)) {
          if (chunk.delta) {
            assistantMessage += chunk.delta
            setStreamingText(assistantMessage)
          }
          
          if (chunk.done) {
            break
          }
        }

        // Agregar mensaje completo
        const finalMessages = [...newMessages, { role: 'assistant', content: assistantMessage }]
        setMessages(finalMessages)
        setStreamingText('')

        // Log del request
        const log = RequestUtils.createRequestLog(
          'chat',
          requestData,
          { content: assistantMessage },
          Date.now() - startTime
        )
        onRequestLog(log)

      } else {
        // Modo sin streaming
        const { data, requestData, latency } = await APIService.sendChatMessage({
          provider,
          model,
          messages: apiMessages,
          temperature: 0.7,
          stream: false
        })

        const finalMessages = [...newMessages, { role: 'assistant', content: data.content }]
        setMessages(finalMessages)

        // Log del request
        const log = RequestUtils.createRequestLog('chat', requestData, data, latency)
        onRequestLog(log)
      }

    } catch (error) {
      console.error('Error enviando mensaje:', error)
      
      // Mostrar error como mensaje del sistema
      const errorMessage = {
        role: 'system',
        content: `❌ Error: ${error.message}`,
        isError: true
      }
      setMessages([...newMessages, errorMessage])

      // Log del error
      const log = RequestUtils.createRequestLog(
        'chat',
        { provider, model, messages: apiMessages },
        null,
        Date.now() - startTime,
        error
      )
      onRequestLog(log)

    } finally {
      setIsLoading(false)
    }
  }

  // Manejar Enter para enviar
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Limpiar conversación
  const clearChat = () => {
    setMessages([])
    setStreamingText('')
  }

  return (
    <div className="card h-96 flex flex-col">
      {/* Header del chat */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <span className="w-6 h-6 bg-ai-blue rounded-full flex items-center justify-center text-white text-sm mr-2">
            💬
          </span>
          Chat con IA
        </h2>
        
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">
            {provider} • {model}
          </span>
          {isStreaming && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              Streaming ON
            </span>
          )}
          <button
            onClick={clearChat}
            className="text-sm text-gray-500 hover:text-gray-700"
            disabled={isLoading}
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mb-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">🤖</div>
            <p>¡Hola! Soy tu asistente de IA.</p>
            <p className="text-sm">Pregúntame sobre programación, APIs o cualquier tema.</p>
          </div>
        )}

        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}

        {/* Mostrar streaming text */}
        {streamingText && (
          <MessageBubble 
            message={{ role: 'assistant', content: streamingText }} 
            isStreaming={true}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input de mensaje */}
      <div className="border-t border-gray-200 pt-3">
        <div className="flex space-x-3">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={currentMessage}
              onChange={(e) => {
                setCurrentMessage(e.target.value)
                adjustTextareaHeight()
              }}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje... (Enter para enviar, Shift+Enter para nueva línea)"
              className="input-field resize-none"
              rows="1"
              disabled={isLoading}
            />
          </div>
          
          <button
            onClick={sendMessage}
            disabled={isLoading || !currentMessage.trim()}
            className="btn-primary px-6 self-end"
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>
        
        {isLoading && (
          <div className="flex items-center space-x-2 mt-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-ai-blue rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-ai-blue rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-ai-blue rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <span>Generando respuesta...</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Componente para mostrar mensajes individuales
function MessageBubble({ message, isStreaming = false }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const isError = message.isError

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
        isUser 
          ? 'bg-ai-blue text-white' 
          : isError
          ? 'bg-red-50 text-red-800 border border-red-200'
          : isSystem
          ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
          : 'bg-gray-100 text-gray-800'
      }`}>
        
        {/* Avatar/indicador de rol */}
        <div className="flex items-start space-x-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-1 ${
            isUser 
              ? 'bg-white bg-opacity-20' 
              : 'bg-gray-300'
          }`}>
            {isUser ? '👤' : isError ? '❌' : isSystem ? '⚙️' : '🤖'}
          </div>
          
          <div className="flex-1">
            {/* Contenido del mensaje */}
            <div className="text-sm whitespace-pre-wrap break-words">
              {message.content}
              {isStreaming && (
                <span className="typing-indicator ml-1"></span>
              )}
            </div>
            
            {/* Timestamp */}
            <div className={`text-xs mt-1 opacity-70 ${
              isUser ? 'text-white' : 'text-gray-500'
            }`}>
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface