# Spécifications des diagrammes — Application RAG MJ Studio (Factuel & Conforme au Code)

Ce document décrit précisément chaque diagramme du projet d'intelligence documentaire RAG (MJ Studio / Smartovate / ENI Carthage), révisé après audit factuel de la totalité du code source (React, Express, Supabase PostgreSQL, pgvector, Auth JWT/TOTP, Pipeline Ingestion, Moteur Hybride & SourceViewerModal).

---

## Figure 2.1 — Diagramme de contexte

**Type** : Diagramme de contexte système (acteurs / système)

**Système central** : `Application RAG MJ Studio` (boîte unique d'intelligence documentaire)

**Acteurs externes** (4 acteurs avec rôle RBAC bien distinct) :
- **Lecteur** : Utilisateur final consultant le chat RAG, les citations, l'aperçu interactif des documents et émettant des signalements de lacunes.
- **Éditeur** : Responsable documentaire gérant l'ingestion, les dossiers, la réindexation et le traitement des signalements.
- **Auditeur** : Responsable conformité consultant les journaux d'audit d'accès et d'injection.
- **Administrateur** : Administrateur système gérant la matrice des rôles, la suspension des comptes et les métriques globales.

---

## Figure 2.2 — Diagramme de cas d'utilisation global

**Type** : UML Use Case Diagram

**Acteurs** : Lecteur, Éditeur, Auditeur, Administrateur

**Cas d'utilisation et associations factuelles** :
- **Lecteur** :
  - Poser une question RAG (streaming SSE)
  - Consulter les sources citées (citations in-line `[1]`)
  - Consulter l'aperçu interactif du document source (`SourceViewerModal` avec saut de page PDF, onglets Excel & surbrillance de passage)
  - Signaler une lacune documentaire (ticket GAP avec type d'anomalie et priorité)
  - Consulter la notification de résolution de ticket
  - Gérer son profil et la sécurité (Activer / Désactiver 2FA TOTP via QR Code)
- **Éditeur** (généralisation Éditeur → Lecteur) :
  - Téléverser un document (PDF, DOCX, XLSX, TXT, MD, CSV)
  - Créer un dossier / Renommer / Supprimer un document
  - Réindexer un document (re-vectorisation)
  - Traiter un signalement (changer statut : `nouveau` → `en_cours` → `resolu`/`rejete`/`doublon`, ajouter commentaire interne, notifier l'utilisateur)
- **Auditeur** (généralisation Auditeur → Lecteur) :
  - Consulter les journaux d'audit de sécurité (filtre par sévérité, type d'évènement, recherche et export CSV)
- **Administrateur** (généralisation Administrateur → Éditeur + Auditeur) :
  - Gérer les comptes et autorisations (changement de rôle RBAC `admin`/`editor`/`auditor`/`reader`, suspension/activation de compte, suppression)
  - Consulter le tableau de bord des statistiques RAG (latence, volumétrie, répartition par format, top sources)

**Relations `<<include>>`** :
- « Poser une question RAG » `<<include>>` « Filtrer le corpus par autorisations RBAC »
- « Poser une question RAG » `<<include>>` « Rechercher les passages pertinents (Vector + BM25 + RRF) »
- « Consulter l'aperçu interactif du document » `<<include>>` « Générer une URL signée temporaire (Supabase Storage / Stream Token) »

**Relations `<<extend>>`** :
- « Se connecter » `<<extend>>` « Valider le code 2FA/TOTP » (si 2FA activée sur le compte)
- « Poser une question RAG » `<<extend>>` « Afficher la bannière automatique de signalement de lacune » (si absence d'information ou score < 0.35)

---

## Figure 3.1 — Architecture logique en couches

**Type** : Diagramme d'architecture en couches (4 couches horizontales avec flux de données)

1. **Présentation (Frontend SPA - React 18 + Vite + Tailwind CSS)** :
   - Interface Chat RAG avec streaming SSE, citations cliquables et tiroir de sources.
   - Composant `SourceViewerModal` (visionneuse multi-format : PDF.js `react-pdf`, SheetJS `xlsx`, `mammoth.js`, `papaparse`).
   - Module d'authentification (Formulaires Login, Register, 2FA QR Code TOTP, Password Reset).
   - Espaces de gestion : Espace Documentaire, Gestion des lacunes (Tickets GAP), Audit Sécurité, Dashboard Admin.
2. **API & Contrôle (Backend Express.js + Middleware de Sécurité)** :
   - Middleware de sécurité (`securityHeadersMiddleware`, `authRateLimiter`, `apiRateLimiter`, `promptInjectionFilter`).
   - Middleware d'authentification JWT Session (`authenticate`) & Contrôle de rôle RBAC (`requireRoles`).
   - Contrôleur SSE (`POST /query`) avec streaming en temps réel et cache de requêtes.
   - API de génération d'URL signée (`GET /documents/:id/signed-url`) et téléchargement sécurisé (`GET /documents/:id/download`).
3. **Services & Métier (Core Application Logic)** :
   - `Auth & 2FA Service` : Bcrypt hash, JWT Access/Refresh tokens, TOTP RFC 6238 (`otplib` + `qrcode`).
   - `Document Parser & OCR` : Ingestion multi-format (`unpdf`, `mammoth`, `xlsx`), détection de page scannée (< 50 caractères) avec OCR Tesseract.js (fra+eng), Smart Chunking (900 chars, overlap 150 chars).
   - `Hybrid RAG Engine` : Moteur de recherche hybride (Similarité Vectorielle Cosine + BM25 Keyword Search + Fusion Reciprocal Rank Fusion RRF + Cohere Rerank v3.0).
   - `Knowledge Gap Store` : Gestion du cycle de vie des signalements, limitation de débit (5 req/h/user) et notifications.
   - `Audit Logger` : Journalisation immuable des évènements de sécurité (`LOGIN`, `DOC_UPLOAD`, `UNAUTHORIZED_ACCESS`...).
4. **Données & Stockage (Stockage Persistant & Extérieur)** :
   - **Supabase (PostgreSQL + pgvector)** : Tables `documents`, `document_chunks` (index vectoriel), `users`, `query_history`, `knowledge_gaps`, `knowledge_gap_comments`.
   - **Supabase Storage** : Bucket sécurisé `documents` avec accès via URLs signées à courte durée de vie.
   - **Mode Fallback Local JSON & Disk** : Stockage JSON autonome (`backend/data/*.json`) et fichiers physiques localisés (`backend/data/uploads/`) en cas de mode dégradé/offline.
   - **Services Externe** : Service IA Cohere Rerank / Bedrock, Service SMTP (Nodemailer).

---

## Figure 3.2 — Diagramme de composants détaillé

**Type** : UML Component Diagram

**Composants et dépendances** :
- `[React Frontend]` --(HTTP REST / SSE)--> `[Express API Gatekeeper]`
- `[Express API Gatekeeper]` orchestre :
  - `[Auth & TOTP Service]`
  - `[Document Ingestion & Parser]`
  - `[Moteur RAG Hybride]`
  - `[Knowledge Gap & Audit Manager]`
- Connecteurs internes & externes :
  - `[Auth & TOTP Service]` --(JWT/Bcrypt)--> `[Supabase DB / local_users.json]`
  - `[Auth & TOTP Service]` --(Nodemailer)--> `[Serveur SMTP]`
  - `[Document Ingestion & Parser]` --(unpdf/mammoth/xlsx/Tesseract)--> `[Supabase Storage / Disk Uploads]`
  - `[Moteur RAG Hybride]` --(rpc search_chunks / cosineSim + BM25)--> `[pgvector / chunks.json]`
  - `[Moteur RAG Hybride]` --(HTTPS API)--> `[Cohere Rerank v3.0]`
  - `[Express API Gatekeeper]` --(URL signée 300s)--> `[SourceViewerModal (React)]`

---

## Figure 3.3 — Diagramme de classes (modèle de domaine)

**Type** : UML Class Diagram

**Classes, attributs et types réels** :
- `Utilisateur` : email (string, PK), name (string), password_hash (string), role (UserRole), active (boolean), created_at (string), totp_enabled (boolean), totp_secret (string), refresh_token (string)
- `RoleRecord` : email (string, PK), role (UserRole: 'admin'|'editor'|'auditor'|'reader'), active (boolean), assigned_by (string), assigned_at (string)
- `StoredDocument` : document_id (UUID, PK), name (string), is_folder (boolean), parent_id (string|null), size_bytes (number), mime_type (string), status (DocumentStatus: 'pending'|'extracting'|'chunking'|'vectorizing'|'indexed'|'failed'), chunk_count (number), error_message (string), uploaded_by (string), uploaded_at (string)
- `StoredChunk` : chunk_id (string, PK), document_id (UUID, FK), document_name (string), page (number), section (string), chunk_index (number), text (string), embedding (number[])
- `KnowledgeGap` : id (UUID, PK), ticket_number (string, Unique), user_id (string), user_email (string), conversation_id (string), question (string), generated_answer (string), retrieved_sources (JSONB), issue_type (string), priority (string), user_comment (string), expected_answer (string), notify_user (boolean), status (GapStatus: 'nouveau'|'en_cours'|'resolu'|'rejete'|'doublon'), assigned_to (string), resolution_note (string), resolved_at (string), resolved_by (string), linked_doc_id (string), created_at (string), updated_at (string)
- `GapComment` : id (UUID, PK), gap_id (UUID, FK), author_email (string), author_name (string), body (string), created_at (string)
- `AuditLogEntry` : id (UUID, PK), event_type (AuditEventType), severity (AuditSeverity), user_email (string), ip_address (string), user_agent (string), details (Record), timestamp (string)
- `QueryHistoryItem` : query_id (UUID, PK), question (string), answer (string), latency_ms (number), user (string), timestamp (string), sources (Source[])

---

## Figure 3.4 — Diagramme de séquence : authentification et 2FA/TOTP

**Type** : UML Sequence Diagram

**Participants** : Utilisateur, Interface (React), API Gateway (Express), AuthService (JWT/Bcrypt/TOTP), UserStore (Supabase/JSON)

**Flux de messages** :
1. Utilisateur → Interface : Saisir email et mot de passe
2. Interface → API Gateway : `POST /auth/login`
3. API Gateway → AuthService : `verifyCredentials(email, password)`
4. AuthService → UserStore : `findUser(email)`
5. UserStore --> AuthService : `UserRecord` (avec `password_hash`, `totp_enabled`, `totp_secret`)
6. AuthService → AuthService : `bcrypt.compareSync(password, password_hash)`
7. alt **[2FA/TOTP Activée sur le compte]**
   - AuthService --> API Gateway : `requires_2fa: true, temp_token` (valide 5 min)
   - API Gateway --> Interface : Demande du code TOTP à 6 chiffres
   - Utilisateur → Interface : Saisir le code TOTP (Google Authenticator)
   - Interface → API Gateway : `POST /auth/2fa/login` (`temp_token`, `code`)
   - API Gateway → AuthService : `verifyTOTPCode(totp_secret, code)`
   - AuthService --> API Gateway : Succès de la vérification TOTP
8. AuthService → AuthService : Émission `jwtToken` (24h) + `refreshToken` (7d)
9. API Gateway --> Interface : `200 OK { token, refreshToken, user }`
10. Interface → Utilisateur : Accès autorisé et redirection vers le Chat RAG

---

## Figure 3.5 — Diagramme d'activité : pipeline d'ingestion et d'extraction

**Type** : UML Activity Diagram

**Flux d'activité** :
1. Nœud de début → `PUT /internal/upload/:id` (Déposé)
2. Action : Valider l'extension (`.pdf`, `.docx`, `.xlsx`, `.txt`, `.md`, `.csv`) et la taille (max 20 Mo)
   - *Si invalide* → Statut = `failed` (Message d'erreur) → Fin
   - *Si valide* → Statut = `extracting`
3. Extraction du texte selon le type de fichier :
   - **PDF** : Extraction page par page via `unpdf`.
     - *Décision* : Le texte de la page contient-il < 50 caractères ?
       - *Oui (Page scannée / image)* : Exécuter l'OCR Tesseract.js (`fra+eng`).
       - *Non (Texte natif)* : Conserver le texte de la page.
   - **DOCX** : Extraction du texte brut via `mammoth`.
   - **XLSX** : Linéarisation des feuilles et en-têtes d'onglets via `xlsx`.
   - **TXT / MD / CSV** : Lecture directe en UTF-8.
4. Décision : Longueur du texte extrait >= 50 caractères ?
   - *Non* → Statut = `failed` ("Le fichier ne contient pas assez de texte lisible") → Fin
   - *Oui* → Statut = `chunking`
5. Action : Smart Chunking par découpage de paragraphes/phrases (Taille cible: 900 chars, Overlap: 150 chars)
6. Action : Statut = `vectorizing` -> Calcul des embeddings pour chaque chunk
7. Action : Stockage synchrone dans Supabase `documents` & `document_chunks` (ou `docs.json` & `chunks.json`)
8. Action : Statut = `indexed` -> Fin nominale (Document prêt pour la recherche)

---

## Figure 3.6 — Diagramme de séquence : question RAG, SSE et aperçu source

**Type** : UML Sequence Diagram

**Participants** : Utilisateur, ChatPage (React), API Gateway (Express), AccessControl (RBAC), HybridEngine (Vector+BM25+RRF+Cohere), LLM Engine, SourceViewerModal

**Flux de messages** :
1. Utilisateur → ChatPage : Saisir la question et valider
2. ChatPage → API Gateway : `POST /query` (`question`, `top_k: 5`, `history`)
3. API Gateway → AccessControl : `getAccessibleDocumentIds(user.email, user.role)`
4. AccessControl --> API Gateway : Ensemble des `document_id` autorisés (Matrice RBAC)
5. API Gateway → HybridEngine : `search(question, top_k, threshold, allowedIds)`
6. HybridEngine → HybridEngine : Recherche vectorielle Cosine (ou RPC Supabase `search_chunks`)
7. HybridEngine → HybridEngine : Recherche par mots-clés BM25 avec suppression des diacritiques
8. HybridEngine → HybridEngine : Fusion Reciprocal Rank Fusion (RRF k=60) + Cohere Rerank v3.0
9. HybridEngine --> API Gateway : Passages filtrés et classés
10. alt **[Cache HIT]**
    - API Gateway --> ChatPage : Streaming ultra-rapide depuis `queryCache` (6ms/mot)
11. alt **[Cache MISS & LLM]**
    - API Gateway → LLM Engine : `generateAnswer(question, chunks, history)`
    - LLM Engine --> API Gateway : Texte synthétisé avec citations `[1]`, `[2]`
    - API Gateway --> ChatPage : Flux Server-Sent Events SSE (`data: {"text": "..."}`)
    - API Gateway --> ChatPage : Evènement final SSE (`data: {"done": true, "sources": [...]}`)
12. Utilisateur → ChatPage : Clic sur une citation `[1]` ou un badge de source
13. ChatPage → API Gateway : `GET /documents/:id/signed-url` (Authentifié + Contrôle de rôle RBAC)
14. API Gateway --> ChatPage : `{ signed_url: "https://...", expires_in: 300 }`
15. ChatPage → SourceViewerModal : Ouverture de la visionneuse interactive avec `page` et `excerpt`
16. SourceViewerModal → SourceViewerModal : Rendu dédié (PDF.js canvas / Tableau Excel SheetJS / HTML Mammoth) avec surbrillance et auto-scroll du passage cité.

---

## Figure 3.7 — Diagramme de cas d'utilisation par rôle (Matrice RBAC)

**Type** : UML Use Case Diagram partitionné par rôle

- **Lecteur (Reader / User)** :
  - Interroger l'assistant RAG (Chat SSE)
  - Consulter les citations in-line et l'aperçu interactif des sources autorisées (`SourceViewerModal`)
  - Soumettre un signalement de lacune documentaire (ticket GAP)
  - Recevoir les notifications de résolution de ticket
  - Configurer son profil et la double authentification 2FA/TOTP
- **Éditeur (Editor)** *(hérite des cas du Lecteur)* :
  - Téléverser des documents multi-formats et créer des dossiers
  - Renommer, supprimer ou réindexer des documents
  - Consulter et traiter tous les signalements de lacunes (changement de statut, attribution, note éditoriale)
  - Ajouter des commentaires internes sur les tickets
- **Auditeur (Auditor)** *(hérite des cas du Lecteur)* :
  - Consulter et filtrer les journaux d'audit de sécurité (`LOGIN`, `DOC_UPLOAD`, `UNAUTHORIZED_ACCESS`...)
  - Exporter les journaux d'audit
- **Administrateur (Admin)** *(hérite des cas d'Éditeur et d'Auditeur)* :
  - Gérer les rôles et statuts d'activité de tous les utilisateurs (`/admin/users`)
  - Supprimer des comptes utilisateurs
  - Consulter le tableau de bord global des statistiques de performance et d'utilisation RAG

---

## Figure 3.8 — Diagramme d'état : cycle de vie d'un signalement (Ticket GAP)

**Type** : UML State Machine Diagram

**États Persistés** : `nouveau` → `en_cours` → { `resolu` | `rejete` | `doublon` }

**Transitions** :
- `[initial]` → `nouveau` : sur `createKnowledgeGap()` par un utilisateur (limite 5/heure)
- `nouveau` → `en_cours` : sur `updateKnowledgeGap({ status: 'en_cours', assigned_to })` par un Éditeur ou Admin
- `en_cours` → `resolu` : sur `updateKnowledgeGap({ status: 'resolu', resolution_note })` par Éditeur/Admin (déclenche notification utilisateur)
- `en_cours` → `rejete` : sur `updateKnowledgeGap({ status: 'rejete', resolution_note })` par Éditeur/Admin
- `en_cours` → `doublon` : sur `updateKnowledgeGap({ status: 'doublon' })` par Éditeur/Admin
- `resolu` → `[final]`
- `rejete` → `[final]`
- `doublon` → `[final]`

---

## Figure 3.9 — Diagramme de déploiement : architecture réelle (Local/Dev) vs Cible Production

**Type** : UML Deployment Diagram (deux volets)

**Volet Gauche — Architecture Locale de Développement / Démonstration (Réelle)** :
- **Nœud "Poste Client / Navigateur"** :
  - Composant `Single Page Application React 18` (Vite Dev Server - `http://localhost:5173`)
- **Nœud "Serveur d'Application Local"** :
  - Composant `REST API & SSE Express.js` (Node.js 18+ - `http://localhost:3001`)
  - Composant `Parser Multi-Format & OCR` (unpdf, mammoth, xlsx, Tesseract.js)
  - Artefacts de Stockage Local : `backend/data/*.json` (`local_users.json`, `docs.json`, `chunks.json`, `knowledge_gaps.json`, `audit_logs.json`) & `backend/data/uploads/`
- **Nœud Cloud Extérieur (Connecté si clés d'environnement renseignées)** :
  - Service `Supabase PostgreSQL (pgvector)` (base cloud distante)
  - Service `Supabase Storage` (bucket d'objets `documents`)
  - Service API `Cohere Rerank v3.0`

**Volet Droit — Architecture de Production Cible (Perspective de déploiement)** :
- **Nœud "Hébergement Frontend"** : Vercel / Netlify (SPA React 18 buildée statiquement)
- **Nœud "Hébergement Backend API"** : Railway / Render / Docker Container (Node.js Express API)
- **Nœud "Plateforme Backend-as-a-Service"** : Supabase Managed Service (PostgreSQL 15+, pgvector, Storage Buckets, Auth/RLS)
- **Nœud "Fournisseur d'IA & LLM"** : API Cohere Rerank / AWS Bedrock / OpenAI
- **Nœud "Service d'Emailing"** : Serveur SMTP / SendGrid / Resend (Nodemailer)

---

## Figure 3.10 — Diagramme d'état : cycle de vie d'un document téléversé

**Type** : UML State Machine Diagram

**États Persistés dans `doc.status`** : `pending` → `extracting` → `chunking` → `vectorizing` → `indexed` | `failed`

**Transitions** :
- `[initial]` → `pending` : sur réception du fichier dans `POST /documents/upload-url` ou `PUT /internal/upload/:id`
- `pending` → `extracting` : déclenchement du parsing (extraction unpdf, mammoth, xlsx)
- `extracting` → `extracting (OCR Tesseract)` : si PDF et page < 50 caractères détectés
- `extracting` → `failed` : si le texte extrait est < 50 caractères au total ou fichier corrompu
- `extracting` → `chunking` : si extraction réussie (texte >= 50 caractères)
- `chunking` → `vectorizing` : découpage en paragraphes/phrases terminé
- `vectorizing` → `indexed` : calcul des embeddings et enregistrement dans Supabase/JSON terminé (document disponible au Chat)
- `vectorizing` → `failed` : si erreur de vectorisation ou réseau
- `indexed` → `vectorizing` : sur action manuelle `POST /documents/:id/reindex` (réindexation par Éditeur/Admin)
- `failed` → `vectorizing` : sur action manuelle `POST /documents/:id/reindex`
- `indexed` → `[final]` : sur suppression `DELETE /documents/:id`
