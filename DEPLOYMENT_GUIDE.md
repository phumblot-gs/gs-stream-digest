# Guide de Déploiement - GS Stream Digest

## 📋 Table des matières

- [Prérequis](#prérequis)
- [Environnements](#environnements)
- [Déploiement Local](#déploiement-local)
- [Déploiement Docker](#déploiement-docker)
- [Déploiement Fly.io](#déploiement-flyio)
- [Déploiement Kubernetes](#déploiement-kubernetes)
- [Configuration Production](#configuration-production)
- [Monitoring](#monitoring)
- [Rollback](#rollback)
- [Troubleshooting](#troubleshooting)

## Prérequis

### Versions requises

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker >= 24.0 (pour déploiement containerisé)
- Fly CLI >= 0.2 (pour Fly.io)
- kubectl >= 1.28 (pour Kubernetes)

### Services externes requis

1. **Supabase** (Authentification)
   - Projet Supabase configuré
   - Auth providers activés (Email, Google, SSO)
   - Tables de métadonnées créées

2. **Resend** (Envoi d'emails)
   - Compte Resend avec API key
   - Domaine vérifié pour l'envoi
   - Webhook endpoint configuré

3. **NATS Events API** (Source d'événements)
   - Accès à gs-stream-events
   - API key valide
   - URL de l'endpoint

4. **Monitoring** (Optionnel)
   - Sentry DSN pour error tracking
   - Axiom token pour logs

## Environnements

### Structure des environnements

```
Development (local)
├── Backend: http://localhost:3000
├── Frontend: http://localhost:3001
└── Database: SQLite local

Staging (Fly.io)
├── Backend: https://gs-digest-staging.fly.dev
├── Frontend: https://gs-digest-app-staging.fly.dev
└── Database: SQLite volume

Production (Fly.io)
├── Backend: https://api.digest.grand-shooting.com
├── Frontend: https://digest.grand-shooting.com
└── Database: PostgreSQL managed
```

## Déploiement Local

### 1. Installation standard

```bash
# Clone et setup
git clone https://github.com/grandshooting/gs-stream-digest.git
cd gs-stream-digest
npm install

# Configuration
cp .env.example .env
# Éditer .env avec vos valeurs

# Base de données
npm run db:generate
npm run db:migrate

# Démarrage
npm run dev
```

### 2. Utilisation du script de démarrage

```bash
# Permission d'exécution
chmod +x start.sh

# Lancement automatique
./start.sh
```

### 3. Démarrage manuel par service

```bash
# Terminal 1 - Backend
npm run dev --workspace=@gs-digest/backend

# Terminal 2 - Frontend
npm run dev --workspace=@gs-digest/frontend

# Terminal 3 - Scheduler (optionnel en dev)
npm run scheduler --workspace=@gs-digest/backend
```

## Déploiement Docker

### 1. Build des images

```bash
# Build backend
docker build \
  -f deploy/Dockerfile.backend \
  -t gs-digest-backend:latest \
  --build-arg NODE_ENV=production \
  .

# Build frontend
docker build \
  -f deploy/Dockerfile.frontend \
  -t gs-digest-frontend:latest \
  --build-arg NEXT_PUBLIC_API_URL=https://api.digest.grand-shooting.com \
  .
```

### 2. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    image: gs-digest-backend:latest
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/data/digest.db
    env_file:
      - .env.production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: gs-digest-frontend:latest
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:3000
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./deploy/nginx/certs:/etc/nginx/certs
    depends_on:
      - backend
      - frontend
```

### 3. Lancement

```bash
# Développement
docker-compose up

# Production avec détachement
docker-compose -f docker-compose.prod.yml up -d

# Vérification des logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Arrêt
docker-compose down
```

## Déploiement Fly.io

### 1. Installation et configuration Fly CLI

```bash
# Installation (macOS)
brew install flyctl

# Installation (Linux)
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Création des apps
fly apps create gs-digest-backend
fly apps create gs-digest-frontend
```

### 2. Configuration des secrets

```bash
# Backend secrets
fly secrets set \
  JWT_SECRET="your-secret-key" \
  SUPABASE_URL="https://xxx.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="xxx" \
  NATS_URL="https://gs-stream-api.fly.dev" \
  NATS_API_KEY="xxx" \
  RESEND_API_KEY="re_xxx" \
  SENTRY_DSN="https://xxx@sentry.io/xxx" \
  AXIOM_TOKEN="xaat-xxx" \
  --app gs-digest-backend

# Frontend secrets
fly secrets set \
  NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co" \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="xxx" \
  NEXT_PUBLIC_API_URL="https://gs-digest-backend.fly.dev" \
  --app gs-digest-frontend
```

### 3. Configuration des volumes (SQLite)

```bash
# Créer un volume pour la base de données
fly volumes create digest_data \
  --size 10 \
  --region cdg \
  --app gs-digest-backend
```

### 4. Fichiers de configuration Fly

#### Backend (fly.backend.toml)

```toml
app = "gs-digest-backend"
primary_region = "cdg"
kill_signal = "SIGINT"
kill_timeout = 5

[build]
  dockerfile = "deploy/Dockerfile.backend"

[env]
  NODE_ENV = "production"
  DATABASE_PATH = "/data/digest.db"
  PORT = "8080"

[mounts]
  source = "digest_data"
  destination = "/data"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.http_checks]]
    interval = "30s"
    grace_period = "5s"
    method = "get"
    path = "/health"
    protocol = "http"
    timeout = "2s"
    tls_skip_verify = false
```

#### Frontend (fly.frontend.toml)

```toml
app = "gs-digest-frontend"
primary_region = "cdg"
kill_signal = "SIGINT"
kill_timeout = 5

[build]
  dockerfile = "deploy/Dockerfile.frontend"
  [build.args]
    NEXT_PUBLIC_API_URL = "https://gs-digest-backend.fly.dev"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.ports]]
    port = 80
    handlers = ["http"]
```

### 5. Déploiement

```bash
# Deploy backend
fly deploy --config deploy/fly/backend.toml --app gs-digest-backend

# Deploy frontend
fly deploy --config deploy/fly/frontend.toml --app gs-digest-frontend

# Vérifier le statut
fly status --app gs-digest-backend
fly status --app gs-digest-frontend

# Voir les logs
fly logs --app gs-digest-backend
fly logs --app gs-digest-frontend

# Scaling
fly scale count 2 --app gs-digest-backend
fly scale vm shared-cpu-1x --app gs-digest-backend
```

### 6. Domaines personnalisés

```bash
# Ajouter un domaine
fly certs add api.digest.grand-shooting.com --app gs-digest-backend
fly certs add digest.grand-shooting.com --app gs-digest-frontend

# Vérifier les certificats
fly certs list --app gs-digest-backend
fly certs check api.digest.grand-shooting.com --app gs-digest-backend
```

## Déploiement Kubernetes

### 1. Préparation des manifests

```yaml
# deploy/k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: gs-digest
```

```yaml
# deploy/k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gs-digest-config
  namespace: gs-digest
data:
  NODE_ENV: "production"
  DATABASE_PATH: "/data/digest.db"
```

```yaml
# deploy/k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: gs-digest-secrets
  namespace: gs-digest
type: Opaque
stringData:
  JWT_SECRET: "your-secret"
  SUPABASE_SERVICE_ROLE_KEY: "xxx"
  RESEND_API_KEY: "re_xxx"
```

```yaml
# deploy/k8s/deployment-backend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gs-digest-backend
  namespace: gs-digest
spec:
  replicas: 2
  selector:
    matchLabels:
      app: gs-digest-backend
  template:
    metadata:
      labels:
        app: gs-digest-backend
    spec:
      containers:
      - name: backend
        image: gs-digest-backend:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: gs-digest-config
        - secretRef:
            name: gs-digest-secrets
        volumeMounts:
        - name: data
          mountPath: /data
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: gs-digest-pvc
```

### 2. Application des manifests

```bash
# Appliquer tous les manifests
kubectl apply -f deploy/k8s/

# Vérifier le déploiement
kubectl get all -n gs-digest

# Voir les logs
kubectl logs -f deployment/gs-digest-backend -n gs-digest

# Port forward pour test local
kubectl port-forward service/gs-digest-backend 3000:3000 -n gs-digest
```

### 3. Helm Chart (optionnel)

```bash
# Installation avec Helm
helm install gs-digest ./deploy/helm/gs-digest \
  --namespace gs-digest \
  --create-namespace \
  --values ./deploy/helm/values.production.yaml

# Mise à jour
helm upgrade gs-digest ./deploy/helm/gs-digest \
  --namespace gs-digest \
  --values ./deploy/helm/values.production.yaml

# Rollback
helm rollback gs-digest 1 --namespace gs-digest
```

## Configuration Production

### 1. Variables d'environnement essentielles

```env
# Backend Production
NODE_ENV=production
JWT_SECRET=<minimum-32-caractères-aléatoires>
DATABASE_URL=postgresql://user:pass@host:5432/gsdigest  # Si PostgreSQL
DATABASE_PATH=/data/digest.db  # Si SQLite

# Services externes
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
NATS_URL=https://gs-stream-api.fly.dev
NATS_API_KEY=xxx
RESEND_API_KEY=re_xxx
RESEND_WEBHOOK_SECRET=xxx

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
AXIOM_TOKEN=xaat-xxx
AXIOM_DATASET=gs-production

# Performance
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
DB_CONNECTION_LIMIT=20
```

### 2. Optimisations production

```javascript
// Backend optimizations
const fastify = Fastify({
  logger: {
    level: 'warn',
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: req.headers,
      }),
    },
  },
  trustProxy: true,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'reqId',
  disableRequestLogging: false,
  bodyLimit: 1048576, // 1MB
});

// Compression
await fastify.register(compress, {
  global: true,
  threshold: 1024,
  encodings: ['gzip', 'deflate'],
});

// Rate limiting
await fastify.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: '1 minute',
  cache: 10000,
  allowList: ['127.0.0.1'],
  redis: redisClient, // Si Redis disponible
});
```

### 3. Base de données production

#### Migration vers PostgreSQL

```bash
# 1. Export SQLite
sqlite3 digest.db .dump > backup.sql

# 2. Conversion pour PostgreSQL
python scripts/sqlite_to_postgres.py backup.sql > postgres.sql

# 3. Import PostgreSQL
psql -h host -U user -d gsdigest < postgres.sql

# 4. Mise à jour Drizzle config
// drizzle.config.ts
export default {
  schema: './src/schema',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
};
```

#### Backup automatique

```bash
# Backup SQLite
sqlite3 /data/digest.db ".backup /backups/digest-$(date +%Y%m%d).db"

# Backup PostgreSQL
pg_dump $DATABASE_URL | gzip > /backups/digest-$(date +%Y%m%d).sql.gz

# Backup vers S3
aws s3 cp /backups/digest-$(date +%Y%m%d).sql.gz \
  s3://gs-backups/digest/
```

## Monitoring

### 1. Health checks

```typescript
// Backend health endpoint
fastify.get('/health', async (request, reply) => {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: await checkDatabase(),
      nats: await checkNats(),
      resend: await checkResend(),
    },
  };

  const isHealthy = Object.values(checks.services).every(s => s === 'healthy');

  return reply
    .code(isHealthy ? 200 : 503)
    .send(checks);
});
```

### 2. Métriques Prometheus

```typescript
// Prometheus metrics
import { register, Counter, Histogram, Gauge } from 'prom-client';

const httpDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
});

const digestsSent = new Counter({
  name: 'digests_sent_total',
  help: 'Total number of digests sent',
  labelNames: ['digest_id'],
});

const activeDigests = new Gauge({
  name: 'active_digests',
  help: 'Number of active digests',
});

// Expose metrics
fastify.get('/metrics', async (request, reply) => {
  reply.type('text/plain');
  return register.metrics();
});
```

### 3. Alertes

```yaml
# Alertmanager config
groups:
  - name: gs-digest
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: DatabaseDown
        expr: up{job="gs-digest-db"} == 0
        for: 1m
        annotations:
          summary: "Database is down"

      - alert: LowDiskSpace
        expr: node_filesystem_avail_bytes{mountpoint="/data"} < 1e9
        for: 5m
        annotations:
          summary: "Low disk space on data volume"
```

## Rollback

### 1. Stratégie de rollback

```bash
# Fly.io
fly releases list --app gs-digest-backend
fly deploy --app gs-digest-backend --image registry.fly.io/gs-digest-backend@sha256:xxx

# Kubernetes
kubectl rollout history deployment/gs-digest-backend -n gs-digest
kubectl rollout undo deployment/gs-digest-backend -n gs-digest
kubectl rollout undo deployment/gs-digest-backend --to-revision=2 -n gs-digest

# Docker
docker-compose down
docker-compose up -d --scale backend=0
docker tag gs-digest-backend:latest gs-digest-backend:rollback
docker tag gs-digest-backend:v1.0.0 gs-digest-backend:latest
docker-compose up -d
```

### 2. Backup avant déploiement

```bash
#!/bin/bash
# pre-deploy.sh

# Backup database
echo "Backing up database..."
fly ssh console --app gs-digest-backend --command \
  "sqlite3 /data/digest.db '.backup /data/digest-backup.db'"

# Save current image
echo "Saving current image..."
fly image show --app gs-digest-backend > deploy-backup.json

# Tag release
git tag -a "deploy-$(date +%Y%m%d-%H%M%S)" -m "Pre-deployment backup"
git push --tags

echo "Backup complete. Safe to deploy."
```

## Troubleshooting

### Problèmes courants

#### 1. Base de données verrouillée

```bash
# SQLite locked error
Error: SQLITE_BUSY: database is locked

# Solution
fly ssh console --app gs-digest-backend
fuser -v /data/digest.db
# Kill process if needed
sqlite3 /data/digest.db "PRAGMA journal_mode=WAL;"
```

#### 2. Mémoire insuffisante

```bash
# Out of memory
fly scale memory 512 --app gs-digest-backend

# Ou ajuster Node.js
NODE_OPTIONS="--max-old-space-size=512"
```

#### 3. Rate limiting NATS

```javascript
// Ajuster le délai entre les requêtes
const NATS_RATE_LIMIT_DELAY = 1000; // 1 seconde

async function fetchWithDelay() {
  await new Promise(resolve => setTimeout(resolve, NATS_RATE_LIMIT_DELAY));
  return fetch(/* ... */);
}
```

#### 4. Emails non envoyés

```bash
# Vérifier les logs Resend
fly logs --app gs-digest-backend | grep resend

# Vérifier les webhooks
curl -X GET https://api.resend.com/webhooks \
  -H "Authorization: Bearer re_xxx"

# Test manuel
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer re_xxx" \
  -H "Content-Type: application/json" \
  -d '{"from":"test@example.com","to":"test@example.com","subject":"Test","html":"Test"}'
```

### Logs et debugging

```bash
# Fly.io logs
fly logs --app gs-digest-backend --region cdg

# Docker logs
docker logs gs-digest-backend --follow --tail 100

# Kubernetes logs
kubectl logs -f deployment/gs-digest-backend -n gs-digest --tail=100

# SSH into container
fly ssh console --app gs-digest-backend
docker exec -it gs-digest-backend /bin/bash
kubectl exec -it pod/gs-digest-backend-xxx -n gs-digest -- /bin/bash
```

### Performance tuning

```javascript
// Connection pooling
const dbPool = {
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Caching
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

function getCached(key) {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.value;
  }
  return null;
}
```

## Scripts utiles

### deploy.sh

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Run tests
echo "Running tests..."
npm test

# Build
echo "Building application..."
npm run build

# Database migration
echo "Running migrations..."
npm run db:migrate:prod

# Deploy backend
echo "Deploying backend..."
fly deploy --app gs-digest-backend --config deploy/fly/backend.toml

# Deploy frontend
echo "Deploying frontend..."
fly deploy --app gs-digest-frontend --config deploy/fly/frontend.toml

# Health check
echo "Checking health..."
curl -f https://api.digest.grand-shooting.com/health || exit 1

echo "✅ Deployment complete!"
```

### rollback.sh

```bash
#!/bin/bash
set -e

REVISION=${1:-1}

echo "⏪ Rolling back to revision $REVISION..."

# Rollback backend
fly deploy --app gs-digest-backend \
  --image $(fly releases list --app gs-digest-backend --json | jq -r ".[$REVISION].ImageRef")

# Rollback frontend
fly deploy --app gs-digest-frontend \
  --image $(fly releases list --app gs-digest-frontend --json | jq -r ".[$REVISION].ImageRef")

echo "✅ Rollback complete!"
```

---

*Guide de déploiement v1.0.0 - Grand Shooting © 2024*