'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Brain, Sparkles } from 'lucide-react'
import { useAetherStore } from '@/lib/aether-store'

// ─── Feature Bullets ─────────────────────────────────────────────────
const features = [
  {
    title: 'Infinite Cognitive Scaling',
    desc: 'Write, record, or drop images without storage limits.',
  },
  {
    title: 'AudioPen-Grade Audio Engine',
    desc: 'Lightning-fast, sub-second transcription via Groq Turbo.',
  },
  {
    title: 'Cross-Memory Synthesis',
    desc: 'Gemini 1.5 Flash instantly connects hidden themes across years of notes.',
  },
  {
    title: 'Zero-Configuration UI',
    desc: 'A quiet, light-mode sanctuary designed for mental breathing room.',
  },
]

// ─── Landing Page ────────────────────────────────────────────────────
export function LandingPage({ onEnterApp }: { onEnterApp: () => void }) {
  const { setShowAuthModal, isAuthenticated } = useAetherStore()

  const handleCTA = () => {
    if (isAuthenticated) {
      onEnterApp()
    } else {
      setShowAuthModal(true)
      onEnterApp()
    }
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F9FAFB] flex flex-col items-center relative">
      {/* ── Drifting Gradient ──────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full animate-ambient-drift"
          style={{
            background: 'linear-gradient(135deg, rgba(196,181,253,0.20) 0%, rgba(199,210,254,0.10) 40%, rgba(191,219,254,0.20) 100%)',
            filter: 'blur(100px)',
          }}
        />
        <div
          className="absolute top-[60%] left-[30%] w-[500px] h-[400px] rounded-full animate-ambient-drift-alt"
          style={{
            background: 'linear-gradient(315deg, rgba(254,243,199,0.12) 0%, rgba(196,181,253,0.08) 60%, rgba(191,219,254,0.10) 100%)',
            filter: 'blur(120px)',
            animationDelay: '-20s',
          }}
        />
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-3xl mx-auto px-6 pt-24 md:pt-32 pb-20">
        {/* Logo mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="size-14 rounded-2xl bg-zinc-900 flex items-center justify-center mb-10"
        >
          <Brain className="size-7 text-white" />
        </motion.div>

        {/* Hero heading */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl md:text-6xl font-semibold tracking-tight text-zinc-900 text-center leading-[1.1]"
        >
          Your brain is full.
          <br />
          Give it to Aether.
        </motion.h1>

        {/* Subhead narrative */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="text-lg md:text-xl text-zinc-400 font-normal max-w-xl mx-auto mt-5 text-center leading-relaxed"
        >
          An ambient, audio-first sanctuary that captures, cleans, and synthesizes your raw cognitive chaos in milliseconds. Zero folders. Infinite clarity.
        </motion.p>

        {/* Quick-enter link */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          onClick={handleCTA}
          className="mt-8 text-sm font-medium text-purple-500 hover:text-purple-600 transition-colors underline underline-offset-4"
        >
          Already have an account? Sign in
        </motion.button>

        {/* ── Pricing Section ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mt-20 w-full max-w-md"
        >
          <div className="bg-white/80 border border-black/[0.04] shadow-2xl backdrop-blur-md rounded-3xl p-10">
            {/* Label */}
            <p className="text-sm font-semibold tracking-wider text-purple-600 uppercase text-center">
              The Lifetime Scale
            </p>

            {/* Price */}
            <p className="text-5xl font-bold tracking-tight text-zinc-900 mt-3 text-center">
              $5.99{' '}
              <span className="text-lg font-medium text-zinc-400">/ month</span>
            </p>

            {/* Divider */}
            <div className="border-t border-black/[0.04] my-6" />

            {/* Features */}
            <ul className="space-y-4">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Sparkles className="size-4 text-purple-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-zinc-800">{feature.title}</span>
                    <span className="text-sm text-zinc-400"> — {feature.desc}</span>
                  </div>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={handleCTA}
              className="w-full py-4 text-center text-white bg-zinc-900 hover:bg-zinc-800 transition-all rounded-xl font-medium tracking-tight shadow-md mt-8 active:scale-[0.98]"
            >
              Get Started
            </button>
          </div>
        </motion.div>

        {/* Footer whisper */}
        <p className="mt-12 text-xs text-zinc-300">
          No credit card required. Cancel anytime.
        </p>
      </div>
    </div>
  )
}
