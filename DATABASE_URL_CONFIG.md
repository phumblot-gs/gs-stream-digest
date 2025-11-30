# Configuration DATABASE_URL pour PostgreSQL

## Informations de connexion

### Staging (kyzl60xwk9xrpj9g)
- **Cluster ID**: kyzl60xwk9xrpj9g
- **Database**: fly-db
- **User**: digestuser
- **Role**: writer
- **Internal hostname (pour Fly.io apps)**: `pgbouncer.kyzl60xwk9xrpj9g.svc`
- **Port**: 5432

### Production (d2gznoqmkl70pkm8)
- **Cluster ID**: d2gznoqmkl70pkm8
- **Database**: fly-db
- **User**: digestuser
- **Role**: writer
- **Internal hostname (pour Fly.io apps)**: `pgbouncer.d2gznoqmkl70pkm8.svc`
- **Port**: 5432

## Format DATABASE_URL

Le format pour PostgreSQL sur Fly.io est :
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

## Actions nécessaires

### 1. Récupérer le mot de passe de digestuser

Le mot de passe de `digestuser` a été auto-généré par Fly.io lors de la création. Pour le récupérer :

**Pour staging :**
```bash
flyctl mpg users show digestuser kyzl60xwk9xrpj9g
```

**Pour production :**
```bash
flyctl mpg users show digestuser d2gznoqmkl70pkm8
```

### 2. Configurer les secrets Fly.io

**Pour staging :**
```bash
flyctl secrets set DATABASE_URL="postgresql://digestuser:[PASSWORD_STAGING]@pgbouncer.kyzl60xwk9xrpj9g.svc:5432/fly-db" \
  --app gs-stream-digest-staging
```

**Pour production :**
```bash
flyctl secrets set DATABASE_URL="postgresql://digestuser:[PASSWORD_PRODUCTION]@pgbouncer.d2gznoqmkl70pkm8.svc:5432/fly-db" \
  --app gs-stream-digest
```

### 3. Vérifier la configuration

Après avoir défini les secrets, l'application redémarrera automatiquement et utilisera PostgreSQL à la place de SQLite.

## Notes importantes

- Les hostnames `.svc` ne sont accessibles que depuis l'intérieur du réseau Fly.io
- Le client de base de données ([packages/database/src/client.ts](/Users/phf/grandshooting/gs-stream-digest/packages/database/src/client.ts:51)) détecte automatiquement `DATABASE_URL` et utilise PostgreSQL
- Si `DATABASE_URL` n'est pas défini, l'application utilise SQLite pour le développement local
- Le schéma PostgreSQL avec les 9 tables `digest_*` a déjà été créé et les permissions configurées
