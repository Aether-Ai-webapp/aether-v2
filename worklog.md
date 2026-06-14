---
Task ID: 1
Agent: Main
Task: Fix 4 critical bugs in Aether architecture (Auth Gate, State Hydration, AI Chat 500, Auto-Collections)

Work Log:
- Read all critical files: Dashboard.tsx, aether-store.ts, AI chat route, auto-tag route, Supabase clients, Collections.tsx, page.tsx
- Diagnosed Bug 1: Auth gate code existed but race condition in login/signup — checkSupabaseTables() not awaited before pending action
- Diagnosed Bug 2: fetchMemories ran before supabaseReady was set, so authenticated users' memories weren't loaded from Supabase
- Diagnosed Bug 3: getGenerativeModel('text-embedding-004') uses bare string instead of { model: 'text-embedding-004' } object — invalid API call
- Diagnosed Bug 4: backgroundAutoTag skipped for short notes, used stale state for collection lookups, no fallback category
- Fixed aether-store.ts: login/signup now await checkSupabaseTables() before pending actions and data fetching
- Fixed checkSession: now awaits checkSupabaseTables() then fetches data with correct supabaseReady state
- Fixed page.tsx: removed DataLoader to prevent double-fetch race condition
- Fixed api/ai/chat/route.ts: added robust JSON parsing, fixed Gemini model params, added logging
- Fixed api/generate-embedding/route.ts: fixed getGenerativeModel({ model: 'text-embedding-004' })
- Fixed api/memories/related/[id]/route.ts: same Gemini model param fix
- Fixed api/auto-tag/route.ts: added fallback category/tags from keyword inference when AI fails
- Fixed backgroundAutoTag: always runs (not just for non-short notes), uses get().collections for fresh state, re-fetches after creating collection
- All fixes verified: lint passes, curl tests pass, browser testing confirms auth gate works, AI chat responds, memories load

Stage Summary:
- Bug 1 FIXED: Auth gate now properly blocks guest submissions and shows auth modal (browser verified)
- Bug 2 FIXED: Memories load from Supabase when authenticated (checkSession awaits table check before fetching)
- Bug 3 FIXED: AI chat returns proper responses — Gemini model param was root cause of 500 errors
- Bug 4 FIXED: Auto-tagging always runs, fallback categories ensure collections are always created, fresh state prevents stale lookups
- Key files modified: aether-store.ts, page.tsx, api/ai/chat/route.ts, api/generate-embedding/route.ts, api/memories/related/[id]/route.ts, api/auto-tag/route.ts
