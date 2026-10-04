import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import { getSupabaseClient } from './supabaseClient';

export const createGapSchema = z.object({
  question: z.string().min(3, 'La question doit contenir au moins 3 caractères.').max(1000, 'La question ne peut pas dépasser 1000 caractères.'),
  generated_answer: z.string().optional().default(''),
  retrieved_sources: z.array(z.object({
    doc_name: z.string(),
    chunk: z.string(),
    score: z.number()
  })).optional().default([]),
  issue_type: z.enum([
    'information_absente',
    'reponse_incorrecte',
    'document_obsolete',
    'reponse_imprecise',
    'mauvais_document_cite'
  ]),
  priority: z.enum(['basse', 'normale', 'haute', 'bloquante']).default('normale'),
  user_comment: z.string().min(1, 'Le commentaire est obligatoire.').max(1000, 'Le commentaire ne peut pas dépasser 1000 caractères.'),
  expected_answer: z.string().max(1000).optional(),
  notify_user: z.boolean().default(true),
  conversation_id: z.string().optional().default('default')
}).refine(data => {
  if (data.issue_type === 'reponse_incorrecte') {
    return data.user_comment.trim().length >= 5;
  }
  return true;
}, {
  message: 'Un commentaire d\'au moins 5 caractères est obligatoire pour le type "Réponse incorrecte".',
  path: ['user_comment']
});

export type KnowledgeGapIssueType = 
  | 'information_absente'
  | 'reponse_incorrecte'
  | 'document_obsolete'
  | 'reponse_imprecise'
  | 'mauvais_document_cite';

export type KnowledgeGapPriority = 'basse' | 'normale' | 'haute' | 'bloquante';

export type KnowledgeGapStatus = 'nouveau' | 'en_cours' | 'resolu' | 'rejete' | 'doublon';

export interface RetrievedSourceSnippet {
  doc_name: string;
  chunk: string;
  score: number;
}

export interface KnowledgeGap {
  id: string;
  ticket_number: string;
  user_id: string;
  user_email: string;
  user_name: string;
  conversation_id: string;
  question: string;
  generated_answer: string;
  retrieved_sources: RetrievedSourceSnippet[];
  issue_type: KnowledgeGapIssueType;
  priority: KnowledgeGapPriority;
  user_comment: string;
  expected_answer?: string;
  notify_user: boolean;
  status: KnowledgeGapStatus;
  assigned_to?: string;
  resolution_note?: string;
  resolved_at?: string;
  resolved_by?: string;
  linked_doc_id?: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeGapComment {
  id: string;
  gap_id: string;
  author_email: string;
  author_name: string;
  body: string;
  created_at: string;
}

const GAPS_FILE = path.join(__dirname, '../../data/knowledge_gaps.json');
const COMMENTS_FILE = path.join(__dirname, '../../data/knowledge_gap_comments.json');

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readGaps(): KnowledgeGap[] {
  try {
    if (fs.existsSync(GAPS_FILE)) {
      return JSON.parse(fs.readFileSync(GAPS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('[KnowledgeGapStore] Error reading gaps:', e);
  }
  return [];
}

function writeGaps(gaps: KnowledgeGap[]) {
  ensureDir(GAPS_FILE);
  fs.writeFileSync(GAPS_FILE, JSON.stringify(gaps, null, 2), 'utf-8');
}

function readComments(): KnowledgeGapComment[] {
  try {
    if (fs.existsSync(COMMENTS_FILE)) {
      return JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('[KnowledgeGapStore] Error reading comments:', e);
  }
  return [];
}

function writeComments(comments: KnowledgeGapComment[]) {
  ensureDir(COMMENTS_FILE);
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2), 'utf-8');
}

// Generate date-based ticket number GAP-AAAAMMJJ-XXXX
function generateTicketNumber(existingGaps: KnowledgeGap[]): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const todayPrefix = `GAP-${dateStr}-`;
  const todayGaps = existingGaps.filter(g => g.ticket_number && g.ticket_number.startsWith(todayPrefix));
  const seq = String(todayGaps.length + 1).padStart(4, '0');

  return `GAP-${dateStr}-${seq}`;
}

// Simple Levenshtein-based similarity for grouping similar questions
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^\w\s]/gi, '').trim();
  const s2 = str2.toLowerCase().replace(/[^\w\s]/gi, '').trim();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// ── RATE LIMITER CHECK (5 gap reports per user per hour) ─────────────────────
export function checkUserGapRateLimit(userEmail: string): boolean {
  const gaps = readGaps();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const userRecentGaps = gaps.filter(g => 
    g.user_email.toLowerCase() === userEmail.toLowerCase() &&
    g.created_at >= oneHourAgo
  );

  return userRecentGaps.length >= 5;
}

// ── CRUD OPERATIONS ──────────────────────────────────────────────────────────
export function createKnowledgeGap(data: {
  user_id: string;
  user_email: string;
  user_name: string;
  conversation_id: string;
  question: string;
  generated_answer: string;
  retrieved_sources?: RetrievedSourceSnippet[];
  issue_type: KnowledgeGapIssueType;
  priority: KnowledgeGapPriority;
  user_comment: string;
  expected_answer?: string;
  notify_user?: boolean;
}): KnowledgeGap {
  const gaps = readGaps();
  const now = new Date().toISOString();

  const newGap: KnowledgeGap = {
    id: crypto.randomUUID(),
    ticket_number: generateTicketNumber(gaps),
    user_id: data.user_id,
    user_email: data.user_email,
    user_name: data.user_name || data.user_email.split('@')[0],
    conversation_id: data.conversation_id || 'default',
    question: data.question.trim(),
    generated_answer: data.generated_answer || '',
    retrieved_sources: data.retrieved_sources || [],
    issue_type: data.issue_type,
    priority: data.priority || 'normale',
    user_comment: data.user_comment.trim(),
    expected_answer: data.expected_answer?.trim() || undefined,
    notify_user: data.notify_user ?? true,
    status: 'nouveau',
    created_at: now,
    updated_at: now,
  };

  gaps.unshift(newGap);
  writeGaps(gaps);

  // Sync to Supabase if connected
  const sb = getSupabaseClient();
  if (sb) {
    (sb.from('knowledge_gaps').insert([{
      id: newGap.id,
      ticket_number: newGap.ticket_number,
      user_id: newGap.user_id,
      user_email: newGap.user_email,
      conversation_id: newGap.conversation_id,
      question: newGap.question,
      generated_answer: newGap.generated_answer,
      retrieved_sources: newGap.retrieved_sources,
      issue_type: newGap.issue_type,
      priority: newGap.priority,
      user_comment: newGap.user_comment,
      expected_answer: newGap.expected_answer,
      notify_user: newGap.notify_user,
      status: newGap.status,
      created_at: newGap.created_at,
      updated_at: newGap.updated_at,
    }]) as any).then(({ error }: any) => {
      if (error) console.error('[KnowledgeGapStore] Supabase insert error:', error.message);
    }).catch(() => {});
  }

  return newGap;
}

export function getKnowledgeGaps(filters?: {
  user_email?: string;
  status?: KnowledgeGapStatus;
  priority?: KnowledgeGapPriority;
  issue_type?: KnowledgeGapIssueType;
  unassigned_only?: boolean;
  search?: string;
  limit?: number;
}): KnowledgeGap[] {
  let gaps = readGaps();

  if (!filters) return gaps;

  if (filters.user_email) {
    gaps = gaps.filter(g => g.user_email.toLowerCase() === filters.user_email?.toLowerCase());
  }
  if (filters.status) {
    gaps = gaps.filter(g => g.status === filters.status);
  }
  if (filters.priority) {
    gaps = gaps.filter(g => g.priority === filters.priority);
  }
  if (filters.issue_type) {
    gaps = gaps.filter(g => g.issue_type === filters.issue_type);
  }
  if (filters.unassigned_only) {
    gaps = gaps.filter(g => !g.assigned_to);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    gaps = gaps.filter(g =>
      g.ticket_number.toLowerCase().includes(q) ||
      g.question.toLowerCase().includes(q) ||
      g.user_comment.toLowerCase().includes(q) ||
      g.user_name.toLowerCase().includes(q) ||
      g.user_email.toLowerCase().includes(q)
    );
  }

  return gaps.slice(0, filters.limit || 500);
}

export function getKnowledgeGapById(id: string): KnowledgeGap | null {
  const gaps = readGaps();
  return gaps.find(g => g.id === id || g.ticket_number.toLowerCase() === id.toLowerCase()) || null;
}

export function updateKnowledgeGap(
  id: string,
  updates: Partial<KnowledgeGap>,
  editorEmail?: string
): KnowledgeGap | null {
  const gaps = readGaps();
  const idx = gaps.findIndex(g => g.id === id || g.ticket_number.toLowerCase() === id.toLowerCase());
  if (idx === -1) return null;

  const gap = gaps[idx];
  const now = new Date().toISOString();

  if (updates.status && updates.status === 'resolu' && gap.status !== 'resolu') {
    gap.resolved_at = now;
    gap.resolved_by = editorEmail || updates.resolved_by || 'system';
  }

  const updatedGap: KnowledgeGap = {
    ...gap,
    ...updates,
    updated_at: now,
  };

  gaps[idx] = updatedGap;
  writeGaps(gaps);

  // Sync to Supabase
  const sb = getSupabaseClient();
  if (sb) {
    (sb.from('knowledge_gaps').update({
      status: updatedGap.status,
      assigned_to: updatedGap.assigned_to,
      resolution_note: updatedGap.resolution_note,
      resolved_at: updatedGap.resolved_at,
      resolved_by: updatedGap.resolved_by,
      linked_doc_id: updatedGap.linked_doc_id,
      updated_at: updatedGap.updated_at,
    }).eq('id', updatedGap.id) as any).then(({ error }: any) => {
      if (error) console.error('[KnowledgeGapStore] Supabase update error:', error.message);
    }).catch(() => {});
  }

  return updatedGap;
}

export function deleteKnowledgeGap(id: string): boolean {
  let gaps = readGaps();
  const initialCount = gaps.length;
  gaps = gaps.filter(g => g.id !== id && g.ticket_number.toLowerCase() !== id.toLowerCase());
  if (gaps.length === initialCount) return false;

  writeGaps(gaps);

  const sb = getSupabaseClient();
  if (sb) {
    (sb.from('knowledge_gaps').delete().eq('id', id) as any).then(() => {}).catch(() => {});
  }

  return true;
}

// ── INTERNAL COMMENTS ────────────────────────────────────────────────────────
export function addGapComment(data: {
  gap_id: string;
  author_email: string;
  author_name: string;
  body: string;
}): KnowledgeGapComment {
  const comments = readComments();
  const newComment: KnowledgeGapComment = {
    id: crypto.randomUUID(),
    gap_id: data.gap_id,
    author_email: data.author_email,
    author_name: data.author_name || data.author_email.split('@')[0],
    body: data.body.trim(),
    created_at: new Date().toISOString(),
  };

  comments.push(newComment);
  writeComments(comments);
  return newComment;
}

export function getGapComments(gap_id: string): KnowledgeGapComment[] {
  const comments = readComments();
  return comments.filter(c => c.gap_id === gap_id);
}

// ── INTELLIGENT GROUPING & METRICS ───────────────────────────────────────────
export interface MissingTopicGroup {
  topic_id: string;
  primary_question: string;
  similar_count: number;
  gap_ids: string[];
  latest_created_at: string;
  priority: KnowledgeGapPriority;
  status_summary: Record<KnowledgeGapStatus, number>;
}

export function getGroupedMissingTopics(): MissingTopicGroup[] {
  const gaps = readGaps();
  const groups: MissingTopicGroup[] = [];

  for (const gap of gaps) {
    let matchedGroup = groups.find(g => calculateSimilarity(g.primary_question, gap.question) >= 0.45);

    if (matchedGroup) {
      matchedGroup.similar_count += 1;
      matchedGroup.gap_ids.push(gap.id);
      matchedGroup.status_summary[gap.status] = (matchedGroup.status_summary[gap.status] || 0) + 1;
      if (gap.created_at > matchedGroup.latest_created_at) {
        matchedGroup.latest_created_at = gap.created_at;
      }
      if (gap.priority === 'bloquante' || (gap.priority === 'haute' && matchedGroup.priority !== 'bloquante')) {
        matchedGroup.priority = gap.priority;
      }
    } else {
      groups.push({
        topic_id: crypto.randomUUID(),
        primary_question: gap.question,
        similar_count: 1,
        gap_ids: [gap.id],
        latest_created_at: gap.created_at,
        priority: gap.priority,
        status_summary: {
          nouveau: gap.status === 'nouveau' ? 1 : 0,
          en_cours: gap.status === 'en_cours' ? 1 : 0,
          resolu: gap.status === 'resolu' ? 1 : 0,
          rejete: gap.status === 'rejete' ? 1 : 0,
          doublon: gap.status === 'doublon' ? 1 : 0,
        },
      });
    }
  }

  // Sort by count descending
  return groups.sort((a, b) => b.similar_count - a.similar_count).slice(0, 10);
}

export function getKnowledgeGapStats() {
  const gaps = readGaps();
  const totalGaps = gaps.length;

  const byStatus: Record<string, number> = { nouveau: 0, en_cours: 0, resolu: 0, rejete: 0, doublon: 0 };
  const byPriority: Record<string, number> = { basse: 0, normale: 0, haute: 0, bloquante: 0 };
  const byType: Record<string, number> = {};

  gaps.forEach(g => {
    byStatus[g.status] = (byStatus[g.status] || 0) + 1;
    byPriority[g.priority] = (byPriority[g.priority] || 0) + 1;
    byType[g.issue_type] = (byType[g.issue_type] || 0) + 1;
  });

  const resolvedGaps = gaps.filter(g => g.status === 'resolu' && g.resolved_at);
  let avgResolutionHours = 0;
  if (resolvedGaps.length > 0) {
    const totalMs = resolvedGaps.reduce((acc, g) => {
      const start = new Date(g.created_at).getTime();
      const end = new Date(g.resolved_at!).getTime();
      return acc + Math.max(0, end - start);
    }, 0);
    avgResolutionHours = Number((totalMs / (resolvedGaps.length * 1000 * 3600)).toFixed(1));
  }

  const groupedTopics = getGroupedMissingTopics();

  return {
    totalGaps,
    byStatus,
    byPriority,
    byType,
    avgResolutionHours,
    topMissingTopics: groupedTopics,
  };
}
