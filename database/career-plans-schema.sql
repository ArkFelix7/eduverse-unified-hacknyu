-- Career Plans Database Schema Extension
-- Additional tables for SkillMap integration into EduVerse Unified

-- Career Plans (Main table for SkillMap functionality)
CREATE TABLE IF NOT EXISTS public.career_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL, -- Career goal title (e.g., "Software Engineer", "Data Scientist")
    description TEXT, -- Optional description
    status TEXT CHECK (status IN ('draft', 'active', 'completed', 'archived')) DEFAULT 'draft',
    
    -- User preferences
    career_goal TEXT NOT NULL,
    skill_level TEXT NOT NULL,
    time_commitment TEXT NOT NULL,
    learning_style TEXT NOT NULL,
    learning_medium TEXT NOT NULL,
    timeline TEXT NOT NULL,
    
    -- Assessment results
    assessment_answers JSONB DEFAULT '[]', -- Array of assessment Q&A
    assessed_skill_level TEXT, -- Final assessed level after quiz
    
    -- Generated roadmap data (complete JSON)
    roadmap_data JSONB NOT NULL, -- Complete RoadmapData structure
    
    -- Progress tracking
    weekly_progress JSONB DEFAULT '{}', -- Tracks completed weeks/tasks
    monthly_progress JSONB DEFAULT '{}', -- Tracks completed milestones
    overall_progress_percentage INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Career Plan Progress Tracking (Detailed tracking)
CREATE TABLE IF NOT EXISTS public.career_plan_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    career_plan_id UUID REFERENCES public.career_plans(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Progress type
    progress_type TEXT CHECK (progress_type IN ('weekly_task', 'monthly_milestone', 'project', 'resource', 'skill')) NOT NULL,
    
    -- Progress details
    item_id TEXT NOT NULL, -- Week number, month number, project index, etc.
    item_title TEXT NOT NULL,
    item_description TEXT,
    
    -- Completion status
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    notes TEXT, -- User notes about completion
    
    -- Metadata
    metadata JSONB DEFAULT '{}', -- Additional data like difficulty, estimated time, etc.
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Career Plan Resources (Extracted and tracked separately)
CREATE TABLE IF NOT EXISTS public.career_plan_resources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    career_plan_id UUID REFERENCES public.career_plans(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Resource details
    resource_type TEXT CHECK (resource_type IN ('course', 'youtube', 'book', 'project', 'skill')) NOT NULL,
    title TEXT NOT NULL,
    url TEXT, -- For courses and YouTube
    author TEXT, -- For books
    platform TEXT, -- For courses
    description TEXT,
    difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    
    -- Progress tracking
    is_bookmarked BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    completion_date TIMESTAMPTZ,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_notes TEXT,
    
    -- Metadata from roadmap
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Career Plan Skills Tracking
CREATE TABLE IF NOT EXISTS public.career_plan_skills (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    career_plan_id UUID REFERENCES public.career_plans(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Skill details
    skill_name TEXT NOT NULL,
    skill_description TEXT,
    skill_category TEXT CHECK (skill_category IN ('required', 'beginner', 'intermediate', 'advanced')) NOT NULL,
    
    -- Progress tracking
    current_proficiency INTEGER CHECK (current_proficiency >= 0 AND current_proficiency <= 100) DEFAULT 0,
    target_proficiency INTEGER CHECK (target_proficiency >= 0 AND target_proficiency <= 100) DEFAULT 100,
    is_priority BOOLEAN DEFAULT FALSE,
    
    -- Learning resources for this skill
    learning_resources JSONB DEFAULT '[]', -- Array of resource IDs or descriptions
    practice_projects JSONB DEFAULT '[]', -- Array of project suggestions
    
    -- Metadata
    last_practiced_date TIMESTAMPTZ,
    assessment_results JSONB DEFAULT '{}', -- Results from skill assessments
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(career_plan_id, skill_name) -- Prevent duplicate skills per plan
);

-- Career Plan Assessment Questions (Store generated questions)
CREATE TABLE IF NOT EXISTS public.career_plan_assessments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    career_plan_id UUID REFERENCES public.career_plans(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Assessment details
    questions JSONB NOT NULL, -- Array of generated questions
    user_answers JSONB NOT NULL, -- Array of user's answers
    assessment_score INTEGER, -- Score if applicable
    final_skill_level TEXT, -- AI-determined skill level
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_career_plans_user_id ON public.career_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_status ON public.career_plans(status);
CREATE INDEX IF NOT EXISTS idx_career_plan_progress_career_plan_id ON public.career_plan_progress(career_plan_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_progress_user_id ON public.career_plan_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_progress_type ON public.career_plan_progress(progress_type);
CREATE INDEX IF NOT EXISTS idx_career_plan_resources_career_plan_id ON public.career_plan_resources(career_plan_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_resources_user_id ON public.career_plan_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_resources_type ON public.career_plan_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_career_plan_skills_career_plan_id ON public.career_plan_skills(career_plan_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_skills_user_id ON public.career_plan_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_assessments_career_plan_id ON public.career_plan_assessments(career_plan_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_assessments_user_id ON public.career_plan_assessments(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE public.career_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_plan_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_plan_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_plan_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_plan_assessments ENABLE ROW LEVEL SECURITY;

-- Career Plans policies
CREATE POLICY "Users can view their own career plans" ON public.career_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own career plans" ON public.career_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own career plans" ON public.career_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own career plans" ON public.career_plans
    FOR DELETE USING (auth.uid() = user_id);

-- Career Plan Progress policies
CREATE POLICY "Users can view their own career plan progress" ON public.career_plan_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own career plan progress" ON public.career_plan_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own career plan progress" ON public.career_plan_progress
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own career plan progress" ON public.career_plan_progress
    FOR DELETE USING (auth.uid() = user_id);

-- Career Plan Resources policies
CREATE POLICY "Users can view their own career plan resources" ON public.career_plan_resources
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own career plan resources" ON public.career_plan_resources
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own career plan resources" ON public.career_plan_resources
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own career plan resources" ON public.career_plan_resources
    FOR DELETE USING (auth.uid() = user_id);

-- Career Plan Skills policies
CREATE POLICY "Users can view their own career plan skills" ON public.career_plan_skills
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own career plan skills" ON public.career_plan_skills
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own career plan skills" ON public.career_plan_skills
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own career plan skills" ON public.career_plan_skills
    FOR DELETE USING (auth.uid() = user_id);

-- Career Plan Assessments policies
CREATE POLICY "Users can view their own career plan assessments" ON public.career_plan_assessments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own career plan assessments" ON public.career_plan_assessments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own career plan assessments" ON public.career_plan_assessments
    FOR UPDATE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER set_timestamp_career_plans
    BEFORE UPDATE ON public.career_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_timestamp_career_plan_progress
    BEFORE UPDATE ON public.career_plan_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_timestamp_career_plan_resources
    BEFORE UPDATE ON public.career_plan_resources
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_timestamp_career_plan_skills
    BEFORE UPDATE ON public.career_plan_skills
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function to calculate overall progress for a career plan
CREATE OR REPLACE FUNCTION public.calculate_career_plan_progress(plan_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_items INTEGER;
    completed_items INTEGER;
    progress_percentage INTEGER;
BEGIN
    -- Count total and completed progress items
    SELECT 
        COUNT(*), 
        COUNT(*) FILTER (WHERE is_completed = TRUE)
    INTO total_items, completed_items
    FROM public.career_plan_progress 
    WHERE career_plan_id = plan_id;
    
    IF total_items > 0 THEN
        progress_percentage := ROUND((completed_items::DECIMAL / total_items) * 100);
    ELSE
        progress_percentage := 0;
    END IF;
    
    -- Update the career plan with calculated progress
    UPDATE public.career_plans 
    SET 
        overall_progress_percentage = progress_percentage,
        updated_at = NOW()
    WHERE id = plan_id;
    
    RETURN progress_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extract and populate resources from roadmap data
CREATE OR REPLACE FUNCTION public.populate_career_plan_resources(plan_id UUID)
RETURNS INTEGER AS $$
DECLARE
    roadmap JSONB;
    resource JSONB;
    project JSONB;
    skill JSONB;
    inserted_count INTEGER := 0;
BEGIN
    -- Get the roadmap data
    SELECT roadmap_data INTO roadmap 
    FROM public.career_plans 
    WHERE id = plan_id;
    
    IF roadmap IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Insert courses
    FOR resource IN SELECT * FROM jsonb_array_elements(roadmap->'resources'->'courses')
    LOOP
        INSERT INTO public.career_plan_resources (
            career_plan_id, user_id, resource_type, title, url, platform, description
        )
        SELECT 
            plan_id,
            cp.user_id,
            'course',
            resource->>'title',
            resource->>'url',
            resource->>'platform',
            COALESCE(resource->>'description', '')
        FROM public.career_plans cp
        WHERE cp.id = plan_id;
        
        inserted_count := inserted_count + 1;
    END LOOP;
    
    -- Insert YouTube channels
    FOR resource IN SELECT * FROM jsonb_array_elements(roadmap->'resources'->'youtube')
    LOOP
        INSERT INTO public.career_plan_resources (
            career_plan_id, user_id, resource_type, title, url, description
        )
        SELECT 
            plan_id,
            cp.user_id,
            'youtube',
            resource->>'channel',
            resource->>'url',
            resource->>'description'
        FROM public.career_plans cp
        WHERE cp.id = plan_id;
        
        inserted_count := inserted_count + 1;
    END LOOP;
    
    -- Insert books
    FOR resource IN SELECT * FROM jsonb_array_elements(roadmap->'resources'->'books')
    LOOP
        INSERT INTO public.career_plan_resources (
            career_plan_id, user_id, resource_type, title, author
        )
        SELECT 
            plan_id,
            cp.user_id,
            'book',
            resource->>'title',
            resource->>'author'
        FROM public.career_plans cp
        WHERE cp.id = plan_id;
        
        inserted_count := inserted_count + 1;
    END LOOP;
    
    -- Insert projects (all difficulty levels)
    FOR resource IN SELECT * FROM jsonb_array_elements(
        (roadmap->'projects'->'beginner') || 
        (roadmap->'projects'->'intermediate') || 
        (roadmap->'projects'->'advanced')
    )
    LOOP
        INSERT INTO public.career_plan_resources (
            career_plan_id, user_id, resource_type, title, description, 
            difficulty_level, metadata
        )
        SELECT 
            plan_id,
            cp.user_id,
            'project',
            resource->>'title',
            resource->>'description',
            CASE 
                WHEN resource IN (SELECT * FROM jsonb_array_elements(roadmap->'projects'->'beginner')) THEN 'beginner'
                WHEN resource IN (SELECT * FROM jsonb_array_elements(roadmap->'projects'->'intermediate')) THEN 'intermediate'
                ELSE 'advanced'
            END,
            jsonb_build_object(
                'requirements', resource->'requirements',
                'outcome', resource->>'outcome'
            )
        FROM public.career_plans cp
        WHERE cp.id = plan_id;
        
        inserted_count := inserted_count + 1;
    END LOOP;
    
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to populate skills from roadmap data
CREATE OR REPLACE FUNCTION public.populate_career_plan_skills(plan_id UUID)
RETURNS INTEGER AS $$
DECLARE
    roadmap JSONB;
    skill JSONB;
    inserted_count INTEGER := 0;
BEGIN
    -- Get the roadmap data
    SELECT roadmap_data INTO roadmap 
    FROM public.career_plans 
    WHERE id = plan_id;
    
    IF roadmap IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Insert required skills
    FOR skill IN SELECT * FROM jsonb_array_elements(roadmap->'requiredSkills')
    LOOP
        INSERT INTO public.career_plan_skills (
            career_plan_id, user_id, skill_name, skill_description, 
            skill_category, is_priority
        )
        SELECT 
            plan_id,
            cp.user_id,
            skill->>'skill',
            skill->>'description',
            'required',
            TRUE
        FROM public.career_plans cp
        WHERE cp.id = plan_id;
        
        inserted_count := inserted_count + 1;
    END LOOP;
    
    -- Insert beginner skills
    FOR skill IN SELECT * FROM jsonb_array_elements(roadmap->'skillBreakdown'->'beginner')
    LOOP
        INSERT INTO public.career_plan_skills (
            career_plan_id, user_id, skill_name, skill_description, skill_category
        )
        SELECT 
            plan_id,
            cp.user_id,
            skill->>'skill',
            skill->>'description',
            'beginner'
        FROM public.career_plans cp
        WHERE cp.id = plan_id;
        
        inserted_count := inserted_count + 1;
    END LOOP;
    
    -- Insert intermediate skills
    FOR skill IN SELECT * FROM jsonb_array_elements(roadmap->'skillBreakdown'->'intermediate')
    LOOP
        INSERT INTO public.career_plan_skills (
            career_plan_id, user_id, skill_name, skill_description, skill_category
        )
        SELECT 
            plan_id,
            cp.user_id,
            skill->>'skill',
            skill->>'description',
            'intermediate'
        FROM public.career_plans cp
        WHERE cp.id = plan_id;
        
        inserted_count := inserted_count + 1;
    END LOOP;
    
    -- Insert advanced skills
    FOR skill IN SELECT * FROM jsonb_array_elements(roadmap->'skillBreakdown'->'advanced')
    LOOP
        INSERT INTO public.career_plan_skills (
            career_plan_id, user_id, skill_name, skill_description, skill_category
        )
        SELECT 
            plan_id,
            cp.user_id,
            skill->>'skill',
            skill->>'description',
            'advanced'
        FROM public.career_plans cp
        WHERE cp.id = plan_id;
        
        inserted_count := inserted_count + 1;
    END LOOP;
    
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to populate progress tracking from roadmap data
CREATE OR REPLACE FUNCTION public.populate_career_plan_progress(plan_id UUID)
RETURNS INTEGER AS $$
DECLARE
    roadmap JSONB;
    week_plan JSONB;
    month_plan JSONB;
    inserted_count INTEGER := 0;
BEGIN
    -- Get the roadmap data
    SELECT roadmap_data INTO roadmap 
    FROM public.career_plans 
    WHERE id = plan_id;
    
    IF roadmap IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Insert weekly tasks
    FOR week_plan IN SELECT * FROM jsonb_array_elements(roadmap->'weeklyPlan')
    LOOP
        INSERT INTO public.career_plan_progress (
            career_plan_id, user_id, progress_type, item_id, 
            item_title, item_description, metadata
        )
        SELECT 
            plan_id,
            cp.user_id,
            'weekly_task',
            'week_' || (week_plan->>'week'),
            'Week ' || (week_plan->>'week') || ': ' || (week_plan->>'goal'),
            week_plan->>'goal',
            jsonb_build_object(
                'week', week_plan->'week',
                'tasks', week_plan->'tasks'
            )
        FROM public.career_plans cp
        WHERE cp.id = plan_id;
        
        inserted_count := inserted_count + 1;
    END LOOP;
    
    -- Insert monthly milestones
    FOR month_plan IN SELECT * FROM jsonb_array_elements(roadmap->'monthlyTimeline')
    LOOP
        INSERT INTO public.career_plan_progress (
            career_plan_id, user_id, progress_type, item_id, 
            item_title, item_description, metadata
        )
        SELECT 
            plan_id,
            cp.user_id,
            'monthly_milestone',
            'month_' || (month_plan->>'month'),
            'Month ' || (month_plan->>'month') || ': ' || (month_plan->>'milestone'),
            month_plan->>'milestone',
            jsonb_build_object(
                'month', month_plan->'month',
                'focus', month_plan->'focus'
            )
        FROM public.career_plans cp
        WHERE cp.id = plan_id;
        
        inserted_count := inserted_count + 1;
    END LOOP;
    
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;