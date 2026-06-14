'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Send, MessageCircle } from 'lucide-react'
import { useAetherStore, type ChatMessage } from '@/lib/aether-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

// ─── Suggestion chips ────────────────────────────────────────────────
const suggestions = [
  'What did I save this week?',
  'Summarize my recent notes',
  'Find links about design',
]

// ─── Animation variants ──────────────────────────────────────────────
const messageVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: 'easeOut' as const },
  },
}

const dotBounce = {
  animate: {
    y: [0, -3, 0],
    transition: {
      duration: 0.4,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
}

// ─── Typing indicator ────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className="flex items-end gap-2"
    >
      <div className="size-6 rounded-full bg-zinc-50 text-purple-400 flex items-center justify-center shrink-0">
        <Brain className="size-3" />
      </div>
      <div className="rounded-2xl rounded-bl-sm px-3.5 py-2.5 bg-white/70 border border-black/[0.03]">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-purple-300/40"
              {...dotBounce}
              transition={{ ...dotBounce.animate.transition, delay: i * 0.1 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Single message bubble ───────────────────────────────────────────
function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className={cn('flex items-end gap-2 max-w-full overflow-hidden', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="size-6 rounded-full bg-zinc-50 text-purple-400 flex items-center justify-center shrink-0">
          <Brain className="size-3" />
        </div>
      )}

      <div
        className={cn(
          'max-w-[80%] md:max-w-[70%] rounded-2xl px-3.5 py-2.5 overflow-hidden',
          isUser
            ? 'bg-zinc-900 text-white rounded-br-sm'
            : 'bg-white/70 border border-black/[0.03] text-zinc-700 rounded-bl-sm'
        )}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        ) : (
          <div className={cn(
            'prose prose-sm max-w-none',
            'prose-p:leading-relaxed prose-p:my-1',
            'prose-headings:my-2 prose-headings:text-zinc-800',
            'prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5',
            'prose-code:text-purple-500 prose-code:before:content-[\'\'] prose-code:after:content-[\'\']',
            'prose-pre:bg-zinc-50 prose-pre:border prose-pre:border-black/[0.03]',
            'prose-strong:text-zinc-800',
            'prose-a:text-purple-500 prose-a:underline'
          )}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>

      {isUser && (
        <div className="size-6 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center shrink-0">
          <MessageCircle className="size-3" />
        </div>
      )}
    </motion.div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────
function EmptyState({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center h-full px-4 py-16 max-w-full overflow-hidden"
    >
      <div className="size-12 rounded-2xl bg-zinc-50 flex items-center justify-center mb-7">
        <Brain className="size-6 text-purple-400" />
      </div>

      <div className="flex flex-wrap justify-center gap-2 max-w-[320px]">
        {suggestions.map((suggestion, i) => (
          <motion.button
            key={suggestion}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 + i * 0.05 }}
            onClick={() => onSuggestionClick(suggestion)}
            className="rounded-full border border-black/[0.04] bg-white/60 px-3 py-1.5 text-[11px] font-medium text-zinc-500 transition-colors duration-200 hover:bg-white/80 hover:text-zinc-700 hover:border-black/[0.06]"
          >
            {suggestion}
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Main AskAether component ────────────────────────────────────────
export function AskAether() {
  const { chatMessages, addChatMessage, clearChat } = useAetherStore()
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        '[data-slot="scroll-area-viewport"]'
      )
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages, isLoading, scrollToBottom])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      }
      addChatMessage(userMessage)
      setInput('')
      setIsLoading(true)

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed }),
        })

        if (!res.ok) throw new Error(`Error: ${res.status}`)

        const assistantId = `assistant-${Date.now()}`

        const assistantMessage: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        }
        addChatMessage(assistantMessage)

        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            accumulated += chunk

            useAetherStore.setState((state) => ({
              chatMessages: state.chatMessages.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, content: accumulated }
                  : msg
              ),
            }))
          }
        }
      } catch {
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'I encountered an error. Please try again.',
          timestamp: new Date(),
        }
        addChatMessage(errorMessage)
      } finally {
        setIsLoading(false)
        inputRef.current?.focus()
      }
    },
    [isLoading, addChatMessage]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleSuggestionClick = (text: string) => {
    sendMessage(text)
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-6rem)] md:h-[calc(100dvh-4rem)] max-w-2xl mx-auto overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="shrink-0 pb-3">
        <div className="flex items-center justify-end">
          {chatMessages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-zinc-400 hover:text-zinc-600 text-[11px]"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* ── Chat Area ──────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 max-w-full overflow-hidden">
        <ScrollArea ref={scrollRef} className="h-full">
          <div className="pr-1 max-w-full overflow-hidden">
            <AnimatePresence mode="popLayout">
              {chatMessages.length === 0 && !isLoading ? (
                <EmptyState onSuggestionClick={handleSuggestionClick} />
              ) : (
                <div className="flex flex-col gap-3 py-2 pb-4 max-w-full overflow-hidden">
                  {chatMessages.map((msg) => (
                    msg.content ? (
                      <ChatBubble key={msg.id} message={msg} />
                    ) : (
                      msg.role === 'assistant' && isLoading ? (
                        <TypingIndicator key={msg.id} />
                      ) : null
                    )
                  ))}
                  {isLoading &&
                    (chatMessages.length === 0 || chatMessages[chatMessages.length - 1]?.role !== 'assistant') && (
                      <TypingIndicator />
                    )}
                </div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>

      {/* ── Input Area ─────────────────────────────────────────────── */}
      <div className="shrink-0 pt-2 pb-1 max-w-full overflow-hidden">
        <form
          onSubmit={handleSubmit}
          className={cn(
            'flex items-center gap-2 p-1.5 rounded-2xl transition-all duration-200',
            'bg-white/80 border border-black/[0.04] shadow-sm backdrop-blur-xl',
            'focus-within:border-purple-300/60 focus-within:shadow-[0_0_30px_rgba(168,85,247,0.03)]',
            'max-w-full overflow-hidden'
          )}
        >
          <div className="relative flex-1 min-w-0">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder=""
              disabled={isLoading}
              className="rounded-xl h-9 pl-3 pr-3 text-sm border-0 shadow-none bg-transparent text-zinc-800 placeholder:text-zinc-300 focus-visible:ring-0 font-medium"
            />
          </div>
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            size="icon"
            className={cn(
              'size-8 rounded-xl transition-all duration-200 shrink-0',
              input.trim() && !isLoading
                ? 'bg-zinc-900 hover:bg-zinc-800 text-white'
                : 'bg-zinc-50 text-zinc-300',
              'disabled:opacity-100'
            )}
          >
            <Send className="size-3.5" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
