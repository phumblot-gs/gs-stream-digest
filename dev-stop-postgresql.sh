#!/bin/bash

# Script d'arrêt PostgreSQL pour le développement local
# Ce script arrête proprement PostgreSQL

echo "🔍 Vérification de PostgreSQL..."

# Vérifier si PostgreSQL est installé
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL n'est pas installé sur ce système"
    exit 1
fi

# Vérifier si PostgreSQL est en cours d'exécution
if brew services list | grep postgresql@16 | grep started > /dev/null 2>&1; then
    echo "🛑 Arrêt de PostgreSQL..."
    brew services stop postgresql@16

    # Attendre que PostgreSQL s'arrête
    sleep 2

    # Vérifier que PostgreSQL s'est bien arrêté
    if brew services list | grep postgresql@16 | grep stopped > /dev/null 2>&1; then
        echo "✅ PostgreSQL arrêté avec succès"
    else
        echo "⚠️  PostgreSQL pourrait ne pas s'être arrêté complètement"
        echo "   Vérifiez avec : brew services list"
    fi
else
    echo "ℹ️  PostgreSQL n'est pas en cours d'exécution"
fi

echo ""
echo "💡 Pour redémarrer PostgreSQL : ./dev-start-postgresql.sh"
