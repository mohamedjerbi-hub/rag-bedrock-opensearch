-- =============================================================================
-- SQL MIGRATION SCHEMA — DOCUMENT CHUNKS (pgvector)
-- MJ Studio RAG (Mohamed Jerbi - ENI Carthage x Smartovate)
--
-- Ce fichier documente la structure réelle de la table document_chunks
-- telle qu'elle existe dans Supabase. Il est versionné dans le repo à
-- des fins de traçabilité et de documentation ; il ne modifie pas la
-- base de données.
--
-- Prérequis : extension pgvector activée dans Supabase
--   CREATE EXTENSION IF NOT EXISTS vector;
-- =============================================================================

-- 1. EXTENSION PGVECTOR (à activer une seule fois par base)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- 2. TABLE PRINCIPALE : document_chunks
--
-- Chaque ligne représente un chunk de texte extrait d'un document,
-- accompagné de son embedding vectoriel (1024 dimensions).
-- Le moteur RAG hybride utilise cette table pour la recherche sémantique
-- via la fonction RPC `search_chunks` (similarité cosinus).
--
-- Correspondance avec supabaseStore.ts → sbInsertChunks() :
--   document_id   ← c.document_id
--   document_name ← c.document_name
--   page_number   ← c.page        (nullable si page inconnue)
--   chunk_index   ← c.chunk_index
--   content       ← c.text
--   embedding     ← c.embedding   (vecteur float32[1024] produit par
--                                   Cohere embed-multilingual-v3.0 ou
--                                   Azure OpenAI text-embedding-3-small)

CREATE TABLE IF NOT EXISTS public.document_chunks (
    chunk_id      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id   UUID         NOT NULL
                               REFERENCES public.documents(document_id)
                               ON DELETE CASCADE,
    document_name TEXT         NOT NULL,
    page_number   INTEGER,                       -- nullable (ex: chunk extrait sans info de page)
    chunk_index   INTEGER      NOT NULL,         -- position ordinale du chunk dans le document
    content       TEXT         NOT NULL,         -- texte brut du chunk
    embedding     vector(1024)                   -- vecteur produit par embed-multilingual-v3.0
);

-- 3. INDEX IVFFLAT POUR LA RECHERCHE PAR SIMILARITÉ COSINUS
--
-- Utilisé par la fonction RPC `search_chunks` via pgvector.
-- L'opérateur `vector_cosine_ops` correspond à 1 - cosine_similarity.
-- Paramètre lists = 100 : valeur recommandée pour ~100k chunks.
-- À reconstruire avec VACUUM ANALYZE après un import massif.

CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
    ON public.document_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- 4. INDEX SECONDAIRES POUR LES REQUÊTES FILTRÉES

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
    ON public.document_chunks (document_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_chunk_index
    ON public.document_chunks (document_id, chunk_index);

-- 5. FONCTION RPC DE RECHERCHE SÉMANTIQUE
--
-- Appelée depuis supabaseStore.ts → sbSearchChunks() via :
--   sb.rpc('search_chunks', { query_embedding, match_count, score_threshold })
--
-- Retourne les chunks dont la similarité cosinus dépasse score_threshold,
-- triés par score décroissant, limités à match_count résultats.

CREATE OR REPLACE FUNCTION public.search_chunks(
    query_embedding  vector(1024),
    match_count      integer  DEFAULT 8,
    score_threshold  float    DEFAULT 0.25
)
RETURNS TABLE (
    chunk_id      UUID,
    document_id   UUID,
    document_name TEXT,
    page_number   INTEGER,
    chunk_index   INTEGER,
    content       TEXT,
    score         FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.chunk_id,
        dc.document_id,
        dc.document_name,
        dc.page_number,
        dc.chunk_index,
        dc.content,
        1 - (dc.embedding <=> query_embedding) AS score
    FROM public.document_chunks dc
    WHERE 1 - (dc.embedding <=> query_embedding) >= score_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 6. PERMISSIONS
GRANT SELECT, INSERT, DELETE ON TABLE public.document_chunks TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_chunks TO authenticated, service_role;
