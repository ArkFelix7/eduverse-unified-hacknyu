import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import CareerSelector from './CareerSelector';
import PreferencesForm from './PreferencesForm';
import SkillAssessor from './SkillAssessor';
import GenerationLoader from './GenerationLoader';
import RoadmapDashboard from './RoadmapDashboard';
import { generateRoadmap } from '../../services/geminiService';
import CareerPlanService from '../../services/careerPlanService';
import type { 
  CareerPlanStep, 
  UserPreferences, 
  SkillAssessmentAnswer, 
  CareerPlan 
} from '../../types';

const CareerPlanner: React.FC = () => {
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState<CareerPlanStep>('CAREER_SELECTION');
  
  // Form state
  const [careerGoal, setCareerGoal] = useState('');
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [assessmentAnswers, setAssessmentAnswers] = useState<SkillAssessmentAnswer[]>([]);
  const [generatedPlan, setGeneratedPlan] = useState<CareerPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step handlers
  const handleCareerSelected = (career: string) => {
    setCareerGoal(career);
    setCurrentStep('PREFERENCES');
  };

  const handlePreferencesSet = (userPreferences: UserPreferences) => {
    setPreferences(userPreferences);
    setCurrentStep('SKILL_ASSESSMENT');
  };

  const handleAssessmentComplete = async (answers: SkillAssessmentAnswer[]) => {
    setAssessmentAnswers(answers);
    setCurrentStep('GENERATING');
    
    if (!preferences || !user) {
      setError('Missing required data for roadmap generation');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      
      // Generate roadmap using Gemini
      const roadmapData = await generateRoadmap(preferences, answers);
      
      // Save to database
      const careerPlan = await CareerPlanService.createCareerPlan(
        user.id,
        preferences,
        answers,
        roadmapData
      );
      
      setGeneratedPlan(careerPlan);
      setCurrentStep('DASHBOARD');
      
    } catch (err) {
      console.error('Failed to generate roadmap:', err);
      setError('Failed to generate your career roadmap. Please try again.');
      setCurrentStep('SKILL_ASSESSMENT');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateProgress = async (itemId: string, completed: boolean) => {
    if (!generatedPlan) return;
    
    try {
      // Update progress in database
      console.log('Progress update:', { itemId, completed });
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  const handleBackToStep = (step: CareerPlanStep) => {
    setCurrentStep(step);
    setError(null);
  };

  const handleStartOver = () => {
    setCurrentStep('CAREER_SELECTION');
    setCareerGoal('');
    setPreferences(null);
    setAssessmentAnswers([]);
    setGeneratedPlan(null);
    setError(null);
  };

  // Render current step
  switch (currentStep) {
    case 'CAREER_SELECTION':
      return (
        <CareerSelector 
          onCareerSelected={handleCareerSelected}
        />
      );

    case 'PREFERENCES':
      return (
        <PreferencesForm 
          careerGoal={careerGoal}
          onPreferencesSet={handlePreferencesSet}
          onBack={() => handleBackToStep('CAREER_SELECTION')}
        />
      );

    case 'SKILL_ASSESSMENT':
      return (
        <div>
          {error && (
            <div className="max-w-2xl mx-auto px-4 mb-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="text-red-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Generation Failed</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <SkillAssessor 
            careerGoal={careerGoal}
            skillLevel={preferences?.skillLevel || 'Beginner'}
            onAssessmentComplete={handleAssessmentComplete}
            onBack={() => handleBackToStep('PREFERENCES')}
          />
        </div>
      );

    case 'GENERATING':
      return (
        <GenerationLoader 
          onComplete={() => setCurrentStep('DASHBOARD')}
        />
      );

    case 'DASHBOARD':
      if (!generatedPlan) {
        return (
          <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Plan Available</h3>
              <p className="text-gray-600 mb-4">Something went wrong. Please try creating a new plan.</p>
              <button 
                onClick={handleStartOver}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Start Over
              </button>
            </div>
          </div>
        );
      }
      
      return (
        <RoadmapDashboard 
          careerPlan={generatedPlan}
          onBackToPlans={handleStartOver}
          onUpdateProgress={handleUpdateProgress}
        />
      );

    default:
      return (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Invalid Step</h3>
            <p className="text-gray-600 mb-4">Something went wrong with the navigation.</p>
            <button 
              onClick={handleStartOver}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Start Over
            </button>
          </div>
        </div>
      );
  }
};

export default CareerPlanner;
