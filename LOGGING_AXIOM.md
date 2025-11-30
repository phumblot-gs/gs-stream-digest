# Système de Logging avec Axiom

## Vue d'ensemble

Le système de logging a été amélioré pour envoyer automatiquement tous les logs à Axiom, permettant un diagnostic complet des problèmes de connexion PostgreSQL et Supabase.

## Datasets Axiom

Les logs sont envoyés vers différents datasets selon l'environnement :

- **gs-production** : Environnement de production
- **gs-staging** : Environnement de staging
- **gs-dev** : Environnement de développement local

## Accès aux logs Axiom

### Via le Dashboard Axiom

1. Connectez-vous à [Axiom](https://app.axiom.co/)
2. Sélectionnez votre organisation
3. Accédez au dataset correspondant :
   - `gs-production` pour la production
   - `gs-staging` pour le staging
   - `gs-dev` pour le développement local

### Via l'API Axiom

Vous pouvez également interroger les logs via l'API Axiom :

```bash
# Exemple de requête pour les logs récents
curl -X POST https://api.axiom.co/v1/datasets/gs-staging/query \
  -H "Authorization: Bearer $AXIOM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": "2024-01-01T00:00:00Z",
    "endTime": "2024-01-02T00:00:00Z",
    "query": {
      "kind": "range",
      "table": "logs"
    }
  }'
```

## Logs au démarrage

### Backend

Le backend logge maintenant toutes les informations critiques au démarrage :

- **Variables d'environnement** (masquées pour la sécurité) :
  - `NODE_ENV`, `PORT`, `HOST`, `LOG_LEVEL`
  - `DATABASE_URL` (hostname uniquement, pas le mot de passe)
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `SENTRY_DSN`, `AXIOM_TOKEN`, `AXIOM_DATASET`
  - `NATS_URL`, `NATS_API_KEY`
  - `RESEND_API_KEY`

- **Initialisation des services** :
  - Sentry
  - Axiom
  - Base de données PostgreSQL
  - Supabase
  - Serveur Fastify
  - Scheduler

### Frontend

Le frontend logge également les informations au démarrage :

- **Variables d'environnement** :
  - `NODE_ENV`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (masqué)
  - `NEXT_PUBLIC_BACKEND_URL`

- **Initialisation** :
  - Client Supabase
  - Connexion au backend

## Structure des logs

Tous les logs incluent des métadonnées structurées :

```json
{
  "event": "app_startup",
  "phase": "initialization",
  "env": {
    "NODE_ENV": "staging",
    "PORT": "3001"
  },
  "database": {
    "DATABASE_URL": {
      "set": true,
      "hostname": "pgbouncer.kyzl60xwk9xrpj9g.svc",
      "length": 150
    }
  },
  "supabase": {
    "SUPABASE_URL": "https://m1-api.grand-shooting.com",
    "SUPABASE_ANON_KEY": "[SET - 150 chars]",
    "SUPABASE_SERVICE_ROLE_KEY": "[SET - 200 chars]"
  },
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "msg": "🚀 Starting application..."
}
```

## Recherche de logs spécifiques

### Logs de démarrage

```apl
event == "app_startup"
```

### Logs de base de données

```apl
event == "database_init"
```

### Logs Supabase

```apl
event == "supabase_init"
```

### Logs d'erreur

```apl
level == "error"
```

### Logs frontend

```apl
source == "frontend"
```

## Vérification que les logs remontent

### Backend

1. Vérifiez que `AXIOM_TOKEN` est défini :
   ```bash
   flyctl secrets list --app gs-stream-digest-staging | grep AXIOM
   ```

2. Vérifiez les logs de démarrage dans Axiom :
   ```apl
   event == "app_startup" AND phase == "initialization"
   ```

3. Vérifiez que le dataset est correct :
   ```apl
   _dataset == "gs-staging"
   ```

### Frontend

1. Les logs frontend sont envoyés via l'endpoint `/api/logs` du backend
2. Vérifiez dans Axiom :
   ```apl
   source == "frontend" AND event == "frontend_startup"
   ```

## Dépannage

### Les logs ne remontent pas

1. **Vérifiez le token Axiom** :
   ```bash
   flyctl secrets list --app gs-stream-digest-staging
   ```

2. **Vérifiez les logs de l'application** :
   ```bash
   flyctl logs --app gs-stream-digest-staging
   ```

3. **Vérifiez que Axiom est initialisé** :
   Recherchez dans les logs : `Axiom initialized with dataset: gs-staging`

### Erreurs de connexion PostgreSQL

Recherchez dans Axiom :
```apl
event == "database_init" AND phase == "failed"
```

Les logs incluront :
- Le hostname de la base de données
- Le message d'erreur complet
- La stack trace

### Erreurs Supabase

Recherchez dans Axiom :
```apl
event == "supabase_init" AND phase == "failed"
```

Les logs incluront :
- Les variables d'environnement Supabase (masquées)
- Le message d'erreur complet

## Sécurité

- Les valeurs sensibles (mots de passe, tokens) sont masquées dans les logs
- Seuls les hostnames et longueurs sont affichés
- Les logs sont envoyés uniquement en staging/production, pas en développement local

## Configuration

Les variables d'environnement nécessaires :

### Backend

- `AXIOM_TOKEN` ou `AXIOM_API_KEY` : Token d'API Axiom
- `NODE_ENV` : `production`, `staging`, ou `development`
- `LOG_LEVEL` : Niveau de log (`info`, `debug`, `warn`, `error`)

### Frontend

- Les logs frontend sont automatiquement envoyés au backend via `/api/logs`
- Le backend les transmet ensuite à Axiom

