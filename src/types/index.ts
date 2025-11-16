// Unified types for EduVerse platform

// ===============================
// Authentication & User Types
// ===============================

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// ===============================
// Project & Session Management
// ===============================

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface ContentSource {
  id: string;
  project_id: string;
  type: 'pdf' | 'youtube' | 'topic' | 'lecture';
  title: string;
  content: string; // Extracted text
  metadata: Record<string, any>; // URLs, file info, etc.
  created_at: string;
}

// ===============================
// Learning Materials (AI Tutor)
// ===============================

export interface Slide {
  title: string;
  content: string[];
}

export interface Flashcard {
  id: number;
  question: string;
  answer: string;
  tag: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface UserAnswer {
  question: string;
  options: string[];
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
}

export interface LearningAnalysisReport {
  overallScore: number;
  engagementAndConfidence: {
    rating: 'Low' | 'Medium' | 'High';
    feedback: string;
  };
  knowledgeRetention: {
    score: number;
    feedback: string;
  };
  conceptualUnderstanding: {
    rating: 'Emerging' | 'Developing' | 'Proficient';
    feedback: string;
  };
  summary: string;
  weakTopics?: string[];
}

export interface VerbalTestTranscriptEntry {
  question: string;
  answer: string;
}

export interface GeneratedContent {
  summary?: string;
  flashcards?: Flashcard[];
  quiz?: QuizQuestion[];
  deepDive?: string;
  slides?: Slide[];
  verbalTestQuestions?: string[];
  learningAnalysis?: LearningAnalysisReport;
}

// ===============================
// Lecture Capture & Analysis
// ===============================

export interface LectureSession {
  id: string;
  project_id: string;
  title: string;
  live_transcript: string;
  final_transcript: string;
  audio_file_url?: string;
  duration: number; // seconds
  status: 'recording' | 'processing' | 'completed' | 'failed';
  analysis: LectureAnalysis;
  created_at: string;
  completed_at?: string;
}

export interface Formula {
  name: string;
  latex: string;
  description: string;
}

export interface Concept {
  term: string;
  definition: string;
}

export interface Note {
  point: string;
  details?: string[];
}

export interface LectureAnalysis {
  title: string;
  summary: string;
  topics: string[];
  concepts: Concept[];
  formulas: Formula[];
  notes: Note[];
}

export interface TopicWeight {
  text: string;
  weight: number;
}

export interface ChatMessage {
  sender: 'user' | 'model';
  text: string;
  sources?: GroundingSource[];
}

export interface GroundingSource {
  uri: string;
  title: string;
}

// ===============================
// Chat & Communication
// ===============================

export interface ChatMessage {
  id: string;
  lecture_id: string; // Required in database
  message: string;
  response: string; // Required in database
  sources?: GroundingSource[]; // JSONB array in database
  created_at: string;
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface VoiceSession {
  id: string;
  user_id: string;
  project_id: string;
  context: string;
  conversation: Array<{
    speaker: 'user' | 'assistant';
    message: string;
    timestamp: string;
  }>;
  duration: number;
  created_at: string;
  ended_at?: string;
}

// ===============================
// Learning Materials Storage
// ===============================

export interface LearningMaterial {
  id: string;
  project_id: string;
  source_id?: string;
  lecture_id?: string;
  type: 'summary' | 'flashcards' | 'quiz' | 'deep_dive' | 'slides' | 'notes' | 'concepts' | 'formulas' | 'verbal_test_questions';
  content: any; // JSON content based on type
  content_hash?: string; // Hash for content caching
  generated_from_text?: string; // Truncated source text for reference
  last_accessed?: string; // TIMESTAMPTZ
  access_count?: number;
  created_at: string;
}

// ===============================
// Assessment & Analytics
// ===============================

export interface AssessmentResult {
  id: string;
  user_id: string;
  material_id?: string; // Optional since some assessments might not be tied to materials
  source_id?: string; // Missing from interface
  project_id: string; // Missing from interface
  type: 'quiz' | 'verbal_test' | 'targeted_quiz' | 'targeted_verbal_test';
  questions?: string[]; // Missing from interface
  answers: any; // JSON answers
  analysis?: LearningAnalysisReport;
  score?: number;
  weak_topics: string[];
  improvement_areas?: string[]; // Missing from interface
  session_metadata?: Record<string, any>; // Missing from interface
  is_retake?: boolean; // Missing from interface
  previous_session_id?: string; // Missing from interface
  taken_at: string;
}

export interface LearningAnalytics {
  id: string;
  user_id: string;
  project_id: string;
  metric_type: string;
  metric_value: number;
  metadata: Record<string, any>;
  recorded_at: string;
}

// ===============================
// Missing Database Table Interfaces
// ===============================

export interface UserProgress {
  id: string;
  user_id: string;
  project_id?: string;
  source_id?: string;
  content_type: string; // 'material', 'quiz', 'verbal_test', etc.
  overall_weak_topics: string[];
  improvement_areas: string[];
  total_sessions: number;
  average_score?: number;
  best_score?: number;
  recent_trend?: number; // Positive = improving
  last_session_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ContentCacheMetadata {
  id: string;
  user_id: string;
  source_hash: string;
  source_title: string;
  cache_key: string;
  content_types: string[]; // Array of cached content types
  last_accessed: string;
  access_count: number;
  cache_size?: number; // Size in bytes
  created_at: string;
  expires_at: string;
}

// ===============================
// Input/Output Types
// ===============================

export enum InputType {
  PDF = 'PDF',
  YouTube = 'YouTube',
  Topic = 'Topic'
}

export enum OutputType {
  Summary = 'Summary',
  Flashcards = 'Flashcards',
  Quiz = 'Quiz',
  DeepDive = 'Deep Dive',
  PPT = 'PPT Mode',
  VoiceTutor = 'Voice Tutor',
  VerbalTest = 'Verbal Test'
}

export enum LectureMode {
  LiveRecord = 'Live Record',
  UploadAudio = 'Upload Audio',
  ImportTranscript = 'Import Transcript'
}

// ===============================
// UI State Types
// ===============================

export type RecordingState = 'idle' | 'recording' | 'processing' | 'completed' | 'error';

export interface ProjectContextType {
  currentProject: Project | null;
  contentSources: ContentSource[];
  lectureSessions: LectureSession[];
  learningMaterials: LearningMaterial[];
  setCurrentProject: (project: Project | null) => void;
  addContentSource: (source: Omit<ContentSource, 'id' | 'created_at'>) => Promise<void>;
  addLectureSession: (session: Omit<LectureSession, 'id' | 'created_at'>) => Promise<void>;
  addLearningMaterial: (material: Omit<LearningMaterial, 'id' | 'created_at'>) => Promise<void>;
}

// ===============================
// Career Planning Types (SkillMap Integration)
// ===============================

export enum CareerPlanStep {
  CAREER_SELECTION,
  PREFERENCES,
  SKILL_ASSESSMENT,
  GENERATING,
  DASHBOARD,
}

export interface UserPreferences {
  careerGoal: string;
  skillLevel: string;
  timeCommitment: string;
  learningStyle: string;
  learningMedium: string;
  timeline: string;
}

export interface SkillAssessmentQuestion {
  question: string;
  options: string[];
  correctAnswer?: string;
}

export interface SkillAssessmentAnswer {
  question: string;
  answer: string;
}

export interface RoadmapData {
  careerTitle: string;
  shortSummary: string;
  requiredSkills: { skill: string; description: string }[];
  skillBreakdown: {
    beginner: { skill: string; description: string }[];
    intermediate: { skill: string; description: string }[];
    advanced: { skill: string; description: string }[];
  };
  weeklyPlan: { week: number; goal: string; tasks: string[] }[];
  monthlyTimeline: { month: number; milestone: string; focus: string[] }[];
  resources: {
    courses: { title: string; url: string; platform: string }[];
    youtube: { channel: string; url: string; description: string }[];
    books: { title: string; author: string }[];
  };
  projects: {
    beginner: { title: string; description: string; requirements: string[]; outcome: string }[];
    intermediate: { title: string; description: string; requirements: string[]; outcome: string }[];
    advanced: { title: string; description: string; requirements: string[]; outcome: string }[];
  };
  internshipGuide: {
    requirements: string[];
    interviewPlan: { topic: string; focus: string }[];
    resumeTips: string[];
  };
}

export interface CareerPlan {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  
  // User preferences
  career_goal: string;
  skill_level: string;
  time_commitment: string;
  learning_style: string;
  learning_medium: string;
  timeline: string;
  
  // Assessment results
  assessment_answers: SkillAssessmentAnswer[];
  assessed_skill_level?: string;
  
  // Generated roadmap data
  roadmap_data: RoadmapData;
  
  // Progress tracking
  weekly_progress: Record<string, any>;
  monthly_progress: Record<string, any>;
  overall_progress_percentage: number;
  
  created_at: string;
  updated_at: string;
}

export interface CareerPlanProgress {
  id: string;
  career_plan_id: string;
  user_id: string;
  
  progress_type: 'weekly_task' | 'monthly_milestone' | 'project' | 'resource' | 'skill';
  
  item_id: string;
  item_title: string;
  item_description?: string;
  
  is_completed: boolean;
  completed_at?: string;
  notes?: string;
  
  metadata: Record<string, any>;
  
  created_at: string;
  updated_at: string;
}

export interface CareerPlanResource {
  id: string;
  career_plan_id: string;
  user_id: string;
  
  resource_type: 'course' | 'youtube' | 'book' | 'project' | 'skill';
  title: string;
  url?: string;
  author?: string;
  platform?: string;
  description?: string;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  
  is_bookmarked: boolean;
  is_completed: boolean;
  completion_date?: string;
  user_rating?: number;
  user_notes?: string;
  
  metadata: Record<string, any>;
  
  created_at: string;
  updated_at: string;
}

export interface CareerPlanSkill {
  id: string;
  career_plan_id: string;
  user_id: string;
  
  skill_name: string;
  skill_description?: string;
  skill_category: 'required' | 'beginner' | 'intermediate' | 'advanced';
  
  current_proficiency: number;
  target_proficiency: number;
  is_priority: boolean;
  
  learning_resources: any[];
  practice_projects: any[];
  
  last_practiced_date?: string;
  assessment_results: Record<string, any>;
  
  created_at: string;
  updated_at: string;
}

export interface CareerPlanAssessment {
  id: string;
  career_plan_id: string;
  user_id: string;
  
  questions: SkillAssessmentQuestion[];
  user_answers: SkillAssessmentAnswer[];
  assessment_score?: number;
  final_skill_level?: string;
  
  started_at: string;
  completed_at?: string;
  created_at: string;
}

// ===============================
// Constants
// ===============================

export const CAREER_PATHS = [
  'Software Engineer',
  'Data Scientist',
  'Product Manager',
  'UX/UI Designer',
  'DevOps Engineer',
  'Machine Learning Engineer',
  'Cybersecurity Specialist',
  'Full Stack Developer',
  'Mobile App Developer',
  'Backend Developer',
  'Frontend Developer',
  'Game Developer',
  'Blockchain Developer',
  'AI Researcher',
  'Cloud Architect'
];

export const SKILL_LEVELS = [
  'Beginner',
  'Intermediate', 
  'Advanced'
];

export const TIME_COMMITMENTS = [
  '5-10 hours per week',
  '10-20 hours per week',
  '20-30 hours per week',
  '30+ hours per week'
];

export const LEARNING_STYLES = [
  'Project-First (Learn by building)',
  'Theory-First (Understand concepts first)',
  'Balanced (Mix of theory and practice)',
  'Practical (Hands-on learning)'
];

export const LEARNING_MEDIUMS = [
  'Video Content',
  'Text-based Learning',
  'Interactive Coding',
  'Mixed Media'
];

export const TIMELINES = [
  '3-6 months',
  '6-12 months',
  '1-2 years',
  '2+ years'
];

export const MOCK_TEXT = `Photosynthesis is a process used by plants, algae, and certain bacteria to convert light energy into chemical energy, through a process that converts carbon dioxide and water into glucose (a sugar) and oxygen. This process is crucial for life on Earth as it provides the oxygen we breathe and the energy base for most ecosystems. The chemical equation for photosynthesis is 6CO2 + 6H2O + Light Energy → C6H12O6 + 6O2. The process occurs in chloroplasts, specifically using chlorophyll, the green pigment that absorbs light. There are two main stages: the light-dependent reactions, where light energy is captured to make ATP and NADPH, and the light-independent reactions (Calvin cycle), where this energy is used to convert CO2 into glucose. Factors affecting photosynthesis include light intensity, carbon dioxide concentration, and temperature.`;