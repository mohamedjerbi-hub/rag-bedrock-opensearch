/**
 * Centralized Utility Library - MJ Studio (ENI Carthage)
 */

/** Format ISO date string into standard French date/time format */
export function formatDate(dateString: string | number | Date, includeTime = false): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  };

  return new Intl.DateTimeFormat('fr-FR', options).format(date);
}

/** Format file size in bytes to human-readable string (B, KB, MB, GB) */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/** Centralized API error message extractor */
export function getErrorMessage(err: unknown, fallback = 'Une erreur est survenue'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && 'message' in err && typeof (err as Record<string, unknown>).message === 'string') {
    return (err as Record<string, unknown>).message as string;
  }
  return fallback;
}

/** Classnames helper joining conditional classes */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Validate email format — basic RFC-compliant check */
export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email requis.';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) return 'Adresse email invalide.';
  return null;
}

/**
 * Validate password strength.
 * Minimum 8 characters — matches the backend constraint on /auth/reset-password.
 */
export function validatePassword(password: string): string | null {
  if (!password) return 'Mot de passe requis.';
  if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
  return null;
}

