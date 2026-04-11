
import React, { useState, useRef, useEffect } from 'react'
import Drawer from '../molecules/Drawer'
import Button from '../atoms/Button'
import Input from '../atoms/Input'
import MarkdownOutput from './MarkdownOutput'
import { Send, Sparkles, User, Bot, Trash2 } from 'lucide-react'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSendMessage: (message: string) => Promise<void>
  messages: ChatMessage[]
  onClearMessages?: () => void
  isLoading?: boolean
}

const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  onSendMessage,
  messages,
  onClearMessages,
  isLoading = false
}) => {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    const msg = input
    setInput('')
    await onSendMessage(msg)
  }

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[var(--color-brand-primary)]" />
          <span>Nexus AI Assistant</span>
        </div>
      }
      width={500}
    >
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-[var(--color-bg-stage)] rounded-full flex items-center justify-center mb-4">
                <Sparkles size={32} className="text-[var(--color-brand-primary)] opacity-50" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-text-primary)] mb-2">
                How can I help you today?
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] max-w-[240px]">
                I can help you analyze reports, manage tasks, or provide strategic insights based on your data.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-[var(--color-brand-primary)] text-white' : 'bg-[var(--color-bg-stage)] text-[var(--color-brand-primary)]'
                }`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`max-w-[85%] p-3 rounded-xl ${
                  msg.role === 'user' 
                    ? 'bg-[var(--color-brand-primary)] text-white' 
                    : 'bg-[var(--color-bg-stage)] text-[var(--color-text-primary)]'
                }`}>
                  <div className="prose prose-sm max-w-none">
                    <MarkdownOutput content={msg.content} />
                  </div>
                  <div className={`text-[8px] mt-1 opacity-50 ${msg.role === 'user' ? 'text-right' : ''}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-bg-stage)] flex items-center justify-center text-[var(--color-brand-primary)]">
                <Bot size={16} />
              </div>
              <div className="bg-[var(--color-bg-stage)] p-4 rounded-xl flex gap-1 items-center">
                <div className="w-1.5 h-1.5 bg-[var(--color-brand-primary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-[var(--color-brand-primary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-[var(--color-brand-primary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-surface)]">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="Ask Nexus AI..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              variant="primary" 
              disabled={!input.trim() || isLoading}
              className="px-3"
            >
              <Send size={18} />
            </Button>
          </form>
          <div className="flex justify-between items-center mt-3 px-1">
            <span className="text-[9px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
              Gemini 1.5 Flash
            </span>
            {onClearMessages && messages.length > 0 && (
              <button 
                onClick={onClearMessages}
                className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 hover:underline"
              >
                <Trash2 size={10} />
                Clear Chat
              </button>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  )
}

export default ChatDrawer
