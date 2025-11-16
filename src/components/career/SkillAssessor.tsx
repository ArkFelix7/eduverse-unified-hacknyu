import React, { useState, useEffect } from 'react';
import type { SkillAssessmentQuestion, SkillAssessmentAnswer } from '../../types';
import { generateSkillAssessmentQuestions } from '../../services/geminiService';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

interface SkillAssessorProps {
  careerGoal: string;
  skillLevel: string;
  onAssessmentComplete: (answers: SkillAssessmentAnswer[]) => void;
  onBack: () => void;
}

const SkillAssessor: React.FC<SkillAssessorProps> = ({ 
  careerGoal, 
  skillLevel, 
  onAssessmentComplete, 
  onBack 
}) => {
  const [questions, setQuestions] = useState<SkillAssessmentQuestion[]>([]);
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedQuestions = await generateSkillAssessmentQuestions(careerGoal, skillLevel);
        setQuestions(fetchedQuestions);
      } catch (e) {
        setError('Could not generate assessment questions. Please try again.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuestions();
  }, [careerGoal, skillLevel]);

  const handleAnswerChange = (question: string, answer: string) => {
    setCurrentAnswers(prev => ({ ...prev, [question]: answer }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedAnswers: SkillAssessmentAnswer[] = questions.map(q => ({
      question: q.question,
      answer: currentAnswers[q.question] || 'Not answered',
    }));
    onAssessmentComplete(formattedAnswers);
  };
  
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 text-center py-12">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-lg text-gray-600">
          Generating personalized questions to fine-tune your roadmap...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-xl font-bold text-red-800 mb-2">An Error Occurred</h3>
          <p className="text-red-600">{error}</p>
          <div className="mt-4 space-x-3">
            <Button onClick={onBack} variant="outline">
              Go Back
            </Button>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 font-medium mb-4"
        >
          ← Back
        </button>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Quick Skill Check</h2>
        <p className="text-gray-600">
          This helps us understand your starting point better. There are no wrong answers!
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {questions.map((q, index) => (
          <div key={index} className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
            <p className="font-semibold text-lg mb-4 text-gray-900">
              {index + 1}. {q.question}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {q.options.map((option, optIndex) => (
                <label
                  key={optIndex}
                  className={`flex items-center p-3 rounded-md border-2 cursor-pointer transition-all ${
                    currentAnswers[q.question] === option 
                      ? 'bg-blue-50 border-blue-500' 
                      : 'bg-white border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${index}`}
                    value={option}
                    checked={currentAnswers[q.question] === option}
                    onChange={() => handleAnswerChange(q.question, option)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        
        <div className="text-center pt-4">
          <Button
            type="submit"
            disabled={Object.keys(currentAnswers).length !== questions.length}
            size="lg"
          >
            Generate My Roadmap!
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SkillAssessor;
