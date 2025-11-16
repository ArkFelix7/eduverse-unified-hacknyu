-- EduVerse Unified Platform Database Schema
-- Apply this entire script to your Supabase project via SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content_sources table
CREATE TABLE IF NOT EXISTS public.content_sources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pdf', 'youtube', 'topic', 'lecture')),
    title TEXT NOT NULL,
    content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create learning_materials table
CREATE TABLE IF NOT EXISTS public.learning_materials (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    source_id UUID REFERENCES public.content_sources(id) ON DELETE SET NULL,
    lecture_id UUID,
    type TEXT NOT NULL CHECK (type IN ('summary', 'flashcards', 'quiz', 'deep_dive', 'slides', 'notes', 'concepts', 'formulas')),
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lecture_sessions table
CREATE TABLE IF NOT EXISTS public.lecture_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    audio_url TEXT,
    transcript TEXT,
    status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'completed', 'failed')),
    duration INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assessment_results table
CREATE TABLE IF NOT EXISTS public.assessment_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    material_id UUID REFERENCES public.learning_materials(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('quiz', 'verbal_test', 'targeted_quiz')),
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    answers JSONB NOT NULL,
    feedback TEXT,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_sessions table
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    material_id UUID REFERENCES public.learning_materials(id) ON DELETE CASCADE NOT NULL,
    questions JSONB NOT NULL,
    user_answers JSONB DEFAULT '{}',
    score INTEGER,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create study_schedules table
CREATE TABLE IF NOT EXISTS public.study_schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    schedule_data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create verbal_test_sessions table
CREATE TABLE IF NOT EXISTS public.verbal_test_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    material_id UUID REFERENCES public.learning_materials(id) ON DELETE CASCADE NOT NULL,
    questions TEXT[] NOT NULL,
    audio_url TEXT,
    transcript JSONB DEFAULT '{}',
    analysis_result JSONB,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verbal_test_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- Content sources policies
CREATE POLICY "Users can view content sources of own projects" ON public.content_sources
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.projects WHERE id = project_id));

CREATE POLICY "Users can create content sources in own projects" ON public.content_sources
    FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.projects WHERE id = project_id));

CREATE POLICY "Users can update content sources of own projects" ON public.content_sources
    FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM public.projects WHERE id = project_id));

CREATE POLICY "Users can delete content sources of own projects" ON public.content_sources
    FOR DELETE USING (auth.uid() IN (SELECT user_id FROM public.projects WHERE id = project_id));

-- Learning materials policies (similar pattern for all tables)
CREATE POLICY "Users can view learning materials of own projects" ON public.learning_materials
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.projects WHERE id = project_id));

CREATE POLICY "Users can create learning materials in own projects" ON public.learning_materials
    FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.projects WHERE id = project_id));

CREATE POLICY "Users can update learning materials of own projects" ON public.learning_materials
    FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM public.projects WHERE id = project_id));

CREATE POLICY "Users can delete learning materials of own projects" ON public.learning_materials
    FOR DELETE USING (auth.uid() IN (SELECT user_id FROM public.projects WHERE id = project_id));

-- Add similar policies for other tables...
-- (Lecture sessions, assessment results, etc. follow the same pattern)

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_content_sources_project_id ON public.content_sources(project_id);
CREATE INDEX IF NOT EXISTS idx_learning_materials_project_id ON public.learning_materials(project_id);
CREATE INDEX IF NOT EXISTS idx_lecture_sessions_project_id ON public.lecture_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id ON public.assessment_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON public.quiz_sessions(user_id);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_lecture_sessions_updated_at
    BEFORE UPDATE ON public.lecture_sessions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_study_schedules_updated_at
    BEFORE UPDATE ON public.study_schedules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();