import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type AuditEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'REGISTER'
  | 'LOGOUT'
  | 'REFRESH_TOKEN'
  | '2FA_SETUP_INIT'
  | '2FA_ENABLE'
  | '2FA_DISABLE'
  | '2FA_VERIFY_SUCCESS'
  | '2FA_VERIFY_FAILURE'
  | 'DOC_UPLOAD'
  | 'DOC_DELETE'
  | 'USER_ROLE_CHANGE'
  | 'RAG_QUERY'
  | 'PROMPT_INJECTION_BLOCKED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_SUCCESS'
  | 'USER_DELETED';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditLogEntry {
  id: string;
  event_type: AuditEventType;
  severity: AuditSeverity;
  user_email: string;
  ip_address?: string;
  user_agent?: string;
  details: Record<string, any>;
  timestamp: string;
}

const AUDIT_FILE = path.join(__dirname, '../../data/audit_logs.json');

function ensureDataDir() {
  const dir = path.dirname(AUDIT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readLogs(): AuditLogEntry[] {
  try {
    if (fs.existsSync(AUDIT_FILE)) {
      return JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('[AuditLogger] Error reading logs:', e);
  }
  return [];
}

function writeLogs(logs: AuditLogEntry[]) {
  ensureDataDir();
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 2), 'utf-8');
}

export function logAuditEvent(
  event_type: AuditEventType,
  severity: AuditSeverity,
  user_email: string,
  details: Record<string, any> = {},
  ip_address = '127.0.0.1',
  user_agent = 'unknown'
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: crypto.randomUUID(),
    event_type,
    severity,
    user_email: user_email || 'anonymous',
    ip_address,
    user_agent,
    details,
    timestamp: new Date().toISOString(),
  };

  const logs = readLogs();
  logs.unshift(entry);
  // Keep last 2000 events
  if (logs.length > 2000) {
    logs.splice(2000);
  }

  writeLogs(logs);
  console.log(`[AUDIT ${severity.toUpperCase()}] ${event_type} - User: ${user_email} | IP: ${ip_address}`);
  return entry;
}

export function getAuditLogs(
  filters?: {
    event_type?: AuditEventType;
    severity?: AuditSeverity;
    user_email?: string;
    search?: string;
    limit?: number;
  }
): AuditLogEntry[] {
  let logs = readLogs();

  if (!filters) return logs.slice(0, 100);

  if (filters.event_type) {
    logs = logs.filter(l => l.event_type === filters.event_type);
  }
  if (filters.severity) {
    logs = logs.filter(l => l.severity === filters.severity);
  }
  if (filters.user_email) {
    logs = logs.filter(l => l.user_email.toLowerCase() === filters.user_email?.toLowerCase());
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    logs = logs.filter(l =>
      l.event_type.toLowerCase().includes(q) ||
      l.user_email.toLowerCase().includes(q) ||
      JSON.stringify(l.details).toLowerCase().includes(q)
    );
  }

  return logs.slice(0, filters.limit || 200);
}
