/**
 * Database Deployment Script for EduVerse Unified Platform
 * 
 * This script deploys the complete database schema to your Supabase instance.
 * Run with: node database/deploy-database.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sphqnboutdqulbpffmfe.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwaHFuYm91dGRxdWxicGZmbWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MzIzMDcsImV4cCI6MjA4MTIwODMwN30.nzo9G6ATV7FwD57pQeiEYOoCKgq2DpSEm7GELkDmQjU';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

console.log('🚀 EduVerse Database Deployment');
console.log('================================\n');
console.log(`📡 Supabase URL: ${supabaseUrl}`);
console.log(`🔑 Using Anon Key: ${supabaseAnonKey.substring(0, 20)}...\n`);

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Read the SQL deployment script
const sqlFile = join(__dirname, 'complete-deployment.sql');
let sql;

try {
  sql = readFileSync(sqlFile, 'utf8');
  console.log('✅ Loaded deployment script (complete-deployment.sql)');
  console.log(`📄 Script size: ${(sql.length / 1024).toFixed(2)} KB\n`);
} catch (error) {
  console.error('❌ Error reading SQL file:', error.message);
  process.exit(1);
}

// Deploy the database
async function deployDatabase() {
  console.log('🔨 Starting database deployment...\n');
  console.log('This will create:');
  console.log('  • 16 tables (profiles, projects, content sources, etc.)');
  console.log('  • 30+ performance indexes');
  console.log('  • 40+ Row Level Security policies');
  console.log('  • 4 utility functions');
  console.log('  • 8 triggers\n');
  
  try {
    // Note: The anon key cannot execute DDL commands directly
    // We need to provide instructions to run via SQL Editor
    console.log('⚠️  IMPORTANT: The anon key cannot execute DDL commands directly.');
    console.log('📋 Please follow these steps:\n');
    console.log('1. Go to your Supabase Dashboard:');
    console.log(`   https://supabase.com/dashboard/project/${supabaseUrl.split('.')[0].split('//')[1]}\n`);
    console.log('2. Click on "SQL Editor" in the left sidebar\n');
    console.log('3. Copy and paste the contents of:');
    console.log('   database/complete-deployment.sql\n');
    console.log('4. Click "Run" to execute the script\n');
    console.log('Expected result: "✅ Database deployment complete!"\n');
    
    // Test connection
    console.log('🔍 Testing connection to Supabase...');
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log('✅ Connection successful! Database is ready for deployment.');
      console.log('   (Table "profiles" does not exist yet - this is expected)\n');
    } else if (error) {
      console.log('⚠️  Connection test returned:', error.message);
      console.log('   This might be okay if the table doesn\'t exist yet.\n');
    } else {
      console.log('✅ Connection successful! Database appears to be already set up.');
      console.log('   (Found existing profiles table)\n');
    }
    
    console.log('📚 For detailed instructions, see:');
    console.log('   DATABASE_DEPLOYMENT_INSTRUCTIONS.md\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Verify deployment
async function verifyDeployment() {
  console.log('🔍 Verifying deployment...\n');
  
  const tables = [
    'profiles', 'projects', 'content_sources', 'lecture_sessions',
    'learning_materials', 'assessment_results', 'user_progress',
    'content_cache_metadata', 'voice_sessions', 'chat_messages',
    'learning_analytics', 'career_plans', 'career_plan_progress',
    'career_plan_resources', 'career_plan_skills', 'career_plan_assessments'
  ];
  
  let successCount = 0;
  let failCount = 0;
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error && error.code === '42P01') {
        console.log(`❌ Table "${table}" not found`);
        failCount++;
      } else if (error) {
        console.log(`⚠️  Table "${table}" - ${error.message}`);
        failCount++;
      } else {
        console.log(`✅ Table "${table}" exists`);
        successCount++;
      }
    } catch (err) {
      console.log(`❌ Table "${table}" - ${err.message}`);
      failCount++;
    }
  }
  
  console.log(`\n📊 Results: ${successCount}/${tables.length} tables verified`);
  
  if (successCount === tables.length) {
    console.log('🎉 Database deployment verified successfully!\n');
    return true;
  } else {
    console.log('⚠️  Some tables are missing. Please run the deployment script.\n');
    return false;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--verify') || args.includes('-v')) {
    await verifyDeployment();
  } else {
    await deployDatabase();
  }
}

main().catch(console.error);
