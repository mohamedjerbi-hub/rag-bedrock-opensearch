# Scénario de Démonstration — SmartDocs

> Ce document décrit le parcours de démonstration recommandé pour présenter SmartDocs à un encadrant.
> Durée estimée : **15–20 minutes**.

---

## 🎯 Objectif de la démo

Montrer qu'une architecture RAG (Retrieval-Augmented Generation) sur AWS peut être utilisée en entreprise pour :
1. **Centraliser** la documentation d'entreprise dispersée
2. **Retrouver** l'information précise en langage naturel
3. **Tracer** chaque accès pour la conformité et l'audit

---

## ⚙️ Préparation (5 min avant)

```bash
# Lancer les deux serveurs
cd backend && npm run dev      # port 3001
cd frontend && npm run dev     # port 5173
```

Ouvrir `http://localhost:5173` dans un navigateur en plein écran.

---

## 📋 Parcours de Démonstration

### Étape 0 — Page d'accueil publique (2 min)

1. Montrer la **landing page** (`/`) avec la baseline *"Knowledge. Retrieved. Answered."*
2. Pointer les sections :
   - Héro avec mock d'interface de chat
   - "Comment ça marche" (3 étapes : Déposer → Indexer → Interroger)
   - Schéma d'architecture AWS en vectoriel
   - FAQ sur la confidentialité et les hallucinations
3. Cliquer sur **"Se connecter"**

---

### Étape 1 — Connexion multi-rôles (1 min)

1. Sur la page de connexion, montrer les **3 comptes de démo** (Administrateur, Éditeur, Lecteur)
2. Sélectionner **Alice Admin** → cliquer "Se connecter"
3. Pointer la bannière de confirmation du rôle

> 💡 **Message clé** : le RBAC est géré via Amazon Cognito en production. Ici, c'est simulé sans token AWS.

---

### Étape 2 — Indexation d'un document (3 min)

1. Naviguer vers **Documents** dans le menu latéral
2. Montrer le **fil d'Ariane** (Racine / dossiers)
3. Créer un dossier : cliquer **"+ Dossier"** → nommer "Ressources Humaines"
4. Entrer dans le dossier en double-cliquant
5. **Glisser-déposer** un fichier `.txt` ou `.md` dans la zone de dépôt
6. Observer le statut passer à **"Indexé"**

> 💡 **Message clé** : en production, le fichier est envoyé dans S3, déclenche une Lambda, qui génère des embeddings via Titan Embeddings, et les stocke dans OpenSearch Serverless.

---

### Étape 3 — Interface de Chat RAG (5 min)

1. Naviguer vers **Chat**
2. Montrer l'écran de bienvenue et les **suggestions de questions**
3. Cliquer sur une suggestion, ex: *"Quelle est notre politique de télétravail ?"*
4. Observer :
   - L'animation **"Recherche dans les documents et génération…"**
   - La réponse qui s'affiche **en streaming** (mot par mot)
   - Les **boutons de citation `[1]` `[2]`** dans le texte
5. Cliquer sur le bouton `[1]` → le **panneau latéral source** s'ouvre
6. Montrer : nom du document, **barre de pertinence**, extrait exact utilisé
7. Poser une question hors-sujet → observer le message *"Je n'ai pas trouvé cette information"*

> 💡 **Message clé** : le modèle ne répond qu'à partir des passages pertinents. Si le passage n'existe pas, il le dit explicitement — pas d'hallucination.

---

### Étape 4 — Tableau de bord administrateur (3 min)

1. Naviguer vers **Dashboard**
2. Présenter les **4 cartes KPI** : documents indexés, requêtes/mois, latence, coût estimé
3. Montrer le **graphique de requêtes par jour** (7 jours glissants)
4. Faire défiler jusqu'à l'**état des services** :
   - Backend API : ✅ actif
   - OpenSearch, Bedrock, Cognito : ⚠️ mode Mock
5. Montrer le **tableau des requêtes récentes** avec coloration de latence

> 💡 **Message clé** : en production, les métriques viennent de CloudWatch. L'estimation de coût aide à anticiper la facture AWS.

---

### Étape 5 — Journal d'Audit (2 min)

1. Naviguer vers **Journal d'audit**
2. Montrer les **statistiques résumées** (requêtes, utilisateurs, latence, citations)
3. **Rechercher** un mot-clé dans le champ de recherche
4. Cliquer sur une entrée → voir la réponse complète et les sources
5. Cliquer sur **"Exporter CSV"** → montrer le téléchargement

> 💡 **Message clé** : toutes les interactions IA sont journalisées. C'est une exigence RGPD et conformité.

---

## 🎤 Questions Fréquentes des Encadrants

**Q : Quel est le modèle IA utilisé ?**
> Claude 3 Haiku (Amazon Bedrock) pour la génération, Amazon Titan Embeddings V2 pour les vecteurs.

**Q : Les documents quittent-ils l'entreprise ?**
> Non. Amazon Bedrock garantit que vos données ne sont jamais utilisées pour entraîner des modèles tiers.

**Q : Combien ça coûte ?**
> Pour 500 documents et 2000 requêtes/mois, on estime **~45$/mois** (OpenSearch Serverless ≈ 30$ + Bedrock ≈ 15$).

**Q : Comment passer de la démo au prod ?**
> Passer `DEMO_MODE=false`, renseigner les endpoints AWS dans `.env`, déployer l'infra Terraform, configurer Cognito.

---

## 📊 Résumé des Technologies Utilisées

| Couche | Technologie |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Framer Motion |
| Backend API | Node.js 20, Express, TypeScript |
| IA Générative | Amazon Bedrock — Claude 3 Haiku |
| Embeddings | Amazon Bedrock — Titan Embeddings V2 |
| Recherche vectorielle | Amazon OpenSearch Serverless (kNN) |
| Stockage fichiers | Amazon S3 |
| Auth | Amazon Cognito (simulé en démo) |
| Infrastructure | AWS CDK / Terraform |
