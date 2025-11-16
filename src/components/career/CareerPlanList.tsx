import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useCareerPlanStore } from '../../stores/careerPlanStore';
import CareerPlanner from './CareerPlanner';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import type { CareerPlan } from '../../types';

const CareerPlanList: React.FC = () => {
  const { user } = useAuthStore();
  const {
    careerPlans,
    loading,
    error,
    stats,
    loadCareerPlans,
    loadStats,
    deleteCareerPlan
  } = useCareerPlanStore();
  
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<CareerPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCareerPlans(user.id);
      loadStats(user.id);
    }
  }, [user, loadCareerPlans, loadStats]);

  const handleCreateNewPlan = () => {
    setShowCreatePlan(true);
  };

  const handleBackToList = () => {
    setShowCreatePlan(false);
    setSelectedPlan(null);
    // Reload plans in case new one was created
    if (user) {
      loadCareerPlans(user.id);
      loadStats(user.id);
    }
  };

  const handleSelectPlan = (plan: CareerPlan) => {
    setSelectedPlan(plan);
  };

  const handleDeletePlan = async (planId: string) => {
    if (window.confirm('Are you sure you want to delete this career plan? This action cannot be undone.')) {
      try {
        setDeletingPlan(planId);
        await deleteCareerPlan(planId);
      } catch (error) {
        console.error('Failed to delete plan:', error);
      } finally {
        setDeletingPlan(null);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Show create new plan flow
  if (showCreatePlan) {
    return <CareerPlanner />;
  }

  // Show selected plan details
  if (selectedPlan) {
    return (
      <div>
        <button
          onClick={handleBackToList}
          className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to Plans
        </button>
        {/* Here you would show the RoadmapDashboard for the selected plan */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedPlan.title}</h2>
          <p className="text-gray-600">{selectedPlan.description || selectedPlan.career_goal}</p>
          {/* Add RoadmapDashboard component here */}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Career Plans</h2>
            <p className="mt-1 text-gray-600">
              Create and manage your personalized career roadmaps
            </p>
          </div>
          <Button onClick={handleCreateNewPlan}>
            <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New Plan
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Plans</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPlans}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Plans</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activePlans}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedPlans}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Progress</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageProgress}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="text-red-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      {careerPlans.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No career plans yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first career plan to get a personalized roadmap for your goals.
          </p>
          <Button onClick={handleCreateNewPlan}>
            Create Your First Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {careerPlans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {plan.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {plan.description || plan.career_goal}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(plan.status)}`}>
                    {plan.status}
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>{plan.overall_progress_percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${plan.overall_progress_percentage}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Meta Info */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>Timeline: {plan.timeline}</span>
                  <span>Created {formatDate(plan.created_at)}</span>
                </div>
                
                {/* Actions */}
                <div className="flex space-x-3">
                  <Button 
                    size="sm" 
                    onClick={() => handleSelectPlan(plan)}
                    className="flex-1"
                  >
                    View Plan
                  </Button>
                  <button 
                    onClick={() => handleDeletePlan(plan.id)}
                    disabled={deletingPlan === plan.id}
                    className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                  >
                    {deletingPlan === plan.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CareerPlanList;
