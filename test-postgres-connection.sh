#!/bin/sh
# Script de test de connexion PostgreSQL

echo "🔍 Test de connexion PostgreSQL..."
echo ""

# Afficher les variables d'environnement (masquer le mot de passe)
echo "DATABASE_URL (masqué):"
echo "$DATABASE_URL" | sed 's/:[^:@]*@/:***@/g'
echo ""

# Test de connectivité réseau
echo "📡 Test de connectivité réseau..."
if nc -zv pgbouncer.kyzl60xwk9xrpj9g.svc 5432 2>&1; then
    echo "✅ Port 5432 accessible"
else
    echo "❌ Port 5432 non accessible"
fi
echo ""

# Test avec psql si disponible
if command -v psql >/dev/null 2>&1; then
    echo "📊 Test avec psql..."
    PGPASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    
    export PGPASSWORD
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 as test;" 2>&1; then
        echo "✅ Connexion PostgreSQL réussie avec psql!"
    else
        echo "❌ Échec de la connexion avec psql"
    fi
else
    echo "⚠️  psql non disponible, test avec Node.js..."
fi
echo ""

# Test avec Node.js
echo "📊 Test avec Node.js (pg)..."
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000
});

console.log('Tentative de connexion...');
pool.query('SELECT 1 as test, current_database() as db, current_user as user')
  .then(result => {
    console.log('✅ Connexion PostgreSQL réussie!');
    console.log('Résultat:', JSON.stringify(result.rows, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erreur de connexion:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Detail:', error.detail);
    process.exit(1);
  });
"

