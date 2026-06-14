'use client'

// ─── Serene Ambient Gradient ────────────────────────────────────────
// Soft, slowly drifting morning light — like sunlight hitting water

export function AuroraBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Primary warm glow — top right, ultra slow drift */}
      <div
        className="absolute -top-[10%] right-[5%] w-[700px] h-[500px] rounded-full blur-[120px] animate-ambient-drift"
        style={{ background: 'linear-gradient(135deg, rgba(196,181,253,0.25) 0%, rgba(199,210,254,0.15) 50%, rgba(219,234,254,0.18) 100%)' }}
      />

      {/* Secondary cool glow — bottom left, slower counter-drift */}
      <div
        className="absolute -bottom-[5%] left-[10%] w-[600px] h-[400px] rounded-full blur-[140px] animate-ambient-drift-alt"
        style={{ background: 'linear-gradient(315deg, rgba(254,243,199,0.15) 0%, rgba(196,181,253,0.12) 50%, rgba(199,210,254,0.10) 100%)' }}
      />

      {/* Tertiary faint veil — center, barely visible */}
      <div
        className="absolute top-[30%] left-[25%] w-[400px] h-[300px] rounded-full blur-[160px] animate-ambient-drift"
        style={{ background: 'linear-gradient(45deg, rgba(196,181,253,0.08) 0%, rgba(254,243,199,0.06) 100%)', animationDelay: '-15s' }}
      />
    </div>
  )
}
