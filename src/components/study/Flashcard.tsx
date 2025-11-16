import React, { useState } from 'react';
import type { Flashcard as FlashcardType } from '../../types';

interface FlashcardProps {
  card: FlashcardType;
  className?: string;
}

const Flashcard: React.FC<FlashcardProps> = ({ card, className = '' }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className={`relative w-full h-64 cursor-pointer group [perspective:1000px] ${className}`}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div 
        className={`absolute inset-0 w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${
          isFlipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        {/* Front Side */}
        <div 
          className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg flex flex-col justify-center items-center text-white p-6 [backface-visibility:hidden]"
        >
          <div className="text-center">
            <div className="text-sm font-medium text-blue-100 mb-2">
              {card.tag}
            </div>
            <h3 className="text-lg font-semibold leading-tight">
              {card.question}
            </h3>
          </div>
          <div className="absolute bottom-4 right-4 text-blue-100 text-sm group-hover:text-blue-50 transition-colors">
            🔄 Click to flip
          </div>
        </div>

        {/* Back Side */}
        <div 
          className="absolute inset-0 w-full h-full bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg flex flex-col justify-center items-center text-white p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          <div className="text-center">
            <div className="text-sm font-medium text-green-100 mb-2">
              Answer
            </div>
            <p className="text-lg leading-relaxed">
              {card.answer}
            </p>
          </div>
          <div className="absolute bottom-4 right-4 text-green-100 text-sm group-hover:text-green-50 transition-colors">
            🔄 Click to flip
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;