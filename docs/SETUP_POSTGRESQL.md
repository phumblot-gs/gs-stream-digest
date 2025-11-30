# Configuration PostgreSQL pour le développement local

Ce guide explique comment configurer PostgreSQL en local pour avoir un environnement identique à la production.

## Installation de PostgreSQL sur macOS

### Option 1: Avec Homebrew (recommandé)
```bash
# Installer PostgreSQL
brew install postgresql@16

# Démarrer PostgreSQL
brew services start postgresql@16

# Créer la base de données
createdb gs_stream_digest
```

### Option 2: Avec Postgres.app
1. Télécharger [Postgres.app](https://postgresapp.com/)
2. L'installer et le lancer
3. Créer la base de données via l'interface ou en ligne de commande

## Configuration de l'application

### 1. Créer votre fichier .env.local
```bash
cp .env.local.example .env.local
```

### 2. Pour utiliser PostgreSQL (comme en production)
Modifiez votre `.env.local` :
```env
# Décommentez cette ligne pour PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/gs_stream_digest

# Les autres variables restent identiques
NEXT_PUBLIC_SUPABASE_URL=https://m1-api.grand-shooting.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Pour continuer avec SQLite (plus simple pour commencer)
Ne définissez pas DATABASE_URL dans votre `.env.local`, l'application utilisera SQLite automatiquement.

## Initialiser la base de données

### Pour PostgreSQL
```bash
# Installer les dépendances
npm install

# Exécuter les migrations
npm run db:migrate:pg

# (Optionnel) Seed avec des données de test
npm run db:seed
```

### Pour SQLite
```bash
# Les migrations SQLite s'exécutent automatiquement au démarrage
npm run dev
```

## Lancer l'application

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

## Avantages de PostgreSQL en local

✅ **Même comportement qu'en production** : Évite les surprises lors du déploiement
✅ **Types de données identiques** : Les timestamps, JSON, etc. fonctionnent pareil
✅ **Requêtes SQL identiques** : Pas de différences de syntaxe
✅ **Meilleure performance** : Pour les gros volumes de données

## Recommandation

Pour le développement initial, SQLite est plus simple. Mais dès que vous travaillez sur des fonctionnalités critiques, passez à PostgreSQL pour éviter les problèmes de compatibilité.

## Troubleshooting

### Erreur de connexion PostgreSQL
```bash
# Vérifier que PostgreSQL est lancé
brew services list | grep postgresql

# Relancer si nécessaire
brew services restart postgresql@16
```

### Reset de la base de données
```bash
# PostgreSQL
dropdb gs_stream_digest
createdb gs_stream_digest
npm run db:migrate:pg

# SQLite
rm -rf data/digest.db
npm run dev
```