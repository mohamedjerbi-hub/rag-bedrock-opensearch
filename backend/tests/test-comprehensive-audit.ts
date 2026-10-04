import http from 'http';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { parseDocumentBuffer } from '../src/services/parser';
import * as XLSX from 'xlsx';

const HOST = 'localhost';
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-stage-2026';

// Minimal valid PNG binary
const VALID_PNG_BUFFER = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415408d763f8cfc000000300010018dd8db00000000049454e44ae426082', 'hex');

// Minimal valid PDF binary
const VALID_PDF_BUFFER = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF', 'utf-8');

function request(options: { path: string; method: string; body?: any; headers?: Record<string, string> }): Promise<{ status: number; headers: any; data: any }> {
  return new Promise((resolve) => {
    const postData = options.body !== undefined ? (typeof options.body === 'string' || Buffer.isBuffer(options.body) ? options.body : JSON.stringify(options.body)) : '';
    const req = http.request({
      hostname: HOST,
      port: PORT,
      path: options.path,
      method: options.method,
      headers: {
        ...(typeof options.body === 'object' && !Buffer.isBuffer(options.body) ? { 'Content-Type': 'application/json' } : {}),
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        ...(options.headers || {}),
      },
    }, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try {
          const data = raw ? JSON.parse(raw) : {};
          resolve({ status: res.statusCode || 500, headers: res.headers, data });
        } catch {
          resolve({ status: res.statusCode || 500, headers: res.headers, data: { raw } });
        }
      });
    });
    req.on('error', (e) => resolve({ status: 500, headers: {}, data: { error: e.message } }));
    if (postData) req.write(postData);
    req.end();
  });
}

function uploadFile(filename: string, buffer: Buffer, contentType: string, token: string, parentId: string | null = null): Promise<{ status: number; data: any }> {
  return new Promise((resolve) => {
    const pathStr = `/internal/upload/${crypto.randomUUID()}?filename=${encodeURIComponent(filename)}&content_type=${encodeURIComponent(contentType)}&parent_id=${parentId || ''}`;
    const req = http.request({
      hostname: HOST,
      port: PORT,
      path: pathStr,
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length,
        'Authorization': `Bearer ${token}`
      },
    }, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try {
          const data = raw ? JSON.parse(raw) : {};
          resolve({ status: res.statusCode || 500, data });
        } catch {
          resolve({ status: res.statusCode || 500, data: { raw } });
        }
      });
    });
    req.on('error', (e) => resolve({ status: 500, data: { error: e.message } }));
    req.write(buffer);
    req.end();
  });
}

async function runAudit() {
  console.log('================================================================');
  console.log('       RAG MJ STUDIO — AUDIT & SCÉNARIOS D\'EXÉCUTION RÉELS      ');
  console.log('================================================================\n');

  // Emails starting with 'admin' get default 'admin' role in roleStore.ts
  const timestamp = Date.now();
  const adminEmail = `admin_audit_${timestamp}@mjstudio.io`;
  const editorEmail = `editor_audit_${timestamp}@mjstudio.io`;
  const auditorEmail = `auditor_audit_${timestamp}@mjstudio.io`;
  const readerEmail = `reader_audit_${timestamp}@mjstudio.io`;
  const pass = 'Pass123!#Secure';

  console.log('⚙️ Initialisation des comptes de test RBAC...');
  await request({ path: '/auth/register', method: 'POST', body: { email: adminEmail, password: pass, name: 'Audit Admin' } });
  await request({ path: '/auth/register', method: 'POST', body: { email: editorEmail, password: pass, name: 'Audit Editor' } });
  await request({ path: '/auth/register', method: 'POST', body: { email: auditorEmail, password: pass, name: 'Audit Auditor' } });
  await request({ path: '/auth/register', method: 'POST', body: { email: readerEmail, password: pass, name: 'Audit Reader' } });

  // Get Admin token (adminEmail starts with admin, so has admin role)
  const adminLog = await request({ path: '/auth/login', method: 'POST', body: { email: adminEmail, password: pass } });
  const adminToken = adminLog.data.token;
  
  // Set roles via admin token
  await request({ path: '/admin/users/role', method: 'POST', headers: { Authorization: `Bearer ${adminToken}` }, body: { email: editorEmail, role: 'editor' } });
  await request({ path: '/admin/users/role', method: 'POST', headers: { Authorization: `Bearer ${adminToken}` }, body: { email: auditorEmail, role: 'auditor' } });
  await request({ path: '/admin/users/role', method: 'POST', headers: { Authorization: `Bearer ${adminToken}` }, body: { email: readerEmail, role: 'reader' } });

  // Re-login to get updated JWTs
  const editorLog = await request({ path: '/auth/login', method: 'POST', body: { email: editorEmail, password: pass } });
  const editorToken = editorLog.data.token;

  const readerLog = await request({ path: '/auth/login', method: 'POST', body: { email: readerEmail, password: pass } });
  const readerToken = readerLog.data.token;

  const auditorLog = await request({ path: '/auth/login', method: 'POST', body: { email: auditorEmail, password: pass } });
  const auditorToken = auditorLog.data.token;

  // =========================================================================
  // SECTION 1: TRAITEMENT DES DOCUMENTS, TOUS TYPES
  // =========================================================================
  console.log('\n--- SECTION 1 : Traitement des documents, tous types ---');

  // 1.1 TXT
  const txtContent = 'La procédure de remboursement des frais de transport chez Smartovate requiert la soumission d\'une facture acquittée sous 30 jours au pôle Finance.';
  const txtBuf = Buffer.from(txtContent, 'utf-8');
  const txtUp = await uploadFile('procedure_transport.txt', txtBuf, 'text/plain', adminToken);
  console.log(`- TXT: Upload Status = ${txtUp.status}`);

  // 1.2 MD
  const mdContent = '# Directive Sécurité IT\n\nTous les collaborateurs doivent utiliser un mot de passe d\'au moins 12 caractères et activer le 2FA TOTP obligatoire.';
  const mdBuf = Buffer.from(mdContent, 'utf-8');
  const mdUp = await uploadFile('directive_securite.md', mdBuf, 'text/markdown', adminToken);
  console.log(`- MD: Upload Status = ${mdUp.status}`);

  // 1.3 CSV
  const csvContent = 'Departement,Responsable,Contact\nInformatique,Mohamed Jerbi,support-it@smartovate.com\nRessources Humaines,Sophie Martin,rh@smartovate.com';
  const csvBuf = Buffer.from(csvContent, 'utf-8');
  const csvUp = await uploadFile('contacts_services.csv', csvBuf, 'text/csv', adminToken);
  console.log(`- CSV: Upload Status = ${csvUp.status}`);

  // 1.4 XLSX
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Projet', 'Budget_Allocation', 'Statut_Projet'],
    ['Projet Alpha RAG Engine', '45000 EUR', 'En cours de validation'],
    ['Projet Beta OpenSearch', '28000 EUR', 'Terminé']
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Budgets');
  const xlsxBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const xlsxUp = await uploadFile('budget_projets_2026.xlsx', xlsxBuf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', adminToken);
  console.log(`- XLSX: Upload Status = ${xlsxUp.status}`);

  // 1.5 PDF
  const pdfUp = await uploadFile('guide_utilisateur.pdf', VALID_PDF_BUFFER, 'application/pdf', adminToken);
  console.log(`- PDF: Upload Status = ${pdfUp.status}`);

  // 1.6 Image net (PNG)
  const imgNetRes = await parseDocumentBuffer('sample_ocr.png', VALID_PNG_BUFFER, 'image/png');
  console.log(`- Image (OCR Tesseract): Success = ${imgNetRes.success}, Warning = "${imgNetRes.warning || 'Aucun'}"`);

  // 1.7 Fichier trop volumineux (> 20MB)
  const bigBuf = Buffer.alloc(21 * 1024 * 1024);
  const bigUp = await uploadFile('huge_file.txt', bigBuf, 'text/plain', adminToken);
  console.log(`- Oversized File (>20MB) Rejection: Status = ${bigUp.status} | Code = ${bigUp.data.error?.code}`);

  // 1.8 Extension non supportée (.exe)
  const exeBuf = Buffer.from('MZexecutablestart');
  const exeUp = await uploadFile('malware.exe', exeBuf, 'application/octet-stream', adminToken);
  console.log(`- Unsupported Extension (.exe) Rejection: Status = ${exeUp.status} | Code = ${exeUp.data.error?.code}`);

  // 1.9 Question RAG & Citation test
  const queryRes = await request({
    path: '/query',
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { question: 'Quel est le remboursement pour les frais de transport et à qui s\'adresser ?' }
  });
  const hasCitation = queryRes.data.sources && queryRes.data.sources.length > 0;
  console.log(`- Question RAG avec Citation: Citation trouvée = ${hasCitation ? 'OUI' : 'NON'} | Source: ${queryRes.data.sources?.[0]?.document_name || 'Aucune'}`);

  // =========================================================================
  // SECTION 2: SIGNALEMENT ET TRAITEMENT DES TICKETS (GAP MANAGEMENT)
  // =========================================================================
  console.log('\n--- SECTION 2 : Signalement et traitement des tickets (gap management) ---');

  // 2.1 Pose de question hors périmètre
  const unkQueryRes = await request({
    path: '/query',
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { question: 'Quelle est la recette exacte du gâteau au chocolat d\'Albert Einstein ?' }
  });
  console.log(`- Question non présente: Réponse = "${unkQueryRes.data.text || unkQueryRes.data.answer || 'Information non trouvée'}"`);

  // 2.2 Création de ticket
  const gapCreateRes = await request({
    path: '/api/gaps',
    method: 'POST',
    headers: { Authorization: `Bearer ${readerToken}` },
    body: {
      question: 'Quelle est la procédure exacte pour le télétravail les vendredis ?',
      generated_answer: 'Cette information n\'est pas présente dans les documents.',
      issue_type: 'information_absente',
      priority: 'haute',
      user_comment: 'Information manquante urgente pour l\'équipe.',
      notify_user: true
    }
  });
  const ticketId = gapCreateRes.data.gap?.id;
  const ticketNum = gapCreateRes.data.gap?.ticket_number;
  console.log(`- Création Ticket GAP: Status = ${gapCreateRes.status} | Ticket # = ${ticketNum}`);

  // 2.3 Consultation par un Éditeur/Admin
  const gapListRes = await request({
    path: '/api/gaps',
    method: 'GET',
    headers: { Authorization: `Bearer ${editorToken}` }
  });
  const foundTicket = gapListRes.data.items?.find((g: any) => g.id === ticketId);
  console.log(`- Ticket présent pour l'Éditeur: ${foundTicket ? 'OUI' : 'NON'} | Question = "${foundTicket?.question}"`);

  // 2.4 Modification statut -> resolu
  const resolveRes = await request({
    path: `/api/gaps/${ticketId}`,
    method: 'PATCH',
    headers: { Authorization: `Bearer ${editorToken}` },
    body: { status: 'resolu', resolution_note: 'Charte télétravail ajoutée dans la bibliothèque.' }
  });
  console.log(`- Modification statut -> resolu: Status = ${resolveRes.status} | Statut final = ${resolveRes.data.gap?.status}`);

  // 2.5 RBAC Block pour un Reader sur /api/gaps
  const readerGapList = await request({
    path: '/api/gaps',
    method: 'GET',
    headers: { Authorization: `Bearer ${readerToken}` }
  });
  console.log(`- Bloquage RBAC Reader sur /api/gaps (list all): Status = ${readerGapList.status} (Attendu: 403 FORBIDDEN)`);

  // =========================================================================
  // SECTION 3: VALIDATION ET CORRECTION
  // =========================================================================
  console.log('\n--- SECTION 3 : Validation et correction ---');

  // 3.1 Connexion invalide
  const badLogin1 = await request({ path: '/auth/login', method: 'POST', body: { email: 'invalid-email', password: '' } });
  console.log(`- Validation Formulaire Login: Status = ${badLogin1.status} | Error = "${badLogin1.data.error?.message}"`);

  // 3.2 Renommer un document & Persistance
  const docsList = await request({ path: '/documents', method: 'GET', headers: { Authorization: `Bearer ${adminToken}` } });
  const targetDoc = docsList.data.items?.[0];
  if (targetDoc) {
    const renameRes = await request({
      path: `/documents/${targetDoc.document_id}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { name: 'nouveau_nom_procedure.txt' }
    });
    const verifyDocList = await request({ path: '/documents', method: 'GET', headers: { Authorization: `Bearer ${adminToken}` } });
    const renamedDoc = verifyDocList.data.items?.find((d: any) => d.document_id === targetDoc.document_id);
    console.log(`- Renommage Document: Status = ${renameRes.status} | Nom Persisté = "${renamedDoc?.name}"`);
  }

  // =========================================================================
  // SECTION 4: ADMINISTRATION ET STATISTIQUES
  // =========================================================================
  console.log('\n--- SECTION 4 : Administration et statistiques ---');

  const statsRes = await request({ path: '/stats', method: 'GET', headers: { Authorization: `Bearer ${adminToken}` } });
  console.log(`- Statistiques réelles du serveur: Docs = ${statsRes.data.documents}, Chunks = ${statsRes.data.chunks}, Requêtes 30j = ${statsRes.data.queries_30d}, Latence moyenne = ${statsRes.data.avg_latency_ms}ms`);

  // Suspension
  await request({ path: '/admin/users/status', method: 'POST', headers: { Authorization: `Bearer ${adminToken}` }, body: { email: readerEmail, active: false } });
  const suspendedAccess = await request({ path: '/documents', method: 'GET', headers: { Authorization: `Bearer ${readerToken}` } });
  console.log(`- Suspension de compte: Status = ${suspendedAccess.status} | Code = ${suspendedAccess.data.error?.code}`);

  // =========================================================================
  // SECTION 5: SÉCURITÉ EN CONDITIONS RÉELLES
  // =========================================================================
  console.log('\n--- SECTION 5 : Sécurité — Tests en conditions réelles ---');

  console.log('5.1 Matrice d\'autorisation RBAC (API Endpoints) :');
  const rbacTests = [
    { role: 'Reader', token: readerToken, path: '/stats', method: 'GET', expected: 403 },
    { role: 'Auditor', token: auditorToken, path: '/stats', method: 'GET', expected: 403 },
    { role: 'Editor', token: editorToken, path: '/stats', method: 'GET', expected: 403 },
    { role: 'Admin', token: adminToken, path: '/stats', method: 'GET', expected: 200 },
    { role: 'Reader', token: readerToken, path: '/admin/users', method: 'GET', expected: 403 },
    { role: 'Reader', token: readerToken, path: '/audit/security-logs', method: 'GET', expected: 403 },
    { role: 'Auditor', token: auditorToken, path: '/audit/security-logs', method: 'GET', expected: 200 },
    { role: 'Auditor', token: auditorToken, path: '/documents/upload-url', method: 'POST', expected: 403 },
    { role: 'Editor', token: editorToken, path: '/documents', method: 'GET', expected: 200 },
    { role: 'Admin', token: adminToken, path: '/admin/users', method: 'GET', expected: 200 },
  ];

  for (const t of rbacTests) {
    const res = await request({ path: t.path, method: t.method, headers: { Authorization: `Bearer ${t.token}` } });
    const ok = res.status === t.expected;
    console.log(`  - [${t.role}] ${t.method} ${t.path} -> Status ${res.status} (Attendu: ${t.expected}) ${ok ? '✅' : '❌'}`);
  }

  // JWT Falsifié & Expiré
  const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImhhY2tlckBldmlsLmNvbSIsInJvbGUiOiJhZG1pbiJ9.invalid-signature';
  const fakeJwtRes = await request({ path: '/admin/users', method: 'GET', headers: { Authorization: `Bearer ${fakeToken}` } });
  console.log(`- Token JWT Falsifié: Status = ${fakeJwtRes.status} (Attendu: 401) | Code = ${fakeJwtRes.data.error?.code}`);

  const expiredToken = jwt.sign({ email: adminEmail, role: 'admin' }, JWT_SECRET, { expiresIn: -10 });
  const expJwtRes = await request({ path: '/admin/users', method: 'GET', headers: { Authorization: `Bearer ${expiredToken}` } });
  console.log(`- Token JWT Expiré: Status = ${expJwtRes.status} (Attendu: 401) | Message = "${expJwtRes.data.error?.message}"`);

  // Token Reset MDP Single Use (Replay attack)
  const forgotRes = await request({ path: '/auth/forgot-password', method: 'POST', body: { email: adminEmail } });
  const resetToken = forgotRes.data.dev_token;
  if (resetToken) {
    const reset1 = await request({ path: '/auth/reset-password', method: 'POST', body: { token: resetToken, password: 'NewPassword123!' } });
    const reset2 = await request({ path: '/auth/reset-password', method: 'POST', body: { token: resetToken, password: 'AnotherPassword123!' } });
    console.log(`- Token Reset MDP Réutilisation (Replay Attack): 1er essai = ${reset1.status} | 2ème essai = ${reset2.status} (Attendu: 400 Rejeté)`);
  }

  // Audit Log Traçabilité
  const auditLogsRes = await request({ path: '/audit/security-logs', method: 'GET', headers: { Authorization: `Bearer ${adminToken}` } });
  const logsCount = auditLogsRes.data.items?.length || 0;
  console.log(`- Journal d'Audit de Sécurité (/audit/security-logs): ${logsCount} événements enregistrés (Sévérités: INFO, WARNING, CRITICAL).`);

  console.log('\n================================================================');
  console.log('                   FIN DE L\'AUDIT RÉEL EN DIRECT                ');
  console.log('================================================================\n');
}

runAudit().catch(err => console.error('Audit Runner Error:', err));
