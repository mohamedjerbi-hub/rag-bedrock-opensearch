import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { CohereClient } from 'cohere-ai';
import { parseDocumentBuffer } from '../services/parser';
import { getSupabaseClient } from '../services/supabaseClient';
import {
  sbUpsertDocument, sbGetDocuments, sbRemoveDocument, sbCountDocuments,
  sbInsertChunks, sbGetDocumentContent, sbSearchChunks, sbLogQuery
} from '../services/supabaseStore';


let cohere: CohereClient | null = null;
function getCohereClient() {
  if (!cohere && process.env.COHERE_API_KEY) {
    cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
  }
  return cohere;
}

let azureOpenAI: any = null;
function getAzureOpenAIClient() {
  return azureOpenAI;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type DocumentStatus = 'pending' | 'extracting' | 'chunking' | 'vectorizing' | 'indexed' | 'failed';

export interface StoredDocument {
  document_id: string;
  name: string;
  is_folder: boolean;
  parent_id: string | null;
  size_bytes: number;
  mime_type: string;
  status: DocumentStatus;
  chunk_count: number;
  error_message?: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface StoredChunk {
  chunk_id: string;
  document_id: string;
  document_name: string;
  page: number;
  section?: string;
  chunk_index: number;
  text: string;
  embedding: number[];
}

export interface Remark {
  id: string;
  question: string;
  timestamp: string;
  status: 'pending' | 'handled';
}

export interface StoredQuery {
  query_id: string;
  question: string;
  answer?: string;
  latency_ms?: number;
  user?: string;
  timestamp: string;
  sources?: any[];
}

// ─── Persistent JSON Database ────────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, '../../data');
const DOCS_FILE = path.join(DATA_DIR, 'documents.json');
const CHUNKS_FILE = path.join(DATA_DIR, 'chunks.json');
const REMARKS_FILE = path.join(DATA_DIR, 'remarks.json');
const QUERIES_FILE = path.join(DATA_DIR, 'queries.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON<T>(filePath: string, defaultVal: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    }
  } catch (_) {}
  return defaultVal;
}

function writeJSON<T>(filePath: string, data: T): void {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Embeddings ───────────────────────────────────────────────────────────────

const VECTOR_DIM = 512;

function deterministicEmbedding(text: string): number[] {
  const hash = crypto.createHash('sha256').update(text).digest();
  const vec: number[] = [];
  for (let i = 0; i < VECTOR_DIM; i++) {
    vec.push((hash[i % hash.length] / 255.0) * 2 - 1.0);
  }
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map(v => v / (mag || 1));
}

async function getEmbedding(text: string): Promise<number[]> {
  const azure = getAzureOpenAIClient();
  if (azure) {
    try {
      const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-small';
      const result = await azure.getEmbeddings(deployment, [text]);
      if (result.data?.[0]?.embedding) return result.data[0].embedding;
    } catch (e: any) {
      console.error('[Azure OpenAI] Embedding error:', e?.message);
    }
  }

  const client = getCohereClient();
  if (client) {
    try {
      const resp = await client.embed({
        texts: [text],
        model: 'embed-multilingual-v3.0',
        inputType: 'search_document'
      });
      if (resp.embeddings && Array.isArray(resp.embeddings)) {
        return resp.embeddings[0] as number[];
      }
    } catch (e) {
      console.error('[Cohere] Embedding error:', e);
    }
  }

  return deterministicEmbedding(text);
}

async function getQueryEmbedding(text: string): Promise<number[]> {
  const azure = getAzureOpenAIClient();
  if (azure) {
    try {
      const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-small';
      const result = await azure.getEmbeddings(deployment, [text]);
      if (result.data?.[0]?.embedding) return result.data[0].embedding;
    } catch (e: any) {
      console.error('[Azure OpenAI] Query embedding error:', e?.message);
    }
  }

  const client = getCohereClient();
  if (client) {
    try {
      const resp = await client.embed({
        texts: [text],
        model: 'embed-multilingual-v3.0',
        inputType: 'search_query'
      });
      if (resp.embeddings && Array.isArray(resp.embeddings)) {
        return resp.embeddings[0] as number[];
      }
    } catch (e) {
      console.error('[Cohere] Query embedding error:', e);
    }
  }

  return deterministicEmbedding(text);
}

// ─── Cosine Similarity ────────────────────────────────────────────────────────

function cosineSim(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom ? dot / denom : 0;
}

// ─── Keyword / Full-text search (BM25-inspired in-memory) ────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

function keywordScore(queryTokens: string[], docText: string): number {
  const docTokens = tokenize(docText);
  const docFreq: Record<string, number> = {};
  for (const t of docTokens) docFreq[t] = (docFreq[t] || 0) + 1;

  let score = 0;
  for (const qt of queryTokens) {
    if (docFreq[qt]) {
      score += Math.log(1 + docFreq[qt]);
    }
  }
  // Normalize by doc length
  return score / (1 + Math.log(1 + docTokens.length));
}

// ─── RRF (Reciprocal Rank Fusion) ────────────────────────────────────────────

function reciprocalRankFusion(
  vectorRanked: string[],
  keywordRanked: string[],
  k = 60
): Map<string, number> {
  const scores = new Map<string, number>();

  for (let i = 0; i < vectorRanked.length; i++) {
    const id = vectorRanked[i];
    scores.set(id, (scores.get(id) || 0) + 1 / (k + i + 1));
  }
  for (let i = 0; i < keywordRanked.length; i++) {
    const id = keywordRanked[i];
    scores.set(id, (scores.get(id) || 0) + 1 / (k + i + 1));
  }

  return scores;
}

// ─── Cohere Rerank ────────────────────────────────────────────────────────────

async function cohereRerank(
  query: string,
  candidates: { chunk: StoredChunk; score: number }[],
  topN = 5
): Promise<{ chunk: StoredChunk; score: number }[]> {
  const client = getCohereClient();
  if (!client || candidates.length === 0) {
    return candidates.slice(0, topN);
  }

  try {
    const documents = candidates.map(c => c.chunk.text);
    const resp = await client.rerank({
      query,
      documents,
      model: 'rerank-multilingual-v3.0',
      topN,
    });

    const reranked: { chunk: StoredChunk; score: number }[] = [];
    for (const result of resp.results) {
      const original = candidates[result.index];
      if (original) {
        reranked.push({ chunk: original.chunk, score: result.relevanceScore });
      }
    }
    return reranked;
  } catch (e: any) {
    console.error('[Cohere] Rerank error:', e?.message);
    return candidates.slice(0, topN);
  }
}

// ─── Answer Generation ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu réponds UNIQUEMENT à partir des extraits fournis ci-dessous. Si l'information n'y est pas, dis-le clairement avec la phrase exacte : "Cette information ne figure pas dans les documents fournis."

Règles absolues :
- N'invente jamais un nom, un chiffre, une date, un montant ou une procédure.
- Si plusieurs extraits se contredisent, indique-le explicitement.
- Réponds en français, de façon directe et structurée.
- Commence par une phrase de réponse directe (une ligne), puis développe avec des listes à puces si nécessaire.
- Cite tes sources sous la forme [fichier — page/section] après chaque fait.
- Si l'information est partielle, dis ce que tu sais et ce que tu ne sais pas.`;

async function generateAnswer(
  question: string,
  chunks: StoredChunk[],
  history: { role: string; content: string }[] = []
): Promise<string> {
  if (chunks.length === 0) {
    return 'Cette information ne figure pas dans les documents fournis.';
  }

  const contextBlock = chunks
    .map((c, i) => {
      const location = c.section ? `onglet "${c.section}"` : c.page ? `page ${c.page}` : 'section inconnue';
      return `[${i + 1}] Source : ${c.document_name} — ${location}\n${c.text}`;
    })
    .join('\n\n---\n\n');

  const userMessage = `Voici les extraits de documents pertinents :\n\n${contextBlock}\n\n---\n\nQuestion : ${question}`;

  const azure = getAzureOpenAIClient();
  if (azure) {
    try {
      const deployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-4o';
      const messages = [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        ...history.map(h => ({
          role: (h.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: h.content
        })),
        { role: 'user' as const, content: userMessage }
      ];

      const resp = await azure.getChatCompletions(deployment, messages, {
        temperature: 0.1,
        maxTokens: 2500,
      });

      if (resp.choices[0]?.message?.content) {
        return resp.choices[0].message.content;
      }
    } catch (e: any) {
      console.error('[Azure OpenAI] Chat error:', e?.message);
    }
  }

  const client = getCohereClient();
  if (client) {
    const documents = chunks.map(c => {
      const location = c.section ? `onglet "${c.section}"` : `page ${c.page || 1}`;
      return { id: c.chunk_id, text: c.text, title: `${c.document_name} — ${location}` };
    });

    const chatHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'USER' as const : 'CHATBOT' as const,
      message: msg.content
    }));

    const modelsToTry = ['command-r-plus-08-2024', 'command-r-08-2024', 'command-r7b-12-2024'];

    for (const model of modelsToTry) {
      try {
        const resp = await client.chat({
          message: question,
          model,
          documents,
          chatHistory,
          preamble: SYSTEM_PROMPT,
          temperature: 0.1,
          maxTokens: 2500,
        });
        if (resp?.text) return resp.text;
      } catch (err: any) {
        // Handle rate limit / quota errors gracefully
        const msg = err?.message || '';
        if (msg.includes('402') || msg.toLowerCase().includes('credit')) {
          return '❌ Crédits API épuisés. Veuillez recharger votre compte Cohere ou configurer Azure OpenAI.';
        }
        if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
          await new Promise(r => setTimeout(r, 2000));
        }
        console.warn(`[Cohere] Modèle "${model}" indisponible (${msg}), essai du suivant…`);
      }
    }
  }

  // Final fallback: return raw extracts clearly labeled
  return (
    '⚠️ Service IA temporairement indisponible. Voici les extraits bruts trouvés :\n\n' +
    chunks.map((c, i) => {
      const loc = c.section ? `onglet "${c.section}"` : `page ${c.page || '?'}`;
      return `**[${i + 1}] ${c.document_name} — ${loc}**\n${c.text}`;
    }).join('\n\n')
  );
}

// ─── Main Engine Class ────────────────────────────────────────────────────────

export class MockEngine {
  private documents: Map<string, StoredDocument> = new Map();
  private chunks: Map<string, StoredChunk> = new Map();
  private remarks: Remark[] = [];
  private queries: StoredQuery[] = [];

  constructor() {
    ensureDataDir();
    const docsArr = readJSON<StoredDocument[]>(DOCS_FILE, []);
    const chunksArr = readJSON<StoredChunk[]>(CHUNKS_FILE, []);
    this.remarks = readJSON<Remark[]>(REMARKS_FILE, []);
    this.queries = readJSON<StoredQuery[]>(QUERIES_FILE, []);
    this.documents = new Map(docsArr.map(d => [d.document_id, d]));
    this.chunks = new Map(chunksArr.map(c => [c.chunk_id, c]));

    const sb = getSupabaseClient();
    if (sb) {
      (async () => {
        try {
          const count = await sbCountDocuments();
          if (count > 0) {
            const sbDocs = await sbGetDocuments();
            for (const d of sbDocs) {
              this.documents.set(d.document_id, d as any);
            }
            console.log(`[Engine] ✅ ${sbDocs.length} document(s) chargés depuis Supabase.`);
          } else if (this.documents.size === 0) {
            this._seedDemoFiles();
          } else {
            console.log(`[Engine] ${this.documents.size} document(s) chargés depuis la base locale.`);
          }
        } catch (e: any) {
          console.error('[Engine] Supabase init error:', e?.message);
          if (this.documents.size === 0) this._seedDemoFiles();
        }
      })();
    } else {
      if (this.documents.size === 0) {
        this._seedDemoFiles();
      } else {
        console.log(`[Engine] ${this.documents.size} document(s) chargés depuis la base locale.`);
      }
    }
  }

  private _persist() {
    writeJSON(DOCS_FILE, Array.from(this.documents.values()));
    writeJSON(CHUNKS_FILE, Array.from(this.chunks.values()));
    writeJSON(REMARKS_FILE, this.remarks);
    writeJSON(QUERIES_FILE, this.queries);
  }

  private _seedDemoFiles() {
    const demoDir = path.join(__dirname, '../../../demo_files');
    if (!fs.existsSync(demoDir)) {
      console.log('[Engine] Dossier demo_files introuvable, pas de seed.');
      return;
    }
    const supportedExts = ['.pdf', '.docx', '.xlsx', '.md', '.txt', '.csv'];
    const files = fs.readdirSync(demoDir).filter(f =>
      supportedExts.some(ext => f.toLowerCase().endsWith(ext)) && !f.startsWith('.')
    );
    if (files.length === 0) return;

    console.log(`[Engine] Indexation de ${files.length} fichier(s) depuis demo_files…`);
    (async () => {
      for (const file of files) {
        try {
          const filePath = path.join(demoDir, file);
          const buffer = fs.readFileSync(filePath);
          const ext = file.split('.').pop()?.toLowerCase() || '';
          const mimeMap: Record<string, string> = {
            pdf: 'application/pdf',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            md: 'text/markdown',
            txt: 'text/plain',
            csv: 'text/csv',
          };
          const mimeType = mimeMap[ext] || 'application/octet-stream';
          await this._ingestBuffer(file, buffer, 'system', mimeType, null);
          console.log(`  ✅ ${file}`);
        } catch (e: any) {
          console.error(`  ❌ ${file}: ${e?.message}`);
        }
      }
      this._persist();
      console.log('[Engine] Indexation demo_files terminée.');
    })().catch(console.error);
  }

  private _updateDocStatus(document_id: string, status: DocumentStatus, extra?: Partial<StoredDocument>) {
    const doc = this.documents.get(document_id);
    if (doc) {
      Object.assign(doc, { status, ...extra });
      // Persist to Supabase async
      sbUpsertDocument(doc as any).catch(() => {});
    }
  }

  private async _ingestBuffer(
    name: string,
    buffer: Buffer,
    uploadedBy: string,
    mimeType: string,
    parentId: string | null
  ): Promise<string> {
    const document_id = crypto.randomUUID();

    // Step 1: Create document record in pending state
    const doc: StoredDocument = {
      document_id,
      name,
      is_folder: false,
      parent_id: parentId,
      size_bytes: buffer.length,
      mime_type: mimeType,
      status: 'pending',
      chunk_count: 0,
      uploaded_by: uploadedBy,
      uploaded_at: new Date().toISOString(),
    };
    this.documents.set(document_id, doc);
    await sbUpsertDocument(doc as any);

    // Step 2: Extraction phase
    this._updateDocStatus(document_id, 'extracting');
    console.log(`[Engine] 📄 Extraction de "${name}"…`);

    const parseResult = await parseDocumentBuffer(name, buffer, mimeType);

    if (!parseResult.success) {
      this._updateDocStatus(document_id, 'failed', {
        error_message: parseResult.error,
        chunk_count: 0,
      });
      console.error(`[Engine] ❌ Extraction échouée pour "${name}": ${parseResult.error}`);
      this._persist();
      return document_id;
    }

    // Step 3: Chunking phase
    this._updateDocStatus(document_id, 'chunking');
    console.log(`[Engine] ✂️  Découpage de "${name}" → ${parseResult.chunks.length} chunks…`);

    // Small delay to let status propagate
    await new Promise(r => setTimeout(r, 50));

    // Step 4: Vectorization phase
    this._updateDocStatus(document_id, 'vectorizing');
    console.log(`[Engine] 🔢 Vectorisation de "${name}"…`);

    const chunksToInsertSb: any[] = [];
    for (let i = 0; i < parseResult.chunks.length; i++) {
      const c = parseResult.chunks[i];
      const emb = await getEmbedding(c.text);
      const chunk: StoredChunk = {
        chunk_id: `${document_id}-${i}`,
        document_id,
        document_name: name,
        page: c.page || 1,
        section: c.section,
        chunk_index: i,
        text: c.text,
        embedding: emb,
      };
      this.chunks.set(chunk.chunk_id, chunk);
      chunksToInsertSb.push({ ...chunk });
    }

    // Step 5: Mark as indexed
    this._updateDocStatus(document_id, 'indexed', { chunk_count: parseResult.chunks.length });

    // Persist to Supabase
    await sbUpsertDocument({ ...doc, status: 'indexed', chunk_count: parseResult.chunks.length } as any);
    await sbInsertChunks(chunksToInsertSb);

    console.log(`[Engine] ✅ "${name}" indexé : ${parseResult.chunks.length} chunks.`);
    return document_id;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  public logQuery(q: any): void {
    const fullQuery: StoredQuery = {
      query_id: crypto.randomUUID(),
      ...q
    };
    this.queries.unshift(fullQuery);
    if (this.queries.length > 500) this.queries = this.queries.slice(0, 500);
    this._persist();
    sbLogQuery({
      ...fullQuery,
      answer: fullQuery.answer || ''
    } as any).catch(() => {});
  }

  public async ingestDocument(
    name: string,
    content: string | Buffer,
    uploadedBy = 'user',
    mimeType = 'text/plain',
    parentId: string | null = null
  ): Promise<string> {
    const buffer = Buffer.isBuffer(content)
      ? content
      : Buffer.from(content, 'utf-8');
    const id = await this._ingestBuffer(name, buffer, uploadedBy, mimeType, parentId);
    this._persist();
    return id;
  }

  public createFolder(name: string, uploadedBy = 'user', parentId: string | null = null): StoredDocument {
    const doc: StoredDocument = {
      document_id: crypto.randomUUID(),
      name,
      is_folder: true,
      parent_id: parentId,
      size_bytes: 0,
      mime_type: 'folder',
      status: 'indexed',
      chunk_count: 0,
      uploaded_by: uploadedBy,
      uploaded_at: new Date().toISOString(),
    };
    this.documents.set(doc.document_id, doc);
    this._persist();
    return doc;
  }

  public updateDocument(id: string, updates: Partial<StoredDocument>): boolean {
    const doc = this.documents.get(id);
    if (!doc) return false;
    Object.assign(doc, updates);
    this._persist();
    return true;
  }

  public removeDocumentsByUploader(email: string): number {
    const toRemove = Array.from(this.documents.values())
      .filter(d => d.uploaded_by.toLowerCase() === email.toLowerCase())
      .map(d => d.document_id);
    let count = 0;
    for (const id of toRemove) {
      if (this.removeDocument(id)) count++;
    }
    return count;
  }

  public removeDocument(id: string): boolean {
    if (!this.documents.has(id)) return false;
    const doc = this.documents.get(id);
    if (doc?.is_folder) {
      const children = Array.from(this.documents.values()).filter(d => d.parent_id === id);
      for (const child of children) this.removeDocument(child.document_id);
    }
    this.documents.delete(id);
    for (const [key, chunk] of this.chunks.entries()) {
      if (chunk.document_id === id) this.chunks.delete(key);
    }
    this._persist();
    sbRemoveDocument(id).catch(() => {});
    return true;
  }

  /** Re-vectorise les chunks existants d'un document (sans re-parser le fichier source). */
  public async reindexDocument(documentId: string): Promise<boolean> {
    const doc = this.documents.get(documentId);
    if (!doc || doc.is_folder) return false;

    const docChunks = Array.from(this.chunks.values())
      .filter(c => c.document_id === documentId)
      .sort((a, b) => a.chunk_index - b.chunk_index);

    if (docChunks.length === 0) return false;

    this._updateDocStatus(documentId, 'vectorizing');
    for (const chunk of docChunks) {
      chunk.embedding = await getEmbedding(chunk.text);
      this.chunks.set(chunk.chunk_id, chunk);
    }
    this._updateDocStatus(documentId, 'indexed', { chunk_count: docChunks.length });
    this._persist();
    return true;
  }

  public getDocuments(status?: string): StoredDocument[] {
    const all = Array.from(this.documents.values());
    if (status) return all.filter(d => d.status === status);
    return all;
  }

  public async getDocumentContent(documentId: string): Promise<string> {
    const sbContent = await sbGetDocumentContent(documentId);
    if (sbContent) return sbContent;

    const chunks = Array.from(this.chunks.values())
      .filter(c => c.document_id === documentId)
      .sort((a, b) => a.chunk_index - b.chunk_index);
    return chunks.map(c => c.text).join('\n');
  }

  /**
   * Hybrid search: vector similarity + keyword scoring, fused via RRF,
   * then reranked by Cohere. Returns top-5 most relevant chunks.
   */
  public async search(
    query: string,
    topK = 5,
    scoreThreshold = 0.15,
    allowedDocumentIds?: Set<string>
  ): Promise<{ chunk: StoredChunk; score: number }[]> {
    const qEmb = await getQueryEmbedding(query);
    const queryTokens = tokenize(query);

    // ── Try Supabase vector search first ─────────────────────────────────
    const sbResults = await sbSearchChunks(qEmb, 20, scoreThreshold);
    let candidates: { chunk: StoredChunk; score: number }[] = [];

    if (sbResults.length > 0) {
      candidates = sbResults.map(r => ({ chunk: r.chunk as unknown as StoredChunk, score: r.score }));
    } else {
      // ── In-memory vector search ───────────────────────────────────────
      const vectorScored: { chunk: StoredChunk; score: number }[] = [];
      for (const chunk of this.chunks.values()) {
        if (allowedDocumentIds && !allowedDocumentIds.has(chunk.document_id)) continue;
        const score = cosineSim(qEmb, chunk.embedding);
        if (score >= scoreThreshold) {
          vectorScored.push({ chunk, score });
        }
      }
      vectorScored.sort((a, b) => b.score - a.score);
      candidates = vectorScored.slice(0, 20);
    }

    if (candidates.length === 0) return [];

    // ── Keyword scoring on candidates ────────────────────────────────────
    const withKeyword = candidates.map(c => ({
      ...c,
      keywordScore: keywordScore(queryTokens, c.chunk.text),
    }));

    // Build ranked lists for RRF
    const vectorRanked = [...withKeyword]
      .sort((a, b) => b.score - a.score)
      .map(c => c.chunk.chunk_id);
    const keywordRanked = [...withKeyword]
      .sort((a, b) => b.keywordScore - a.keywordScore)
      .map(c => c.chunk.chunk_id);

    const rrfScores = reciprocalRankFusion(vectorRanked, keywordRanked);

    // Sort by RRF score and take top 20 for reranking
    const top20 = [...withKeyword]
      .sort((a, b) => (rrfScores.get(b.chunk.chunk_id) || 0) - (rrfScores.get(a.chunk.chunk_id) || 0))
      .slice(0, 20)
      .map(c => ({ chunk: c.chunk, score: rrfScores.get(c.chunk.chunk_id) || 0 }));

    // ── Cohere Rerank (top 20 → top 5) ───────────────────────────────────
    const reranked = await cohereRerank(query, top20, topK);

    // Apply relevance threshold after reranking
    // Cohere relevance scores are 0-1; threshold = 0.1 to filter noise
    const RERANK_THRESHOLD = 0.1;
    const filtered = reranked.filter(r => r.score >= RERANK_THRESHOLD);

    return filtered;
  }

  public addRemark(question: string): void {
    const remark: Remark = {
      id: crypto.randomUUID(),
      question,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };
    this.remarks.unshift(remark);
    if (this.remarks.length > 200) this.remarks = this.remarks.slice(0, 200);
    this._persist();
  }

  public getRemarks(limit = 50): Remark[] {
    return this.remarks.slice(0, limit);
  }

  public getStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recent = this.queries.filter(q => new Date(q.timestamp) >= thirtyDaysAgo);
    const withLatency = recent.filter((q: any) => q.latency_ms);
    const avgLatency = withLatency.length > 0
      ? Math.round(withLatency.reduce((s, q: any) => s + q.latency_ms, 0) / withLatency.length)
      : 0;

    // Document format breakdown
    const docs = Array.from(this.documents.values()).filter(d => !d.is_folder);
    const document_formats = {
      pdf: docs.filter(d => d.name.toLowerCase().endsWith('.pdf') || d.mime_type.includes('pdf')).length,
      docx: docs.filter(d => d.name.toLowerCase().endsWith('.docx') || d.name.toLowerCase().endsWith('.doc')).length,
      xlsx: docs.filter(d => d.name.toLowerCase().endsWith('.xlsx') || d.name.toLowerCase().endsWith('.xls')).length,
      text: docs.filter(d => d.name.toLowerCase().endsWith('.md') || d.name.toLowerCase().endsWith('.txt')).length,
    };

    // Top sources cited
    const sourceCount: Record<string, number> = {};
    for (const q of recent) {
      if (q.sources && Array.isArray(q.sources)) {
        for (const s of q.sources) {
          const docName = s.document_name || 'Inconnu';
          sourceCount[docName] = (sourceCount[docName] || 0) + 1;
        }
      }
    }
    const top_sources = Object.entries(sourceCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Success & Unresolved rate
    const totalQueries = recent.length || 1;
    const queriesWithSources = recent.filter(q => q.sources && q.sources.length > 0).length;
    const unresolvedQueries = recent.filter(q => q.answer && q.answer.includes('ne figure pas dans les documents')).length;

    const success_rate = Math.round((queriesWithSources / totalQueries) * 100);
    const unresolved_rate = Math.round((unresolvedQueries / totalQueries) * 100);

    return {
      documents: docs.length,
      chunks: this.chunks.size,
      queries_30d: recent.length,
      avg_latency_ms: avgLatency,
      queries_by_day: this._queriesByDay(recent),
      document_formats,
      top_sources,
      success_rate,
      unresolved_rate,
    };
  }

  private _queriesByDay(queries: StoredQuery[]): { date: string; count: number }[] {
    const map: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map[d.toISOString().split('T')[0]] = 0;
    }
    for (const q of queries) {
      const day = q.timestamp.split('T')[0];
      if (day in map) map[day]++;
    }
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  }

  public getQueryHistory(limit = 20): StoredQuery[] {
    return this.queries.slice(0, limit);
  }

  public async generateAnswer(
    question: string,
    chunks: StoredChunk[],
    history: { role: string; content: string }[] = []
  ): Promise<string> {
    return generateAnswer(question, chunks, history);
  }
}
