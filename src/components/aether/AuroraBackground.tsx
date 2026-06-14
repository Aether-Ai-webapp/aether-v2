'use client'

import { motion } from 'framer-motion'

// ─── Calm Ambient Background ────────────────────────────────────────
// Dark mode: barely-visible, deep warm/slate tints — like distant fog
// Light mode: soft sky clouds — airy, clean

export function AuroraBackground({ isDark }: { isDark: boolean }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {isDark ? (
        <>
          {/* Distant warm haze — top-right, ultra slow */}
          <motion.div
            animate={{
              x: [0, 40, -30, 15, 0],
              y: [0, -30, 20, -10, 0],
              scale: [1, 1.05, 0.95, 1.02, 1],
            }}
            transition={{
              duration: 60,
              ease: 'linear',
              repeat: Infinity,
            }}
            className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#A594F9]/[0.03] rounded-full blur-[200px]"
          />

          {/* Deep slate haze — bottom-left, ultra slow */}
          <motion.div
            animate={{
              x: [0, -30, 40, -15, 0],
              y: [0, 25, -20, 15, 0],
              scale: [1, 0.95, 1.08, 0.98, 1],
            }}
            transition={{
              duration: 70,
              ease: 'linear',
              repeat: Infinity,
            }}
            className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#9381FF]/[0.02] rounded-full blur-[180px]"
          />

          {/* Faint warm ember — center, barely visible */}
          <motion.div
            animate={{
              x: [0, 20, -15, 0],
              y: [0, -10, 8, 0],
              opacity: [0.3, 0.5, 0.3, 0.3],
            }}
            transition={{
              duration: 40,
              ease: 'linear',
              repeat: Infinity,
            }}
            className="absolute top-[35%] left-[20%] w-[300px] h-[300px] bg-[#A594F9]/[0.02] rounded-full blur-[150px]"
          />
        </>
      ) : (
        <>
          {/* Light mode: Subtle sky clouds */}
          <motion.div
            animate={{
              x: [0, 20, -15, 0],
              y: [0, -15, 10, 0],
              scale: [1, 1.03, 0.97, 1],
            }}
            transition={{
              duration: 30,
              ease: 'linear',
              repeat: Infinity,
            }}
            className="absolute top-[-8%] left-[10%] w-[600px] h-[400px] bg-sky-100/20 rounded-full blur-[200px]"
          />

          <motion.div
            animate={{
              x: [0, -20, 25, 0],
              y: [0, 15, -10, 0],
              scale: [1, 0.97, 1.04, 1],
            }}
            transition={{
              duration: 35,
              ease: 'linear',
              repeat: Infinity,
            }}
            className="absolute top-[20%] right-[5%] w-[500px] h-[350px] bg-violet-50/15 rounded-full blur-[200px]"
          />
        </>
      )}
    </div>
  )
}
