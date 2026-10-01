// test-smtp.mjs — Test du flux mot de passe oublié
// Usage : node scripts/test-smtp.mjs <email>

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const testEmail = process.argv[2] || 'souroubat30@gmail.com';
const API = 'http://localhost:3001';

console.log(`\n🧪 Test SMTP — envoi vers : ${testEmail}\n`);

async function testForgotPassword() {
  console.log('1️⃣  POST /auth/forgot-password ...');
  const res = await fetch(`${API}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail }),
  });

  const data = await res.json();
  console.log('   Status :', res.status);
  console.log('   Body   :', JSON.stringify(data, null, 2));

  if (data.email_sent === 'true') {
    console.log('\n✅ Email envoyé avec succès ! Vérifie ta boîte Gmail.');
  } else if (data.dev_reset_url) {
    console.log('\n⚠️  Mode DEV — SMTP non actif. Lien reset :', data.dev_reset_url);
    if (data.smtp_error) console.log('   Erreur SMTP :', data.smtp_error);
  } else if (data.message) {
    console.log('\nℹ️  Message générique (email peut ne pas exister ou SMTP error silencieuse):', data.message);
    if (data.smtp_error) console.log('   Erreur SMTP :', data.smtp_error);
  } else {
    console.log('\n❌ Réponse inattendue.');
  }
}

async function testSmtpHealth() {
  console.log('\n2️⃣  GET /health (SMTP healthcheck) ...');
  try {
    const res = await fetch(`${API}/health`);
    const data = await res.json();
    console.log('   Body :', JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('   Pas de route /health disponible.');
  }
}

(async () => {
  try {
    await testForgotPassword();
    await testSmtpHealth();
  } catch (err) {
    console.error('\n❌ Erreur réseau :', err.message);
    console.error('   Le backend est-il démarré sur http://localhost:3001 ?');
  }
  console.log('');
})();
