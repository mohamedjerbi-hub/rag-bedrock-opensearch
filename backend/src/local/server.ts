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
import { sbGetUserByEmail, sbCreateUser, sbGetSignedUrl } from '../services/supabaseStore';
import { logAuditEvent, getAuditLogs } from '../services/auditLogger';
import { securityHeadersMiddleware, authRateLimiter, apiRateLimiter, promptInjectionFilter } from '../middleware/securityMiddleware';
import { generateTOTPSetup, verifyTOTPCode } from '../services/totpService';
import { getUserRoleRecord, setUserRole, setUserStatus, getAllUserRoleRecords, deleteUserRoleRecord, UserRole } from '../services/roleStore';
import { createPasswordResetToken, consumePasswordResetToken, revokePasswordResetTokens } from '../services/passwordResetStore';
import { filterDocumentsForUser, getAccessibleDocumentIds, canAccessDocument, canModifyDocument } from '../services/documentAccess';
import { getCachedQuery, setCachedQuery, clearQueryCache } from '../services/queryCache';
import { sendPasswordResetEmail, IS_SMTP_CONFIGURED } from '../services/emailService';
import { 
  createKnowledgeGap, 
  getKnowledgeGaps, 
  getKnowledgeGapById, 
  updateKnowledgeGap, 
  deleteKnowledgeGap, 
  addGapComment, 
  getGapComments, 
  getKnowledgeGapStats, 
  checkUserGapRateLimit,
  createGapSchema
} from '../services/knowledgeGapStore';

// ─── Configuration ────────────────────────────────────────────────────────────
const envResult = dotenv.config();
dotenvExpand.expand(envResult);

const app = express();
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT) || 3001;
const IS_MOCK = process.env.MOCK !== 'false';
const JWT_SECRET = process.env.JWT_SECRET || (IS_MOCK ? 'dev_only_jwt_secret_change_in_production' : '');
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET est obligatoire en production (MOCK=false).');
  process.exit(1);
}
if (IS_MOCK && !process.env.JWT_SECRET) {
  console.warn('[WARN] JWT_SECRET par défaut utilisé — OK en dev, interdit en production.');
}

const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,https://rag-bedrock-opensearch.vercel.app').split(',').map(s => s.trim());
const engine = new MockEngine();

function getApiBaseUrl(req: Request): string {
  if (process.env.API_BASE_URL) return process.env.API_BASE_URL.replace(/\/$/, '');
  const host = req.get('host');
  const proto = req.protocol || 'http';
  return host ? `${proto}://${host}` : `http://localhost:${PORT}`;
}

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

function deleteUserLocal(email: string): boolean {
  const users = loadLocalUsers();
  const filtered = users.filter(u => u.email.toLowerCase() !== email.toLowerCase());
  if (filtered.length === users.length) return false;
  saveLocalUsers(filtered);
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
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || CORS_ORIGINS.includes('*') || CORS_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
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
  const role = 'reader'; // default role — least privilege for new accounts

  // Create user (Supabase or local fallback)
  const newUser = await createUserLocal(email, passwordHash, name, role);
  if (!newUser) {
    return apiError(res, 500, 'SERVER_ERROR', 'Erreur lors de la création du compte.');
  }

  setUserRole(email, role as UserRole, 'system', req.ip || '127.0.0.1');

  const { token, refreshToken } = issueTokens({ ...newUser, role });
  logAuditEvent('REGISTER', 'info', email, { name, role }, req.ip);

  res.status(201).json({
    token,
    refreshToken,
    user: { email: newUser.email, name: newUser.name, role: newUser.role }
  });
});

app.post('/auth/forgot-password', authRateLimiter, async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Email requis.');
  }

  const user = await findUser(email);
  // Réponse identique que l'email existe ou non (évite l'énumération)
  const genericMessage = 'Si cet email existe, un lien de réinitialisation a été généré.';

  if (!user) {
    return res.json({ message: genericMessage });
  }

  const resetEntry = createPasswordResetToken(email);
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetEntry.token}`;

  logAuditEvent('PASSWORD_RESET_REQUEST', 'info', email, { reset_requested: true }, req.ip);

  const payload: Record<string, string> = { message: genericMessage };

  // Tentative d'envoi réel si SMTP configuré
  const emailResult = await sendPasswordResetEmail(email, resetUrl);

  if (emailResult.sent) {
    // Production : email envoyé, on ne divulgue pas le lien
    payload.email_sent = 'true';
  } else if ((IS_MOCK || !IS_SMTP_CONFIGURED()) && process.env.NODE_ENV !== 'production') {
    // Dev/Mock uniquement (jamais en production) : exposer le lien pour tests sans SMTP
    payload.dev_reset_url = resetUrl;
    payload.dev_token = resetEntry.token;
    if (emailResult.error) {
      payload.smtp_error = emailResult.error;
    }
  }

  res.json(payload);
});

app.post('/auth/reset-password', authRateLimiter, async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password || String(password).length < 8) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Token et mot de passe (8 caractères min.) requis.');
  }

  const entry = consumePasswordResetToken(String(token));
  if (!entry) {
    return apiError(res, 400, 'INVALID_TOKEN', 'Lien de réinitialisation invalide ou expiré.');
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(String(password), salt);
  const updated = updateUserLocal(entry.email, { password_hash: passwordHash, refresh_token: undefined });
  if (!updated) {
    return apiError(res, 404, 'NOT_FOUND', 'Utilisateur introuvable.');
  }

  revokePasswordResetTokens(entry.email);
  logAuditEvent('PASSWORD_RESET_SUCCESS', 'info', entry.email, {}, req.ip);

  res.json({ message: 'Mot de passe mis à jour. Vous pouvez vous connecter.' });
});

app.delete('/auth/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return apiError(res, 401, 'UNAUTHORIZED', 'Non authentifié.');
  const email = req.user.email;

  engine.removeDocumentsByUploader(email);
  deleteUserLocal(email);
  deleteUserRoleRecord(email);
  revokePasswordResetTokens(email);

  logAuditEvent('USER_DELETED', 'warning', email, { self_delete: true }, req.ip);

  res.json({ message: 'Compte supprimé définitivement.' });
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

app.post('/admin/users/delete', authenticate, requireRoles(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Email requis.');
  }

  const target = email.toLowerCase().trim();
  if (target === req.user!.email.toLowerCase()) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Vous ne pouvez pas supprimer votre propre compte depuis l\'admin (utilisez Profil).');
  }

  const exists = await findUser(target);
  if (!exists) {
    return apiError(res, 404, 'NOT_FOUND', 'Utilisateur introuvable.');
  }

  engine.removeDocumentsByUploader(target);
  deleteUserLocal(target);
  deleteUserRoleRecord(target);
  revokePasswordResetTokens(target);

  logAuditEvent('USER_DELETED', 'critical', req.user!.email, { deleted_user: target }, req.ip);

  res.json({ success: true, message: `Utilisateur ${target} supprimé.` });
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  const OCR_ENABLED = process.env.OCR_ENABLED !== 'false';
  const isSmtpConfigured = IS_SMTP_CONFIGURED();
  res.json({
    status: 'ok',
    version: '1.0.0',
    mock: IS_MOCK,
    timestamp: new Date().toISOString(),
    features: {
      ocr_enabled: OCR_ENABLED,
      ocr_langs: process.env.OCR_LANGS || 'fra+eng',
      smtp_configured: isSmtpConfigured,
      email_provider: isSmtpConfigured ? (process.env.SMTP_HOST || 'custom') : 'dev_mode',
    },
  });
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
    const allDocs = engine.getDocuments();
    const allowedIds = getAccessibleDocumentIds(allDocs, req.user!.email, req.user!.role);
    const results = await engine.search(question.trim(), Number(top_k), 0.15, allowedIds);
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
app.get('/documents', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const status = req.query.status as string | undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const all = engine.getDocuments(status);
  const items = filterDocumentsForUser(all, req.user!.email, req.user!.role).slice(0, limit);
  res.json({ items, next_cursor: null, total: items.length });
});

/** GET /documents/:id */
app.get('/documents/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const doc = engine.getDocuments().find(d => d.document_id === req.params.id);
  if (!doc) return apiError(res, 404, 'NOT_FOUND', 'Document introuvable.');
  if (!canAccessDocument(doc, req.user!.email, req.user!.role)) {
    return apiError(res, 403, 'FORBIDDEN', 'Accès refusé à ce document.');
  }
  res.json(doc);
});

/** GET /documents/:id/content */
app.get('/documents/:id/content', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const docId = req.params.id as string;
  const doc = engine.getDocuments().find(d => d.document_id === docId);
  if (!doc) return apiError(res, 404, 'NOT_FOUND', 'Document introuvable.');
  if (!canAccessDocument(doc, req.user!.email, req.user!.role)) {
    return apiError(res, 403, 'FORBIDDEN', 'Accès refusé à ce document.');
  }
  const content = await engine.getDocumentContent(docId);
  if (!content) return apiError(res, 404, 'NOT_FOUND', 'Document introuvable.');
  res.json({ content, title: doc?.name || 'Document' });
});

/** GET /documents/:id/signed-url  –  Generates a short-lived signed URL for Supabase storage or backend download */
app.get('/documents/:id/signed-url', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const docId = req.params.id as string;
  const doc = engine.getDocuments().find(d => d.document_id === docId);
  if (!doc) return apiError(res, 404, 'NOT_FOUND', 'Document introuvable.');

  // Strict RLS & Role authorization check
  if (!canAccessDocument(doc, req.user!.email, req.user!.role)) {
    logAuditEvent('UNAUTHORIZED_ACCESS', 'warning', req.user!.email, { action: 'get_signed_url', document_id: docId });
    return apiError(res, 403, 'FORBIDDEN', 'Accès refusé. Vous ne possédez pas les droits pour lire ce document.');
  }

  const MAX_PREVIEW_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
  const sizeExceeded = (doc.size_bytes || 0) > MAX_PREVIEW_SIZE_BYTES;

  // 1. Try Supabase Storage signed URL
  const storagePath = (doc as any).storage_path || `${doc.document_id}/${doc.name}`;
  let signedUrl = await sbGetSignedUrl(storagePath, 300);

  // 2. Fallback for local / demo mode or if Supabase storage is not populated
  if (!signedUrl) {
    const base = getApiBaseUrl(req);
    const downloadToken = jwt.sign(
      { docId: doc.document_id, email: req.user!.email, role: req.user!.role },
      JWT_SECRET,
      { expiresIn: '5m' }
    );
    signedUrl = `${base}/documents/${doc.document_id}/download?token=${downloadToken}`;
  }

  logAuditEvent('DOC_UPLOAD', 'info', req.user!.email, { action: 'signed_url_generated', document_id: docId });

  res.json({
    signed_url: signedUrl,
    expires_in: 300,
    size_exceeded: sizeExceeded,
    document: {
      document_id: doc.document_id,
      name: doc.name,
      mime_type: doc.mime_type,
      size_bytes: doc.size_bytes,
      uploaded_by: doc.uploaded_by,
      uploaded_at: doc.uploaded_at,
    },
  });
});

/** GET /documents/:id/download  –  Secure stream download endpoint for local files & fallback */
app.get('/documents/:id/download', async (req: Request, res: Response) => {
  const docId = req.params.id as string;
  const token = (req.query.token as string) || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);

  if (!token) {
    return apiError(res, 401, 'UNAUTHORIZED', 'Token d\'accès requis.');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const doc = engine.getDocuments().find(d => d.document_id === docId);
    if (!doc) return apiError(res, 404, 'NOT_FOUND', 'Document introuvable.');

    if (decoded.email) {
      const roleRecord = getUserRoleRecord(decoded.email);
      if (!canAccessDocument(doc, decoded.email, roleRecord.role)) {
        return apiError(res, 403, 'FORBIDDEN', 'Accès refusé à ce document.');
      }
    }

    const buffer = await engine.getDocumentBuffer(docId);
    if (!buffer) return apiError(res, 404, 'NOT_FOUND', 'Fichier source non disponible sur le serveur.');

    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      md: 'text/markdown; charset=utf-8',
      txt: 'text/plain; charset=utf-8',
      csv: 'text/csv; charset=utf-8',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };

    const ext = (doc.name.split('.').pop() || '').toLowerCase();
    const mime = mimeMap[ext] || doc.mime_type || 'application/octet-stream';

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.name)}"`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(buffer);
  } catch (e: any) {
    return apiError(res, 401, 'UNAUTHORIZED', 'Jeton d\'accès expiré ou invalide.');
  }
});


/** POST /documents/upload-url  –  returns a signed-like upload URL */
app.post('/documents/upload-url', authenticate, requireRoles(['admin', 'editor']), (req: AuthenticatedRequest, res: Response) => {
  const { filename, content_type, size, parent_id } = req.body;
  if (!filename) return apiError(res, 400, 'VALIDATION_ERROR', '"filename" est requis.');
  if (size && size > 20 * 1024 * 1024)
    return apiError(res, 400, 'VALIDATION_ERROR', 'Fichier trop volumineux (max 20 Mo).');

  const document_id = crypto.randomUUID();
  const base = getApiBaseUrl(req);
  const upload_url = `${base}/internal/upload/${document_id}?filename=${encodeURIComponent(filename)}&content_type=${encodeURIComponent(content_type || 'text/plain')}&parent_id=${parent_id || ''}`;
  res.status(201).json({ upload_url, document_id, expires_in: 300 });
});

const ALLOWED_UPLOAD_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.md', '.txt', '.csv', '.jpg', '.jpeg', '.png', '.webp'];

/** PUT /internal/upload/:id  –  mock-S3 receiver (auth required) */
app.put('/internal/upload/:id', authenticate, requireRoles(['admin', 'editor']), async (req: AuthenticatedRequest, res: Response) => {
  const filename = (req.query.filename as string) || 'document.txt';
  const contentType = (req.query.content_type as string) || 'text/plain';
  const parentId = (req.query.parent_id as string) || null;

  const ext = '.' + (filename.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_UPLOAD_EXTENSIONS.includes(ext)) {
    return apiError(res, 400, 'VALIDATION_ERROR', `Type de fichier non autorisé. Extensions acceptées : ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')}`);
  }
  
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

  if (buffer.length > 20 * 1024 * 1024) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Fichier trop volumineux (max 20 Mo).');
  }

  try {
    const uploadedBy = req.user?.email || 'user';
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
app.put('/documents/:id', authenticate, requireRoles(['admin', 'editor']), (req: AuthenticatedRequest, res: Response) => {
  const targetId = req.params['id'] as string;
  const doc = engine.getDocuments().find(d => d.document_id === targetId);
  if (!doc) return apiError(res, 404, 'NOT_FOUND', 'Document introuvable.');
  if (!canModifyDocument(doc, req.user!.email, req.user!.role)) {
    return apiError(res, 403, 'FORBIDDEN', 'Vous ne pouvez modifier que vos propres documents.');
  }
  const { name, parent_id } = req.body;
  const updated = engine.updateDocument(targetId, { 
    ...(name !== undefined && { name }), 
    ...(parent_id !== undefined && { parent_id: parent_id || null }) 
  });
  if (!updated) return apiError(res, 404, 'NOT_FOUND', 'Document introuvable.');
  res.sendStatus(200);
});

/** DELETE /documents/:id */
app.delete('/documents/:id', authenticate, requireRoles(['admin', 'editor']), (req: AuthenticatedRequest, res: Response) => {
  const doc = engine.getDocuments().find(d => d.document_id === req.params['id']);
  if (!doc) return apiError(res, 404, 'NOT_FOUND', 'Document introuvable.');
  if (!canModifyDocument(doc, req.user!.email, req.user!.role)) {
    return apiError(res, 403, 'FORBIDDEN', 'Vous ne pouvez supprimer que vos propres documents.');
  }
  const removed = engine.removeDocument(req.params['id'] as string);
  if (!removed) return apiError(res, 404, 'NOT_FOUND', 'Document introuvable.');
  clearQueryCache();
  res.sendStatus(204);
});

/** POST /documents/:id/reindex */
app.post('/documents/:id/reindex', authenticate, requireRoles(['admin', 'editor']), async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const docs = engine.getDocuments();
  const doc = docs.find(d => d.document_id === id);
  if (!doc) return apiError(res, 404, 'NOT_FOUND', 'Document introuvable.');
  if (doc.is_folder) return apiError(res, 400, 'VALIDATION_ERROR', 'Impossible de réindexer un dossier.');
  const ok = await engine.reindexDocument(id);
  if (!ok) return apiError(res, 400, 'REINDEX_FAILED', 'Réindexation impossible (document sans chunks).');
  clearQueryCache();
  res.status(200).json({ status: 'indexed', document_id: id });
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
// KNOWLEDGE GAPS & REPORTING ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/gaps - User submits a gap report (Zod validated, 5 req/hr rate-limited)
app.post('/api/gaps', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user || !user.email) {
    return apiError(res, 401, 'UNAUTHORIZED', 'Authentification requise.');
  }

  // Server-side Rate Limit check (5 reports per user per hour)
  if (checkUserGapRateLimit(user.email)) {
    logAuditEvent('RATE_LIMIT_EXCEEDED', 'warning', user.email, { action: 'knowledge_gap_report' });
    return apiError(res, 429, 'RATE_LIMIT_EXCEEDED', 'Limite de 5 signalements par heure atteinte. Veuillez réessayer plus tard.');
  }

  // Zod validation
  const parseResult = createGapSchema.safeParse(req.body);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues.map(i => i.message).join(' ');
    return apiError(res, 400, 'VALIDATION_ERROR', errorMsg);
  }

  const newGap = createKnowledgeGap({
    user_id: user.id || user.email,
    user_email: user.email,
    user_name: user.name || user.email.split('@')[0],
    ...parseResult.data,
  });

  logAuditEvent('DOC_UPLOAD', 'info', user.email, { event: 'knowledge_gap_created', ticket: newGap.ticket_number });

  res.status(201).json({
    message: `Signalement enregistré sous le ticket ${newGap.ticket_number}`,
    ticket_number: newGap.ticket_number,
    gap: newGap,
  });
});

// GET /api/gaps - Get gaps (Strict RLS: standard users see ONLY their own gaps; Editor/Admin see all)
app.get('/api/gaps', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const isElevated = user.role === 'admin' || user.role === 'editor';

  const filters: any = {};

  if (!isElevated) {
    // RLS Enforcement: Force user_email filter for non-editors/admins
    filters.user_email = user.email;
  } else {
    if (req.query.status) filters.status = req.query.status as any;
    if (req.query.priority) filters.priority = req.query.priority as any;
    if (req.query.issue_type) filters.issue_type = req.query.issue_type as any;
    if (req.query.unassigned === 'true') filters.unassigned_only = true;
    if (req.query.search) filters.search = String(req.query.search);
  }

  const items = getKnowledgeGaps(filters);
  res.json({ items });
});

// GET /api/gaps/stats/summary - Summary metrics for Admin/Editor
app.get('/api/gaps/stats/summary', authenticate, requireRoles(['admin', 'editor']), (req: Request, res: Response) => {
  res.json(getKnowledgeGapStats());
});

// GET /api/notifications/my-resolutions - User notifications for resolved tickets
app.get('/api/notifications/my-resolutions', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const gaps = getKnowledgeGaps({ user_email: user.email, status: 'resolu' }).filter(g => g.notify_user);
  res.json({ items: gaps });
});

// GET /api/gaps/:id - Get single gap detail with comments
app.get('/api/gaps/:id', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const gapId = req.params.id as string;
  const gap = getKnowledgeGapById(gapId);

  if (!gap) {
    return apiError(res, 404, 'NOT_FOUND', 'Signalement introuvable.');
  }

  const isElevated = user.role === 'admin' || user.role === 'editor';
  if (!isElevated && gap.user_email.toLowerCase() !== user.email.toLowerCase()) {
    return apiError(res, 403, 'FORBIDDEN', 'Vous n\'avez pas accès à ce signalement.');
  }

  const comments = isElevated ? getGapComments(gap.id) : [];
  res.json({ gap, comments });
});

// PATCH /api/gaps/:id - Update status/assigned_to/resolution_note (Editor/Admin only)
app.patch('/api/gaps/:id', authenticate, requireRoles(['admin', 'editor']), (req: Request, res: Response) => {
  const user = (req as any).user;
  const gapId = req.params.id as string;
  const updated = updateKnowledgeGap(gapId, req.body, user.email);

  if (!updated) {
    return apiError(res, 404, 'NOT_FOUND', 'Signalement introuvable.');
  }

  logAuditEvent('USER_ROLE_CHANGE', 'info', user.email, { action: 'update_gap_status', ticket: updated.ticket_number, status: updated.status });
  res.json({ gap: updated });
});

// DELETE /api/gaps/:id - Delete gap report (Admin only)
app.delete('/api/gaps/:id', authenticate, requireRoles(['admin']), (req: Request, res: Response) => {
  const gapId = req.params.id as string;
  const success = deleteKnowledgeGap(gapId);
  if (!success) {
    return apiError(res, 404, 'NOT_FOUND', 'Signalement introuvable.');
  }
  res.json({ success: true, message: 'Signalement supprimé.' });
});

// POST /api/gaps/:id/comments - Add internal comment (Editor/Admin only)
app.post('/api/gaps/:id/comments', authenticate, requireRoles(['admin', 'editor']), (req: Request, res: Response) => {
  const user = (req as any).user;
  const gapId = req.params.id as string;
  const { body } = req.body;

  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Le contenu du commentaire est obligatoire.');
  }

  const gap = getKnowledgeGapById(gapId);
  if (!gap) {
    return apiError(res, 404, 'NOT_FOUND', 'Signalement introuvable.');
  }

  const comment = addGapComment({
    gap_id: gap.id,
    author_email: user.email,
    author_name: user.name || user.email.split('@')[0],
    body,
  });

  res.status(201).json({ comment });
});

// ─────────────────────────────────────────────────────────────────────────────
// 404 catch-all
// ─────────────────────────────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  apiError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} introuvable.`);
});

// ─────────────────────────────────────────────────────────────────────────────
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`✅ [RAG Backend] Serveur démarré sur http://${HOST}:${PORT}`);
  console.log(`   Base de données : Supabase`);
  console.log(`   Documents       : ${engine.getDocuments().length} chargés`);
});
