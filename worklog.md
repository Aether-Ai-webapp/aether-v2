---
Task ID: 1
Agent: Main Agent
Task: Fix 4 systemic bugs in Aether app

Work Log:
- Read all 15+ source files to understand full architecture (Dashboard, AskAether, aether-store, API routes, etc.)
- Identified root cause: No Supabase/Gemini/Groq API keys configured, so app relies on Prisma/SQLite + z-ai-web-dev-sdk
- Bug 1 (Auth Gate): Added isAuthenticated check to Dashboard capture bar. If not authenticated, calls requireAuth() which shows AuthModal and queues the capture for replay after login
- Bug 2 (State Hydration): Removed redundant fetchMemories() call after saveMemory() in Dashboard. The store's saveMemory already does optimistic addMemory(), so the extra refetch was causing race conditions
- Bug 3 (AI Chat 500): Rewrote /api/ai/chat/route.ts to use z-ai-web-dev-sdk as primary (non-streaming then word-by-word simulated streaming), with Gemini and Groq as fallbacks. Fixed the pull-based ReadableStream pattern that was causing OOM crashes
- Bug 4 (Auto-collections): Updated /api/auto-tag to return both tags AND category. Updated backgroundAutoTag in store to auto-create collections from the category field and link memories to them
- Also updated /api/ai/summary to use z-ai-web-dev-sdk as primary
- Removed redundant fetch('/api/generate-embedding') calls from AddMemorySheet (store's saveMemory already handles this)
- Increased Node memory limit from 512MB to 2048MB for dev server
- Fixed fetchMemories to have better error logging and fallback path

Stage Summary:
- Auth gate works: unauthenticated users are blocked and shown auth modal
- AI chat works: z-ai-web-dev-sdk returns friendly, contextual responses referencing user memories
- Auto-tagging works: returns tags AND category (e.g., {"tags":["work","finance"],"category":"Work"})
- Auto-collections: store auto-creates collections from AI category and links memories
- Memories display correctly on dashboard after save (optimistic UI)
- All API endpoints tested and verified via curl
- Lint passes clean
