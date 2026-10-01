# Chapitre 4 : Réalisation et Présentation des Interfaces Utilisateur

Ce document rassemble la description détaillée et la structure de toutes les interfaces de l'application **MJ Studio RAG** (Retrieval-Augmented Generation), conçues pour figurer dans la partie **Réalisation** du rapport de stage de fin d'études (ENI Carthage / Smartovate).

Chaque interface est présentée avec son objectif, ses composants visuels, son rôle dans l'architecture et les interactions techniques sous-jacentes.

---

## 📋 Sommaire des Figures d'Interfaces

| Figure | Intitulé de l'interface | Acteurs concernés | Rôle principal |
|---|---|---|---|
| **Figure 4.1** | Page d'Accueil Publique (Landing Page) | Tous (Public) | Présentation de la plateforme RAG et accès connexion |
| **Figure 4.2** | Assistant de Chat RAG & Streaming SSE | Tous les utilisateurs connectés | Pose de questions, réponses streamées et citations |
| **Figure 4.3** | Visionneuse Interactive de Sources (`SourceViewerModal`) | Tous les utilisateurs connectés | Consultation du fichier original avec surbrillance et saut de page |
| **Figure 4.4** | Espace de Gestion Documentaire & Ingestion | Éditeur, Administrateur | Téléversement multi-format, création de dossiers et réindexation |
| **Figure 4.5** | Signalement de Lacune Documentaire (Ticket GAP) | Lecteur, Éditeur | Formulaire de signalement d'anomalie ou manque d'information |
| **Figure 4.6** | Espace de Traitement des Lacunes (Tickets GAP) | Éditeur, Administrateur | Gestion du cycle de vie des tickets et résolution |
| **Figure 4.7** | Journal d'Audit de Sécurité et Conformité | Auditeur, Administrateur | Traçabilité des évènements, tentatives d'intrusion et exports |
| **Figure 4.8** | Tableau de Bord Admin & Gestion des Rôles RBAC | Administrateur | Métriques RAG, répartition des formats et gestion des comptes |
| **Figure 4.9** | Profil Utilisateur & Configuration 2FA/TOTP | Tous les utilisateurs connectés | Enrôlement 2FA par QR Code et sécurité du compte |
| **Figure 4.10** | Connexion et Authentification à Double Facteur | Tous | Authentification JWT et validation du code TOTP |

---

## 🖥️ Description Détaillée des Interfaces

### Figure 4.1 — Page d'Accueil Publique (Landing Page)

![Figure 4.1 — Page d'Accueil Publique MJ Studio RAG](../frontend/public/app-preview.png)

- **Composant source** : `frontend/src/pages/LandingPage.tsx`
- **Objectif** : Présenter la plateforme d'intelligence documentaire d'entreprise aux utilisateurs et visiteurs, valorisant l'architecture RAG et l'expérience utilisateur moderne.
- **Éléments visuels clés** :
  - **Header de Navigation** : Logo MJ Studio, liens d'ancrage (*Fonctionnalités*, *Architecture*, *Sécurité*), commutateur de thème (Clair/Sombre) et bouton d'action `Se connecter`.
  - **Section Hero** : Titre principal *"Knowledge. Retrieved. Answered."*, sous-titre explicatif de la technologie RAG, et boutons d'accès direct au Chat et à la démonstration.
  - **Aperçu Visuel Interactif** : Capture d'écran dynamique de l'interface de conversation avec badges de citations.
  - **Grille des Fonctionnalités (Cards)** : 6 cartes présentant la Recherche Sémantique Hybride, la Visionneuse Multi-Format, le Contrôle RBAC à 4 Rôles, la Sécurité 2FA/TOTP, le Journal d'Audit Immuable et la Gestion des Signalements.
  - **Pied de page (Footer)** : Mentions institutionnelles (ENI Carthage & Smartovate), copyright et liens de documentation.

---

### Figure 4.2 — Assistant de Chat RAG & Streaming SSE

- **Composant source** : `frontend/src/pages/ChatPage.tsx`
- **Objectif** : Offrir une interface de dialogue intuitive en langage naturel permettant d'interroger la base documentaire interne et de recevoir des réponses synthétisées avec citations vérifiables.
- **Éléments visuels clés** :
  - **En-tête du Chat** : Indicateur d'état du service RAG, version du moteur (v1.2 Pro) et titre de la conversation courante.
  - **Zone de Dialogue Streamée** : Bulles de messages séparant l'utilisateur et l'assistant. Les réponses de l'assistant s'affichent mot à mot en temps réel via un flux **Server-Sent Events (SSE)**.
  - **Badges de Citations In-line `[1]`, `[2]`** : Badges cliquables intégrés dans le texte Markdown, permettant de surligner la source correspondante.
  - **Méta-données de Réponse** : Badge de latence en millisecondes (ex. `⚡ 340ms`) et badge `⚡ Cache` en cas de réponse instantanée puisée dans le cache de requêtes.
  - **Barre d'Actions sous chaque réponse** : Boutons *Copier le texte*, *Régénérer la réponse*, évaluation par *Pouce haut / Pouce bas*, et lien *Réponse incomplète ?* pour ouvrir le formulaire de signalement.
  - **Chips de Sources** : Liste horizontale au bas de la bulle assistant affichant les noms des documents sources retenus avec leur indice numérique.
  - **Tiroir Latéral d'Informations Source** : Panneau rétractable à droite affichant le nom du fichier, le numéro de page/section, la jauge de score de pertinence (%) et l'extrait exact retenu par le moteur RAG.

---

### Figure 4.3 — Visionneuse Interactive de Documents Sources (`SourceViewerModal`)

- **Composants sources** : `frontend/src/components/SourceViewerModal.tsx` & `DocumentViewerModal.tsx`
- **Objectif** : Remplacer l'affichage d'un texte brut par un aperçu professionnel et interactif du document source original directement au sein de l'application, en garantissant la confidentialité via des URLs signées Supabase.
- **Éléments visuels clés** :
  - **En-tête de la Modal** : Icône et badge de couleur selon le format du fichier (Rouge pour PDF, Vert pour Excel, Bleu pour Word, Violet pour Markdown/TXT), nom du fichier, taille en Mo et bouton `Télécharger l'original`.
  - **Bandeau de Passage Cité** : Bandeau violet/jaune en haut de la fenêtre rappelant l'extrait exact recherché dans le document.
  - **Module d'Affichage PDF (`react-pdf`)** :
    - Canvas de rendu de la page PDF.
    - Saut automatique à la page citée (prop `pageNumber`).
    - Barre de contrôle : boutons *Page Précédente / Suivante*, indicateur *Page X sur Y*, boutons de *Zoom (+ / - / Reset)*.
  - **Module d'Affichage Excel / CSV (`xlsx` & `papaparse`)** :
    - Sélecteur d'onglets pour naviguer entre les feuilles du classeur Excel.
    - Tableau HTML 2D avec en-têtes de colonnes (A, B, C...) et numéros de lignes (1, 2, 3...).
    - **Surbrillance dorée** de la ligne/cellule correspondant au passage cité avec défilement automatique en vue (`scrollIntoView`).
  - **Module d'Affichage Word DOCX (`mammoth`)** :
    - Rendu HTML du document Word avec préservation de la typographie.
    - Encadrement du passage cité par des balises de surbrillance `<mark>` et défilement automatique.
  - **Gestion de la Sécurité** : Écran d'erreur 403 en cas de tentative d'accès non autorisé par les règles RBAC, et message de mise en garde pour les fichiers > 25 Mo.

---

### Figure 4.4 — Espace de Gestion Documentaire & Ingestion (`DocumentsPage.tsx`)

- **Composant source** : `frontend/src/pages/DocumentsPage.tsx`
- **Objectif** : Permettre aux Éditeurs et Administrateurs d'alimenter la base de connaissances RAG par téléversement de fichiers et de structurer l'arborescence des documents.
- **Éléments visuels clés** :
  - **Zone de Téléversement Drag & Drop** : Zone réceptive pour le glisser-déposer de fichiers multi-formats (PDF, DOCX, XLSX, TXT, MD, CSV) avec limite fixée à 20 Mo.
  - **Barre de Progression d'Upload en Temps Réel** : Indicateur de pourcentage et jauge visuelle lors du transfert du fichier vers le serveur.
  - **Bouton de Création de Dossier** : Fenêtre modale permettant d'organiser les documents par répertoires.
  - **Tableau des Documents Ingestés** :
    - Colonnes : *Nom du document*, *Taille*, *Format*, *Auteur (Email)*, *Date d'ajout*, *Nombre de Chunks*, *Statut*.
    - **Badges de Statut Dynamiques** : `Pending` (en attente), `Extracting` (extraction du texte / OCR), `Chunking` (découpage), `Vectorizing` (vectorisation), `Indexed` (indexé avec succès), `Failed` (échec).
  - **Menu d'Actions Documentaires** : Options par document pour *Réindexer* (déclencher une nouvelle vectorisation), *Renommer*, *Déplacer* ou *Supprimer*.

---

### Figure 4.5 — Signalement de Lacune Documentaire (`KnowledgeGapModal.tsx`)

- **Composant source** : `frontend/src/components/KnowledgeGapModal.tsx` & `GapNotificationBanner.tsx`
- **Objectif** : Permettre à tout utilisateur d'avertir l'équipe éditoriale lorsqu'une réponse RAG est incomplète, obsolète ou absente de la base documentaire.
- **Éléments visuels clés** :
  - **Bannière Automatique de Détection** (`GapNotificationBanner`) : Bannière d'avertissement orange apparaissant sous une réponse du chat si l'assistant exprime une absence d'information ou si le score de pertinence est inférieur à 0.35.
  - **Formulaire Modal de Signalement (Ticket GAP)** :
    - **Numéro de ticket généré** (ex. `GAP-20260928-A4F2`).
    - **Sélecteur de Type d'Anomalie** : *Information absente*, *Réponse incorrecte*, *Document obsolète*, *Réponse imprécise*, *Mauvais document cité*.
    - **Sélecteur de Priorité** : *Basse*, *Normale*, *Haute*, *Bloquante*.
    - **Rappel du Contexte** : Question posée par l'utilisateur et réponse générée par l'assistant pré-remplies.
    - **Champs de Saisie Utilisateur** : Zone de commentaire explicatif et champ optionnel pour la *réponse attendue*.
    - **Case à cocher** : *"Être notifié par l'application dès la résolution de cette lacune"*.

---

### Figure 4.6 — Espace de Traitement des Lacunes Documentaires (`GapManagementPage.tsx`)

- **Composant source** : `frontend/src/pages/GapManagementPage.tsx`
- **Objectif** : Offrir aux Éditeurs et Administrateurs une interface de gestion de tickets de type Helpdesk pour traiter les lacunes documentaires et enrichir la base de connaissances.
- **Éléments visuels clés** :
  - **Barre de Filtres et Recherche** : Filtrage par statut (*Nouveau*, *En cours*, *Résolu*, *Rejeté*, *Doublon*), par priorité et champ de recherche textuelle.
  - **Tableau Central des Signalements** :
    - Colonnes : *Ticket*, *Date*, *Demandeur*, *Type d'anomalie*, *Priorité*, *Statut*, *Éditeur assigné*, *Actions*.
    - Badges de couleur par priorité (Rouge pour Bloquante, Orange pour Haute, Bleu pour Normale).
  - **Tiroir Détaillé du Ticket** :
    - Affichage de la question initiale, de la réponse contestée et des sources qui avaient été consultées.
    - **Menu de Changement de Statut** : Passage du ticket de `Nouveau` à `En cours` puis `Résolu` ou `Rejeté`.
    - **Sélection de l'Éditeur Assigné** : Attribution du ticket à un membre de l'équipe.
    - **Zone de Discussion Interne (`GapComment`)** : Fil de commentaires entre éditeurs pour analyser le problème.
    - **Champ de Note de Résolution** : Rédaction de la note explicative transmise à l'utilisateur lors de la clôture du ticket.

---

### Figure 4.7 — Journal d'Audit de Sécurité et de Conformité (`AuditPage.tsx`)

- **Composant source** : `frontend/src/pages/AuditPage.tsx`
- **Objectif** : Fournir aux Auditeurs et Administrateurs une vue traçable et immuable de l'ensemble des évènements de sécurité et des accès aux documents.
- **Éléments visuels clés** :
  - **Barre de Contrôle d'Audit** : Filtre par sévérité (*Info*, *Avertissement*, *Critique*), filtre par type d'évènement (*Connexion*, *Upload*, *Refus d'accès 403*, *Injection de Prompt bloquée*), filtre par utilisateur et plage de dates.
  - **Bouton d'Exportation CSV** : Export instantané du journal d'audit pour les rapports de conformité.
  - **Tableau des Évènements d'Audit** :
    - Colonnes : *Horodatage*, *Niveau de Sévérité*, *Type d'Évènement*, *Utilisateur (Email)*, *Adresse IP*, *Détails techniques*.
    - **Badges de Sévérité** : Rouge pour `CRITICAL` (tentative d'injection, accès refusé), Jaune pour `WARNING` (échec de connexion, suppression de document), Bleu pour `INFO` (connexion réussie, upload).
  - **Inspecteur de Métadonnées JSON** : Fenêtre modale affichant les détails JSON bruts de l'évènement sélectionné (ex. User-Agent, identifiant du document visé, raison du blocage).

---

### Figure 4.8 — Tableau de Bord Administrateur & Gestion des Rôles RBAC (`AdminPage.tsx`)

- **Composant source** : `frontend/src/pages/AdminPage.tsx`
- **Objectif** : Centraliser la supervision des performances du système RAG et l'administration des privilèges des utilisateurs.
- **Éléments visuels clés** :
  - **Cartes de Métriques clés (KPIs)** :
    - *Nombre total de documents indexés*
    - *Nombre total de chunks vectorisés*
    - *Latence moyenne des requêtes RAG (en ms)*
    - *Taux de résolution des lacunes documentaires (%)*
  - **Graphiques de Répartition et Statistique** :
    - Diagramme de répartition des documents par format (PDF, DOCX, XLSX, TXT).
    - Historigramme des volumes de requêtes par jour.
    - Classement des **Top Sources Documentaires** les plus souvent citées par le moteur RAG.
  - **Tableau de Gestion des Comptes Utilisateurs** :
    - Liste des utilisateurs avec nom, email, statut et date de création.
    - **Sélecteur de Rôle RBAC** : Menu déroulant dynamique permettant d'attribuer instantanément l'un des 4 rôles (`Administrateur`, `Éditeur`, `Auditeur`, `Lecteur`).
    - **Commutateur de Statut d'Activité** : Bouton Bascule (`Actif` / `Suspendu`) pour bloquer immédiatement l'accès d'un compte.
    - Bouton de suppression définitive de compte.

---

### Figure 4.9 — Profil Utilisateur & Configuration 2FA/TOTP (`ProfilePage.tsx`)

- **Composant source** : `frontend/src/pages/ProfilePage.tsx`
- **Objectif** : Permettre à chaque utilisateur de consulter ses informations personnelles et d'activer la double authentification par application Authenticator.
- **Éléments visuels clés** :
  - **Carte d'Identité Utilisateur** : Avatar, nom complet, adresse email et badge du rôle d'accès attribué par l'administrateur.
  - **Module de Double Authentification (2FA / TOTP)** :
    - Indicateur d'état du 2FA (*Activé* avec badge vert / *Désactivé* avec badge gris).
    - **Bouton d'Enrôlement 2FA** : Déclenche la génération du secret TOTP RFC 6238.
    - **Zone d'Affichage du QR Code** : Rendu du QR Code `otpauth://` scannable avec Google Authenticator, Authy ou Microsoft Authenticator.
    - **Champ de Saisie de Validation** : Saisie du code à 6 chiffres émis par l'application mobile pour finaliser l'activation.
    - Bouton de désactivation de la 2FA nécessitant la confirmation par un code valide.
  - **Zone d'Action Sensible (Danger Zone)** : Bouton de suppression de son propre compte avec suppression de ses données associées.

---

### Figure 4.10 — Connexion et Authentification à Double Facteur (`LoginPage.tsx`)

- **Composants sources** : `frontend/src/pages/LoginPage.tsx` & `RegisterPage.tsx`
- **Objectif** : Sécuriser l'accès à la plateforme RAG grâce à un formulaire d'authentification à deux étapes.
- **Éléments visuels clés** :
  - **Formulaire de Connexion Étape 1** : Saisie de l'adresse email et du mot de passe avec lien *Mot de passe oublié ?* et lien vers la page d'inscription.
  - **Étape 2 — Défi de Validation 2FA/TOTP** :
    - Écran intermédiaire s'affichant automatiquement lorsque le compte possède la double authentification activée.
    - Champ de saisie stylisé à 6 cases numériques pour entrer le code TOTP.
    - Minuteur d'expiration du jeton temporaire (5 minutes).
  - **Messages de Validation et d'Erreur** : Alerte visuelle en cas d'identifiants incorrects ou de code TOTP expiré/invalide.

---

## 📌 Conseils d'Intégration dans le Rapport de Stage

1. **Formatage** : Insérez chaque capture d'écran sous forme de figure centrée, suivie de sa légende officielle (ex. *Figure 4.2 : Interface de Chat RAG avec streaming SSE et citations in-line*).
2. **Renvoi dans le texte** : Dans la rédaction du Chapitre 4, faites explicitement référence aux numéros de figures (ex. *"Comme l'illustre la Figure 4.3, la visionneuse interactive s'adapte au format du fichier..."*).
3. **Mise en valeur de l'expérience utilisateur** : Insistez sur la fluidité visuelle (Thème clair/sombre, animations Framer Motion, micro-interactions) et la rigueur de la sécurité (URLs signées Supabase, contrôle RBAC à 4 niveaux et 2FA TOTP).
