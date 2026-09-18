/**
 * Script de validation Étape 2 — MJ Studio RAG
 * Usage (backend déjà démarré sur port 3001) :
 *   node scripts/run-etape2-validation.mjs
 *
 * Écrit les résultats dans docs/etape2_resultats_console.txt
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_FILE = path.join(ROOT, 'docs', 'etape2_resultats_console.txt');

const HOST = 'localhost';
const PORT = 3001;

const lines = [];
const results = [];

function log(msg) {
  console.log(msg);
  lines.push(msg);
}

function record(test, expected, obtained, ok) {
  results.push({ test, expected, obtained, ok: ok ? 'OK' : 'KO' });
}

function request(options) {
  return new Promise((resolve, reject) => {
    const postData = options.body ? JSON.stringify(options.body) : '';
    const req = http.request(
      {
        hostname: HOST,
        port: PORT,
        path: options.path,
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
          ...(options.headers || {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (d) => (raw += d));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, data: raw ? JSON.parse(raw) : {}, raw });
          } catch {
            resolve({ status: res.statusCode || 500, data: { raw }, raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.rawBody) {
      req.write(options.rawBody);
    } else if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function requestSSE(options) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(options.body || {});
    const start = Date.now();
    let firstTokenMs = null;
    let fullAnswer = '';
    let sources = [];

    const req = http.request(
      {
        hostname: HOST,
        port: PORT,
        path: options.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          ...(options.headers || {}),
        },
      },
      (res) => {
        res.on('data', (chunk) => {
          const text = chunk.toString();
          for (const line of text.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text && firstTokenMs === null) firstTokenMs = Date.now() - start;
              if (data.text) fullAnswer += data.text;
              if (data.done) {
                sources = data.sources || [];
                resolve({
                  status: res.statusCode,
                  firstTokenMs,
                  totalMs: Date.now() - start,
                  answer: fullAnswer.trim(),
                  sources,
                });
              }
            } catch (_) {}
          }
        });
        res.on('end', () => {
          if (firstTokenMs === null) {
            resolve({ status: res.statusCode, firstTokenMs: null, totalMs: Date.now() - start, answer: fullAnswer, sources });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const h = await request({ path: '/health', method: 'GET' });
      if (h.status === 200) return true;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function main() {
  log('============================================================');
  log('VALIDATION ÉTAPE 2 — MJ Studio RAG');
  log(`Date : ${new Date().toISOString()}`);
  log('============================================================\n');

  const up = await waitForServer();
  if (!up) {
    log('ERREUR : Backend inaccessible sur http://localhost:3001');
    log('Lancez : cd backend && npm run dev');
    fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf-8');
    process.exit(1);
  }

  // --- Health ---
  const health = await request({ path: '/health', method: 'GET' });
  log(`[Health] ${JSON.stringify(health.data)}`);
  record('Health check', 'status ok', health.data.status, health.status === 200 && health.data.status === 'ok');

  // --- Login admin ---
  const loginAdmin = await request({
    path: '/auth/login',
    method: 'POST',
    body: { email: 'admin@smartdocs.com', password: 'admin123' },
  });
  const adminToken = loginAdmin.data.token;
  log(`[Login admin] status=${loginAdmin.status} role=${loginAdmin.data.user?.role}`);
  record('Connexion admin', '200 + token', `${loginAdmin.status}`, loginAdmin.status === 200 && !!adminToken);

  // --- Login reader ---
  const loginReader = await request({
    path: '/auth/login',
    method: 'POST',
    body: { email: 'user@smartdocs.com', password: 'admin123' },
  });
  const readerToken = loginReader.data.token;
  log(`[Login reader] status=${loginReader.status} role=${loginReader.data.user?.role}`);
  record('Connexion lecteur', '200 + role reader', loginReader.data.user?.role, loginReader.status === 200 && loginReader.data.user?.role === 'reader');

  // --- Register (role reader) ---
  const testEmail = `test_${Date.now()}@validation.local`;
  const reg = await request({
    path: '/auth/register',
    method: 'POST',
    body: { email: testEmail, password: 'TestPass123!', name: 'Test Validation' },
  });
  log(`[Register] status=${reg.status} role=${reg.data.user?.role}`);
  record('Inscription → rôle reader', 'reader', reg.data.user?.role, reg.status === 201 && reg.data.user?.role === 'reader');

  // --- Logout ---
  const logout = await request({
    path: '/auth/logout',
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  record('Déconnexion', '200', `${logout.status}`, logout.status === 200);

  // --- Forgot password (sur compte test jetable) ---
  const forgot = await request({
    path: '/auth/forgot-password',
    method: 'POST',
    body: { email: testEmail },
  });
  log(`[Forgot password] status=${forgot.status} dev_token=${forgot.data.dev_token ? 'oui' : 'non'}`);
  record('Mot de passe oublié', '200 + token dev', `${forgot.status}`, forgot.status === 200);

  let resetOk = false;
  if (forgot.data.dev_token) {
    const reset = await request({
      path: '/auth/reset-password',
      method: 'POST',
      body: { token: forgot.data.dev_token, password: 'NewPass123!' },
    });
    log(`[Reset password] status=${reset.status}`);
    resetOk = reset.status === 200;
  }
  record('Réinitialisation MDP', '200', resetOk ? '200' : 'skip', resetOk);

  // --- Editor login (for upload + isolation) ---
  const editorLogin = await request({
    path: '/auth/login',
    method: 'POST',
    body: { email: 'editor@smartdocs.com', password: 'admin123' },
  });
  const editorToken = editorLogin.data.token;

  // --- Security: reader cannot access admin ---
  const adminDenied = await request({
    path: '/admin/users',
    method: 'GET',
    headers: { Authorization: `Bearer ${readerToken}` },
  });
  log(`[Sec] reader → /admin/users : ${adminDenied.status}`);
  record('Lecteur bloqué sur /admin/users', '403', `${adminDenied.status}`, adminDenied.status === 403);

  // --- Security: reader cannot self-promote ---
  const promote = await request({
    path: '/admin/users/role',
    method: 'POST',
    headers: { Authorization: `Bearer ${readerToken}` },
    body: { email: 'user@smartdocs.com', role: 'admin' },
  });
  log(`[Sec] reader auto-promotion : ${promote.status}`);
  record('Lecteur ne peut pas se promouvoir admin', '403', `${promote.status}`, promote.status === 403);

  // --- Document isolation ---
  const privateContent = `DOC PRIVE VALIDATION ${Date.now()} - contenu secret editor only`;
  const editorUpload = await request({
    path: '/internal/upload/' + crypto.randomUUID() + '?filename=prive_editor.md&content_type=text/markdown',
    method: 'PUT',
    rawBody: Buffer.from(privateContent, 'utf-8'),
    headers: { Authorization: `Bearer ${editorToken}`, 'Content-Type': 'text/markdown' },
  });
  await new Promise(r => setTimeout(r, 500));
  const editorDocs = await request({
    path: '/documents',
    method: 'GET',
    headers: { Authorization: `Bearer ${editorToken}` },
  });
  const privateDoc = (editorDocs.data.items || []).find(d => d.name === 'prive_editor.md');
  let isolationOk = false;
  if (privateDoc) {
    const readerAccess = await request({
      path: `/documents/${privateDoc.document_id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${readerToken}` },
    });
    log(`[Isolation] reader accès doc editor : ${readerAccess.status}`);
    isolationOk = readerAccess.status === 403;
  }
  record('Isolation documents (reader vs editor)', '403', isolationOk ? '403' : 'fail', isolationOk);

  // --- Security: upload without auth ---
  const uploadNoAuth = await request({
    path: '/internal/upload/fake-id?filename=test.txt&content_type=text/plain',
    method: 'PUT',
    rawBody: Buffer.from('contenu test validation'),
    headers: { 'Content-Type': 'text/plain' },
  });
  log(`[Sec] upload sans auth : ${uploadNoAuth.status}`);
  record('Upload sans token rejeté', '401', `${uploadNoAuth.status}`, uploadNoAuth.status === 401);

  // --- Upload MD with auth ---
  const mdContent = `# Document validation ${Date.now()}\n\nLe remboursement des notes de frais doit être soumis avant le 5 du mois suivant.`;
  const uploadAuth = await request({
    path: '/internal/upload/' + crypto.randomUUID() + '?filename=validation_test.md&content_type=text/markdown',
    method: 'PUT',
    rawBody: Buffer.from(mdContent, 'utf-8'),
    headers: { Authorization: `Bearer ${editorToken}`, 'Content-Type': 'text/markdown' },
  });
  log(`[Upload MD auth] status=${uploadAuth.status}`);
  record('Upload Markdown authentifié', '200', `${uploadAuth.status}`, uploadAuth.status === 200);

  // --- Query simple ---
  const q1 = await requestSSE({
    path: '/query',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { question: 'Quelle est la politique de télétravail ?' },
  });
  log(`[Query simple] firstToken=${q1.firstTokenMs}ms total=${q1.totalMs}ms sources=${q1.sources?.length}`);
  log(`[Query simple] extrait: ${q1.answer.slice(0, 120)}...`);
  record('Question simple + sources', 'réponse + sources', `${q1.sources?.length} sources`, q1.sources?.length > 0 && q1.answer.length > 20);

  // --- Query off-topic ---
  const q2 = await requestSSE({
    path: '/query',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { question: 'Quel est le PIB de la Mongolie en 2024 ?' },
  });
  const refuses = q2.answer.toLowerCase().includes('ne figure pas') || q2.answer.toLowerCase().includes('pas présente');
  log(`[Query hors sujet] ${q2.answer.slice(0, 100)}`);
  record('Question hors sujet → refus', 'ne figure pas...', refuses ? 'refus détecté' : q2.answer.slice(0, 60), refuses || q2.sources?.length === 0);

  // --- Knowledge gap ---
  const gap = await request({
    path: '/api/gaps',
    method: 'POST',
    headers: { Authorization: `Bearer ${readerToken}` },
    body: {
      question: 'Test lacune documentaire',
      issue_type: 'information_absente',
      user_comment: 'Information manquante pour les tests de validation.',
      priority: 'normale',
    },
  });
  log(`[Gap report] ticket=${gap.data.ticket_number} status=${gap.status}`);
  record('Signalement lacune', '201 + ticket', gap.data.ticket_number || `${gap.status}`, gap.status === 201);

  // --- Stats ---
  const stats = await request({
    path: '/stats',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  log(`[Stats] docs=${stats.data.documents} chunks=${stats.data.chunks} queries_30d=${stats.data.queries_30d}`);
  record('Statistiques cohérentes', 'documents > 0', `docs=${stats.data.documents}`, stats.data.documents > 0);

  // --- Role change ---
  const roleChange = await request({
    path: '/admin/users/role',
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { email: testEmail, role: 'editor' },
  });
  log(`[Role change] ${testEmail} → editor : ${roleChange.status}`);
  record('Promotion utilisateur (admin)', '200', `${roleChange.status}`, roleChange.status === 200);

  // --- Summary table ---
  log('\n============================================================');
  log('TABLEAU RÉCAPITULATIF');
  log('============================================================');
  log('| Test | Attendu | Obtenu | OK/KO |');
  log('|------|---------|--------|-------|');
  for (const r of results) {
    log(`| ${r.test} | ${r.expected} | ${r.obtained} | ${r.ok} |`);
  }
  const okCount = results.filter((r) => r.ok === 'OK').length;
  log(`\nTotal : ${okCount}/${results.length} OK`);

  fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf-8');
  log(`\nRésultats sauvegardés dans : docs/etape2_resultats_console.txt`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
