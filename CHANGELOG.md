# Changelog

Tous les changements notables de GS Stream Digest sont documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### À venir
- Multi-tenancy avec isolation complète par tenant
- API GraphQL comme alternative REST
- WebSockets pour les mises à jour temps réel du dashboard
- Machine Learning pour prédiction des patterns d'envoi
- Application mobile React Native
- Marketplace de templates communautaires
- Webhooks sortants pour intégrations tierces
- Analytics avancés avec BI intégré

## [1.0.0] - 2024-11-26

### 🎉 Version initiale

#### Ajouté

##### Core
- Architecture monorepo avec Turborepo
- Backend API avec Fastify 4.28
- Frontend avec Next.js 14.2 et App Router
- Base de données SQLite avec Drizzle ORM
- Documentation complète (README, API Reference, Architecture)

##### Authentification & Sécurité
- Intégration Supabase Auth (Email/Password, Google OAuth, SSO SAML)
- Authentification JWT avec refresh tokens
- API Keys avec hash sécurisé et expiration
- Rôles utilisateur (superadmin, admin, viewer)
- Isolation des données par accountId
- Rate limiting configurable (60-1000 req/min)

##### Gestion des Digests
- CRUD complet des digests avec filtres avancés
- Filtrage par type d'événement, compte, application source
- Support des expressions JSONPath pour filtres custom
- Planification flexible (horaire, quotidien, hebdomadaire, mensuel, cron custom)
- Gestion des destinataires avec test recipients
- Pause/reprise des digests
- Mode test avec événements d'exemple
- Envoi immédiat à la demande

##### Templates Email
- Moteur Liquid avec filtres personnalisés
- Templates prédéfinis (file-share, activity-summary)
- Éditeur de templates avec preview temps réel
- Support HTML et texte brut
- Variables contextuelles dynamiques
- Boucles et conditions dans les templates
- Templates globaux et par compte

##### Intégration NATS
- Client pour gs-stream-events API
- Récupération incrémentale avec cursor
- Gestion de la pagination automatique
- Rate limiting et retry automatique
- Filtrage côté client des événements
- Support batch fetching (jusqu'à 1000 événements)

##### Envoi d'Emails
- Intégration Resend pour l'envoi
- Tracking des ouvertures et clics
- Gestion des bounces et plaintes
- Batch sending optimisé
- Webhooks pour statuts de livraison
- Historique détaillé des envois

##### Scheduler
- Intégration Bree avec worker threads
- Support expressions cron standards
- Exécution isolée des jobs
- Retry automatique en cas d'échec
- Logging détaillé des exécutions
- Gestion des overlaps

##### Monitoring & Analytics
- Dashboard de statistiques (superadmin)
- Métriques par compte et digest
- Taux d'ouverture et de clic
- Export XLSX des statistiques
- Intégration Sentry pour les erreurs
- Logs structurés avec Axiom
- Health checks avec status des services

##### Interface Utilisateur
- Dashboard responsive avec Tailwind CSS
- Composants Radix UI accessibles
- Dark mode support
- Formulaires avec validation Zod
- Tables avec tri et pagination
- Graphiques avec Recharts
- Toast notifications
- Loading states et skeletons

##### API REST
- Documentation Swagger automatique
- Validation des requêtes avec Zod
- Pagination standardisée
- Filtrage et tri flexibles
- Response format uniforme
- Error handling centralisé
- CORS configuré

##### DevOps
- Configuration Docker multi-stage
- Déploiement Fly.io ready
- Scripts Kubernetes
- GitHub Actions CI/CD
- Variables d'environnement par environnement
- Backup automatique SQLite

##### Tests
- Tests unitaires avec Vitest
- Tests d'intégration API
- Tests E2E avec Playwright
- Coverage reports
- Mocking des services externes

##### Documentation
- README complet avec badges
- Architecture détaillée avec diagrammes
- API Reference complète
- Guide de contribution
- Guide de déploiement
- Exemples de code

#### Configuration
- Support multi-environnement (dev, staging, prod)
- Variables d'environnement typées
- Configuration hot-reload en dev
- Secrets management sécurisé

#### Performance
- Connection pooling base de données
- Cache Redis ready (préparé)
- Compression gzip des réponses
- Code splitting frontend
- Image optimization Next.js
- Bundle optimization avec tree shaking

### Notes de migration

Pour les nouvelles installations :

1. Cloner le repository
2. Installer les dépendances : `npm install`
3. Configurer les variables d'environnement
4. Initialiser la base de données : `npm run db:migrate`
5. Démarrer l'application : `npm run dev`

### Dépendances principales

- **Backend**: Fastify 4.28, TypeScript 5.7, Drizzle ORM
- **Frontend**: Next.js 14.2, React 18.3, Tailwind CSS 3.4
- **Database**: SQLite 3 avec better-sqlite3
- **Email**: Resend 3.5, LiquidJS 10.19
- **Auth**: Supabase 2.49
- **Scheduler**: Bree 9.2.3
- **Monitoring**: Sentry, Axiom

### Contributeurs

- Équipe Grand Shooting
- Architecture et développement initial

### Ressources

- [Documentation](https://docs.grand-shooting.com/digest)
- [API Reference](/docs/API_REFERENCE.md)
- [Architecture](/docs/ARCHITECTURE.md)
- [Issues](https://github.com/grandshooting/gs-stream-digest/issues)

---

## Format des versions futures

### [Version] - YYYY-MM-DD

#### Ajouté
- Nouvelles fonctionnalités

#### Modifié
- Changements dans les fonctionnalités existantes

#### Déprécié
- Fonctionnalités qui seront supprimées dans le futur

#### Supprimé
- Fonctionnalités supprimées

#### Corrigé
- Corrections de bugs

#### Sécurité
- Corrections de vulnérabilités

---

*Changelog maintenu par l'équipe Grand Shooting*