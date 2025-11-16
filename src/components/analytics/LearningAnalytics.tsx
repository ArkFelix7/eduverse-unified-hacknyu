import React, { useState, useEffect } from 'react';
import { databaseService } from '../../services/databaseService';
import LoadingSpinner from '../ui/LoadingSpinner';
import { AssessmentResult, LearningMaterial } from '../../types';

interface LearningAnalyticsProps {
  projectId: string;
  onClose: () => void;
}

interface AnalyticsData {
  totalStudyTime: number;
  completedAssessments: number;
  averageScore: number;
  learningMaterials: LearningMaterial[];
  assessmentResults: AssessmentResult[];
  topicProgress: { [topic: string]: number };
  weeklyProgress: { week: string; score: number; time: number }[];
}

const LearningAnalytics: React.FC<LearningAnalyticsProps> = ({ projectId, onClose }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'performance'>('overview');

  useEffect(() => {
    loadAnalytics();
  }, [projectId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch all relevant data
      const [materials, assessments] = await Promise.all([
        databaseService.getLearningMaterials(projectId),
        databaseService.getAssessmentResults(projectId)
      ]);

      // Calculate analytics
      const completedAssessments = assessments.length;
      const averageScore = assessments.length > 0 
        ? assessments.reduce((sum, a) => sum + (a.score || 0), 0) / assessments.length
        : 0;

      // Mock some additional data for demonstration
      const analyticsData: AnalyticsData = {
        totalStudyTime: materials.length * 15 + assessments.length * 5, // Estimated
        completedAssessments,
        averageScore,
        learningMaterials: materials,
        assessmentResults: assessments,
        topicProgress: {
          'Core Concepts': Math.random() * 100,
          'Applications': Math.random() * 100,
          'Advanced Topics': Math.random() * 100
        },
        weeklyProgress: [
          { week: 'Week 1', score: 65, time: 45 },
          { week: 'Week 2', score: 78, time: 60 },
          { week: 'Week 3', score: 82, time: 55 },
          { week: 'Week 4', score: 89, time: 70 }
        ]
      };

      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          <p className="text-gray-600">Failed to load analytics</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-600 text-white rounded">
            Close
          </button>
        </div>
      </div>
    );
  }

  const StatCard: React.FC<{ title: string; value: string | number; subtitle?: string; icon: string }> = 
    ({ title, value, subtitle, icon }) => (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-600 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-blue-900">{value}</p>
            {subtitle && <p className="text-blue-700 text-xs">{subtitle}</p>}
          </div>
          <div className="text-3xl">{icon}</div>
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">Learning Analytics</h2>
            <p className="text-gray-600">Track your progress and performance</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold p-2"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'progress', label: 'Progress' },
              { key: 'performance', label: 'Performance' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  title="Study Time" 
                  value={`${analytics.totalStudyTime}min`} 
                  subtitle="Total time spent"
                  icon="⏱️"
                />
                <StatCard 
                  title="Materials Created" 
                  value={analytics.learningMaterials.length} 
                  subtitle="AI-generated content"
                  icon="📚"
                />
                <StatCard 
                  title="Assessments" 
                  value={analytics.completedAssessments} 
                  subtitle="Completed"
                  icon="✅"
                />
                <StatCard 
                  title="Average Score" 
                  value={`${Math.round(analytics.averageScore)}%`} 
                  subtitle="Overall performance"
                  icon="🎯"
                />
              </div>

              {/* Recent Materials */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>📖</span>
                  Recent Learning Materials
                </h3>
                <div className="space-y-3">
                  {analytics.learningMaterials.slice(-5).map((material) => (
                    <div key={material.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <span>
                          {material.type === 'summary' && '📄'}
                          {material.type === 'flashcards' && '🗂️'}
                          {material.type === 'quiz' && '❓'}
                          {material.type === 'slides' && '📊'}
                        </span>
                        <div>
                          <p className="font-medium">
                            {material.type.charAt(0).toUpperCase() + material.type.slice(1)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Created {new Date(material.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="space-y-6">
              {/* Topic Progress */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>🎯</span>
                  Topic Progress
                </h3>
                <div className="space-y-4">
                  {Object.entries(analytics.topicProgress).map(([topic, progress]) => (
                    <div key={topic}>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">{topic}</span>
                        <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Progress Chart */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>📈</span>
                  Weekly Progress
                </h3>
                <div className="space-y-4">
                  {analytics.weeklyProgress.map((week) => (
                    <div key={week.week} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="font-medium">{week.week}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">Score: {week.score}%</span>
                        <span className="text-sm text-gray-600">Time: {week.time}min</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Assessment Results */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>🏆</span>
                  Assessment Performance
                </h3>
                {analytics.assessmentResults.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.assessmentResults.map((result) => (
                      <div key={result.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{result.type} Assessment</p>
                          <p className="text-sm text-gray-600">
                            {new Date(result.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            (result.score || 0) >= 80 ? 'text-green-600' :
                            (result.score || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {result.score}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🎯</div>
                    <p>No assessments completed yet</p>
                    <p className="text-sm">Take a quiz to see your performance here</p>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-900">
                  <span>💡</span>
                  Recommendations
                </h3>
                <div className="space-y-3">
                  <div className="bg-white rounded p-3 border border-blue-200">
                    <p className="text-blue-800 font-medium">Focus Areas</p>
                    <p className="text-blue-700 text-sm">
                      Based on your performance, consider reviewing core concepts and practicing with more quizzes.
                    </p>
                  </div>
                  <div className="bg-white rounded p-3 border border-blue-200">
                    <p className="text-blue-800 font-medium">Study Schedule</p>
                    <p className="text-blue-700 text-sm">
                      Try to maintain consistent study sessions of 20-30 minutes for optimal retention.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearningAnalytics;