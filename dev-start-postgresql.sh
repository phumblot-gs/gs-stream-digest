#!/bin/bash

# Script de démarrage PostgreSQL pour le développement local
# Ce script vérifie et démarre PostgreSQL si nécessaire

echo "🔍 Vérification de PostgreSQL..."

# Vérifier si PostgreSQL est installé
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL n'est pas installé"
    echo ""
    echo "Pour installer PostgreSQL sur macOS :"
    echo "  brew install postgresql@16"
    echo ""
    echo "Consultez docs/SETUP_POSTGRESQL.md pour plus d'informations"
    exit 1
fi

# Vérifier si PostgreSQL est déjà en cours d'exécution
if brew services list | grep postgresql@16 | grep started > /dev/null 2>&1; then
    echo "✅ PostgreSQL est déjà en cours d'exécution"
else
    echo "🚀 Démarrage de PostgreSQL..."
    brew services start postgresql@16

    # Attendre que PostgreSQL soit prêt
    echo "⏳ Attente du démarrage de PostgreSQL..."
    sleep 2

    # Vérifier que PostgreSQL a bien démarré
    if brew services list | grep postgresql@16 | grep started > /dev/null 2>&1; then
        echo "✅ PostgreSQL démarré avec succès"
    else
        echo "❌ Échec du démarrage de PostgreSQL"
        exit 1
    fi
fi

# Vérifier si la base de données existe
echo "🔍 Vérification de la base de données gs_stream_digest..."
if psql -lqt | cut -d \| -f 1 | grep -qw gs_stream_digest; then
    echo "✅ La base de données gs_stream_digest existe"
else
    echo "📊 Création de la base de données gs_stream_digest..."
    createdb gs_stream_digest

    if [ $? -eq 0 ]; then
        echo "✅ Base de données créée avec succès"
        echo "💡 N'oubliez pas d'exécuter les migrations : npm run db:migrate:pg"
    else
        echo "❌ Échec de la création de la base de données"
        exit 1
    fi
fi

echo ""
echo "✅ PostgreSQL est prêt pour le développement"
echo ""
echo "📍 Informations de connexion :"
echo "   Host:     localhost"
echo "   Port:     5432"
echo "   Database: gs_stream_digest"
echo "   User:     postgres (par défaut)"
echo ""
echo "💡 Prochaines étapes :"
echo "   1. Assurez-vous que DATABASE_URL est défini dans .env.local"
echo "   2. Exécutez les migrations : npm run db:migrate:pg"
echo "   3. Lancez l'application : npm run dev:backend && npm run dev:frontend"
echo ""
echo "Pour arrêter PostgreSQL : ./dev-stop-postgresql.sh"
