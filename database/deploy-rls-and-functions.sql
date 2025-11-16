-- Deploy RLS Policies and Functions for EduVerse Unified Platform
-- Run this AFTER deploy-enhanced-schema.sql

-- 🔐 STEP 3: Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_cache_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_analytics ENABLE ROW LEVEL SECURITY;

-- 🛡️ STEP 4: Create RLS Policies

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view their own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- Content sources policies
CREATE POLICY "Users can view content sources of their projects" ON public.content_sources
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create content sources in their projects" ON public.content_sources
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update content sources in their projects" ON public.content_sources
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete content sources in their projects" ON public.content_sources
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

-- Lecture sessions policies
CREATE POLICY "Users can view lecture sessions of their projects" ON public.lecture_sessions
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create lecture sessions in their projects" ON public.lecture_sessions
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update lecture sessions in their projects" ON public.lecture_sessions
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete lecture sessions in their projects" ON public.lecture_sessions
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

-- Learning materials policies
CREATE POLICY "Users can view learning materials of their projects" ON public.learning_materials
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create learning materials in their projects" ON public.learning_materials
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update learning materials in their projects" ON public.learning_materials
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete learning materials in their projects" ON public.learning_materials
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

-- Enhanced Assessment results policies
CREATE POLICY "Users can view their own assessment results" ON public.assessment_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assessment results" ON public.assessment_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assessment results" ON public.assessment_results
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assessment results" ON public.assessment_results
    FOR DELETE USING (auth.uid() = user_id);

-- User progress policies (NEW)
CREATE POLICY "Users can view their own progress" ON public.user_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress" ON public.user_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON public.user_progress
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" ON public.user_progress
    FOR DELETE USING (auth.uid() = user_id);

-- Content cache metadata policies (NEW)
CREATE POLICY "Users can view their own cache metadata" ON public.content_cache_metadata
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cache metadata" ON public.content_cache_metadata
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cache metadata" ON public.content_cache_metadata
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cache metadata" ON public.content_cache_metadata
    FOR DELETE USING (auth.uid() = user_id);

-- Voice sessions policies
CREATE POLICY "Users can view their own voice sessions" ON public.voice_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice sessions" ON public.voice_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice sessions" ON public.voice_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice sessions" ON public.voice_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can view chat messages for their lectures" ON public.chat_messages
    FOR SELECT USING (
        lecture_id IN (
            SELECT ls.id FROM public.lecture_sessions ls
            JOIN public.projects p ON ls.project_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create chat messages for their lectures" ON public.chat_messages
    FOR INSERT WITH CHECK (
        lecture_id IN (
            SELECT ls.id FROM public.lecture_sessions ls
            JOIN public.projects p ON ls.project_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

-- Learning analytics policies
CREATE POLICY "Users can view their own learning analytics" ON public.learning_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own learning analytics" ON public.learning_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 🔧 STEP 5: Create utility functions

-- Function for updating timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.content_cache_metadata 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update learning material access
CREATE OR REPLACE FUNCTION public.update_material_access()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_accessed = NOW();
    NEW.access_count = OLD.access_count + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🚀 STEP 6: Create triggers

-- Triggers for updated_at
CREATE TRIGGER set_timestamp_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_timestamp_projects
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_timestamp_user_progress
    BEFORE UPDATE ON public.user_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for learning materials access tracking
CREATE TRIGGER update_material_access_trigger
    BEFORE UPDATE ON public.learning_materials
    FOR EACH ROW
    WHEN (OLD.last_accessed IS DISTINCT FROM NEW.last_accessed)
    EXECUTE FUNCTION public.update_material_access();

-- 🎉 FINAL STATUS
SELECT 
    'Database deployment complete! 🎉' as status,
    'Enhanced schema with adaptive testing and content caching is ready!' as message,
    NOW() as deployed_at;