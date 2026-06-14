'use client'

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
  Mic,
  MicOff,
  Send,
  X,
  Trash2,
  Link2,
  FileText,
  CheckCircle2,
  Brain,
  Clock,
  Image as ImageIcon,
  Loader2,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { useAetherStore, type Memory, type MemoryType } from '@/lib/aether-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PaywallModal } from '@/components/aether/PaywallModal'

// ─── Helpers ────────────────────────────────────────────────────────
function detectContentType(text: string): 'link' | 'task' | 'note' {
  const lower = text.toLowerCase()
  if (/https?:\/\//.test(lower) || /\bwww\./.test(lower)) return 'link'
  if (/\b(todo|remind|need to|buy|must)\b/.test(lower)) return 'task'
  return 'note'
}

function mapToMemoryType(detected: 'link' | 'task' | 'note'): MemoryType {
  if (detected === 'link') return 'link'
  return 'text'
}

const typeIconMap: Record<string, React.ElementType> = {
  link: Link2,
  task: CheckCircle2,
  note: FileText,
}

// ─── Main Dashboard Component ────────────────────────────────────────
export function Dashboard() {
  const {
    memories,
    saveMemory,
    fetchMemories,
    deleteMemoryFromDB,
    isLoading,
    isAuthenticated,
    requireAuth,
  } = useAetherStore()

  const [captureText, setCaptureText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isFadingUp, setIsFadingUp] = useState(false)

  // ── Voice Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // ── Image Upload state
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Hydration guard
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Skeleton loading
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    if (memories.length > 0 && !hasFetched) setHasFetched(true)
  }, [memories.length, hasFetched])

  useEffect(() => {
    if (!isLoading && !hasFetched) {
      const timer = setTimeout(() => setHasFetched(true), 600)
      return () => clearTimeout(timer)
    }
  }, [isLoading, hasFetched])

  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)

  const FREE_MEMORY_LIMIT = 15

  // ── Upload image to Supabase Storage ────────────────────────────────
  const uploadImageToStorage = useCallback(async (file: File): Promise<string | null> => {
    try {
      const { createClient } = await import('@/lib/supabase/browser')
      const supabase = createClient()

      const fileExt = file.name.split('.').pop() || 'png'
      const fileName = `memory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('memory-assets')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        console.warn('[uploadImage] Supabase Storage upload failed:', uploadError.message)
        return null
      }

      const { data: urlData } = supabase.storage
        .from('memory-assets')
        .getPublicUrl(fileName)

      return urlData.publicUrl
    } catch (err) {
      console.warn('[uploadImage] Storage upload error:', err instanceof Error ? err.message : 'Unknown')
      return null
    }
  }, [])

  // ── Voice Recording handlers ────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' })

        setIsTranscribing(true)
        try {
          const formData = new FormData()
          formData.append('audio', audioBlob, 'recording.webm')

          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          })

          if (res.ok) {
            const { text } = await res.json()
            if (text?.trim()) {
              setCaptureText((prev) => prev ? `${prev} ${text}` : text)
              toast.success('Transcribed')
            } else {
              toast.error('Could not detect speech')
            }
          } else {
            toast.error('Transcription failed')
          }
        } catch (err) {
          console.error('[transcribe] Error:', err)
          toast.error('Transcription failed')
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('[mic] Microphone access denied:', err)
      toast.error('Microphone access denied')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  // ── Image Upload handlers ───────────────────────────────────────────
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB')
      return
    }

    setPendingImage(file)

    const reader = new FileReader()
    reader.onload = (event) => {
      setPendingImagePreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const removePendingImage = useCallback(() => {
    setPendingImage(null)
    setPendingImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  // ── Capture handler with fade-up animation ─────────────────────────
  const handleCapture = useCallback(async () => {
    const text = captureText.trim()
    if ((!text && !pendingImage) || isSaving) return

    // ── Trigger fade-up animation on the input
    setIsFadingUp(true)

    // ── AUTH GATE
    if (!isAuthenticated) {
      const pendingText = text
      setCaptureText('')
      requireAuth(async () => {
        const detectedType = detectContentType(pendingText)
        const memoryType = pendingImage ? 'image' : mapToMemoryType(detectedType)

        let imageUrl: string | null = null
        if (pendingImage) {
          imageUrl = await uploadImageToStorage(pendingImage)
          removePendingImage()
        }

        setIsSaving(true)
        try {
          const savedMemory = await saveMemory({
            type: memoryType,
            title: pendingText.split('\n')[0].slice(0, 80) || (imageUrl ? 'Image note' : 'Quick Note'),
            content: pendingText,
            sourceUrl: detectedType === 'link' ? pendingText.trim() : null,
            imageUrl,
          })
          if (savedMemory) {
            fetchMemories()
          } else {
            toast.error('Failed to save')
          }
        } catch {
          toast.error('Something went wrong')
        } finally {
          setIsSaving(false)
          setIsFadingUp(false)
        }
      })
      return
    }

    const detectedType = detectContentType(text)
    const memoryType = pendingImage ? 'image' : mapToMemoryType(detectedType)

    // Clear input immediately for fade-up feel
    setTimeout(() => {
      setCaptureText('')
      setIsFadingUp(false)
    }, 250)

    if (memories.length >= FREE_MEMORY_LIMIT) {
      setTimeout(() => setShowPaywall(true), 800)
      return
    }

    let imageUrl: string | null = null
    if (pendingImage) {
      imageUrl = await uploadImageToStorage(pendingImage)
      removePendingImage()
    }

    setIsSaving(true)
    try {
      const savedMemory = await saveMemory({
        type: memoryType,
        title: text.split('\n')[0].slice(0, 80) || (imageUrl ? 'Image note' : 'Quick Note'),
        content: text,
        sourceUrl: detectedType === 'link' ? text.trim() : null,
        imageUrl,
      })

      if (savedMemory) {
        fetchMemories()
      } else {
        toast.error('Failed to save')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsSaving(false)
    }
  }, [captureText, isSaving, saveMemory, fetchMemories, memories.length, FREE_MEMORY_LIMIT, isAuthenticated, requireAuth, pendingImage, uploadImageToStorage, removePendingImage])

  const handleCaptureKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCapture()
    }
  }, [handleCapture])

  const handleDeleteMemory = useCallback(async () => {
    if (!selectedMemory || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteMemoryFromDB(selectedMemory.id)
      setSelectedMemory(null)
    } catch {
      // keep drawer open
    } finally {
      setIsDeleting(false)
    }
  }, [selectedMemory, isDeleting, deleteMemoryFromDB])

  const displayMemories = useMemo(() => {
    return [...memories]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [memories])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-full overflow-x-hidden flex flex-col items-center px-4 md:px-8"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* ── Floating Capture Bar ───────────────────────────────────── */}
      <section className="w-full max-w-full md:max-w-xl mx-auto mt-8 md:mt-16 mb-20 md:mb-28">
        {/* Image preview pill */}
        <AnimatePresence>
          {pendingImagePreview && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="mb-2 inline-flex items-center gap-3 px-3 py-2 rounded-xl bg-white/60 backdrop-blur-xl border border-black/[0.04] max-w-full overflow-hidden"
            >
              <img
                src={pendingImagePreview}
                alt="Preview"
                className="size-10 rounded-lg object-cover shrink-0"
              />
              <span className="text-xs font-medium text-zinc-400 truncate max-w-[120px]">
                {pendingImage?.name.slice(0, 20) || 'Image'}
              </span>
              <button
                onClick={removePendingImage}
                className="size-5 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors duration-200 shrink-0"
              >
                <X className="size-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The glass capsule */}
        <div
          className={cn(
            'bg-white/80 border border-black/[0.04] shadow-sm backdrop-blur-xl rounded-2xl p-2 transition-all duration-200 ease-in-out max-w-full overflow-hidden',
            'focus-within:border-purple-300/60 focus-within:shadow-[0_0_40px_rgba(168,85,247,0.04)]'
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Mic button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              className={cn(
                'flex items-center justify-center size-9 rounded-xl transition-all duration-200 ease-in-out shrink-0',
                isRecording
                  ? 'bg-red-50 text-red-400 scale-105'
                  : isTranscribing
                    ? 'text-zinc-300'
                    : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50'
              )}
              aria-label={isRecording ? 'Stop recording' : 'Voice recording'}
            >
              {isTranscribing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isRecording ? (
                <MicOff className="size-4" />
              ) : (
                <Mic className="size-4" />
              )}
            </button>

            {/* Input */}
            <div className="relative flex-1 min-w-0">
              <input
                value={captureText}
                onChange={(e) => setCaptureText(e.target.value)}
                onKeyDown={handleCaptureKeyDown}
                placeholder=""
                disabled={isSaving}
                className={cn(
                  'w-full min-w-0 bg-transparent text-sm font-medium text-zinc-800 placeholder:text-zinc-300 focus:outline-none px-1 tracking-tight transition-all duration-200',
                  isFadingUp && 'animate-capture-fade-up'
                )}
              />
            </div>

            {/* Image upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center size-9 rounded-xl transition-all duration-200 ease-in-out shrink-0 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
              aria-label="Attach image"
            >
              <ImageIcon className="size-4" />
            </button>

            {/* Send */}
            <button
              onClick={handleCapture}
              disabled={(!captureText.trim() && !pendingImage) || isSaving}
              className={cn(
                'flex items-center justify-center size-9 rounded-xl transition-all duration-200 ease-in-out shrink-0',
                (captureText.trim() || pendingImage) && !isSaving
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-white'
                  : 'bg-zinc-50 text-zinc-300'
              )}
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ── Memory Feed — Borderless Rows ──────────────────────────── */}
      <section className="w-full max-w-full md:max-w-xl mx-auto pb-24 md:pb-8 overflow-hidden">
        {!hasFetched ? (
          <div className="space-y-0">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="px-3 py-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="size-4 rounded bg-zinc-100 shrink-0" />
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="h-2.5 rounded w-2/3 bg-zinc-100" />
                    <div className="h-2 rounded w-1/4 bg-zinc-50" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayMemories.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center py-24"
          >
            <Brain className="size-10 text-zinc-200" />
          </motion.div>
        ) : (
          <div className="space-y-0">
            {displayMemories.map((memory, index) => (
              <MemoryRow
                key={memory.id}
                memory={memory}
                index={index}
                onClick={() => setSelectedMemory(memory)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Memory Drawer ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedMemory && (
          <MemoryDrawer
            memory={selectedMemory}
            onClose={() => setSelectedMemory(null)}
            onDelete={handleDeleteMemory}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>

      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} />
    </motion.div>
  )
}

// ─── Memory Row — Borderless, minimal ────────────────────────────────
function MemoryRow({ memory, index, onClick }: {
  memory: Memory
  index: number
  onClick: () => void
}) {
  const displayTitle = memory.title || memory.content.split('\n')[0].slice(0, 80) || 'Untitled'
  const relativeTime = formatDistanceToNow(new Date(memory.createdAt), { addSuffix: true })
  const detectedType = detectContentType(memory.content)
  const Icon = typeIconMap[detectedType] || FileText

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut', delay: Math.min(index * 0.03, 0.15) }}
    >
      <button
        onClick={onClick}
        className="w-full max-w-full overflow-hidden text-left px-3 py-4 rounded-xl transition-all duration-200 ease-in-out hover:bg-zinc-50/80 group flex items-start gap-3"
      >
        {/* Type icon */}
        <div className="size-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 bg-zinc-50 group-hover:bg-zinc-100 transition-colors duration-200 ease-in-out">
          <Icon className="size-2.5 text-zinc-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="text-sm font-medium text-zinc-700 line-clamp-2 leading-relaxed group-hover:text-zinc-900 transition-colors duration-200 ease-in-out">
            {displayTitle}
          </p>
          <span className="text-[11px] text-zinc-300 mt-1 block">
            {relativeTime}
          </span>
        </div>

        {/* Arrow */}
        <ChevronRight className="size-3.5 text-zinc-200 group-hover:text-zinc-400 mt-1.5 shrink-0 transition-colors duration-200 ease-in-out" />
      </button>
    </motion.div>
  )
}

// ─── Memory Drawer — Slide-out inspection panel ──────────────────────
function MemoryDrawer({
  memory,
  onClose,
  onDelete,
  isDeleting,
}: {
  memory: Memory
  onClose: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-0 right-0 h-full z-50 w-full max-w-md overflow-y-auto bg-white/95 backdrop-blur-2xl border-l border-black/[0.04]"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur-xl border-b border-black/[0.04]">
          <h2 className="text-sm font-medium tracking-tight text-zinc-800 pr-4 truncate">
            {memory.title || 'Untitled'}
          </h2>
          <button
            onClick={onClose}
            className="size-7 rounded-lg flex items-center justify-center transition-colors duration-200 ease-in-out shrink-0 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* AI Recap */}
          {memory.recap && (
            <div className="rounded-xl p-4 bg-purple-50/30 border border-purple-100/20">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span className="text-[10px] uppercase tracking-[0.12em] text-purple-400 font-medium">Recap</span>
              </div>
              <p className="text-sm leading-relaxed text-zinc-600 font-medium">
                {memory.recap}
              </p>
            </div>
          )}

          {/* Image */}
          {memory.imageUrl && (
            <div>
              <img
                src={memory.imageUrl}
                alt={memory.title || 'Memory image'}
                className="w-full rounded-xl object-cover max-h-64"
              />
            </div>
          )}

          {/* Tags — only visible in drawer */}
          {memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {memory.tags.map((tag) => (
                <span key={tag} className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-50/40 text-purple-500 font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Collections */}
          {memory.collections.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {memory.collections.map((col) => (
                <span key={col.id} className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-50 text-zinc-500 font-medium">
                  {col.name}
                </span>
              ))}
            </div>
          )}

          {/* Original Content */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-600 font-medium">
            {memory.content}
          </p>

          {/* Source URL */}
          {memory.sourceUrl && (
            <a
              href={memory.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline text-purple-500 hover:text-purple-600 font-medium break-all"
            >
              {memory.sourceUrl}
            </a>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-1.5">
            <Clock className="size-3 text-zinc-300" />
            <span className="text-[11px] text-zinc-400 font-medium">
              {formatDistanceToNow(new Date(memory.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="sticky bottom-0 px-6 py-4 flex items-center bg-white/95 backdrop-blur-xl border-t border-black/[0.04]">
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className={cn(
              'flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-200 ease-in-out',
              'text-red-400 hover:text-red-500 hover:bg-red-50/40',
              isDeleting && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Trash2 className="size-3.5" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </>
  )
}
