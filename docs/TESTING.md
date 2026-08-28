# Guide de Test Complet — SmartDocs

> Ce document liste toutes les étapes pour tester l'intégralité du projet SmartDocs.
> Avant de commencer, assurez-vous que les deux serveurs sont démarrés.

---

## ⚙️ Démarrage des serveurs

Ouvrez **deux terminaux** séparés et lancez :

```bash
# Terminal 1 — Backend (port 3001)
cd backend
npm run dev
# ✅ Attendu : "Serveur Mock démarré sur http://localhost:3001"

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
# ✅ Attendu : "VITE ready in ... ms  ➜  Local: http://localhost:5173/"
```

Ouvrez ensuite **[http://localhost:5173](http://localhost:5173)** dans votre navigateur.

---

## 🧑‍💻 Comptes de démonstration disponibles

| Email | Rôle | Pages accessibles |
|---|---|---|
| `admin@smartdocs.ai` | Administrateur | Chat, Documents, Dashboard, Audit, Profil |
| `editor@smartdocs.ai` | Éditeur | Chat, Documents, Profil |
| `reader@smartdocs.ai` | Lecteur | Chat, Profil |

> Le mot de passe est **facultatif** en mode démonstration.

---

## TEST 1 — Page d'accueil publique (`/`)

**URL :** `http://localhost:5173/`

| # | Action | Résultat attendu |
|---|---|---|
| 1 | Ouvrir la page sans être connecté | Affichage de la landing page avec le héro "Knowledge. Retrieved. Answered." |
| 2 | Cliquer sur les liens de navigation (Produit, Fonctionnalités…) | Défilement fluide vers la section correspondante |
| 3 | Cliquer sur l'icône 🌙/☀️ en haut à droite | Bascule entre thème clair et sombre |
| 4 | Cliquer sur "Démarrer maintenant" | Redirection vers `/login` |
| 5 | Cliquer sur "Se connecter" | Redirection vers `/login` |
| 6 | Faire défiler jusqu'en bas | Affichage du schéma d'architecture AWS + FAQ + Footer |
| 7 | Cliquer sur une question de la FAQ | La réponse s'affiche par accordéon |

---

## TEST 2 — Authentification (`/login`)

**URL :** `http://localhost:5173/login`

| # | Action | Résultat attendu |
|---|---|---|
| 1 | Cliquer sur le bouton "Administrateur" | L'email `admin@smartdocs.ai` se remplit automatiquement |
| 2 | Cliquer sur "Se connecter" | Redirection vers `/chat`, menu complet affiché |
| 3 | Cliquer sur nom utilisateur (bas du menu) → Profil | Page `/profile` s'ouvre |
| 4 | Se déconnecter depuis le profil | Redirection vers `/login` |
| 5 | Se connecter en tant qu'**Éditeur** | Menu : Chat + Documents uniquement |
| 6 | Se connecter en tant que **Lecteur** | Menu : Chat uniquement |
| 7 | Tenter d'accéder à `/admin` en étant Lecteur | Redirection automatique vers `/chat` |
| 8 | Accéder à `/chat` sans être connecté | Redirection vers `/login` |

---

## TEST 3 — Chat RAG (`/chat`)

**URL :** `http://localhost:5173/chat` *(connecté en admin)*

| # | Action | Résultat attendu |
|---|---|---|
| 1 | Cliquer sur une des 4 suggestions affichées | La question se place dans le champ de saisie |
| 2 | Appuyer sur `Entrée` ou cliquer ➤ | Animation "Recherche dans les documents et génération…" puis réponse en streaming |
| 3 | Observer la réponse | Texte Markdown formaté (gras, listes) avec des boutons `[1]` `[2]` |
| 4 | Cliquer sur le bouton `[1]` dans le texte | Panneau latéral droit s'ouvre avec : nom du document, barre de pertinence, extrait de texte |
| 5 | Cliquer sur un tag de source sous la réponse | Même panneau source s'ouvre |
| 6 | Cliquer sur ✕ du panneau source | Le panneau se referme |
| 7 | Survoler la réponse → cliquer "Copier" | Message "Copié ✓" en vert pendant 2 secondes |
| 8 | Poser une nouvelle question, puis cliquer "Arrêter la génération" | Le streaming s'arrête immédiatement |
| 9 | Taper `Quel est le PIB de la France ?` | Réponse : "Je ne dispose pas d'informations suffisantes…" |
| 10 | Cliquer "+ Nouveau Chat" | Conversation vide, suggestions réaffichées |
| 11 | Survoler une conversation → icône ✏️ → nouveau nom → `Entrée` | Conversation renommée |
| 12 | Icône 🗑 sur une conversation | Conversation supprimée |
| 13 | Recharger la page (`F5`) | Les conversations sont restaurées depuis `localStorage` |

---

## TEST 4 — Gestionnaire de Documents (`/documents`)

**URL :** `http://localhost:5173/documents` *(Admin ou Éditeur)*

| # | Action | Résultat attendu |
|---|---|---|
| 1 | Observer la liste | Documents de démo pré-chargés, dossiers en premier |
| 2 | Cliquer "+ Dossier" → saisir "RH 2026" | Le dossier apparaît dans la liste |
| 3 | Double-cliquer sur le dossier "RH 2026" | Fil d'Ariane : `Racine > RH 2026`, liste vide |
| 4 | Glisser un fichier `.txt` ou `.md` dans la zone de dépôt | Statut **Indexé** en quelques secondes |
| 5 | Cliquer "Parcourir" → sélectionner un fichier PDF | Upload → statut **Indexé** |
| 6 | Essayer d'uploader un `.exe` | Message d'erreur "type non supporté" |
| 7 | Cliquer sur "Racine" dans le fil d'Ariane | Retour à la racine |
| 8 | Taper un mot dans la barre de recherche | Filtrage dans **tous les dossiers** |
| 9 | Survoler un document → icône ✏️ | Renommage en ligne |
| 10 | Survoler un document → icône flèches ↔ | Modal de déplacement → choisir un dossier |
| 11 | Survoler un document → icône 🗑 → Confirmer | Document supprimé |
| 12 | Supprimer le dossier "RH 2026" avec des fichiers dedans | Tout le contenu est supprimé récursivement |
| 13 | Cliquer sur l'icône 🔄 d'un document | Réindexation déclenchée |

---

## TEST 5 — Tableau de Bord Administrateur (`/admin`)

**URL :** `http://localhost:5173/admin` *(Admin uniquement)*

| # | Action | Résultat attendu |
|---|---|---|
| 1 | Observer les 4 cartes KPI | Documents indexés, Requêtes/30j, Latence (ms), Coût estimé ($) |
| 2 | Survoler les barres du graphique | Tooltip avec la date et le nombre de requêtes |
| 3 | Observer "État des services" | Backend ✅ — OpenSearch/Bedrock/Cognito ⚠️ (Mode Mock) |
| 4 | Observer le tableau "Dernières requêtes" | Questions posées dans le chat apparaissent ici |
| 5 | Cliquer "Actualiser" | Timestamp mis à jour, données rechargées |
| 6 | Poser 3 questions dans le Chat, revenir ici | Les 3 nouvelles requêtes apparaissent dans le tableau |

---

## TEST 6 — Journal d'Audit (`/audit`)

**URL :** `http://localhost:5173/audit` *(Admin uniquement)*

| # | Action | Résultat attendu |
|---|---|---|
| 1 | Observer les 4 statistiques résumées | Total requêtes, utilisateurs actifs, latence moy., citations totales |
| 2 | Taper un mot dans "Rechercher dans les questions" | Liste filtrée en temps réel |
| 3 | Utiliser le menu déroulant "Tous les utilisateurs" | Filtre par utilisateur |
| 4 | Cliquer sur une entrée de la liste | Accordéon s'ouvre : réponse complète + sources avec badges de score |
| 5 | Vérifier les badges de score | Vert (≥70%), Amber (40-69%), Gris (<40%) |
| 6 | Cliquer "Exporter CSV" | Téléchargement de `audit_smartdocs_YYYY-MM-DD.csv` |
| 7 | Ouvrir le CSV dans Excel/LibreOffice | Colonnes : ID, Question, Utilisateur, Latence, Sources, Date |

---

## TEST 7 — Page de Profil (`/profile`)

**URL :** `http://localhost:5173/profile`

| # | Action | Résultat attendu |
|---|---|---|
| 1 | Observer l'avatar, le nom et le badge de rôle | Données du compte connecté |
| 2 | Modifier le champ "Nom d'affichage" → Sauvegarder | Le nom change dans la sidebar immédiatement |
| 3 | Cliquer "Sombre" dans la section Apparence | Thème sombre appliqué immédiatement |
| 4 | Cliquer "Clair" | Thème clair appliqué |
| 5 | Recharger la page | Le thème choisi est conservé |
| 6 | Cliquer "Supprimer mon compte" | Formulaire de confirmation apparaît |
| 7 | Saisir un mauvais email → cliquer "Confirmer" | Le bouton reste désactivé |
| 8 | Saisir l'email exact → "Confirmer" | Déconnexion automatique + redirection `/login` |

---

## TEST 8 — API Backend directe

Testez les endpoints depuis le navigateur ou avec **Postman** :

```bash
# Liste des documents
GET  http://localhost:3001/documents

# Statistiques globales
GET  http://localhost:3001/stats

# Historique des requêtes
GET  http://localhost:3001/history

# Requête RAG (POST avec body JSON)
POST http://localhost:3001/query
Content-Type: application/json
Body: {"question": "quelle est la politique RH ?", "top_k": 5}

# Créer un dossier
POST http://localhost:3001/documents/folders
Content-Type: application/json
Body: {"name": "Mon Dossier", "parent_id": null}
```

---

## TEST 9 — Sécurité RBAC

Connectez-vous avec différents rôles et testez les URLs protégées :

| URL | Admin | Éditeur | Lecteur | Non connecté |
|---|---|---|---|---|
| `/` | ✅ Accessible | ✅ | ✅ | ✅ |
| `/chat` | ✅ | ✅ | ✅ | 🔒 → `/login` |
| `/documents` | ✅ | ✅ | 🔒 → `/chat` | 🔒 → `/login` |
| `/admin` | ✅ | 🔒 → `/chat` | 🔒 → `/chat` | 🔒 → `/login` |
| `/audit` | ✅ | 🔒 → `/chat` | 🔒 → `/chat` | 🔒 → `/login` |
| `/profile` | ✅ | ✅ | ✅ | 🔒 → `/login` |

---

## TEST 10 — Persistance des données

| # | Action | Résultat attendu |
|---|---|---|
| 1 | Uploader un document, **redémarrer le backend** | Document toujours présent (fichier `backend/data/documents.json`) |
| 2 | Poser des questions, **redémarrer le backend** | Historique conservé dans `backend/data/queries.json` |
| 3 | Renommer une conversation, **recharger la page** | Titre conservé (stocké dans `localStorage`) |
| 4 | Changer le thème, **fermer et rouvrir le navigateur** | Thème préféré conservé |

---

## 🐛 Résolution de problèmes courants

| Problème | Solution |
|---|---|
| Port 3001 déjà utilisé | `netstat -ano \| findstr :3001` puis `taskkill /PID <ID> /F` |
| Port 5173 déjà utilisé | Idem avec le port 5173 |
| Le frontend ne charge pas les documents | Vérifier que le backend est démarré sur le port 3001 |
| Erreur TypeScript à la compilation | `cd frontend && npm install` |
| "Erreur HTTP 500" dans le chat | Redémarrer le backend |

---

## 📁 Fichiers importants à connaître

| Fichier | Rôle |
|---|---|
| `backend/data/documents.json` | Base de données locale des documents |
| `backend/data/queries.json` | Historique des requêtes (audit) |
| `backend/data/chunks.json` | Vecteurs d'embeddings |
| `backend/.env` | Configuration backend (`DEMO_MODE`, `PORT`…) |
| `frontend/.env.local` | URL de l'API (`VITE_API_BASE_URL`) |
| `docs/DEMO.md` | Script de démonstration pour encadrant |

---

*Guide de test — SmartDocs RAG Platform · Projet de stage 2026*
