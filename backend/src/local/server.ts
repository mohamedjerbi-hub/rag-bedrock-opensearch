import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { MockEngine } from '../mocks/engine';
import { sbGetUserByEmail, sbCreateUser } from '../services/supabaseStore';
import { logAuditEvent, getAuditLogs } from '../services/auditLogger';
import { securityHeadersMiddleware, authRateLimiter, apiRateLimiter, promptInjectionFilter } from '../middleware/securityMiddleware';
import { generateTOTPSetup, verifyTOTPCode } from '../services/totpService';
import { getUserRoleRecord, setUserRole, setUserStatus, getAllUserRoleRecords, UserRole } from '../services/roleStore';
import { getCachedQuery, setCachedQuery, clearQueryCache } from '../services/queryCache';

// ─── Configuration ────────────────────────────────────────────────────────────
const envResult = dotenv.config();
dotenvExpand.expand(envResult);

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const IS_MOCK = process.env.MOCK !== 'false';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_for_development_only_123!';
const engine = new MockEngine();

// ─── Local User Store (fallback when Supabase is offline) ─────────────────────
const LOCAL_USERS_FILE = path.join(__dirname, '../../data/local_users.json');

export interface LocalUser {
  email: string;
  name: string;
  role: string;
  password_hash: string;
  created_at: string;
  totp_enabled?: boolean;
  totp_secret?: string;
  refresh_token?: string;
}

function loadLocalUsers(): LocalUser[] {
  try {
    if (fs.existsSync(LOCAL_USERS_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_USERS_FILE, 'utf-8'));
    }
  } catch (_) {}
  return [];
}

function saveLocalUsers(users: LocalUser[]): void {
  const dir = path.dirname(LOCAL_USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function updateUserLocal(email: string, updates: Partial<LocalUser>): boolean {
  const users = loadLocalUsers();
  const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (idx === -1) return false;
  users[idx] = { ...users[idx], ...updates };
  saveLocalUsers(users);
  return true;
}

async function findUser(email: string): Promise<any | null> {
  // Try Supabase first
  try {
    const sbUser = await sbGetUserByEmail(email);
    if (sbUser) return sbUser;
  } catch (_) {}
  // Fallback to local store
  const users = loadLocalUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

async function createUserLocal(email: string, passwordHash: string, name: string, role: string): Promise<LocalUser | null> {
  // Try Supabase first
  try {
    const sbUser = await sbCreateUser(email, passwordHash, name, role);
    if (sbUser) return sbUser as any;
  } catch (_) {}
  // Fallback to local file
  const users = loadLocalUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) return null;
  const newUser: LocalUser = { email, name, role, password_hash: passwordHash, created_at: new Date().toISOString() };
  users.push(newUser);
  saveLocalUsers(users);
  return newUser;
}

// ─── Middleware & Auth ────────────────────────────────────────────────────────
app.use(securityHeadersMiddleware);
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use('/internal/upload/:id', express.raw({ type: '*/*', limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ limit: '50mb' }));

interface AuthenticatedRequest extends Request {
  user?: {
    email: string;
    name: string;
    role: 'admin' | 'editor' | 'auditor' | 'reader' | 'user';
  };
}

// Session Auth Middleware
function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentification requise.' } });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const roleRecord = getUserRoleRecord(decoded.email);

    if (!roleRecord.active) {
      return res.status(403).json({ error: { code: 'ACCOUNT_SUSPENDED', message: 'Votre compte a été suspendu par un administrateur.' } });
    }

    req.user = {
      email: decoded.email,
      name: decoded.name,
      role: roleRecord.role,
    };
    next();
  } catch (e) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token de session invalide ou expiré.' } });
  }
}

// Role Authorization Middleware
function requireRoles(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié.' } });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Accès refusé pour votre rôle.' } });
    }
    next();
  };
}

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── Error helper ─────────────────────────────────────────────────────────────
const apiError = (res: Response, code: number, errorCode: string, message: string) =>
  res.status(code).json({ error: { code: errorCode, message, request_id: crypto.randomUUID() } });

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
// Helper to issue Access (15m) + Refresh Token (7d)
function issueTokens(user: { email: string; name: string; role: string }) {
  const token = jwt.sign(
    { email: user.email, name: user.name, role: user.role || 'reader' },
    JWT_SECRET,
    { expiresIn: '24h' } // 24h for smooth dev testing
  );
  const refreshToken = jwt.sign(
    { email: user.email, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  updateUserLocal(user.email, { refresh_token: refreshToken });
  return { token, refreshToken };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
app.post('/auth/login', authRateLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!email || !password) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Email et mot de passe requis.');
  }

  const user = await findUser(email);
  if (!user) {
    logAuditEvent('LOGIN_FAILURE', 'warning', email, { reason: 'User not found' }, ip);
    return apiError(res, 401, 'UNAUTHORIZED', 'Identifiants incorrects.');
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    logAuditEvent('LOGIN_FAILURE', 'warning', email, { reason: 'Invalid password' }, ip);
    return apiError(res, 401, 'UNAUTHORIZED', 'Identifiants incorrects.');
  }

  const roleRecord = getUserRoleRecord(user.email);
  if (!roleRecord.active) {
    logAuditEvent('LOGIN_FAILURE', 'warning', email, { reason: 'Account suspended' }, ip);
    return apiError(res, 403, 'ACCOUNT_SUSPENDED', 'Votre compte est suspendu. Veuillez contacter un administrateur.');
  }

  user.role = roleRecord.role;

  // Check 2FA requirement
  if (user.totp_enabled && user.totp_secret) {
    const tempToken = jwt.sign(
      { email: user.email, name: user.name, role: user.role, pending_2fa: true },
      JWT_SECRET,
      { expiresIn: '5m' }
    );
    return res.json({
      requires_2fa: true,
      temp_token: tempToken,
      message: 'Code 2FA/TOTP requis pour finaliser la connexion.',
    });
  }

  const { token, refreshToken } = issueTokens(user);
  logAuditEvent('LOGIN_SUCCESS', 'info', user.email, { role: user.role }, ip);

  res.json({
    token,
    refreshToken,
    user: {
      email: user.email,
      name: user.name,
      role: user.role || 'reader',
      totp_enabled: !!user.totp_enabled,
    },
  });
});

app.post('/auth/2fa/login', authRateLimiter, async (req: Request, res: Response) => {
  const { temp_token, code } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!temp_token || !code) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Jeton temporaire et code 2FA requis.');
  }

  try {
    const decoded = jwt.verify(temp_token, JWT_SECRET) as any;
    if (!decoded.pending_2fa) {
      return apiError(res, 400, 'INVALID_TOKEN', 'Jeton invalide pour le flux 2FA.');
    }

    const user = await findUser(decoded.email);
    if (!user || !user.totp_secret) {
      return apiError(res, 400, 'INVALID_USER', 'Compte utilisateur ou 2FA non configuré.');
    }

    const isValid = verifyTOTPCode(user.totp_secret, code);
    if (!isValid) {
      logAuditEvent('2FA_VERIFY_FAILURE', 'warning', user.email, { flow: 'login' }, ip);
      return apiError(res, 401, 'UNAUTHORIZED', 'Code 2FA incorrect ou expiré.');
    }

    const { token, refreshToken } = issueTokens(user);
    logAuditEvent('2FA_VERIFY_SUCCESS', 'info', user.email, { flow: 'login' }, ip);
    logAuditEvent('LOGIN_SUCCESS', 'info', user.email, { role: user.role, auth_method: '2FA' }, ip);

    res.json({
      token,
      refreshToken,
      user: {
        email: user.email,
        name: user.name,
        role: user.role || 'reader',
        totp_enabled: true,
      },
    });
  } catch (e) {
    return apiError(res, 401, 'UNAUTHORIZED', 'Jeton 2FA expiré ou invalide.');
  }
});

app.post('/auth/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Jeton de rafraîchissement requis.');
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
    if (decoded.type !== 'refresh') {
      return apiError(res, 400, 'INVALID_TOKEN', 'Type de jeton invalide.');
    }

    const user = await findUser(decoded.email);
    if (!user || user.refresh_token !== refreshToken) {
      return apiError(res, 401, 'UNAUTHORIZED', 'Jeton de rafraîchissement révoqué.');
    }

    const tokens = issueTokens(user);
    logAuditEvent('REFRESH_TOKEN', 'info', user.email, {}, req.ip);

    res.json({
      token: tokens.token,
      refreshToken: tokens.refreshToken,
    });
  } catch (e) {
    return apiError(res, 401, 'UNAUTHORIZED', 'Jeton de rafraîchissement expiré.');
  }
});

app.post('/auth/logout', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    updateUserLocal(req.user.email, { refresh_token: undefined });
    logAuditEvent('LOGOUT', 'info', req.user.email, {}, req.ip);
  }
  res.json({ message: 'Déconnexion réussie.' });
});

app.get('/auth/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return apiError(res, 401, 'UNAUTHORIZED', 'Non authentifié.');
  const dbUser = await findUser(req.user.email);
  res.json({
    user: {
      ...req.user,
      totp_enabled: !!dbUser?.totp_enabled,
    },
  });
});

// ─── 2FA Setup & Verification ─────────────────────────────────────────────────

app.post('/auth/2fa/setup', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return apiError(res, 401, 'UNAUTHORIZED', 'Non authentifié.');

  const setupData = await generateTOTPSetup(req.user.email);
  // Store secret temporarily
  updateUserLocal(req.user.email, { totp_secret: setupData.secret, totp_enabled: false });

  logAuditEvent('2FA_SETUP_INIT', 'info', req.user.email, {}, req.ip);

  res.json({
    secret: setupData.secret,
    otpauthUrl: setupData.otpauthUrl,
    qrCodeDataUrl: setupData.qrCodeDataUrl,
  });
});

app.post('/auth/2fa/verify', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return apiError(res, 401, 'UNAUTHORIZED', 'Non authentifié.');
  const { code } = req.body;

  const user = await findUser(req.user.email);
  if (!user || !user.totp_secret) {
    return apiError(res, 400, 'INVALID_STATE', 'Aucune configuration 2FA en cours.');
  }

  const isValid = verifyTOTPCode(user.totp_secret, code);
  if (!isValid) {
    logAuditEvent('2FA_VERIFY_FAILURE', 'warning', req.user.email, { flow: 'enable' }, req.ip);
    return apiError(res, 400, 'INVALID_CODE', 'Code TOTP invalide. Veuillez réessayer.');
  }

  updateUserLocal(req.user.email, { totp_enabled: true });
  logAuditEvent('2FA_ENABLE', 'info', req.user.email, {}, req.ip);

  res.json({ success: true, message: 'La double authentification (2FA) est désormais activée !' });
});

app.post('/auth/2fa/disable', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return apiError(res, 401, 'UNAUTHORIZED', 'Non authentifié.');
  const { code } = req.body;

  const user = await findUser(req.user.email);
  if (!user || !user.totp_enabled || !user.totp_secret) {
    return apiError(res, 400, 'INVALID_STATE', 'Le 2FA n\'est pas activé.');
  }

  const isValid = verifyTOTPCode(user.totp_secret, code);
  if (!isValid) {
    logAuditEvent('2FA_VERIFY_FAILURE', 'warning', req.user.email, { flow: 'disable' }, req.ip);
    return apiError(res, 400, 'INVALID_CODE', 'Code TOTP invalide pour désactiver le 2FA.');
  }

  updateUserLocal(req.user.email, { totp_enabled: false, totp_secret: undefined });
  logAuditEvent('2FA_DISABLE', 'warning', req.user.email, {}, req.ip);

  res.json({ success: true, message: 'La double authentification a été désactivée.' });
});

app.post('/auth/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Email, nom et mot de passe requis.');
  }

  // Check if user already exists
  const existingUser = await findUser(email);
  if (existingUser) {
    return apiError(res, 409, 'CONFLICT', 'Un utilisateur avec cet email existe déjà.');
  }

  // Hash password
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const role = 'editor'; // default role

  // Create user (Supabase or local fallback)
  const newUser = await createUserLocal(email, passwordHash, name, role);
  if (!newUser) {
    return apiError(res, 500, 'SERVER_ERROR', 'Erreur lors de la création du compte.');
  }

  const { token, refreshToken } = issueTokens(newUser);
  logAuditEvent('REGISTER', 'info', email, { name, role }, req.ip);

  res.status(201).json({
    token,
    refreshToken,
    user: { email: newUser.email, name: newUser.name, role: newUser.role }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────
app.get('/audit/security-logs', authenticate, requireRoles(['admin', 'auditor']), (req: AuthenticatedRequest, res: Response) => {
  const { event_type, severity, user_email, search, limit } = req.query;

  const logs = getAuditLogs({
    event_type: event_type as any,
    severity: severity as any,
    user_email: user_email as string,
    search: search as string,
    limit: limit ? Number(limit) : 200,
  });

  res.json({ items: logs });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN USER MANAGEMENT ENDPOINTS (Admin Only)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/admin/users', authenticate, requireRoles(['admin']), async (_req: AuthenticatedRequest, res: Response) => {
  const localUsers = loadLocalUsers();
  const roleRecords = getAllUserRoleRecords();
  const roleMap = new Map(roleRecords.map(r => [r.email.toLowerCase(), r]));

  const usersList = localUsers.map(u => {
    const rec = roleMap.get(u.email.toLowerCase()) || getUserRoleRecord(u.email);
    return {
      email: u.email,
      name: u.name,
      role: rec.role,
      active: rec.active,
      created_at: u.created_at,
      totp_enabled: !!u.totp_enabled,
    };
  });

  res.json({ users: usersList });
});

app.post('/admin/users/role', authenticate, requireRoles(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  const { email, role } = req.body;

  if (!email || !role || !['admin', 'editor', 'auditor', 'reader'].includes(role)) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Email et rôle valide (admin, editor, auditor, reader) requis.');
  }

  const updatedRecord = setUserRole(email, role as UserRole, req.user!.email, req.ip);
  updateUserLocal(email, { role });

  res.json({ success: true, user: updatedRecord });
});

app.post('/admin/users/status', authenticate, requireRoles(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  const { email, active } = req.body;

  if (!email || typeof active !== 'boolean') {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Email et statut actif (boolean) requis.');
  }

  const updatedRecord = setUserStatus(email, active, req.user!.email, req.ip);

  res.json({ success: true, user: updatedRecord });
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', version: '1.0.0', mock: IS_MOCK, timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY  – POST /query  (Server-Sent Events streaming)
// ─────────────────────────────────────────────────────────────────────────────
app.post('/query', authenticate, apiRateLimiter, promptInjectionFilter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { question, top_k = 5, history = [] } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return apiError(res, 400, 'VALIDATION_ERROR', 'Le champ "question" est requis.');
    }

    const startMs = Date.now();

    // ── Check Cache HIT ───────────────────────────────────────────────────────
    const cachedEntry = getCachedQuery(question);
    if (cachedEntry) {
      const latency_ms = Math.max(12, Date.now() - startMs);

      // Log cached query
      engine.logQuery({
        question,
        answer: cachedEntry.answer,
        latency_ms,
        user: req.user?.email || 'anonymous',
        timestamp: new Date().toISOString(),
        sources: cachedEntry.sources.map(s => ({ document_name: s.document_name, score: s.score })),
      });

      // Stream fast response from cache
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      const words = (cachedEntry.answer || '').split(' ');
      for (const word of words) {
        res.write(`data: ${JSON.stringify({ text: word + ' ' })}\n\n`);
        await new Promise(r => setTimeout(r, 6)); // Extra fast 6ms streaming
      }

      res.write(`data: ${JSON.stringify({ done: true, cached: true, sources: cachedEntry.sources, latency_ms, tokens: words.length })}\n\n`);
      return res.end();
    }

    // ── Cache MISS: Execute Hybrid Search & Reranking ─────────────────────────
    const results = await engine.search(question.trim(), Number(top_k));
    const sources = results.map(r => ({
      document_id: r.chunk.document_id,
      document_name: r.chunk.document_name,
      page: r.chunk.page,
      section: r.chunk.section,
      chunk_index: r.chunk.chunk_index,
      score: Math.round(r.score * 1000) / 1000,
      excerpt: r.chunk.text,
    }));

    // If no relevant chunks found, return explicit "not found" without calling LLM
    let answer: string;
    if (results.length === 0) {
      answer = 'Cette information ne figure pas dans les documents fournis.';
    } else {
      const chunks = results.map(r => r.chunk);
      answer = await engine.generateAnswer(question, chunks, history);
    }

    const latency_ms = Date.now() - startMs;

    // Cache the successful answer
    setCachedQuery(question, answer, sources);

    // Log query
    engine.logQuery({
      question,
      answer,
      latency_ms,
      user: req.user?.email || 'anonymous',
      timestamp: new Date().toISOString(),
      sources: sources.map(s => ({ document_name: s.document_name, score: s.score })),
    });

    // Stream response word by word (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const words = (answer || '').split(' ');
    for (const word of words) {
      res.write(`data: ${JSON.stringify({ text: word + ' ' })}\n\n`);
      await new Promise(r => setTimeout(r, 12));
    }

    res.write(`data: ${JSON.stringify({ done: true, cached: false, sources, latency_ms, tokens: words.length })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('Query error:', err);
    if (!res.headersSent) {
      return apiError(res, 500, 'SERVER_ERROR', err?.message || 'Erreur lors du traitement de la requête.');
    } else {
      res.write(`data: ${JSON.stringify({ text: `\n\n❌ Erreur serveur. Veuillez réessayer.` })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, sources: [], latency_ms: 0, tokens: 0 })}\n\n`);
      res.end();
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /documents */
app.get('/documents', authenticate, (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const items = engine.getDocuments(status).slice(0, limit);
  res.json({ items, next_cursor: null, total: items.length });
});

/** GET /documents/:id */
app.get('/documents/:id', authenticate, (req: Request, res: Response) => {
  const doc = engine.getDocuments().find(d => d.document_id === req.params.id);
  if (!doc) return apiError(res, 404, 'NOT_FOUND', 'Document introuvable.');
  res.json(doc);
});

/** GET /documents/:id/content */
app.get('/documents/:id/content', authenticate, async (req: Request, res: Response) => {
  const content = await engine.getDocumentContent(req.params.id);
  const doc = await engine.getDocuments().find(d => d.document_id === req.params.id);
  
  if (!content) return apiError(res, 404, 'NOT_FOUND', 'Document introuvable.');
  res.json({ content, title: doc?.filename || 'Document' });
});

/** POST /documents/upload-url  –  returns a signed-like upload URL */
app.post('/documents/upload-url', authenticate, requireRoles(['admin', 'editor']), (req: AuthenticatedRequest, res: Response) => {
  const { filename, content_type, size, parent_id } = req.body;
  if (!filename) return apiError(res, 400, 'VALIDATION_ERROR', '"filename" est requis.');
  if (size && size > 20 * 1024 * 1024)
    return apiError(res, 400, 'VALIDATION_ERROR', 'Fichier trop volumineux (max 20 Mo).');

  const document_id = crypto.randomUUID();
  const upload_url = `http://localhost:${PORT}/internal/upload/${document_id}?filename=${encodeURIComponent(filename)}&content_type=${encodeURIComponent(content_type || 'text/plain')}&parent_id=${parent_id || ''}&user=${encodeURIComponent(req.user?.email || 'user')}`;
  res.status(201).json({ upload_url, document_id, expires_in: 300 });
});

/** PUT /internal/upload/:id  –  mock-S3 receiver */
app.put('/internal/upload/:id', async (req: Request, res: Response) => {
  const filename = (req.query.filename as string) || 'document.txt';
  const contentType = (req.query.content_type as string) || 'text/plain';
  const parentId = (req.query.parent_id as string) || null;
  
  let buffer: Buffer;
  if (Buffer.isBuffer(req.body)) {
    buffer = req.body;
  } else if (typeof req.body === 'string') {
    buffer = Buffer.from(req.body, 'utf-8');
  } else if (req.body && typeof req.body === 'object') {
    buffer = Buffer.from(JSON.stringify(req.body));
  } else {
    buffer = Buffer.from([]);
  }

  try {
    const uploadedBy = (req.query.user as string) || 'user';
    await engine.ingestDocument(filename, buffer, uploadedBy, contentType, parentId);
    clearQueryCache();
    res.sendStatus(200);
  } catch (err: any) {
    console.error(`Upload error for ${filename}:`, err);
    res.status(400).json({ error: { code: 'PARSE_ERROR', message: String(err?.message || err || 'Échec de l\'extraction du document.') } });
  }
});

/** POST /documents/folders */
app.post('/documents/folders', authenticate, requireRoles(['admin', 'editor']), (req: AuthenticatedRequest, res: Response) => {
  const { name, parent_id } = req.body;
  if (!name) return apiError(res, 400, 'VALIDATION_ERROR', '"name" est requis.');
  const doc = engine.createFolder(name, req.user?.email || 'user', parent_id || null);
  res.status(201).json(doc);
});

/** PUT /documents/:id */
app.put('/documents/:id', authenticate, requireRoles(['admin', 'editor']), (req: Request, res: Response) => {
  const { name, parent_id } = req.body;
  const updated = engine.updateDocument(req.params['id'], { 
    ...(name !== undefined && { name }), 
    ...(parent_id !== undefined && { parent_id: parent_id || null }) 
  });
  if (!updated) return apiError(res, 404, 'NOT_FOUND', 'Document introuvable.');
  res.sendStatus(200);
});

/** DELETE /documents/:id */
app.delete('/documents/:id', authenticate, requireRoles(['admin', 'editor']), (req: Request, res: Response) => {
  const removed = engine.removeDocument(req.params['id'] as string);
  if (!removed) return apiError(res, 404, 'NOT_FOUND', 'Document introuvable.');
  clearQueryCache();
  res.sendStatus(204);
});

/** POST /documents/:id/reindex */
app.post('/documents/:id/reindex', authenticate, requireRoles(['admin', 'editor']), (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const docs = engine.getDocuments();
  const doc = docs.find(d => d.document_id === id);
  if (!doc) return apiError(res, 404, 'NOT_FOUND', 'Document introuvable.');
  res.status(202).json({ status: 'indexing', document_id: id });
});

// ─────────────────────────────────────────────────────────────────────────────
// STATS  &  HISTORY
// ─────────────────────────────────────────────────────────────────────────────

app.get('/stats', authenticate, (req: Request, res: Response) => {
  res.json(engine.getStats());
});

app.get('/history', authenticate, (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  res.json({ items: engine.getQueryHistory(limit) });
});

// ─────────────────────────────────────────────────────────────────────────────
// REMARKS – GET /remarks & POST /remarks
app.get('/remarks', authenticate, requireRoles(['admin']), (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json({ items: engine.getRemarks(limit) });
});

app.post('/remarks', authenticate, (req: Request, res: Response) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Le champ "question" est requis.');
  }
  engine.addRemark(question.trim());
  res.status(201).json({ status: 'added' });
});

// ─────────────────────────────────────────────────────────────────────────────
// 404 catch-all
// ─────────────────────────────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  apiError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} introuvable.`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ [RAG Backend] Serveur démarré sur http://localhost:${PORT}`);
  console.log(`   Base de données : Supabase`);
  console.log(`   Documents       : ${engine.getDocuments().length} chargés`);
});
