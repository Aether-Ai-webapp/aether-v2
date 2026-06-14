'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Brain, Sparkles, Star } from 'lucide-react'
import { useAetherStore } from '@/lib/aether-store'

// ─── Feature Bullets ─────────────────────────────────────────────────
const features = [
  'Unlimited Cognitive Storage',
  'Zero-Friction Voice Ingestion',
  'Continuous Multi-Note AI Synchronization',
]

// ─── Testimonials ────────────────────────────────────────────────────
const testimonials = [
  { name: 'Sarah K.', text: 'Finally, a second brain that actually works.', stars: 5 },
  { name: 'Marcus L.', text: 'The AI synthesis is unreal. It connected ideas I forgot I had.', stars: 5 },
  { name: 'Priya R.', text: 'So clean. So quiet. Exactly what I needed.', stars: 5 },
  { name: 'James T.', text: 'Replaced three apps. Now it\'s just Aether.', stars: 5 },
  { name: 'Elena C.', text: 'Voice capture alone is worth the price.', stars: 5 },
  { name: 'David M.', text: 'My notes finally talk to each other.', stars: 5 },
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
      {/* ── Drifting Gradient (subtle, not flashy) ────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full animate-ambient-drift"
          style={{
            background: 'linear-gradient(135deg, rgba(196,181,253,0.12) 0%, rgba(199,210,254,0.06) 40%, rgba(191,219,254,0.10) 100%)',
            filter: 'blur(100px)',
          }}
        />
        <div
          className="absolute top-[60%] left-[30%] w-[500px] h-[400px] rounded-full animate-ambient-drift-alt"
          style={{
            background: 'linear-gradient(315deg, rgba(254,243,199,0.06) 0%, rgba(196,181,253,0.04) 60%, rgba(191,219,254,0.06) 100%)',
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
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="size-12 rounded-2xl bg-zinc-900 flex items-center justify-center mb-10"
        >
          <Brain className="size-6 text-white" />
        </motion.div>

        {/* Hero heading */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-zinc-900 text-center leading-[1.1]"
        >
          Your mind, entirely unified.
        </motion.h1>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="text-base md:text-lg text-zinc-400 font-normal max-w-lg mx-auto mt-5 text-center leading-relaxed"
        >
          Capture, connect, and synthesize every thought in milliseconds.
        </motion.p>

        {/* Quick-enter link */}
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          onClick={handleCTA}
          className="mt-6 text-sm font-medium text-purple-500 hover:text-purple-600 transition-colors duration-200 underline underline-offset-4"
        >
          Already have an account? Sign in
        </motion.button>

        {/* ── Pricing Container ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 w-full max-w-md"
        >
          <div className="bg-white/90 border border-black/[0.04] shadow-2xl backdrop-blur-md rounded-3xl p-10">
            {/* Plan Header */}
            <p className="text-sm font-semibold tracking-wider text-purple-600 uppercase text-center">
              INFINITE SCALE
            </p>

            {/* Price */}
            <p className="text-5xl font-bold tracking-tight text-zinc-900 mt-3 text-center">
              $5.99{' '}
              <span className="text-base font-medium text-zinc-400">/ month</span>
            </p>

            {/* Divider */}
            <div className="border-t border-black/[0.04] my-6" />

            {/* Features */}
            <ul className="space-y-3.5">
              {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <Sparkles className="size-3.5 text-purple-400 shrink-0" />
                  <span className="text-sm font-medium text-zinc-700">✓ {feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={handleCTA}
              className="w-full py-3.5 text-center text-white bg-zinc-900 hover:bg-zinc-800 transition-all duration-200 rounded-xl font-medium tracking-tight shadow-sm mt-8 active:scale-[0.99]"
            >
              Get Started
            </button>
          </div>
        </motion.div>

        {/* ── Testimonials Ticker ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 w-full max-w-2xl overflow-hidden"
        >
          <div className="flex animate-ticker">
            {[...testimonials, ...testimonials].map((t, i) => (
              <div
                key={i}
                className="flex-shrink-0 mx-3 px-5 py-3 rounded-xl bg-white/60 border border-black/[0.03] min-w-[220px]"
              >
                <div className="flex items-center gap-0.5 mb-1.5">
                  {Array.from({ length: t.stars }).map((_, si) => (
                    <Star key={si} className="size-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs font-medium text-zinc-600 leading-relaxed mb-1">
                  &ldquo;{t.text}&rdquo;
                </p>
                <p className="text-[10px] text-zinc-400 font-medium">
                  {t.name}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer whisper */}
        <p className="mt-10 text-xs text-zinc-300">
          No credit card required. Cancel anytime.
        </p>
      </div>
    </div>
  )
}
