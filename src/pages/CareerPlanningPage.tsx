import React from 'react';
import CareerPlanner from '../components/career/CareerPlanner';

const CareerPlanningPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          AI Career Roadmap Generator
        </h1>
        <p className="mt-2 text-gray-600">
          Get personalized career guidance and skill development roadmaps powered by AI.
        </p>
      </div>

      <CareerPlanner />
    </div>
  );
};

export default CareerPlanningPage;