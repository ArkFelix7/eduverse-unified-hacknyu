import { supabase, STORAGE_BUCKETS } from '../lib/supabase';
import type {
  User,
  Project,
  ContentSource,
  LectureSession,
  LearningMaterial,
  AssessmentResult,
  VoiceSession,
  ChatMessage,
  LearningAnalytics
} from '../types';

// ===============================
// User Profile Management
// ===============================

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  try {
    // Use ensureUserProfile to get or create the profile
    return await ensureUserProfile(user.id);
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    return null;
  }
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>
): Promise<User | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const createUserProfile = async (user: any): Promise<User> => {
  const profile = {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name,
    avatar_url: user.user_metadata?.avatar_url,
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const ensureUserProfile = async (userId: string): Promise<User> => {
  // First check if profile exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (existingProfile) {
    return existingProfile;
  }

  // Profile doesn't exist, get user from auth and create profile
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.id !== userId) {
    throw new Error('User not authenticated or user ID mismatch');
  }

  // Create the profile
  const profile = {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || user.email || 'User',
    avatar_url: user.user_metadata?.avatar_url || null,
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile) // Use upsert instead of insert to handle race conditions
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ===============================
// Project Management
// ===============================

export const getUserProjects = async (userId: string): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createProject = async (
  userId: string,
  project: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Project> => {
  // Ensure user profile exists before creating project
  await ensureUserProfile(userId);
  
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...project, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProject = async (
  projectId: string,
  updates: Partial<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Project> => {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) throw error;
};

export const getProject = async (projectId: string): Promise<Project | null> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  return data;
};

export const getContentSources = async (projectId: string): Promise<ContentSource[]> => {
  return getProjectContentSources(projectId);
};

export const getLearningMaterials = async (projectId: string): Promise<LearningMaterial[]> => {
  return getProjectLearningMaterials(projectId);
};

// ===============================
// Content Sources Management
// ===============================

export const getProjectContentSources = async (projectId: string): Promise<ContentSource[]> => {
  const { data, error } = await supabase
    .from('content_sources')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createContentSource = async (
  source: Omit<ContentSource, 'id' | 'created_at'>
): Promise<ContentSource> => {
  const { data, error } = await supabase
    .from('content_sources')
    .insert(source)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateContentSource = async (
  sourceId: string,
  updates: Partial<Omit<ContentSource, 'id' | 'project_id' | 'created_at'>>
): Promise<ContentSource> => {
  const { data, error } = await supabase
    .from('content_sources')
    .update(updates)
    .eq('id', sourceId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteContentSource = async (sourceId: string): Promise<void> => {
  const { error } = await supabase
    .from('content_sources')
    .delete()
    .eq('id', sourceId);

  if (error) throw error;
};

// ===============================
// Lecture Sessions Management
// ===============================

export const getProjectLectureSessions = async (projectId: string): Promise<LectureSession[]> => {
  const { data, error } = await supabase
    .from('lecture_sessions')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createLectureSession = async (
  session: Omit<LectureSession, 'id' | 'created_at'>
): Promise<LectureSession> => {
  const { data, error } = await supabase
    .from('lecture_sessions')
    .insert(session)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateLectureSession = async (
  sessionId: string,
  updates: Partial<Omit<LectureSession, 'id' | 'project_id' | 'created_at'>>
): Promise<LectureSession> => {
  const { data, error } = await supabase
    .from('lecture_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteLectureSession = async (sessionId: string): Promise<void> => {
  const { error } = await supabase
    .from('lecture_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) throw error;
};

// ===============================
// Learning Materials Management
// ===============================

export const getProjectLearningMaterials = async (
  projectId: string,
  sourceId?: string,
  lectureId?: string
): Promise<LearningMaterial[]> => {
  let query = supabase
    .from('learning_materials')
    .select('*')
    .eq('project_id', projectId);

  if (sourceId) {
    query = query.eq('source_id', sourceId);
  }
  if (lectureId) {
    query = query.eq('lecture_id', lectureId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createLearningMaterial = async (
  material: Omit<LearningMaterial, 'id' | 'created_at'>
): Promise<LearningMaterial> => {
  const { data, error } = await supabase
    .from('learning_materials')
    .insert(material)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Generate learning materials from lecture analysis
export const generateLearningMaterialsFromLecture = async (
  projectId: string,
  lectureId: string,
  analysis: any
): Promise<LearningMaterial[]> => {
  const materials: LearningMaterial[] = [];
  
  try {
    // Create summary material
    if (analysis.summary) {
      const summaryMaterial = await createLearningMaterial({
        project_id: projectId,
        lecture_id: lectureId,
        type: 'summary',
        content: { text: analysis.summary }
      });
      materials.push(summaryMaterial);
    }
    
    // Create notes material
    if (analysis.notes && analysis.notes.length > 0) {
      const notesMaterial = await createLearningMaterial({
        project_id: projectId,
        lecture_id: lectureId,
        type: 'notes',
        content: { notes: analysis.notes }
      });
      materials.push(notesMaterial);
    }
    
    // Create concepts material
    if (analysis.concepts && analysis.concepts.length > 0) {
      const conceptsMaterial = await createLearningMaterial({
        project_id: projectId,
        lecture_id: lectureId,
        type: 'concepts',
        content: { concepts: analysis.concepts }
      });
      materials.push(conceptsMaterial);
    }
    
    // Create formulas material
    if (analysis.formulas && analysis.formulas.length > 0) {
      const formulasMaterial = await createLearningMaterial({
        project_id: projectId,
        lecture_id: lectureId,
        type: 'formulas',
        content: { formulas: analysis.formulas }
      });
      materials.push(formulasMaterial);
    }
    
    console.log(`Generated ${materials.length} learning materials from lecture`);
    return materials;
  } catch (error) {
    console.error('Error generating learning materials from lecture:', error);
    throw error;
  }
};

export const updateLearningMaterial = async (
  materialId: string,
  updates: Partial<Omit<LearningMaterial, 'id' | 'project_id' | 'created_at'>>
): Promise<LearningMaterial> => {
  const { data, error } = await supabase
    .from('learning_materials')
    .update(updates)
    .eq('id', materialId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteLearningMaterial = async (materialId: string): Promise<void> => {
  const { error } = await supabase
    .from('learning_materials')
    .delete()
    .eq('id', materialId);

  if (error) throw error;
};

// ===============================
// Assessment Results Management
// ===============================

export const getUserAssessmentResults = async (
  userId: string,
  materialId?: string
): Promise<AssessmentResult[]> => {
  let query = supabase
    .from('assessment_results')
    .select('*')
    .eq('user_id', userId);

  if (materialId) {
    query = query.eq('material_id', materialId);
  }

  const { data, error } = await query.order('taken_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createAssessmentResult = async (
  result: Omit<AssessmentResult, 'id' | 'taken_at'>
): Promise<AssessmentResult> => {
  const { data, error } = await supabase
    .from('assessment_results')
    .insert(result)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ===============================
// Voice Sessions Management
// ===============================

export const getProjectVoiceSessions = async (
  projectId: string,
  userId: string
): Promise<VoiceSession[]> => {
  const { data, error } = await supabase
    .from('voice_sessions')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createVoiceSession = async (
  session: Omit<VoiceSession, 'id' | 'created_at'>
): Promise<VoiceSession> => {
  const { data, error } = await supabase
    .from('voice_sessions')
    .insert(session)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateVoiceSession = async (
  sessionId: string,
  updates: Partial<Omit<VoiceSession, 'id' | 'user_id' | 'project_id' | 'created_at'>>
): Promise<VoiceSession> => {
  const { data, error } = await supabase
    .from('voice_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ===============================
// Chat Messages Management
// ===============================

export const getLectureChatMessages = async (lectureId: string): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('lecture_id', lectureId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const createChatMessage = async (
  message: Omit<ChatMessage, 'id' | 'created_at'>
): Promise<ChatMessage> => {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert(message)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ===============================
// File Storage Management
// ===============================

export const uploadFile = async (
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string,
  file: File
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS[bucket])
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;
  return data.path;
};

export const getFileUrl = (
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string
): string => {
  const { data } = supabase.storage
    .from(STORAGE_BUCKETS[bucket])
    .getPublicUrl(path);

  return data.publicUrl;
};

export const deleteFile = async (
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string
): Promise<void> => {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS[bucket])
    .remove([path]);

  if (error) throw error;
};

// ===============================
// Learning Analytics
// ===============================

export const getUserLearningAnalytics = async (
  userId: string,
  projectId?: string,
  metricType?: string
): Promise<LearningAnalytics[]> => {
  let query = supabase
    .from('learning_analytics')
    .select('*')
    .eq('user_id', userId);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }
  if (metricType) {
    query = query.eq('metric_type', metricType);
  }

  const { data, error } = await query.order('recorded_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createLearningAnalytics = async (
  analytics: Omit<LearningAnalytics, 'id' | 'created_at'>
): Promise<LearningAnalytics> => {
  const { data, error } = await supabase
    .from('learning_analytics')
    .insert(analytics)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ===============================
// Enhanced Assessment and Progress Management
// ===============================

export const saveAssessmentResult = async (
  result: Omit<AssessmentResult, 'id' | 'created_at'>
): Promise<AssessmentResult> => {
  const { data, error } = await supabase
    .from('assessment_results')
    .insert(result)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getAssessmentResultsByContent = async (
  userId: string,
  projectId: string,
  contentHash?: string
): Promise<AssessmentResult[]> => {
  let query = supabase
    .from('assessment_results')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (contentHash) {
    query = query.eq('content_hash', contentHash);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const getUserProgress = async (
  userId: string,
  projectId: string
): Promise<any> => {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
};

export const updateUserProgress = async (
  userId: string,
  projectId: string,
  progress: {
    weak_topics?: string[];
    strong_topics?: string[];
    total_tests?: number;
    average_score?: number;
    best_score?: number;
    last_test_score?: number;
    improvement_trend?: number;
    study_recommendations?: string[];
  }
): Promise<any> => {
  const { data, error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: userId,
      project_id: projectId,
      ...progress,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getCacheMetadata = async (
  contentHash: string,
  contentType: string
): Promise<any> => {
  const { data, error } = await supabase
    .from('content_cache_metadata')
    .select('*')
    .eq('content_hash', contentHash)
    .eq('content_type', contentType)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const saveCacheMetadata = async (
  metadata: {
    content_hash: string;
    content_type: string;
    source_title: string;
    source_type: string;
    user_id: string;
    project_id: string;
    cache_data: any;
    expires_at?: string;
  }
): Promise<any> => {
  const { data, error } = await supabase
    .from('content_cache_metadata')
    .upsert(metadata)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const cleanupExpiredCache = async (): Promise<void> => {
  const { error } = await supabase
    .from('content_cache_metadata')
    .delete()
    .lt('expires_at', new Date().toISOString());

  if (error) throw error;
};

// Default export with all methods
export const databaseService = {
  // User methods
  getCurrentUser,
  updateUserProfile,
  createUserProfile,
  ensureUserProfile,
  
  // Project methods
  getUserProjects,
  getProjects: getUserProjects, // Alias for consistency
  createProject,
  updateProject,
  deleteProject,
  getProject,
  
  // Content methods
  getProjectContentSources,
  getContentSources,
  createContentSource,
  updateContentSource,
  deleteContentSource,
  
  // Lecture methods
  getProjectLectureSessions,
  createLectureSession,
  updateLectureSession,
  deleteLectureSession,
  
  // Learning materials methods
  getProjectLearningMaterials,
  getLearningMaterials,
  createLearningMaterial,
  generateLearningMaterialsFromLecture,
  updateLearningMaterial,
  deleteLearningMaterial,
  
  // Assessment methods
  createAssessmentResult,
  getUserAssessmentResults,
  getAssessmentResults: getUserAssessmentResults, // Alias for project-specific access
  saveAssessmentResult,
  getAssessmentResultsByContent,
  
  // Progress tracking methods
  getUserProgress,
  updateUserProgress,
  
  // Cache management methods
  getCacheMetadata,
  saveCacheMetadata,
  cleanupExpiredCache,
  
  // Voice session methods
  getProjectVoiceSessions,
  createVoiceSession,
  updateVoiceSession,
  
  // Chat methods
  getLectureChatMessages,
  createChatMessage,
  
  // Analytics methods
  getUserLearningAnalytics,
  createLearningAnalytics
};

export default databaseService;