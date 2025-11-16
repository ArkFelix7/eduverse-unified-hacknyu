# EduVerse Unified Database Reset Guide

## 🚨 CRITICAL DATABASE SCHEMA MISMATCHES IDENTIFIED

### Issues Found:
1. **LearningMaterial Interface** - Missing 5 database columns
2. **AssessmentResult Interface** - Missing 7 database columns  
3. **ChatMessage Interface** - Conflicting definitions and missing required fields
4. **Missing Interfaces** - 3 database tables had no TypeScript interfaces

### 📋 STEP-BY-STEP DATABASE RESET PROCESS

## Step 1: Backup Current Data (OPTIONAL)
If you have important data, export it first:

```sql
-- Export projects
COPY public.projects TO '/tmp/projects_backup.csv' WITH CSV HEADER;

-- Export content sources  
COPY public.content_sources TO '/tmp/content_sources_backup.csv' WITH CSV HEADER;

-- Export lecture sessions
COPY public.lecture_sessions TO '/tmp/lecture_sessions_backup.csv' WITH CSV HEADER;
```

## Step 2: Drop All Tables and Dependencies

⚠️ **WARNING: This will delete ALL data!**

```sql
-- Drop all tables in dependency order (reverse of creation)
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

-- Drop all functions
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_cache() CASCADE;
DROP FUNCTION IF EXISTS public.update_material_access() CASCADE;

-- Drop all policies (they'll be recreated)
-- Policies are automatically dropped with tables
```

## Step 3: Re-run the Schema Creation

Run the updated schema.sql file (which should now match the TypeScript interfaces).

## Step 4: Create Storage Buckets

In Supabase Dashboard > Storage, create these buckets:

1. **lecture-audio** (for audio recordings)
   - Public: false
   - File size limit: 100MB
   - Allowed file types: audio/*

2. **project-files** (for uploaded PDFs)
   - Public: false  
   - File size limit: 50MB
   - Allowed file types: application/pdf

3. **avatars** (for user profile pictures)
   - Public: true
   - File size limit: 2MB
   - Allowed file types: image/*

## Step 5: Set Storage Bucket Policies

```sql
-- Lecture audio bucket policy
CREATE POLICY "Users can upload their own lecture audio" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'lecture-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own lecture audio" ON storage.objects
FOR SELECT USING (bucket_id = 'lecture-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Project files bucket policy  
CREATE POLICY "Users can upload their own project files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own project files" ON storage.objects
FOR SELECT USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Avatars bucket policy
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own avatar" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatars are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');
```

## Step 6: Test Database Connection

Run this in the application to verify everything works:

```typescript
import { supabase } from './src/lib/supabase';

async function testDatabase() {
  // Test basic connection
  const { data, error } = await supabase.from('profiles').select('count');
  console.log('Database connected:', !error);
  
  // Test table creation
  const tables = [
    'profiles', 'projects', 'content_sources', 
    'lecture_sessions', 'learning_materials', 
    'assessment_results', 'user_progress',
    'content_cache_metadata', 'voice_sessions',
    'chat_messages', 'learning_analytics'
  ];
  
  for (const table of tables) {
    const { error: tableError } = await supabase.from(table).select('count');
    console.log(`Table ${table}:`, !tableError ? '✅' : '❌', tableError?.message);
  }
}
```

## Step 7: Update Environment Variables

Ensure these are set in your .env file:

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

## Step 8: Clear Application Cache

1. Clear browser localStorage/sessionStorage
2. Restart the development server
3. Clear any cached data in the application

## ⚠️ IMPORTANT NOTES

1. **All existing data will be lost** - make backups if needed
2. **User authentication data is preserved** (handled by Supabase Auth)
3. **Storage buckets need manual creation** in Supabase dashboard
4. **RLS policies will be recreated** with the schema
5. **TypeScript interfaces now match database exactly**

## 🔧 Verification Checklist

After reset, verify:
- [ ] All tables exist and are accessible
- [ ] Storage buckets are created with correct policies
- [ ] User profiles can be created automatically
- [ ] Projects can be created and retrieved
- [ ] Content sources can be uploaded and processed
- [ ] Lecture recording works end-to-end
- [ ] Learning materials are generated correctly
- [ ] Assessment results save properly
- [ ] No TypeScript interface/database mismatches

## 🆘 Troubleshooting

**If tables don't exist:**
```sql
-- Check what tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

**If RLS policies block access:**
```sql
-- Temporarily disable RLS for testing (re-enable after)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- ... repeat for other tables
```

**If storage access fails:**
- Check bucket creation in Supabase Dashboard
- Verify storage policies are correctly set
- Ensure CORS settings allow your domain

---

This reset process will ensure your database schema perfectly matches your TypeScript interfaces and resolves all column mismatch issues.