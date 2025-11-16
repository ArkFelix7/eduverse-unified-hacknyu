import React, { useState } from 'react';
import { searchTopic } from '../../services/geminiService';
import { databaseService } from '../../services/databaseService';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { ContentSource } from '../../types';

interface ContentSourceManagerProps {
  projectId: string;
  onContentAdded: (contentSource: ContentSource) => void;
  onClose: () => void;
}

type SourceType = 'topic' | 'youtube' | 'text';

const ContentSourceManager: React.FC<ContentSourceManagerProps> = ({
  projectId,
  onContentAdded,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<SourceType>('topic');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    topic: '',
    youtubeUrl: '',
    title: '',
    textContent: ''
  });

  const handleTopicSearch = async () => {
    if (!formData.topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setLoading(true);
    try {
      const { text, sources } = await searchTopic(formData.topic);
      
      const sourceLinks = sources.length > 0 
        ? sources.map(s => `[${s.title}](${s.uri})`).join(', ')
        : '';
      
      const fullContent = sourceLinks 
        ? `${text}\n\n**Sources:** ${sourceLinks}`
        : text;

      const contentSource = await databaseService.createContentSource({
        project_id: projectId,
        title: `Research: ${formData.topic}`,
        type: 'topic',
        content: fullContent,
        metadata: {
          topic: formData.topic,
          sources: sources
        }
      });

      toast.success('Topic research added successfully!');
      onContentAdded(contentSource);
      onClose();
      
    } catch (error) {
      console.error('Error researching topic:', error);
      toast.error('Failed to research topic');
    } finally {
      setLoading(false);
    }
  };

  const handleYouTubeAdd = async () => {
    if (!formData.youtubeUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    // Validate YouTube URL
    const youtubeRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(formData.youtubeUrl)) {
      toast.error('Please enter a valid YouTube URL');
      return;
    }

    setLoading(true);
    try {
      // For demo purposes, we'll create a mock transcript
      // In production, this would call a transcription service
      const mockTranscript = `This is a demo transcript for the YouTube video: ${formData.youtubeUrl}\n\nIn a real implementation, this would be the actual transcribed content from the video using services like Whisper API or YouTube's transcript API.\n\nThe transcript would contain the spoken content, timestamps, and any relevant metadata from the video.`;

      const videoTitle = `YouTube Video: ${formData.youtubeUrl.split('/').pop() || 'Video'}`;
      
      const contentSource = await databaseService.createContentSource({
        project_id: projectId,
        title: videoTitle,
        type: 'youtube',
        content: mockTranscript,
        metadata: {
          url: formData.youtubeUrl,
          transcribed: true
        }
      });

      toast.success('YouTube video added successfully!');
      onContentAdded(contentSource);
      onClose();
      
    } catch (error) {
      console.error('Error adding YouTube video:', error);
      toast.error('Failed to add YouTube video');
    } finally {
      setLoading(false);
    }
  };

  const handleTextAdd = async () => {
    if (!formData.title.trim() || !formData.textContent.trim()) {
      toast.error('Please enter both title and content');
      return;
    }

    setLoading(true);
    try {
      const contentSource = await databaseService.createContentSource({
        project_id: projectId,
        title: formData.title,
        type: 'text',
        content: formData.textContent,
        metadata: {
          wordCount: formData.textContent.split(' ').length
        }
      });

      toast.success('Text content added successfully!');
      onContentAdded(contentSource);
      onClose();
      
    } catch (error) {
      console.error('Error adding text content:', error);
      toast.error('Failed to add text content');
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'topic':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Research Topic
              </label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="e.g., 'Machine Learning Fundamentals'"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-blue-800 text-sm">
                🔍 AI will research this topic using current web information and create structured content.
              </p>
            </div>
            
            <Button 
              onClick={handleTopicSearch} 
              disabled={loading || !formData.topic.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Researching...
                </>
              ) : (
                '🔍 Research Topic'
              )}
            </Button>
          </div>
        );

      case 'youtube':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                YouTube URL
              </label>
              <input
                type="url"
                value={formData.youtubeUrl}
                onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-yellow-800 text-sm">
                🎥 Note: This is a demo. In production, the video would be automatically transcribed.
              </p>
            </div>
            
            <Button 
              onClick={handleYouTubeAdd} 
              disabled={loading || !formData.youtubeUrl.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Processing...
                </>
              ) : (
                '🎥 Add YouTube Video'
              )}
            </Button>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Give your content a title"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <textarea
                value={formData.textContent}
                onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                placeholder="Paste your text content here..."
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            
            <Button 
              onClick={handleTextAdd} 
              disabled={loading || !formData.title.trim() || !formData.textContent.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Saving...
                </>
              ) : (
                '📝 Add Text Content'
              )}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add Content Source</h2>
            <p className="text-gray-600 text-sm">Choose how you'd like to add learning content</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'topic', label: 'Research Topic', icon: '🔍' },
              { key: 'youtube', label: 'YouTube Video', icon: '🎥' },
              { key: 'text', label: 'Text Content', icon: '📝' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as SourceType)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default ContentSourceManager;