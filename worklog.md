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

---
Task ID: 2
Agent: Main
Task: Phase 1 — Fix Core Text Persistence & Recap Overlay (systematic one-file-at-a-time approach)

Work Log:
- Read and audited all 3 critical files: Dashboard.tsx (968 lines), aether-store.ts (1056 lines), supabase/browser.ts
- Diagnosed root cause: 5 interlocking issues causing memories to not save/show
- Fixed aether-store.ts:
  1. Singleton Supabase browser client (was creating new instance per call — session desync risk)
  2. Added `createBrowserClient` import from @supabase/ssr for type annotation
  3. All catch blocks now log errors with `[functionName]` prefix (was silent `catch {}`)
  4. `checkSupabaseTables` now distinguishes "table missing" vs "empty table + RLS" errors
  5. `saveMemory` now calls `fetchMemories()` after 500ms delay to confirm persistence
  6. `resetSupabaseBrowser()` called on logout to clear singleton
- Fixed /api/memories/[id]/route.ts:
  1. PATCH now tries Supabase first (was Prisma-only — updates to Supabase memories were lost)
  2. DELETE now tries Supabase first (was Prisma-only — deletes didn't remove from Supabase)
  3. Both operations have proper error logging and Prisma fallback
- Fixed Dashboard.tsx:
  1. `handleCapture` now calls `fetchMemories()` after successful save (guaranteed hydration)
  2. Auth gate replay also calls `fetchMemories()` after save
  3. Shows toast.error when saveMemory returns null (both paths failed)
  4. Shows toast.error on catch (was silent)
- Verified with Agent Browser:
  1. Page renders correctly at 200 status
  2. 5 existing memories display on dashboard
  3. Auth gate works — modal appears when guest tries to save
  4. Memory detail modal works — shows title, AI summary, tags, related memories, PDF, Delete
  5. No console errors or server errors
  6. Mobile (375x812) and desktop (1280x800) viewports both render correctly

Stage Summary:
- Memory persistence pipeline is now reliable: save → optimistic add → confirm re-fetch
- Error visibility: all catch blocks now log with function context for debugging
- Supabase singleton prevents session desync across store operations
- API routes now handle both Supabase and Prisma for PATCH/DELETE (not just Prisma)
- Auth gate verified working: blocks guest saves, shows modal, queues pending action
- Memory detail overlay already exists and works (title, summary, tags, related, PDF, delete)
- Key files modified: aether-store.ts, /api/memories/[id]/route.ts, Dashboard.tsx
