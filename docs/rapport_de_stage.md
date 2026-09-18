# Rapport de stage

---

## Page de garde

**École Nationale d'Ingénieurs de Carthage (ENI Carthage)**  
2ème année Cycle Ingénieur

**Stage universitaire**

# MJ Studio — Intelligence Documentaire RAG

Application web de questions-réponses sur documents d'entreprise  
avec citations vérifiables et contrôle d'accès par rôles

**Réalisé par :** Mohamed Jerbi  
**Entreprise d'accueil :** Smartovate  
**Période :** juin – septembre 2026  
**Encadrant académique :** [À compléter]  
**Encadrant entreprise :** [À compléter]

---

## Remerciements

Je remercie Smartovate de m'avoir accueilli et guidé sur ce projet concret. Je remercie l'ENI Carthage pour la formation qui m'a permis de mener ce stage. Merci à mon encadrant pour ses retours sur l'architecture et la sécurité.

---

## Sommaire

1. Introduction générale  
2. Chapitre 1 — Cadre du stage  
3. Chapitre 2 — Étude de l'existant et solution  
4. Chapitre 3 — Besoins et spécifications  
5. Chapitre 4 — Conception  
6. Chapitre 5 — Réalisation  
7. Chapitre 6 — Tests et validation  
8. Chapitre 7 — Déploiement  
9. Conclusion et perspectives  
10. Bibliographie et webographie  

---

## Introduction générale

Les entreprises stockent leurs procédures dans des PDF, des fichiers Word et des tableaux Excel. Les employés perdent du temps à chercher. Les chatbots génériques inventent parfois des réponses fausses.

J'ai développé **MJ Studio RAG** : une application où l'utilisateur pose une question en français, le système cherche dans les documents indexés, puis l'IA répond **en citant les sources**. Ce rapport décrit mon travail de bout en bout : analyse, conception, code, tests et déploiement.

---

## Chapitre 1 — Cadre du stage

### 1.1 L'entreprise Smartovate

Smartovate est une entreprise qui accompagne des projets numériques. Mon stage s'est placé dans une logique produit : livrer une application utilisable, pas seulement une preuve de concept.

### 1.2 Équipe et encadrement

J'ai travaillé avec un encadrant technique côté entreprise. Je faisais des points réguliers sur l'avancement (sprints d'environ une semaine).

### 1.3 Mission confiée

Concevoir et développer une application **RAG** (Retrieval-Augmented Generation) :
- Téléverser des documents (PDF, Word, Excel, Markdown)
- Poser des questions en langage naturel
- Obtenir des réponses sourcées
- Gérer les accès par rôles (admin, éditeur, auditeur, lecteur)

---

## Chapitre 2 — Étude de l'existant et solution

### 2.1 Problématique

| Problème | Impact |
|----------|--------|
| Information dispersée | Perte de temps |
| Recherche mot-clé limitée | Mauvais résultats |
| Chatbot sans sources | Manque de confiance |

### 2.2 Solutions existantes

- **Recherche full-text** (Elasticsearch) : mots exacts, pas le sens
- **ChatGPT seul** : pas accès aux docs internes, risque d'invention
- **RAG** : combine recherche + génération avec contexte documentaire

### 2.3 Solution proposée

Architecture en 3 couches :
1. **Frontend React** — interface utilisateur
2. **API Express** — auth, documents, query SSE
3. **Moteur RAG** — parsing, chunks, recherche hybride, LLM

Mode **MOCK** local (JSON) pour le stage ; **Supabase** optionnel pour la production.

---

## Chapitre 3 — Besoins et spécifications

### 3.1 Acteurs

| Acteur | Description |
|--------|-------------|
| Lecteur | Pose des questions |
| Éditeur | Gère les documents |
| Auditeur | Consulte les logs |
| Admin | Stats + utilisateurs |

### 3.2 Besoins fonctionnels (extraits)

- BF01 : Authentification (login, register, logout, reset MDP, 2FA)
- BF02 : Upload multi-formats avec extraction réelle
- BF03 : Chat RAG streaming avec citations
- BF04 : Signalement lacunes documentaires
- BF05 : Dashboard admin et audit CSV
- BF06 : Isolation documents par utilisateur (hors corpus système)

### 3.3 Besoins non fonctionnels

- **Performance** : première réponse SSE < 3 s en local (objectif)
- **Sécurité** : JWT, RBAC, rate limit, CORS configuré
- **Accessibilité** : thème clair/sombre WCAG AA
- **Maintenabilité** : TypeScript, docs, CI

*(Diagrammes cas d'utilisation : voir `description_projet.md` section 5.1)*

---

## Chapitre 4 — Conception

L'architecture détaillée, les diagrammes de classes, séquences, activité, BDD et déploiement sont dans **`docs/description_projet.md`**.

Points clés :
- Pipeline ingestion : parse → chunk → embed → index
- Pipeline query : embed question → RRF → rerank → LLM → SSE
- Tables : users, documents, chunks, knowledge_gaps, audit_logs

---

## Chapitre 5 — Réalisation

### 5.1 Technologies

| Couche | Stack |
|--------|-------|
| Frontend | React 18.3, Vite 5.4, Tailwind 3.4 |
| Backend | Express 5.2, TypeScript 7, Node 18+ |
| IA | Cohere / Azure OpenAI (optionnel) |
| Données | JSON local ou Supabase pgvector |

### 5.2 Sprints

Voir **`docs/sprints.md`** — 10 sprints de juin à septembre 2026.

### 5.3 Fonctionnalités clés implémentées

#### OCR pour PDF scannés (Sprint 10)

Les PDF numérisés (scans) ne contiennent pas de couche texte exploitable. J'ai activé **Tesseract.js** (déjà présent dans les dépendances) dans le service `parser.ts` :

1. `unpdf` extrait le texte page par page
2. Si une page retourne moins de 50 caractères → détection de scan
3. Tesseract.js lance l'OCR sur le buffer de la page
4. Si l'OCR extrait ≥ 50 caractères → la page est indexée avec le texte OCR
5. Sinon → la page est ignorée (log `warning`)

Les langues sont configurables via `OCR_LANGS=fra+eng` (défaut). Tesseract supporte également l'arabe (`ara`).

#### Emails de réinitialisation de mot de passe (Sprint 10)

J'ai créé `emailService.ts` avec **Nodemailer** :

- **Mode développement** (`SMTP_HOST` vide) : le lien de réinitialisation s'affiche dans la réponse JSON pour faciliter les tests
- **Mode production** (`SMTP_HOST` configuré) : un email HTML responsive est envoyé à l'utilisateur avec :
  - Template dark mode aux couleurs MJ Studio (violet/indigo)
  - Bouton CTA cliquable
  - Lien texte en fallback
  - Avertissement sécurité
  - Expiration 1 heure

Fournisseurs supportés : Brevo, Mailgun, Gmail SMTP, ou SMTP d'entreprise.

### 5.3 Interfaces principales

- `/` — Landing MJ Studio
- `/login`, `/forgot-password`, `/reset-password`
- `/chat` — Assistant RAG
- `/documents` — Gestionnaire fichiers
- `/admin` — Dashboard
- `/admin/signalements` — Tickets lacunes
- `/audit` — Journal
- `/profile` — Profil + 2FA

*(Captures d'écran : lancer l'app localement et insérer les screenshots dans la version PDF du rapport)*

---

## Chapitre 6 — Tests et validation

### 6.1 Méthode

Script automatisé : `node scripts/run-etape2-validation.mjs`  
Résultats : `docs/etape2_resultats_console.txt`

### 6.2 Synthèse (après corrections finales)

| Domaine | Résultat |
|---------|----------|
| Auth (login, register, logout, reset MDP) | OK |
| Upload PDF/Word/Excel/MD | OK (parser réel) |
| Upload PDF scanné | **OK (OCR Tesseract.js)** |
| Chat RAG + sources | OK |
| Signalements | OK |
| RBAC + anti auto-promotion | OK |
| Upload sécurisé + isolation docs | OK (corrigé) |
| Mot de passe oublié | **OK (email SMTP en prod, lien en dev)** |
| Suppression compte | OK |

Détail complet : **`docs/etape2_validation_tests.md`**

### 6.3 Limites restantes

- AWS Bedrock / OpenSearch natif : config Legacy prête, non activée (hors périmètre stage)
- Déploiement cloud : config Vercel/Railway prête, URLs à créer sur les comptes personnels

---

## Chapitre 7 — Déploiement

Guide pas à pas : **`docs/deploiement.md`**

- Frontend → Vercel (`frontend/vercel.json`)
- Backend → Railway (`backend/railway.toml`)
- Variables : `.env.example` à la racine
- CI : `.github/workflows/ci.yml`

### 7.1 Variables de production essentielles

| Variable | Description | Obligatoire |
|----------|-------------|-------------|
| `JWT_SECRET` | Clé de signature JWT | Oui |
| `CORS_ORIGINS` | URL Vercel autorisée | Oui |
| `FRONTEND_URL` | URL Vercel (liens reset) | Oui |
| `OCR_ENABLED` | Active Tesseract OCR | Non (défaut: true) |
| `OCR_LANGS` | Langues OCR | Non (défaut: fra+eng) |
| `SMTP_HOST` | Serveur SMTP | Oui (emails) |
| `SMTP_PORT` | Port SMTP (587/465) | Oui (emails) |
| `SMTP_USER` | Login SMTP | Oui (emails) |
| `SMTP_PASS` | Mot de passe SMTP | Oui (emails) |
| `COHERE_API_KEY` | IA Cohere | Optionnel |

### 7.2 Healthcheck enrichi

L’endpoint `/health` retourne l’état des fonctionnalités activées :

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

---

## Conclusion et perspectives

J'ai livré une application RAG complète : upload multi-formats avec OCR intégré, indexation, chat souré, admin, audit, sécurité renforcée, reset de mot de passe par email. Le mode local permet une démo sans cloud.

**Perspectives :**
- Déployer sur Vercel + Railway avec comptes personnels
- Tests e2e Playwright
- Multi-tenant strict par organisation
- OCR multipage parallèle (workers Tesseract en pool)
- Notification temps réel WebSocket pour les tickets lacunes résolus

Ce stage m'a appris le RAG en conditions réelles : parsing, OCR, embeddings, sécurité API, email transactionnel et documentation professionnelle.

---

## Bibliographie et webographie

1. Lewis et al. — *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks* (2020)  
2. Documentation Cohere — https://docs.cohere.com  
3. Supabase pgvector — https://supabase.com/docs/guides/database/extensions/pgvector  
4. OWASP — JWT Cheat Sheet  
5. React Router v6 — https://reactrouter.com  
6. Express.js — https://expressjs.com  
7. WCAG 2.1 — https://www.w3.org/WAI/WCAG21/quickref/  
8. Dépôt projet — https://github.com/mohamedjerbi-hub/rag-bedrock-opensearch  

---

*Rapport rédigé par Mohamed Jerbi — MJ Studio — ENI Carthage — 2026*
