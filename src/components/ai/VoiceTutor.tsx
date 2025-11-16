import React, { useState } from 'react';
import useVoiceTutor from '../../hooks/useVoiceTutor';
import Button from '../ui/Button';

interface VoiceTutorProps {
  systemInstruction: string;
  onClose?: () => void;
}

const VoiceTutor: React.FC<VoiceTutorProps> = ({ systemInstruction, onClose }) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const { startSession, stopSession, transcriptionHistory, isConnecting, error } = useVoiceTutor(systemInstruction);

  const handleToggleSession = () => {
    if (isSessionActive) {
      stopSession();
      setIsSessionActive(false);
    } else {
      startSession();
      setIsSessionActive(true);
    }
  };

  const getStatusIndicator = () => {
    if (isConnecting) return <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>;
    if (isSessionActive && !error) return <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>;
    if (error) return <div className="w-3 h-3 rounded-full bg-red-500"></div>;
    return <div className="w-3 h-3 rounded-full bg-gray-500"></div>;
  };

  const getStatusText = () => {
    if (isConnecting) return "Connecting...";
    if (isSessionActive && !error) return "Listening...";
    if (error) return "Error";
    return "Ready to start";
  };

  // If used inline (no onClose), render as embedded component
  if (!onClose) {
    return (
      <div className="bg-white rounded-lg shadow border p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎤</div>
            <div>
              <h3 className="text-lg font-semibold">AI Voice Tutor</h3>
              <div className="flex items-center gap-2">
                {getStatusIndicator()}
                <span className="text-gray-600 text-sm">{getStatusText()}</span>
              </div>
            </div>
          </div>
          <Button
            onClick={handleToggleSession}
            disabled={isConnecting}
            variant={isSessionActive ? "outline" : "primary"}
          >
            {isConnecting ? 'Connecting...' : (isSessionActive ? '🛑 Stop' : '🎤 Start')}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded mb-4">
            <p className="text-red-800 text-sm">Error: {error}</p>
          </div>
        )}
        
        {/* Conversation Area */}
        <div className="h-96 overflow-y-auto p-4 bg-gray-50 rounded border">
          {transcriptionHistory.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-3xl mb-3">🎓</div>
                <p className="mb-2">Start speaking with your AI tutor!</p>
                <p className="text-sm">Click "Start" and ask questions about your material.</p>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {transcriptionHistory.map((entry, index) => (
              <div
                key={index}
                className={`flex ${
                  entry.speaker === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-sm p-3 rounded-lg text-sm ${
                    entry.speaker === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <p className={`font-bold mb-1 text-xs ${
                    entry.speaker === 'user' ? 'text-blue-100' : 'text-blue-600'
                  }`}>
                    {entry.speaker === 'user' ? '👤 You' : '🤖 Tutor'}
                  </p>
                  <p>{entry.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="mt-4 text-center text-sm text-gray-600">
          {isSessionActive ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Session active - speak naturally
            </span>
          ) : (
            'Click "Start" to begin your voice conversation'
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-3/4 mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎤</div>
            <div>
              <h2 className="text-xl font-semibold">AI Voice Tutor</h2>
              <div className="flex items-center gap-2">
                {getStatusIndicator()}
                <span className="text-gray-600">{getStatusText()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleToggleSession}
              disabled={isConnecting}
              variant={isSessionActive ? "outline" : "primary"}
            >
              {isConnecting ? 'Connecting...' : (isSessionActive ? '🛑 Stop Session' : '🎤 Start Tutoring')}
            </Button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
            >
              ×
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}
        
        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {transcriptionHistory.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-4">🎓</div>
                <p className="text-lg mb-2">Welcome to your AI Voice Tutor!</p>
                <p>Start the session and begin speaking to have a voice conversation with your AI tutor.</p>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-800 text-sm">
                    💡 <strong>Tip:</strong> Speak clearly and wait for the AI to respond before asking your next question.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {transcriptionHistory.map((entry, index) => (
              <div
                key={index}
                className={`flex ${
                  entry.speaker === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-3xl p-3 rounded-lg ${
                    entry.speaker === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <p className={`text-sm font-bold mb-1 ${
                    entry.speaker === 'user' ? 'text-blue-100' : 'text-blue-600'
                  }`}>
                    {entry.speaker === 'user' ? '👤 You' : '🤖 AI Tutor'}
                  </p>
                  <p>{entry.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="border-t bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {isSessionActive ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Session active - speak naturally and the AI will respond with voice
                </span>
              ) : (
                'Click "Start Tutoring" to begin your voice conversation'
              )}
            </div>
            <div className="text-xs text-gray-500">
              Real-time voice AI powered by Google Gemini
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceTutor;