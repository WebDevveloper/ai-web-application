CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  program_name TEXT,
  academic_year SMALLINT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  canonical_url TEXT,
  source_type TEXT NOT NULL DEFAULT 'document',
  owner_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'verified', 'archived')),
  published_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE campus_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  room TEXT,
  directions TEXT,
  map_url TEXT,
  source_id UUID REFERENCES knowledge_sources(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  purpose TEXT,
  email TEXT,
  phone TEXT,
  office_location_id UUID REFERENCES campus_locations(id) ON DELETE SET NULL,
  opening_hours TEXT,
  source_id UUID REFERENCES knowledge_sources(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  heading TEXT NOT NULL,
  content TEXT NOT NULL,
  section_path TEXT,
  chunk_order INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('russian', COALESCE(heading, '') || ' ' || content)
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_id, chunk_order)
);

CREATE INDEX knowledge_chunks_search_idx
  ON knowledge_chunks USING GIN (search_vector);

CREATE INDEX knowledge_chunks_tags_idx
  ON knowledge_chunks USING GIN (tags);

CREATE TABLE schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  lesson_type TEXT,
  study_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  teacher_name TEXT,
  location_id UUID REFERENCES campus_locations(id) ON DELETE SET NULL,
  source_id UUID REFERENCES knowledge_sources(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time),
  UNIQUE (group_id, study_date, start_time)
);

CREATE INDEX schedule_entries_group_date_idx
  ON schedule_entries (group_id, study_date, start_time);

CREATE TABLE deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  description TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled')),
  source_id UUID REFERENCES knowledge_sources(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX deadlines_group_due_idx ON deadlines (group_id, due_at);

CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('helpful', 'not_helpful')),
  comment TEXT,
  intent TEXT,
  response_had_sources BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX feedback_created_at_idx ON feedback (created_at DESC);
