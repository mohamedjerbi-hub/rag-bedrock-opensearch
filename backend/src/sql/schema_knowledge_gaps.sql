-- =============================================================================
-- SQL MIGRATION SCHEMA — KNOWLEDGE GAPS & COMMENTS
-- MJ Studio RAG (Mohamed Jerbi - ENI Carthage x Smartovate)
-- =============================================================================

-- 1. SECURITY DEFINER ROLE FUNCTION
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = required_role
      AND active = true
  );
END;
$$;

-- 2. CREATE TABLE knowledge_gaps
CREATE TABLE IF NOT EXISTS public.knowledge_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    conversation_id TEXT NOT NULL DEFAULT 'default',
    question TEXT NOT NULL,
    generated_answer TEXT,
    retrieved_sources JSONB DEFAULT '[]'::jsonb,
    issue_type TEXT NOT NULL CHECK (issue_type IN ('information_absente', 'reponse_incorrecte', 'document_obsolete', 'reponse_imprecise', 'mauvais_document_cite')),
    priority TEXT NOT NULL DEFAULT 'normale' CHECK (priority IN ('basse', 'normale', 'haute', 'bloquante')),
    user_comment TEXT NOT NULL,
    expected_answer TEXT,
    notify_user BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'en_cours', 'resolu', 'rejete', 'doublon')),
    assigned_to TEXT,
    resolution_note TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    linked_doc_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 3. CREATE TABLE knowledge_gap_comments
CREATE TABLE IF NOT EXISTS public.knowledge_gap_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gap_id UUID NOT NULL REFERENCES public.knowledge_gaps(id) ON DELETE CASCADE,
    author_email TEXT NOT NULL,
    author_name TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 4. INDEXES FOR FAST FILTERING AND SEARCHING
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_status ON public.knowledge_gaps(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_priority ON public.knowledge_gaps(priority);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_created_at ON public.knowledge_gaps(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_user_email ON public.knowledge_gaps(user_email);
CREATE INDEX IF NOT EXISTS idx_knowledge_gap_comments_gap_id ON public.knowledge_gap_comments(gap_id);

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_gap_comments ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES FOR knowledge_gaps
-- Users can insert their own gaps
CREATE POLICY "Users can create gaps" ON public.knowledge_gaps
    FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email OR user_id = auth.uid()::text);

-- Users can read ONLY their own gaps
CREATE POLICY "Users view own gaps" ON public.knowledge_gaps
    FOR SELECT USING (
        auth.jwt() ->> 'email' = user_email OR 
        user_id = auth.uid()::text OR 
        public.has_role('admin') OR 
        public.has_role('editor')
    );

-- Editors and Admins can update gaps
CREATE POLICY "Editors/Admins update gaps" ON public.knowledge_gaps
    FOR UPDATE USING (public.has_role('admin') OR public.has_role('editor'));

-- Only Admins can delete gaps
CREATE POLICY "Only Admins delete gaps" ON public.knowledge_gaps
    FOR DELETE USING (public.has_role('admin'));

-- 7. RLS POLICIES FOR knowledge_gap_comments (Editors & Admins only)
CREATE POLICY "Editors/Admins view comments" ON public.knowledge_gap_comments
    FOR SELECT USING (public.has_role('admin') OR public.has_role('editor'));

CREATE POLICY "Editors/Admins create comments" ON public.knowledge_gap_comments
    FOR INSERT WITH CHECK (public.has_role('admin') OR public.has_role('editor'));

-- 8. PERMISSIONS & GRANTS
GRANT ALL ON TABLE public.knowledge_gaps TO authenticated, service_role;
GRANT ALL ON TABLE public.knowledge_gap_comments TO authenticated, service_role;
