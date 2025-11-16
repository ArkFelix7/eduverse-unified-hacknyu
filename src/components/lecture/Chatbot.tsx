import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, GroundingSource } from '../../types';
import { createChat, sendChatMessage, sendChatMessageWithSearch } from '../../services/geminiService';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ChatbotProps {
  lectureContext: string;
  lectureTitle?: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ lectureContext, lectureTitle }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [chat] = useState(() => createChat());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      let response;
      if (useSearch) {
        response = await sendChatMessageWithSearch(input);
      } else {
        response = await sendChatMessage(chat, input, lectureContext);
      }
      
      const sources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
        uri: chunk.web?.uri || '',
        title: chunk.web?.title || 'Source'
      })).filter((source: GroundingSource) => source.uri) || [];

      const modelMessage: ChatMessage = { sender: 'model', text: response.text, sources };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = { 
        sender: 'model', 
        text: 'Sorry, I encountered an error. Please try again.' 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[65vh] p-6">
      <div className="flex-grow overflow-y-auto pr-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 p-4">
            <div className="text-4xl mb-2">💬</div>
            <p>Ask me anything about the lecture!</p>
            <p className="text-sm mt-2">Toggle search to ask about anything else using web sources.</p>
          </div>
        )}
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-2xl max-w-lg ${msg.sender === 'user' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 border border-gray-200 dark:bg-slate-700 dark:border-slate-600'
            }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 border-t border-gray-300 dark:border-gray-600 pt-2">
                  <h4 className="text-xs font-semibold mb-1">Sources:</h4>
                  <ul className="space-y-1">
                    {msg.sources.map((source, i) => (
                      <li key={i}>
                        <a 
                          href={source.uri} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          🔗 {source.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="p-3 rounded-2xl bg-gray-100 border border-gray-200 dark:bg-slate-700">
                <LoadingSpinner size="sm" />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="mt-4 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={useSearch ? "Ask with Google Search..." : "Ask about the lecture..."}
          className="flex-grow p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={() => setUseSearch(!useSearch)}
          className={`p-3 rounded-full transition-colors ${useSearch 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-slate-600 dark:text-gray-300'
          }`}
          title="Toggle Google Search"
        >
          🔍
        </button>
        <button 
          type="submit" 
          disabled={isLoading || !input.trim()} 
          className="p-3 bg-blue-500 text-white rounded-full disabled:bg-gray-400 hover:bg-blue-600 transition-colors"
        >
          ➤
        </button>
      </form>
    </div>
  );
};

export default Chatbot;