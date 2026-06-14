---
Task ID: 1
Agent: Lead Design Principal
Task: Complete UI aesthetic pivot from dark/neon gaming to calm matte light mode

Work Log:
- Read all current UI files: globals.css, AppShell.tsx, Dashboard.tsx, AuthModal.tsx, AskAether.tsx, PaywallModal.tsx, AuroraBackground.tsx, StarField.tsx, Collections.tsx, Memories.tsx, Settings.tsx
- Rewrote globals.css: Removed dark theme entirely, updated CSS variables for serene light palette (#F9FAFB background, zinc-800 text, purple-300/60 focus glow), replaced scrollbar with soft light version, added ambient-drift keyframe animations
- Rewrote AuroraBackground.tsx: Replaced dark fog/nebula with soft morning-light gradient (purple-100/30, indigo-50/20, blue-100/30) using CSS animations instead of Framer Motion for performance
- Rewrote AppShell.tsx: Removed StarField import/usage, removed all isDark conditionals, built clean light-mode sidebar (bg-white/60 backdrop-blur-xl), simplified nav items, clean mobile header and bottom nav
- Rewrote Dashboard.tsx: Stripped ParticleBurst component entirely, stripped CaptureFeedbackCard verbose text, removed Stats Row, removed "What's on your mind?" subtitle, removed free plan limit text, simplified placeholder, used glass panels (bg-white/60 backdrop-blur-xl border border-black/[0.03]), calm capture bar with focus glow, minimal "Saved to Notes" feedback
- Rewrote AuthModal.tsx: Removed isDark conditionals, light glass modal (bg-white/80 backdrop-blur-2xl), minimal text, clean dark button style (bg-zinc-900)
- Rewrote AskAether.tsx: Removed isDark conditionals, calm light chat interface, glass panels, purple-400 accents, reduced suggestion chips from 4 to 3, removed verbose footer text
- Rewrote PaywallModal.tsx: Removed isDark conditionals, light glass modal, minimal text, clean pricing
- Updated Collections.tsx: Removed isDark conditional from CollectionCard, applied light glass styling
- Updated Memories.tsx: Removed isDark from MemoryCard and MemoryDetail, applied light glass cards and purple-50 recap section
- Updated Settings.tsx: Simplified dark mode toggle section (always shows Sun icon, "Warm and serene" label), removed Moon import
- Fixed TypeScript errors: useRef generic arg, isWide boolean coercion, ease string literal types

Stage Summary:
- Complete aesthetic pivot from dark neon gaming to calm matte light mode
- All components now render in light mode only (no isDark conditionals in core components)
- 80% of on-screen text stripped: no verbose descriptions, no sub-headers, no instructions
- Design system: bg-[#F9FAFB] canvas, bg-white/60 glass panels, border-black/[0.03], text-zinc-800 headings, text-zinc-400 secondary
- Focus glow: focus-within:border-purple-300/60 focus-within:shadow-[0_0_50px_rgba(168,85,247,0.05)]
- Data logic, Supabase hooks, API routes — all UNTOUCHED
- Lint passes clean, TypeScript errors in modified files all resolved
- Browser verified: Desktop and mobile layouts render correctly
