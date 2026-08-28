import { Request, Response, NextFunction } from 'express';
import { logAuditEvent } from '../services/auditLogger';

// ─── Security Headers ─────────────────────────────────────────────────────────

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  next();
}

// ─── In-Memory Rate Limiter ───────────────────────────────────────────────────

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitBucket>();

// Clean up expired buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitStore.entries()) {
    if (now > bucket.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function createRateLimiter(options: { windowMs: number; max: number; keyPrefix: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const key = `${options.keyPrefix}:${ip}`;
    const now = Date.now();

    let bucket = rateLimitStore.get(key);

    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 1, resetAt: now + options.windowMs };
      rateLimitStore.set(key, bucket);
      return next();
    }

    bucket.count++;

    if (bucket.count > options.max) {
      logAuditEvent(
        'RATE_LIMIT_EXCEEDED',
        'warning',
        (req as any).user?.email || 'anonymous',
        { path: req.path, count: bucket.count, max: options.max },
        ip
      );

      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: `Trop de requêtes. Veuillez réécarter avant d'essayer à nouveau (attente : ${retryAfterSeconds}s).`,
        },
      });
    }

    next();
  };
}

// Rate limit instances
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // max 10 auth requests / min per IP
  keyPrefix: 'auth',
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 120,            // max 120 API requests / min per IP
  keyPrefix: 'api',
});

// ─── Prompt Injection Protection ──────────────────────────────────────────────

const SUSPICIOUS_PROMPT_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|above)\s+instructions/i,
  /override\s+(system\s+)?prompt/i,
  /you\s+are\s+now\s+in\s+DAN\s+mode/i,
  /act\s+as\s+an\s+unrestricted\s+AI/i,
  /reveal\s+your\s+system\s+prompt/i,
  /what\s+are\s+your\s+system\s+instructions/i,
  /oubli[ee]s?\s+toutes?\s+les?\s+consignes?\s+pr[eé]c[eé]dentes?/i,
  /ignore\s+les?\s+r[eè]gles?\s+pr[eé]c[eé]dentes?/i,
];

export function promptInjectionFilter(req: Request, res: Response, next: NextFunction) {
  const question = req.body?.question || req.body?.prompt || '';

  if (typeof question === 'string' && question.trim().length > 0) {
    for (const pattern of SUSPICIOUS_PROMPT_PATTERNS) {
      if (pattern.test(question)) {
        const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
        logAuditEvent(
          'PROMPT_INJECTION_BLOCKED',
          'critical',
          (req as any).user?.email || 'anonymous',
          { question, pattern: pattern.toString() },
          ip
        );

        return res.status(400).json({
          error: {
            code: 'SECURITY_VIOLATION',
            message: 'Requête rejetée par le filtre de sécurité (tentative d\'injection de prompt détectée).',
          },
        });
      }
    }
  }

  next();
}
