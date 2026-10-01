# Prompts image par image — Diagrammes UML du projet RAG MJ Studio

Un prompt par diagramme, prêt à être collé dans un générateur d'images IA (Midjourney, DALL-E 3, Stable Diffusion) ou un outil de génération de schémas.

Bloc de style commun à garder en tête de chaque prompt :

> Diagramme UML professionnel en notation UML 2.5 standard, rendu comme un export d'un logiciel de modélisation professionnel type StarUML ou Enterprise Architect. Fond blanc uni, lignes fines et nettes, formes géométriques précises (rectangles à angles droits, pas d'ombres, pas d'effets 3D, pas de dégradés), police sans-serif type Segoe UI/Arial, palette sobre (gris, bleu foncé, blanc), aucune décoration artistique, aucun élément fictif non listé ci-dessous, tout le texte en français et lisible.

---

## 1. Figure 2.1 — Diagramme de contexte

```
Diagramme de contexte UML professionnel, style StarUML, fond blanc, notation UML 2.5. Un rectangle central unique intitulé "Application RAG MJ Studio" au centre de l'image. Autour de ce rectangle, à distance régulière (nord, est, sud, ouest), 4 acteurs UML représentés par des silhouettes "bonhomme allumette" (stick figure), chacun avec son étiquette en dessous : "Lecteur", "Éditeur", "Auditeur", "Administrateur". Chaque acteur est relié au rectangle central par une ligne simple continue (association), sans flèche. Aucun autre élément. Mise en page symétrique et équilibrée, lignes fines noires, texte net, fond blanc uni, aucune ombre ni dégradé.
```

---

## 2. Figure 2.2 — Diagramme de cas d'utilisation global

```
Diagramme de cas d'utilisation UML professionnel, style StarUML, fond blanc, notation UML 2.5. À gauche, en colonne verticale, 4 acteurs "bonhomme allumette" avec étiquettes : "Lecteur" (en haut), "Éditeur", "Auditeur", "Administrateur" (en bas). Entre "Éditeur" et "Lecteur", une flèche pointillée avec triangle plein (généralisation UML) partant d'Éditeur vers Lecteur. Même chose entre "Auditeur" et "Lecteur", et entre "Administrateur" et à la fois "Éditeur" et "Auditeur" (généralisation multiple). 

À droite, une grande ellipse "system boundary" rectangulaire fine intitulée "Application RAG MJ Studio" contenant des ovales UML (cas d'utilisation) : "Poser une question RAG", "Consulter les sources citées", "Consulter l'aperçu interactif du document", "Filtrer le corpus par autorisations RBAC", "Signaler une lacune documentaire", "Consulter la notification de résolution", "Gérer son profil et 2FA", "Se connecter", "Valider le code 2FA/TOTP", "Téléverser et gérer les documents", "Traiter un signalement", "Consulter l'audit de sécurité", "Gérer les rôles et comptes", "Consulter les statistiques RAG".

Relie chaque acteur à ses ovales par des lignes simples. Entre "Poser une question RAG" et "Filtrer le corpus par autorisations RBAC" ainsi qu'entre "Poser une question RAG" et "Rechercher les passages pertinents", trace une flèche pointillée avec petite flèche ouverte étiquetée "<<include>>". Entre "Consulter l'aperçu interactif du document" et "Générer une URL signée temporaire", une flèche pointillée étiquetée "<<include>>". Entre "Se connecter" et "Valider le code 2FA/TOTP", une flèche pointillée étiquetée "<<extend>>". Mise en page claire, texte net, fond blanc.
```

---

## 3. Figure 3.1 — Architecture logique en couches

```
Diagramme d'architecture en couches, style schéma professionnel StarUML/logiciel d'architecture logicielle, fond blanc. Quatre rectangles horizontaux de même largeur, empilés verticalement, chacun avec un titre en gras et une sous-ligne descriptive :
1. (en haut) "Présentation (Frontend SPA)" — sous-texte "React 18 + Vite : Chat SSE, SourceViewerModal, Dashboard Admin, Audit"
2. "API & Contrôle" — sous-texte "Express : REST API, SSE Stream, Security Headers, Rate Limiting, RBAC Middleware"
3. "Services & Métier" — sous-texte "Auth JWT/2FA TOTP, Ingestion Parser/OCR Tesseract, Moteur Hybride Vector+BM25+RRF, GapStore, AuditLogger"
4. (en bas) "Données & Stockage" — sous-texte "Supabase PostgreSQL (pgvector), Supabase Storage (signed URLs) / Fallback local JSON & Disk"
Entre chaque paire de rectangles adjacents, une flèche verticale fine pointant vers le bas. Pas de flèche entre couches non adjacentes. Couleurs sobres (dégradé de gris clair à gris moyen du haut vers le bas), bordures noires fines, texte net, fond blanc.
```

---

## 4. Figure 3.2 — Diagramme de composants détaillé

```
Diagramme de composants UML professionnel, style StarUML, fond blanc, notation UML 2.5. Symbole standard de composant (rectangle avec deux petits rectangles sur le bord gauche). Composants : "React 18 Frontend" (en haut), "Express API Gateway" (au centre), et sous "Express API Gateway" quatre composants internes alignés horizontalement : "Auth & TOTP Service", "Document Parser & OCR", "Moteur RAG Hybride", "Knowledge Gap & Audit Manager". En bas, quatre composants externes/stockage : "Supabase DB (pgvector)", "Supabase Storage", "Service Cohere Rerank API", "Serveur SMTP".

Connecteurs : "React 18 Frontend" relié à "Express API Gateway" par une ligne avec étiquette "HTTP REST + SSE Stream". "Express API Gateway" relié à chacun des 4 composants internes par des lignes de composition. "Document Parser & OCR" relié à "Supabase Storage". "Moteur RAG Hybride" relié à "Supabase DB (pgvector)" et à "Service Cohere Rerank API". "Auth & TOTP Service" relié à "Serveur SMTP". Ligne pointillée étiquetée "URL signée 300s" entre "Express API Gateway" et "SourceViewerModal (React)". Fond blanc, lignes noires fines.
```

---

## 5. Figure 3.3 — Diagramme de classes (modèle de domaine)

```
Diagramme de classes UML professionnel, style StarUML, fond blanc, notation UML 2.5. 8 classes représentées en rectangles à 3 compartiments (nom, attributs, méthodes) :

- "Utilisateur" : attributs email, name, password_hash, role, active, created_at, totp_enabled, totp_secret, refresh_token
- "RoleRecord" : attributs email, role, active, assigned_by, assigned_at
- "StoredDocument" : attributs document_id, name, is_folder, parent_id, size_bytes, mime_type, status, chunk_count, uploaded_by, uploaded_at
- "StoredChunk" : attributs chunk_id, document_id, document_name, page, section, chunk_index, text, embedding
- "KnowledgeGap" : attributs id, ticket_number, user_email, question, generated_answer, issue_type, priority, user_comment, status, assigned_to, resolution_note
- "GapComment" : attributs id, gap_id, author_email, body, created_at
- "AuditLogEntry" : attributs id, event_type, severity, user_email, ip_address, timestamp
- "QueryHistoryItem" : attributs query_id, question, answer, latency_ms, user, timestamp

Relations avec multiplicités exactes :
- Utilisateur 1 —— 1 RoleRecord, étiquette "possède statut"
- Utilisateur 1 —— 0..* StoredDocument, étiquette "dépose"
- StoredDocument 1 —— 0..* StoredChunk, étiquette "contient" (losange plein côté StoredDocument)
- Utilisateur 1 —— 0..* KnowledgeGap, étiquette "crée"
- KnowledgeGap 1 —— 0..* GapComment, étiquette "contient" (losange plein)
- Utilisateur 1 —— 0..* AuditLogEntry, étiquette "génère"

Note UML reliée à "RoleRecord" : "Les rôles RBAC sont isolés dans user_roles pour éviter l'escalade de privilèges." Disposition claire, fond blanc.
```

---

## 6. Figure 3.4 — Diagramme de séquence : authentification et 2FA/TOTP

```
Diagramme de séquence UML professionnel, style StarUML, fond blanc, notation UML 2.5. 5 lignes de vie verticales : "Utilisateur" (acteur), "Interface" (:React), "API Gateway" (:Express), "AuthService" (:Service), "UserStore" (:Supabase/JSON). Barres d'activation rectangulaires fines sur chaque ligne de vie.

Messages synchrones dans l'ordre, de haut en bas :
1. Utilisateur -> Interface : "saisir email et mot de passe"
2. Interface -> API Gateway : "POST /auth/login"
3. API Gateway -> AuthService : "verifyCredentials(email, password)"
4. AuthService -> UserStore : "findUser(email)"
5. UserStore --> AuthService : "UserRecord (hash, totp_enabled)"
6. AuthService -> AuthService : "bcrypt.compareSync(password, hash)"

Cadre combiné "alt" séparé en deux zones par une ligne pointillée :
- Zone "[2FA activée]" : AuthService --> API Gateway : "requires_2fa: true, temp_token", API Gateway --> Interface : "demande code TOTP", Utilisateur -> Interface : "saisir code TOTP", Interface -> API Gateway : "POST /auth/2fa/login", API Gateway -> AuthService : "verifyTOTPCode(secret, code)", AuthService --> API Gateway : "code valide"
- Zone "[2FA désactivée]" : AuthService -> AuthService : "issueTokens(user)"

Message final de retour : API Gateway --> Interface : "200 OK + JWT Access Token (24h) + Refresh Token (7d)", Interface -> Utilisateur : "redirection vers Chat RAG". Fond blanc, lignes noires fines.
```

---

## 7. Figure 3.5 — Diagramme d'activité : pipeline d'ingestion et d'extraction

```
Diagramme d'activité UML professionnel, style StarUML, fond blanc, notation UML 2.5. Nœud de début (cercle noir plein) en haut. Actions rectangulaires à coins arrondis : "Recevoir fichier (PUT /internal/upload/:id)" -> losange de décision "Extension et taille OK ?" (max 20 Mo) avec branche "non" (menant à "Statut = failed" -> nœud de fin, cercle avec anneau) et branche "oui" (menant à "Statut = extracting").

Après "Statut = extracting", losange de décision "Type de fichier ?" vers 4 branches parallèles :
- "PDF : unpdf" -> losange "Page < 50 caractères ?" -> si oui : "OCR Tesseract.js (fra+eng)" -> si non : continuer
- "DOCX : Mammoth"
- "XLSX : lib xlsx (linéarisation onglets/en-têtes)"
- "TXT / MD / CSV : UTF-8 direct"

Convergence vers losange "Texte extrait >= 50 chars ?" :
- si non -> "Statut = failed (texte insuffisant)" -> nœud de fin
- si oui -> "Smart Chunking (900 chars, overlap 150 chars)" -> "Vectoriser (embeddings)" -> "Enregistrer dans Supabase/JSON" -> "Statut = indexed" -> nœud de fin.

Branche d'erreur en pointillé rouge en cas d'exception pendant la vectorisation vers "Statut = failed". Fond blanc, lignes noires.
```

---

## 8. Figure 3.6 — Diagramme de séquence : question RAG, SSE et aperçu source

```
Diagramme de séquence UML professionnel, style StarUML, fond blanc, notation UML 2.5. 6 lignes de vie : "Utilisateur" (acteur), "ChatPage" (:React), "API Gateway" (:Express), "AccessControl" (:RBAC), "HybridEngine" (:Vector+BM25+RRF), "SourceViewerModal" (:React).

Messages dans l'ordre :
1. Utilisateur -> ChatPage : "saisir question"
2. ChatPage -> API Gateway : "POST /query (question, top_k)"
3. API Gateway -> AccessControl : "getAccessibleDocumentIds(user.email, user.role)"
4. AccessControl --> API Gateway : "liste des document_id autorisés"
5. API Gateway -> HybridEngine : "search(question, allowedIds)"
6. HybridEngine -> HybridEngine : "Vector Cosine + BM25 Keyword Search"
7. HybridEngine -> HybridEngine : "Fusion RRF (k=60) + Cohere Rerank v3.0"
8. HybridEngine --> API Gateway : "passages classés"
9. API Gateway --> ChatPage : "flux Server-Sent Events SSE (data: {text})"
10. Utilisateur -> ChatPage : "clic sur citation [1]"
11. ChatPage -> API Gateway : "GET /documents/:id/signed-url"
12. API Gateway --> ChatPage : "{ signed_url: 'https://...', expires_in: 300 }"
13. ChatPage -> SourceViewerModal : "ouvrir(signed_url, page, excerpt)"
14. SourceViewerModal -> SourceViewerModal : "rendu PDF.js / Excel / DOCX + surbrillance passage". Fond blanc, lignes nettes.
```

---

## 9. Figure 3.7 — Diagramme de cas d'utilisation par rôle (Matrice RBAC)

```
Diagramme de cas d'utilisation UML professionnel, style StarUML, fond blanc, notation UML 2.5, organisé en 4 colonnes verticales séparées par de fines lignes pointillées grises avec titre de rôle en haut : "Lecteur", "Éditeur", "Auditeur", "Administrateur".

Dans la colonne "Lecteur" : bonhomme allumette relié à 5 ovales : "Chat RAG", "Consulter citations", "Aperçu interactif SourceViewerModal", "Signaler une lacune (Ticket GAP)", "Activer/Gérer 2FA/TOTP".
Dans la colonne "Éditeur" : bonhomme allumette relié par flèche de généralisation (triangle plein) vers "Lecteur", plus 2 ovales propres : "Gérer & réindexer documents", "Traiter & resoudre signalements".
Dans la colonne "Auditeur" : bonhomme allumette relié par généralisation vers "Lecteur", plus 1 ovale propre : "Consulter audit de sécurité".
Dans la colonne "Administrateur" : bonhomme allumette relié par généralisation vers "Éditeur" et "Auditeur", plus 2 ovales propres : "Gérer rôles RBAC & comptes", "Dashboard statistiques RAG".

Mise en page progressive montrant l'héritage des droits. Fond blanc, lignes noires.
```

---

## 10. Figure 3.8 — Diagramme d'état : cycle de vie d'un signalement (Ticket GAP)

```
Diagramme d'état-transition UML professionnel, style StarUML, fond blanc, notation UML 2.5. Nœud initial (cercle noir plein) relié par une flèche étiquetée "createKnowledgeGap()" vers l'état "nouveau".

"nouveau" relié par une flèche étiquetée "updateKnowledgeGap(status: 'en_cours')" vers l'état "en_cours".
"en_cours" se sépare en 3 flèches vers 3 états :
- vers "resolu" étiquetée "résoudre(resolution_note)" (déclenche notification utilisateur)
- vers "rejete" étiquetée "rejeter(resolution_note)"
- vers "doublon" étiquetée "marquer doublon"

"resolu", "rejete" et "doublon" sont chacun reliés à un nœud final (cercle avec anneau). Disposition linéaire propre de gauche à droite, rectangles arrondis, fond blanc, lignes fines.
```

---

## 11. Figure 3.9 — Diagramme de déploiement : local vs cible

```
Diagramme de déploiement UML professionnel, style StarUML, fond blanc, notation UML 2.5, divisé en deux moitiés par une ligne verticale pointillée.

Moitié gauche, titre "Déploiement Local / Démonstration (Réel)" : un nœud 3D (cube UML) "Poste de Développement" contenant "Navigateur (React SPA - port 5173)", "Express REST API & SSE (port 3001)", "Fichiers JSON locaux (backend/data/)" et "Stockage local (backend/data/uploads/)".

Moitié droite, titre "Architecture de Production Cible (Perspective)" encadrée d'un cadre pointillé rouge avec mention "PERSPECTIVE PRODUCTION" : 4 nœuds 3D séparés : "Hébergement Frontend (Vercel / React SPA)", "Hébergement API (Railway / Node.js Express)", "Supabase Managed (PostgreSQL 15 + pgvector + Storage)", "API Cohere Rerank v3.0".

Fond blanc, cubes UML gris clair avec bordure noire, texte net, distinction claire des deux environnements.
```

---

## 12. Figure 3.10 — Diagramme d'état : cycle de vie d'un document téléversé

```
Diagramme d'état-transition UML professionnel, style StarUML, fond blanc, notation UML 2.5. Nœud initial (cercle noir plein) relié par une flèche étiquetée "uploadFile()" vers l'état "pending".

"pending" -> "extracting" (automatique).
"extracting" se sépare en :
- vers "extracting (OCR)" si [PDF et page < 50 chars]
- vers "failed" si [texte extrait < 50 chars ou fichier corrompu]
- vers "chunking" si [texte extrait >= 50 chars]

"extracting (OCR)" -> "chunking" (reprise extraction).
"chunking" -> "vectorizing" (automatique).
"vectorizing" -> "indexed" (embeddings et enregistrement terminés).
"vectorizing" -> "failed" (si erreur de vectorisation).
"indexed" -> "vectorizing" sur action "reindexDocument()" (flèche pointillée de retour).
"failed" -> "vectorizing" sur action "reindexDocument()" (flèche pointillée).
"indexed" -> nœud final (sur suppression).

États en rectangles arrondis, flux vertical de haut en bas, fond blanc, lignes nettes.
```
