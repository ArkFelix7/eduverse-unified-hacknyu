/**
 * Database Deployment Script using Supabase Management API
 * This creates a direct SQL execution through Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://sphqnboutdqulbpffmfe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwaHFuYm91dGRxdWxicGZmbWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MzIzMDcsImV4cCI6MjA4MTIwODMwN30.nzo9G6ATV7FwD57pQeiEYOoCKgq2DpSEm7GELkDmQjU';

console.log('🚀 EduVerse Database Deployment\n');
console.log('================================\n');

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Read SQL file
const sql = readFileSync('./database/complete-deployment.sql', 'utf8');

console.log('✅ Loaded deployment script');
console.log(`📄 Script size: ${(sql.length / 1024).toFixed(2)} KB\n`);

console.log('📋 DEPLOYMENT INSTRUCTIONS:\n');
console.log('Since we\'re using the anon key (not service role key), we need to');
console.log('execute the SQL manually through the Supabase Dashboard.\n');

console.log('Please follow these steps:\n');
console.log('1. Open your Supabase Dashboard:');
console.log('   https://supabase.com/dashboard/project/sphqnboutdqulbpffmfe/sql/new\n');

console.log('2. The SQL script is ready at:');
console.log('   database/complete-deployment.sql\n');

console.log('3. Copy the entire file contents and paste into SQL Editor\n');

console.log('4. Click "RUN" to execute\n');

console.log('5. Expected output: "✅ Database deployment complete!"\n');

console.log('6. Then run: node database/verify-deployment.js\n');

console.log('─────────────────────────────────────────────────────────\n');
console.log('🔍 Testing connection...\n');

// Test connection
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log('✅ Connected to Supabase successfully!');
        console.log('   Database is ready for schema deployment.\n');
        console.log('👆 Please follow the manual deployment steps above.\n');
      } else {
        console.log('⚠️  Connection established, but received error:');
        console.log(`   ${error.message}\n`);
      }
    } else {
      console.log('✅ Connected to Supabase successfully!');
      console.log('✅ Tables appear to be already deployed!\n');
      console.log('Run: node database/verify-deployment.js to verify all tables.\n');
    }
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  }
}

testConnection();
