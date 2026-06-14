'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Send, Sparkles, MessageCircle } from 'lucide-react'
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
  'What are my favorite memories?',
]

// ─── Animation variants ──────────────────────────────────────────────
const messageVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
}

const dotBounce = {
  animate: {
    y: [0, -6, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// ─── Typing indicator ────────────────────────────────────────────────
function TypingIndicator({ isDark }: { isDark: boolean }) {
  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className="flex items-end gap-2"
    >
      <div className="size-7 rounded-full bg-zinc-800/80 text-[#A594F9] flex items-center justify-center shrink-0">
        <Brain className="size-3.5" />
      </div>

      <div className={cn(
        'rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm',
        isDark
          ? 'bg-[#15171C]/40 border border-white/[0.04] text-zinc-200'
          : 'bg-white border border-gray-100 text-gray-900 shadow-md'
      )}>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className={cn(
                'size-2 rounded-full',
                isDark ? 'bg-[#A594F9]/20' : 'bg-purple-400/40'
              )}
              {...dotBounce}
              transition={{
                ...dotBounce.animate.transition,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Single message bubble ───────────────────────────────────────────
function ChatBubble({ message, isDark }: { message: ChatMessage; isDark: boolean }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className={cn('flex items-end gap-2', isUser ? 'justify-end' : 'justify-start')}
    >
      {/* Aether avatar for assistant */}
      {!isUser && (
        <div className="size-7 rounded-full bg-zinc-800/80 text-[#A594F9] flex items-center justify-center shrink-0">
          <Brain className="size-3.5" />
        </div>
      )}

      <div
        className={cn(
          'max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm',
          isUser
            ? 'bg-zinc-800/80 text-zinc-100 rounded-2xl rounded-br-sm'
            : isDark
              ? 'bg-[#15171C]/40 border border-white/[0.04] text-zinc-200 rounded-2xl rounded-bl-sm'
              : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm shadow-md'
        )}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        ) : (
          <div className={cn(
            'prose prose-sm max-w-none',
            isDark ? 'dark:prose-invert' : '',
            'prose-p:leading-relaxed prose-p:my-1',
            'prose-headings:my-2',
            isDark ? 'prose-headings:text-white' : 'prose-headings:text-gray-900',
            'prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5',
            isDark
              ? 'prose-code:text-[#A594F9] prose-code:before:content-[\'\'] prose-code:after:content-[\'\']'
              : 'prose-code:text-purple-600 prose-code:before:content-[\'\'] prose-code:after:content-[\'\']',
            isDark
              ? 'prose-pre:bg-white/[0.025] prose-pre:border prose-pre:border-white/[0.04]'
              : 'prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-100',
            isDark ? 'prose-strong:text-white' : 'prose-strong:text-gray-900',
            isDark ? 'prose-a:text-[#A594F9]' : 'prose-a:text-purple-600',
            'prose-a:underline'
          )}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="size-7 rounded-full bg-zinc-700/80 text-zinc-200 flex items-center justify-center shrink-0">
          <MessageCircle className="size-3.5" />
        </div>
      )}
    </motion.div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────
function EmptyState({ onSuggestionClick, isDark }: { onSuggestionClick: (text: string) => void; isDark: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center h-full px-4 py-12 text-center"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        className={cn(
          'size-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg',
          isDark
            ? 'bg-[#15171C]/40 border border-white/[0.04]'
            : 'bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 shadow-purple-500/5'
        )}
      >
        <Brain className={cn('size-10', isDark ? 'text-[#A594F9]/50' : 'text-purple-600')} />
      </motion.div>

      <h3 className={cn(
        'text-xl mb-2',
        isDark
          ? 'text-zinc-100 font-medium tracking-tight'
          : 'text-gray-900 font-semibold'
      )}>
        Ask me anything about your memories
      </h3>

      <p className={cn(
        'text-sm max-w-[280px] mb-8',
        isDark ? 'text-white/30' : 'text-gray-500'
      )}>
        I can search, summarize, and find patterns across everything you&apos;ve saved.
      </p>

      <div className="flex flex-wrap justify-center gap-2 max-w-[360px]">
        {suggestions.map((suggestion, i) => (
          <motion.button
            key={suggestion}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 + i * 0.08 }}
            onClick={() => onSuggestionClick(suggestion)}
            className={cn(
              'rounded-full border px-4 py-2 text-sm transition-all duration-200',
              'hover:shadow-md active:scale-[0.97]',
              isDark
                ? 'border-white/[0.04] bg-[#15171C]/40 text-zinc-400 hover:bg-[#15171C]/60 hover:border-[#A594F9]/20 hover:text-zinc-200'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 hover:shadow-purple-500/10'
            )}
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
  const { chatMessages, addChatMessage, clearChat, darkMode } = useAetherStore()
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isDark = darkMode

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
          content: 'I\'m sorry, I encountered an error processing your request. Please try again.',
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
    <div className="flex flex-col h-[calc(100dvh-6rem)] md:h-[calc(100dvh-4rem)] max-w-3xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="shrink-0 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-zinc-800/80 text-[#A594F9] flex items-center justify-center">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h1 className={cn(
                'text-xl tracking-tight',
                isDark
                  ? 'text-zinc-100 font-medium tracking-tight'
                  : 'text-gray-900 font-bold'
              )}>
                Ask Aether
              </h1>
              <p className={cn(
                'text-xs',
                isDark ? 'text-zinc-500' : 'text-gray-500'
              )}>
                Search through your memories with AI
              </p>
            </div>
          </div>

          {chatMessages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className={cn(
                isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-700'
              )}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* ── Chat Area ──────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        <ScrollArea ref={scrollRef} className="h-full">
          <div className="pr-2">
            <AnimatePresence mode="popLayout">
              {chatMessages.length === 0 && !isLoading ? (
                <EmptyState onSuggestionClick={handleSuggestionClick} isDark={isDark} />
              ) : (
                <div className="flex flex-col gap-4 py-2 pb-4">
                  {chatMessages.map((msg) => (
                    msg.content ? (
                      <ChatBubble key={msg.id} message={msg} isDark={isDark} />
                    ) : (
                      msg.role === 'assistant' && isLoading ? (
                        <TypingIndicator key={msg.id} isDark={isDark} />
                      ) : null
                    )
                  ))}
                  {isLoading &&
                    (chatMessages.length === 0 || chatMessages[chatMessages.length - 1]?.role !== 'assistant') && (
                      <TypingIndicator isDark={isDark} />
                    )}
                </div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>

      {/* ── Input Area ─────────────────────────────────────────────── */}
      <div className="shrink-0 pt-3 pb-2">
        <form
          onSubmit={handleSubmit}
          className={cn(
            'flex items-center gap-2 p-1.5 rounded-2xl transition-all duration-500',
            isDark
              ? 'bg-[#15171C]/40 border border-white/[0.04] focus-within:border-[#A594F9]/40 focus-within:shadow-[0_0_40px_rgba(165,148,249,0.06)]'
              : 'bg-white border border-gray-200 shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_0_30px_-10px_rgba(168,85,247,0.06)] focus-within:shadow-[0_0_0_1px_rgba(168,85,247,0.2),0_0_40px_-10px_rgba(168,85,247,0.1)] focus-within:border-purple-300/30'
          )}
        >
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your memories..."
              disabled={isLoading}
              className={cn(
                'rounded-xl h-11 pl-4 pr-4 text-sm border-0 shadow-none bg-transparent',
                isDark
                  ? 'text-white placeholder:text-white/20 focus-visible:ring-0'
                  : 'text-gray-900 placeholder:text-gray-400 focus-visible:ring-purple-400/30'
              )}
            />
          </div>
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            size="icon"
            className={cn(
              'size-10 rounded-xl transition-all active:scale-95',
              'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-100 border border-white/[0.06]',
              'disabled:opacity-50 disabled:shadow-none'
            )}
          >
            <Send className="size-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
        <p className={cn(
          'text-[10px] text-center mt-2',
          isDark ? 'text-zinc-600' : 'text-gray-400'
        )}>
          Aether AI may make mistakes. Verify important information.
        </p>
      </div>
    </div>
  )
}
