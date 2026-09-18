# Découpage Scrum — MJ Studio RAG

> Stage Mohamed Jerbi · Smartovate · ENI Carthage · Juin–Septembre 2026

---

## Sprint 0 — Cadrage (Semaine 1)

**Objectif :** Comprendre le besoin et choisir l'architecture RAG.

**Durée :** 5 jours · 2–6 juin 2026

| User Story | Critères d'acceptation |
|------------|------------------------|
| En tant que stagiaire, je veux analyser l'existant, afin de définir le périmètre | Document problème/solution validé |
| En tant qu'équipe, nous voulons une stack React + Node, afin de livrer vite | Choix techniques documentés |

**Tâches :** Entretiens Smartovate, étude RAG, maquettes papier, repo GitHub.

**Incrément :** `ARCHITECTURE.md`, plan des lots.

**Rétrospective :** Le cadrage a pris du temps mais a évité de coder dans le vide.

---

## Sprint 1 — Fondation UI (Semaine 2–3)

**Objectif :** Landing page + thème clair/sombre + routing.

**Durée :** 10 jours · 9–20 juin 2026

| User Story | Critères |
|------------|----------|
| Visiteur voit une page d'accueil pro | Responsive, signature MJ Studio |
| Utilisateur bascule le thème | Persistance localStorage |

**Livré :** `LandingPage.tsx`, `ThemeProvider`, tokens Tailwind WCAG.

**Difficulté :** Éviter le flash blanc au chargement → script inline dans `index.html`.

---

## Sprint 2 — Authentification (Semaine 4)

**Objectif :** Login, register, JWT, guards RBAC.

**Durée :** 5 jours · 23–27 juin 2026

| User Story | Critères |
|------------|----------|
| Utilisateur se connecte | JWT + refresh token |
| Rôles limitent les pages | Redirect si non autorisé |

**Livré :** `AuthProvider`, `LoginPage`, middleware backend.

---

## Sprint 3 — Documents (Semaine 5–6)

**Objectif :** Upload multi-formats + dossiers.

**Durée :** 10 jours · 30 juin – 11 juillet 2026

| User Story | Critères |
|------------|----------|
| Éditeur upload PDF/Word/Excel/MD | Texte réel extrait, pas simulé |
| Éditeur organise en dossiers | Fil d'Ariane, CRUD |

**Livré :** `parser.ts`, `DocumentsPage.tsx`, pipeline chunking.

**Difficulté :** PDF scannés → message d'erreur clair (OCR implémenté au Sprint 10).

---

## Sprint 4 — Moteur RAG (Semaine 7–8)

**Objectif :** Chat streaming + citations + recherche hybride.

**Durée :** 10 jours · 14–25 juillet 2026

| User Story | Critères |
|------------|----------|
| Utilisateur pose une question | SSE mot par mot |
| Réponse cite les sources | Badges cliquables + panneau latéral |
| Question hors sujet | Message « ne figure pas dans les documents » |

**Livré :** RRF, rerank Cohere, `ChatPage.tsx`, cache requêtes.

---

## Sprint 5 — Admin & Audit (Semaine 9)

**Objectif :** Dashboard, rôles, journal d'audit.

**Durée :** 5 jours · 28 juillet – 1 août 2026

**Livré :** `AdminPage`, `AuditPage`, export CSV, gestion utilisateurs.

---

## Sprint 6 — Lacunes documentaires (Semaine 10)

**Objectif :** Signalement et workflow éditeur.

**Durée :** 5 jours · 4–8 août 2026

**Livré :** `KnowledgeGapModal`, `GapManagementPage`, tickets GAP-XXXX.

---

## Sprint 7 — Sécurité & 2FA (Semaine 11)

**Objectif :** TOTP, rate limit, anti-injection, isolation docs.

**Durée :** 5 jours · 11–15 août 2026

**Livré :** 2FA, `securityMiddleware`, filtrage documents par utilisateur.

---

## Sprint 8 — Finalisation (Semaine 12–13)

**Objectif :** Reset MDP, suppression comptes, déploiement, docs, tests.

**Durée :** 10 jours · 18–29 août 2026

**Livré :** Pages forgot/reset password, CI, guides déploiement, rapport stage.

**Rétrospective :** Le mode MOCK local a permis de finir le stage sans budget cloud.

---

## Sprint 9 — Déploiement (Semaine 14)

**Objectif :** Vercel + Railway + validation finale.

**Durée :** 5 jours · 1–5 septembre 2026

**Livré :** Config Vercel/Railway, script validation étape 2, documentation complète.

---

## Sprint 10 — OCR & SMTP (Semaine 15 — Finalisation)

**Objectif :** Compléter les deux derniers points non automatisés : OCR pour les PDF scannés et envoi d'email SMTP réel pour la réinitialisation du mot de passe.

**Durée :** 3 jours · 8–9 septembre 2026

| User Story | Critères d'acceptation |
|------------|------------------------|
| En tant qu'éditeur, je veux uploader un PDF scanné et que le système extraie quand même le texte | OCR Tesseract détecté automatiquement sur les pages < 50 chars |
| En tant qu'utilisateur, je veux recevoir un vrai email quand je clique "mot de passe oublié" | Email HTML envoyé via SMTP ; lien cliquable ; template MJ Studio |
| En tant que DevOps, je veux savoir si OCR et SMTP sont actifs au démarrage | `/health` retourne `features.ocr_enabled` et `features.smtp_configured` |

**Tâches :**
- Activer `tesseract.js` (déjà installé) dans `parser.ts` avec fallback automatique
- Créer `emailService.ts` avec Nodemailer + template HTML responsive
- Intégrer l'appel email dans `POST /auth/forgot-password`
- Enrichir `/health` avec les informations OCR + SMTP
- Mettre à jour `.env.example`, `deploiement.md`, `INDEX_TRAVAIL_AGENT.md`, rapport, tests

**Livré :**
- `backend/src/services/emailService.ts` — Nodemailer + template HTML dark theme
- `backend/src/services/parser.ts` — OCR automatique via Tesseract.js
- `backend/src/local/server.ts` — intégration SMTP + `/health` enrichi
- `backend/package.json` — `nodemailer@6.9` + `@types/nodemailer`
- `.env.example` — variables `OCR_ENABLED`, `OCR_LANGS`, `SMTP_*`
- `docs/deploiement.md` — guide SMTP complet (Brevo/Mailgun/Gmail) + section OCR

**Variables nouvelles :**

| Variable | Défaut | Rôle |
|----------|--------|------|
| `OCR_ENABLED` | `true` | Active/désactive Tesseract |
| `OCR_LANGS` | `fra+eng` | Langues OCR |
| `SMTP_HOST` | — | Serveur SMTP (vide = mode dev) |
| `SMTP_PORT` | `587` | Port SMTP |
| `SMTP_USER` | — | Login SMTP |
| `SMTP_PASS` | — | Mot de passe SMTP |
| `SMTP_FROM` | — | Expéditeur affiché |

**Rétrospective :**
`tesseract.js` était déjà dans `package.json` depuis le Sprint 3 mais non branché. L'intégration finale a pris moins de temps que prévu grâce à l'API Worker de v7. Nodemailer s'est avéré très simple à intégrer ; le template HTML responsive en dark mode est prêt pour une présentation soignée.

---

*MJ Studio — Mohamed Jerbi · ENI Carthage · Smartovate · 2026*


---

## Sprint 0 — Cadrage (Semaine 1)

**Objectif :** Comprendre le besoin et choisir l'architecture RAG.

**Durée :** 5 jours · 2–6 juin 2026

| User Story | Critères d'acceptation |
|------------|------------------------|
| En tant que stagiaire, je veux analyser l'existant, afin de définir le périmètre | Document problème/solution validé |
| En tant qu'équipe, nous voulons une stack React + Node, afin de livrer vite | Choix techniques documentés |

**Tâches :** Entretiens Smartovate, étude RAG, maquettes papier, repo GitHub.

**Incrément :** `ARCHITECTURE.md`, plan des lots.

**Rétrospective :** Le cadrage a pris du temps mais a évité de coder dans le vide.

---

## Sprint 1 — Fondation UI (Semaine 2–3)

**Objectif :** Landing page + thème clair/sombre + routing.

**Durée :** 10 jours · 9–20 juin 2026

| User Story | Critères |
|------------|----------|
| Visiteur voit une page d'accueil pro | Responsive, signature MJ Studio |
| Utilisateur bascule le thème | Persistance localStorage |

**Livré :** `LandingPage.tsx`, `ThemeProvider`, tokens Tailwind WCAG.

**Difficulté :** Éviter le flash blanc au chargement → script inline dans `index.html`.

---

## Sprint 2 — Authentification (Semaine 4)

**Objectif :** Login, register, JWT, guards RBAC.

**Durée :** 5 jours · 23–27 juin 2026

| User Story | Critères |
|------------|----------|
| Utilisateur se connecte | JWT + refresh token |
| Rôles limitent les pages | Redirect si non autorisé |

**Livré :** `AuthProvider`, `LoginPage`, middleware backend.

---

## Sprint 3 — Documents (Semaine 5–6)

**Objectif :** Upload multi-formats + dossiers.

**Durée :** 10 jours · 30 juin – 11 juillet 2026

| User Story | Critères |
|------------|----------|
| Éditeur upload PDF/Word/Excel/MD | Texte réel extrait, pas simulé |
| Éditeur organise en dossiers | Fil d'Ariane, CRUD |

**Livré :** `parser.ts`, `DocumentsPage.tsx`, pipeline chunking.

**Difficulté :** PDF scannés → message d'erreur clair (OCR prévu plus tard).

---

## Sprint 4 — Moteur RAG (Semaine 7–8)

**Objectif :** Chat streaming + citations + recherche hybride.

**Durée :** 10 jours · 14–25 juillet 2026

| User Story | Critères |
|------------|----------|
| Utilisateur pose une question | SSE mot par mot |
| Réponse cite les sources | Badges cliquables + panneau latéral |
| Question hors sujet | Message « ne figure pas dans les documents » |

**Livré :** RRF, rerank Cohere, `ChatPage.tsx`, cache requêtes.

---

## Sprint 5 — Admin & Audit (Semaine 9)

**Objectif :** Dashboard, rôles, journal d'audit.

**Durée :** 5 jours · 28 juillet – 1 août 2026

**Livré :** `AdminPage`, `AuditPage`, export CSV, gestion utilisateurs.

---

## Sprint 6 — Lacunes documentaires (Semaine 10)

**Objectif :** Signalement et workflow éditeur.

**Durée :** 5 jours · 4–8 août 2026

**Livré :** `KnowledgeGapModal`, `GapManagementPage`, tickets GAP-XXXX.

---

## Sprint 7 — Sécurité & 2FA (Semaine 11)

**Objectif :** TOTP, rate limit, anti-injection, isolation docs.

**Durée :** 5 jours · 11–15 août 2026

**Livré :** 2FA, `securityMiddleware`, filtrage documents par utilisateur.

---

## Sprint 8 — Finalisation (Semaine 12–13)

**Objectif :** Reset MDP, suppression comptes, déploiement, docs, tests.

**Durée :** 10 jours · 18–29 août 2026

**Livré :** Pages forgot/reset password, CI, guides déploiement, rapport stage.

**Rétrospective :** Le mode MOCK local a permis de finir le stage sans budget cloud.

---

## Sprint 9 — Déploiement (Semaine 14)

**Objectif :** Vercel + Railway + validation finale.

**Durée :** 5 jours · 1–5 septembre 2026

**Livré :** Config Vercel/Railway, script validation étape 2, documentation complète.
