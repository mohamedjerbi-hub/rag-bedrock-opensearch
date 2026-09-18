# Journal de stage — Mohamed Jerbi

> **Entreprise :** Smartovate · **École :** ENI Carthage · **Projet :** MJ Studio RAG  
> **Période :** juin – septembre 2026

---

## Semaine 1 — 2–6 juin 2026

**Ce que j'ai appris :** J'ai découvert le concept RAG (Retrieval-Augmented Generation). L'idée est simple : avant de répondre, l'IA cherche dans des documents. J'ai aussi appris les bases de la recherche vectorielle.

**Ce que j'ai fait :** Réunions avec mon encadrant chez Smartovate. J'ai lu des articles sur pgvector et Cohere. J'ai créé le dépôt GitHub et dessiné le premier schéma d'architecture.

**Problèmes :** Trop d'outils possibles (Bedrock, OpenSearch, Supabase). J'ai choisi une stack Node + React pour aller vite.

**Semaine suivante :** Commencer la landing page et le design system.

---

## Semaine 2 — 9–13 juin 2026

**Ce que j'ai appris :** Tailwind CSS avec des tokens sémantiques (`--primary`, `--background`). WCAG AA pour les contrastes.

**Ce que j'ai fait :** J'ai codé `LandingPage.tsx` avec hero, sections fonctionnalités et footer « MJ Studio — Mohamed Jerbi ». J'ai ajouté le toggle thème clair/sombre.

**Problèmes :** Flash blanc au chargement en mode sombre. Corrigé avec une classe sur `<html>` avant le premier render React.

**Semaine suivante :** Authentification JWT.

---

## Semaine 3 — 16–20 juin 2026

**Ce que j'ai appris :** JWT (JSON Web Token) : un jeton signé qui prouve l'identité. bcrypt pour hasher les mots de passe.

**Ce que j'ai fait :** Backend Express avec `/auth/login`, `/register`, middleware `authenticate`. Frontend `AuthProvider` et guards de routes par rôle.

**Problèmes :** Les rôles dans le token et dans `user_roles.json` divergeaient. J'ai fait relire le rôle depuis `roleStore` à chaque requête.

**Semaine suivante :** Upload de documents.

---

## Semaine 4 — 23–27 juin 2026

**Ce que j'ai appris :** Extraction PDF avec unpdf, Word avec Mammoth, Excel avec la lib xlsx.

**Ce que j'ai fait :** Module `parser.ts` avec validation minimum 50 caractères. Page `DocumentsPage` avec drag-and-drop.

**Problèmes :** Un PDF scanné ne donnait que 12 caractères. J'ai affiché une erreur claire au lieu de fausses données.

**Semaine suivante :** Chunking et embeddings.

---

## Semaine 5 — 30 juin – 4 juillet 2026

**Ce que j'ai appris :** Le chunking decoupe le texte en morceaux de ~900 caractères avec chevauchement pour garder le contexte.

**Ce que j'ai fait :** Pipeline ingestion : pending → extracting → chunking → vectorizing → indexed. Stockage JSON local + option Supabase.

**Problèmes :** Cohere embeddings sans clé API. Fallback : embedding déterministe SHA-256 pour le dev local.

**Semaine suivante :** Recherche hybride.

---

## Semaine 6 — 7–11 juillet 2026

**Ce que j'ai appris :** BM25 pour les mots-clés exacts. RRF (Reciprocal Rank Fusion) pour fusionner vectoriel + BM25.

**Ce que j'ai fait :** Méthode `search()` dans `MockEngine`. Tests avec les documents RH de démo (congés, télétravail).

**Problèmes :** Latence Cohere rerank. J'ai limité à top 20 → top 5.

**Semaine suivante :** Interface chat.

---

## Semaine 7 — 14–18 juillet 2026

**Ce que j'ai appris :** SSE (Server-Sent Events) pour streamer la réponse mot par mot.

**Ce que j'ai fait :** `ChatPage.tsx` avec React Markdown, panneau sources, bouton copier, historique conversations localStorage.

**Problèmes :** Citations `[1]` pas cliquables au début. Ajout du `DocumentViewerModal`.

**Semaine suivante :** Guardrails anti-hallucination.

---

## Semaine 8 — 21–25 juillet 2026

**Ce que j'ai appris :** Prompt system strict : « réponds uniquement à partir des extraits ».

**Ce que j'ai fait :** Si zéro chunk pertinent, message fixe sans appeler le LLM. Filtre anti-injection de prompt (regex).

**Problèmes :** Questions en anglais sur le prompt injection. J'ai ajouté des patterns français aussi.

**Semaine suivante :** Dashboard admin.

---

## Semaine 9 — 28 juillet – 1 août 2026

**Ce que j'ai appris :** RBAC (Role-Based Access Control) avec 4 niveaux.

**Ce que j'ai fait :** `AdminPage` avec graphiques SVG, gestion rôles, suspension comptes. `AuditPage` avec export CSV.

**Problèmes :** Stats incohérentes si `queries.json` vide. Seed automatique depuis `demo_files`.

**Semaine suivante :** Signalements lacunes.

---

## Semaine 10 — 4–8 août 2026

**Ce que j'ai appris :** Workflow ticket : nouveau → en cours → résolu / rejeté.

**Ce que j'ai fait :** `KnowledgeGapModal`, API `/api/gaps`, page `GapManagementPage`, rate limit 5/heure.

**Problèmes :** Spam de tickets en test. Rate limit côté serveur avec fichier JSON.

**Semaine suivante :** 2FA.

---

## Semaine 11 — 11–15 août 2026

**Ce que j'ai appris :** TOTP (Time-based One-Time Password) RFC 6238, compatible Google Authenticator.

**Ce que j'ai fait :** `totpService.ts`, flux login 2FA en deux étapes, activation dans Profil.

**Problèmes :** Désynchronisation horaire. Fenêtre de tolérance otplib par défaut suffisante.

**Semaine suivante :** Sécurité documents.

---

## Semaine 12 — 18–22 août 2026

**Ce que j'ai appris :** Isolation des données : filtrer par `uploaded_by`.

**Ce que j'ai fait :** Module `documentAccess.ts`. Documents `system` partagés, reste privé par user. Filtre aussi sur `/query`.

**Problèmes :** Upload interne sans auth — faille critique. Corrigé avec JWT sur PUT.

**Semaine suivante :** Reset mot de passe et suppression comptes.

---

## Semaine 13 — 25–29 août 2026

**Ce que j'ai fait :** Pages `/forgot-password` et `/reset-password`. Suppression compte (profil + admin). Réindexation réelle.

**Problèmes :** Pas de SMTP en stage. Mode MOCK expose le lien reset pour les tests (documenté).

**Semaine suivante :** Déploiement et documentation.

---

## Semaine 14 — 1–5 septembre 2026

**Ce que j'ai fait :** Config Vercel (`vercel.json`), Railway (`railway.toml`), CI GitHub Actions, script validation étape 2, rapport et journal de stage.

**Bilan :** Application RAG complète en local, prête pour déploiement cloud. Je repars avec une vraie expérience full-stack et IA.

---

*Journal rédigé par Mohamed Jerbi — MJ Studio — ENI Carthage 2026*
