-- EduVerse Unified Platform Database Schema
-- Supabase PostgreSQL Schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning Projects (Sessions)
CREATE TABLE IF NOT EXISTS public.projects (
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
CREATE TABLE IF NOT EXISTS public.content_sources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('pdf', 'youtube', 'topic', 'lecture')) NOT NULL,
    title TEXT NOT NULL,
    content TEXT, -- Extracted/processed text content
    metadata JSONB DEFAULT '{}', -- URLs, file info, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lecture Recordings & Sessions
CREATE TABLE IF NOT EXISTS public.lecture_sessions (
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
CREATE TABLE IF NOT EXISTS public.learning_materials (
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

-- Enhanced Assessment Results for adaptive testing
CREATE TABLE IF NOT EXISTS public.assessment_results (
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
    taken_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Learning Progress Tracking
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    source_id UUID REFERENCES public.content_sources(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL, -- 'material', 'quiz', 'verbal_test', etc.
    overall_weak_topics TEXT[] DEFAULT '{}',
    improvement_areas TEXT[] DEFAULT '{}',
    total_sessions INTEGER DEFAULT 0,
    average_score DECIMAL(5,2),
    best_score DECIMAL(5,2),
    recent_trend DECIMAL(5,2), -- Positive = improving
    last_session_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, project_id, source_id, content_type)
);

-- Content Cache Metadata (for smart caching)
CREATE TABLE IF NOT EXISTS public.content_cache_metadata (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    source_hash TEXT NOT NULL,
    source_title TEXT NOT NULL,
    cache_key TEXT NOT NULL,
    content_types TEXT[] NOT NULL, -- Array of cached content types
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 1,
    cache_size INTEGER, -- Size in bytes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    UNIQUE(user_id, source_hash)
);

-- Voice Tutor Conversations
CREATE TABLE IF NOT EXISTS public.voice_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    context TEXT, -- Source material context
    conversation JSONB DEFAULT '[]', -- Array of messages
    duration INTEGER DEFAULT 0, -- seconds
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- Chat Messages (for lecture chatbot)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lecture_id UUID REFERENCES public.lecture_sessions(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    sources JSONB DEFAULT '[]', -- Grounding sources
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Learning Analytics
CREATE TABLE IF NOT EXISTS public.learning_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    metric_type TEXT NOT NULL, -- 'engagement', 'comprehension', 'progress', etc.
    metric_value DECIMAL(10,2),
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance (Enhanced)
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_content_sources_project_id ON public.content_sources(project_id);
CREATE INDEX IF NOT EXISTS idx_lecture_sessions_project_id ON public.lecture_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_learning_materials_project_id ON public.learning_materials(project_id);
CREATE INDEX IF NOT EXISTS idx_learning_materials_source_id ON public.learning_materials(source_id);
CREATE INDEX IF NOT EXISTS idx_learning_materials_lecture_id ON public.learning_materials(lecture_id);
CREATE INDEX IF NOT EXISTS idx_learning_materials_content_hash ON public.learning_materials(content_hash);
CREATE INDEX IF NOT EXISTS idx_learning_materials_type ON public.learning_materials(type);
CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id ON public.assessment_results(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_project_id ON public.assessment_results(project_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_source_id ON public.assessment_results(source_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_type ON public.assessment_results(type);
CREATE INDEX IF NOT EXISTS idx_assessment_results_taken_at ON public.assessment_results(taken_at);
CREATE INDEX IF NOT EXISTS idx_user_progress_composite ON public.user_progress(user_id, project_id, source_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_cache_metadata_user_hash ON public.content_cache_metadata(user_id, source_hash);
CREATE INDEX IF NOT EXISTS idx_content_cache_metadata_expires ON public.content_cache_metadata(expires_at);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_project_id ON public.voice_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_lecture_id ON public.chat_messages(lecture_id);

-- Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_cache_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_analytics ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view their own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- Content sources policies
CREATE POLICY "Users can view content sources of their projects" ON public.content_sources
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create content sources in their projects" ON public.content_sources
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update content sources in their projects" ON public.content_sources
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

-- Similar policies for other tables...
CREATE POLICY "Users can view lecture sessions of their projects" ON public.lecture_sessions
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create lecture sessions in their projects" ON public.lecture_sessions
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update lecture sessions in their projects" ON public.lecture_sessions
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

-- Learning materials policies
CREATE POLICY "Users can view learning materials of their projects" ON public.learning_materials
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create learning materials in their projects" ON public.learning_materials
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

-- Assessment results policies (Enhanced)
CREATE POLICY "Users can view their own assessment results" ON public.assessment_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assessment results" ON public.assessment_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assessment results" ON public.assessment_results
    FOR UPDATE USING (auth.uid() = user_id);

-- User progress policies
CREATE POLICY "Users can view their own progress" ON public.user_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress" ON public.user_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON public.user_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Content cache metadata policies
CREATE POLICY "Users can view their own cache metadata" ON public.content_cache_metadata
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cache metadata" ON public.content_cache_metadata
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cache metadata" ON public.content_cache_metadata
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cache metadata" ON public.content_cache_metadata
    FOR DELETE USING (auth.uid() = user_id);

-- Voice sessions policies
CREATE POLICY "Users can view their own voice sessions" ON public.voice_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice sessions" ON public.voice_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice sessions" ON public.voice_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER set_timestamp_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_timestamp_projects
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_timestamp_user_progress
    BEFORE UPDATE ON public.user_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function to clean up expired cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.content_cache_metadata 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update learning material access
CREATE OR REPLACE FUNCTION public.update_material_access()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_accessed = NOW();
    NEW.access_count = OLD.access_count + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for learning materials access tracking
CREATE TRIGGER update_material_access_trigger
    BEFORE UPDATE ON public.learning_materials
    FOR EACH ROW
    WHEN (OLD.last_accessed IS DISTINCT FROM NEW.last_accessed)
    EXECUTE FUNCTION public.update_material_access();

-- Storage buckets (to be created in Supabase dashboard)
-- 'lecture-audio' - for audio recordings
-- 'project-files' - for uploaded PDFs and other files
-- 'avatars' - for user profile pictures