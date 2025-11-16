// Debug helper to clear auth state and storage
export const clearAuthStorage = () => {
  try {
    // Clear localStorage
    localStorage.removeItem('auth-storage');
    localStorage.removeItem('sb-fazcvncilvbtvhgdfsfl-auth-token');
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear all Supabase related items
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('Auth storage cleared');
    return true;
  } catch (error) {
    console.error('Error clearing auth storage:', error);
    return false;
  }
};

export const debugAuthState = () => {
  console.log('=== AUTH DEBUG ===');
  console.log('localStorage auth-storage:', localStorage.getItem('auth-storage'));
  console.log('All localStorage keys:', Object.keys(localStorage));
  console.log('All sessionStorage keys:', Object.keys(sessionStorage));
  console.log('==================');
};