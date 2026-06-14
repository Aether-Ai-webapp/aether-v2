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
  Crown,
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
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

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

// ─── Category Config ─────────────────────────────────────────────────
const categoryConfig = {
  link: { label: 'Links', icon: Link2, color: 'text-zinc-400' },
  task: { label: 'Tasks', icon: CheckCircle2, color: 'text-zinc-400' },
  note: { label: 'Notes', icon: FileText, color: 'text-zinc-400' },
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
  const [isJustSaved, setIsJustSaved] = useState(false)

  // ── Feedback state (minimal)
  const [captureFeedback, setCaptureFeedback] = useState<'link' | 'task' | 'note' | null>(null)
  const [lastSavedId, setLastSavedId] = useState<string | null>(null)

  // ── Voice Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // ── Image Upload state
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const justSavedTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

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

  // ── Capture handler ────────────────────────────────────────────────
  const handleCapture = useCallback(async () => {
    const text = captureText.trim()
    if ((!text && !pendingImage) || isSaving) return

    // ── AUTH GATE
    if (!isAuthenticated) {
      const pendingText = text
      setCaptureText('')
      requireAuth(async () => {
        const detectedType = detectContentType(pendingText)
        const memoryType = pendingImage ? 'image' : mapToMemoryType(detectedType)

        setCaptureFeedback(detectedType)
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
        feedbackTimer.current = setTimeout(() => setCaptureFeedback(null), 1800)
        setIsJustSaved(true)
        if (justSavedTimer.current) clearTimeout(justSavedTimer.current)
        justSavedTimer.current = setTimeout(() => setIsJustSaved(false), 500)

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
            setLastSavedId(savedMemory.id)
            setTimeout(() => setLastSavedId(null), 1200)
            fetchMemories()
          } else {
            toast.error('Failed to save')
          }
        } catch {
          toast.error('Something went wrong')
        } finally {
          setIsSaving(false)
        }
      })
      return
    }

    const detectedType = detectContentType(text)
    const memoryType = pendingImage ? 'image' : mapToMemoryType(detectedType)

    setCaptureText('')
    setCaptureFeedback(detectedType)
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    feedbackTimer.current = setTimeout(() => setCaptureFeedback(null), 1800)

    setIsJustSaved(true)
    if (justSavedTimer.current) clearTimeout(justSavedTimer.current)
    justSavedTimer.current = setTimeout(() => setIsJustSaved(false), 500)

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
        setLastSavedId(savedMemory.id)
        setTimeout(() => setLastSavedId(null), 1200)
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
      .slice(0, 6)
  }, [memories])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-full overflow-x-hidden min-h-screen relative flex flex-col items-center pt-8 md:pt-16 pb-24 px-4 md:px-8"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* ── Greeting ──────────────────────────────────────────────────── */}
      <section className="w-full max-w-xl mx-auto mb-10">
        <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-zinc-800">
          {mounted ? getGreeting() : ''}
        </h1>
      </section>

      {/* ── Capture Bar ───────────────────────────────────────────────── */}
      <section className="w-full max-w-xl mx-auto mb-14">
        {/* Image preview */}
        <AnimatePresence>
          {pendingImagePreview && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="mb-2.5 inline-flex items-center gap-3 px-3 py-2 rounded-xl bg-white/60 backdrop-blur-xl border border-black/[0.03] max-w-full"
            >
              <img
                src={pendingImagePreview}
                alt="Preview"
                className="size-10 rounded-lg object-cover"
              />
              <span className="text-xs font-medium text-zinc-500 truncate max-w-[120px]">
                {pendingImage?.name.slice(0, 20) || 'Image'}
              </span>
              <button
                onClick={removePendingImage}
                className="size-5 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="size-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className={cn(
            'relative rounded-2xl p-1 transition-all duration-300',
            isJustSaved
              ? 'bg-white/70 backdrop-blur-xl border border-purple-200/40 shadow-[0_0_40px_rgba(168,85,247,0.04)]'
              : 'bg-white/60 backdrop-blur-xl border border-black/[0.03] shadow-[0_8px_30px_rgb(0,0,0,0.01)] focus-within:border-purple-300/60 focus-within:shadow-[0_0_50px_rgba(168,85,247,0.05)]'
          )}
        >
          <div className="flex items-center gap-2 px-3 py-2.5 min-w-0">
            <input
              value={captureText}
              onChange={(e) => setCaptureText(e.target.value)}
              onKeyDown={handleCaptureKeyDown}
              placeholder="What's on your mind?"
              disabled={isSaving}
              className="w-full min-w-0 bg-transparent text-base font-medium text-zinc-800 placeholder:text-zinc-300 focus:outline-none px-1 tracking-tight"
            />

            {/* Image upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center size-8 rounded-lg transition-colors shrink-0 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100/60"
              aria-label="Attach image"
            >
              <ImageIcon className="size-4" />
            </button>

            {/* Mic */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              className={cn(
                'flex items-center justify-center size-8 rounded-lg transition-colors shrink-0',
                isRecording
                  ? 'bg-red-50 text-red-400'
                  : isTranscribing
                    ? 'text-zinc-300'
                    : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100/60'
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

            {/* Send */}
            <button
              onClick={handleCapture}
              disabled={(!captureText.trim() && !pendingImage) || isSaving}
              className={cn(
                'flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-150 shrink-0',
                (captureText.trim() || pendingImage) && !isSaving
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-white'
                  : 'bg-zinc-100 text-zinc-300'
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

        {/* Capture feedback — minimal */}
        <AnimatePresence>
          {captureFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="flex justify-center mt-3"
            >
              <span className="text-[11px] font-medium text-zinc-400">
                Saved to {categoryConfig[captureFeedback].label}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── Memory Grid ───────────────────────────────────────────────── */}
      <section className="w-full max-w-3xl mx-auto">
        {!hasFetched ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 auto-rows-[160px]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl p-5 bg-white/60 border border-black/[0.03] animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-zinc-100 shrink-0" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-3 rounded-md w-3/4 bg-zinc-100" />
                    <div className="h-2.5 rounded-md w-1/2 bg-zinc-50" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayMemories.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <Brain className="size-12 text-zinc-200 mb-4" />
            <p className="text-sm text-zinc-400">No memories yet</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 auto-rows-[minmax(160px,auto)]">
            {displayMemories.map((memory, index) => {
              const detectedType = detectContentType(memory.content)
              const isWide = index === 0 || detectedType === 'link' || !!memory.imageUrl
              return (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  isNew={memory.id === lastSavedId}
                  isWide={isWide}
                  index={index}
                  onClick={() => setSelectedMemory(memory)}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* ── Memory Drawer ─────────────────────────────────────────────── */}
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

// ─── Memory Card ────────────────────────────────────────────────────
function MemoryCard({ memory, isNew, isWide, index, onClick }: {
  memory: Memory
  isNew: boolean
  isWide: boolean
  index: number
  onClick: () => void
}) {
  const displayTitle = memory.title || memory.content.split('\n')[0].slice(0, 80) || 'Untitled'
  const relativeTime = formatDistanceToNow(new Date(memory.createdAt), { addSuffix: true })
  const detectedType = detectContentType(memory.content)
  const config = categoryConfig[detectedType]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut', delay: index * 0.04 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.99 }}
      className={cn('group relative', isWide && 'md:col-span-2')}
    >
      <div
        onClick={onClick}
        className={cn(
          'relative overflow-hidden rounded-2xl p-5 transition-all duration-150 cursor-pointer h-full',
          isNew
            ? 'bg-white/80 backdrop-blur-xl border border-purple-200/40 shadow-[0_0_30px_rgba(168,85,247,0.04)]'
            : 'bg-white/60 backdrop-blur-xl border border-black/[0.03] shadow-[0_8px_30px_rgb(0,0,0,0.01)] hover:bg-white/70 hover:border-black/[0.06]'
        )}
      >
        {/* Image */}
        {memory.imageUrl && (
          <div className="mb-3">
            <img
              src={memory.imageUrl}
              alt={displayTitle}
              className="w-full h-28 object-cover rounded-xl"
            />
          </div>
        )}

        {/* Type badge + time */}
        <div className="flex items-center justify-between mb-3">
          <div className="size-7 rounded-lg flex items-center justify-center bg-zinc-50">
            <Icon className={cn('size-3.5', config.color)} />
          </div>
          <span className="text-[10px] text-zinc-300 font-medium">
            {relativeTime}
          </span>
        </div>

        {/* Content */}
        <p className={cn(
          'text-sm leading-relaxed font-medium text-zinc-600',
          isWide ? 'line-clamp-3' : 'line-clamp-2'
        )}>
          {displayTitle}
        </p>

        {/* Tags */}
        {memory.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {memory.tags.slice(0, isWide ? 4 : 3).map((tag) => (
              <span key={tag} className="inline-block text-[10px] px-2 py-0.5 rounded-md bg-purple-50/80 text-purple-500 font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Hover arrow */}
        <ChevronRight className="size-3 absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-300" />
      </div>
    </motion.div>
  )
}

// ─── Memory Drawer ──────────────────────────────────────────────────
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
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="fixed top-0 right-0 h-full z-50 w-full max-w-md overflow-y-auto bg-white/90 backdrop-blur-2xl border-l border-black/[0.03]"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/90 backdrop-blur-xl border-b border-black/[0.03]">
          <h2 className="text-base font-medium tracking-tight text-zinc-800 pr-4 truncate">
            {memory.title || 'Untitled'}
          </h2>
          <button
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center transition-colors shrink-0 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* AI Recap */}
          {memory.recap && (
            <div className="rounded-xl p-4 bg-purple-50/40 border border-purple-100/30">
              <p className="text-[10px] uppercase tracking-[0.12em] mb-2 text-purple-400 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Recap
              </p>
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

          {/* Tags */}
          {memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {memory.tags.map((tag) => (
                <span key={tag} className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-50/60 text-purple-500 font-medium">
                  {tag}
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
        <div className="sticky bottom-0 px-6 py-4 flex items-center bg-white/90 backdrop-blur-xl border-t border-black/[0.03]">
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className={cn(
              'flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-colors',
              'text-red-400 hover:text-red-500 hover:bg-red-50/60',
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
