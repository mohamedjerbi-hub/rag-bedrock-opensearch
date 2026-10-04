# Legacy — Dockerfile Docker (archive)

## Contexte

Ce `Dockerfile` a été rédigé lors d'une phase initiale du projet où un
déploiement containerisé (Docker) était envisagé pour l'hébergement de
l'API Express sur Railway.

## Pourquoi il n'est pas utilisé en production

Après évaluation, **le build automatique Nixpacks de Railway** a été
retenu à la place. Les raisons principales :

- **Zéro configuration** : Nixpacks détecte automatiquement le runtime
  Node.js et les dépendances à partir de `package.json`.
- **Cohérence** : les fichiers `railway.json` et `railway.toml` dans
  `backend/` déclarent explicitement `"builder": "NIXPACKS"` — le
  Dockerfile n'est donc jamais invoqué par Railway.
- **Maintenance réduite** : pas de Dockerfile à maintenir en parallèle
  de l'évolution des dépendances Node.js.

## Statut actuel du déploiement (Railway)

| Paramètre | Valeur |
|---|---|
| Builder | `NIXPACKS` |
| Commande de build | `npm install --legacy-peer-deps && npm run build` |
| Commande de démarrage | `npm start` |
| Healthcheck | `GET /health` (timeout 120 s) |
| Config | `backend/railway.json` et `backend/railway.toml` |

## Ce fichier

`legacy/Dockerfile` est conservé **uniquement à titre d'archive et de
traçabilité**. Il ne fait partie d'aucun pipeline CI/CD actif et ne
doit pas être utilisé pour un déploiement en production sans révision
préalable.
