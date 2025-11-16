// Simple database connection test
import { supabase } from '../lib/supabase';

export const testDatabaseConnection = async () => {
  try {
    console.log('Testing database connection...');
    
    // Test 1: Basic connection
    const { data: healthCheck, error: healthError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (healthError) {
      console.error('Database health check failed:', healthError);
      return { success: false, error: healthError.message };
    }
    
    console.log('Database connection successful');
    return { success: true };
    
  } catch (error) {
    console.error('Database test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const checkTablesExist = async () => {
  try {
    const tables = ['profiles', 'projects', 'content_sources', 'learning_materials'];
    const results = [];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        results.push({ 
          table, 
          exists: !error, 
          error: error?.message 
        });
      } catch (err) {
        results.push({ 
          table, 
          exists: false, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Table check failed:', error);
    return [];
  }
};