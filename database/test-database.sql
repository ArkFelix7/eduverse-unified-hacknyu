-- Test Database Functionality
-- Run this to verify your database is working correctly

-- Test 1: Check if all tables exist
SELECT 
    'Table Check' as test,
    table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Test 2: Check if RLS is enabled
SELECT 
    'RLS Check' as test,
    tablename,
    CASE WHEN rowsecurity = true THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Test 3: Check if indexes exist
SELECT 
    'Index Check' as test,
    indexname,
    tablename,
    'EXISTS' as status
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Test 4: Check if functions exist
SELECT 
    'Function Check' as test,
    proname as function_name,
    'EXISTS' as status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- Test 5: Check if triggers exist  
SELECT 
    'Trigger Check' as test,
    trigger_name,
    table_name,
    'EXISTS' as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY table_name, trigger_name;

-- Final status
SELECT 
    'Database Test Complete' as status,
    'All components checked' as message,
    NOW() as tested_at;