#!/bin/bash
# Script de lancement local pour RAG Bedrock OpenSearch

echo "================================================="
echo "Démarrage du projet RAG Bedrock OpenSearch (Mock)"
echo "================================================="

# Variables d'environnement pour s'assurer qu'on est en mock
export MODE=mock
export PYTHONPATH="$(pwd)/backend:$PYTHONPATH"

# 1. Vérification des dépendances Backend
echo "-> Démarrage du Backend (FastAPI)..."
cd backend || exit 1
# Si uvicorn n'est pas dans le PATH, on utilise python -m
python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# 2. Vérification et Démarrage du Frontend
echo "-> Démarrage du Frontend (Vite)..."
cd frontend || exit 1
npm run dev -- --port 5173 &
FRONTEND_PID=$!
cd ..

echo "================================================="
echo "✅ Système prêt !"
echo "🌐 Frontend : http://localhost:5173"
echo "🔌 API Backend : http://localhost:8000"
echo "Appuyez sur CTRL+C pour tout arrêter."
echo "================================================="

# Fonction pour tuer les processus enfants lors de l'arrêt
cleanup() {
    echo "Arrêt des serveurs..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit 0
}

trap cleanup SIGINT SIGTERM

# Attendre infiniment
wait $BACKEND_PID $FRONTEND_PID
