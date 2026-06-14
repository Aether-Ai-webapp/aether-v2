'use client'

import { motion } from 'framer-motion'

// ─── Deep Space Nebula Background ───────────────────────────────────
// Dark mode: deep purple/violet/indigo nebula clouds that slowly drift
// and shift through purple hues — calm, meditative deep-space feel
//
// Light mode: subtle blue cloudy sky — clean, calm, airy

export function AuroraBackground({ isDark }: { isDark: boolean }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {isDark ? (
        <>
          {/* Nebula Cloud 1: Deep Purple — top-left, slow drift */}
          <motion.div
            animate={{
              x: [0, 60, -40, 20, 0],
              y: [0, -60, 30, -20, 0],
              scale: [1, 1.15, 0.9, 1.05, 1],
              backgroundColor: [
                'rgba(79, 70, 229, 0.12)',    // indigo-600
                'rgba(99, 102, 241, 0.15)',    // indigo-500
                'rgba(67, 56, 202, 0.10)',      // indigo-700
                'rgba(99, 102, 241, 0.13)',     // indigo-500
                'rgba(79, 70, 229, 0.12)',      // back to start
              ],
            }}
            transition={{
              duration: 40,
              ease: 'linear',
              repeat: Infinity,
            }}
            className="absolute top-[-15%] left-[-10%] w-[800px] h-[800px] rounded-full blur-[200px]"
          />

          {/* Nebula Cloud 2: Indigo-to-Violet — bottom-right, slow drift */}
          <motion.div
            animate={{
              x: [0, -50, 60, -30, 0],
              y: [0, 50, -35, 25, 0],
              scale: [1, 0.85, 1.2, 0.95, 1],
              backgroundColor: [
                'rgba(79, 70, 229, 0.10)',    // indigo-600
                'rgba(67, 56, 202, 0.14)',     // indigo-700
                'rgba(59, 130, 246, 0.08)',    // blue-500
                'rgba(99, 102, 241, 0.12)',    // indigo-500
                'rgba(79, 70, 229, 0.10)',     // back to start
              ],
            }}
            transition={{
              duration: 50,
              ease: 'linear',
              repeat: Infinity,
            }}
            className="absolute bottom-[-15%] right-[-10%] w-[700px] h-[700px] rounded-full blur-[180px]"
          />

          {/* Nebula Cloud 3: Violet-to-Purple — center, slow pulse */}
          <motion.div
            animate={{
              x: [0, 70, -50, 30, 0],
              y: [0, -30, 45, -15, 0],
              scale: [1, 1.25, 0.8, 1.1, 1],
              backgroundColor: [
                'rgba(99, 102, 241, 0.08)',   // indigo-500
                'rgba(79, 70, 229, 0.12)',     // indigo-600
                'rgba(55, 48, 163, 0.08)',     // indigo-800
                'rgba(59, 130, 246, 0.10)',    // blue-500
                'rgba(99, 102, 241, 0.08)',    // back to start
              ],
            }}
            transition={{
              duration: 35,
              ease: 'linear',
              repeat: Infinity,
            }}
            className="absolute top-[25%] right-[5%] w-[600px] h-[600px] rounded-full blur-[160px]"
          />

          {/* Nebula Cloud 4: Deep Indigo — left-center, ultra slow */}
          <motion.div
            animate={{
              x: [0, 30, -45, 20, 0],
              y: [0, -40, 20, -30, 0],
              scale: [1, 1.1, 0.9, 1.05, 1],
              backgroundColor: [
                'rgba(49, 46, 129, 0.08)',     // indigo-700
                'rgba(55, 48, 163, 0.12)',      // indigo-800
                'rgba(37, 99, 235, 0.06)',      // blue-600
                'rgba(67, 56, 202, 0.10)',      // indigo-700
                'rgba(49, 46, 129, 0.08)',      // back to start
              ],
            }}
            transition={{
              duration: 60,
              ease: 'linear',
              repeat: Infinity,
            }}
            className="absolute top-[50%] left-[-8%] w-[650px] h-[650px] rounded-full blur-[200px]"
          />

          {/* Subtle warm accent — tiny rose ember glow bottom-left */}
          <motion.div
            animate={{
              x: [0, 20, -15, 0],
              y: [0, -15, 10, 0],
              scale: [1, 1.1, 0.95, 1],
              opacity: [0.5, 0.7, 0.4, 0.5],
            }}
            transition={{
              duration: 25,
              ease: 'linear',
              repeat: Infinity,
            }}
            className="absolute bottom-[5%] left-[15%] w-[300px] h-[300px] bg-rose-900/5 rounded-full blur-[120px]"
          />
        </>
      ) : (
        <>
          {/* Light mode: Subtle blue cloudy sky */}
          {/* Large soft sky cloud — top */}
          <motion.div
            animate={{
              x: [0, 30, -20, 0],
              y: [0, -20, 15, 0],
              scale: [1, 1.05, 0.95, 1],
            }}
            transition={{
              duration: 30,
              ease: 'linear',
              repeat: Infinity,
            }}
            className="absolute top-[-8%] left-[10%] w-[800px] h-[500px] bg-sky-200/25 rounded-full blur-[200px]"
          />

          {/* Soft blue cloud — middle right */}
          <motion.div
            animate={{
              x: [0, -25, 35, 0],
              y: [0, 20, -15, 0],
              scale: [1, 0.95, 1.08, 1],
            }}
            transition={{
              duration: 35,
              ease: 'linear',
              repeat: Infinity,
            }}
            className="absolute top-[20%] right-[5%] w-[600px] h-[400px] bg-blue-200/20 rounded-full blur-[200px]"
          />

          {/* Gentle sky tint — bottom left */}
          <motion.div
            animate={{
              x: [0, 40, -30, 0],
              y: [0, -15, 25, 0],
              scale: [1, 1.08, 0.92, 1],
            }}
            transition={{
              duration: 25,
              ease: 'linear',
              repeat: Infinity,
            }}
            className="absolute bottom-[5%] left-[5%] w-[700px] h-[400px] bg-sky-100/30 rounded-full blur-[220px]"
          />

          {/* Very subtle indigo tint — center */}
          <motion.div
            animate={{
              x: [0, 20, -25, 0],
              y: [0, -25, 15, 0],
              scale: [1, 1.03, 0.97, 1],
            }}
            transition={{
              duration: 40,
              ease: 'linear',
              repeat: Infinity,
            }}
            className="absolute top-[35%] left-[30%] w-[500px] h-[350px] bg-indigo-100/15 rounded-full blur-[200px]"
          />
        </>
      )}
    </div>
  )
}
