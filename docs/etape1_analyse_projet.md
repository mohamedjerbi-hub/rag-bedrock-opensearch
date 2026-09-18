# Étape 1 — Analyse automatique du projet RAG (MJ Studio)

> **Projet :** Application RAG — Mohamed Jerbi, ENI Carthage × Smartovate  
> **Date d'analyse :** 9 septembre 2026  
> **Méthode :** Lecture exhaustive du code source (128 fichiers), sans supposition.

---

## 1. Structure du dépôt

| Dossier | Rôle |
|---------|------|
| `frontend/` | Application web React (interface utilisateur) |
| `backend/` | API REST Express + moteur RAG |
| `backend/data/` | Base locale en fichiers JSON (mode développement) |
| `backend/src/handlers/` | Handlers AWS Lambda (OpenSearch + S3) — **non utilisés** par le serveur local |
| `backend/src/mocks/engine.ts` | Moteur RAG principal utilisé en local |
| `backend/sample_docs/` | 8 documents Markdown d'exemple |
| `demo_files/` | Fichiers de démo (MD, CSV, script de génération) |
| `infra/` | Terraform pour déploiement AWS (Cognito, S3, OpenSearch, API Gateway) |
| `docs/` | Documentation interne |
| `.github/workflows/ci.yml` | CI GitHub Actions (build seulement) |
| `scripts/` | Scripts build/deploy |

### Routes frontend (`App.tsx`)

| Route | Accès | Page |
|-------|-------|------|
| `/` | Public | Landing |
| `/about` | Public | À propos |
| `/login`, `/register` | Public | Connexion / Inscription |
| `/chat` | Connecté | Chat RAG |
| `/documents` | Admin, Éditeur | Gestion documents |
| `/admin` | Admin | Dashboard + utilisateurs |
| `/admin/signalements` | Admin, Éditeur | Lacunes documentaires |
| `/audit` | Admin, Auditeur | Journal d'audit |
| `/profile` | Connecté | Profil + 2FA |

### Routes API backend (`server.ts`) — 35 endpoints

| Groupe | Endpoints |
|--------|-----------|
| Auth | `/auth/login`, `/register`, `/logout`, `/refresh`, `/me`, `/auth/2fa/*` |
| Documents | `GET/PUT/DELETE /documents`, upload, dossiers, reindex |
| RAG | `POST /query` (SSE), `GET /history`, `GET /stats` |
| Admin | `/admin/users`, `/admin/users/role`, `/admin/users/status` |
| Audit | `/audit/security-logs` |
| Lacunes | `/api/gaps/*`, `/api/notifications/my-resolutions` |
| Divers | `/health`, `/remarks` |

---

## 2. Liste exhaustive des fonctionnalités

| # | Fonctionnalité | À quoi ça sert | Fichiers principaux | État |
|---|----------------|----------------|---------------------|------|
| 1 | Page d'accueil publique | Présente le projet aux visiteurs | `LandingPage.tsx` | Terminée |
| 2 | Inscription | Crée un compte email/mot de passe | `RegisterPage.tsx`, `server.ts` | Terminée (risque : rôle editor par défaut) |
| 3 | Connexion | Authentifie, renvoie JWT | `LoginPage.tsx`, `server.ts` | Terminée |
| 4 | Déconnexion | Supprime refresh token | `Layout.tsx`, `server.ts` | Terminée |
| 5 | Mot de passe oublié | — | — | **Absente** |
| 6 | 2FA/TOTP | Code 6 chiffres à la connexion | `totpService.ts`, `ProfilePage.tsx` | Terminée |
| 7 | Refresh token | Renouvelle session | `client.ts`, `server.ts` | Terminée |
| 8 | Chat RAG streaming | Question → réponse SSE | `ChatPage.tsx`, `engine.ts` | Terminée |
| 9 | Citations cliquables | Sources + visionneuse doc | `ChatPage.tsx`, `DocumentViewerModal.tsx` | Terminée |
| 10 | Historique conversations | Chats dans localStorage | `ChatContext.tsx` | Terminée (local seulement) |
| 11 | Upload PDF | Extraction unpdf page par page | `parser.ts` | Terminée |
| 12 | Upload Word (.docx) | Extraction Mammoth | `parser.ts` | Terminée |
| 13 | Upload Excel (.xlsx) | Extraction feuilles + en-têtes | `parser.ts` | Terminée |
| 14 | Upload MD/TXT/CSV | Texte brut | `parser.ts` | Terminée |
| 15 | Arborescence dossiers | Créer/naviguer/renommer | `DocumentsPage.tsx`, `engine.ts` | Terminée |
| 16 | Suppression documents | Doc + chunks | `engine.ts` | Terminée |
| 17 | Réindexation | Relance indexation | `server.ts` `/reindex` | **Partielle** (stub 202) |
| 18 | Recherche hybride RRF | Vectoriel + BM25 | `engine.ts` | Terminée |
| 19 | Rerank Cohere | Réordonne extraits | `engine.ts` | Terminée (si clé API) |
| 20 | Réponse hors sujet | « Ne figure pas dans les documents » | `engine.ts` | Terminée |
| 21 | Cache requêtes | Accélère questions identiques | `queryCache.ts` | Terminée |
| 22 | Signalement lacune | Ticket type/priorité/commentaire | `KnowledgeGapModal.tsx` | Terminée |
| 23 | Gestion signalements | Filtres, statut, commentaires | `GapManagementPage.tsx` | Terminée |
| 24 | Notification résolution | Bandeau ticket résolu | `GapNotificationBanner.tsx` | Terminée |
| 25 | Dashboard admin | Stats, graphiques | `AdminPage.tsx` | Terminée |
| 26 | Gestion rôles | Promotion/rétrogradation | `AdminPage.tsx`, `roleStore.ts` | Terminée |
| 27 | Suspension compte | Activer/désactiver | `AdminPage.tsx` | Terminée |
| 28 | Suppression utilisateur | — | `ProfilePage.tsx` (UI locale) | **Partielle** |
| 29 | Journal d'audit | Logs + export CSV | `AuditPage.tsx` | Terminée |
| 30 | Thème clair/sombre | WCAG, persistant | `ThemeProvider.tsx` | Terminée |
| 31 | Profil utilisateur | Nom, langue, 2FA | `ProfilePage.tsx` | Terminée |
| 32 | Page À propos | Présentation + signature | `AboutPage.tsx` | Terminée |
| 33 | Filtre injection prompt | Bloque prompts malveillants | `securityMiddleware.ts` | Terminée |
| 34 | Rate limiting | 10 auth/min, 120 API/min | `securityMiddleware.ts` | Terminée |
| 35 | Feedback 👍/👎 | Retour sur réponses | `ChatPage.tsx` | Partielle (local) |
| 36 | Remarques admin | Questions signalées | `/remarks` API | Partielle (pas d'UI) |
| 37 | Mode Supabase | pgvector cloud | `supabaseStore.ts` | Partielle (optionnel) |
| 38 | Terraform AWS | Infra cloud | `infra/` | Partielle (non branché Express) |
| 39 | Handlers Lambda | S3 + OpenSearch | `handlers/*.ts` | Code mort en local |
| 40 | OCR Tesseract | PDF scannés | `package.json` | **Absente** (non importé) |
| 41 | AWS Bedrock | Modèle IA Amazon | `.env.example` | **Absente** |
| 42 | Cognito | Auth AWS | `infra/` | **Absente** (Express = JWT maison) |

---

## 3. Technologies et versions

### Frontend

| Technologie | Version |
|-------------|---------|
| React | ^18.3.1 |
| React Router DOM | ^6.30.4 |
| Vite | ^5.4.2 |
| TypeScript | ^5.5.4 |
| Tailwind CSS | ^3.4.10 |
| Framer Motion | ^13.0.0 |

### Backend

| Technologie | Version |
|-------------|---------|
| Express | ^5.2.1 |
| TypeScript | ^7.0.2 |
| jsonwebtoken | ^9.0.3 |
| bcryptjs | ^3.0.3 |
| cohere-ai | ^8.0.0 |
| @supabase/supabase-js | ^2.112.3 |
| mammoth, unpdf, xlsx | voir package.json |

---

## 4. Base de données

### Stockage local (JSON — mode par défaut)

| Fichier | Champs principaux |
|---------|-------------------|
| `local_users.json` | email, name, role, password_hash, totp_* |
| `user_roles.json` | email, role, active, assigned_by |
| `documents.json` | document_id, name, is_folder, parent_id, status, uploaded_by |
| `chunks.json` | chunk_id, document_id, text, embedding |
| `queries.json` | question, answer, latency_ms, user, sources |
| `audit_logs.json` | event_type, severity, user_email, details |
| `knowledge_gaps.json` | ticket_number, issue_type, status, etc. |

### Supabase (optionnel)

Tables déduites du code : `users`, `documents`, `document_chunks`, `query_history`, `knowledge_gaps`, `knowledge_gap_comments`, `user_roles`.

Schéma SQL versionné : `backend/src/sql/schema_knowledge_gaps.sql` uniquement.

---

## 5. Rôles et permissions

| Rôle | Chat | Documents | Signalements | Admin | Audit |
|------|------|-----------|--------------|-------|-------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| editor | ✅ | ✅ | ✅ | ❌ | ❌ |
| auditor | ✅ | ❌ | siens | ❌ | ✅ |
| reader | ✅ | ❌ | siens | ❌ | ❌ |

Comptes démo : admin@smartdocs.com / editor@smartdocs.com / auditor@smartdocs.com / user@smartdocs.com — mot de passe `admin123`.

---

## 6. Manques, code mort, risques sécurité

### Manques

- Mot de passe oublié
- Isolation documents par utilisateur
- Suppression utilisateur (API admin)
- Déploiement Vercel/Railway (aucun config)
- OCR, Bedrock, tests automatisés

### Risques

| Risque | Gravité |
|--------|---------|
| JWT secret par défaut en dur | Haute |
| `PUT /internal/upload/:id` sans auth | Haute |
| Inscription → rôle editor | Haute |
| CORS `origin: '*'` | Moyenne |
| Base documentaire partagée | Moyenne |
| Mots de passe démo dans README | Moyenne |

---

## 7. Variables d'environnement

- `backend/.env.example` : MOCK, PORT, JWT_SECRET, COHERE, SUPABASE, AZURE_OPENAI
- `frontend/.env.example` : VITE_API_BASE_URL (exemple 8000, fallback code 3001)

---

---

## 8. Mises à jour post-analyse (9 sept. 2026)

Corrections appliquées avant validation étape 2 :

- Inscription : rôle par défaut `reader` (plus `editor`)
- Upload interne : authentification JWT obligatoire
- Réindexation : implémentée (re-vectorisation des chunks)
- Whitelist extensions upload sur PUT

Voir `docs/etape2_validation_tests.md` pour le détail.

---

*Document généré pour alimenter le rapport de stage et le journal — Étape 1 complète.*
