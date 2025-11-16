import React, { useState, useEffect, useCallback } from 'react';
import { 
  generateSummary, 
  generateFlashcards, 
  generateQuiz, 
  generateDeepDive, 
  generateSlides,
  generateVerbalTestQuestions 
} from '../../services/geminiService';
import { contentCacheService } from '../../services/contentCacheService';
import { adaptiveTestService } from '../../services/adaptiveTestService';
import { databaseService } from '../../services/databaseService';
import { useAuthStore } from '../../stores/authStore';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import VoiceTutor from '../ai/VoiceTutor';
import Flashcard from './Flashcard';
import Quiz from './Quiz';
import { ContentSource, LearningMaterial, OutputType } from '../../types';
import toast from 'react-hot-toast';

interface StudyWorkspaceProps {
  projectId: string;
  contentSources: ContentSource[];
  onContentGenerated: (materials: LearningMaterial[]) => void;
  onClose: () => void;
}

interface GeneratedContent {
  summary?: string;
  flashcards?: any[];
  quiz?: any[];
  deepDive?: string;
  slides?: any[];
  verbalTestQuestions?: string[];
  learningAnalysis?: any;
}

interface VerbalTestTranscriptEntry {
  question: string;
  answer: string;
}

type TestState = 'idle' | 'generating_questions' | 'in_progress' | 'analyzing' | 'complete';

const StudyWorkspace: React.FC<StudyWorkspaceProps> = ({ 
  projectId, 
  contentSources, 
  onContentGenerated, 
  onClose 
}) => {
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [activeOutput, setActiveOutput] = useState<OutputType | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [cacheStatus, setCacheStatus] = useState<Record<string, boolean>>({});
  const [regeneratingType, setRegeneratingType] = useState<OutputType | null>(null);
  
  // Verbal Test State
  const [testState, setTestState] = useState<TestState>('idle');
  const [testQuestions, setTestQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [transcript, setTranscript] = useState<VerbalTestTranscriptEntry[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [analysisReport, setAnalysisReport] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testStats, setTestStats] = useState<any>(null);
  const [previousResults, setPreviousResults] = useState<any[]>([]);
  
  const { user } = useAuthStore();
  const userId = user?.id || null;

  useEffect(() => {
    // Combine all content sources
    const combinedText = contentSources
      .map(source => source.content || '')
      .filter(content => content.trim())
      .join('\n\n');
    
    const combinedTitle = contentSources
      .map(source => source.title)
      .join(' + ');
    
    setSourceText(combinedText);
    setSourceTitle(combinedTitle || 'Study Material');
    
    if (combinedText && userId) {
      loadCachedContent();
    }
  }, [contentSources, userId]);

  // Load cached content and test history
  const loadCachedContent = async () => {
    if (!userId || !contentSources.length) return;

    try {
      const sourceId = contentSources[0].id; // Use primary source for caching
      
      // Load cached content
      const cached = await contentCacheService.getAllCachedContent(userId, sourceId, projectId);
      setGeneratedContent(cached);
      
      // Update cache status
      const status = await contentCacheService.getCacheStatus(userId, sourceId, projectId);
      setCacheStatus(status);
      
      // Load test statistics
      if (sourceId) {
        const stats = await adaptiveTestService.getTestStatistics(userId, sourceId, projectId);
        setTestStats(stats);
        
        const results = await adaptiveTestService.getUserAssessmentHistory(userId, sourceId, projectId);
        setPreviousResults(results);
      }
    } catch (error) {
      console.error('Error loading cached content:', error);
    }
  };

  const handleGenerate = async (type: OutputType, forceRegenerate: boolean = false) => {
    if (!sourceText.trim()) {
      toast.error('No content available to generate from. Please add some content sources first.');
      return;
    }

    if (!userId) {
      toast.error('Please sign in to continue.');
      return;
    }

    const sourceId = contentSources[0]?.id;
    if (!sourceId) {
      toast.error('Content source not found.');
      return;
    }

    // Special handling for Voice Tutor and Verbal Test
    if (type === OutputType.VoiceTutor) {
      setActiveOutput(type);
      return;
    }

    if (type === OutputType.VerbalTest) {
      setActiveOutput(type);
      return;
    }

    // Check if content exists in cache and we're not forcing regeneration
    const hasExistingContent = await contentCacheService.hasValidDatabaseCache(
      userId, sourceText, sourceTitle, type.toLowerCase().replace(' ', '_') as keyof GeneratedContent
    );
    
    if (hasExistingContent && !forceRegenerate) {
      // Load from cache
      const cachedContent = await contentCacheService.getCachedContent(
        userId, sourceText, sourceTitle, type.toLowerCase().replace(' ', '_') as keyof GeneratedContent
      );
      if (cachedContent) {
        setGeneratedContent(prev => ({ 
          ...prev, 
          [type.toLowerCase().replace(' ', '_')]: cachedContent 
        }));
        setActiveOutput(type);
        toast.success(`Loaded ${type} from cache!`);
        return;
      }
    }

    setLoadingStates(prev => ({ ...prev, [type]: true }));
    setActiveOutput(type);
    
    if (forceRegenerate) {
      setRegeneratingType(type);
      // Clear from cache
      await contentCacheService.clearCachedContent(userId, sourceId, projectId, 
        type.toLowerCase().replace(' ', '_') as keyof GeneratedContent);
    }
    
    try {
      let content;
      let dbType = type.toLowerCase().replace(' ', '_');
      
      switch (type) {
        case OutputType.Summary:
          content = await generateSummary(sourceText);
          setGeneratedContent(prev => ({ ...prev, summary: content }));
          break;
        case OutputType.Flashcards:
          content = await generateFlashcards(sourceText);
          setGeneratedContent(prev => ({ ...prev, flashcards: content }));
          break;
        case OutputType.Quiz:
          content = await generateQuiz(sourceText);
          setGeneratedContent(prev => ({ ...prev, quiz: content }));
          break;
        case OutputType.DeepDive:
          content = await generateDeepDive(sourceText);
          setGeneratedContent(prev => ({ ...prev, deepDive: content }));
          dbType = 'deep_dive';
          break;
        case OutputType.PPT:
          content = await generateSlides(sourceText);
          setGeneratedContent(prev => ({ ...prev, slides: content }));
          dbType = 'slides';
          break;
      }
      
      // Save to cache and database
      await contentCacheService.setCachedContent(
        userId, projectId, sourceId, sourceText, sourceTitle, 
        dbType as keyof GeneratedContent, content
      );
      
      // Update cache status
      const status = await contentCacheService.getCacheStatus(userId, sourceId, projectId);
      setCacheStatus(status);
      
      toast.success(`${type} generated successfully!`);
      
      // Refresh learning materials
      const updatedMaterials = await databaseService.getLearningMaterials(projectId);
      onContentGenerated(updatedMaterials);
      
    } catch (error) {
      console.error(`Error generating ${type}:`, error);
      toast.error(`Failed to generate ${type}. Please try again.`);
    } finally {
      setLoadingStates(prev => ({ ...prev, [type]: false }));
      setRegeneratingType(null);
    }
  };

  // Verbal Test Functions
  const startVerbalTest = async (isRetake: boolean = false) => {
    console.log('=== Starting Verbal Test ===');
    console.log('userId:', userId);
    console.log('contentSources.length:', contentSources.length);
    console.log('sourceText length:', sourceText.length);
    
    if (!userId || !contentSources.length) {
      console.error('Missing requirements:', { userId, contentSourcesLength: contentSources.length });
      toast.error('Please make sure you are signed in and have content loaded.');
      return;
    }
    
    setTestState('generating_questions');
    setError(null);
    setTranscript([]);
    setCurrentQuestionIndex(0);
    
    try {
      const sourceId = contentSources[0].id;
      console.log('Calling adaptiveTestService.generateAdaptiveQuestions with:', {
        sourceText: sourceText.substring(0, 100) + '...',
        userId,
        sourceId, 
        projectId,
        isRetake
      });
      
      const questions = await adaptiveTestService.generateAdaptiveQuestions(
        sourceText, userId, sourceId, projectId, isRetake
      );
      
      console.log('Generated questions:', questions);
      setTestQuestions(questions);
      setTestState('in_progress');
      
      // Note: Actual voice recognition would be implemented here
      toast('Verbal test started! Answer each question aloud.', {
        icon: 'ℹ️',
        duration: 3000,
      });
    } catch (err) {
      console.error('Error in startVerbalTest:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate questions.';
      setError(errorMessage);
      setTestState('idle');
      toast.error('Failed to start verbal test: ' + errorMessage);
    }
  };

  const finishVerbalTest = async () => {
    if (!userId || !contentSources.length) return;
    
    setTestState('analyzing');
    
    try {
      const sourceId = contentSources[0].id;
      const materialId = null; // Could link to specific material if needed
      
      const analysis = await adaptiveTestService.analyzeAndTrackProgress(
        userId, projectId, sourceId, materialId, testQuestions, transcript, 
        false // isRetake flag
      );
      
      setAnalysisReport(analysis);
      setTestState('complete');
      
      // Refresh test statistics
      const updatedStats = await adaptiveTestService.getTestStatistics(userId, sourceId, projectId);
      setTestStats(updatedStats);
      
      const updatedResults = await adaptiveTestService.getUserAssessmentHistory(userId, sourceId, projectId);
      setPreviousResults(updatedResults);
      
      toast.success('Test completed and results analyzed!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze results.');
      setTestState('in_progress');
      toast.error('Failed to analyze test results.');
    }
  };

  const resetTest = () => {
    setTestState('idle');
    setTestQuestions([]);
    setCurrentQuestionIndex(0);
    setTranscript([]);
    setCurrentTranscription('');
    setAnalysisReport(null);
    setError(null);
  };

  const outputOptions: { type: OutputType; label: string; description: string }[] = [
    { type: OutputType.Summary, label: 'Summary', description: 'Concise overview of key points' },
    { type: OutputType.Flashcards, label: 'Flashcards', description: 'Interactive study cards' },
    { type: OutputType.Quiz, label: 'Quiz', description: 'Multiple choice questions' },
    { type: OutputType.DeepDive, label: 'Deep Dive', description: 'Detailed explanation with examples' },
    { type: OutputType.PPT, label: 'Slides', description: 'Presentation format' },
    { type: OutputType.VoiceTutor, label: 'Voice Tutor', description: 'AI conversation partner' },
    { type: OutputType.VerbalTest, label: 'Verbal Test', description: 'Adaptive spoken assessment' },
  ];

  const renderContentHeader = () => {
    if (!activeOutput || activeOutput === OutputType.VoiceTutor || activeOutput === OutputType.VerbalTest) {
      return null;
    }

    const hasContent = cacheStatus[activeOutput];
    
    return (
      <div className="px-6 py-3 border-b bg-gray-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{activeOutput}</h3>
            {hasContent && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded border border-green-200">
                Cached
              </span>
            )}
            {regeneratingType === activeOutput && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded border border-amber-200">
                Regenerating...
              </span>
            )}
          </div>
          
          {hasContent && !loadingStates[activeOutput] && (
            <button
              onClick={() => handleGenerate(activeOutput, true)}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded border border-gray-300 transition-colors"
              disabled={regeneratingType === activeOutput}
            >
              🔄 Regenerate
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!activeOutput) {
      return (
        <div className="text-center text-gray-400 p-8">
          <h3 className="text-xl font-semibold mb-2">AI Study Workspace</h3>
          <p>Select an option above to generate AI-powered study materials from your content.</p>
          <p className="text-sm mt-2">Content sources: {contentSources.length}</p>
          
          {testStats && testStats.totalTests > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-md mx-auto">
              <h4 className="font-semibold text-blue-900 mb-2">Your Learning Progress</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="font-bold text-blue-600">{testStats.totalTests}</div>
                  <div className="text-blue-600">Tests</div>
                </div>
                <div>
                  <div className="font-bold text-green-600">{testStats.averageScore.toFixed(0)}%</div>
                  <div className="text-green-600">Avg Score</div>
                </div>
                <div>
                  <div className="font-bold text-purple-600">{testStats.bestScore.toFixed(0)}%</div>
                  <div className="text-purple-600">Best Score</div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (loadingStates[activeOutput]) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-lg mt-4">Generating {activeOutput}...</span>
          <span className="text-sm text-gray-600 mt-2">This may take a moment</span>
        </div>
      );
    }

    switch (activeOutput) {
      case OutputType.Summary:
        return (
          <div className="prose prose-lg max-w-none p-6">
            <div dangerouslySetInnerHTML={{ __html: generatedContent.summary || '' }} />
          </div>
        );
        
      case OutputType.Flashcards:
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Interactive Flashcards</h3>
            {generatedContent.flashcards && generatedContent.flashcards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generatedContent.flashcards.map((card) => (
                  <Flashcard key={card.id} card={card} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No flashcards generated yet.</p>
              </div>
            )}
          </div>
        );
        
      case OutputType.Quiz:
        return (
          <div className="p-6">
            {generatedContent.quiz && generatedContent.quiz.length > 0 ? (
              <Quiz 
                questions={generatedContent.quiz} 
                onComplete={(score, answers) => {
                  console.log('Quiz completed with score:', score);
                  toast.success(`Quiz completed! Score: ${Math.round(score)}%`);
                }} 
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No quiz questions generated yet.</p>
              </div>
            )}
          </div>
        );
        
      case OutputType.DeepDive:
        return (
          <div className="prose prose-lg max-w-none p-6">
            <div dangerouslySetInnerHTML={{ __html: generatedContent.deepDive || '' }} />
          </div>
        );
        
      case OutputType.PPT:
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Generated Presentation</h3>
            <div className="space-y-4">
              {generatedContent.slides?.map((slide, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-6 border">
                  <h4 className="text-xl font-bold text-blue-600 mb-3">
                    Slide {index + 1}: {slide.title}
                  </h4>
                  <ul className="space-y-2">
                    {slide.content?.map((point: string, pointIndex: number) => (
                      <li key={pointIndex} className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );

      case OutputType.VoiceTutor:
        return (
          <div className="p-6">
            <VoiceTutor 
              systemInstruction={`You are a helpful tutor explaining the following topic: ${sourceTitle}. 
                The user has provided this context: "${sourceText.substring(0, 500)}...". 
                Keep your answers concise and conversational.`}
            />
          </div>
        );

      case OutputType.VerbalTest:
        return renderVerbalTest();
        
      default:
        return null;
    }
  };

  const renderVerbalTest = () => {
    if (error) {
      return (
        <div className="text-center text-red-600 p-6">
          <p className="font-bold">An Error Occurred</p>
          <p>{error}</p>
          <button 
            onClick={resetTest} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      );
    }

    switch (testState) {
      case 'idle':
        return (
          <div className="text-center p-8">
            <h3 className="text-2xl font-bold text-blue-600 mb-4">Verbal Test</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              Assess your understanding by answering questions verbally. The AI will analyze your responses 
              and provide detailed feedback on your comprehension.
            </p>
            
            {testStats && testStats.totalTests > 0 && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border max-w-md mx-auto">
                <h4 className="font-semibold text-gray-900 mb-2">Your Progress</h4>
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{testStats.totalTests}</div>
                    <div className="text-gray-600">Tests Taken</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{testStats.averageScore.toFixed(1)}%</div>
                    <div className="text-gray-600">Average Score</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{testStats.bestScore.toFixed(1)}%</div>
                    <div className="text-gray-600">Best Score</div>
                  </div>
                </div>
                
                {testStats.weakTopics.length > 0 && (
                  <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200">
                    <div className="text-sm text-amber-800">
                      <strong>Focus areas:</strong> {testStats.weakTopics.slice(0, 3).join(', ')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {previousResults.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200 max-w-md mx-auto">
                <div className="text-sm text-blue-800 mb-2">Previous attempts on this material:</div>
                <div className="flex gap-2 justify-center">
                  {previousResults.slice(0, 5).map((result, index) => (
                    <div key={result.id} className="text-xs px-2 py-1 bg-blue-100 rounded">
                      {result.score?.toFixed(0) || '0'}%
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => startVerbalTest(false)} 
                className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
              >
                {previousResults.length === 0 ? 'Start Test' : 'New Test'}
              </button>
              
              {previousResults.length > 0 && (
                <button 
                  onClick={() => startVerbalTest(true)} 
                  className="px-6 py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
                >
                  Focus Practice
                </button>
              )}
            </div>
          </div>
        );
        
      case 'generating_questions':
        return (
          <div className="flex flex-col items-center justify-center p-8">
            <LoadingSpinner size="lg" />
            <p className="text-lg mt-4">Preparing personalized questions...</p>
          </div>
        );
        
      case 'in_progress':
        const currentQuestion = testQuestions[currentQuestionIndex];
        const isLastQuestion = currentQuestionIndex === testQuestions.length - 1;
        return (
          <div className="p-6">
            <div className="text-center mb-6">
              <p className="font-bold text-blue-600">Question {currentQuestionIndex + 1} of {testQuestions.length}</p>
              <h4 className="text-xl text-gray-800 mt-2">{currentQuestion}</h4>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 border mb-6">
              <p className="text-sm font-medium text-gray-600 mb-2">Your Answer:</p>
              <p className="text-gray-800 min-h-[50px]">{currentTranscription || 'Speak your answer...'}</p>
            </div>
            
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Note: In a full implementation, this would capture your voice. For now, you can type or imagine your response.
              </p>
              
              <div className="space-x-4">
                <button
                  onClick={() => {
                    // Simulate answer recording
                    const simulatedAnswer = `Answer to: ${currentQuestion}`;
                    const newTranscript = [...transcript, { question: currentQuestion, answer: simulatedAnswer }];
                    setTranscript(newTranscript);
                    
                    if (isLastQuestion) {
                      finishVerbalTest();
                    } else {
                      setCurrentQuestionIndex(prev => prev + 1);
                    }
                  }}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  {isLastQuestion ? 'Finish Test' : 'Next Question'}
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'analyzing':
        return (
          <div className="flex flex-col items-center justify-center p-8">
            <LoadingSpinner size="lg" />
            <p className="text-lg mt-4">Analyzing your responses...</p>
            <p className="text-sm text-gray-600 mt-2">This may take a moment</p>
          </div>
        );
        
      case 'complete':
        return analysisReport ? (
          <div className="p-6">
            <h3 className="text-xl font-bold text-green-600 mb-4">Test Complete!</h3>
            
            <div className="bg-white rounded-lg shadow p-6 border mb-6">
              <h4 className="text-lg font-semibold mb-3">Your Results</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-600">{analysisReport.overallScore}%</div>
                  <div className="text-sm text-blue-600">Overall Score</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="text-lg font-bold text-green-600">{analysisReport.conceptualUnderstanding.rating}</div>
                  <div className="text-sm text-green-600">Understanding Level</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <strong className="text-gray-800">Summary:</strong>
                  <p className="text-gray-600 mt-1">{analysisReport.summary}</p>
                </div>
                
                {analysisReport.weakTopics && analysisReport.weakTopics.length > 0 && (
                  <div>
                    <strong className="text-gray-800">Areas for Improvement:</strong>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {analysisReport.weakTopics.map((topic: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-sm">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center space-x-4">
              <button 
                onClick={resetTest} 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Take Again
              </button>
              <button 
                onClick={() => { resetTest(); startVerbalTest(true); }} 
                className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
              >
                Focus Practice
              </button>
            </div>
          </div>
        ) : null;
        
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Study Workspace</h2>
            <p className="text-gray-600">Generate comprehensive study materials from your content</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold p-2"
          >
            ×
          </button>
        </div>

        {/* Generation Options */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex flex-wrap gap-3">
            {outputOptions.map(opt => (
              <button
                key={opt.type}
                onClick={() => handleGenerate(opt.type)}
                disabled={loadingStates[opt.type] || !sourceText.trim()}
                className={`flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 border-2 min-w-[120px] ${
                  activeOutput === opt.type
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                } ${loadingStates[opt.type] ? 'opacity-50 cursor-not-allowed' : ''} ${
                  !sourceText.trim() ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={opt.description}
              >
                <span className="mr-2">{opt.icon}</span>
                <div className="text-left">
                  <div>{opt.label}</div>
                  {loadingStates[opt.type] && (
                    <div className="text-xs opacity-75">Generating...</div>
                  )}
                </div>
              </button>
            ))}
          </div>
          
          {!sourceText.trim() && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-yellow-800 text-sm">
                ⚠️ No content available. Please add PDF documents, topics, or other content sources first.
              </p>
            </div>
          )}
        </div>

        {/* Content Display */}
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default StudyWorkspace;