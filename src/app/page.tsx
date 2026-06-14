'use client'

import React, { useEffect } from 'react'
import { useAetherStore } from '@/lib/aether-store'
import { AppShell } from '@/components/aether/AppShell'
import { Dashboard } from '@/components/aether/Dashboard'
import { AskAether } from '@/components/aether/AskAether'
import { Collections } from '@/components/aether/Collections'
import { Memories } from '@/components/aether/Memories'
import { Settings } from '@/components/aether/Settings'

function ViewRouter() {
  const currentView = useAetherStore((s) => s.currentView)

  const views: Record<string, React.ReactNode> = {
    dashboard: <Dashboard />,
    ask: <AskAether />,
    collections: <Collections />,
    memories: <Memories />,
    settings: <Settings />,
  }

  return <>{views[currentView] || <Dashboard />}</>
}

export default function Home() {
  const { checkSession } = useAetherStore()

  useEffect(() => {
    // checkSession now handles the FULL initialization flow:
    // 1. Checks if user is authenticated
    // 2. If yes: awaits checkSupabaseTables(), then fetches memories + collections from Supabase
    // 3. If no: fetches from Prisma API as fallback
    // This prevents the race condition where fetchMemories ran before supabaseReady was set
    checkSession()
  }, [checkSession])

  // The app IS the landing page. Render immediately.
  return (
    <AppShell>
      <ViewRouter />
    </AppShell>
  )
}
