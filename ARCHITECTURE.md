# Architecture du Pipeline RAG — MJ Studio

Ce document détaille l'architecture technique et le flux d'exécution du système de **Retrieval-Augmented Generation (RAG)** développé par **Mohamed Jerbi (MJ Studio - ENI Carthage)**.

---

## 🏗️ Schéma du Flux RAG (Upload → Réponse)

```text
[ 📁 Document Source ] 
   (PDF, DOCX, XLSX, TXT, MD)
           │
           ▼
[ ⚙️ Ingestion & Parsing ] ──▶ (PDFParse, Mammoth, XLSX, Tesseract OCR)
           │
           ▼
[ ✂️ Découpage (Chunking) ] ──▶ (Overlapping Chunks: 500-1000 tokens)
           │
           ▼
[ 🧠 Vectorisation ] ───────▶ (Cohere Embeddings / Bedrock Titan)
           │
           ▼
[ 🗄️ Base Vectorielle ] ────▶ (Supabase Vector pgvector & BM25 Index)
           │
 ══════════╪═════════════════════════════════════════════════════════════
           │  (Phase d'Interrogation / Query Time)
           ▼
[ 💬 Question Utilisateur ] 
           │
           ├───────────────────────────────┐
           ▼                               ▼
[ 🔍 Vector Search (COSINE) ]    [ 🔤 Keyword Search (BM25) ]
           │                               │
           └───────────────┬───────────────┘
                           ▼
            [ 🔀 Reciprocal Rank Fusion (RRF) ]
                           │
                           ▼
            [ 🎯 Cohere Rerank (v3.0) ]
                           │
                           ▼
         [ 🛡️ Guardrails & Anti-Hallucination ]
                           │
                           ▼
        [ 🤖 Génération LLM avec Citations ]
                           │
                           ▼
    [ 🖥️ Stream SSE & In-line Citations [Doc: p.X] ]
```

---

## ⚡ Étapes Détaillées du Pipeline

### 1. Upload & Ingestion
- Support natif des fichiers **PDF, Word (.docx), Excel (.xlsx), Textes (.txt) et Markdown (.md)**.
- Traitement asynchrone avec suivi de progression en temps réel (`extracting`, `chunking`, `vectorizing`, `indexed`).

### 2. Découpage Intelligent (Chunking)
- Fenêtres glissantes avec chevauchement (*overlap*) pour conserver le contexte sémantique aux frontières de blocs.
- Conservation des métadonnées source (nom du fichier, numéro de page, position).

### 3. Recherche Hybride & Réordonnancement (RRF + Cohere Rerank)
- **Vector Search** : Capture la proximité sémantique dans l'espace d'embedding vectoriel.
- **BM25 Keyword Search** : Capture l'exactitude des termes métier et acronymes.
- **Reciprocal Rank Fusion (RRF)** : Fusionne les scores des deux algorithmes pour une pertinence maximale.
- **Cohere Rerank** : Réordonne les 10 meilleurs extraits pour sélectionner uniquement le contexte le plus pertinent.

### 4. Garde-fous Anti-Hallucination & Citations
- **Prompt System** strict interdisant d'inventer des faits non présents dans le contexte extrait.
- Citations inline dynamiques cliquables pointant vers le volet de preuve latéral.

---

## 🛡️ Sécurité & Isolation
- **RBAC à 4 Rôles** : Administrateur, Éditeur, Auditeur, Lecteur.
- **Authentification JWT + TOTP 2FA** (RFC 6238).
- **Journal d'Audit Immuable** traçant chaque action utilisateur avec export CSV.
