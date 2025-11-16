import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { databaseService } from '../services/databaseService';
import { testDatabaseConnection, checkTablesExist } from '../services/databaseTest';
import { generateSummary, generateFlashcards, generateQuiz } from '../services/geminiService';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import PdfUploader from '../components/content/PdfUploader';
import LectureRecorder from '../components/lecture/LectureRecorder';
import LectureDashboard from '../components/lecture/LectureDashboard';
import ContentSourceManager from '../components/content/ContentSourceManager';
import TutorChat from '../components/ai/TutorChat';
import StudyWorkspace from '../components/study/StudyWorkspace';
import VoiceTutor from '../components/ai/VoiceTutor';
import LearningAnalytics from '../components/analytics/LearningAnalytics';
import { Project, ContentSource, LearningMaterial, LectureAnalysis, LectureSession } from '../types';
import toast from 'react-hot-toast';

const ProjectPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentSources, setContentSources] = useState<ContentSource[]>([]);
  const [lectureSessions, setLectureSessions] = useState<LectureSession[]>([]);
  const [learningMaterials, setLearningMaterials] = useState<LearningMaterial[]>([]);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'materials'>('overview');
  
  // Modal states
  const [showPdfUploader, setShowPdfUploader] = useState(false);
  const [showLectureRecorder, setShowLectureRecorder] = useState(false);
  const [showContentManager, setShowContentManager] = useState(false);
  const [showTutorChat, setShowTutorChat] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showStudyWorkspace, setShowStudyWorkspace] = useState(false);
  const [showVoiceTutor, setShowVoiceTutor] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<LectureSession | null>(null);

  useEffect(() => {
    if (!projectId || !user) {
      setError('Project ID or user not found');
      setLoading(false);
      return;
    }
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('Project loading timeout');
        setError('Loading timeout - database may not be configured properly');
        setLoading(false);
      }
    }, 8000); // 8 second timeout
    
    loadProject().finally(() => {
      clearTimeout(timeoutId);
    });
    
    return () => clearTimeout(timeoutId);
  }, [projectId, user]);

  const loadProject = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First, test database connection
      console.log('Testing database connection...');
      const dbTest = await testDatabaseConnection();
      if (!dbTest.success) {
        setError(`Database connection failed: ${dbTest.error}`);
        return;
      }
      
      // Check if required tables exist
      console.log('Checking if tables exist...');
      const tableCheck = await checkTablesExist();
      const missingTables = tableCheck.filter(t => !t.exists);
      if (missingTables.length > 0) {
        setError(`Database tables missing: ${missingTables.map(t => t.table).join(', ')}. Please apply the database schema.`);
        return;
      }
      
      // Load project details
      console.log('Loading project data...');
      const projectData = await databaseService.getProject(projectId!);
      if (!projectData) {
        setError('Project not found');
        return;
      }
      
      setProject(projectData);
      
      // Load associated content, lectures, and materials
      const [sources, sessions, materials] = await Promise.all([
        databaseService.getContentSources(projectId!),
        databaseService.getProjectLectureSessions(projectId!),
        databaseService.getLearningMaterials(projectId!)
      ]);
      
      setContentSources(sources);
      setLectureSessions(sessions);
      setLearningMaterials(materials);
      
    } catch (err) {
      console.error('Error loading project:', err);
      setError(`Failed to load project: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!project || contentSources.length === 0) {
      toast.error('Please add some content sources first');
      return;
    }

    try {
      setGeneratingContent(true);
      
      // Get text content from sources (this is simplified)
      const sourceText = contentSources.map(s => s.content || s.title).join('\n\n');
      
      // Generate different types of learning materials
      const [summary, flashcards, quiz] = await Promise.all([
        generateSummary(sourceText),
        generateFlashcards(sourceText),
        generateQuiz(sourceText)
      ]);

      // Save generated materials to database
      const materialPromises = [
        databaseService.createLearningMaterial({
          project_id: project.id,
          type: 'summary',
          content: summary
        }),
        databaseService.createLearningMaterial({
          project_id: project.id,
          type: 'flashcards',
          content: JSON.stringify(flashcards)
        }),
        databaseService.createLearningMaterial({
          project_id: project.id,
          type: 'quiz',
          content: JSON.stringify(quiz)
        })
      ];

      await Promise.all(materialPromises);
      
      // Reload materials
      const updatedMaterials = await databaseService.getLearningMaterials(project.id);
      setLearningMaterials(updatedMaterials);
      
      toast.success('Learning materials generated successfully!');
      
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate learning materials');
    } finally {
      setGeneratingContent(false);
    }
  };

  const handleContentAdded = async (newContent: ContentSource) => {
    setContentSources(prev => [...prev, newContent]);
    toast.success('Content source added successfully!');
  };

  const handleLectureComplete = async (lecture: any, analysis: LectureAnalysis) => {
    // Add lecture to sessions state
    setLectureSessions(prev => [...prev, lecture]);
    
    // Create content source from lecture
    const lectureContent = await databaseService.createContentSource({
      project_id: projectId!,
      title: analysis.title || 'Recorded Lecture',
      type: 'lecture',
      content: lecture.final_transcript || lecture.live_transcript || '',
      metadata: {
        duration: lecture.duration,
        analysis: analysis,
        lecture_id: lecture.id,
        audio_url: lecture.audio_file_url
      }
    });
    
    setContentSources(prev => [...prev, lectureContent]);
    toast.success('Lecture recorded and processed successfully!');
  };

  const getProjectContentText = (): string => {
    return contentSources.map(source => source.content || '').join('\n\n');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading project...</p>
          <p className="mt-2 text-sm text-gray-500">
            Testing database connection and loading project data
          </p>
          <p className="mt-2 text-xs text-gray-400">
            If this takes more than 10 seconds, there may be a database configuration issue
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="text-red-400 text-2xl mr-3">⚠️</div>
            <div>
              <h3 className="text-lg font-medium text-red-800 mb-2">Database Configuration Required</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <div className="bg-red-100 border border-red-300 rounded p-4 mb-4">
                <h4 className="font-medium text-red-800 mb-2">To fix this issue:</h4>
                <ol className="list-decimal list-inside text-sm text-red-700 space-y-1">
                  <li>Go to your Supabase dashboard: <a href="https://supabase.com/dashboard/project/fazcvncilvbtvhgdfsfl" className="underline font-medium" target="_blank" rel="noopener noreferrer">Open Dashboard</a></li>
                  <li>Click on "SQL Editor" in the left sidebar</li>
                  <li>Copy the content from <code className="bg-red-200 px-1 rounded">database/schema.sql</code></li>
                  <li>Paste and run the SQL to create all required tables</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
              <div className="flex space-x-4">
                <Button onClick={() => window.location.reload()} variant="outline">
                  Retry
                </Button>
                <Button onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Project not found</h3>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
            <p className="mt-2 text-gray-600">{project.description}</p>
          </div>
          <div className="flex space-x-4">
            <Button
              onClick={handleGenerateContent}
              disabled={generatingContent || contentSources.length === 0}
              className="flex items-center gap-2"
            >
              {generatingContent ? (
                <>
                  <LoadingSpinner size="sm" />
                  Generating...
                </>
              ) : (
                '🤖 Generate AI Content'
              )}
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'content', label: `Content Sources (${contentSources.length})` },
            { key: 'materials', label: `Learning Materials (${learningMaterials.length})` }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
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

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Project Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Content Sources:</span>
                <span className="font-medium">{contentSources.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Learning Materials:</span>
                <span className="font-medium">{learningMaterials.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {project.status}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button 
                className="w-full" 
                size="sm" 
                onClick={() => setShowPdfUploader(true)}
              >
                📄 Add PDF Document
              </Button>
              <Button 
                className="w-full" 
                size="sm" 
                onClick={() => setShowLectureRecorder(true)}
              >
                🎥 Record Lecture
              </Button>
              <Button 
                className="w-full" 
                size="sm" 
                onClick={() => setShowContentManager(true)}
              >
                📝 Add Content Source
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">AI Features</h3>
            <div className="space-y-3">
              <Button 
                className="w-full" 
                size="sm" 
                onClick={() => setShowStudyWorkspace(true)}
                disabled={contentSources.length === 0}
              >
                🧠 AI Study Workspace
              </Button>
              <Button 
                className="w-full" 
                size="sm" 
                onClick={() => setShowVoiceTutor(true)}
                disabled={contentSources.length === 0}
              >
                🎤 Voice Tutor
              </Button>
              <Button 
                className="w-full" 
                size="sm" 
                onClick={() => setShowTutorChat(true)}
              >
                💬 Text Chat
              </Button>
              <Button 
                className="w-full" 
                size="sm" 
                onClick={() => setShowAnalytics(true)}
              >
                Learning Analytics
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'content' && (
        <div>
          {contentSources.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-gray-400 text-6xl mb-4">
                {/* Empty state icon */}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No content sources yet</h3>
              <p className="text-gray-600 mb-6">Add PDFs, documents, or record lectures to get started.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={() => setShowPdfUploader(true)}>
                  📄 Upload PDF
                </Button>
                <Button onClick={() => setShowContentManager(true)} variant="outline">
                  📝 Add Content
                </Button>
                <Button onClick={() => setShowLectureRecorder(true)} variant="outline">
                  🎥 Record Lecture
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Content Sources</h3>
                <div className="flex gap-2">
                  <Button onClick={() => setShowContentManager(true)} size="sm">
                    ➕ Add More
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contentSources.map((source) => (
                  <div key={source.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{source.title}</h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {source.type}
                      </span>
                    </div>
                    {source.content && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                        {source.content.substring(0, 150)}...
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Added {new Date(source.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
              
              {/* Lecture Sessions Section */}
              {lectureSessions.length > 0 && (
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Recorded Lectures</h3>
                    <span className="text-sm text-gray-500">{lectureSessions.length} session(s)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lectureSessions.map((session) => (
                      <div key={session.id} className="bg-blue-50 rounded-lg shadow p-6 hover:shadow-md transition-shadow border-l-4 border-blue-500">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold text-gray-900">{session.title}</h3>
                          <span className={`text-xs px-2 py-1 rounded ${
                            session.status === 'completed' ? 'bg-green-100 text-green-800' :
                            session.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            session.status === 'recording' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {session.status}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                          <p><strong>Duration:</strong> {Math.floor((session.duration || 0) / 60)}m {(session.duration || 0) % 60}s</p>
                          {session.final_transcript && (
                            <p className="line-clamp-3">
                              <strong>Transcript:</strong> {session.final_transcript.substring(0, 100)}...
                            </p>
                          )}
                          {session.audio_file_url && (
                            <div className="flex items-center gap-2">
                              <span>🔊</span>
                              <a 
                                href={session.audio_file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                Play Audio
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <p className="text-xs text-gray-500">
                            Recorded {new Date(session.created_at).toLocaleDateString()}
                          </p>
                          <button
                            onClick={() => setSelectedLecture(session)}
                            className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                          >
                            View Dashboard
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'materials' && (
        <div>
          {learningMaterials.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-gray-400 text-6xl mb-4">
                {/* Empty state icon */}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No learning materials yet</h3>
              <p className="text-gray-600 mb-6">Generate AI-powered content to create flashcards, summaries, and quizzes.</p>
              <Button 
                onClick={handleGenerateContent}
                disabled={generatingContent || contentSources.length === 0}
              >
                {generatingContent ? 'Generating...' : 'Generate Learning Materials'}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {learningMaterials.map((material) => (
                <div key={material.id} className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {material.type === 'summary' && '📄 AI Summary'}
                    {material.type === 'flashcards' && '🗂️ AI Flashcards'}
                    {material.type === 'quiz' && '❓ AI Quiz'}
                    {material.type === 'slides' && 'AI Slides'}
                    {!['summary', 'flashcards', 'quiz', 'slides'].includes(material.type) && 
                     `📝 ${material.type.charAt(0).toUpperCase() + material.type.slice(1)}`}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">Type: {material.type}</p>
                  <p className="text-xs text-gray-500">
                    Created {new Date(material.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Modals */}
      {showPdfUploader && (
        <PdfUploader 
          projectId={projectId!} 
          onUploadComplete={handleContentAdded}
          onClose={() => setShowPdfUploader(false)}
        />
      )}
      
      {showLectureRecorder && (
        <LectureRecorder 
          projectId={projectId!} 
          onRecordingComplete={handleLectureComplete}
          onClose={() => setShowLectureRecorder(false)}
        />
      )}
      
      {showContentManager && (
        <ContentSourceManager 
          projectId={projectId!} 
          onContentAdded={handleContentAdded}
          onClose={() => setShowContentManager(false)}
        />
      )}
      
      {showTutorChat && (
        <TutorChat 
          projectContent={getProjectContentText()}
          onClose={() => setShowTutorChat(false)}
        />
      )}
      
      {showStudyWorkspace && (
        <StudyWorkspace
          projectId={projectId!}
          contentSources={contentSources}
          onContentGenerated={setLearningMaterials}
          onClose={() => setShowStudyWorkspace(false)}
        />
      )}
      
      {showVoiceTutor && (
        <VoiceTutor
          systemInstruction={`You are a helpful AI tutor assistant. Help the student understand the following content: ${getProjectContentText().substring(0, 2000)}...`}
          onClose={() => setShowVoiceTutor(false)}
        />
      )}
      
      {showAnalytics && (
        <LearningAnalytics 
          projectId={projectId!}
          onClose={() => setShowAnalytics(false)}
        />
      )}
      
      {selectedLecture && (
        <LectureDashboard 
          lecture={selectedLecture}
          onClose={() => setSelectedLecture(null)}
        />
      )}
    </div>
  );
};

export default ProjectPage;