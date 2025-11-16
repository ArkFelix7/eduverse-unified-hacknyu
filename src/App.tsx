import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabase';
import { useAuthStore } from './stores/authStore';

// Pages
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import ProjectPage from './pages/ProjectPage';
import AuthPage from './pages/AuthPage';
import CareerPlanningPage from './pages/CareerPlanningPage';

// Components
import Layout from './components/Layout';
import LoadingSpinner from './components/ui/LoadingSpinner';

function App() {
  const { user, loading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // Get initial session
    const getInitialSession = async () => {
      setLoading(true);
      
      // Set a timeout to prevent hanging
      timeoutId = setTimeout(() => {
        console.warn('Auth initialization timeout');
        setLoading(false);
        setUser(null);
      }, 5000);
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          // Create a basic user object from auth session
          // Don't try to access database tables that might not exist
          const basicUser = {
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || session.user.email || 'User',
            avatar_url: session.user.user_metadata?.avatar_url || null,
            created_at: session.user.created_at,
            updated_at: session.user.updated_at || session.user.created_at
          };
          
          setUser(basicUser);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        // Don't let auth errors hang the app
        setUser(null);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setLoading(true);
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            // Create basic user object from session
            const basicUser = {
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || session.user.email || 'User',
              avatar_url: session.user.user_metadata?.avatar_url || null,
              created_at: session.user.created_at,
              updated_at: session.user.updated_at || session.user.created_at
            };
            
            setUser(basicUser);
          } else if (event === 'SIGNED_OUT') {
            // User signed out
            setUser(null);
          }
        } catch (error) {
          console.error('Error handling auth state change:', error);
          setUser(null);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [setUser, setLoading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
        
        <Routes>
          {/* Public routes */}
          <Route 
            path="/" 
            element={
              user ? <Navigate to="/dashboard" replace /> : <LandingPage />
            } 
          />
          <Route 
            path="/auth" 
            element={
              user ? <Navigate to="/dashboard" replace /> : <AuthPage />
            } 
          />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              user ? (
                <Layout>
                  <Dashboard />
                </Layout>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/project/:projectId"
            element={
              user ? (
                <Layout>
                  <ProjectPage />
                </Layout>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/career-planning"
            element={
              user ? (
                <Layout>
                  <CareerPlanningPage />
                </Layout>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />

          {/* Catch all route */}
          <Route 
            path="*" 
            element={<Navigate to={user ? "/dashboard" : "/"} replace />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;