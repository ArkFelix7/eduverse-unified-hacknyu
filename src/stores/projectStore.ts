import { create } from 'zustand';
import type {
  Project,
  ContentSource,
  LectureSession,
  LearningMaterial,
  RecordingState
} from '../types';
import {
  getUserProjects,
  getProjectContentSources,
  getProjectLectureSessions,
  getProjectLearningMaterials,
  createContentSource,
  createLectureSession,
  createLearningMaterial
} from '../services/databaseService';

interface ProjectState {
  // Current state
  currentProject: Project | null;
  projects: Project[];
  contentSources: ContentSource[];
  lectureSessions: LectureSession[];
  learningMaterials: LearningMaterial[];
  
  // Loading states
  loading: boolean;
  recordingState: RecordingState;
  
  // Actions
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  setContentSources: (sources: ContentSource[]) => void;
  setLectureSessions: (sessions: LectureSession[]) => void;
  setLearningMaterials: (materials: LearningMaterial[]) => void;
  setLoading: (loading: boolean) => void;
  setRecordingState: (state: RecordingState) => void;
  
  // Async actions
  loadUserProjects: (userId: string) => Promise<void>;
  loadProjectData: (projectId: string) => Promise<void>;
  addContentSource: (source: Omit<ContentSource, 'id' | 'created_at'>) => Promise<void>;
  addLectureSession: (session: Omit<LectureSession, 'id' | 'created_at'>) => Promise<LectureSession>;
  addLearningMaterial: (material: Omit<LearningMaterial, 'id' | 'created_at'>) => Promise<LearningMaterial>;
  
  // Clear actions
  clearProject: () => void;
  clearAll: () => void;
}

export const useProjectStore = create<ProjectState>((set, _get) => ({
  // Initial state
  currentProject: null,
  projects: [],
  contentSources: [],
  lectureSessions: [],
  learningMaterials: [],
  loading: false,
  recordingState: 'idle',
  
  // Basic setters
  setCurrentProject: (project) => set({ currentProject: project }),
  setProjects: (projects) => set({ projects }),
  setContentSources: (sources) => set({ contentSources: sources }),
  setLectureSessions: (sessions) => set({ lectureSessions: sessions }),
  setLearningMaterials: (materials) => set({ learningMaterials: materials }),
  setLoading: (loading) => set({ loading }),
  setRecordingState: (recordingState) => set({ recordingState }),
  
  // Async actions
  loadUserProjects: async (userId: string) => {
    set({ loading: true });
    try {
      const projects = await getUserProjects(userId);
      set({ projects });
    } catch (error) {
      console.error('Failed to load user projects:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  
  loadProjectData: async (projectId: string) => {
    set({ loading: true });
    try {
      const [sources, sessions, materials] = await Promise.all([
        getProjectContentSources(projectId),
        getProjectLectureSessions(projectId),
        getProjectLearningMaterials(projectId)
      ]);
      
      set({
        contentSources: sources,
        lectureSessions: sessions,
        learningMaterials: materials
      });
    } catch (error) {
      console.error('Failed to load project data:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  
  addContentSource: async (source) => {
    try {
      const newSource = await createContentSource(source);
      set((state) => ({
        contentSources: [newSource, ...state.contentSources]
      }));
    } catch (error) {
      console.error('Failed to add content source:', error);
      throw error;
    }
  },
  
  addLectureSession: async (session) => {
    try {
      const newSession = await createLectureSession(session);
      set((state) => ({
        lectureSessions: [newSession, ...state.lectureSessions]
      }));
      return newSession;
    } catch (error) {
      console.error('Failed to add lecture session:', error);
      throw error;
    }
  },
  
  addLearningMaterial: async (material) => {
    try {
      const newMaterial = await createLearningMaterial(material);
      set((state) => ({
        learningMaterials: [newMaterial, ...state.learningMaterials]
      }));
      return newMaterial;
    } catch (error) {
      console.error('Failed to add learning material:', error);
      throw error;
    }
  },
  
  // Clear actions
  clearProject: () => set({
    currentProject: null,
    contentSources: [],
    lectureSessions: [],
    learningMaterials: [],
    recordingState: 'idle'
  }),
  
  clearAll: () => set({
    currentProject: null,
    projects: [],
    contentSources: [],
    lectureSessions: [],
    learningMaterials: [],
    loading: false,
    recordingState: 'idle'
  })
}));