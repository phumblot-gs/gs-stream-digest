# Guide de déploiement

Ce document décrit comment configurer et déployer l'application GS Stream Digest sur Fly.io.

## Architecture de déploiement

- **Staging** : Déployé automatiquement sur `gs-stream-digest-staging` quand on push sur la branche `main`
- **Production** : Déployé automatiquement sur `gs-stream-digest` quand on push sur la branche `production`

## Prérequis

1. Compte Fly.io configuré
2. Applications Fly.io créées :
   - `gs-stream-digest-staging` (staging)
   - `gs-stream-digest` (production)
3. Volumes persistants créés pour SQLite :
   - `gs_digest_staging_data` (1GB, région cdg)
   - `gs_digest_production_data` (1GB, région cdg)

## Configuration des secrets

### 1. GitHub Secrets

Configurer le token Fly.io dans GitHub :

```bash
# Générer un token Fly.io
flyctl auth token

# Ajouter le secret dans GitHub
# Repository Settings > Secrets and variables > Actions > New repository secret
# Name: FLY_API_TOKEN
# Value: <votre_token>
```

### 2. Secrets Fly.io pour Staging

```bash
# Toutes les variables d'environnement pour staging
flyctl secrets set \
  NODE_ENV="production" \
  PORT="3000" \
  HOST="0.0.0.0" \
  LOG_LEVEL="info" \
  DATABASE_PATH="/app/apps/backend/data/digest.db" \
  JWT_SECRET="your-jwt-secret-staging" \
  SUPABASE_URL="https://m1-api.grand-shooting.com" \
  SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsY3Rvd3hqeWd5cXpyb29pZW13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNjI0MzYsImV4cCI6MjA3MzkzODQzNn0.Ql-fqixQfakgX7rLeUHNyoWsDfRk4MnpN1ChQFmOzB0" \
  SUPABASE_SERVICE_ROLE_KEY="your-staging-service-role-key" \
  NATS_URL="https://gs-stream-api-staging.fly.dev" \
  NATS_API_KEY="gs_test_b595309238c077ee5ded5eab69780b33e637e06f6ea9490000bcf87fbecb6d3a" \
  RESEND_API_KEY="re_YC4vzB8P_JoaTCpUrAAroYwQVs4tzYWw8" \
  SENTRY_DSN="https://abc0eb1a2732324d551322d3f2258fb0@o4510375993802752.ingest.de.sentry.io/4510375995572304" \
  AXIOM_TOKEN="xaat-fbb96daf-4e87-45a7-8724-32f601636784" \
  AXIOM_DATASET="gs-dev" \
  FRONTEND_URL="https://gs-stream-digest-staging.fly.dev" \
  BACKEND_URL="https://gs-stream-digest-staging.fly.dev" \
  API_HOST="gs-stream-digest-staging.fly.dev" \
  --app gs-stream-digest-staging
```

### 3. Secrets Fly.io pour Production

```bash
# Toutes les variables d'environnement pour production
flyctl secrets set \
  NODE_ENV="production" \
  PORT="3000" \
  HOST="0.0.0.0" \
  LOG_LEVEL="info" \
  DATABASE_PATH="/app/apps/backend/data/digest.db" \
  JWT_SECRET="your-jwt-secret-production" \
  SUPABASE_URL="https://m0-api.grand-shooting.com" \
  SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4emtvanJqamxzc2dpbm1xcmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NTE3MDksImV4cCI6MjA1OTMyNzcwOX0.Qm-VjrLZ5Zc7umEjZDrUYsAy8aIOe5dPzTGqbbI6JUU" \
  SUPABASE_SERVICE_ROLE_KEY="your-production-service-role-key" \
  NATS_URL="https://gs-stream-api.fly.dev" \
  NATS_API_KEY="gs_live_7005db07f73b134b51302b63149d92fbbd534ef87a364f041f485bbe7c5b5230" \
  RESEND_API_KEY="re_YC4vzB8P_JoaTCpUrAAroYwQVs4tzYWw8" \
  SENTRY_DSN="https://abc0eb1a2732324d551322d3f2258fb0@o4510375993802752.ingest.de.sentry.io/4510375995572304" \
  AXIOM_TOKEN="xaat-fbb96daf-4e87-45a7-8724-32f601636784" \
  AXIOM_DATASET="gs-production" \
  FRONTEND_URL="https://digest.grand-shooting.com" \
  BACKEND_URL="https://digest-api.grand-shooting.com" \
  API_HOST="digest-api.grand-shooting.com" \
  --app gs-stream-digest
```

## Variables d'environnement requises

### Backend

Toutes ces variables doivent être configurées sur Fly.io :

```env
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info

# Database
DATABASE_PATH=/app/apps/backend/data/digest.db

# JWT
JWT_SECRET=your-secret-key-change-this

# Supabase
SUPABASE_URL=https://m0-api.grand-shooting.com  # m1-api pour staging
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NATS Events API
NATS_URL=https://gs-stream-api.fly.dev  # gs-stream-api-staging pour staging
NATS_API_KEY=your-nats-api-key

# Email
RESEND_API_KEY=re_xxxxxxxxxxxx

# Monitoring
SENTRY_DSN=https://xxx@xxx.ingest.de.sentry.io/xxx
AXIOM_TOKEN=xaat-xxxxxxxxxxxx
AXIOM_DATASET=gs-production  # gs-dev pour staging

# URLs
FRONTEND_URL=https://digest.grand-shooting.com
BACKEND_URL=https://digest-api.grand-shooting.com
API_HOST=digest-api.grand-shooting.com
```

### Frontend

Les variables frontend sont gérées via Next.js et doivent être configurées au build time :

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://m0-api.grand-shooting.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Workflow de déploiement

### Déploiement sur Staging

```bash
# 1. Développer sur une feature branch
git checkout -b feature/ma-fonctionnalite

# 2. Faire les modifications et commit
git add .
git commit -m "feat: ajout de ma fonctionnalité"

# 3. Push et créer une PR vers main
git push origin feature/ma-fonctionnalite

# 4. Merger la PR dans main
# ➡️ Déclenche automatiquement le déploiement sur staging
```

### Déploiement sur Production

```bash
# 1. S'assurer que staging fonctionne correctement

# 2. Merger main dans production
git checkout production
git merge main
git push origin production

# ➡️ Déclenche automatiquement le déploiement sur production
```

## Déploiement manuel

### Staging

```bash
flyctl deploy --config fly.staging.toml --app gs-stream-digest-staging
```

### Production

```bash
flyctl deploy --config fly.toml --app gs-stream-digest
```

## Monitoring et logs

### Voir les logs

```bash
# Staging
flyctl logs --app gs-stream-digest-staging

# Production
flyctl logs --app gs-stream-digest
```

### Vérifier le status

```bash
# Staging
flyctl status --app gs-stream-digest-staging

# Production
flyctl status --app gs-stream-digest
```

### SSH dans le container

```bash
# Staging
flyctl ssh console --app gs-stream-digest-staging

# Production
flyctl ssh console --app gs-stream-digest
```

## Gestion de la base de données

### Backup manuel

```bash
# Staging
flyctl ssh console --app gs-stream-digest-staging -C "cp /app/apps/backend/data/digest.db /tmp/backup.db"
flyctl ssh sftp get /tmp/backup.db ./backup-staging-$(date +%Y%m%d).db --app gs-stream-digest-staging

# Production
flyctl ssh console --app gs-stream-digest -C "cp /app/apps/backend/data/digest.db /tmp/backup.db"
flyctl ssh sftp get /tmp/backup.db ./backup-production-$(date +%Y%m%d).db --app gs-stream-digest
```

### Migrations

Les migrations sont exécutées automatiquement au démarrage du container via le script `start-prod.sh`.

Pour forcer une migration manuelle :

```bash
flyctl ssh console --app gs-stream-digest-staging
cd /app/apps/backend
npm run db:migrate
```

## Scaling

### Ajuster les ressources

Modifier les fichiers `fly.staging.toml` ou `fly.toml` :

```toml
[[vm]]
  size = 'shared-cpu-2x'  # Au lieu de shared-cpu-1x
  memory = '1024mb'       # Au lieu de 512mb
```

### Ajouter des machines

```bash
# Staging
flyctl scale count 2 --app gs-stream-digest-staging

# Production
flyctl scale count 2 --app gs-stream-digest
```

## Troubleshooting

### L'application ne démarre pas

1. Vérifier les logs : `flyctl logs --app <app-name>`
2. Vérifier que tous les secrets sont configurés : `flyctl secrets list --app <app-name>`
3. Vérifier que le volume est bien monté : `flyctl volumes list --app <app-name>`

### Erreur de base de données

1. SSH dans le container : `flyctl ssh console --app <app-name>`
2. Vérifier que le fichier existe : `ls -la /app/apps/backend/data/`
3. Vérifier les permissions : `chmod 644 /app/apps/backend/data/digest.db`
4. Relancer les migrations : `cd /app/apps/backend && npm run db:migrate`

### Frontend ne peut pas contacter le backend

1. Vérifier que les deux services tournent dans les logs
2. Vérifier la variable `FRONTEND_URL` dans les secrets
3. Vérifier que les ports sont correctement configurés dans `fly.toml`

## URLs de l'application

- **Staging Frontend** : https://gs-stream-digest-staging.fly.dev
- **Staging Backend** : https://gs-stream-digest-staging.fly.dev (interne au container)
- **Production Frontend** : https://gs-stream-digest.fly.dev
- **Production Backend** : https://gs-stream-digest.fly.dev (interne au container)

Note : Le frontend et le backend tournent dans le même container. Le frontend est exposé sur le port 3001 qui est mappé au port 443 (HTTPS) par Fly.io.
