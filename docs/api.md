# Contrats d'API REST

## Endpoint Principal : `/query` (POST)
- **Rôle :** Poser une question et obtenir une réponse RAG streamée (SSE).
- **Body :**
  ```json
  {
    "question": "Comment fonctionnent les congés payés ?",
    "top_k": 5
  }
  ```
- **Réponse :** Flux `text/event-stream`. Chaque message contient un champ JSON. Le dernier message contient `done: true` et les sources utilisées.

## Gestion Documentaire
- `GET /documents` : Liste tous les documents ingérés.
- `POST /documents/upload-url` : Obtient une URL pré-signée (S3 ou locale) pour téléverser un fichier.
- `DELETE /documents/:id` : Supprime un document de la base.
- `POST /documents/:id/reindex` : Relance l'indexation d'un document.

## Statistiques
- `GET /stats` : Renvoie les agrégats de la base (nombre de documents, chunks, requêtes sur 30 jours, latence moyenne).
