/**
 * emailService.ts — Service d'envoi d'emails (Nodemailer)
 *
 * Comportement :
 *  - Si SMTP_HOST est défini → envoi réel via SMTP (prod)
 *  - Sinon → mode développement, le lien est retourné dans la réponse API (pas d'envoi)
 *
 * Fournisseurs supportés (config via variables d'env) :
 *  - Brevo (ex-Sendinblue) : SMTP_HOST=smtp-relay.brevo.com  SMTP_PORT=587
 *  - Mailgun               : SMTP_HOST=smtp.mailgun.org       SMTP_PORT=587
 *  - Gmail                 : SMTP_HOST=smtp.gmail.com         SMTP_PORT=587
 *  - SMTP entreprise       : SMTP_HOST=mail.monentreprise.com SMTP_PORT=465
 */

import nodemailer, { Transporter } from 'nodemailer';

// ─── Configuration (lazy — lue à chaque appel pour garantir que dotenv est déjà chargé) ─────

function getSmtpConfig() {
  return {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || `"MJ Studio RAG" <noreply@mjstudio.io>`,
    get configured() {
      return Boolean(this.host && this.user && this.pass);
    },
  };
}

// IS_SMTP_CONFIGURED — évalué dynamiquement (utilisé dans server.ts)
export function IS_SMTP_CONFIGURED(): boolean {
  return getSmtpConfig().configured;
}

// ─── Transporter Singleton ─────────────────────────────────────────────────────

let _transporter: Transporter | null = null;
let _lastConfig = '';

function getTransporter(): Transporter {
  const cfg = getSmtpConfig();
  const cfgKey = `${cfg.host}:${cfg.port}:${cfg.user}`;

  // Recrée le transporter si la config a changé (ex: rechargement env)
  if (!_transporter || cfgKey !== _lastConfig) {
    _transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465, // true pour 465 (SSL), false pour 587 (STARTTLS)
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });
    _lastConfig = cfgKey;
  }
  return _transporter;
}

// ─── Templates HTML ────────────────────────────────────────────────────────────

function buildPasswordResetEmail(resetUrl: string, userEmail: string): { subject: string; html: string; text: string } {
  const subject = '🔐 Réinitialisation de votre mot de passe — MJ Studio RAG';

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 4px 30px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                🤖 MJ Studio RAG
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">
                Intelligence Documentaire — Smartovate
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:20px;font-weight:600;">
                Réinitialisation de mot de passe
              </h2>
              <p style="margin:0 0 12px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Bonjour,
              </p>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Une demande de réinitialisation de mot de passe a été effectuée pour le compte associé à
                <strong style="color:#e2e8f0;">${userEmail}</strong>.
              </p>
              <p style="margin:0 0 28px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
                Ce lien est valide pendant <strong style="color:#e2e8f0;">30 minutes</strong>.
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding:0 0 32px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:16px;font-weight:600;letter-spacing:0.3px;box-shadow:0 4px 15px rgba(99,102,241,0.4);">
                      Réinitialiser mon mot de passe →
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Link fallback -->
              <div style="background:#0f172a;border-radius:8px;padding:16px;margin-bottom:24px;">
                <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">
                  Lien complet (si le bouton ne fonctionne pas) :
                </p>
                <p style="margin:0;word-break:break-all;">
                  <a href="${resetUrl}" style="color:#818cf8;font-size:13px;">${resetUrl}</a>
                </p>
              </div>
              <!-- Warning -->
              <div style="border-left:3px solid #f59e0b;padding:12px 16px;background:rgba(245,158,11,0.08);border-radius:0 8px 8px 0;">
                <p style="margin:0;color:#fbbf24;font-size:13px;line-height:1.5;">
                  ⚠️ Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                  Votre mot de passe ne sera pas modifié.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;padding:20px 40px;text-align:center;border-top:1px solid #1e293b;">
              <p style="margin:0;color:#475569;font-size:12px;">
                MJ Studio RAG · Smartovate · ENI Carthage 2026<br>
                Cet email est généré automatiquement, ne pas répondre.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Réinitialisation de mot de passe — MJ Studio RAG

Bonjour,

Une demande de réinitialisation a été effectuée pour : ${userEmail}

Lien de réinitialisation (valide 30 minutes) :
${resetUrl}

Si vous n'avez pas fait cette demande, ignorez cet email.

MJ Studio RAG · Smartovate
  `.trim();

  return { subject, html, text };
}

// ─── Public API ────────────────────────────────────────────────────────────────

export interface EmailResult {
  sent: boolean;
  dev_mode: boolean;
  error?: string;
}

/**
 * Envoie l'email de réinitialisation de mot de passe.
 * En mode dev (SMTP non configuré) : retourne sent=false, dev_mode=true.
 * En mode prod (SMTP configuré)    : envoie un vrai email HTML.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  resetUrl: string
): Promise<EmailResult> {
  if (!IS_SMTP_CONFIGURED()) {
    console.log(`[EmailService] Mode dev — SMTP non configuré. Lien reset : ${resetUrl}`);
    return { sent: false, dev_mode: true };
  }

  try {
    const { subject, html, text } = buildPasswordResetEmail(resetUrl, toEmail);
    const transporter = getTransporter();
    const cfg = getSmtpConfig();

    await transporter.sendMail({
      from: cfg.from,
      to: toEmail,
      subject,
      html,
      text,
    });

    console.log(`[EmailService] Email reset envoyé à ${toEmail}`);
    return { sent: true, dev_mode: false };
  } catch (err: any) {
    console.error(`[EmailService] Échec envoi email à ${toEmail}:`, err?.message || err);
    return { sent: false, dev_mode: false, error: err?.message || 'Erreur SMTP inconnue' };
  }
}

/**
 * Vérifie la connexion SMTP (healthcheck).
 */
export async function checkSmtpConnection(): Promise<{ ok: boolean; configured: boolean; error?: string }> {
  if (!IS_SMTP_CONFIGURED()) {
    return { ok: false, configured: false };
  }
  try {
    await getTransporter().verify();
    return { ok: true, configured: true };
  } catch (err: any) {
    return { ok: false, configured: true, error: err?.message };
  }
}
