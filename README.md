# GS Stream Digest

Système de génération et d'envoi de digests par email pour les événements de stream Grand Shooting.

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Démarrage rapide](#démarrage-rapide)
- [Documentation technique](#documentation-technique)
- [API Reference](#api-reference)
- [Développement](#développement)
- [Déploiement](#déploiement)

## Vue d'ensemble

GS Stream Digest est une plateforme permettant de créer, gérer et envoyer des digests par email basés sur des événements en temps réel provenant du stream NATS de Grand Shooting. Le système permet de :

- Configurer des filtres d'événements personnalisés
- Planifier l'envoi de digests (quotidien, hebdomadaire, mensuel)
- Créer des templates d'emails personnalisés avec Liquid.js
- Suivre les statistiques d'envoi et de lecture
- Gérer les utilisateurs et permissions multi-comptes

## Architecture

### Stack technique

**Frontend:**
- [Next.js 14](https://nextjs.org/) (App Router)
- [React 18](https://react.dev/) avec TypeScript
- [TanStack Query](https://tanstack.com/query) pour la gestion d'état serveur
- [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) pour l'UI
- [Zustand](https://github.com/pmndrs/zustand) pour l'état client
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) pour les formulaires

**Backend:**
- [Fastify](https://fastify.dev/) pour l'API REST
- [SQLite](https://www.sqlite.org/) + [Drizzle ORM](https://orm.drizzle.team/) pour la base de données
- [node-cron](https://github.com/node-cron/node-cron) pour le scheduling
- [Piscina](https://github.com/piscinajs/piscina) pour le worker pool (production)
- [NATS](https://nats.io/) pour la récupération des événements
- [Resend](https://resend.com/) pour l'envoi d'emails
- [Liquid.js](https://liquidjs.com/) pour le templating

**Infrastructure:**
- [Supabase Auth](https://supabase.com/auth) pour l'authentification
- [Sentry](https://sentry.io/) pour le monitoring d'erreurs
- [Axiom](https://axiom.co/) pour les logs et analytics
- [Fly.io](https://fly.io/) pour le déploiement

**Monorepo:**
- [Turborepo](https://turbo.build/repo) pour la gestion du monorepo
- npm workspaces pour les dépendances

### Structure du projet

```
gs-stream-digest/
├── apps/
│   ├── frontend/                    # Application Next.js
│   │   ├── src/
│   │   │   ├── app/                # App Router (pages)
│   │   │   ├── components/         # Composants React
│   │   │   ├── lib/               # Utilities et configurations
│   │   │   └── hooks/             # Custom React hooks
│   │   └── public/                # Assets statiques
│   │
│   └── backend/                     # API Fastify
│       ├── src/
│       │   ├── routes/            # Routes API
│       │   ├── services/          # Services métier
│       │   │   ├── scheduler.ts   # Gestion des tâches cron
│       │   │   ├── nats/          # Client NATS
│       │   │   ├── email/         # Service d'envoi d'emails
│       │   │   └── database.ts    # Initialisation DB
│       │   ├── jobs/              # Background jobs
│       │   │   └── process-digest.ts
│       │   ├── plugins/           # Plugins Fastify
│       │   ├── utils/             # Utilities (logger, sentry, etc.)
│       │   ├── server.ts          # Configuration serveur
│       │   └── index.ts           # Point d'entrée
│       └── data/                  # Base de données SQLite
│
├── packages/
│   ├── database/                    # Schémas et client Drizzle
│   │   ├── src/
│   │   │   ├── schema/            # Tables SQLite
│   │   │   └── client.ts          # Client DB (lazy init)
│   │   └── migrations/            # Migrations SQL
│   │
│   ├── email-templates/             # Moteur de rendu Liquid
│   │   └── src/
│   │       ├── engine.ts          # Engine Liquid.js
│   │       └── defaults/          # Templates par défaut
│   │
│   └── shared/                      # Types et schémas partagés
│       └── src/
│           ├── types/             # Types TypeScript
│           ├── schemas/           # Schémas Zod
│           └── constants/         # Constantes
│
├── docs/                            # Documentation
│   └── API_REFERENCE.md            # Référence API complète
│
├── deploy/                          # Scripts de déploiement
├── .github/workflows/               # CI/CD GitHub Actions
├── fly.toml                         # Configuration Fly.io prod
├── fly.staging.toml                 # Configuration Fly.io staging
├── Dockerfile                       # Image Docker
└── turbo.json                       # Configuration Turborepo
```

### Architecture du Backend

```
┌─────────────────────────────────────────────────────────────┐
│                        API Fastify                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Auth JWT  │  │ Rate Limit │  │    CORS    │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐   ┌─────▼──────┐   ┌────▼─────┐
    │  Routes   │   │  Services  │   │ Scheduler│
    │  (CRUD)   │   │  (NATS,    │   │ (node-   │
    │           │   │   Email)   │   │  cron)   │
    └─────┬─────┘   └─────┬──────┘   └────┬─────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
                  ┌───────▼────────┐
                  │   Drizzle ORM  │
                  │   (SQLite)     │
                  └────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
  ┌─────▼──────┐   ┌─────▼──────┐   ┌──────▼─────┐
  │  Digests   │   │ Templates  │   │   Runs     │
  │  (Config)  │   │  (Liquid)  │   │ (History)  │
  └────────────┘   └────────────┘   └────────────┘

External Services:
  ┌──────────┐     ┌──────────┐     ┌──────────┐
  │   NATS   │     │  Resend  │     │ Supabase │
  │ (Events) │     │ (Email)  │     │  (Auth)  │
  └──────────┘     └──────────┘     └──────────┘
```

### Architecture du Frontend

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js App Router                      │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │  Auth Context  │  │  Query Client  │  │  Theme Store  │ │
│  │   (Supabase)   │  │  (TanStack)    │  │   (Zustand)   │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼──────┐   ┌────▼─────┐   ┌─────▼──────┐
    │   Pages    │   │   API    │   │ Components │
    │ /digests   │   │  Calls   │   │  (Radix)   │
    │ /templates │   │  (fetch) │   │            │
    │ /settings  │   │          │   │            │
    └────────────┘   └────┬─────┘   └────────────┘
                          │
                  ┌───────▼────────┐
                  │  Backend API   │
                  │ (localhost:3000│
                  │   ou prod)     │
                  └────────────────┘
```

### Flow de traitement d'un digest

```
1. Cron Trigger (node-cron)
         │
         ▼
2. Scheduler.executeDigest()
         │
         ├─→ [Production] Piscina Worker Pool
         │         │
         │         ▼
         │    process-digest.js (compiled)
         │
         └─→ [Development] Direct Import
                   │
                   ▼
              process-digest.ts

3. Process Digest Job:
   ├─ Fetch events from NATS
   │  (depuis lastEventUid / lastCheckAt)
   │
   ├─ Apply filters (EventFilter)
   │  (eventTypes, sourceApplications, etc.)
   │
   ├─ Render email template (Liquid)
   │  (avec les événements filtrés)
   │
   ├─ Send emails (Resend)
   │  (à tous les destinataires)
   │
   ├─ Update digest run record
   │  (status, eventsCount, etc.)
   │
   └─ Emit digest.sent event to NATS
```

## Démarrage rapide

### Prérequis

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **SQLite** (inclus avec Node.js)

### Installation

```bash
# Cloner le repository
git clone <repository-url>
cd gs-stream-digest

# Installer les dépendances
npm install

# Générer les types de base de données
npm run db:generate

# Appliquer les migrations
npm run db:migrate
```

### Configuration

Créer un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# Base de données
DATABASE_PATH=./apps/backend/data/digest.db

# Supabase (authentification)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# JWT
JWT_SECRET=your-jwt-secret-key

# NATS (événements)
NATS_SERVERS=nats://nats.grand-shooting.com:4222
NATS_USER=your-nats-user
NATS_PASSWORD=your-nats-password

# Resend (emails)
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@example.com

# API
NEXT_PUBLIC_API_URL=http://localhost:3000

# Monitoring (optionnel)
SENTRY_DSN=your-sentry-dsn
AXIOM_TOKEN=your-axiom-token
AXIOM_DATASET=your-dataset
```

### Démarrage en développement

```bash
# Option 1: Démarrer tous les services
npm run dev

# Option 2: Démarrer individuellement
npm run dev --workspace=@gs-digest/backend    # Port 3000
npm run dev --workspace=@gs-digest/frontend   # Port 3001
```

Le frontend sera accessible sur **http://localhost:3001**
Le backend sera accessible sur **http://localhost:3000**
La documentation API (Swagger) : **http://localhost:3000/documentation**

### Premier digest

1. Créer un compte sur le frontend (http://localhost:3001)
2. Créer un template d'email
3. Créer un digest avec :
   - Des filtres d'événements (ex: `file.share`)
   - Un schedule (ex: tous les jours à 9h)
   - Des destinataires
4. Tester avec le bouton "Test Digest"
5. Activer le digest pour qu'il s'exécute automatiquement

## Documentation technique

### Packages

#### @gs-digest/frontend

Application Next.js 14 avec App Router pour :
- Gestion des digests (CRUD)
- Création et édition de templates Liquid
- Monitoring des envois et statistiques
- Configuration des comptes et utilisateurs

**Technologies clés:**
- Next.js 14 (App Router, Server Components)
- TanStack Query pour le cache et sync serveur
- Monaco Editor pour l'édition de templates Liquid
- Radix UI pour les composants accessibles

#### @gs-digest/backend

API Fastify avec système de scheduling intégré :

**Routes principales:**
- `/api/auth/*` - Authentification (login, logout, API keys)
- `/api/digests/*` - Gestion des digests
- `/api/templates/*` - Gestion des templates
- `/api/emails/*` - Historique d'envoi
- `/api/monitoring/*` - Statistiques (superadmin)
- `/health` - Health check

**Services:**
- `DigestScheduler` - Gestion des cron jobs avec node-cron
- `NATSEventClient` - Récupération des événements depuis NATS
- `EmailSender` - Envoi via Resend avec retry logic
- `EventFilter` - Filtrage avancé des événements

**Jobs:**
- `process-digest` - Traitement d'un digest (worker en production)

#### @gs-digest/database

Schémas Drizzle ORM pour SQLite :

**Tables principales:**
- `digests` - Configuration des digests
- `digestTemplates` - Templates Liquid
- `digestRuns` - Historique d'exécution
- `digestEmails` - Emails envoyés
- `adminUsers` - Utilisateurs et permissions
- `apiKeys` - Clés API

**Client:**
- Initialisation lazy avec `getDb()` pour éviter les problèmes d'env vars
- Support multi-environnement (dev, staging, prod)

#### @gs-digest/email-templates

Moteur de rendu Liquid.js avec :

**Variables disponibles:**
- `digest` - Infos du digest (nom, description, etc.)
- `events` - Liste des événements filtrés
- `eventsCount` - Nombre d'événements
- `recipientEmail` - Email du destinataire
- `currentDate` - Date actuelle
- `timeWindow` - Fenêtre temporelle du digest

**Filters Liquid personnalisés:**
- `formatDate` - Formatage de dates
- `truncate` - Troncature de texte
- `eventIcon` - Icône selon le type d'événement

#### @gs-digest/shared

Types et schémas partagés :

**Types principaux:**
- `Event` - Structure d'un événement NATS
- `EventFilters` - Filtres d'événements
- `DigestSchedule` - Configuration de planning
- `DigestRun` - Résultat d'exécution

**Schémas Zod:**
- Validation côté client et serveur
- Génération de types TypeScript automatique

### Base de données

La base de données SQLite est stockée dans `apps/backend/data/digest.db` en développement.

**Gestion:**

```bash
# Ouvrir Drizzle Studio (interface graphique)
npm run db:studio

# Créer une nouvelle migration
npm run db:generate

# Appliquer les migrations
npm run db:migrate
```

**Schéma principal:**

```sql
-- Digests
CREATE TABLE digests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  accountId TEXT NOT NULL,
  filters TEXT NOT NULL,  -- JSON
  schedule TEXT NOT NULL,  -- Cron expression
  recipients TEXT NOT NULL,  -- JSON array
  templateId TEXT,
  isActive INTEGER DEFAULT 1,
  isPaused INTEGER DEFAULT 0,
  lastEventUid TEXT,
  lastCheckAt TEXT,
  createdBy TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

-- Templates
CREATE TABLE digestTemplates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subjectLiquid TEXT NOT NULL,
  bodyHtmlLiquid TEXT NOT NULL,
  bodyTextLiquid TEXT,
  isGlobal INTEGER DEFAULT 0,
  accountId TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);

-- Runs
CREATE TABLE digestRuns (
  id TEXT PRIMARY KEY,
  digestId TEXT NOT NULL,
  runType TEXT NOT NULL,  -- 'scheduled' | 'manual' | 'test'
  status TEXT NOT NULL,  -- 'processing' | 'success' | 'failed' | 'partial'
  eventsCount INTEGER DEFAULT 0,
  emailsSent INTEGER DEFAULT 0,
  emailsFailed INTEGER DEFAULT 0,
  runAt TEXT NOT NULL,
  completedAt TEXT,
  durationMs INTEGER,
  error TEXT,
  FOREIGN KEY (digestId) REFERENCES digests(id)
);
```

## API Reference

Documentation complète disponible dans [docs/API_REFERENCE.md](docs/API_REFERENCE.md).

### Authentification

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Response
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

### Digests

```bash
# List digests
curl -X GET http://localhost:3000/api/digests \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create digest
curl -X POST http://localhost:3000/api/digests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily File Shares",
    "filters": {
      "eventTypes": ["file.share"],
      "maxAgeHours": 24
    },
    "schedule": {
      "type": "daily",
      "dailyTime": "09:00",
      "timezone": "Europe/Paris"
    },
    "recipients": ["team@example.com"],
    "templateId": "default-file-share"
  }'

# Test digest
curl -X POST http://localhost:3000/api/digests/dig_123/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipientEmail":"test@example.com"}'

# Trigger digest now
curl -X POST http://localhost:3000/api/digests/dig_123/send \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Templates

```bash
# List templates
curl -X GET http://localhost:3000/api/templates \
  -H "Authorization: Bearer YOUR_TOKEN"

# Preview template
curl -X POST http://localhost:3000/api/templates/tpl_123/preview \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "useRealEvents": true,
    "filters": {"eventTypes": ["file.share"]}
  }'
```

### Health Check

```bash
curl http://localhost:3000/health

# Response
{
  "status": "ok",
  "uptime": 3600,
  "services": {
    "database": "healthy",
    "nats": "healthy",
    "resend": "healthy"
  }
}
```

## Développement

### Scripts disponibles

```bash
# Développement
npm run dev                    # Démarrer tous les services
npm run dev --workspace=...    # Démarrer un workspace spécifique

# Build
npm run build                  # Build tous les packages
npm run build --workspace=...  # Build un workspace spécifique

# Production
npm run start                  # Démarrer en production

# Tests
npm run test                   # Lancer les tests
npm run lint                   # Linter le code

# Base de données
npm run db:generate           # Générer migrations
npm run db:migrate            # Appliquer migrations
npm run db:push               # Push schema (dev only)
npm run db:studio             # Ouvrir Drizzle Studio
```

### Ajouter un nouveau type d'événement

1. **Ajouter le type dans shared:**

```typescript
// packages/shared/src/types/events.ts
export type EventType =
  | 'file.share'
  | 'file.upload'
  | 'your.new.event';  // Nouveau type
```

2. **Mettre à jour les filtres si nécessaire:**

```typescript
// packages/shared/src/schemas/filters.ts
export const eventFiltersSchema = z.object({
  eventTypes: z.array(z.enum([
    'file.share',
    'file.upload',
    'your.new.event'  // Nouveau type
  ])),
  // ...
});
```

3. **Créer un template par défaut:**

```typescript
// packages/email-templates/src/defaults/your-new-event.ts
export const yourNewEventTemplate = {
  name: 'Your New Event',
  subject: '{{ eventsCount }} new events',
  bodyHtml: `<html>...</html>`,
  bodyText: `...`
};
```

### Créer un nouveau template

Les templates utilisent Liquid.js. Exemple :

```liquid
<!DOCTYPE html>
<html>
<head>
  <title>{{ digest.name }}</title>
</head>
<body>
  <h1>{{ eventsCount }} événements</h1>

  {% for event in events %}
    <div>
      <h2>{{ event.eventType }}</h2>
      <p>{{ event.data.description }}</p>
      <small>{{ event.timestamp | formatDate: "%d/%m/%Y %H:%M" }}</small>
    </div>
  {% endfor %}
</body>
</html>
```

### Debugging

**Backend logs:**

```bash
# Logs en développement
npm run dev --workspace=@gs-digest/backend

# Logs en production (Fly.io)
flyctl logs -a gs-stream-digest-staging
```

**Debugging un digest:**

```bash
# Vérifier les événements NATS disponibles
# (utiliser le client NATS directement)

# Tester un template
curl -X POST http://localhost:3000/api/templates/tpl_123/preview \
  -H "Authorization: Bearer TOKEN" \
  -d '{"useRealEvents": true}'

# Forcer l'exécution d'un digest
curl -X POST http://localhost:3000/api/digests/dig_123/send \
  -H "Authorization: Bearer TOKEN"
```

### Tests

```bash
# Tests unitaires
npm run test

# Tests d'intégration
npm run test:integration

# Coverage
npm run test:coverage
```

### Conventions de code

- **TypeScript strict mode** activé
- **ESLint + Prettier** pour le formatting
- **Conventional Commits** pour les messages de commit
- **Branches:** `main` (prod), `staging`, `feature/*`, `fix/*`

## Déploiement

### Environnements

- **Development:** Local (http://localhost:3000)
- **Staging:** Fly.io (https://gs-digest-staging.fly.dev)
- **Production:** Fly.io (https://gs-digest-api.grand-shooting.com)

### Déploiement sur Fly.io

```bash
# Staging
flyctl deploy --config fly.staging.toml

# Production
flyctl deploy --config fly.toml
```

### CI/CD

GitHub Actions déclenche automatiquement :

**Sur push vers `staging`:**
- Build et tests
- Déploiement vers staging

**Sur push vers `main`:**
- Build et tests
- Déploiement vers production

### Variables d'environnement

Configurer les secrets Fly.io :

```bash
# Staging
flyctl secrets set --config fly.staging.toml \
  DATABASE_PATH=/data/digest.db \
  SUPABASE_URL=... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  JWT_SECRET=... \
  NATS_SERVERS=... \
  RESEND_API_KEY=...

# Production
flyctl secrets set --config fly.toml \
  DATABASE_PATH=/data/digest.db \
  SUPABASE_URL=... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  JWT_SECRET=... \
  NATS_SERVERS=... \
  RESEND_API_KEY=...
```

### Monitoring

- **Sentry:** Monitoring d'erreurs et performance
- **Axiom:** Logs centralisés et analytics
- **Fly.io metrics:** CPU, mémoire, réseau

Accéder aux métriques :

```bash
# Logs
flyctl logs -a gs-stream-digest-staging

# Métriques
flyctl metrics -a gs-stream-digest-staging

# Status
flyctl status -a gs-stream-digest-staging
```

### Backup de la base de données

```bash
# Backup manuel
flyctl ssh console -a gs-stream-digest-staging
sqlite3 /data/digest.db .dump > backup.sql

# Restauration
sqlite3 /data/digest.db < backup.sql
```

## Troubleshooting

### Erreur: "Cannot find module '@gs-digest/database'"

```bash
# Réinstaller les dépendances
npm install
```

### Erreur: "Database not initialized"

```bash
npm run db:migrate
```

### Erreur: "SUPABASE_SERVICE_ROLE_KEY not set"

Vérifier que le fichier `.env` contient toutes les variables requises.

### Port 3000 déjà utilisé

```bash
# Changer le port
PORT=3001 npm run dev --workspace=@gs-digest/backend
```

### Worker thread errors en développement

Le système utilise désormais :
- **Production:** Piscina worker pool (fichiers .js compilés)
- **Development:** Import direct TypeScript (pas de workers)

Pas besoin de compiler en développement.

### Cron jobs ne se déclenchent pas

Vérifier :
1. Le digest est `isActive: true` et `isPaused: false`
2. L'expression cron est valide
3. Les logs du scheduler : `npm run dev --workspace=@gs-digest/backend`

## Ressources

- [Documentation API complète](docs/API_REFERENCE.md)
- [Guide des événements](GS_STREAM_EVENTS.md)
- [Guide des permissions](PERMISSION_DESIGN.md)
- [Authentication Supabase](SUPABASE_AUTHENTICATION.md)
- [Guide de déploiement](DEPLOYMENT_GUIDE.md)
- [Guide de contribution](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## Licence

Propriétaire - Grand Shooting

---

Créé avec TypeScript, Next.js, Fastify et Turborepo.
