# Audit du projet SmartDocs (mis à jour)

> Dernière mise à jour : 2026-08-06

---

## 1. Arborescence Commentée (état final)

```
rag-bedrock-opensearch/
│
├── frontend/                          # React 18 + Vite + TypeScript
│   ├── index.html                     # Point d'entrée HTML (SEO : meta, title)
│   ├── tailwind.config.js             # Tokens SmartDocs (primary, accent, error…)
│   ├── src/
│   │   ├── main.tsx                   # Racine React + ThemeProvider
│   │   ├── App.tsx                    # Router React-Router v6 + Guards RBAC
│   │   ├── index.css                  # Variables CSS dark/light + typographie Inter
│   │   ├── api/
│   │   │   └── client.ts              # HTTP fetch + SSE streaming + AbortController
│   │   ├── auth/
│   │   │   └── AuthProvider.tsx       # Context Auth (mock localStorage / Cognito)
│   │   ├── components/
│   │   │   ├── Layout.tsx             # Shell : sidebar navigation + Outlet
│   │   │   ├── ThemeProvider.tsx      # Contexte theme dark/light persistant
│   │   │   └── ThemeToggle.tsx        # Bouton bascule thème
│   │   └── pages/
│   │       ├── LandingPage.tsx        # ✅ Site vitrine public (héro, archi, FAQ)
│   │       ├── LoginPage.tsx          # ✅ Connexion multi-rôles (mock Cognito)
│   │       ├── ChatPage.tsx           # ✅ Chat RAG + citations inline + panneau source
│   │       ├── DocumentsPage.tsx      # ✅ Gestionnaire fichiers/dossiers + breadcrumb
│   │       ├── AdminPage.tsx          # ✅ Dashboard KPI + graphique SVG + état AWS
│   │       ├── AuditPage.tsx          # ✅ Journal audit filtrable + export CSV
│   │       └── ProfilePage.tsx        # ✅ Profil utilisateur + zone danger
│   └── .env.local                     # VITE_API_BASE_URL=http://localhost:3001
│
├── backend/                           # Node.js 20 + Express + TypeScript
│   ├── src/
│   │   ├── handlers/
│   │   │   ├── query.ts               # Pipeline RAG : embed → search → LLM → SSE
│   │   │   ├── ingest.ts              # Ingestion : S3 trigger → chunk → embed → index
│   │   │   └── opensearch.ts          # Client OpenSearch Serverless
│   │   ├── services/
│   │   │   ├── bedrock.ts             # Client Amazon Bedrock (Claude + Titan)
│   │   │   └── opensearch.ts          # Service kNN search
│   │   ├── mocks/
│   │   │   └── engine.ts              # ✅ Moteur Mock : embeddings hash + cosinus + LLM simulé
│   │   └── local/
│   │       └── server.ts              # ✅ Serveur Express dev + toutes les routes REST
│   ├── data/                          # Persistance JSON locale (ignoré par git)
│   │   ├── documents.json             # Métadonnées documents + dossiers
│   │   ├── chunks.json                # Chunks vectorisés
│   │   └── queries.json               # Historique des requêtes (audit)
│   ├── sample_docs/                   # Documents de démo pré-chargés
│   └── .env                           # DEMO_MODE=true (par défaut)
│
├── infra/
│   └── terraform/                     # Modules Terraform AWS existants
│
└── docs/
    ├── AUDIT.md                       # Ce fichier
    ├── PLAN.md                        # Plan d'implémentation
    ├── api.md                         # Spécification REST
    └── DEMO.md                        # ✅ Scénario de démonstration
```

---

## 2. Fonctionnalités Réellement Implémentées (état final)

| Fonctionnalité | État | Notes |
|---|---|---|
| Page vitrine publique (Landing) | ✅ Complet | Héro, archi SVG, FAQ, footer |
| Connexion multi-rôles (Admin/Éditeur/Lecteur) | ✅ Complet | Mock localStorage, prêt Cognito |
| Gestionnaire de fichiers avec dossiers | ✅ Complet | Breadcrumb, déplacement, renommage, suppression récursive |
| Upload de fichiers (Drag & Drop) | ✅ Complet | Upload vers dossier courant, 5 formats |
| Chat RAG avec streaming SSE | ✅ Complet | AbortController, cursor animé |
| Citations inline cliquables [1][2] | ✅ Complet | Intégration ReactMarkdown custom |
| Panneau source avec extrait | ✅ Complet | Score, barre de pertinence, extrait |
| Tableau de bord administrateur | ✅ Complet | KPI, graphique SVG, état services, coût estimé |
| Journal d'audit filtrable | ✅ Complet | Filtre texte + utilisateur, export CSV |
| Page de profil utilisateur | ✅ Complet | Nom, thème, langue, zone danger |
| Thème clair/sombre persistant | ✅ Complet | localStorage, ThemeProvider |
| Mode Mock sans AWS | ✅ Complet | Embeddings hash, cosinus, LLM déterministe |
| Persistance JSON locale | ✅ Complet | documents.json, chunks.json, queries.json |
| Moteur Mock — dossiers imbriqués | ✅ Complet | parent_id, suppression récursive |
| Infrastructure Terraform | 🚧 Partiel | Modules existants, non testés |
| Déploiement AWS réel | ❌ Non fait | Nécessite accès AWS |
| Tests unitaires | 🚧 Partiel | Vitest configuré, tests à écrire |

---

## 3. Architecture des Données (Mode Mock)

### Document (StoredDocument)
```typescript
{
  document_id: string;  // UUID
  name: string;         // Nom du fichier ou dossier
  is_folder: boolean;   // true = dossier, false = fichier
  parent_id: string | null; // Hiérarchie des dossiers
  size_bytes: number;
  mime_type: string;    // 'folder' pour les dossiers
  status: 'pending' | 'indexing' | 'indexed' | 'failed';
  chunk_count: number;
  uploaded_by: string;
  uploaded_at: string;  // ISO 8601
}
```

### Chunk (StoredChunk)
```typescript
{
  chunk_id: string;
  document_id: string;
  document_name: string;
  page: number;
  chunk_index: number;
  text: string;          // 600 mots max par chunk
  embedding: number[];   // 512 dimensions (hash SHA-256 déterministe)
}
```

---

## 4. API REST — Endpoints disponibles (Mode Local)

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/documents` | Liste tous les documents et dossiers |
| `POST` | `/documents/upload-url` | Génère une URL d'upload (+ parent_id) |
| `PUT` | `/internal/upload/:id` | Reçoit le contenu et ingère |
| `POST` | `/documents/folders` | Crée un dossier |
| `PUT` | `/documents/:id` | Renomme ou déplace un document/dossier |
| `DELETE` | `/documents/:id` | Supprime (récursif si dossier) |
| `POST` | `/documents/:id/reindex` | Réindexe un document |
| `POST` | `/query` | Requête RAG avec streaming SSE |
| `GET` | `/stats` | Métriques globales |
| `GET` | `/history` | Historique des requêtes |

---

## 5. Dette Technique Résiduelle

| Dette | Priorité | Description |
|---|---|---|
| Tests unitaires | 🔴 Haute | Aucun test écrit à ce jour (Vitest configuré) |
| Authentification Cognito réelle | 🟡 Moyenne | Nécessite accès AWS |
| Déploiement AWS end-to-end | 🟡 Moyenne | Infrastructure Terraform non testée |
| Extraction PDF réelle | 🟡 Moyenne | Actuellement simulée en Mock |
| Pagination API | 🟡 Moyenne | `GET /documents` retourne tout sans pagination |
| Rate limiting | 🟠 Faible | Pas de protection sur les endpoints |

---

## 6. Estimation des Coûts AWS (Production)

Pour 500 documents (~100 pages chacun) et 2000 requêtes/mois :

| Service | Coût estimé/mois |
|---|---|
| OpenSearch Serverless (OCU min) | ~30$ |
| Bedrock — Claude 3 Haiku (tokens) | ~10$ |
| Bedrock — Titan Embeddings | ~2$ |
| S3 + Lambda + API Gateway | ~3$ |
| **Total estimé** | **~45$/mois** |

---

*Audit réalisé dans le cadre du projet de stage — SmartDocs RAG Platform*
