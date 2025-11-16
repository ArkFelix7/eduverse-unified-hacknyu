import { create } from 'zustand';
import type { CareerPlan } from '../types';
import CareerPlanService from '../services/careerPlanService';

interface CareerPlanStore {
  // State
  careerPlans: CareerPlan[];
  currentPlan: CareerPlan | null;
  loading: boolean;
  error: string | null;
  stats: {
    totalPlans: number;
    activePlans: number;
    completedPlans: number;
    averageProgress: number;
  } | null;

  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCareerPlans: (plans: CareerPlan[]) => void;
  setCurrentPlan: (plan: CareerPlan | null) => void;
  
  // API Actions
  loadCareerPlans: (userId: string) => Promise<void>;
  loadCareerPlan: (planId: string) => Promise<void>;
  createCareerPlan: (plan: Omit<CareerPlan, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateCareerPlan: (planId: string, updates: Partial<CareerPlan>) => Promise<void>;
  deleteCareerPlan: (planId: string) => Promise<void>;
  loadStats: (userId: string) => Promise<void>;
  
  // Progress tracking
  updateProgress: (planId: string, itemId: string, completed: boolean) => Promise<void>;
}

export const useCareerPlanStore = create<CareerPlanStore>((set, get) => ({
  // Initial state
  careerPlans: [],
  currentPlan: null,
  loading: false,
  error: null,
  stats: null,

  // Basic setters
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
  setCareerPlans: (careerPlans: CareerPlan[]) => set({ careerPlans }),
  setCurrentPlan: (currentPlan: CareerPlan | null) => set({ currentPlan }),

  // API Actions
  loadCareerPlans: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const plans = await CareerPlanService.getUserCareerPlans(userId);
      set({ careerPlans: plans });
    } catch (error) {
      console.error('Failed to load career plans:', error);
      set({ error: 'Failed to load career plans' });
    } finally {
      set({ loading: false });
    }
  },

  loadCareerPlan: async (planId: string) => {
    set({ loading: true, error: null });
    try {
      const plan = await CareerPlanService.getCareerPlan(planId);
      set({ currentPlan: plan });
    } catch (error) {
      console.error('Failed to load career plan:', error);
      set({ error: 'Failed to load career plan' });
    } finally {
      set({ loading: false });
    }
  },

  createCareerPlan: async (planData: Omit<CareerPlan, 'id' | 'created_at' | 'updated_at'>) => {
    set({ loading: true, error: null });
    try {
      // This would typically be handled by the CareerPlanner component
      // since it involves the complex flow of generation
      throw new Error('Use CareerPlanner component to create new plans');
    } catch (error) {
      console.error('Failed to create career plan:', error);
      set({ error: 'Failed to create career plan' });
    } finally {
      set({ loading: false });
    }
  },

  updateCareerPlan: async (planId: string, updates: Partial<CareerPlan>) => {
    set({ loading: true, error: null });
    try {
      const updatedPlan = await CareerPlanService.updateCareerPlan(planId, updates);
      
      // Update in the list
      const currentPlans = get().careerPlans;
      const updatedPlans = currentPlans.map(plan => 
        plan.id === planId ? updatedPlan : plan
      );
      set({ careerPlans: updatedPlans });
      
      // Update current plan if it's the same one
      const currentPlan = get().currentPlan;
      if (currentPlan && currentPlan.id === planId) {
        set({ currentPlan: updatedPlan });
      }
    } catch (error) {
      console.error('Failed to update career plan:', error);
      set({ error: 'Failed to update career plan' });
    } finally {
      set({ loading: false });
    }
  },

  deleteCareerPlan: async (planId: string) => {
    set({ loading: true, error: null });
    try {
      await CareerPlanService.deleteCareerPlan(planId);
      
      // Remove from the list
      const currentPlans = get().careerPlans;
      const updatedPlans = currentPlans.filter(plan => plan.id !== planId);
      set({ careerPlans: updatedPlans });
      
      // Clear current plan if it was deleted
      const currentPlan = get().currentPlan;
      if (currentPlan && currentPlan.id === planId) {
        set({ currentPlan: null });
      }
    } catch (error) {
      console.error('Failed to delete career plan:', error);
      set({ error: 'Failed to delete career plan' });
    } finally {
      set({ loading: false });
    }
  },

  loadStats: async (userId: string) => {
    try {
      const stats = await CareerPlanService.getCareerPlanStats(userId);
      set({ stats });
    } catch (error) {
      console.error('Failed to load career plan stats:', error);
      // Don't set error state for stats as it's not critical
    }
  },

  updateProgress: async (planId: string, itemId: string, completed: boolean) => {
    try {
      // This would need to be implemented with progress tracking
      // For now, just log the update
      console.log('Progress update:', { planId, itemId, completed });
      
      // You could implement actual progress tracking here:
      // await CareerPlanService.updateProgressItem(progressId, completed);
      // const updatedProgress = await CareerPlanService.updateOverallProgress(planId);
      
      // Update the plan in state with new progress
      const currentPlans = get().careerPlans;
      const updatedPlans = currentPlans.map(plan => {
        if (plan.id === planId) {
          // Update the weekly_progress or monthly_progress based on itemId
          const updatedWeeklyProgress = { ...plan.weekly_progress };
          updatedWeeklyProgress[itemId] = completed;
          
          return {
            ...plan,
            weekly_progress: updatedWeeklyProgress,
            // You might also want to update overall_progress_percentage here
          };
        }
        return plan;
      });
      set({ careerPlans: updatedPlans });
      
      // Update current plan if it matches
      const currentPlan = get().currentPlan;
      if (currentPlan && currentPlan.id === planId) {
        const updatedWeeklyProgress = { ...currentPlan.weekly_progress };
        updatedWeeklyProgress[itemId] = completed;
        
        set({ 
          currentPlan: {
            ...currentPlan,
            weekly_progress: updatedWeeklyProgress
          }
        });
      }
      
    } catch (error) {
      console.error('Failed to update progress:', error);
      set({ error: 'Failed to update progress' });
    }
  }
}));
