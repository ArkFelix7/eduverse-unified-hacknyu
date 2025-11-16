import { supabase } from '../lib/supabase';
import type { 
  CareerPlan, 
  CareerPlanProgress, 
  CareerPlanResource, 
  CareerPlanSkill, 
  CareerPlanAssessment,
  UserPreferences,
  SkillAssessmentAnswer,
  RoadmapData,
  SkillAssessmentQuestion
} from '../types';

export class CareerPlanService {
  // ===============================
  // Career Plans CRUD
  // ===============================
  
  static async getUserCareerPlans(userId: string): Promise<CareerPlan[]> {
    const { data, error } = await supabase
      .from('career_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching career plans:', error);
      throw error;
    }

    return data || [];
  }

  static async getCareerPlan(planId: string): Promise<CareerPlan | null> {
    const { data, error } = await supabase
      .from('career_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error) {
      console.error('Error fetching career plan:', error);
      throw error;
    }

    return data;
  }

  static async createCareerPlan(
    userId: string,
    preferences: UserPreferences,
    assessmentAnswers: SkillAssessmentAnswer[],
    roadmapData: RoadmapData,
    assessedSkillLevel?: string
  ): Promise<CareerPlan> {
    const planData = {
      user_id: userId,
      title: roadmapData.careerTitle || preferences.careerGoal,
      description: roadmapData.shortSummary,
      status: 'active' as const,
      career_goal: preferences.careerGoal,
      skill_level: preferences.skillLevel,
      time_commitment: preferences.timeCommitment,
      learning_style: preferences.learningStyle,
      learning_medium: preferences.learningMedium,
      timeline: preferences.timeline,
      assessment_answers: assessmentAnswers,
      assessed_skill_level: assessedSkillLevel,
      roadmap_data: roadmapData,
      weekly_progress: {},
      monthly_progress: {},
      overall_progress_percentage: 0
    };

    const { data, error } = await supabase
      .from('career_plans')
      .insert([planData])
      .select()
      .single();

    if (error) {
      console.error('Error creating career plan:', error);
      throw error;
    }

    // Populate related tables
    await this.populateCareerPlanData(data.id);

    return data;
  }

  static async updateCareerPlan(
    planId: string,
    updates: Partial<CareerPlan>
  ): Promise<CareerPlan> {
    const { data, error } = await supabase
      .from('career_plans')
      .update(updates)
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      console.error('Error updating career plan:', error);
      throw error;
    }

    return data;
  }

  static async deleteCareerPlan(planId: string): Promise<void> {
    const { error } = await supabase
      .from('career_plans')
      .delete()
      .eq('id', planId);

    if (error) {
      console.error('Error deleting career plan:', error);
      throw error;
    }
  }

  // ===============================
  // Career Plan Data Population
  // ===============================
  
  private static async populateCareerPlanData(planId: string): Promise<void> {
    try {
      // Use PostgreSQL functions to populate related tables
      await supabase.rpc('populate_career_plan_resources', { plan_id: planId });
      await supabase.rpc('populate_career_plan_skills', { plan_id: planId });
      await supabase.rpc('populate_career_plan_progress', { plan_id: planId });
    } catch (error) {
      console.error('Error populating career plan data:', error);
      // Don't throw here - the main plan was created successfully
    }
  }

  // ===============================
  // Progress Tracking
  // ===============================

  static async getCareerPlanProgress(planId: string): Promise<CareerPlanProgress[]> {
    const { data, error } = await supabase
      .from('career_plan_progress')
      .select('*')
      .eq('career_plan_id', planId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching career plan progress:', error);
      throw error;
    }

    return data || [];
  }

  static async updateProgressItem(
    progressId: string, 
    isCompleted: boolean, 
    notes?: string
  ): Promise<CareerPlanProgress> {
    const updates: any = {
      is_completed: isCompleted,
      ...(notes && { notes }),
      ...(isCompleted && { completed_at: new Date().toISOString() })
    };

    const { data, error } = await supabase
      .from('career_plan_progress')
      .update(updates)
      .eq('id', progressId)
      .select()
      .single();

    if (error) {
      console.error('Error updating progress item:', error);
      throw error;
    }

    // Update overall progress percentage
    await this.updateOverallProgress(data.career_plan_id);

    return data;
  }

  static async updateOverallProgress(planId: string): Promise<number> {
    try {
      const { data } = await supabase.rpc('calculate_career_plan_progress', { 
        plan_id: planId 
      });
      return data || 0;
    } catch (error) {
      console.error('Error calculating progress:', error);
      return 0;
    }
  }

  // ===============================
  // Resources Management
  // ===============================

  static async getCareerPlanResources(planId: string): Promise<CareerPlanResource[]> {
    const { data, error } = await supabase
      .from('career_plan_resources')
      .select('*')
      .eq('career_plan_id', planId)
      .order('resource_type', { ascending: true });

    if (error) {
      console.error('Error fetching career plan resources:', error);
      throw error;
    }

    return data || [];
  }

  static async updateResource(
    resourceId: string,
    updates: Partial<CareerPlanResource>
  ): Promise<CareerPlanResource> {
    const { data, error } = await supabase
      .from('career_plan_resources')
      .update(updates)
      .eq('id', resourceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating resource:', error);
      throw error;
    }

    return data;
  }

  static async toggleResourceBookmark(
    resourceId: string, 
    isBookmarked: boolean
  ): Promise<CareerPlanResource> {
    return this.updateResource(resourceId, { is_bookmarked: isBookmarked });
  }

  static async markResourceCompleted(
    resourceId: string, 
    isCompleted: boolean,
    rating?: number,
    notes?: string
  ): Promise<CareerPlanResource> {
    const updates: any = {
      is_completed: isCompleted,
      ...(isCompleted && { completion_date: new Date().toISOString() }),
      ...(rating && { user_rating: rating }),
      ...(notes && { user_notes: notes })
    };

    return this.updateResource(resourceId, updates);
  }

  // ===============================
  // Skills Management
  // ===============================

  static async getCareerPlanSkills(planId: string): Promise<CareerPlanSkill[]> {
    const { data, error } = await supabase
      .from('career_plan_skills')
      .select('*')
      .eq('career_plan_id', planId)
      .order('skill_category', { ascending: true });

    if (error) {
      console.error('Error fetching career plan skills:', error);
      throw error;
    }

    return data || [];
  }

  static async updateSkillProficiency(
    skillId: string,
    currentProficiency: number
  ): Promise<CareerPlanSkill> {
    const { data, error } = await supabase
      .from('career_plan_skills')
      .update({
        current_proficiency: currentProficiency,
        last_practiced_date: new Date().toISOString()
      })
      .eq('id', skillId)
      .select()
      .single();

    if (error) {
      console.error('Error updating skill proficiency:', error);
      throw error;
    }

    return data;
  }

  static async toggleSkillPriority(
    skillId: string,
    isPriority: boolean
  ): Promise<CareerPlanSkill> {
    const { data, error } = await supabase
      .from('career_plan_skills')
      .update({ is_priority: isPriority })
      .eq('id', skillId)
      .select()
      .single();

    if (error) {
      console.error('Error updating skill priority:', error);
      throw error;
    }

    return data;
  }

  // ===============================
  // Assessment Management
  // ===============================

  static async createAssessment(
    careerPlanId: string,
    userId: string,
    questions: SkillAssessmentQuestion[],
    userAnswers: SkillAssessmentAnswer[],
    finalSkillLevel?: string
  ): Promise<CareerPlanAssessment> {
    const assessmentData = {
      career_plan_id: careerPlanId,
      user_id: userId,
      questions,
      user_answers: userAnswers,
      final_skill_level: finalSkillLevel,
      completed_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('career_plan_assessments')
      .insert([assessmentData])
      .select()
      .single();

    if (error) {
      console.error('Error creating assessment:', error);
      throw error;
    }

    return data;
  }

  static async getCareerPlanAssessments(planId: string): Promise<CareerPlanAssessment[]> {
    const { data, error } = await supabase
      .from('career_plan_assessments')
      .select('*')
      .eq('career_plan_id', planId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assessments:', error);
      throw error;
    }

    return data || [];
  }

  // ===============================
  // Analytics & Statistics
  // ===============================

  static async getCareerPlanStats(userId: string): Promise<{
    totalPlans: number;
    activePlans: number;
    completedPlans: number;
    averageProgress: number;
  }> {
    const { data: plans, error } = await supabase
      .from('career_plans')
      .select('status, overall_progress_percentage')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching career plan stats:', error);
      throw error;
    }

    const totalPlans = plans.length;
    const activePlans = plans.filter(p => p.status === 'active').length;
    const completedPlans = plans.filter(p => p.status === 'completed').length;
    const averageProgress = totalPlans > 0 
      ? Math.round(plans.reduce((sum, p) => sum + p.overall_progress_percentage, 0) / totalPlans)
      : 0;

    return {
      totalPlans,
      activePlans,
      completedPlans,
      averageProgress
    };
  }

  static async getPopularCareers(): Promise<Array<{career: string, count: number}>> {
    const { data, error } = await supabase
      .from('career_plans')
      .select('career_goal')
      .not('career_goal', 'is', null);

    if (error) {
      console.error('Error fetching popular careers:', error);
      return [];
    }

    // Count occurrences
    const careerCounts: Record<string, number> = {};
    data.forEach(plan => {
      careerCounts[plan.career_goal] = (careerCounts[plan.career_goal] || 0) + 1;
    });

    // Convert to array and sort by count
    return Object.entries(careerCounts)
      .map(([career, count]) => ({ career, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }
}

export default CareerPlanService;