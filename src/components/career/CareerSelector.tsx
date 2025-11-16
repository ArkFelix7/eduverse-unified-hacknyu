import React, { useState } from 'react';
import type { CareerPlanStep } from '../../types';

const CAREER_PATHS = [
  'Software Engineer',
  'Data Scientist',
  'Product Manager',
  'UX/UI Designer',
  'DevOps Engineer',
  'Cybersecurity Analyst',
  'Machine Learning Engineer',
  'Full Stack Developer',
  'Mobile App Developer',
] as const;

interface CareerSelectorProps {
  onCareerSelected: (career: string) => void;
}

const CareerSelector: React.FC<CareerSelectorProps> = ({ onCareerSelected }) => {
  const [customGoal, setCustomGoal] = useState('');

  const handleSelect = (goal: string) => {
    if (goal.trim()) {
      onCareerSelected(goal);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
          What's Your Dream Career?
        </h2>
        <p className="text-lg text-gray-600">
          Let's build your personalized roadmap to success
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {CAREER_PATHS.map((path) => (
          <button
            key={path}
            onClick={() => handleSelect(path)}
            className="p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            <span className="text-lg font-semibold text-gray-900">{path}</span>
          </button>
        ))}
      </div>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-gray-50 px-4 text-sm font-medium text-gray-500">OR</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        <p className="text-lg text-gray-700 mb-4 text-center">Enter a custom career goal:</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={customGoal}
            onChange={(e) => setCustomGoal(e.target.value)}
            placeholder='"I want to be a quantum computing researcher"'
            className="flex-grow bg-white border border-gray-300 rounded-md px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={() => handleSelect(customGoal)}
            disabled={!customGoal.trim()}
            className="bg-blue-600 text-white font-bold py-3 px-6 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Let's Go →
          </button>
        </div>
      </div>
    </div>
  );
};

export default CareerSelector;
