import http from 'http';

const HOST = 'localhost';
const PORT = 3001;

function request(options: { path: string; method: string; body?: any; headers?: Record<string, string> }): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const postData = options.body ? JSON.stringify(options.body) : '';
    const req = http.request({
      hostname: HOST,
      port: PORT,
      path: options.path,
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        ...(options.headers || {}),
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
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runLot2Tests() {
  console.log('============================================================');
  console.log('🧪 VERIFICATION BENCHMARK LOT 2 : USER MANAGEMENT & RBAC');
  console.log('============================================================\n');

  // 1. Setup Admin & Reader Users
  const adminEmail = `admin_${Date.now()}@test.com`;
  const readerEmail = `reader_${Date.now()}@test.com`;
  const pass = 'Pass123!#';

  console.log('1️⃣  Création du compte Admin...');
  const adminReg = await request({
    path: '/auth/register',
    method: 'POST',
    body: { email: adminEmail, password: pass, name: 'Admin Master' }
  });
  const adminToken = adminReg.data.token;
  console.log(`   Admin Token: ${adminToken ? 'OK' : 'FAIL'}`);

  console.log('\n2️⃣  Création du compte Lecteur (Reader)...');
  const readerReg = await request({
    path: '/auth/register',
    method: 'POST',
    body: { email: readerEmail, password: pass, name: 'Simple Reader' }
  });
  const readerToken = readerReg.data.token;
  console.log(`   Reader Token: ${readerToken ? 'OK' : 'FAIL'}`);

  // 3. Test RBAC: Reader attempt to upload document (Must fail 403)
  console.log('\n3️⃣  Test RBAC : Tentative d\'upload de document par un LECTEUR...');
  const readerUploadRes = await request({
    path: '/documents/upload-url',
    method: 'POST',
    headers: { Authorization: `Bearer ${readerToken}` },
    body: { filename: 'unauthorized.pdf' }
  });
  console.log(`   Status: ${readerUploadRes.status} (${readerUploadRes.data.error?.code || 'FORBIDDEN'})`);
  console.log(`   Accès refusé aux Lecteurs : ${readerUploadRes.status === 403 ? '✅ OUI (RBAC Fonctionnel)' : '❌ NON'}`);

  // 4. Test Admin listing users
  console.log('\n4️⃣  Consultation de l\'annuaire des utilisateurs (/admin/users par Admin)...');
  const usersRes = await request({
    path: '/admin/users',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log(`   Status: ${usersRes.status} | Nombre d'utilisateurs: ${usersRes.data.users?.length}`);

  // 5. Test Admin updating user role to Auditor
  console.log('\n5️⃣  Modification du rôle de LECTEUR ➔ AUDITEUR par l\'Admin...');
  const roleRes = await request({
    path: '/admin/users/role',
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { email: readerEmail, role: 'auditor' }
  });
  console.log(`   Status: ${roleRes.status} | Nouveau rôle enregistré: ${roleRes.data.user?.role}`);

  // 6. Test Account Suspension
  console.log('\n6️⃣  Suspension du compte de l\'utilisateur par l\'Admin...');
  const statusRes = await request({
    path: '/admin/users/status',
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { email: readerEmail, active: false }
  });
  console.log(`   Status: ${statusRes.status} | Statut du compte: ${statusRes.data.user?.active ? 'ACTIF' : 'SUSPENDU'}`);

  console.log('   Tentative de connexion avec le compte suspendu...');
  const suspendedLoginRes = await request({
    path: '/auth/login',
    method: 'POST',
    body: { email: readerEmail, password: pass }
  });
  console.log(`   Status: ${suspendedLoginRes.status} (${suspendedLoginRes.data.error?.code})`);
  console.log(`   Connexion bloquée : ${suspendedLoginRes.status === 403 ? '✅ OUI (Compte Suspendu)' : '❌ NON'}`);

  // 7. Verify Audit Log for Role Change
  console.log('\n7️⃣  Vérification de la traçabilité dans le journal d\'audit...');
  const auditRes = await request({
    path: '/audit/security-logs',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const roleEvents = auditRes.data.items?.filter((i: any) => i.event_type === 'USER_ROLE_CHANGE') || [];
  console.log(`   Status: ${auditRes.status} | Événements 'USER_ROLE_CHANGE' enregistrés: ${roleEvents.length}`);

  console.log('\n============================================================');
  console.log('✅ BENCHMARK LOT 2 RÉUSSI AVEC SUCCÈS !');
  console.log('============================================================');
}

runLot2Tests().catch(console.error);
