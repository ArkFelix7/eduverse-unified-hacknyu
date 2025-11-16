import React, { useMemo } from 'react';
import type { LectureAnalysis, TopicWeight } from '../../types';

interface VisualizationsProps {
  analysis: LectureAnalysis;
  transcript: string;
}

const Visualizations: React.FC<VisualizationsProps> = ({ analysis, transcript }) => {
  const topicWeights = useMemo<TopicWeight[]>(() => {
    if (!analysis.topics || !transcript) return [];

    const weights: TopicWeight[] = analysis.topics.map(topic => {
      // Use a case-insensitive global regex to count occurrences
      const regex = new RegExp(topic.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
      const count = (transcript.match(regex) || []).length;
      return { text: topic, weight: count };
    }).filter(t => t.weight > 0); // Only include topics that were actually mentioned

    // Sort for consistent rendering
    weights.sort((a, b) => b.weight - a.weight);

    return weights;
  }, [analysis.topics, transcript]);

  if (topicWeights.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-center text-gray-500">
        <div className="p-6">
          <p>No topics were mentioned frequently enough to generate a visualization.</p>
        </div>
      </div>
    );
  }

  const minWeight = Math.min(...topicWeights.map(t => t.weight));
  const maxWeight = Math.max(...topicWeights.map(t => t.weight));

  const getFontSize = (weight: number) => {
    const minSize = 1; // 1rem
    const maxSize = 3.5; // 3.5rem

    if (maxWeight === minWeight) {
      return `${(minSize + maxSize) / 2}rem`;
    }

    const size = minSize + ((weight - minWeight) / (maxWeight - minWeight)) * (maxSize - minSize);
    return `${size}rem`;
  };

  const colors = [
    'text-blue-500', 'text-indigo-500', 'text-purple-500',
    'text-green-500', 'text-sky-500', 'text-cyan-500',
    'text-emerald-500', 'text-teal-500', 'text-amber-500'
  ];

  return (
    <div className="p-6">
      <h3 className="text-xl font-bold mb-6 text-gray-900">Topic Cloud</h3>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 p-6 bg-blue-50 dark:bg-slate-700/50 rounded-lg min-h-[200px]">
        {topicWeights.map((topic, index) => (
          <span
            key={topic.text}
            className={`${colors[index % colors.length]} font-bold transition-all duration-300 ease-in-out hover:scale-110 cursor-default select-none`}
            style={{
              fontSize: getFontSize(topic.weight),
              lineHeight: 1.2,
            }}
            title={`Mentioned ${topic.weight} time(s)`}
          >
            {topic.text}
          </span>
        ))}
      </div>
      <p className="text-xs text-center mt-4 text-gray-500 dark:text-gray-400">
        Topic size is based on its frequency in the lecture transcript.
      </p>
    </div>
  );
};

export default Visualizations;