/* eslint-disable */
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { use } from 'react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface AgentInfo {
  id: string
  name: string
  language: string
  chat_config: {
    welcome_message: string
    theme_color: string
    position: string
  }
}

export default function ChatWidget({ params }: { params: Promise<{ agentId: string }> }) {
  const resolvedParams = use(params)
  const agentId = resolvedParams.agentId

  const [agent, setAgent] = useState<AgentInfo | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAgentLoading, setIsAgentLoading] = useState(true)
  const [error, setError] = useState('')
  const [visitorName, setVisitorName] = useState('')
  const [visitorEmail, setVisitorEmail] = useState('')
  const [visitorPhone, setVisitorPhone] = useState('')
  const [showInfoForm, setShowInfoForm] = useState(true)
  const [chatEnded, setChatEnded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch agent info
  useEffect(() => {
    async function fetchAgent() {
      try {
        const res = await fetch(`/api/agents/${agentId}`)
        const data = await res.json()
        if (res.ok && data.agent) {
          setAgent(data.agent)
        } else {
          setError('Agent not found or unavailable')
        }
      } catch {
        setError('Failed to connect to agent')
      } finally {
        setIsAgentLoading(false)
      }
    }
    fetchAgent()
  }, [agentId])

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (messageText?: string) => {
    const text = messageText || input.trim()
    if (!text || isLoading || chatEnded) return

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          conversation_id: conversationId,
          message: text,
          visitor_name: visitorName || undefined,
          visitor_email: visitorEmail || undefined,
          visitor_phone: visitorPhone || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      if (data.conversation_id) {
        setConversationId(data.conversation_id)
      }

      const aiMsg: ChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, chatEnded, agentId, conversationId, visitorName, visitorEmail, visitorPhone])

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault()
    setShowInfoForm(false)
    // Send welcome message
    if (agent?.chat_config?.welcome_message) {
      setMessages([
        {
          role: 'assistant',
          content: agent.chat_config.welcome_message,
          timestamp: new Date().toISOString(),
        },
      ])
    }
  }

  const themeColor = agent?.chat_config?.theme_color || '#6366f1'

  if (isAgentLoading) {
    return (
      <div className="min-h-screen bg-[#070708] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading chat agent...</p>
        </div>
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-[#070708] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-400 text-lg font-bold">{error || 'Agent unavailable'}</p>
          <p className="text-gray-500 text-sm">This chat agent is currently not available.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070708] flex flex-col font-sans">
      {/* Header */}
      <header
        className="px-6 py-4 border-b border-white/5 flex items-center gap-4 shrink-0"
        style={{ background: `linear-gradient(135deg, ${themeColor}15, transparent)` }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
          style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}99)` }}
        >
          {agent.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-white font-bold text-lg">{agent.name}</h1>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-400 font-medium">Online</span>
          </div>
        </div>
      </header>

      {/* Visitor Info Form */}
      {showInfoForm ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="bg-[#111113] border border-white/10 rounded-2xl p-8 space-y-6 shadow-2xl">
              <div className="text-center space-y-2">
                <div
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}99)` }}
                >
                  💬
                </div>
                <h2 className="text-white text-xl font-bold">Chat with {agent.name}</h2>
                <p className="text-gray-400 text-sm">
                  {agent.chat_config?.welcome_message || 'Start a conversation with our AI assistant'}
                </p>
              </div>

              <form onSubmit={handleStartChat} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Your Name</label>
                  <input
                    type="text"
                    value={visitorName}
                    onChange={e => setVisitorName(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Email (Optional)</label>
                  <input
                    type="email"
                    value={visitorEmail}
                    onChange={e => setVisitorEmail(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Phone (Optional)</label>
                  <input
                    type="tel"
                    value={visitorPhone}
                    onChange={e => setVisitorPhone(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-lg text-white font-bold text-sm transition-all hover:opacity-90 shadow-lg"
                  style={{ backgroundColor: themeColor }}
                >
                  Start Chat →
                </button>
              </form>
            </div>

            <p className="text-center text-gray-600 text-xs mt-4">
              Powered by Vaxo AI
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-gray-600 to-gray-700'
                        : ''
                    }`}
                    style={msg.role === 'assistant' ? { background: `linear-gradient(135deg, ${themeColor}, ${themeColor}99)` } : undefined}
                  >
                    {msg.role === 'user'
                      ? (visitorName?.charAt(0).toUpperCase() || 'U')
                      : agent.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-md'
                        : 'bg-[#1a1a1d] border border-white/5 text-gray-200 rounded-bl-md'
                    }`}
                    style={msg.role === 'user' ? { backgroundColor: themeColor } : undefined}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}99)` }}
                  >
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="bg-[#1a1a1d] border border-white/5 px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="shrink-0 border-t border-white/5 p-4 bg-[#0b0b0d]">
            {chatEnded ? (
              <div className="text-center py-3">
                <p className="text-gray-400 text-sm">Chat ended. Thank you!</p>
                <button
                  onClick={() => {
                    setMessages([])
                    setConversationId(null)
                    setChatEnded(false)
                    setShowInfoForm(true)
                  }}
                  className="mt-2 text-indigo-400 text-sm font-bold hover:text-indigo-300"
                >
                  Start New Chat
                </button>
              </div>
            ) : (
              <form
                onSubmit={e => { e.preventDefault(); sendMessage() }}
                className="flex items-center gap-3"
              >
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1 bg-[#111113] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="p-3 rounded-xl text-white font-bold transition-all hover:opacity-90 disabled:opacity-30 shadow-lg"
                  style={{ backgroundColor: themeColor }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            )}
            <p className="text-center text-gray-600 text-[10px] mt-3">
              Powered by Vaxo AI
            </p>
          </div>
        </>
      )}
    </div>
  )
}
