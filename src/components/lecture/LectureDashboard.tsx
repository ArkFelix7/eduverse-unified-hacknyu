import React, { useState, useEffect } from 'react';
import type { LectureSession, LectureAnalysis } from '../../types';
import Chatbot from './Chatbot';
import Formula from './Formula';
import Visualizations from './Visualizations';
import Button from '../ui/Button';

interface LectureDashboardProps {
  lecture: LectureSession;
  onClose: () => void;
}

type Tab = 'overview' | 'notes' | 'concepts' | 'formulas' | 'visualizations' | 'chat';

const LectureDashboard: React.FC<LectureDashboardProps> = ({ lecture, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [downloadUrl, setDownloadUrl] = useState<string>('');

  const analysis = lecture.analysis;

  useEffect(() => {
    // Create download URL if audio exists
    if (lecture.audio_file_url) {
      setDownloadUrl(lecture.audio_file_url);
    }
  }, [lecture.audio_file_url]);

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview' },
    { id: 'notes' as Tab, label: 'Structured Notes' },
    { id: 'concepts' as Tab, label: 'Key Concepts' },
    { id: 'formulas' as Tab, label: 'Formulas' },
    { id: 'visualizations' as Tab, label: 'Visualizations' },
    { id: 'chat' as Tab, label: 'Chat with Lecture' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{analysis.title}</h2>
              <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
              
              {analysis.topics && analysis.topics.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Key Topics:</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.topics.map((topic, index) => (
                      <span 
                        key={index} 
                        className="px-3 py-1 text-sm font-medium text-blue-800 bg-blue-100 rounded-full"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl font-bold text-blue-600">{analysis.notes?.length || 0}</div>
                <div className="text-sm text-gray-600">Structured Notes</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl font-bold text-green-600">{analysis.concepts?.length || 0}</div>
                <div className="text-sm text-gray-600">Key Concepts</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl font-bold text-purple-600">{analysis.formulas?.length || 0}</div>
                <div className="text-sm text-gray-600">Formulas</div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Lecture Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <span className="ml-2 font-medium">
                    {Math.floor((lecture.duration || 0) / 60)}m {(lecture.duration || 0) % 60}s
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    lecture.status === 'completed' ? 'bg-green-100 text-green-800' :
                    lecture.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {lecture.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Created:</span>
                  <span className="ml-2 font-medium">
                    {new Date(lecture.created_at).toLocaleDateString()}
                  </span>
                </div>
                {lecture.audio_file_url && (
                  <div>
                    <a 
                      href={lecture.audio_file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      🔊 Play Audio Recording
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 'notes':
        return (
          <div className="p-6 space-y-4">
            {analysis.notes && analysis.notes.length > 0 ? (
              analysis.notes.map((note, index) => (
                <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="font-semibold text-lg text-blue-600 mb-2">• {note.point}</p>
                  {note.details && note.details.length > 0 && (
                    <ul className="pl-6 space-y-1 list-disc text-gray-700">
                      {note.details.map((detail, i) => <li key={i}>{detail}</li>)}
                    </ul>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">📝</div>
                <p>No structured notes available for this lecture.</p>
              </div>
            )}
          </div>
        );
        
      case 'concepts':
        return (
          <div className="p-6 space-y-4">
            {analysis.concepts && analysis.concepts.length > 0 ? (
              analysis.concepts.map((concept, index) => (
                <div key={index} className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                  <p className="font-bold text-blue-900 text-lg">{concept.term}</p>
                  <p className="mt-2 text-gray-700">{concept.definition}</p>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>No key concepts extracted from this lecture.</p>
              </div>
            )}
          </div>
        );
        
      case 'formulas':
        return (
          <div className="p-6 space-y-6">
            {analysis.formulas && analysis.formulas.length > 0 ? (
              analysis.formulas.map((formula, index) => (
                <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                  <p className="font-bold text-lg text-gray-900 mb-3">{formula.name}</p>
                  <div className="my-4 text-xl bg-gray-50 p-4 rounded border">
                    <Formula latex={formula.latex} />
                  </div>
                  <p className="text-sm text-gray-600">{formula.description}</p>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">🧮</div>
                <p>No formulas detected in this lecture.</p>
              </div>
            )}
          </div>
        );
        
      case 'visualizations':
        return (
          <Visualizations 
            analysis={analysis} 
            transcript={lecture.final_transcript || lecture.live_transcript || ''} 
          />
        );
        
      case 'chat':
        return (
          <Chatbot 
            lectureContext={`${lecture.final_transcript || lecture.live_transcript}\n\nAnalysis:\n${JSON.stringify(analysis)}`}
            lectureTitle={analysis.title}
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{analysis.title}</h1>
            <p className="text-sm text-gray-600">
              Lecture Dashboard • {new Date(lecture.created_at).toLocaleDateString()}
            </p>
          </div>
          <Button onClick={onClose} variant="outline">
            ✕ Close
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-6 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default LectureDashboard;