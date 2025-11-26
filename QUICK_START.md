# Guide de démarrage rapide - GS Stream Digest

## 🚀 État du projet

Le projet **gs-stream-digest** est maintenant configuré avec l'architecture de base suivante :

### ✅ Ce qui est prêt

#### Architecture
- **Monorepo** avec Turborepo pour la gestion des packages
- **3 packages** modulaires et réutilisables :
  - `@gs-digest/database` - Schema SQLite avec Drizzle ORM
  - `@gs-digest/shared` - Types TypeScript partagés
  - `@gs-digest/email-templates` - Moteur Liquid avec templates

#### Backend (Partiellement implémenté)
- **Serveur Fastify** avec plugins (CORS, JWT, Rate Limit, Swagger)
- **Service NATS** pour récupérer les événements
- **Service Email** avec intégration Resend
- **Service Scheduler** avec Bree pour les tâches périodiques
- **Job de processing** des digests
- **Routes API** pour les digests (CRUD complet)
- **Base de données** SQLite avec migrations appliquées

#### Configuration
- Fichiers `.env` pour tous les environnements
- Intégration Sentry et Axiom configurée
- Support multi-environnement (dev, staging, prod)

## 📦 Installation rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.development .env
# Éditer .env pour ajouter vos clés API

# 3. Base de données (déjà fait ✅)
npm run db:generate  # Génère les migrations
npm run db:migrate   # Applique les migrations

# 4. Démarrer le backend
cd apps/backend
npm run dev
```

## 🔧 Configuration requise

### Variables d'environnement critiques

Éditez le fichier `.env` et configurez ces valeurs :

```env
# Supabase (pour l'authentification)
SUPABASE_SERVICE_ROLE_KEY=votre-cle-ici

# JWT (générez une clé sécurisée)
JWT_SECRET=une-cle-secrete-forte-ici

# Resend (optionnel pour les tests)
RESEND_API_KEY=votre-cle-resend

# NATS (déjà configuré pour staging)
# Les valeurs par défaut pointent vers l'environnement de staging
```

## 🎯 Tester l'API

Une fois le serveur démarré :

### 1. Documentation Swagger
Ouvrez : http://localhost:3000/documentation

### 2. Health Check
```bash
curl http://localhost:3000/health
```

### 3. Créer un digest (nécessite authentification)
```bash
# D'abord, obtenir un token JWT (à implémenter)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Puis créer un digest
curl -X POST http://localhost:3000/api/digests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mon premier digest",
    "filters": {
      "eventTypes": ["file.share"]
    },
    "schedule": {
      "type": "daily",
      "dailyTime": "09:00"
    },
    "recipients": ["destinataire@example.com"],
    "templateId": "default-file-share"
  }'
```

## 📝 Ce qui reste à faire

### Priorité HAUTE
1. **Frontend Next.js** - Interface web complète
2. **Authentification complète** - Intégration Supabase SSO/OAuth
3. **Routes manquantes** :
   - Templates CRUD
   - Monitoring & stats
   - Export XLSX
4. **Webhooks Resend** - Signature verification

### Priorité MOYENNE
5. **Tests** - Unitaires et intégration
6. **Docker** - Containers pour déploiement
7. **CI/CD** - GitHub Actions

### Priorité BASSE
8. **Documentation API** complète
9. **Métriques** et observabilité
10. **Optimisations** performance

## 🏗️ Structure du code

```
gs-stream-digest/
├── apps/
│   ├── backend/         ✅ API Fastify (partiellement implémenté)
│   └── frontend/        ❌ Next.js (à créer)
├── packages/
│   ├── database/        ✅ SQLite + Drizzle
│   ├── shared/          ✅ Types TypeScript
│   └── email-templates/ ✅ Liquid templates
└── data/
    └── digest-dev.db    ✅ Base de données (auto-créée)
```

## 🐛 Dépannage

### Erreur : "Cannot find module '@gs-digest/database'"
```bash
npm install  # À la racine du projet
```

### Erreur : "Database not initialized"
```bash
npm run db:migrate
```

### Erreur : "SUPABASE_SERVICE_ROLE_KEY not set"
Éditez `.env` et ajoutez votre clé Supabase

### Port 3000 déjà utilisé
```bash
PORT=3001 npm run dev  # Dans apps/backend
```

## 🚀 Prochaines étapes recommandées

1. **Tester le backend** :
   ```bash
   cd apps/backend && npm run dev
   ```

2. **Créer le frontend** :
   ```bash
   cd apps
   npx create-next-app@latest frontend --typescript --tailwind --app
   ```

3. **Implémenter l'authentification** :
   - Configurer Supabase Auth
   - Créer les pages de login
   - Intégrer avec le backend

4. **Créer l'interface des digests** :
   - Liste des digests
   - Formulaire de création
   - Éditeur de templates

## 📞 Support

- Documentation des événements : Voir `GS_STREAM_EVENTS.md`
- Permissions : Voir `PERMISSION_DESIGN.md`
- Authentification Supabase : Voir `SUPABASE_AUTHENTICATION.md`

## ✨ Points forts de l'architecture

1. **Modularité** : Packages indépendants et réutilisables
2. **Type-safe** : TypeScript partout avec types partagés
3. **Scalable** : SQLite pour démarrer, PostgreSQL possible plus tard
4. **Observable** : Sentry + Axiom intégrés
5. **Flexible** : Templates Liquid puissants
6. **Sécurisé** : JWT + permissions par rôle/account

---

**Le backend est prêt à démarrer !** 🎉

Testez avec :
```bash
cd apps/backend
npm run dev
```

Puis visitez http://localhost:3000/documentation pour explorer l'API.