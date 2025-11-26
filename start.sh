#!/bin/bash

# Script de démarrage pour GS Stream Digest
echo "🚀 Démarrage de GS Stream Digest..."

# Vérifier que les dépendances sont installées
if [ ! -d "node_modules" ]; then
  echo "📦 Installation des dépendances..."
  npm install
fi

# Vérifier que la base de données existe
if [ ! -f "apps/backend/data/digest-dev.db" ] && [ ! -f "apps/backend/data/digest.db" ]; then
  echo "🗄️  Création de la base de données..."
  npm run db:migrate
fi

# Définir le chemin de la base de données pour le backend
export DATABASE_PATH="./apps/backend/data/digest.db"

# Démarrer le backend dans un terminal
echo "🔧 Démarrage du backend (port 3000)..."
osascript -e 'tell app "Terminal" to do script "cd '$(pwd)' && export DATABASE_PATH=./apps/backend/data/digest.db && npm run dev --workspace=@gs-digest/backend"'

# Attendre que le backend démarre
sleep 3

# Démarrer le frontend dans un autre terminal
echo "🎨 Démarrage du frontend (port 3001)..."
osascript -e 'tell app "Terminal" to do script "cd '$(pwd)' && npm run dev --workspace=@gs-digest/frontend"'

echo ""
echo "✅ GS Stream Digest est en cours d'exécution !"
echo ""
echo "📍 URLs:"
echo "   Frontend:      http://localhost:3001"
echo "   Backend API:   http://localhost:3000"
echo "   Swagger Docs:  http://localhost:3000/documentation"
echo ""
echo "Pour arrêter les services, fermez les fenêtres Terminal ou utilisez Ctrl+C"