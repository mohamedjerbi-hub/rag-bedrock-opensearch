# Guide de déploiement — MJ Studio RAG

> **Objectif :** Mettre en ligne le frontend (Vercel) et le backend (Railway) sans aide supplémentaire.

---

## 1. Vue d'ensemble

| Composant | Hébergeur | URL type |
|-----------|-----------|----------|
| Frontend React | **Vercel** | `https://mj-studio-rag.vercel.app` |
| API Express | **Railway** | `https://rag-backend.up.railway.app` |
| Base (option) | **Supabase** | PostgreSQL + pgvector |
| Email reset MDP | **SMTP** (Brevo/Mailgun/Gmail) | — |

```
Utilisateur → Vercel (React) → Railway (API) → JSON local ou Supabase
                    ↑__________________|
                         CORS + JWT
                         
Upload PDF scanné → Parser → Tesseract OCR → Chunks → Index
Reset MDP → SMTP → Email HTML → /reset-password
```

---

## 2. Prérequis

- Compte [GitHub](https://github.com)
- Compte [Vercel](https://vercel.com)
- Compte [Railway](https://railway.app)
- (Optionnel) Projet [Supabase](https://supabase.com)
- (Production) Compte [Brevo](https://brevo.com) ou autre SMTP

---

## 3. Backend sur Railway

### 3.1 Créer le service

1. Railway → **New Project** → **Deploy from GitHub repo**
2. Choisir le dépôt `rag-bedrock-opensearch`
3. **Root Directory** : `backend`
4. Railway détecte Node.js via `railway.toml`

### 3.2 Variables d'environnement Railway

| Variable | Exemple | Obligatoire |
|----------|---------|-------------|
| `MOCK` | `true` ou `false` | Oui |
| `PORT` | `3001` (Railway injecte aussi `PORT`) | Oui |
| `JWT_SECRET` | Chaîne aléatoire 32+ caractères | **Oui en prod** |
| `CORS_ORIGINS` | `https://votre-app.vercel.app` | Oui |
| `API_BASE_URL` | URL publique Railway | Oui |
| `FRONTEND_URL` | URL Vercel | Oui (reset MDP) |
| `OCR_ENABLED` | `true` (défaut) ou `false` | Non |
| `OCR_LANGS` | `fra+eng` (défaut) | Non |
| `SMTP_HOST` | `smtp-relay.brevo.com` | Oui (emails prod) |
| `SMTP_PORT` | `587` | Oui si SMTP |
| `SMTP_USER` | Login Brevo/Mailgun | Oui si SMTP |
| `SMTP_PASS` | Mot de passe SMTP | Oui si SMTP |
| `SMTP_FROM` | `"MJ Studio RAG" <noreply@...>` | Non |
| `COHERE_API_KEY` | clé Cohere | Optionnel |
| `SUPABASE_URL` | URL projet | Optionnel |
| `SUPABASE_SERVICE_KEY` | clé service | Optionnel |

### 3.3 Healthcheck

Railway utilise `/health` (configuré dans `railway.toml`).

Réponse attendue (avec OCR + SMTP configurés) :
```json
{
  "status": "ok",
  "version": "1.0.0",
  "mock": false,
  "features": {
    "ocr_enabled": true,
    "ocr_langs": "fra+eng",
    "smtp_configured": true,
    "email_provider": "smtp-relay.brevo.com"
  }
}
```

### 3.4 Logs et sauvegardes

- **Logs** : Railway → service → Deployments → View Logs
- **Sauvegardes JSON** : en mode MOCK, monter un volume Railway sur `backend/data/` ou migrer vers Supabase pour la prod

---

## 4. Frontend sur Vercel

### 4.1 Importer le projet

1. Vercel → **Add New Project** → GitHub repo
2. **Root Directory** : `frontend`
3. Framework : **Vite** (auto-détecté)
4. Build : `npm run build`
5. Output : `dist`

### 4.2 Variables Vercel

| Variable | Valeur |
|----------|--------|
| `VITE_API_BASE_URL` | URL Railway du backend (sans slash final) |

Exemple : `https://rag-backend-production.up.railway.app`

### 4.3 Domaine et redéploiement

- Chaque push sur `main` redéploie automatiquement (Vercel + Railway)
- Domaine custom : Vercel → Settings → Domains

### 4.4 Fichier `vercel.json`

Déjà présent dans `frontend/vercel.json` :
- SPA rewrite vers `index.html`
- Cache long sur `/assets/`

---

## 5. Liaison Frontend ↔ Backend

1. Copier l'URL Railway dans `VITE_API_BASE_URL` (Vercel)
2. Copier l'URL Vercel dans `CORS_ORIGINS` et `FRONTEND_URL` (Railway)
3. Redéployer les deux services
4. Tester : login sur l'URL Vercel

---

## 6. Configuration SMTP (emails de reset de mot de passe)

> En mode dev (`SMTP_HOST` vide) : le lien de reset s'affiche directement dans la réponse API — aucune config requise.

### 6.1 Option A — Brevo (recommandé, gratuit 300 mails/jour)

1. Créer un compte sur [brevo.com](https://brevo.com)
2. Paramètres → SMTP & API → **Créer un mot de passe SMTP**
3. Ajouter dans Railway :

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=votre_email@domaine.com
SMTP_PASS=xsmtpib-XXXX  ← mot de passe SMTP Brevo (≠ mot de passe compte)
SMTP_FROM="MJ Studio RAG" <noreply@mjstudio.io>
```

### 6.2 Option B — Mailgun (100 mails/jour gratuit)

```
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@sandbox-xxxx.mailgun.org
SMTP_PASS=votre_password_mailgun
```

### 6.3 Option C — Gmail (compte perso, 500/jour)

1. Activer la validation en 2 étapes sur le compte Google
2. Générer un **Mot de passe d'application** (Google Account → Sécurité → Mots de passe d'application)

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre.email@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx   ← mot de passe d'application (16 caractères)
```

### 6.4 Test de l'envoi

```bash
# Tester directement l'endpoint (remplacer l'URL)
curl -X POST https://rag-backend.up.railway.app/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@exemple.com"}'

# Réponse attendue en production (SMTP configuré) :
# {"message":"Si cet email existe, un lien a été généré.","email_sent":"true"}

# Réponse en dev (SMTP non configuré) :
# {"message":"...","dev_reset_url":"http://localhost:5173/reset-password?token=..."}
```

---

## 7. OCR PDF scannés (Tesseract.js)

`tesseract.js` est installé et actif par défaut (`OCR_ENABLED=true`).

### 7.1 Fonctionnement

```
Upload PDF → unpdf extrait le texte
  ├─ page > 50 chars → indexé directement ✅
  └─ page < 50 chars → tentative OCR Tesseract
      ├─ OCR > 50 chars → indexé avec texte OCR ✅
      └─ OCR insuffisant → page ignorée (log warning) ⚠️
```

### 7.2 Variables OCR

| Variable | Valeur | Description |
|----------|--------|-------------|
| `OCR_ENABLED` | `true` (défaut) | Activer/désactiver |
| `OCR_LANGS` | `fra+eng` (défaut) | `ara+fra+eng` pour arabe |

### 7.3 Langues disponibles

| Code | Langue |
|------|--------|
| `fra` | Français |
| `eng` | Anglais |
| `ara` | Arabe |
| `deu` | Allemand |
| `spa` | Espagnol |

> **Railway/mémoire** : Tesseract peut nécessiter 512 Mo RAM minimum. Si le plan Railway est trop petit, mettre `OCR_ENABLED=false` et activer manuellement si besoin.

---

## 8. CI GitHub Actions

Fichier : `.github/workflows/ci.yml`

À chaque push/PR sur `main` :
1. Build backend + frontend
2. Démarre le backend
3. Lance `node scripts/run-etape2-validation.mjs`
4. Upload le log en artifact

---

## 9. Déploiement local (développement)

```powershell
# Backend
cd backend
copy .env.example .env
# Éditer .env : JWT_SECRET, CORS_ORIGINS, etc.
npm install
npm run dev

# Frontend
cd frontend
copy .env.example .env.local
# Éditer .env.local : VITE_API_BASE_URL=http://localhost:3001
npm install
npm run dev
```

Ouvrir : http://localhost:5173

---

## 10. Checklist post-déploiement

- [ ] `/health` répond 200 sur Railway avec `features.ocr_enabled` et `features.smtp_configured`
- [ ] Login fonctionne depuis Vercel
- [ ] Upload document OK (PDF natif)
- [ ] Upload PDF scanné → OCR déclenché (voir logs Railway)
- [ ] `POST /auth/forgot-password` → email reçu dans la boîte
- [ ] Lien reset dans l'email → `/reset-password` s'ouvre
- [ ] Question RAG avec sources OK
- [ ] CORS : pas d'erreur dans la console navigateur
- [ ] `JWT_SECRET` unique en production (pas la valeur dev)

---

## 11. Dépannage

| Problème | Solution |
|----------|----------|
| CORS blocked | Vérifier `CORS_ORIGINS` inclut l'URL Vercel exacte |
| 401 partout | Vérifier `JWT_SECRET` identique après redéploiement |
| Upload échoue | Vérifier `API_BASE_URL` sur Railway |
| Réponses vides | Ajouter `COHERE_API_KEY` ou laisser MOCK=true |
| Email non reçu | Vérifier `SMTP_PASS` (mot de passe application ≠ mot de passe compte) |
| OCR lent | Normal pour Tesseract — 5 à 30 s/page selon RAM |
| OCR erreur mémoire | Mettre `OCR_ENABLED=false` ou upgrader Railway à 1 Go RAM |
| `smtp_configured: false` sur /health | `SMTP_HOST` et `SMTP_USER` et `SMTP_PASS` doivent tous être définis |

---

*MJ Studio — Mohamed Jerbi · ENI Carthage · Smartovate · 2026*
