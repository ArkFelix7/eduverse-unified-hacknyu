-- Database Verification Script
-- Run this after executing reset_database.sql to verify everything is working

-- Check if all tables exist
SELECT 'Tables Check:' as check_type;
SELECT 
    CASE 
        WHEN COUNT(*) = 11 THEN '✅ All 11 tables created successfully'
        ELSE '❌ Missing tables - Expected 11, Found: ' || COUNT(*)
    END as result
FROM pg_tables 
WHERE schemaname = 'public';

SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Check if RLS is enabled on all tables
SELECT 'RLS Check:' as check_type;
SELECT 
    CASE 
        WHEN COUNT(*) = 11 THEN '✅ RLS enabled on all tables'
        ELSE '❌ RLS issues - Expected 11, Found: ' || COUNT(*)
    END as result
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Check policies count
SELECT 'Policies Check:' as check_type;
SELECT 
    CASE 
        WHEN COUNT(*) >= 20 THEN '✅ Policies created successfully (' || COUNT(*) || ' policies)'
        ELSE '❌ Missing policies - Found only: ' || COUNT(*)
    END as result
FROM pg_policies 
WHERE schemaname = 'public';

-- Check functions
SELECT 'Functions Check:' as check_type;
SELECT 
    proname as function_name,
    '✅ Created' as status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('handle_updated_at', 'cleanup_expired_cache', 'update_material_access');

-- Check triggers
SELECT 'Triggers Check:' as check_type;
SELECT 
    tgname as trigger_name,
    '✅ Active on ' || relname as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND NOT tgisinternal;

-- Test basic insert (this will fail if auth context is missing, which is expected in SQL editor)
SELECT 'Basic Insert Test:' as check_type;
SELECT '⚠️  Cannot test inserts in SQL editor (requires auth context)' as note;
SELECT 'Use the application to test actual CRUD operations after reset' as instruction;

-- Check table relationships
SELECT 'Relationships Check:' as check_type;
SELECT 
    COUNT(*) || ' foreign key constraints found' as result
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' 
AND table_schema = 'public';

-- Final status
SELECT 'Final Status:' as check_type;
SELECT '🎉 Database reset verification complete!' as message;
SELECT 'Next steps:' as next_steps;
SELECT '1. Create storage buckets in Supabase Dashboard' as step1;
SELECT '2. Test application functionality' as step2;
SELECT '3. Monitor for any remaining issues' as step3;