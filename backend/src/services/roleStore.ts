import fs from 'fs';
import path from 'path';
import { logAuditEvent } from './auditLogger';

export type UserRole = 'admin' | 'editor' | 'auditor' | 'reader';

export interface UserRoleRecord {
  email: string;
  role: UserRole;
  active: boolean;
  assigned_by: string;
  updated_at: string;
}

const ROLES_FILE = path.join(__dirname, '../../data/user_roles.json');

function ensureDataDir() {
  const dir = path.dirname(ROLES_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readRoleRecords(): Record<string, UserRoleRecord> {
  try {
    if (fs.existsSync(ROLES_FILE)) {
      return JSON.parse(fs.readFileSync(ROLES_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('[RoleStore] Error reading role store:', e);
  }
  return {};
}

function writeRoleRecords(records: Record<string, UserRoleRecord>) {
  ensureDataDir();
  fs.writeFileSync(ROLES_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

// Default role mapping if not explicitly assigned
export function getUserRoleRecord(email: string): UserRoleRecord {
  const cleanEmail = email.toLowerCase().trim();
  const records = readRoleRecords();

  if (records[cleanEmail]) {
    return records[cleanEmail];
  }

  // Admin rule: admin@test.com or admin@* is admin by default
  const defaultRole: UserRole = cleanEmail.startsWith('admin') ? 'admin' : 'reader';
  const defaultRecord: UserRoleRecord = {
    email: cleanEmail,
    role: defaultRole,
    active: true,
    assigned_by: 'system',
    updated_at: new Date().toISOString(),
  };

  records[cleanEmail] = defaultRecord;
  writeRoleRecords(records);
  return defaultRecord;
}

export function setUserRole(
  targetEmail: string,
  newRole: UserRole,
  updatedBy: string,
  ip = '127.0.0.1'
): UserRoleRecord {
  const cleanEmail = targetEmail.toLowerCase().trim();
  const records = readRoleRecords();
  const current = getUserRoleRecord(cleanEmail);

  const previousRole = current.role;
  current.role = newRole;
  current.assigned_by = updatedBy;
  current.updated_at = new Date().toISOString();

  records[cleanEmail] = current;
  writeRoleRecords(records);

  logAuditEvent(
    'USER_ROLE_CHANGE',
    'warning',
    updatedBy,
    { target_user: cleanEmail, previous_role: previousRole, new_role: newRole },
    ip
  );

  return current;
}

export function setUserStatus(
  targetEmail: string,
  active: boolean,
  updatedBy: string,
  ip = '127.0.0.1'
): UserRoleRecord {
  const cleanEmail = targetEmail.toLowerCase().trim();
  const records = readRoleRecords();
  const current = getUserRoleRecord(cleanEmail);

  current.active = active;
  current.assigned_by = updatedBy;
  current.updated_at = new Date().toISOString();

  records[cleanEmail] = current;
  writeRoleRecords(records);

  logAuditEvent(
    'USER_ROLE_CHANGE',
    active ? 'info' : 'critical',
    updatedBy,
    { target_user: cleanEmail, status: active ? 'ACTIVATED' : 'SUSPENDED' },
    ip
  );

  return current;
}

export function getAllUserRoleRecords(): UserRoleRecord[] {
  const records = readRoleRecords();
  return Object.values(records);
}
