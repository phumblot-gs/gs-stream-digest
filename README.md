# GS Stream Digest

Système de génération et d'envoi de digests par email pour les événements de stream Grand Shooting.

## 🏗️ Architecture

Ce projet est un monorepo utilisant :
- **Turbo** pour la gestion du monorepo
- **Next.js 14** pour le frontend
- **Fastify** pour le backend API
- **SQLite** avec Drizzle ORM pour la base de données
- **Liquid.js** pour les templates d'emails

### Structure

```
gs-stream-digest/
├── apps/
│   ├── frontend/        # Application Next.js
│   └── backend/         # API Fastify
├── packages/
│   ├── database/        # Schémas et client Drizzle
│   ├── email-templates/ # Moteur de rendu Liquid
│   └── shared/          # Types et schémas partagés
```

## 🚀 Démarrage rapide

### Prérequis

- Node.js >= 20.0.0
- npm >= 10.0.0

### Installation

```bash
# Installer les dépendances
npm install

# Générer les migrations de base de données
npm run db:generate

# Appliquer les migrations
npm run db:migrate
```

### Développement

```bash
# Démarrer tous les services en mode dev
npm run dev

# Ou démarrer individuellement
npm run dev --workspace=@gs-digest/frontend   # Port 3001
npm run dev --workspace=@gs-digest/backend    # Port 3000
```

Le frontend sera accessible sur http://localhost:3001
Le backend sera accessible sur http://localhost:3000

### Build

```bash
# Compiler tous les packages
npm run build
```

### Production

```bash
# Démarrer en production
npm run start
```

## 📦 Packages

### @gs-digest/frontend
Application Next.js pour la gestion des digests, templates et configuration.

### @gs-digest/backend
API Fastify avec :
- Authentification via Supabase
- Routes CRUD pour digests et templates
- Système de scheduling avec Bree
- Rendu et envoi d'emails via Resend

### @gs-digest/database
- Schémas Drizzle ORM
- Client de base de données SQLite
- Migrations

### @gs-digest/email-templates
Moteur de rendu de templates avec Liquid.js

### @gs-digest/shared
Types TypeScript et schémas Zod partagés entre frontend et backend

## 🗃️ Base de données

La base de données SQLite est stockée dans `apps/backend/data/digest.db`.

Pour gérer la base de données :

```bash
# Ouvrir Drizzle Studio
npm run db:studio

# Générer de nouvelles migrations
npm run db:generate

# Appliquer les migrations
npm run db:migrate
```

## 🔑 Variables d'environnement

Créer les fichiers `.env` nécessaires :

### Frontend (`apps/frontend/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Backend (`apps/backend/.env`)
```
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Resend
RESEND_API_KEY=your_resend_api_key

# Base de données
DATABASE_PATH=./data/digest.db

# JWT
JWT_SECRET=your_jwt_secret

# NATS (optionnel)
NATS_SERVERS=nats://localhost:4222
```

## 🔧 Scripts disponibles

- `npm run dev` - Démarrer tous les services en mode développement
- `npm run build` - Compiler tous les packages
- `npm run start` - Démarrer tous les services en mode production
- `npm run lint` - Linter le code
- `npm run db:generate` - Générer les migrations
- `npm run db:migrate` - Appliquer les migrations
- `npm run db:studio` - Ouvrir Drizzle Studio

## 📝 Développement

### Ajouter un nouveau type d'événement

1. Ajouter le type dans `packages/database/src/schema/admin.ts`
2. Créer une migration avec `npm run db:generate`
3. Appliquer la migration avec `npm run db:migrate`

### Créer un nouveau template

Les templates utilisent Liquid.js avec les variables suivantes :
- `digest` - Informations sur le digest
- `events` - Liste des événements
- `eventsCount` - Nombre d'événements
- `recipientEmail` - Email du destinataire
- `currentDate` - Date actuelle

## 🚢 Déploiement

Le projet utilise GitHub Actions pour le CI/CD. Chaque push sur `main` ou `develop` déclenche :
1. Installation des dépendances
2. Build de tous les packages
3. Lint (non bloquant)

Pour déployer en production, configurez les secrets GitHub nécessaires et adaptez le workflow `.github/workflows/ci.yml` selon votre infrastructure.

## 📄 Licence

Propriétaire - Grand Shooting
