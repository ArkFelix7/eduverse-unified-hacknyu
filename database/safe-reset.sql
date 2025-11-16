-- Safe Database Reset for EduVerse Unified Platform
-- This script safely drops all existing tables and prepares for fresh deployment

-- ⚠️  WARNING: This will delete all existing data!
-- Make sure to backup any important data before running this script

-- Drop all policies first (they reference tables)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on public schema tables
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Drop all triggers (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        DROP TRIGGER IF EXISTS set_timestamp_profiles ON public.profiles;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
        DROP TRIGGER IF EXISTS set_timestamp_projects ON public.projects;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_progress') THEN
        DROP TRIGGER IF EXISTS set_timestamp_user_progress ON public.user_progress;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'learning_materials') THEN
        DROP TRIGGER IF EXISTS update_material_access_trigger ON public.learning_materials;
    END IF;
END $$;

-- Drop all functions
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.cleanup_expired_cache();
DROP FUNCTION IF EXISTS public.update_material_access();

-- Disable RLS on all tables that might exist
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;

-- Drop all tables in the correct order (handles dependencies automatically)
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

-- Confirm cleanup
SELECT 
    'Database cleanup complete! ✅' as status,
    'All tables, policies, triggers, and functions removed.' as message,
    'Ready for fresh schema deployment.' as next_step;