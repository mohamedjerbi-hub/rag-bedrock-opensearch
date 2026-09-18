# Description complète du projet — MJ Studio RAG

> **Auteur :** Mohamed Jerbi — ENI Carthage × Smartovate  
> **Type :** Application RAG (Retrieval-Augmented Generation) — l'IA cherche d'abord dans les documents, puis répond avec des sources.

---

## 1. Présentation générale

### Quel problème ?

Dans une entreprise, l'information est éparpillée : PDF de procédures, fichiers Word RH, tableaux Excel, notes internes. Les employés perdent du temps à chercher. Une IA classique (ChatGPT seul) invente parfois des réponses.

**MJ Studio RAG** résout ce problème : l'utilisateur pose une question en français, le système cherche dans **ses** documents d'entreprise, puis génère une réponse **avec des citations cliquables** vers les passages sources.

### Pour qui ?

| Acteur | Besoin |
|--------|--------|
| **Employé (lecteur)** | Poser des questions, obtenir des réponses fiables |
| **Éditeur documentaire** | Téléverser et organiser les documents |
| **Administrateur** | Stats, gestion des comptes, vue globale |
| **Auditeur** | Tracer qui a fait quoi (sécurité, conformité) |

---

## 2. Objectifs

### Objectif principal

Construire une application web d'intelligence documentaire : upload multi-formats → indexation → chat avec citations vérifiables.

### Objectifs secondaires

- Contrôle d'accès par rôles (RBAC)
- Signalement des lacunes documentaires (tickets)
- Journal d'audit exportable
- Mode local sans cloud obligatoire (démo / stage)
- Interface moderne, thème clair/sombre, responsive

---

## 3. Fonctionnalités par rôle

### Lecteur (reader)

- Se connecter / s'inscrire
- Chat RAG avec historique local
- Voir les sources cliquables
- Signaler une lacune documentaire
- Gérer son profil et activer la 2FA

### Éditeur (editor)

- Tout ce que fait le lecteur
- Téléverser PDF, Word, Excel, Markdown, TXT
- Créer des dossiers, renommer, supprimer
- Gérer les signalements reçus (statut, commentaires)

### Auditeur (auditor)

- Chat RAG
- Consulter le journal d'audit (requêtes + sécurité)
- Exporter en CSV

### Administrateur (admin)

- Tout ce que font éditeur + auditeur
- Dashboard : documents, requêtes, latence, formats
- Promouvoir / rétrograder / suspendre des utilisateurs
- Supprimer des signalements

---

## 4. Architecture

### Flux global

```
Navigateur (React)
    │  HTTPS / REST + SSE
    ▼
API Express (Node.js)
    │  parse, chunk, embed
    ▼
Stockage (JSON local OU Supabase pgvector)
    │  recherche hybride
    ▼
Modèle IA (Cohere / Azure OpenAI — ou fallback local)
    │
    ▼
Réponse streamée + sources
```

### Composants principaux

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Frontend | React 18 + Vite + Tailwind | Interface utilisateur |
| API | Express 5 + TypeScript | Auth, documents, query SSE |
| Moteur RAG | `MockEngine` | Chunking, RRF, rerank, génération |
| Persistance | Fichiers JSON / Supabase | Documents, chunks, users, audit |
| IA | Cohere, Azure OpenAI | Embeddings + chat (optionnel) |

---

## 5. Conception — Diagrammes

### 5.1 Diagramme de cas d'utilisation

```mermaid
flowchart LR
  subgraph Acteurs
    L[Lecteur]
    E[Éditeur]
    A[Admin]
    U[Auditeur]
  end

  subgraph Systeme["MJ Studio RAG"]
    UC1[Poser une question]
    UC2[Téléverser un document]
    UC3[Signaler une lacune]
    UC4[Gérer les rôles]
    UC5[Consulter l'audit]
    UC6[Configurer 2FA]
  end

  L --> UC1
  L --> UC3
  L --> UC6
  E --> UC1
  E --> UC2
  E --> UC3
  A --> UC1
  A --> UC2
  A --> UC3
  A --> UC4
  A --> UC5
  U --> UC1
  U --> UC5
```

**Explication :** Le lecteur interroge la base et peut signaler un problème. L'éditeur ajoute des documents. L'admin gère les comptes. L'auditeur lit les logs sans modifier les documents.

---

### 5.2 Diagramme de classes (simplifié)

```mermaid
classDiagram
  class MockEngine {
    -documents: Map
    -chunks: Map
    +ingestDocument()
    +search()
    +generateAnswer()
    +getStats()
    +reindexDocument()
  }

  class StoredDocument {
    +document_id: string
    +name: string
    +status: string
    +uploaded_by: string
  }

  class StoredChunk {
    +chunk_id: string
    +document_id: string
    +text: string
    +embedding: number[]
  }

  class KnowledgeGap {
    +ticket_number: string
    +issue_type: string
    +status: string
    +user_email: string
  }

  class UserRoleRecord {
    +email: string
    +role: string
    +active: boolean
  }

  MockEngine --> StoredDocument
  MockEngine --> StoredChunk
```

**Explication :** `MockEngine` est le cœur métier. Chaque document produit plusieurs chunks vectorisés. Les lacunes et rôles sont gérés à part.

---

### 5.3 Séquence — Poser une question et recevoir la réponse

```mermaid
sequenceDiagram
  participant U as Utilisateur
  participant F as Frontend
  participant A as API Express
  participant E as MockEngine
  participant IA as Cohere/Azure

  U->>F: Saisit la question
  F->>A: POST /query (SSE, JWT)
  A->>A: Vérifie auth + anti-injection
  A->>E: search(question)
  E->>E: Vector + BM25 + RRF + Rerank
  E-->>A: Top chunks
  alt Aucun chunk pertinent
    A-->>F: "Ne figure pas dans les documents"
  else Chunks trouvés
    A->>IA: generateAnswer(question, chunks)
    IA-->>A: Texte réponse
    A-->>F: Stream SSE mot par mot
  end
  F-->>U: Réponse + sources cliquables
```

**Explication :** La question passe par la recherche avant l'IA. Si rien n'est trouvé, on ne laisse pas l'IA inventer. Sinon, la réponse est streamée avec les sources.

---

### 5.4 Séquence — Téléverser et indexer un document

```mermaid
sequenceDiagram
  participant E as Éditeur
  participant F as Frontend
  participant A as API
  participant P as Parser
  participant M as MockEngine

  E->>F: Glisse un fichier PDF
  F->>A: POST /documents/upload-url
  A-->>F: URL upload + document_id
  F->>A: PUT /internal/upload (fichier binaire, JWT)
  A->>P: parseDocumentBuffer()
  P-->>A: texte + chunks
  A->>M: vectorize + save
  M-->>A: status indexed
  A-->>F: 200 OK
  F-->>E: Badge "Indexé"
```

**Explication :** L'upload est en deux temps (URL puis PUT). Le parser extrait le vrai texte. Le moteur découpe et vectorise avant de marquer le document comme indexé.

---

### 5.5 Activité — Signalement de lacune documentaire

```mermaid
flowchart TD
  A[Utilisateur insatisfait de la réponse] --> B{Ouvre modal signalement}
  B --> C[Choisit type : info absente, réponse incorrecte, etc.]
  C --> D[Ajoute commentaire obligatoire]
  D --> E[POST /api/gaps]
  E --> F{Rate limit OK?}
  F -->|Non| G[Erreur 429]
  F -->|Oui| H[Création ticket GAP-XXXX]
  H --> I[Éditeur/Admin voit dans /admin/signalements]
  I --> J{Traitement}
  J -->|En cours| K[Assignation + commentaire interne]
  J -->|Résolu| L[Notification utilisateur]
  J -->|Rejeté| M[Clôture avec note]
```

**Explication :** L'utilisateur crée un ticket depuis le chat. L'éditeur le traite. Si résolu, l'utilisateur est notifié via `/api/notifications/my-resolutions`.

---

### 5.6 Schéma base de données (entités et relations)

```mermaid
erDiagram
  USERS ||--o| USER_ROLES : has
  DOCUMENTS ||--o{ DOCUMENT_CHUNKS : contains
  DOCUMENTS ||--o{ DOCUMENTS : parent_folder
  KNOWLEDGE_GAPS ||--o{ KNOWLEDGE_GAP_COMMENTS : has
  USERS ||--o{ KNOWLEDGE_GAPS : reports
  USERS ||--o{ QUERY_HISTORY : asks

  USERS {
    string email PK
    string password_hash
    string name
    boolean totp_enabled
  }

  USER_ROLES {
    string email PK
    string role
    boolean active
  }

  DOCUMENTS {
    uuid document_id PK
    string name
    boolean is_folder
    uuid parent_id FK
    string status
    string uploaded_by
  }

  DOCUMENT_CHUNKS {
    uuid chunk_id PK
    uuid document_id FK
    text content
    vector embedding
    int page_number
  }

  KNOWLEDGE_GAPS {
    uuid id PK
    string ticket_number UK
    string user_email
    string issue_type
    string status
  }

  QUERY_HISTORY {
    uuid query_id PK
    string question
    string answer
    int latency_ms
    string user
  }
```

**Explication :** En mode local, ces entités sont des fichiers JSON. Avec Supabase, ce sont des tables PostgreSQL avec pgvector pour les embeddings.

---

### 5.7 Déploiement (cible Vercel + Railway)

```mermaid
flowchart TB
  subgraph Client
    B[Navigateur]
  end

  subgraph Vercel["Vercel (Frontend)"]
    FE[React build statique]
  end

  subgraph Railway["Railway (Backend)"]
    BE[Express API :3001]
    ENV[Variables JWT, COHERE, SUPABASE]
  end

  subgraph Data
    SB[(Supabase PostgreSQL + pgvector)]
  end

  B --> FE
  FE -->|VITE_API_BASE_URL| BE
  BE --> SB
  BE -->|CORS origin Vercel| FE
```

**Explication :** Le frontend est servi par Vercel. L'API tourne sur Railway. Supabase stocke documents et vecteurs. CORS lie les deux domaines.

> **État actuel :** Terraform AWS et mode JSON local existent ; Vercel/Railway à configurer (voir étape 4.3).

---

## 6. Choix techniques

| Choix | Pourquoi |
|-------|----------|
| **React + Vite** | Rapide à développer, hot reload, build léger |
| **Express** | Simple pour REST + SSE streaming |
| **JSON local** | Démo stage sans compte cloud |
| **Supabase optionnel** | pgvector intégré si passage prod |
| **Cohere / Azure** | Bon français, rerank multilingue |
| **RRF + BM25 + vectoriel** | Meilleure précision que vectoriel seul |
| **JWT + bcrypt** | Auth standard, facile à comprendre |
| **Tailwind** | UI cohérente, thème clair/sombre |

---

## 7. Sécurité

| Mesure | Détail |
|--------|--------|
| Auth JWT | Token Bearer sur routes privées |
| RBAC 4 rôles | Guards frontend + `requireRoles` backend |
| 2FA TOTP | RFC 6238, optionnelle par compte |
| Rate limiting | 10 auth/min, 120 API/min |
| Anti-injection prompt | Regex sur `/query` |
| Headers sécurité | X-Frame-Options, nosniff, etc. |
| Upload protégé | Auth + whitelist extensions + 20 Mo max |
| Audit immuable | JSON append-only + export CSV |

**Mesures ajoutées en finalisation :** reset mot de passe (token 1h), isolation documents par utilisateur, suppression comptes, CORS configurable, upload authentifié.

**Points à faire en production :** brancher SMTP pour reset MDP ; changer `JWT_SECRET` ; déployer Vercel/Railway.

---

## 8. Difficultés rencontrées et solutions

1. **Extraction PDF hétérogène** — Certains PDF ne donnent que peu de texte (scan). *Solution :* unpdf page par page + message d'erreur clair si < 50 caractères.

2. **Latence IA cloud** — Cohere/Azure parfois lent ou sans crédits. *Solution :* fallback affichant les extraits bruts + mode mock local.

3. **Cohérence des rôles** — JWT vs fichier `user_roles.json`. *Solution :* le middleware relit toujours `roleStore` à chaque requête.

4. **Streaming SSE** — Buffering nginx/proxy. *Solution :* headers `Cache-Control: no-cache`, flush par mot.

5. **Upload gros fichiers** — Timeout mémoire. *Solution :* limite 20 Mo, body raw Express, progression XHR côté frontend.

6. **Signalements spam** — *Solution :* rate limit 5 tickets/heure/utilisateur + validation Zod.

---

## 9. Limites actuelles et améliorations futures

| Limite | Amélioration possible |
|--------|----------------------|
| Pas de reset mot de passe | Email SMTP + token temporaire |
| Documents partagés (pas multi-tenant) | Colonne `owner_id` + filtres API |
| OCR absent | Brancher Tesseract sur PDF scannés |
| Bedrock/OpenSearch Lambda non utilisés en local | Unifier handlers AWS et Express |
| Pas de déploiement Vercel/Railway | CI/CD + guides étape 4.3 |
| Réindexation sans fichier source | Stocker binaire S3 ou re-parse |
| Tests auto limités | Suite Jest/Vitest + e2e Playwright |

---

*Document pour le chapitre 4 (conception) du rapport de stage ENI Carthage.*
