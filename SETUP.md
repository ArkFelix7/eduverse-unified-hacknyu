# EduVerse Database Setup Guide

## Quick Start - Apply Database Schema

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to your project: `fazcvncilvbtvhgdfsfl`
3. Go to SQL Editor from the left sidebar
4. Copy and paste the entire content from `database/schema.sql` into the SQL editor
5. Click "Run" to execute the schema

### Option 2: Using Supabase CLI
If you have Supabase CLI installed:
```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref fazcvncilvbtvhgdfsfl

# Apply the schema
supabase db push
```

## What the Schema Creates

The schema will create the following tables:
- `user_profiles` - User profile information
- `projects` - Learning projects
- `content_sources` - PDFs, documents, etc.
- `lecture_sessions` - Recorded lectures
- `learning_materials` - Generated flashcards, summaries
- `quiz_sessions` - Quiz attempts and results
- `assessment_results` - Assessment data
- `study_schedules` - Personalized schedules
- `verbal_test_sessions` - Verbal test recordings

## Environment Setup Complete ✅

Your `.env.local` file is configured with:
- Supabase URL: https://fazcvncilvbtvhgdfsfl.supabase.co
- Anonymous Key: ✅ Configured
- Service Role Key: (provided but not stored for security)

## Next Steps

1. Apply the database schema using one of the methods above
2. Add your Google Gemini API key to `.env.local` 
3. The app is already running at http://localhost:5173/

## Testing the Connection

Once the schema is applied, you can test the app by:
1. Going to http://localhost:5173/
2. Creating an account
3. The app will automatically create your profile in the database

## Troubleshooting

If you encounter any issues:
- Check that the schema was applied successfully
- Verify environment variables are correct
- Check browser console for any errors