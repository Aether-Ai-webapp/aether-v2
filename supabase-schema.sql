-- Aether Supabase Schema
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- This creates the memories, collections, and memory_collections tables with RLS

-- ============================================================
-- 0. PGVECTOR EXTENSION (for semantic search / RAG)
-- ============================================================
-- Enable the vector extension (required for embedding column)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- ============================================================
-- 1. MEMORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'text',
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  summary TEXT,
  tags TEXT NOT NULL DEFAULT '',
  source_url TEXT,
  file_url TEXT,
  image_preview TEXT,
  image_url TEXT,  -- Supabase Storage public URL for uploaded images
  recap TEXT,      -- AI-generated 2-sentence recap
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(user_id, created_at DESC);

-- RLS
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memories"
  ON memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories"
  ON memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
  ON memories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
  ON memories FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS memories_updated_at ON memories;
CREATE TRIGGER memories_updated_at
  BEFORE UPDATE ON memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. COLLECTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📁',
  color TEXT NOT NULL DEFAULT '#6D597A',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);

-- RLS
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collections"
  ON collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collections"
  ON collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON collections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON collections FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. MEMORY_COLLECTIONS JUNCTION TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS memory_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  UNIQUE(memory_id, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_memory_collections_memory ON memory_collections(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_collections_collection ON memory_collections(collection_id);

-- RLS
ALTER TABLE memory_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memory_collections"
  ON memory_collections FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM memories WHERE memories.id = memory_collections.memory_id AND memories.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own memory_collections"
  ON memory_collections FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM memories WHERE memories.id = memory_collections.memory_id AND memories.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own memory_collections"
  ON memory_collections FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM memories WHERE memories.id = memory_collections.memory_id AND memories.user_id = auth.uid())
  );

-- ============================================================
-- 4. PROFILES TABLE (optional - stores user preferences)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 5. EMBEDDING COLUMN & VECTOR INDEX (for semantic search / RAG)
-- ============================================================
-- Add embedding column to memories table (768 dims = text-embedding-004 output)
-- This is idempotent — safe to re-run if the column already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memories' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE memories ADD COLUMN embedding public.vector(768);
  END IF;
END $$;

-- HNSW index for fast cosine-similarity search (pgvector ≥ 0.5.0)
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories
  USING hnsw (embedding public.vector_cosine_ops);

-- ============================================================
-- 6. MATCH_MEMORIES RPC (called from /api/ai/chat for RAG)
-- ============================================================
-- Finds the top-N most semantically similar memories for a given user.
-- Uses the cosine-distance operator `<=>` provided by pgvector.
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding public.vector(768),
  match_user_id UUID,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  tags TEXT,
  type TEXT,
  title TEXT,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.tags,
    m.type,
    m.title,
    m.created_at,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM memories m
  WHERE m.user_id = match_user_id
    AND m.embedding IS NOT NULL
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
