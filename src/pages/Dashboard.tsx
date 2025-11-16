import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { databaseService } from '../services/databaseService';
import { clearAuthStorage, debugAuthState } from '../utils/authDebug';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import CareerPlanList from '../components/career/CareerPlanList';
import type { Project } from '../types';

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'projects' | 'career-plans'>('projects');

  const tabs = [
    { id: 'projects' as const, label: 'Learning Projects' },
    { id: 'career-plans' as const, label: 'Career Plans' }
  ];

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (user) {
      // Set a timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        if (loading) {
          console.warn('Dashboard loading timeout');
          setLoading(false);
          setError('Loading timeout - there may be a database configuration issue');
        }
      }, 8000);
      
      loadProjects().finally(() => {
        clearTimeout(timeoutId);
      });
    } else {
      setLoading(false);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user]);

  const loadProjects = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log('Loading projects for user:', user.id);
      const userProjects = await databaseService.getUserProjects(user.id);
      console.log('Loaded projects:', userProjects);
      setProjects(userProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setError('Failed to load projects. Make sure the database schema is applied.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newProjectTitle.trim()) return;

    setCreating(true);
    try {
      const project = await databaseService.createProject(user.id, {
        title: newProjectTitle.trim(),
        description: newProjectDescription.trim(),
        status: 'active',
        tags: []
      });

      setShowCreateModal(false);
      setNewProjectTitle('');
      setNewProjectDescription('');
      
      // Add to local state
      setProjects(prev => [project, ...prev]);
      
      // Navigate to project
      window.location.href = `/project/${project.id}`;
    } catch (error) {
      console.error('Error creating project:', error);
      setError('Failed to create project. Make sure the database schema is applied.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.full_name || 'Student'}!
        </h1>
        <p className="mt-2 text-gray-600">
          Continue your learning journey or start planning your career.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="text-red-400">⚠️</div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Database Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
                <p className="mt-1">
                  Please apply the database schema from `database/schema.sql` to your Supabase project.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'career-plans' ? (
        <CareerPlanList />
      ) : (
        <div>
          {/* Action Buttons for Projects */}
          <div className="mb-8">
            <Button onClick={() => setShowCreateModal(true)}>
              Create New Project
            </Button>
          </div>

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-600 mb-6">Create your first project to get started with AI-powered learning.</p>
              <Button onClick={() => setShowCreateModal(true)}>
                Create Your First Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Project</h3>
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Project Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Advanced Physics, Machine Learning Basics"
                  required
                />
              </div>
              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Brief description of what you'll be learning..."
                />
              </div>
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={creating} disabled={creating}>
                  Create Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Project Card Component
interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const handleProjectClick = () => {
    window.location.href = `/project/${project.id}`;
  };

  return (
    <div 
      onClick={handleProjectClick}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer p-6"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 truncate">
          {project.title}
        </h3>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          project.status === 'active' ? 'bg-green-100 text-green-800' :
          project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {project.status}
        </span>
      </div>
      
      {project.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {project.description}
        </p>
      )}
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          Created {new Date(project.created_at).toLocaleDateString()}
        </span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
};

export default Dashboard;