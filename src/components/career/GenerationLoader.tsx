import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';

const GENERATION_MESSAGES = [
  'Analyzing your career goals...',
  'Curating learning resources...',
  'Designing skill progression path...',
  'Creating portfolio projects...',
  'Planning internship strategy...',
  'Building your timeline...',
  'Finalizing your roadmap...',
];

interface GenerationLoaderProps {
  onComplete: () => void;
}

const GenerationLoader: React.FC<GenerationLoaderProps> = ({ onComplete }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % GENERATION_MESSAGES.length);
    }, 2500);
    
    const slowMessageTimer = setTimeout(() => {
      setShowSlowMessage(true);
    }, 30000); // 30 seconds

    return () => {
      clearInterval(messageInterval);
      clearTimeout(slowMessageTimer);
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 text-center py-12">
      <LoadingSpinner size="lg" />
      
      <h2 className="text-3xl font-bold text-gray-900 mb-4 mt-8">
        Building Your Personalized Roadmap...
      </h2>
      
      <div className="h-8 mb-4">
        <p 
          key={messageIndex} 
          className="text-xl text-gray-600 animate-fade-in"
        >
          {GENERATION_MESSAGES[messageIndex]}
        </p>
      </div>
      
      {showSlowMessage && (
        <p className="mt-4 text-sm text-gray-500 animate-fade-in">
          This is a complex roadmap! The AI is working hard... this might take a minute or two.
        </p>
      )}
      
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default GenerationLoader;
