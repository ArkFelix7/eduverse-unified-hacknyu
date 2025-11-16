import React, { useState } from 'react';
import type { QuizQuestion } from '../../types';
import Button from '../ui/Button';

interface QuizProps {
  questions: QuizQuestion[];
  onComplete?: (score: number, answers: any[]) => void;
}

const Quiz: React.FC<QuizProps> = ({ questions, onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);

  if (!questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-4">📝</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Quiz Available</h3>
        <p className="text-gray-600">Generate quiz content first to start practicing.</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: answer
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      finishQuiz();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const finishQuiz = () => {
    setQuizCompleted(true);
    setShowResults(true);
    
    // Calculate score
    let correctAnswers = 0;
    const results = questions.map((question, index) => {
      const userAnswer = selectedAnswers[index];
      const isCorrect = userAnswer === question.correctAnswer;
      if (isCorrect) correctAnswers++;
      
      return {
        question: question.question,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation
      };
    });
    
    const score = (correctAnswers / questions.length) * 100;
    if (onComplete) {
      onComplete(score, results);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setQuizCompleted(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (showResults) {
    const correctAnswers = Object.keys(selectedAnswers).filter(
      (index) => selectedAnswers[parseInt(index)] === questions[parseInt(index)].correctAnswer
    ).length;
    const score = (correctAnswers / questions.length) * 100;

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Quiz Results</h2>
            <div className={`text-6xl font-bold mb-2 ${getScoreColor(score)}`}>
              {Math.round(score)}%
            </div>
            <p className="text-lg text-gray-600">
              You got {correctAnswers} out of {questions.length} questions correct!
            </p>
          </div>

          <div className="space-y-6">
            {questions.map((question, index) => {
              const userAnswer = selectedAnswers[index];
              const isCorrect = userAnswer === question.correctAnswer;
              
              return (
                <div key={index} className={`border rounded-lg p-4 ${
                  isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                  <h3 className="font-semibold mb-2">Question {index + 1}: {question.question}</h3>
                  <div className="grid grid-cols-1 gap-2 mb-3">
                    {question.options.map((option, optIndex) => (
                      <div key={optIndex} className={`p-2 rounded ${
                        option === question.correctAnswer ? 'bg-green-100 border border-green-300' :
                        option === userAnswer && !isCorrect ? 'bg-red-100 border border-red-300' :
                        'bg-gray-50'
                      }`}>
                        <span className="text-sm">
                          {option === question.correctAnswer && '✅ '}
                          {option === userAnswer && !isCorrect && '❌ '}
                          {option}
                        </span>
                      </div>
                    ))}
                  </div>
                  {question.explanation && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm text-blue-800">
                        <strong>Explanation:</strong> {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <Button onClick={resetQuiz} className="px-6 py-2">
              Take Quiz Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-sm font-medium text-gray-600">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6">{currentQuestion.question}</h2>
        
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <label key={index} className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name={`question-${currentQuestionIndex}`}
                value={option}
                checked={selectedAnswers[currentQuestionIndex] === option}
                onChange={() => handleAnswerSelect(option)}
                className="mr-4 h-4 w-4 text-blue-600"
              />
              <span className="text-lg">{option}</span>
            </label>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <Button 
            onClick={handlePrevious} 
            variant="outline"
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          
          <div className="flex space-x-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-8 h-8 rounded-full text-sm font-medium ${
                  index === currentQuestionIndex
                    ? 'bg-blue-500 text-white'
                    : selectedAnswers[index]
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          
          <Button 
            onClick={handleNext}
            disabled={!selectedAnswers[currentQuestionIndex]}
          >
            {currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Quiz;