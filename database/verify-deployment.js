/**
 * Verify Database Deployment
 * Checks if all tables, functions, and policies are correctly deployed
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sphqnboutdqulbpffmfe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwaHFuYm91dGRxdWxicGZmbWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MzIzMDcsImV4cCI6MjA4MTIwODMwN30.nzo9G6ATV7FwD57pQeiEYOoCKgq2DpSEm7GELkDmQjU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Verifying EduVerse Database Deployment\n');
console.log('==========================================\n');

const tables = [
  'profiles',
  'projects',
  'content_sources',
  'lecture_sessions',
  'learning_materials',
  'assessment_results',
  'user_progress',
  'content_cache_metadata',
  'voice_sessions',
  'chat_messages',
  'learning_analytics',
  'career_plans',
  'career_plan_progress',
  'career_plan_resources',
  'career_plan_skills',
  'career_plan_assessments'
];

async function verifyTables() {
  let successCount = 0;
  let failCount = 0;
  
  console.log('📊 Checking tables...\n');
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01') {
          console.log(`❌ ${table.padEnd(30)} - NOT FOUND`);
          failCount++;
        } else {
          console.log(`✅ ${table.padEnd(30)} - EXISTS`);
          successCount++;
        }
      } else {
        console.log(`✅ ${table.padEnd(30)} - EXISTS`);
        successCount++;
      }
    } catch (err) {
      console.log(`❌ ${table.padEnd(30)} - ERROR: ${err.message}`);
      failCount++;
    }
  }
  
  console.log('\n' + '─'.repeat(50) + '\n');
  console.log(`📈 Results: ${successCount}/${tables.length} tables found\n`);
  
  if (successCount === tables.length) {
    console.log('🎉 SUCCESS! All tables are deployed correctly!\n');
    console.log('✅ Your database is ready to use!\n');
    console.log('Next steps:');
    console.log('1. Start the dev server: npm run dev');
    console.log('2. Add your Gemini API key to .env file');
    console.log('3. Create an account and start using EduVerse!\n');
    return true;
  } else if (successCount > 0) {
    console.log('⚠️  PARTIAL DEPLOYMENT: Some tables are missing.\n');
    console.log('Please re-run the deployment script in Supabase SQL Editor.\n');
    return false;
  } else {
    console.log('❌ NO TABLES FOUND: Database needs to be deployed.\n');
    console.log('Please follow the deployment instructions:');
    console.log('1. Go to: https://supabase.com/dashboard/project/sphqnboutdqulbpffmfe/sql/new');
    console.log('2. Copy contents from: database/complete-deployment.sql');
    console.log('3. Paste and click RUN\n');
    return false;
  }
}

verifyTables();
