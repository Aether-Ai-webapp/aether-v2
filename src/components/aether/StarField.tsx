'use client'

import { useEffect, useRef } from 'react'

// ─── Animated Starfield Background ──────────────────────────────────
// Renders twinkling stars using a <canvas> element for performance.
// Dark mode: full starfield with varying brightness
// Light mode: hidden (no stars in the sky during day)

interface Star {
  x: number
  y: number
  size: number
  opacity: number
  twinkleSpeed: number
  twinkleOffset: number
}

export function StarField({ isDark }: { isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Generate stars once
    if (starsRef.current.length === 0) {
      const count = Math.min(280, Math.floor((window.innerWidth * window.innerHeight) / 4000))
      starsRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 1.8 + 0.3,
        opacity: Math.random() * 0.6 + 0.15,
        twinkleSpeed: Math.random() * 0.003 + 0.001,
        twinkleOffset: Math.random() * Math.PI * 2,
      }))
    }

    let time = 0

    const draw = () => {
      if (!isDark) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        animFrameRef.current = requestAnimationFrame(draw)
        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      time += 1

      for (const star of starsRef.current) {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset)
        const alpha = star.opacity * (0.5 + 0.5 * twinkle)

        // Soft glow for larger stars
        if (star.size > 1.2) {
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(160, 180, 255, ${alpha * 0.08})`
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200, 210, 255, ${alpha})`
        ctx.fill()
      }

      animFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [isDark])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: isDark ? 1 : 0, transition: 'opacity 0.8s ease' }}
      aria-hidden="true"
    />
  )
}
