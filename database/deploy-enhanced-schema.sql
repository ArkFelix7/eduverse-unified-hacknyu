-- Deploy Latest Schema Script for EduVerse Unified Platform
-- Run this AFTER running reset-database.sql
-- This will create all tables with the enhanced schema for adaptive testing and content caching

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 🚀 STEP 1: Create all tables with enhanced schema

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning Projects (Sessions)
CREATE TABLE public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('active', 'completed', 'archived')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    tags TEXT[] DEFAULT '{}'
);

-- Content Sources (PDFs, Videos, Topics)
CREATE TABLE public.content_sources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('pdf', 'youtube', 'topic', 'lecture')) NOT NULL,
    title TEXT NOT NULL,
    content TEXT, -- Extracted/processed text content
    metadata JSONB DEFAULT '{}', -- URLs, file info, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lecture Recordings & Sessions
CREATE TABLE public.lecture_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    live_transcript TEXT DEFAULT '',
    final_transcript TEXT DEFAULT '',
    audio_file_url TEXT, -- Supabase Storage URL
    duration INTEGER DEFAULT 0, -- seconds
    status TEXT CHECK (status IN ('recording', 'processing', 'completed', 'failed')) DEFAULT 'recording',
    analysis JSONB DEFAULT '{}', -- Structured lecture analysis
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Generated Learning Materials (Enhanced for caching)
CREATE TABLE public.learning_materials (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    source_id UUID REFERENCES public.content_sources(id) ON DELETE CASCADE,
    lecture_id UUID REFERENCES public.lecture_sessions(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('summary', 'flashcards', 'quiz', 'deep_dive', 'slides', 'notes', 'concepts', 'formulas', 'verbal_test_questions')) NOT NULL,
    content JSONB NOT NULL,
    content_hash TEXT, -- Hash for content caching
    generated_from_text TEXT, -- Truncated source text for reference
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT source_or_lecture_required CHECK (
        (source_id IS NOT NULL AND lecture_id IS NULL) OR 
        (source_id IS NULL AND lecture_id IS NOT NULL) OR
        (source_id IS NOT NULL AND lecture_id IS NOT NULL)
    )
);

-- 🧠 Enhanced Assessment Results for adaptive testing
CREATE TABLE public.assessment_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    material_id UUID REFERENCES public.learning_materials(id) ON DELETE CASCADE,
    source_id UUID REFERENCES public.content_sources(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('quiz', 'verbal_test', 'targeted_quiz', 'targeted_verbal_test')) NOT NULL,
    questions TEXT[], -- Array of questions asked
    answers JSONB NOT NULL, -- User answers with detailed responses
    analysis JSONB, -- Learning analysis report with weak topics
    score DECIMAL(5,2),
    weak_topics TEXT[] DEFAULT '{}',
    improvement_areas TEXT[] DEFAULT '{}',
    session_metadata JSONB DEFAULT '{}', -- Additional session info
    is_retake BOOLEAN DEFAULT FALSE,
    previous_session_id UUID REFERENCES public.assessment_results(id),
    content_hash TEXT, -- Hash of source content for tracking
    retake_count INTEGER DEFAULT 0,
    taken_at TIMESTAMPTZ DEFAULT NOW()
);

-- 📊 User Learning Progress Tracking (New Enhanced Table)
CREATE TABLE public.user_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    source_id UUID REFERENCES public.content_sources(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL, -- 'material', 'quiz', 'verbal_test', etc.
    weak_topics TEXT[] DEFAULT '{}',
    strong_topics TEXT[] DEFAULT '{}',
    total_tests INTEGER DEFAULT 0,
    average_score DECIMAL(5,2),
    best_score DECIMAL(5,2),
    last_test_score DECIMAL(5,2),
    improvement_trend DECIMAL(5,2), -- Positive = improving
    study_recommendations TEXT[] DEFAULT '{}',
    last_session_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, project_id, source_id, content_type)
);

-- 🗄️ Content Cache Metadata (New Table for Smart Caching)
CREATE TABLE public.content_cache_metadata (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    source_id UUID REFERENCES public.content_sources(id) ON DELETE CASCADE NOT NULL,
    content_hash TEXT NOT NULL,
    content_type TEXT NOT NULL, -- 'summary', 'flashcards', etc.
    source_title TEXT NOT NULL,
    source_type TEXT NOT NULL, -- 'pdf', 'topic', etc.
    cache_data JSONB NOT NULL, -- The cached content
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    UNIQUE(user_id, source_id, content_hash, content_type)
);

-- 🎤 Voice Tutor Conversations
CREATE TABLE public.voice_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    context TEXT, -- Source material context
    conversation JSONB DEFAULT '[]', -- Array of messages
    duration INTEGER DEFAULT 0, -- seconds
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- 💬 Chat Messages (for lecture chatbot)
CREATE TABLE public.chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lecture_id UUID REFERENCES public.lecture_sessions(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    sources JSONB DEFAULT '[]', -- Grounding sources
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 📈 User Learning Analytics
CREATE TABLE public.learning_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    metric_type TEXT NOT NULL, -- 'engagement', 'comprehension', 'progress', etc.
    metric_value DECIMAL(10,2),
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🚀 STEP 2: Create performance indexes
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_content_sources_project_id ON public.content_sources(project_id);
CREATE INDEX idx_lecture_sessions_project_id ON public.lecture_sessions(project_id);
CREATE INDEX idx_learning_materials_project_id ON public.learning_materials(project_id);
CREATE INDEX idx_learning_materials_source_id ON public.learning_materials(source_id);
CREATE INDEX idx_learning_materials_lecture_id ON public.learning_materials(lecture_id);
CREATE INDEX idx_learning_materials_content_hash ON public.learning_materials(content_hash);
CREATE INDEX idx_learning_materials_type ON public.learning_materials(type);

-- Enhanced indexes for new tables
CREATE INDEX idx_assessment_results_user_id ON public.assessment_results(user_id);
CREATE INDEX idx_assessment_results_project_id ON public.assessment_results(project_id);
CREATE INDEX idx_assessment_results_source_id ON public.assessment_results(source_id);
CREATE INDEX idx_assessment_results_type ON public.assessment_results(type);
CREATE INDEX idx_assessment_results_content_hash ON public.assessment_results(content_hash);
CREATE INDEX idx_assessment_results_taken_at ON public.assessment_results(taken_at);
CREATE INDEX idx_user_progress_composite ON public.user_progress(user_id, project_id, source_id, content_type);
CREATE INDEX idx_content_cache_metadata_user_source ON public.content_cache_metadata(user_id, source_id);
CREATE INDEX idx_content_cache_metadata_hash_type ON public.content_cache_metadata(content_hash, content_type);
CREATE INDEX idx_content_cache_metadata_expires ON public.content_cache_metadata(expires_at);
CREATE INDEX idx_voice_sessions_project_id ON public.voice_sessions(project_id);
CREATE INDEX idx_chat_messages_lecture_id ON public.chat_messages(lecture_id);

SELECT 'Enhanced indexes created successfully!' as status;