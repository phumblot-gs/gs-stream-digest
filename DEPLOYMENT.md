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
# Backend secrets
flyctl secrets set \
  SUPABASE_URL="https://your-project.supabase.co" \
  SUPABASE_ANON_KEY="your-anon-key" \
  JWT_SECRET="your-jwt-secret-staging" \
  RESEND_API_KEY="your-resend-api-key" \
  FRONTEND_URL="https://gs-stream-digest-staging.fly.dev" \
  --app gs-stream-digest-staging
```

### 3. Secrets Fly.io pour Production

```bash
# Backend secrets
flyctl secrets set \
  SUPABASE_URL="https://your-project.supabase.co" \
  SUPABASE_ANON_KEY="your-anon-key" \
  JWT_SECRET="your-jwt-secret-production" \
  RESEND_API_KEY="your-resend-api-key" \
  FRONTEND_URL="https://gs-stream-digest.fly.dev" \
  --app gs-stream-digest
```

## Variables d'environnement requises

### Backend (apps/backend/.env)

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# JWT
JWT_SECRET=your-secret-key

# Email
RESEND_API_KEY=re_xxxxxxxxxxxx

# Frontend URL
FRONTEND_URL=http://localhost:3001

# Database (géré automatiquement en production)
DATABASE_PATH=./data/digest.db
```

### Frontend (apps/frontend/.env.local)

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
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
