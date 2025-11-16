import React, { useState, useRef, useEffect } from 'react';
import { createChat, sendChatMessage, sendChatMessageWithSearch } from '../../services/geminiService';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { ChatMessage } from '../../types';

interface TutorChatProps {
  projectContent?: string;
  onClose: () => void;
}

const TutorChat: React.FC<TutorChatProps> = ({ projectContent, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: projectContent 
        ? "Hello! I'm your AI tutor. I can help you understand your learning materials. What would you like to explore?"
        : "Hello! I'm your AI tutor. I can help answer questions and explain concepts. How can I assist you today?",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [chat] = useState(() => createChat());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: newMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = newMessage;
    setNewMessage('');
    setIsLoading(true);

    try {
      let response;
      
      if (useWebSearch) {
        // Use web search for current information
        response = await sendChatMessageWithSearch(messageText);
      } else {
        // Use project content context if available
        response = await sendChatMessage(chat, messageText, projectContent);
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I couldn\'t generate a response.',
        sender: 'ai',
        timestamp: new Date(),
        sources: useWebSearch ? response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
          title: chunk.web?.title || 'Source',
          uri: chunk.web?.uri || '#'
        })) : undefined
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-3/4 mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🧠</div>
            <div>
              <h2 className="text-xl font-semibold">AI Tutor Chat</h2>
              <p className="text-sm text-gray-600">
                {useWebSearch ? 'Web search enabled' : 'Context-aware responses'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseWebSearch(!useWebSearch)}
              className={`p-2 rounded-lg transition-colors ${
                useWebSearch 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Toggle web search"
            >
              🔍
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
            >
              ×
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-lg p-3 ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                {/* Sources for web search responses */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <p className="text-sm font-medium mb-2">Sources:</p>
                    <div className="space-y-1">
                      {message.sources.map((source, index) => (
                        <a
                          key={index}
                          href={source.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline block"
                        >
                          📎 {source.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-xs opacity-75 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-gray-600">Thinking...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your learning materials..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isLoading}
              className="self-end"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : '📤'}
            </Button>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={useWebSearch}
                onChange={(e) => setUseWebSearch(e.target.checked)}
                className="rounded"
              />
              Use web search for current information
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorChat;