import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface PasswordResetToken {
  email: string;
  token: string;
  expires_at: string;
  used: boolean;
}

const RESET_FILE = path.join(__dirname, '../../data/password_resets.json');
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

function ensureDir() {
  const dir = path.dirname(RESET_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readTokens(): PasswordResetToken[] {
  try {
    if (fs.existsSync(RESET_FILE)) {
      return JSON.parse(fs.readFileSync(RESET_FILE, 'utf-8'));
    }
  } catch (_) {}
  return [];
}

function writeTokens(tokens: PasswordResetToken[]) {
  ensureDir();
  fs.writeFileSync(RESET_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}

export function createPasswordResetToken(email: string): PasswordResetToken {
  const tokens = readTokens().filter(t => t.email.toLowerCase() !== email.toLowerCase());
  const entry: PasswordResetToken = {
    email: email.toLowerCase().trim(),
    token: crypto.randomBytes(32).toString('hex'),
    expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
    used: false,
  };
  tokens.push(entry);
  writeTokens(tokens);
  return entry;
}

export function consumePasswordResetToken(token: string): PasswordResetToken | null {
  const tokens = readTokens();
  const idx = tokens.findIndex(t => t.token === token && !t.used);
  if (idx === -1) return null;

  const entry = tokens[idx];
  if (new Date(entry.expires_at) < new Date()) return null;

  tokens[idx] = { ...entry, used: true };
  writeTokens(tokens);
  return entry;
}

export function revokePasswordResetTokens(email: string): void {
  const tokens = readTokens().filter(t => t.email.toLowerCase() !== email.toLowerCase());
  writeTokens(tokens);
}
