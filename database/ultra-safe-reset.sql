-- Ultra Safe Database Reset for EduVerse Unified Platform
-- This script will work regardless of current database state

-- ⚠️  WARNING: This will delete all existing data!

-- Step 1: Drop everything using CASCADE to handle all dependencies
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Step 2: Restore default permissions for public schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT CREATE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Step 3: Grant default table permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- Confirm cleanup
SELECT 
    'Database reset complete! ✅' as status,
    'Public schema recreated from scratch.' as message,
    'Ready for fresh deployment.' as next_step;