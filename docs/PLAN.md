# Plan d'exécution SmartDocs

Ce document détaille la marche à suivre pour transformer le dépôt actuel en une application professionnelle complète (baseline: *Knowledge. Retrieved. Answered.*), respectant la charte graphique et fonctionnant en mode démo.

## Lot 1 : Fondation Design & Page d'accueil publique
**Objectifs :** Mettre en place la charte graphique SmartDocs, les tokens de design (thème clair/sombre), et créer la landing page vitrine.
**Tâches :**
- [ ] Centraliser les tokens de couleur dans `tailwind.config.js` et `index.css` (Fond profond #000716, Accent or #D4A96B, etc.).
- [ ] Configurer la typographie (Inter/Manrope).
- [ ] Implémenter le basculement Clair/Sombre persistant.
- [ ] Restructurer le routeur frontend (`App.tsx`) pour avoir des routes publiques (Landing) et privées (App).
- [ ] Développer la landing page (`/`) : En-tête, Hero avec boutons, "Comment ça marche", Fonctionnalités, Architecture technique, Chiffres et FAQ.
- [ ] Intégrer les métadonnées SEO et le footer.
**Critère de fin :** Un visiteur non connecté accède à une page d'accueil magnifique, responsive, respectant la charte or/sombre, avec bascule de thème.

## Lot 2 : Système d'Authentification (Mock / Cognito)
**Objectifs :** Refondre l'authentification pour supporter `DEMO_MODE=true` (mock) tout en préparant la structure pour Cognito.
**Tâches :**
- [ ] Mettre à jour `AuthProvider` pour interagir avec une interface abstraite d'auth.
- [ ] Refaire la page de connexion (`LoginPage`) aux couleurs de la marque.
- [ ] Créer la page de profil utilisateur (changement de thème, langue, suppression de compte).
- [ ] Mettre en place les guards de rôles stricts (Admin, Editeur, Lecteur).
**Critère de fin :** Connexion, déconnexion et accès restreints (selon le rôle) fonctionnels et conformes au design premium.

## Lot 3 : Espace Documentaire & Arborescence
**Objectifs :** Transformer la liste plate des documents en un véritable gestionnaire de fichiers avec dossiers.
**Tâches :**
- [ ] Côté API Mock : Gérer la notion de dossiers (ID parent, type "folder" vs "file").
- [ ] Côté Frontend : Implémenter la navigation par dossiers (fil d'Ariane, double-clic pour ouvrir).
- [ ] Implémenter la création, le renommage et la suppression (corbeille) de dossiers.
- [ ] Affiner l'upload (glisser-déposer multi-fichiers) pour qu'il cible le dossier courant.
- [ ] Ajouter les filtres (texte, auteur) et le tri.
**Critère de fin :** L'utilisateur peut créer un dossier "RH", y entrer, et y téléverser un fichier. Le tout est reflété dans l'UI.

## Lot 4 : Moteur de Chat RAG
**Objectifs :** Améliorer l'expérience de chat avec citations, historique et périmètre.
**Tâches :**
- [ ] Mettre à jour l'UI du Chat (`ChatPage`) pour atteindre un niveau premium (bulles propres, icônes, bouton copier).
- [ ] Gérer l'historique des conversations dans le panneau latéral (Mock API).
- [ ] Implémenter le filtre de périmètre ("Rechercher dans : Dossier RH").
- [ ] Gérer l'affichage précis des citations cliquables (ouverture d'un panneau latéral avec l'extrait du document).
- [ ] Implémenter la réponse stricte hors-périmètre ("Je n'ai pas trouvé cette information...").
**Critère de fin :** L'utilisateur peut discuter, voir ses anciennes conversations, et cliquer sur une citation numérotée pour lire la source.

## Lot 5 : Administration, Tableau de Bord & Sécurité
**Objectifs :** Finaliser les vues transverses et la robustesse backend.
**Tâches :**
- [ ] Refondre le Tableau de bord (`AdminPage`) avec de vrais graphiques (recharts ou framer-motion) pour les stats et coûts.
- [ ] Créer la vue de gestion des utilisateurs et rôles.
- [ ] Implémenter le journal d'audit (`AuditPage`).
- [ ] Ajouter la validation Zod sur toutes les routes du backend (mock et handlers réels).
- [ ] Ajouter les pages 404, erreur, toast notifications globales.
**Critère de fin :** L'admin voit les statistiques simulées correctement et peut auditer les actions. Les requêtes invalides sont rejetées proprement.

## Lot 6 : Infrastructure, Déploiement et Documentation
**Objectifs :** S'assurer que le dépôt est prêt à être démontré et déployé sur AWS.
**Tâches :**
- [ ] Mettre à jour les handlers Lambda (`ingest.ts`, `query.ts`) avec les bonnes pratiques (validation).
- [ ] Alimenter les jeux de données `sample_docs` (12 documents, 4 dossiers) pour que le `DEMO_MODE=true` soit crédible.
- [ ] Finaliser la documentation : `API.md`, `ENV.md`, `ACCES_A_DEMANDER.md`, `DEMO.md`, `ARCHITECTURE.md`.
- [ ] Vérifier que `npm run dev` lance tout instantanément en mode démo.
**Critère de fin :** Le projet est démontrable de bout en bout en local sans AWS. La documentation est complète pour le passage en prod.
