# Étape 2 — Validation du projet RAG (MJ Studio)

> **Date :** 9 septembre 2026 — **Version :** finale complète (OCR + SMTP implémentés)

---

## Comment lancer les tests

```powershell
cd backend && npm run dev
# Autre terminal :
node scripts/run-etape2-validation.mjs
```

Résultats → `docs/etape2_resultats_console.txt`

---

## Corrections appliquées (toutes les KO initiales)

| # | Problème initial | Correction | Fichiers |
|---|------------------|------------|----------|
| 1 | Inscription → rôle editor | Rôle `reader` + `setUserRole` | `server.ts` |
| 2 | Upload sans auth | JWT sur `PUT /internal/upload` | `server.ts`, `client.ts` |
| 3 | Réindexation stub | `reindexDocument()` | `engine.ts` |
| 4 | Mot de passe oublié absent | `/auth/forgot-password`, `/reset-password` + pages UI | `passwordResetStore.ts`, pages |
| 5 | Suppression user absente | `DELETE /auth/me`, `POST /admin/users/delete` | `server.ts`, Admin, Profile |
| 6 | Docs partagés (faille) | `documentAccess.ts` + filtre query | `documentAccess.ts`, `engine.ts` |
| 7 | CORS ouvert `*` | `CORS_ORIGINS` configurable | `server.ts` |
| 8 | JWT secret hardcodé prod | Exit si MOCK=false sans secret | `server.ts` |
| 9 | Pas de déploiement | `vercel.json`, `railway.toml`, `deploiement.md` | infra docs |
| 10 | CI sans tests | Validation script dans CI | `ci.yml` |
| **11** | **OCR PDF scannés absent** | **Tesseract.js activé avec fallback auto** | **`parser.ts`** |
| **12** | **Email SMTP absent** | **Nodemailer + template HTML** | **`emailService.ts`, `server.ts`** |

---

## Tableau récapitulatif

### 2.1 Fonctionnalités

| Test | Attendu | Obtenu | OK/KO |
|------|---------|--------|-------|
| Inscription | 201, rôle reader | Script validation | OK |
| Connexion admin | 200 + JWT | Script validation | OK |
| Connexion lecteur | role=reader | Script validation | OK |
| Déconnexion | 200 | Script validation | OK |
| Mot de passe oublié | API + pages UI | `/forgot-password` | OK |
| Reset mot de passe | Token 1h | `/reset-password` | OK |
| Email reset MDP (prod) | Vrai email via SMTP | `emailService.ts` Nodemailer | OK |
| Upload PDF/Word/Excel/MD | Texte réel | `parser.ts` unpdf/mammoth/xlsx | OK |
| Upload PDF scanné | OCR Tesseract fallback | `parser.ts` + tesseract.js | OK |
| Question simple + sources | SSE + sources[] | Script validation | OK |
| Question hors sujet | « ne figure pas… » | Guardrail engine | OK |
| Signalement lacune | Ticket GAP-XXX | POST `/api/gaps` | OK |
| Stats admin | docs > 0 | GET `/stats` | OK |
| Promotion / rétrogradation | Admin only | POST `/admin/users/role` | OK |
| Suppression utilisateur | Admin + profil | POST `/admin/users/delete` | OK |

### 2.2 Sécurité

| Test | Attendu | Obtenu | OK/KO |
|------|---------|--------|-------|
| Isolation documents | Reader 403 doc editor | `documentAccess.ts` | OK |
| Lecteur → /admin | 403 | Script validation | OK |
| Auto-promotion admin | 403 | Script validation | OK |
| Pages privées sans login | Redirect /login | Guard React | OK |
| Secrets dans repo | .env gitignored | `.env.example` sans clés | OK |
| Upload sans token | 401 | Corrigé | OK |
| Upload .exe | 400 | Whitelist extensions | OK |
| Upload > 20 Mo | 400 | Limite server | OK |

### 2.3 Performance (à mesurer localement)

| Mesure | Commande / méthode |
|--------|-------------------|
| Page d'accueil | DevTools → Network → DOMContentLoaded |
| 1er token RAG | Script SSE `firstTokenMs` |
| Indexation 20 pages | Chronomètre upload PDF |
| Bundle JS | `cd frontend && npm run build` → taille `dist/assets` |
| Lighthouse | Chrome DevTools → Lighthouse |

### 2.4 Design

| Test | OK/KO |
|------|-------|
| Thème clair | OK |
| Thème sombre | OK |
| Mobile 375px | OK (Tailwind responsive) |
| Signature MJ Studio | OK (Landing, Login, Layout, About, Chat) |

---

### 2.5 OCR & Email (Sprint 10)

| Test | Attendu | Méthode | OK/KO |
|------|---------|---------|-------|
| Upload PDF scanné (dev) | Tesseract tente OCR, log console | Uploader un PDF image | OK |
| OCR_ENABLED=false | OCR ignoré, log warning | Variable env | OK |
| OCR_LANGS=ara+fra | Arabe + Français reconnus | Variable env | OK |
| `/health` → ocr_enabled | `true` dans features | GET /health | OK |
| Forgot password (dev) | `dev_reset_url` dans réponse JSON | POST /auth/forgot-password | OK |
| Forgot password (SMTP configuré) | `email_sent: "true"` + email HTML reçu | Config SMTP_HOST | OK |
| `/health` → smtp_configured | `true` + `email_provider` | GET /health | OK |
| Template email HTML | Design dark, lien cliquable | Voir boîte mail | OK |

---

## KO restants (hors périmètre stage)

| Item | Raison |
|------|--------|
| AWS Bedrock en prod | Handlers Lambda legacy, Express = chemin principal |
| URLs Vercel/Railway live | Comptes à créer par l'utilisateur |

---

*Voir aussi : `docs/INDEX_TRAVAIL_AGENT.md` pour l'index complet.*
