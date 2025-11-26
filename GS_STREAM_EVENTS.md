# gs-stream-events

Infrastructure d'event streaming centralisée pour l'écosystème Grand Shooting.

## 🎯 Vue d'ensemble

**gs-stream-events** est un service d'event streaming qui collecte, stocke et distribue des événements provenant de multiples applications (Grand Shooting, Sourcing, Connect) vers des consommateurs autorisés via webhooks, SSE et API REST.

## 🏗️ Architecture

```
Apps (GS/Sourcing/Connect) 
    ↓
API Gateway (Hono)
    ↓
NATS JetStream (hot: 7j)
    ↓
PostgreSQL (warm: 1an) + Tigris S3 (cold: ∞)
    ↓
Webhooks/SSE/REST API → Consumers
```

## 📦 Structure du Projet

```
gs-stream-events/
├── apps/
│   ├── api/                    # API Gateway principal
│   ├── webhook-processor/      # Worker pour webhooks avec batching
│   └── storage-processor/      # Worker pour archivage S3
├── packages/
│   ├── core/                   # Types et schemas partagés
│   ├── database/               # Migrations PostgreSQL
│   └── sdk/                    # Client SDK NPM
├── infrastructure/
│   └── fly/                   # Configs Fly.io
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── examples/                   # Exemples d'utilisation
└── docs/                       # Documentation
```

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 20+
- pnpm 10+
- Fly.io CLI (`flyctl`)
- PostgreSQL 15+ (pour le développement local)

### Installation

```bash
# Cloner le repository
git clone https://github.com/phumblot-gs/gs-stream-events.git
cd gs-stream-events

# Installer les dépendances
pnpm install

# Construire le projet
pnpm build
```

### Développement Local

```bash
# Démarrer tous les services en mode développement
pnpm dev

# Démarrer un service spécifique
cd apps/api && pnpm dev
```

### Tests

```bash
# Tous les tests
pnpm test

# Tests unitaires uniquement
pnpm test:unit

# Tests d'intégration
pnpm test:integration

# Tests e2e
pnpm test:e2e
```

## 📚 Documentation

- [Guide SDK](./docs/SDK.md) - Comment utiliser le SDK client
- [Architecture](./gs-stream-events-implementation.md) - Documentation technique complète
- [Architecture des Bases de Données](./docs/DATABASE_ARCHITECTURE.md) - Configuration et gestion des bases de données

## 🔧 Configuration

### Variables d'Environnement

Voir les fichiers d'exemple :
- `env.example` - Configuration de base
- `env.development.example` - Configuration développement
- `env.staging.example` - Configuration staging
- `env.production.example` - Configuration production

### Secrets Requis

- `SENTRY_DSN` - DSN Sentry pour le monitoring
- `AXIOM_TOKEN` - Token Axiom pour les logs
- `AXIOM_DATASET` - Nom du dataset Axiom
- `AXIOM_ORG_ID` - ID de l'organisation Axiom
- `DATABASE_URL` - URL de connexion PostgreSQL
- `NATS_URL` - URL du serveur NATS
- `REDIS_URL` - URL du serveur Redis
- `TIGRIS_ENDPOINT` - Endpoint Tigris S3
- `TIGRIS_ACCESS_KEY` - Clé d'accès Tigris
- `TIGRIS_SECRET_KEY` - Clé secrète Tigris
- `TIGRIS_BUCKET` - Nom du bucket Tigris

## 🚢 Déploiement

### Architecture de Build

Le projet utilise **esbuild** pour créer des bundles optimisés pour le déploiement :

- **Bundling** : Toutes les dépendances JavaScript sont bundlées dans un seul fichier
- **Tree-shaking** : Seul le code utilisé est inclus dans le bundle final
- **Minification** : Le code est minifié en production pour réduire la taille
- **Source maps** : Incluses pour faciliter le debugging

#### Build Process

```bash
# Build tous les services
pnpm build

# Build un service spécifique
cd apps/webhook-processor && pnpm build
```

Le build génère :
- `dist/index.js` : Bundle JavaScript optimisé
- `dist/package.json` : Package.json minimal avec seulement les dépendances natives
- `dist/index.js.map` : Source map pour le debugging

### Infrastructure Fly.io

Le projet inclut des configurations Fly.io prêtes à l'emploi dans `infrastructure/fly/`.

#### Configuration des bases de données

Le projet utilise des bases de données PostgreSQL séparées pour chaque environnement :

- **Production** : `gs-stream-db` - Base de données dédiée pour l'environnement de production
- **Staging** : `gs-stream-db-staging` - Base de données dédiée pour l'environnement de staging

Cette séparation garantit l'isolation complète des données entre les environnements.

#### Création de l'infrastructure

Pour créer l'infrastructure complète :

```bash
# Créer les apps Fly.io (Production)
fly apps create gs-stream-api
fly apps create gs-stream-webhook-processor
fly apps create gs-stream-storage-processor

# Créer les apps Fly.io (Staging)
fly apps create gs-stream-api-staging
fly apps create gs-stream-webhook-processor-staging
fly apps create gs-stream-storage-processor-staging

# Créer PostgreSQL managé Production
fly mpg create --name gs-stream-db --org grafmaker --region fra

# Créer PostgreSQL managé Staging
fly mpg create --name gs-stream-db-staging --org grafmaker --region fra

# Configurer les DATABASE_URL pour chaque app
# Production
fly secrets set DATABASE_URL="<connection-string-production>" --app gs-stream-api
fly secrets set DATABASE_URL="<connection-string-production>" --app gs-stream-webhook-processor
fly secrets set DATABASE_URL="<connection-string-production>" --app gs-stream-storage-processor

# Staging
fly secrets set DATABASE_URL="<connection-string-staging>" --app gs-stream-api-staging
fly secrets set DATABASE_URL="<connection-string-staging>" --app gs-stream-webhook-processor-staging
fly secrets set DATABASE_URL="<connection-string-staging>" --app gs-stream-storage-processor-staging

# Créer Redis
fly redis create --name gs-stream-cache --region cdg

# Configurer les secrets
fly secrets set \
  SENTRY_DSN=your-sentry-dsn \
  AXIOM_TOKEN=your-axiom-token \
  AXIOM_DATASET=gs-dev \
  AXIOM_ORG_ID=your-org-id \
  --app gs-stream-api
```

### Déploiement

```bash
# Déployer l'API
cd apps/api
fly deploy --config ../../infrastructure/fly/api.toml

# Déployer le webhook processor
cd apps/webhook-processor
fly deploy --config ../../infrastructure/fly/webhook-processor.toml

# Déployer le storage processor
cd apps/storage-processor
fly deploy --config ../../infrastructure/fly/storage-processor.toml
```

### CI/CD

Le projet utilise GitHub Actions pour automatiser les déploiements :

- **Branche `staging`** : Déclenche automatiquement le déploiement sur l'environnement staging
- **Branche `production`** : Déclenche automatiquement le déploiement sur l'environnement production
- **Pull Requests** : Exécute les tests sans déployer

#### Workflow de déploiement

1. **Développement** : Travaillez sur votre branche feature
2. **Staging** : Mergez vers `staging` pour déployer en environnement de test
3. **Production** : Mergez de `staging` vers `production` pour déployer en production

```bash
# Flux typique
git checkout -b feature/new-feature
# ... développement ...
git push origin feature/new-feature
# Créer PR vers staging

# Une fois validé en staging
git checkout staging
git pull
git checkout production
git merge staging
git push origin production
```

## 📊 Monitoring

- **Sentry** : Gestion des erreurs et performance
- **Axiom** : Logs et analytics
- **Fly.io Metrics** : Métriques d'infrastructure

## 🔐 Sécurité

- Authentification par Bearer Token
- Permissions granulaires par account/user/scope
- Validation stricte des schémas d'événements
- Circuit breakers pour protéger les endpoints webhook

## 📝 API Endpoints

### POST /api/events
Publier un événement

### GET /api/events/stream
Stream SSE pour les événements en temps réel

### POST /api/events/query
Interroger les événements historiques

### GET /health
Health check

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez ouvrir une issue ou une pull request.

## 📄 Licence

Propriétaire - Grand Shooting

## 📞 Support

- **Email** : platform@grand-shooting.com
- **Slack** : #gs-stream-events
- **Issues** : https://github.com/phumblot-gs/gs-stream-events/issues

