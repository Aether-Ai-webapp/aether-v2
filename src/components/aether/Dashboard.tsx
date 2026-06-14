'use client'

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  X,
  Trash2,
  Crown,
  Link2,
  FileText,
  CheckCircle2,
  Download,
  Command,
  Zap,
  Brain,
  Clock,
  Image as ImageIcon,
  Loader2,
  ChevronRight,
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
  link: { label: 'Links', icon: Link2, color: 'text-emerald-400' },
  task: { label: 'Tasks', icon: CheckCircle2, color: 'text-amber-400' },
  note: { label: 'Notes', icon: FileText, color: 'text-indigo-400' },
}

// ─── Particle Burst Engine ───────────────────────────────────────────
interface Particle {
  id: number
  x: number
  y: number
  scale: number
  rotate: number
  duration: number
  color: string
  size: number
}

function generateParticles(count: number = 12): Particle[] {
  const colors = [
    'rgba(124, 58, 237, 0.8)',
    'rgba(99, 102, 241, 0.7)',
    'rgba(79, 70, 229, 0.6)',
    'rgba(59, 130, 246, 0.5)',
    'rgba(37, 99, 235, 0.5)',
    'rgba(236, 72, 153, 0.6)',
  ]
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 160,
    y: -(80 + Math.random() * 120),
    scale: 0.4 + Math.random() * 0.8,
    rotate: (Math.random() - 0.5) * 360,
    duration: 0.5 + Math.random() * 0.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 4 + Math.random() * 8,
  }))
}

function ParticleBurst({ particles, isDark }: { particles: Particle[]; isDark: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-20">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
          animate={{
            opacity: [1, 1, 0],
            x: p.x,
            y: p.y,
            scale: [0, p.scale, 0],
            rotate: p.rotate,
          }}
          transition={{ duration: p.duration, ease: [0.22, 1, 0.36, 1] }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: isDark ? `0 0 ${p.size * 3}px ${p.color}` : `0 0 ${p.size}px ${p.color}`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Capture Feedback Card ──────────────────────────────────────────
interface CaptureFeedback {
  category: 'link' | 'task' | 'note'
}

function CaptureFeedbackCard({ feedback, isDark }: { feedback: CaptureFeedback; isDark: boolean }) {
  const config = categoryConfig[feedback.category]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -8, scale: 0.98, filter: 'blur(2px)', transition: { duration: 0.3, ease: 'easeInOut' } }}
      transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.15 }}
      className={cn(
        'mt-5 inline-flex items-center gap-3 px-5 py-3 rounded-2xl',
        isDark
          ? 'bg-[#16171B]/80 backdrop-blur-xl border border-white/[0.08] shadow-[0_0_24px_-5px_rgba(168,85,247,0.2)]'
          : 'bg-white border border-purple-100 shadow-lg shadow-purple-500/10'
      )}
    >
      <div className={cn(
        'size-8 rounded-xl flex items-center justify-center',
        isDark ? 'bg-indigo-500/10' : 'bg-purple-50'
      )}>
        <Icon className={cn('size-4', config.color)} />
      </div>
      <div className="flex items-center gap-1.5 text-sm">
        <span className={cn(isDark ? 'text-zinc-500' : 'text-gray-400')}>Captured. Cleaned up. Sent to</span>
        <span className={cn('font-semibold', isDark ? 'text-indigo-400' : 'text-purple-600')}>
          {config.label}
        </span>
      </div>
    </motion.div>
  )
}

// ─── Shimmer Border for New Cards ───────────────────────────────────
function ShimmerBorder({ isDark }: { isDark: boolean }) {
  return (
    <motion.div
      initial={{ x: '-100%' }}
      animate={{ x: '200%' }}
      transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-2xl"
    >
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.15) 40%, rgba(168,85,247,0.25) 50%, rgba(99,102,241,0.15) 60%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.1) 40%, rgba(192,132,252,0.18) 50%, rgba(168,85,247,0.1) 60%, transparent 100%)',
        }}
      />
    </motion.div>
  )
}

// ─── Animated Border Beam ───────────────────────────────────────────
function BorderBeam({ isFocused, isDark }: { isFocused: boolean; isDark: boolean }) {
  return (
    <AnimatePresence>
      {isFocused && isDark && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute -inset-[1px] rounded-2xl overflow-hidden pointer-events-none z-0"
        >
          <div className="absolute inset-0 animate-border-beam">
            <div
              className="absolute inset-0"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0%, transparent 70%, rgba(99,102,241,0.6) 80%, rgba(168,85,247,0.8) 85%, rgba(236,72,153,0.6) 90%, transparent 100%)',
              }}
            />
          </div>
          <div className="absolute inset-[1px] rounded-2xl bg-[#0B0C0E]" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Main Dashboard Component ────────────────────────────────────────
export function Dashboard() {
  const {
    memories,
    saveMemory,
    fetchMemories,
    deleteMemoryFromDB,
    darkMode,
    isLoading,
    isAuthenticated,
    requireAuth,
  } = useAetherStore()

  const [captureText, setCaptureText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isJustSaved, setIsJustSaved] = useState(false)

  // ── Dopamine Engine state
  const [particles, setParticles] = useState<Particle[]>([])
  const [captureFeedback, setCaptureFeedback] = useState<CaptureFeedback | null>(null)
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

  const justSavedTimer = useRef<ReturnType<typeof setTimeout>>()
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>()

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

  // ── Capture bar focus tracking
  const [isCaptureFocused, setIsCaptureFocused] = useState(false)

  const FREE_MEMORY_LIMIT = 15

  // ── Upload image to Supabase Storage ────────────────────────────────
  const uploadImageToStorage = useCallback(async (file: File): Promise<string | null> => {
    try {
      // Try Supabase Storage first
      const { getSupabaseBrowser } = await import('@/lib/aether-store')
      // We need the raw supabase client — access it via the store's internal helper
      // Instead, use the browser client directly
      const { createClient } = await import('@/lib/supabase/browser')
      const supabase = createClient()

      const fileExt = file.name.split('.').pop() || 'png'
      const fileName = `memory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('memory-assets')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        console.warn('[uploadImage] Supabase Storage upload failed:', uploadError.message)
        // Return a data URL as fallback
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

        // Send to Groq Whisper for transcription
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
              toast.success('Voice transcribed!', { icon: <Mic className="size-4" /> })
            } else {
              toast.error('Could not detect speech. Try again.')
            }
          } else {
            toast.error('Voice transcription failed.')
          }
        } catch (err) {
          console.error('[transcribe] Error:', err)
          toast.error('Voice transcription failed.')
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('[mic] Microphone access denied:', err)
      toast.error('Microphone access denied. Please allow microphone permissions.')
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

    // Validate image
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB')
      return
    }

    setPendingImage(file)

    // Generate preview URL
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

  // ── Capture handler (Dopamine Engine wired in) ──────────────────────
  const handleCapture = useCallback(async () => {
    const text = captureText.trim()
    if ((!text && !pendingImage) || isSaving) return

    // ── AUTH GATE: Block submission if not signed in ──────────────────
    if (!isAuthenticated) {
      const pendingText = text
      setCaptureText('')
      requireAuth(async () => {
        const detectedType = detectContentType(pendingText)
        const memoryType = pendingImage ? 'image' : mapToMemoryType(detectedType)

        setParticles(generateParticles(14))
        setTimeout(() => setParticles([]), 1200)
        setCaptureFeedback({ category: detectedType })
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
        feedbackTimer.current = setTimeout(() => setCaptureFeedback(null), 2500)
        setIsJustSaved(true)
        if (justSavedTimer.current) clearTimeout(justSavedTimer.current)
        justSavedTimer.current = setTimeout(() => setIsJustSaved(false), 600)

        // Upload image if present
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
            setTimeout(() => setLastSavedId(null), 1500)
            fetchMemories()
          } else {
            toast.error('Failed to save. Please try again.')
          }
        } catch {
          toast.error('Something went wrong while saving.')
        } finally {
          setIsSaving(false)
        }
      })
      return
    }

    const detectedType = detectContentType(text)
    const memoryType = pendingImage ? 'image' : mapToMemoryType(detectedType)

    setCaptureText('')
    setParticles(generateParticles(14))
    setTimeout(() => setParticles([]), 1200)

    setCaptureFeedback({ category: detectedType })
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    feedbackTimer.current = setTimeout(() => setCaptureFeedback(null), 2500)

    setIsJustSaved(true)
    if (justSavedTimer.current) clearTimeout(justSavedTimer.current)
    justSavedTimer.current = setTimeout(() => setIsJustSaved(false), 600)

    if (memories.length >= FREE_MEMORY_LIMIT) {
      setTimeout(() => setShowPaywall(true), 800)
      return
    }

    // Upload image if present
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
        setTimeout(() => setLastSavedId(null), 1500)
        fetchMemories()
      } else {
        toast.error('Failed to save. Please try again.')
      }
    } catch {
      toast.error('Something went wrong while saving.')
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

  const isDark = darkMode

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'min-h-screen relative overflow-hidden flex flex-col items-center pt-6 md:pt-10 pb-24 px-4',
        isDark ? 'bg-transparent text-zinc-100' : 'bg-gradient-to-b from-slate-50 to-white text-gray-900'
      )}
    >
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* ── Hero Greeting + Stats ──────────────────────────────────────── */}
      <section className="relative z-10 w-full max-w-2xl mx-auto mb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className={cn(
            'text-4xl md:text-5xl font-black tracking-tighter leading-none mb-3',
            isDark
              ? 'bg-gradient-to-b from-white via-white to-zinc-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.08)]'
              : 'text-gray-900'
          )}>
            {mounted ? getGreeting() : ''}
          </h1>
          <p className={cn(
            'text-sm md:text-base font-medium tracking-wide',
            isDark ? 'text-zinc-500' : 'text-gray-400'
          )}>
            {mounted ? "What's on your mind?" : ''}
          </p>
        </motion.div>

        {/* ── Stats Row ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-6 mt-6"
        >
          <div className="flex items-center gap-2.5">
            <div className={cn(
              'size-9 rounded-xl flex items-center justify-center',
              isDark ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-purple-50 border border-purple-100'
            )}>
              <Brain className={cn('size-4', isDark ? 'text-indigo-400' : 'text-purple-600')} />
            </div>
            <div>
              <span className={cn(
                'text-2xl md:text-3xl font-black tracking-tighter block leading-none',
                isDark ? 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'text-gray-900'
              )}>
                {memories.length}
              </span>
              <span className={cn('text-[10px] font-semibold uppercase tracking-widest', isDark ? 'text-zinc-500' : 'text-gray-400')}>
                Memories
              </span>
            </div>
          </div>

          {memories.length > 0 && (
            <div className="flex items-center gap-2.5">
              <div className={cn(
                'size-9 rounded-xl flex items-center justify-center',
                isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'
              )}>
                <Zap className={cn('size-4', isDark ? 'text-emerald-400' : 'text-emerald-600')} />
              </div>
              <div>
                <span className={cn(
                  'text-2xl md:text-3xl font-black tracking-tighter block leading-none',
                  isDark ? 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'text-gray-900'
                )}>
                  {displayMemories.filter(m => m.type === 'link').length}
                </span>
                <span className={cn('text-[10px] font-semibold uppercase tracking-widest', isDark ? 'text-zinc-500' : 'text-gray-400')}>
                  Links
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </section>

      {/* ── Fluid Search Console (Capture Bar) ────────────────────────── */}
      <section className="relative z-10 w-full max-w-2xl mx-auto mb-12">
        <BorderBeam isFocused={isCaptureFocused} isDark={isDark} />

        {/* Image preview above capture bar */}
        <AnimatePresence>
          {pendingImagePreview && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={cn(
                'mb-3 inline-flex items-center gap-3 px-3 py-2 rounded-2xl relative',
                isDark
                  ? 'bg-[#16171B]/80 backdrop-blur-xl border border-white/[0.08]'
                  : 'bg-white border border-gray-200 shadow-md'
              )}
            >
              <img
                src={pendingImagePreview}
                alt="Preview"
                className="size-12 rounded-xl object-cover"
              />
              <div className="flex flex-col">
                <span className={cn('text-xs font-medium', isDark ? 'text-zinc-300' : 'text-gray-700')}>
                  {pendingImage?.name.slice(0, 24) || 'Image'}
                </span>
                <span className={cn('text-[10px]', isDark ? 'text-zinc-600' : 'text-gray-400')}>
                  {pendingImage ? `${(pendingImage.size / 1024).toFixed(0)}KB` : ''}
                </span>
              </div>
              <button
                onClick={removePendingImage}
                className={cn(
                  'size-6 rounded-lg flex items-center justify-center transition-colors ml-1',
                  isDark ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                )}
              >
                <X className="size-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          animate={isCaptureFocused ? { scale: 1.02 } : { scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'relative rounded-2xl p-1 transition-all duration-500',
            isDark
              ? isJustSaved
                ? 'bg-[#16171B]/80 backdrop-blur-xl border border-purple-500/30 shadow-[0_0_0_1px_rgba(168,85,247,0.4),0_0_60px_-8px_rgba(168,85,247,0.35)]'
                : 'bg-[#16171B]/80 backdrop-blur-xl border border-white/[0.08] shadow-inner shadow-black/20 focus-within:ring-1 focus-within:ring-purple-500/50 focus-within:shadow-[0_0_50px_rgba(168,85,247,0.35)] focus-within:border-purple-500/30'
              : isJustSaved
                ? 'bg-white border border-purple-300/50 shadow-[0_0_0_1px_rgba(168,85,247,0.3),0_0_40px_-10px_rgba(168,85,247,0.2)]'
                : 'bg-white border border-gray-200 shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_0_30px_-10px_rgba(168,85,247,0.06)] focus-within:shadow-[0_0_0_1px_rgba(168,85,247,0.2),0_0_40px_-10px_rgba(168,85,247,0.1)] focus-within:border-purple-300/30'
          )}
        >
          <div className="flex items-center gap-2 px-4 py-3">
            <div className={cn(
              'shrink-0 size-8 rounded-xl flex items-center justify-center',
              isDark ? 'bg-zinc-900/80 border border-white/10' : 'bg-gray-50 border border-gray-200'
            )}>
              <Command className={cn('size-3.5', isDark ? 'text-zinc-500' : 'text-gray-400')} />
            </div>

            <input
              value={captureText}
              onChange={(e) => setCaptureText(e.target.value)}
              onKeyDown={handleCaptureKeyDown}
              onFocus={() => setIsCaptureFocused(true)}
              onBlur={() => setIsCaptureFocused(false)}
              placeholder="Dump a thought, URL, or task... press Enter"
              disabled={isSaving}
              className={cn(
                'w-full bg-transparent text-base font-medium focus:outline-none px-2',
                isDark ? 'text-zinc-100 placeholder:text-zinc-600' : 'text-gray-900 placeholder:text-gray-300'
              )}
            />

            {/* Image upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex items-center justify-center size-9 rounded-xl transition-all duration-200 shrink-0',
                isDark
                  ? 'bg-zinc-900/80 border border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20 hover:bg-zinc-800/80'
                  : 'bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'
              )}
              aria-label="Attach image"
            >
              <ImageIcon className="size-4" />
            </button>

            {/* Mic button — recording toggle */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              className={cn(
                'flex items-center justify-center size-9 rounded-xl transition-all duration-200 shrink-0',
                isRecording
                  ? 'bg-red-500/20 border border-red-500/30 text-red-400 animate-pulse'
                  : isTranscribing
                    ? isDark
                      ? 'bg-zinc-900/80 border border-white/10 text-zinc-500'
                      : 'bg-gray-50 border border-gray-200 text-gray-400'
                    : isDark
                      ? 'bg-zinc-900/80 border border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20 hover:bg-zinc-800/80'
                      : 'bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'
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

            {/* Capture/Send button */}
            <motion.button
              onClick={handleCapture}
              disabled={(!captureText.trim() && !pendingImage) || isSaving}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className={cn(
                'flex items-center justify-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shrink-0',
                (captureText.trim() || pendingImage) && !isSaving
                  ? isDark
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500 hover:from-purple-500 hover:via-indigo-400 hover:to-blue-400 text-white shadow-[0_0_24px_-4px_rgba(168,85,247,0.5)] hover:shadow-[0_0_40px_-4px_rgba(168,85,247,0.7)] animate-shimmer'
                    : 'bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-400 hover:to-violet-400 text-white shadow-[0_0_24px_-4px_rgba(168,85,247,0.3)] hover:shadow-[0_0_40px_-4px_rgba(168,85,247,0.5)]'
                  : isDark
                    ? 'bg-zinc-900/80 border border-white/10 text-zinc-600'
                    : 'bg-gray-50 border border-gray-200 text-gray-300'
              )}
            >
              {isSaving ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
                  <Sparkles className="size-4" />
                </motion.div>
              ) : (
                <>
                  <Send className="size-4" />
                  <span className="hidden sm:inline">Capture</span>
                </>
              )}
            </motion.button>
          </div>

          {/* 🫧 Particle Burst Layer */}
          <AnimatePresence>
            {particles.length > 0 && <ParticleBurst particles={particles} isDark={isDark} />}
          </AnimatePresence>
        </motion.div>

        {/* 🎯 Capture Feedback Card */}
        <div className="flex justify-center">
          <AnimatePresence>
            {captureFeedback && <CaptureFeedbackCard feedback={captureFeedback} isDark={isDark} />}
          </AnimatePresence>
        </div>

        {/* Free Plan Limit */}
        {memories.length > 0 && (
          <div className={cn('flex items-center justify-center gap-1.5 mt-4', isDark ? 'text-zinc-600' : 'text-gray-300')}>
            {memories.length >= FREE_MEMORY_LIMIT ? (
              <>
                <Crown className="size-3 text-purple-500/60" />
                <span className={cn('text-[11px] font-medium', isDark ? 'text-indigo-400/60' : 'text-purple-600')}>
                  Free limit reached — upgrade for unlimited
                </span>
              </>
            ) : memories.length >= FREE_MEMORY_LIMIT - 3 ? (
              <>
                <Crown className="size-3" />
                <span className="text-[11px]">{FREE_MEMORY_LIMIT - memories.length} memories remaining on Free plan</span>
              </>
            ) : (
              <span className="text-[11px]">{memories.length} / {FREE_MEMORY_LIMIT} free memories</span>
            )}
          </div>
        )}
      </section>

      {/* ── Bento Memory Grid ────────────────────────────────────────── */}
      <section className="relative z-10 w-full max-w-4xl mx-auto">
        {!hasFetched ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[180px]">
            {[0, 1, 2].map((i) => (
              <div key={i} className={cn(
                'rounded-2xl p-6 animate-pulse',
                isDark ? 'bg-gradient-to-b from-zinc-900/60 to-black/30 border border-white/[0.06]' : 'bg-gray-50 border border-gray-100'
              )}>
                <div className="flex items-start gap-4">
                  <div className={cn('size-10 rounded-xl shrink-0', isDark ? 'bg-zinc-800/40' : 'bg-gray-100')} />
                  <div className="flex-1 space-y-3">
                    <div className={cn('h-4 rounded-lg w-3/4', isDark ? 'bg-zinc-800/40' : 'bg-gray-100')} />
                    <div className={cn('h-3 rounded-lg w-1/2', isDark ? 'bg-zinc-800/30' : 'bg-gray-100')} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayMemories.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className={cn(
              'size-20 rounded-3xl flex items-center justify-center mb-6',
              isDark ? 'bg-gradient-to-b from-zinc-900/80 to-zinc-900/40 border border-white/[0.06]' : 'bg-gray-50 border border-gray-100'
            )}>
              <Brain className={cn('size-10', isDark ? 'text-zinc-700' : 'text-gray-200')} />
            </div>
            <p className={cn('text-lg font-semibold mb-1', isDark ? 'text-zinc-500' : 'text-gray-400')}>Your mind is clear</p>
            <p className={cn('text-sm', isDark ? 'text-zinc-700' : 'text-gray-300')}>Dump a thought above to start building your second brain.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[minmax(180px,auto)]">
            {displayMemories.map((memory, index) => {
              const detectedType = detectContentType(memory.content)
              const isWide = index === 0 || detectedType === 'link' || memory.imageUrl
              return (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  isDark={isDark}
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

      {/* ── Memory Drawer ─────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedMemory && (
          <MemoryDrawer
            memory={selectedMemory}
            isDark={isDark}
            onClose={() => setSelectedMemory(null)}
            onDelete={handleDeleteMemory}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>

      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} isDark={isDark} />
    </motion.div>
  )
}

// ─── Memory Card (Bento) ───────────────────────────────────────────
function MemoryCard({ memory, isDark, isNew, isWide, index, onClick }: {
  memory: Memory
  isDark: boolean
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
      initial={isNew
        ? { opacity: 0, y: 40, scale: 0.9, filter: 'blur(8px)' }
        : { opacity: 0, y: 30, scale: 0.95, filter: 'blur(4px)' }
      }
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      transition={
        isNew
          ? { type: 'spring', stiffness: 170, damping: 18, delay: 0.2 }
          : { type: 'spring', stiffness: 260, damping: 20, delay: index * 0.06 }
      }
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
      whileTap={{ scale: 0.98 }}
      className={cn('group relative', isWide && 'md:col-span-2')}
    >
      <div
        onClick={onClick}
        className={cn(
          'relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-pointer h-full',
          isNew
            ? isDark
              ? 'bg-gradient-to-b from-zinc-900/90 to-black/40 backdrop-blur-xl border border-purple-500/20 shadow-[0_0_40px_-8px_rgba(168,85,247,0.3)]'
              : 'bg-white border border-purple-200/60 shadow-lg shadow-purple-500/10'
            : isDark
              ? 'bg-gradient-to-b from-zinc-900/90 to-black/40 backdrop-blur-xl border border-white/[0.08] hover:border-zinc-500 hover:bg-zinc-800/50'
              : 'bg-white border border-gray-100 hover:bg-gray-50/80 hover:border-purple-200/60 hover:shadow-lg hover:shadow-purple-500/5'
        )}
      >
        {isNew && <ShimmerBorder isDark={isDark} />}

        {/* Card image */}
        {memory.imageUrl && (
          <div className="mb-3 relative z-0">
            <img
              src={memory.imageUrl}
              alt={displayTitle}
              className="w-full h-32 object-cover rounded-xl"
            />
          </div>
        )}

        {/* Card type badge */}
        <div className="flex items-center justify-between mb-4 relative z-0">
          <div className={cn(
            'size-8 rounded-xl flex items-center justify-center transition-all duration-300',
            isDark ? 'bg-zinc-900/80 border border-white/10 group-hover:border-white/20' : 'bg-gray-50 border border-gray-100'
          )}>
            <Icon className={cn('size-3.5', config.color)} />
          </div>
          <span className={cn('text-[10px] font-semibold uppercase tracking-widest', isDark ? 'text-zinc-600' : 'text-gray-300')}>
            {detectedType}
          </span>
        </div>

        {/* Content */}
        <p className={cn(
          'text-sm leading-relaxed relative z-0 font-medium',
          isDark ? 'text-zinc-300' : 'text-gray-700',
          isWide ? 'line-clamp-3' : 'line-clamp-2'
        )}>
          {displayTitle}
        </p>

        {/* Tags */}
        {memory.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 relative z-0">
            {memory.tags.slice(0, isWide ? 4 : 3).map((tag) => (
              <span key={tag} className={cn(
                'inline-block text-[10px] font-semibold px-2.5 py-1 rounded-lg uppercase tracking-wider',
                isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10' : 'bg-purple-50 text-purple-600'
              )}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 mt-4 relative z-0">
          <Clock className={cn('size-3', isDark ? 'text-zinc-700' : 'text-gray-300')} />
          <span className={cn('text-[11px] font-medium', isDark ? 'text-zinc-600' : 'text-gray-400')}>
            {relativeTime}
          </span>
          <ChevronRight className={cn('size-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity', isDark ? 'text-zinc-500' : 'text-gray-400')} />
        </div>

        {/* Hover spotlight overlay */}
        <div className={cn(
          'absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none',
          isDark && 'bg-gradient-to-br from-white/[0.02] via-transparent to-transparent'
        )} />
      </div>
    </motion.div>
  )
}

// ─── Memory Drawer (Slide-in Panel) ──────────────────────────────────
function MemoryDrawer({
  memory,
  isDark,
  onClose,
  onDelete,
  isDeleting,
}: {
  memory: Memory
  isDark: boolean
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
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className={cn(
          'fixed top-0 right-0 h-full z-50 w-full max-w-md overflow-y-auto',
          isDark
            ? 'bg-gradient-to-b from-[#181A20] to-[#0D0E12] border-l border-white/[0.06]'
            : 'bg-white border-l border-gray-200'
        )}
      >
        {/* Header */}
        <div className={cn(
          'sticky top-0 z-10 flex items-center justify-between px-6 py-4',
          isDark
            ? 'bg-[#181A20]/90 backdrop-blur-xl border-b border-white/[0.06]'
            : 'bg-white/90 backdrop-blur-xl border-b border-gray-100'
        )}>
          <h2 className={cn(
            'text-lg font-bold tracking-tight pr-4',
            isDark ? 'bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent' : 'text-gray-900'
          )}>
            {memory.title || 'Untitled Memory'}
          </h2>
          <button
            onClick={onClose}
            className={cn(
              'size-9 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0',
              isDark
                ? 'bg-zinc-900/80 border border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20'
                : 'bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-600'
            )}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* AI Recap Section */}
          {memory.recap && (
            <div className={cn(
              'rounded-2xl p-5',
              isDark
                ? 'bg-indigo-500/[0.06] border border-indigo-500/10 shadow-[inset_0_0_20px_-10px_rgba(99,102,241,0.1)]'
                : 'bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100/60'
            )}>
              <p className={cn(
                'text-[10px] font-bold uppercase tracking-[0.15em] mb-3 flex items-center gap-2',
                isDark ? 'text-indigo-400' : 'text-purple-600'
              )}>
                <Sparkles className="w-3.5 h-3.5" />
                AI Recap
              </p>
              <p className={cn('text-sm leading-relaxed font-medium', isDark ? 'text-zinc-400' : 'text-gray-600')}>
                {memory.recap}
              </p>
            </div>
          )}

          {/* Image */}
          {memory.imageUrl && (
            <div>
              <p className={cn(
                'text-[10px] font-bold uppercase tracking-[0.15em] mb-3',
                isDark ? 'text-zinc-600' : 'text-gray-400'
              )}>
                Image
              </p>
              <img
                src={memory.imageUrl}
                alt={memory.title || 'Memory image'}
                className="w-full rounded-2xl object-cover max-h-64"
              />
            </div>
          )}

          {/* Tags */}
          {memory.tags.length > 0 && (
            <div>
              <p className={cn('text-[10px] font-bold uppercase tracking-[0.15em] mb-3', isDark ? 'text-zinc-600' : 'text-gray-400')}>
                Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {memory.tags.map((tag) => (
                  <span key={tag} className={cn(
                    'text-xs px-3 py-1 rounded-lg font-semibold',
                    isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10' : 'bg-purple-100 text-purple-700'
                  )}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Original Content */}
          <div>
            <p className={cn('text-[10px] font-bold uppercase tracking-[0.15em] mb-3', isDark ? 'text-zinc-600' : 'text-gray-400')}>
              Original
            </p>
            <p className={cn('text-sm leading-relaxed whitespace-pre-wrap font-medium', isDark ? 'text-zinc-300' : 'text-gray-800')}>
              {memory.content}
            </p>
          </div>

          {/* Source URL */}
          {memory.sourceUrl && (
            <div>
              <p className={cn('text-[10px] font-bold uppercase tracking-[0.15em] mb-3', isDark ? 'text-zinc-600' : 'text-gray-400')}>
                Source
              </p>
              <a
                href={memory.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn('text-sm underline break-all font-medium', isDark ? 'text-indigo-400/70 hover:text-indigo-400' : 'text-purple-600 hover:text-purple-800')}
              >
                {memory.sourceUrl}
              </a>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-2">
            <Clock className={cn('size-3.5', isDark ? 'text-zinc-700' : 'text-gray-300')} />
            <span className={cn('text-xs font-medium', isDark ? 'text-zinc-600' : 'text-gray-400')}>
              {formatDistanceToNow(new Date(memory.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className={cn(
          'sticky bottom-0 px-6 py-4 flex items-center gap-3',
          isDark
            ? 'bg-[#0D0E12]/90 backdrop-blur-xl border-t border-white/[0.06]'
            : 'bg-white/90 backdrop-blur-xl border-t border-gray-100'
        )}>
          <motion.button
            onClick={onDelete}
            disabled={isDeleting}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className={cn(
              'flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors',
              isDark
                ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/10'
                : 'text-red-500 bg-red-50 hover:bg-red-100 border border-red-100',
              isDeleting && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Trash2 className="size-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </motion.button>
        </div>
      </motion.div>
    </>
  )
}
