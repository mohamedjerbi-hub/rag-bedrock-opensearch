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

async function runLot3Tests() {
  console.log('============================================================');
  console.log('🧪 VERIFICATION BENCHMARK LOT 3 : STATISTICS & ANALYTICS');
  console.log('============================================================\n');

  // Register an admin user
  const adminEmail = `stats_admin_${Date.now()}@test.com`;
  const pass = 'Pass123!#';

  console.log('1️⃣  Authentification Administrateur...');
  const regRes = await request({
    path: '/auth/register',
    method: 'POST',
    body: { email: adminEmail, password: pass, name: 'Stats Admin' }
  });
  const token = regRes.data.token;
  console.log(`   Token Admin: ${token ? 'OK' : 'FAIL'}`);

  // Fetch Stats
  console.log('\n2️⃣  Récupération des métriques enrichies (/stats)...');
  const statsRes = await request({
    path: '/stats',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log(`   Status HTTP: ${statsRes.status}`);
  const s = statsRes.data;

  console.log('\n3️⃣  Vérification des KPIs généraux :');
  console.log(`   - Documents Totaux : ${s.documents}`);
  console.log(`   - Chunks Vectorisés: ${s.chunks}`);
  console.log(`   - Requêtes (30j)    : ${s.queries_30d}`);
  console.log(`   - Latence Moyenne  : ${s.avg_latency_ms} ms`);
  console.log(`   - Taux de Succès   : ${s.success_rate}%`);
  console.log(`   - Taux d'Absence   : ${s.unresolved_rate}%`);

  console.log('\n4️⃣  Vérification de la Répartition des Formats de Documents :');
  console.log(`   - PDF   : ${s.document_formats?.pdf} fichier(s)`);
  console.log(`   - DOCX  : ${s.document_formats?.docx} fichier(s)`);
  console.log(`   - XLSX  : ${s.document_formats?.xlsx} fichier(s)`);
  console.log(`   - MD/TXT: ${s.document_formats?.text} fichier(s)`);

  console.log('\n5️⃣  Vérification du Top des Documents les Plus Cités :');
  if (s.top_sources && s.top_sources.length > 0) {
    for (const src of s.top_sources) {
      console.log(`   - [${src.name}] : ${src.count} citation(s)`);
    }
  } else {
    console.log('   - Aucune citation enregistrée.');
  }

  const valid = s.documents >= 0 && s.document_formats && s.queries_by_day;
  console.log('\n============================================================');
  console.log(valid ? '✅ BENCHMARK LOT 3 RÉUSSI AVEC SUCCÈS !' : '❌ ECHEC DU BENCHMARK LOT 3');
  console.log('============================================================');
}

runLot3Tests().catch(console.error);
