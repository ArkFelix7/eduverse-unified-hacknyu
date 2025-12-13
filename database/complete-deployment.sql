-- ============================================================================
-- EduVerse Unified Platform - COMPLETE DATABASE DEPLOYMENT
-- ============================================================================
-- This script deploys the complete database schema for EduVerse Unified Platform
-- including:
--   1. Core tables for projects, content, lectures
--   2. Enhanced assessment and progress tracking
--   3. Content caching system
--   4. Career planning (SkillMap) integration
--   5. Row Level Security (RLS) policies
--   6. Utility functions and triggers
--
-- IMPORTANT: This will create a fresh database. 
-- Run this on your fresh Supabase instance.
-- ============================================================================

-- Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 1: CORE TABLES
-- ============================================================================

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
    content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lecture Recordings & Sessions
CREATE TABLE IF NOT EXISTS public.lecture_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    live_transcript TEXT DEFAULT '',
    final_transcript TEXT DEFAULT '',
    audio_file_url TEXT,
    duration INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('recording', 'processing', 'completed', 'failed')) DEFAULT 'recording',
    analysis JSONB DEFAULT '{}',
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
    content_hash TEXT,
    generated_from_text TEXT,
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT source_or_lecture_required CHECK (
        (source_id IS NOT NULL AND lecture_id IS NULL) OR 
        (source_id IS NULL AND lecture_id IS NOT NULL) OR
        (source_id IS NOT NULL AND lecture_id IS NOT NULL)
    )
);

-- ============================================================================
-- SECTION 2: ASSESSMENT & PROGRESS TRACKING
-- ============================================================================

-- Enhanced Assessment Results for adaptive testing
CREATE TABLE IF NOT EXISTS public.assessment_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    material_id UUID REFERENCES public.learning_materials(id) ON DELETE CASCADE,
    source_id UUID REFERENCES public.content_sources(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('quiz', 'verbal_test', 'targeted_quiz', 'targeted_verbal_test')) NOT NULL,
    questions TEXT[],
    answers JSONB NOT NULL,
    analysis JSONB,
    score DECIMAL(5,2),
    weak_topics TEXT[] DEFAULT '{}',
    improvement_areas TEXT[] DEFAULT '{}',
    session_metadata JSONB DEFAULT '{}',
    is_retake BOOLEAN DEFAULT FALSE,
    previous_session_id UUID REFERENCES public.assessment_results(id),
    content_hash TEXT,
    retake_count INTEGER DEFAULT 0,
    taken_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Learning Progress Tracking
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    source_id UUID REFERENCES public.content_sources(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
    weak_topics TEXT[] DEFAULT '{}',
    strong_topics TEXT[] DEFAULT '{}',
    total_tests INTEGER DEFAULT 0,
    average_score DECIMAL(5,2),
    best_score DECIMAL(5,2),
    last_test_score DECIMAL(5,2),
    improvement_trend DECIMAL(5,2),
    study_recommendations TEXT[] DEFAULT '{}',
    last_session_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, project_id, source_id, content_type)
);

-- Content Cache Metadata for Smart Caching
CREATE TABLE IF NOT EXISTS public.content_cache_metadata (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    source_id UUID REFERENCES public.content_sources(id) ON DELETE CASCADE NOT NULL,
    content_hash TEXT NOT NULL,
    content_type TEXT NOT NULL,
    source_title TEXT NOT NULL,
    source_type TEXT NOT NULL,
    cache_data JSONB NOT NULL,
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    UNIQUE(user_id, source_id, content_hash, content_type)
);

-- ============================================================================
-- SECTION 3: COMMUNICATION & ANALYTICS
-- ============================================================================

-- Voice Tutor Conversations
CREATE TABLE IF NOT EXISTS public.voice_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    context TEXT,
    conversation JSONB DEFAULT '[]',
    duration INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- Chat Messages (for lecture chatbot)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lecture_id UUID REFERENCES public.lecture_sessions(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    sources JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Learning Analytics
CREATE TABLE IF NOT EXISTS public.learning_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    metric_type TEXT NOT NULL,
    metric_value DECIMAL(10,2),
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 4: CAREER PLANNING (SKILLMAP INTEGRATION)
-- ============================================================================

-- Career Plans (Main table for SkillMap functionality)
CREATE TABLE IF NOT EXISTS public.career_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('draft', 'active', 'completed', 'archived')) DEFAULT 'draft',
    career_goal TEXT NOT NULL,
    skill_level TEXT NOT NULL,
    time_commitment TEXT NOT NULL,
    learning_style TEXT NOT NULL,
    learning_medium TEXT NOT NULL,
    timeline TEXT NOT NULL,
    assessment_answers JSONB DEFAULT '[]',
    assessed_skill_level TEXT,
    roadmap_data JSONB NOT NULL,
    weekly_progress JSONB DEFAULT '{}',
    monthly_progress JSONB DEFAULT '{}',
    overall_progress_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Career Plan Progress Tracking (Detailed tracking)
CREATE TABLE IF NOT EXISTS public.career_plan_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    career_plan_id UUID REFERENCES public.career_plans(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    progress_type TEXT CHECK (progress_type IN ('weekly_task', 'monthly_milestone', 'project', 'resource', 'skill')) NOT NULL,
    item_id TEXT NOT NULL,
    item_title TEXT NOT NULL,
    item_description TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Career Plan Resources (Extracted and tracked separately)
CREATE TABLE IF NOT EXISTS public.career_plan_resources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    career_plan_id UUID REFERENCES public.career_plans(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    resource_type TEXT CHECK (resource_type IN ('course', 'youtube', 'book', 'project', 'skill')) NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    author TEXT,
    platform TEXT,
    description TEXT,
    difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    is_bookmarked BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    completion_date TIMESTAMPTZ,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Career Plan Skills Tracking
CREATE TABLE IF NOT EXISTS public.career_plan_skills (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    career_plan_id UUID REFERENCES public.career_plans(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    skill_name TEXT NOT NULL,
    skill_description TEXT,
    skill_category TEXT CHECK (skill_category IN ('required', 'beginner', 'intermediate', 'advanced')) NOT NULL,
    current_proficiency INTEGER CHECK (current_proficiency >= 0 AND current_proficiency <= 100) DEFAULT 0,
    target_proficiency INTEGER CHECK (target_proficiency >= 0 AND target_proficiency <= 100) DEFAULT 100,
    is_priority BOOLEAN DEFAULT FALSE,
    learning_resources JSONB DEFAULT '[]',
    practice_projects JSONB DEFAULT '[]',
    last_practiced_date TIMESTAMPTZ,
    assessment_results JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(career_plan_id, skill_name)
);

-- Career Plan Assessment Questions (Store generated questions)
CREATE TABLE IF NOT EXISTS public.career_plan_assessments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    career_plan_id UUID REFERENCES public.career_plans(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    questions JSONB NOT NULL,
    user_answers JSONB NOT NULL,
    assessment_score INTEGER,
    final_skill_level TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 5: PERFORMANCE INDEXES
-- ============================================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_content_sources_project_id ON public.content_sources(project_id);
CREATE INDEX IF NOT EXISTS idx_lecture_sessions_project_id ON public.lecture_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_learning_materials_project_id ON public.learning_materials(project_id);
CREATE INDEX IF NOT EXISTS idx_learning_materials_source_id ON public.learning_materials(source_id);
CREATE INDEX IF NOT EXISTS idx_learning_materials_lecture_id ON public.learning_materials(lecture_id);
CREATE INDEX IF NOT EXISTS idx_learning_materials_content_hash ON public.learning_materials(content_hash);
CREATE INDEX IF NOT EXISTS idx_learning_materials_type ON public.learning_materials(type);

-- Assessment and progress indexes
CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id ON public.assessment_results(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_project_id ON public.assessment_results(project_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_source_id ON public.assessment_results(source_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_type ON public.assessment_results(type);
CREATE INDEX IF NOT EXISTS idx_assessment_results_content_hash ON public.assessment_results(content_hash);
CREATE INDEX IF NOT EXISTS idx_assessment_results_taken_at ON public.assessment_results(taken_at);
CREATE INDEX IF NOT EXISTS idx_user_progress_composite ON public.user_progress(user_id, project_id, source_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_cache_metadata_user_source ON public.content_cache_metadata(user_id, source_id);
CREATE INDEX IF NOT EXISTS idx_content_cache_metadata_hash_type ON public.content_cache_metadata(content_hash, content_type);
CREATE INDEX IF NOT EXISTS idx_content_cache_metadata_expires ON public.content_cache_metadata(expires_at);

-- Communication and analytics indexes
CREATE INDEX IF NOT EXISTS idx_voice_sessions_project_id ON public.voice_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_lecture_id ON public.chat_messages(lecture_id);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_user_project ON public.learning_analytics(user_id, project_id);

-- Career planning indexes
CREATE INDEX IF NOT EXISTS idx_career_plans_user_id ON public.career_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_status ON public.career_plans(status);
CREATE INDEX IF NOT EXISTS idx_career_plan_progress_career_plan_id ON public.career_plan_progress(career_plan_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_progress_user_id ON public.career_plan_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_progress_type ON public.career_plan_progress(progress_type);
CREATE INDEX IF NOT EXISTS idx_career_plan_resources_career_plan_id ON public.career_plan_resources(career_plan_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_resources_user_id ON public.career_plan_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_resources_type ON public.career_plan_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_career_plan_skills_career_plan_id ON public.career_plan_skills(career_plan_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_skills_user_id ON public.career_plan_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_assessments_career_plan_id ON public.career_plan_assessments(career_plan_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_assessments_user_id ON public.career_plan_assessments(user_id);

-- ============================================================================
-- SECTION 6: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
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
ALTER TABLE public.career_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_plan_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_plan_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_plan_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_plan_assessments ENABLE ROW LEVEL SECURITY;

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
        project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create content sources in their projects" ON public.content_sources
    FOR INSERT WITH CHECK (
        project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update content sources in their projects" ON public.content_sources
    FOR UPDATE USING (
        project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete content sources in their projects" ON public.content_sources
    FOR DELETE USING (
        project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
    );

-- Lecture sessions policies
CREATE POLICY "Users can view lecture sessions of their projects" ON public.lecture_sessions
    FOR SELECT USING (
        project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create lecture sessions in their projects" ON public.lecture_sessions
    FOR INSERT WITH CHECK (
        project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update lecture sessions in their projects" ON public.lecture_sessions
    FOR UPDATE USING (
        project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete lecture sessions in their projects" ON public.lecture_sessions
    FOR DELETE USING (
        project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
    );

-- Learning materials policies
CREATE POLICY "Users can view learning materials of their projects" ON public.learning_materials
    FOR SELECT USING (
        project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create learning materials in their projects" ON public.learning_materials
    FOR INSERT WITH CHECK (
        project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update learning materials in their projects" ON public.learning_materials
    FOR UPDATE USING (
        project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete learning materials in their projects" ON public.learning_materials
    FOR DELETE USING (
        project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
    );

-- Assessment results policies
CREATE POLICY "Users can view their own assessment results" ON public.assessment_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assessment results" ON public.assessment_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assessment results" ON public.assessment_results
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assessment results" ON public.assessment_results
    FOR DELETE USING (auth.uid() = user_id);

-- User progress policies
CREATE POLICY "Users can view their own progress" ON public.user_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress" ON public.user_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON public.user_progress
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" ON public.user_progress
    FOR DELETE USING (auth.uid() = user_id);

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

CREATE POLICY "Users can delete their own voice sessions" ON public.voice_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can view chat messages for their lectures" ON public.chat_messages
    FOR SELECT USING (
        lecture_id IN (
            SELECT ls.id FROM public.lecture_sessions ls
            JOIN public.projects p ON ls.project_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create chat messages for their lectures" ON public.chat_messages
    FOR INSERT WITH CHECK (
        lecture_id IN (
            SELECT ls.id FROM public.lecture_sessions ls
            JOIN public.projects p ON ls.project_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

-- Learning analytics policies
CREATE POLICY "Users can view their own learning analytics" ON public.learning_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own learning analytics" ON public.learning_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Career Plans policies
CREATE POLICY "Users can view their own career plans" ON public.career_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own career plans" ON public.career_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own career plans" ON public.career_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own career plans" ON public.career_plans
    FOR DELETE USING (auth.uid() = user_id);

-- Career Plan Progress policies
CREATE POLICY "Users can view their own career plan progress" ON public.career_plan_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own career plan progress" ON public.career_plan_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own career plan progress" ON public.career_plan_progress
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own career plan progress" ON public.career_plan_progress
    FOR DELETE USING (auth.uid() = user_id);

-- Career Plan Resources policies
CREATE POLICY "Users can view their own career plan resources" ON public.career_plan_resources
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own career plan resources" ON public.career_plan_resources
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own career plan resources" ON public.career_plan_resources
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own career plan resources" ON public.career_plan_resources
    FOR DELETE USING (auth.uid() = user_id);

-- Career Plan Skills policies
CREATE POLICY "Users can view their own career plan skills" ON public.career_plan_skills
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own career plan skills" ON public.career_plan_skills
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own career plan skills" ON public.career_plan_skills
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own career plan skills" ON public.career_plan_skills
    FOR DELETE USING (auth.uid() = user_id);

-- Career Plan Assessments policies
CREATE POLICY "Users can view their own career plan assessments" ON public.career_plan_assessments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own career plan assessments" ON public.career_plan_assessments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own career plan assessments" ON public.career_plan_assessments
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- SECTION 7: UTILITY FUNCTIONS
-- ============================================================================

-- Function for updating timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Function to calculate overall progress for a career plan
CREATE OR REPLACE FUNCTION public.calculate_career_plan_progress(plan_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_items INTEGER;
    completed_items INTEGER;
    progress_percentage INTEGER;
BEGIN
    SELECT 
        COUNT(*), 
        COUNT(*) FILTER (WHERE is_completed = TRUE)
    INTO total_items, completed_items
    FROM public.career_plan_progress 
    WHERE career_plan_id = plan_id;
    
    IF total_items > 0 THEN
        progress_percentage := ROUND((completed_items::DECIMAL / total_items) * 100);
    ELSE
        progress_percentage := 0;
    END IF;
    
    UPDATE public.career_plans 
    SET 
        overall_progress_percentage = progress_percentage,
        updated_at = NOW()
    WHERE id = plan_id;
    
    RETURN progress_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 8: TRIGGERS
-- ============================================================================

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

CREATE TRIGGER set_timestamp_career_plans
    BEFORE UPDATE ON public.career_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_timestamp_career_plan_progress
    BEFORE UPDATE ON public.career_plan_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_timestamp_career_plan_resources
    BEFORE UPDATE ON public.career_plan_resources
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_timestamp_career_plan_skills
    BEFORE UPDATE ON public.career_plan_skills
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================

SELECT 
    '✅ Database deployment complete!' as status,
    'All tables, indexes, RLS policies, and functions have been created successfully.' as message,
    NOW() as deployed_at;
