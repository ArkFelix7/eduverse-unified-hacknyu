-- Reset Database Script for EduVerse Unified Platform
-- This script will safely drop all tables and recreate them with the latest schema
-- Run this in your Supabase SQL Editor

-- WARNING: This will delete all existing data!
-- Make sure to backup any important data before running this script

-- Disable RLS temporarily (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
        ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content_sources') THEN
        ALTER TABLE public.content_sources DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lecture_sessions') THEN
        ALTER TABLE public.lecture_sessions DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'learning_materials') THEN
        ALTER TABLE public.learning_materials DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_results') THEN
        ALTER TABLE public.assessment_results DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_progress') THEN
        ALTER TABLE public.user_progress DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content_cache_metadata') THEN
        ALTER TABLE public.content_cache_metadata DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'voice_sessions') THEN
        ALTER TABLE public.voice_sessions DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
        ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'learning_analytics') THEN
        ALTER TABLE public.learning_analytics DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop all triggers first
DROP TRIGGER IF EXISTS set_timestamp_profiles ON public.profiles;
DROP TRIGGER IF EXISTS set_timestamp_projects ON public.projects;
DROP TRIGGER IF EXISTS set_timestamp_user_progress ON public.user_progress;
DROP TRIGGER IF EXISTS update_material_access_trigger ON public.learning_materials;

-- Drop all functions
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.cleanup_expired_cache();
DROP FUNCTION IF EXISTS public.update_material_access();

-- Drop all policies (they will be recreated)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view content sources of their projects" ON public.content_sources;
DROP POLICY IF EXISTS "Users can create content sources in their projects" ON public.content_sources;
DROP POLICY IF EXISTS "Users can update content sources in their projects" ON public.content_sources;
DROP POLICY IF EXISTS "Users can view lecture sessions of their projects" ON public.lecture_sessions;
DROP POLICY IF EXISTS "Users can create lecture sessions in their projects" ON public.lecture_sessions;
DROP POLICY IF EXISTS "Users can update lecture sessions in their projects" ON public.lecture_sessions;
DROP POLICY IF EXISTS "Users can view learning materials of their projects" ON public.learning_materials;
DROP POLICY IF EXISTS "Users can create learning materials in their projects" ON public.learning_materials;
DROP POLICY IF EXISTS "Users can view their own assessment results" ON public.assessment_results;
DROP POLICY IF EXISTS "Users can create their own assessment results" ON public.assessment_results;
DROP POLICY IF EXISTS "Users can update their own assessment results" ON public.assessment_results;
DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can create their own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can view their own cache metadata" ON public.content_cache_metadata;
DROP POLICY IF EXISTS "Users can create their own cache metadata" ON public.content_cache_metadata;
DROP POLICY IF EXISTS "Users can update their own cache metadata" ON public.content_cache_metadata;
DROP POLICY IF EXISTS "Users can delete their own cache metadata" ON public.content_cache_metadata;
DROP POLICY IF EXISTS "Users can view their own voice sessions" ON public.voice_sessions;
DROP POLICY IF EXISTS "Users can create their own voice sessions" ON public.voice_sessions;
DROP POLICY IF EXISTS "Users can update their own voice sessions" ON public.voice_sessions;

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS public.learning_analytics CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.voice_sessions CASCADE;
DROP TABLE IF EXISTS public.content_cache_metadata CASCADE;
DROP TABLE IF EXISTS public.user_progress CASCADE;
DROP TABLE IF EXISTS public.assessment_results CASCADE;
DROP TABLE IF EXISTS public.learning_materials CASCADE;
DROP TABLE IF EXISTS public.lecture_sessions CASCADE;
DROP TABLE IF EXISTS public.content_sources CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop indexes (they will be recreated)
DROP INDEX IF EXISTS idx_projects_user_id;
DROP INDEX IF EXISTS idx_content_sources_project_id;
DROP INDEX IF EXISTS idx_lecture_sessions_project_id;
DROP INDEX IF EXISTS idx_learning_materials_project_id;
DROP INDEX IF EXISTS idx_learning_materials_source_id;
DROP INDEX IF EXISTS idx_learning_materials_lecture_id;
DROP INDEX IF EXISTS idx_learning_materials_content_hash;
DROP INDEX IF EXISTS idx_learning_materials_type;
DROP INDEX IF EXISTS idx_assessment_results_user_id;
DROP INDEX IF EXISTS idx_assessment_results_project_id;
DROP INDEX IF EXISTS idx_assessment_results_source_id;
DROP INDEX IF EXISTS idx_assessment_results_type;
DROP INDEX IF EXISTS idx_assessment_results_taken_at;
DROP INDEX IF EXISTS idx_user_progress_composite;
DROP INDEX IF EXISTS idx_content_cache_metadata_user_hash;
DROP INDEX IF EXISTS idx_content_cache_metadata_expires;
DROP INDEX IF EXISTS idx_voice_sessions_project_id;
DROP INDEX IF EXISTS idx_chat_messages_lecture_id;

-- Confirm cleanup
SELECT 'Database cleanup complete. Ready for fresh schema deployment.' as status;