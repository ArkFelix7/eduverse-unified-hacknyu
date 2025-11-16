import React, { useState } from 'react';
import type { CareerPlan, RoadmapData } from '../../types';
import Button from '../ui/Button';

interface RoadmapDashboardProps {
  careerPlan: CareerPlan;
  onBackToPlans: () => void;
  onUpdateProgress?: (itemId: string, completed: boolean) => void;
}

const RoadmapDashboard: React.FC<RoadmapDashboardProps> = ({
  careerPlan,
  onBackToPlans,
  onUpdateProgress
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  
  const roadmapData = careerPlan.roadmap_data as RoadmapData;

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleTaskToggle = (taskIdentifier: string) => {
    const newValue = !completedTasks[taskIdentifier];
    setCompletedTasks(prev => ({ ...prev, [taskIdentifier]: newValue }));
    onUpdateProgress?.(taskIdentifier, newValue);
  };

  const exportToPDF = () => {
    window.print();
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'skills', label: 'Skills' },
    { id: 'projects', label: 'Projects' },
    { id: 'resources', label: 'Resources' },
    { id: 'internships', label: 'Internships' }
  ];

  const EmptyState: React.FC<{ message: string }> = ({ message }) => (
    <p className="text-gray-500 italic text-sm p-2">{message}</p>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {roadmapData.careerTitle}
            </h1>
            <p className="text-gray-600 mt-2">{roadmapData.shortSummary}</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-sm text-gray-500">Progress</div>
              <div className="text-2xl font-bold text-blue-600">
                {careerPlan.overall_progress_percentage || 0}%
              </div>
            </div>
            <div className="w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="#e5e7eb"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="#3b82f6"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - (careerPlan.overall_progress_percentage || 0) / 100)}`}
                  className="transition-all duration-300"
                />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex space-x-6 text-sm text-gray-600">
            <span><strong>Timeline:</strong> {careerPlan.timeline}</span>
            <span><strong>Commitment:</strong> {careerPlan.time_commitment}</span>
            <span><strong>Style:</strong> {careerPlan.learning_style}</span>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={exportToPDF} size="sm">
              Export PDF
            </Button>
            <Button variant="outline" onClick={onBackToPlans} size="sm">
              Back to Plans
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Required Skills */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Core Skills Required
              </h3>
              <div className="space-y-3">
                {(roadmapData.requiredSkills || []).length > 0 ? (
                  roadmapData.requiredSkills.map((skill, index) => (
                    <div key={index} className="p-3 bg-blue-50 rounded-lg">
                      <div className="font-medium text-blue-900">{skill.skill}</div>
                      <div className="text-sm text-blue-700 mt-1">{skill.description}</div>
                    </div>
                  ))
                ) : (
                  <EmptyState message="No required skills specified." />
                )}
              </div>
            </div>

            {/* Progress Overview */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Learning Progress
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Overall Progress</span>
                  <span className="text-sm font-bold text-blue-600">
                    {careerPlan.overall_progress_percentage || 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${careerPlan.overall_progress_percentage || 0}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Object.values(completedTasks).filter(Boolean).length}
                    </div>
                    <div className="text-sm text-gray-500">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {(roadmapData.weeklyPlan?.reduce((acc, week) => acc + (week.tasks?.length || 0), 0) || 0) - Object.values(completedTasks).filter(Boolean).length}
                    </div>
                    <div className="text-sm text-gray-500">Remaining</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            {/* Monthly Timeline */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Monthly Milestones
              </h3>
              <div className="space-y-4">
                {(roadmapData.monthlyTimeline || []).length > 0 ? (
                  roadmapData.monthlyTimeline.map((month) => (
                    <div key={month.month} className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-700">M{month.month}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{month.milestone}</h4>
                        <div className="flex flex-wrap gap-2">
                          {(month.focus || []).map((focus, index) => (
                            <span key={index} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                              {focus}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState message="No monthly milestones available." />
                )}
              </div>
            </div>

            {/* Weekly Plan */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Weekly Learning Plan
                </h3>
                <button
                  onClick={() => toggleSection('weeklyPlan')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {expandedSections.weeklyPlan ? 'Collapse' : 'Expand All'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(roadmapData.weeklyPlan || [])
                  .slice(0, expandedSections.weeklyPlan ? undefined : 6)
                  .map((week) => (
                    <div key={week.week} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">Week {week.week}</h4>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          Goal
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{week.goal}</p>
                      <div className="space-y-1">
                        {(week.tasks || []).map((task, taskIndex) => {
                          const taskId = `week_${week.week}_task_${taskIndex}`;
                          return (
                            <div key={taskIndex} className="flex items-start space-x-2">
                              <input 
                                type="checkbox" 
                                id={taskId}
                                checked={!!completedTasks[taskId]}
                                className="mt-1 w-3 h-3 text-blue-600 rounded" 
                                onChange={() => handleTaskToggle(taskId)}
                              />
                              <label 
                                htmlFor={taskId}
                                className={`text-xs text-gray-700 cursor-pointer ${
                                  completedTasks[taskId] ? 'line-through text-gray-500' : ''
                                }`}
                              >
                                {task}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Skills Tab */}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
              <div key={level} className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                  {level} Skills
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(roadmapData.skillBreakdown?.[level] || []).length > 0 ? (
                    roadmapData.skillBreakdown[level].map((skill, index) => (
                      <div key={index} className={`p-4 rounded-lg border ${
                        level === 'beginner' ? 'bg-green-50 border-green-200' :
                        level === 'intermediate' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-red-50 border-red-200'
                      }`}>
                        <div className={`font-medium mb-2 ${
                          level === 'beginner' ? 'text-green-900' :
                          level === 'intermediate' ? 'text-yellow-900' :
                          'text-red-900'
                        }`}>
                          {skill.skill}
                        </div>
                        <div className={`text-sm ${
                          level === 'beginner' ? 'text-green-700' :
                          level === 'intermediate' ? 'text-yellow-700' :
                          'text-red-700'
                        }`}>
                          {skill.description}
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState message={`No ${level} skills listed.`} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
              <div key={level} className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                  {level} Projects
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {(roadmapData.projects?.[level] || []).length > 0 ? (
                    roadmapData.projects[level].map((project, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-6">
                        <h4 className="font-semibold text-gray-900 mb-2">{project.title}</h4>
                        <p className="text-gray-600 text-sm mb-4">{project.description}</p>
                        
                        {project.requirements && project.requirements.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-gray-800 mb-2">Requirements:</h5>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {project.requirements.map((req, reqIndex) => (
                                <li key={reqIndex} className="flex items-start space-x-2">
                                  <span className="text-gray-400 mt-1">•</span>
                                  <span>{req}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="bg-gray-50 rounded-lg p-3">
                          <h5 className="text-sm font-medium text-gray-800 mb-1">Expected Outcome:</h5>
                          <p className="text-sm text-gray-600">{project.outcome}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState message={`No ${level} projects suggested.`} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <div className="space-y-6">
            {/* Courses */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Online Courses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(roadmapData.resources?.courses || []).length > 0 ? (
                  roadmapData.resources.courses.map((course, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">{course.title}</h4>
                      <p className="text-sm text-gray-600 mb-3">Platform: {course.platform}</p>
                      <a 
                        href={course.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Course
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  ))
                ) : (
                  <EmptyState message="No courses listed." />
                )}
              </div>
            </div>

            {/* YouTube Channels */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                YouTube Channels
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(roadmapData.resources?.youtube || []).length > 0 ? (
                  roadmapData.resources.youtube.map((channel, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">{channel.channel}</h4>
                      <p className="text-sm text-gray-600 mb-3">{channel.description}</p>
                      <a 
                        href={channel.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Watch Channel
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  ))
                ) : (
                  <EmptyState message="No YouTube resources listed." />
                )}
              </div>
            </div>

            {/* Books */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recommended Books
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(roadmapData.resources?.books || []).length > 0 ? (
                  roadmapData.resources.books.map((book, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-1">{book.title}</h4>
                      <p className="text-sm text-gray-600">by {book.author}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState message="No books listed." />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Internships Tab */}
        {activeTab === 'internships' && (
          <div className="space-y-6">
            {/* Requirements */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                What Employers Look For
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(roadmapData.internshipGuide?.requirements || []).length > 0 ? (
                  roadmapData.internshipGuide.requirements.map((requirement, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                      <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-green-800">{requirement}</span>
                    </div>
                  ))
                ) : (
                  <EmptyState message="No requirements listed." />
                )}
              </div>
            </div>

            {/* Interview Preparation */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Interview Preparation Plan
              </h3>
              <div className="space-y-4">
                {(roadmapData.internshipGuide?.interviewPlan || []).length > 0 ? (
                  roadmapData.internshipGuide.interviewPlan.map((topic, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">{topic.topic}</h4>
                      <p className="text-sm text-gray-600">{topic.focus}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState message="No interview plan provided." />
                )}
              </div>
            </div>

            {/* Resume Tips */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Resume Optimization Tips
              </h3>
              <div className="space-y-3">
                {(roadmapData.internshipGuide?.resumeTips || []).length > 0 ? (
                  roadmapData.internshipGuide.resumeTips.map((tip, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                      <span className="w-6 h-6 bg-yellow-200 text-yellow-800 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-sm text-yellow-800">{tip}</span>
                    </div>
                  ))
                ) : (
                  <EmptyState message="No resume tips provided." />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoadmapDashboard;
