import { supabase } from '../lib/supabase';
import type { 
  VerbalTestTranscriptEntry, 
  LearningAnalysisReport, 
  AssessmentResult
} from '../types';

// Enhanced interfaces for the unified platform
export interface UserProgress {
  id: string;
  user_id: string;
  project_id?: string;
  source_id?: string;
  content_type: string;
  overall_weak_topics: string[];
  improvement_areas: string[];
  total_sessions: number;
  average_score: number;
  best_score: number;
  recent_trend: number;
  last_session_date: string;
  created_at: string;
  updated_at: string;
}

export interface AdaptiveTestConfig {
  focusOnWeakTopics: boolean;
  difficultyAdjustment: 'none' | 'easier' | 'harder';
  questionCount: number;
  includeReviewQuestions: boolean;
}

export class AdaptiveTestService {
  // Get user's assessment history for a specific source
  async getUserAssessmentHistory(
    userId: string, 
    sourceId?: string, 
    projectId?: string
  ): Promise<AssessmentResult[]> {
    let query = supabase
      .from('assessment_results')
      .select('*')
      .eq('user_id', userId)
      .order('taken_at', { ascending: false });

    if (sourceId) {
      query = query.eq('source_id', sourceId);
    }
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Get or create user progress record
  async getUserProgress(
    userId: string,
    sourceId: string,
    projectId: string,
    contentType: string = 'verbal_test'
  ): Promise<UserProgress | null> {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('source_id', sourceId)
      .eq('project_id', projectId)
      .eq('content_type', contentType)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  // Generate adaptive questions based on user's weak topics
  async generateAdaptiveQuestions(
    sourceText: string,
    userId: string,
    sourceId: string,
    projectId: string,
    isRetake: boolean = false,
    config: AdaptiveTestConfig = {
      focusOnWeakTopics: true,
      difficultyAdjustment: 'none',
      questionCount: 5,
      includeReviewQuestions: false
    }
  ): Promise<string[]> {
    try {
      if (isRetake && config.focusOnWeakTopics) {
        const progress = await this.getUserProgress(userId, sourceId, projectId);
        if (progress && progress.overall_weak_topics.length > 0) {
          return this.generateTargetedQuestions(
            sourceText, 
            progress.overall_weak_topics,
            config
          );
        }
      }

      // Generate standard questions
      return this.generateStandardQuestions(sourceText, config);
    } catch (error) {
      console.error('Error generating adaptive questions:', error);
      return this.generateStandardQuestions(sourceText, config);
    }
  }

  // Generate targeted questions for weak topics
  private async generateTargetedQuestions(
    sourceText: string,
    weakTopics: string[],
    config: AdaptiveTestConfig
  ): Promise<string[]> {
    // Import gemini service from the unified platform
    const { generateVerbalTestQuestions } = await import('./geminiService');
    
    const enhancedPrompt = `
    Focus specifically on these weak areas: ${weakTopics.join(', ')}.
    Generate ${config.questionCount} targeted questions that help the student improve in these areas.
    ${config.difficultyAdjustment === 'harder' ? 'Make the questions more challenging.' : ''}
    ${config.difficultyAdjustment === 'easier' ? 'Make the questions more accessible.' : ''}
    
    Source material: ${sourceText}
    `;

    return generateVerbalTestQuestions(enhancedPrompt);
  }

  // Generate standard questions
  private async generateStandardQuestions(
    sourceText: string,
    config: AdaptiveTestConfig
  ): Promise<string[]> {
    const { generateVerbalTestQuestions } = await import('./geminiService');
    
    const prompt = `
    Generate ${config.questionCount} open-ended questions for a verbal test.
    ${config.difficultyAdjustment === 'harder' ? 'Make the questions more challenging and analytical.' : ''}
    ${config.difficultyAdjustment === 'easier' ? 'Make the questions more straightforward and accessible.' : ''}
    
    Source material: ${sourceText}
    `;

    return generateVerbalTestQuestions(prompt);
  }

  // Analyze test results and update progress
  async analyzeAndTrackProgress(
    userId: string,
    projectId: string,
    sourceId: string,
    materialId: string | null,
    questions: string[],
    transcript: VerbalTestTranscriptEntry[],
    isRetake: boolean = false,
    previousSessionId?: string
  ): Promise<LearningAnalysisReport> {
    try {
      // Import analysis function
      const { analyzeTestResults } = await import('./geminiService');
      
      // Get source content for analysis
      const { data: sourceData } = await supabase
        .from('content_sources')
        .select('content, title')
        .eq('id', sourceId)
        .single();

      if (!sourceData) throw new Error('Source content not found');

      // Analyze the test results
      const analysis = await analyzeTestResults(transcript, sourceData.content);

      // Save assessment result
      const assessmentData = {
        user_id: userId,
        project_id: projectId,
        source_id: sourceId,
        material_id: materialId,
        type: isRetake ? 'targeted_verbal_test' : 'verbal_test',
        questions,
        answers: transcript,
        analysis,
        score: analysis.overallScore,
        weak_topics: analysis.weakTopics || [],
        improvement_areas: [],
        is_retake: isRetake,
        previous_session_id: previousSessionId,
        session_metadata: {
          question_count: questions.length,
          source_title: sourceData.title,
          test_duration: null // Could be calculated if needed
        }
      };

      const { error: assessmentError } = await supabase
        .from('assessment_results')
        .insert(assessmentData)
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      // Update user progress
      await this.updateProgress(
        userId, 
        projectId, 
        sourceId
      );

      return analysis;
    } catch (error) {
      console.error('Error analyzing and tracking progress:', error);
      throw error;
    }
  }

  // Update user progress based on latest assessment
  async updateProgress(
    userId: string,
    projectId: string,
    sourceId: string
  ): Promise<void> {
    try {
      // Get existing progress
      let progress = await this.getUserProgress(userId, sourceId, projectId);
      
      // Get all assessments for this user/source to calculate metrics
      const allAssessments = await this.getUserAssessmentHistory(userId, sourceId, projectId);
      
      const scores = allAssessments.map(a => a.score).filter(s => s !== null) as number[];
      const weakTopics = this.analyzeOverallWeakTopics(allAssessments);
      const improvementAreas = this.analyzeImprovementAreas(allAssessments);
      
      const progressData = {
        user_id: userId,
        project_id: projectId,
        source_id: sourceId,
        content_type: 'verbal_test',
        overall_weak_topics: weakTopics,
        improvement_areas: improvementAreas,
        total_sessions: allAssessments.length,
        average_score: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        best_score: scores.length > 0 ? Math.max(...scores) : 0,
        recent_trend: this.calculateTrend(scores.slice(-3)),
        last_session_date: new Date().toISOString()
      };

      if (progress) {
        // Update existing progress
        const { error } = await supabase
          .from('user_progress')
          .update(progressData)
          .eq('id', progress.id);
        
        if (error) throw error;
      } else {
        // Create new progress record
        const { error } = await supabase
          .from('user_progress')
          .insert(progressData);
        
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating user progress:', error);
      // Don't throw here to avoid breaking the main flow
    }
  }

  // Analyze overall weak topics across multiple sessions
  private analyzeOverallWeakTopics(assessments: AssessmentResult[]): string[] {
    const topicCounts: Map<string, number> = new Map();
    
    // Look at recent assessments (last 5)
    const recentAssessments = assessments.slice(0, 5);
    
    recentAssessments.forEach(assessment => {
      if (assessment.weak_topics) {
        assessment.weak_topics.forEach(topic => {
          topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
        });
      }
    });

    // Return topics that appear in 2+ recent sessions
    return Array.from(topicCounts.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // Top 10 weak topics
      .map(([topic, _]) => topic);
  }

  // Analyze improvement areas by comparing sessions
  private analyzeImprovementAreas(assessments: AssessmentResult[]): string[] {
    if (assessments.length < 2) return [];

    const current = assessments[0];
    const previous = assessments[1];
    
    if (!current.weak_topics || !previous.weak_topics) return [];

    const previousWeak = new Set(previous.weak_topics);
    const currentWeak = new Set(current.weak_topics);
    
    // Topics that were weak before but not now
    const improvedTopics: string[] = [];
    previousWeak.forEach(topic => {
      if (!currentWeak.has(topic)) {
        improvedTopics.push(topic);
      }
    });

    return improvedTopics;
  }

  // Calculate performance trend
  private calculateTrend(scores: number[]): number {
    if (scores.length < 2) return 0;
    
    let trend = 0;
    for (let i = 1; i < scores.length; i++) {
      trend += scores[i] - scores[i - 1];
    }
    
    return trend / (scores.length - 1);
  }

  // Get study recommendations based on progress
  async getStudyRecommendations(
    userId: string,
    sourceId: string,
    projectId: string
  ): Promise<string[]> {
    const progress = await this.getUserProgress(userId, sourceId, projectId);
    const recommendations: string[] = [];

    if (!progress) {
      recommendations.push('Take your first assessment to get personalized recommendations.');
      return recommendations;
    }

    if (progress.overall_weak_topics.length > 0) {
      recommendations.push(
        `Focus on these persistent weak areas: ${progress.overall_weak_topics.slice(0, 3).join(', ')}`
      );
    }

    if (progress.improvement_areas.length > 0) {
      recommendations.push(
        `Great improvement in: ${progress.improvement_areas.slice(0, 2).join(', ')}. Keep it up!`
      );
    }

    if (progress.recent_trend > 5) {
      recommendations.push('📈 Your performance is trending upward! Continue practicing regularly.');
    } else if (progress.recent_trend < -5) {
      recommendations.push('📚 Consider reviewing the material before your next assessment.');
    }

    if (progress.total_sessions >= 3 && progress.best_score < 70) {
      recommendations.push('💡 Try using the Deep Dive content to strengthen your understanding.');
    }

    if (progress.total_sessions >= 5 && progress.average_score > 80) {
      recommendations.push('🎯 You\'re doing great! Try the harder difficulty setting for more challenge.');
    }

    return recommendations.length > 0 ? recommendations : ['Keep practicing to track your progress!'];
  }

  // Get test statistics for dashboard
  async getTestStatistics(
    userId: string,
    sourceId?: string,
    projectId?: string
  ): Promise<{
    totalTests: number;
    averageScore: number;
    bestScore: number;
    improvementRate: number;
    weakTopics: string[];
    improvementAreas: string[];
    lastTestDate?: string;
    recentTrend: number;
  }> {
    const assessments = await this.getUserAssessmentHistory(userId, sourceId, projectId);
    
    if (assessments.length === 0) {
      return {
        totalTests: 0,
        averageScore: 0,
        bestScore: 0,
        improvementRate: 0,
        weakTopics: [],
        improvementAreas: [],
        recentTrend: 0
      };
    }

    const scores = assessments.map(a => a.score).filter(s => s !== null) as number[];
    const weakTopics = this.analyzeOverallWeakTopics(assessments);
    const improvementAreas = this.analyzeImprovementAreas(assessments);

    return {
      totalTests: assessments.length,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      bestScore: Math.max(...scores),
      improvementRate: this.calculateTrend(scores),
      weakTopics,
      improvementAreas,
      lastTestDate: assessments[0]?.taken_at,
      recentTrend: this.calculateTrend(scores.slice(-3))
    };
  }
}

// Singleton instance
export const adaptiveTestService = new AdaptiveTestService();
export default adaptiveTestService;