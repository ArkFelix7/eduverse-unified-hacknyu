import React, { useState } from 'react';
import type { UserPreferences } from '../../types';
import Button from '../ui/Button';

const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;
const TIME_COMMITMENTS = ['5-10 hours/week', '10-15 hours/week', '15-20 hours/week', '20+ hours/week'] as const;
const LEARNING_STYLES = ['Project-First', 'Theory-First', 'Balanced', 'Mentor-Guided'] as const;
const LEARNING_MEDIUMS = ['Text (articles/books)', 'Video', 'Interactive (courses)', 'Mixed'] as const;
const TIMELINES = ['3 months', '6 months', '1 year', '2 years'] as const;

interface PreferencesFormProps {
  careerGoal: string;
  onPreferencesSet: (preferences: UserPreferences) => void;
  onBack: () => void;
}

const RadioGroup = <T extends string>({ 
  label, 
  options, 
  selected, 
  onChange 
}: { 
  label: string; 
  options: readonly T[]; 
  selected: T; 
  onChange: (value: T) => void;
}) => (
  <div className="mb-6">
    <label className="block text-lg font-semibold text-gray-800 mb-3">{label}</label>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`px-4 py-3 rounded-lg text-sm font-medium border-2 transition-all duration-200 ${
            selected === option 
              ? 'bg-blue-500 border-blue-500 text-white' 
              : 'bg-white border-gray-300 hover:border-blue-400 text-gray-700'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  </div>
);

const PreferencesForm: React.FC<PreferencesFormProps> = ({ 
  careerGoal, 
  onPreferencesSet, 
  onBack 
}) => {
  const [skillLevel, setSkillLevel] = useState<typeof SKILL_LEVELS[number]>(SKILL_LEVELS[0]);
  const [timeCommitment, setTimeCommitment] = useState<typeof TIME_COMMITMENTS[number]>(TIME_COMMITMENTS[0]);
  const [learningStyle, setLearningStyle] = useState<typeof LEARNING_STYLES[number]>(LEARNING_STYLES[0]);
  const [learningMedium, setLearningMedium] = useState<typeof LEARNING_MEDIUMS[number]>(LEARNING_MEDIUMS[0]);
  const [timeline, setTimeline] = useState<typeof TIMELINES[number]>(TIMELINES[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPreferencesSet({
      careerGoal,
      skillLevel,
      timeCommitment,
      learningStyle,
      learningMedium,
      timeline,
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 font-medium mb-4"
        >
          ← Back
        </button>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Configure Your Journey</h2>
        <p className="text-gray-600">
          Goal: <span className="font-semibold text-gray-900">{careerGoal}</span>
        </p>
        <p className="text-gray-500 mt-2">Help us tailor the perfect roadmap for you</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 p-8 rounded-lg shadow-sm">
        <RadioGroup 
          label="What is your current skill level?" 
          options={SKILL_LEVELS} 
          selected={skillLevel} 
          onChange={setSkillLevel} 
        />
        <RadioGroup 
          label="How much time can you commit per week?" 
          options={TIME_COMMITMENTS} 
          selected={timeCommitment} 
          onChange={setTimeCommitment} 
        />
        <RadioGroup 
          label="What's your preferred learning style?" 
          options={LEARNING_STYLES} 
          selected={learningStyle} 
          onChange={setLearningStyle} 
        />
        <RadioGroup 
          label="What's your preferred learning medium?" 
          options={LEARNING_MEDIUMS} 
          selected={learningMedium} 
          onChange={setLearningMedium} 
        />
        <RadioGroup 
          label="What's your target timeline?" 
          options={TIMELINES} 
          selected={timeline} 
          onChange={setTimeline} 
        />
        
        <div className="mt-8 text-center">
          <Button type="submit" size="lg">
            Next: Skill Assessment →
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PreferencesForm;
