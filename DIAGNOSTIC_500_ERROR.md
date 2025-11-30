# Diagnostic : Erreur 500 sur /api/digests

**Date** : 2025-11-30  
**Environnement** : Staging (gs-stream-digest-staging)  
**Erreur** : `GET https://gs-stream-digest-staging.fly.dev/api/digests` retourne 500

## 🔴 Problème Identifié

### Symptômes
1. L'endpoint `/api/digests` retourne une erreur 500
2. Aucune erreur visible dans Sentry
3. Le backend ne démarre pas correctement

### Cause Racine

**Le backend utilise SQLite au lieu de PostgreSQL** car `DATABASE_URL` n'est **PAS disponible** dans l'environnement du processus backend, malgré le fait que le secret existe dans Fly.io.

#### Preuve dans les logs :
```
[Database] DATABASE_URL env var: [NOT SET]
[Database] DATABASE_PATH env var: [NOT SET]
[Database] Using SQLite
[Database] Final database path: /app/data/digest.db
SqliteError: no such table: digest_digests
```

#### Vérifications effectuées :
1. ✅ Le secret `DATABASE_URL` existe bien dans Fly.io (`flyctl secrets list`)
2. ❌ Le secret `DATABASE_URL` n'est **PAS disponible** dans l'environnement du processus backend
3. ❌ Même après redémarrage, le problème persiste
4. ❌ Le script `start-prod.sh` définit `DATABASE_PATH` ce qui force SQLite

### Analyse Détaillée

#### 1. Configuration des Secrets
```bash
$ flyctl secrets list --app gs-stream-digest-staging | grep DATABASE
DATABASE_URL                 	75e7265087d2c702	✅ Existe
```

#### 2. Vérification dans le Conteneur
```bash
$ flyctl ssh console --app gs-stream-digest-staging -C "env | grep DATABASE"
DATABASE_PATH=/app/apps/backend/data/digest.db  ❌ Seulement DATABASE_PATH
# DATABASE_URL n'est PAS présent dans l'environnement !
```

#### 3. Logs du Backend (après redémarrage)
Le backend démarre mais :
- Ne voit toujours pas `DATABASE_URL` après redémarrage
- Utilise SQLite par défaut
- Crée une nouvelle base SQLite vide à `/app/data/digest.db`
- Échoue car les tables n'existent pas dans cette nouvelle base

#### 4. Script de Démarrage (`start-prod.sh`)
Le script définit explicitement `DATABASE_PATH` :
```bash
export DATABASE_PATH=/app/apps/backend/data/digest.db
npm start > /tmp/backend.log 2>&1 &
```

**Problème** : Le backend démarre en arrière-plan avec `&`, et les secrets Fly.io ne semblent pas être hérités par ce processus.

## 🔍 Pourquoi DATABASE_URL n'est pas disponible ?

### Hypothèse Principale

**Les secrets Fly.io ne sont pas injectés dans l'environnement du processus backend** qui démarre via `npm start` dans le script `start-prod.sh`.

#### Raisons possibles :

1. **Les secrets Fly.io sont injectés seulement dans le processus principal du conteneur**
   - Le script `start-prod.sh` est le processus principal
   - Mais quand il démarre `npm start &`, les secrets ne sont peut-être pas hérités

2. **Le script `start-prod.sh` redéfinit `DATABASE_PATH`**
   - Cela pourrait créer de la confusion
   - Mais le vrai problème est que `DATABASE_URL` n'est jamais défini

3. **Problème avec `flyctl mpg attach`**
   - L'attachement a créé le secret, mais il n'est peut-être pas correctement injecté
   - Ou il y a un problème de timing lors du démarrage

## 📋 Vérifications Effectuées

### ✅ Confirmé
- Le secret `DATABASE_URL` existe dans Fly.io
- Le cluster PostgreSQL est attaché à l'application
- L'application redémarre correctement

### ❌ Problème
- `DATABASE_URL` n'est pas disponible dans l'environnement du processus backend
- Le backend utilise SQLite par défaut
- Le backend échoue car les tables n'existent pas dans SQLite

## 🎯 Solutions Possibles (Sans Modifier le Code)

### Solution 1 : Vérifier la configuration Fly.io
Les secrets devraient être automatiquement injectés. Vérifier si :
- La configuration `fly.staging.toml` est correcte
- Les secrets sont bien définis pour l'application
- Il n'y a pas de problème avec l'attachement PostgreSQL

### Solution 2 : Vérifier si les secrets sont disponibles dans le processus principal
```bash
flyctl ssh console --app gs-stream-digest-staging
# Dans le conteneur, avant le démarrage du script :
printenv | grep DATABASE_URL
```

### Solution 3 : Vérifier les logs de démarrage complets
Les secrets Fly.io sont normalement injectés au démarrage du conteneur. Si ce n'est pas le cas, il y a peut-être un problème avec la configuration Fly.io.

## 📝 Notes Importantes

1. **Le secret `DATABASE_URL` a été créé par `flyctl mpg attach`** avec le format :
   ```
   postgresql://digestuser:1Ri5BuJ9Kv2oRxU8mMMPwyvfUJ2HdPYB@pgbouncer.kyzl60xwk9xrpj9g.flympg.net/fly-db
   ```

2. **Le script `start-prod.sh` ne devrait PAS définir `DATABASE_PATH`** si `DATABASE_URL` est présent, car cela force l'utilisation de SQLite.

3. **Le backend devrait détecter automatiquement PostgreSQL** si `DATABASE_URL` est défini, mais actuellement il ne le voit pas.

4. **Version déployée** : `gs-stream-digest-staging:deployment-01KBAFGYZW1C6W762R3MPDJDB8`
   - Commit : `1e35b2f` (dernier commit sur staging)
   - Version machine : 37

## 🔧 Conclusion

Le problème est que **les secrets Fly.io ne sont pas disponibles dans l'environnement du processus backend**, même après redémarrage. Cela suggère un problème avec la façon dont les secrets sont injectés ou hérités par les processus enfants dans le conteneur.

**Action requise** : Vérifier pourquoi les secrets Fly.io ne sont pas injectés dans l'environnement du processus backend, ou modifier le script de démarrage pour s'assurer que les secrets sont disponibles.
