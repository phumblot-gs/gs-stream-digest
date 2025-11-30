# Audit : Connexion PostgreSQL sur Staging

**Date** : 2025-11-30  
**Environnement** : Staging (gs-stream-digest-staging)  
**Cluster PostgreSQL** : kyzl60xwk9xrpj9g (organisation grafmaker)

## Résumé Exécutif

L'application staging a `DATABASE_URL` correctement configuré comme secret Fly.io, mais plusieurs problèmes de configuration empêchent l'utilisation de PostgreSQL :

1. **Le script de démarrage `start-prod.sh` définit `DATABASE_PATH`** avant le démarrage du backend
2. **Le fichier `fly.staging.toml` contient encore une configuration pour un volume SQLite**
3. **Le script de démarrage exécute des migrations SQLite** au lieu de migrations PostgreSQL
4. **Un fichier SQLite `digest.db` existe** dans le volume monté, suggérant que l'app utilise SQLite

## Problèmes Identifiés

### 1. Script de démarrage (`start-prod.sh`)

**Lignes problématiques :**
- Ligne 9 : `export DATABASE_PATH=/app/apps/backend/data/digest.db`
- Ligne 10 : `npm run db:migrate` (exécute les migrations SQLite par défaut)
- Ligne 15 : `export DATABASE_PATH=/app/apps/backend/data/digest.db` (redéfini)

**Impact** : Bien que le code dans `packages/database/src/client.ts` vérifie d'abord `DATABASE_URL` avant `DATABASE_PATH`, le script définit explicitement `DATABASE_PATH`, ce qui pourrait créer de la confusion. De plus, les migrations SQLite sont exécutées au lieu des migrations PostgreSQL.

### 2. Configuration Fly.io (`fly.staging.toml`)

**Lignes 37-41** : Configuration d'un volume persistant pour SQLite
```toml
[[mounts]]
  source = 'gs_digest_staging_data'
  destination = '/app/apps/backend/data'
  initial_size = '1gb'
```

**Impact** : Cette configuration suggère que l'application utilise SQLite. Le volume contient effectivement un fichier `digest.db` (200 KB), confirmant l'utilisation de SQLite.

### 3. Dockerfile

**Ligne 43** : `ENV DATABASE_PATH=/app/apps/backend/data/digest.db`

**Impact** : Variable d'environnement par défaut définie pour SQLite, bien qu'elle ne devrait pas interférer si `DATABASE_URL` est défini.

### 4. Vérification de la Configuration

✅ **DATABASE_URL est bien défini** comme secret Fly.io  
✅ **Le cluster PostgreSQL est opérationnel** (status: ready)  
✅ **L'utilisateur `digestuser` existe** avec le rôle `writer`  
❌ **Le script de démarrage ne vérifie pas `DATABASE_URL`** avant d'exécuter les migrations  
❌ **Les migrations PostgreSQL ne sont pas exécutées** au démarrage

## Analyse du Code

### Logique de Sélection de Base de Données

Dans `packages/database/src/client.ts` (lignes 57-110) :

```typescript
export function getDb() {
  if (!db) {
    const databaseUrl = process.env.DATABASE_URL;
    const databasePath = process.env.DATABASE_PATH;
    
    // If DATABASE_URL is set, use PostgreSQL
    if (databaseUrl) {
      console.log('[Database] Using PostgreSQL');
      // ... configuration PostgreSQL
    } else {
      // Otherwise, use SQLite
      console.log('[Database] Using SQLite');
      // ... configuration SQLite
    }
  }
  return db;
}
```

**Conclusion** : La logique est correcte - si `DATABASE_URL` est défini, PostgreSQL devrait être utilisé. Cependant, le script de démarrage pourrait interférer.

### Chargement des Variables d'Environnement

Dans `apps/backend/src/index.ts` (lignes 1-20) :

```typescript
import { config } from 'dotenv';
const envPath = resolve(__dirname, '../../../.env');
const result = config({ path: envPath });
```

**Note** : `dotenv.config()` par défaut ne remplace PAS les variables d'environnement existantes, donc les secrets Fly.io devraient avoir la priorité. Cependant, si un fichier `.env` existe dans le conteneur avec `DATABASE_URL`, cela pourrait créer de la confusion.

## Problèmes Probables

### Problème Principal : Script de Démarrage

Le script `start-prod.sh` :
1. Définit `DATABASE_PATH` avant les migrations (ligne 9)
2. Exécute `npm run db:migrate` qui utilise SQLite par défaut (ligne 10)
3. Redéfinit `DATABASE_PATH` avant le démarrage du backend (ligne 15)

**Résultat attendu** : Même si `DATABASE_URL` est défini, le script force l'utilisation de SQLite via `DATABASE_PATH` et exécute les mauvaises migrations.

### Problème Secondaire : Migrations

Le script exécute `npm run db:migrate` qui, selon `packages/database/package.json`, exécute probablement les migrations SQLite. Pour PostgreSQL, il faudrait exécuter `npm run db:migrate:pg`.

## Recommandations

### Actions Immédiates (Sans Modifier le Code)

1. **Vérifier les logs de démarrage** pour confirmer quel type de base de données est utilisé :
   ```bash
   flyctl logs --app gs-stream-digest-staging | grep -i "database\|postgres\|sqlite"
   ```

2. **Vérifier la valeur réelle de DATABASE_URL** (format et hostname) :
   ```bash
   flyctl secrets list --app gs-stream-digest-staging
   # Puis vérifier que le format est correct :
   # postgresql://digestuser:[password]@pgbouncer.kyzl60xwk9xrpj9g.svc:5432/fly-db
   ```

3. **Tester la connectivité réseau** entre l'app et le cluster PostgreSQL :
   ```bash
   flyctl ssh console --app gs-stream-digest-staging
   # Puis depuis le conteneur :
   nc -zv pgbouncer.kyzl60xwk9xrpj9g.svc 5432
   ```

### Modifications Nécessaires (À Faire Après Validation)

1. **Modifier `start-prod.sh`** pour :
   - Vérifier si `DATABASE_URL` est défini
   - Exécuter `npm run db:migrate:pg` si PostgreSQL est utilisé
   - Ne pas définir `DATABASE_PATH` si `DATABASE_URL` est présent

2. **Mettre à jour `fly.staging.toml`** pour :
   - Retirer la configuration du volume SQLite (lignes 37-41)
   - Ou la commenter avec une note expliquant qu'elle n'est utilisée que si `DATABASE_URL` n'est pas défini

3. **Mettre à jour le Dockerfile** pour :
   - Ne pas définir `DATABASE_PATH` par défaut, ou seulement si `DATABASE_URL` n'est pas défini

## Vérifications Complémentaires

### 1. Vérifier les Logs de Démarrage

```bash
flyctl logs --app gs-stream-digest-staging | grep -E "\[Database\]|\[ENV\]|Using PostgreSQL|Using SQLite"
```

### 2. Vérifier la Configuration du Secret DATABASE_URL

Le format attendu est :
```
postgresql://digestuser:[PASSWORD]@pgbouncer.kyzl60xwk9xrpj9g.svc:5432/fly-db
```

Pour récupérer le mot de passe :
```bash
flyctl mpg users show digestuser kyzl60xwk9xrpj9g
```

### 3. Vérifier les Migrations PostgreSQL

S'assurer que les migrations PostgreSQL ont été exécutées sur le cluster :
```bash
flyctl mpg connect kyzl60xwk9xrpj9g -u digestuser -d fly-db
# Puis dans psql :
\dt digest_*
```

## 🔴 PROBLÈME IDENTIFIÉ : Erreur d'Authentification SASL

**Découverte critique** : Les logs du backend montrent une erreur d'authentification PostgreSQL :

```
error: SASL authentication failed
code: '08P01'
```

### Analyse

1. ✅ **L'application détecte bien `DATABASE_URL`** et tente de se connecter à PostgreSQL
2. ✅ **La logique de sélection de base de données fonctionne correctement**
3. ❌ **L'authentification échoue** - problème de mot de passe ou format d'URL incorrect

### Cause Probable

Le secret `DATABASE_URL` configuré sur Fly.io a probablement :
- Un **mot de passe incorrect** pour l'utilisateur `digestuser`
- Un **format d'URL mal formé** (caractères spéciaux non échappés dans le mot de passe)
- Un **hostname incorrect** (doit être `pgbouncer.kyzl60xwk9xrpj9g.svc`)

## Actions Immédiates Requises

### 1. Vérifier le Mot de Passe de l'Utilisateur

```bash
flyctl mpg users show digestuser kyzl60xwk9xrpj9g
```

### 2. Vérifier le Format Actuel de DATABASE_URL

Le format doit être exactement :
```
postgresql://digestuser:[PASSWORD]@pgbouncer.kyzl60xwk9xrpj9g.svc:5432/fly-db
```

**Important** : Si le mot de passe contient des caractères spéciaux, ils doivent être encodés en URL (ex: `@` devient `%40`, `:` devient `%3A`)

### 3. Mettre à Jour le Secret DATABASE_URL

```bash
# Récupérer le mot de passe
PASSWORD=$(flyctl mpg users show digestuser kyzl60xwk9xrpj9g | grep -i password | awk '{print $2}')

# Encoder le mot de passe si nécessaire (pour caractères spéciaux)
ENCODED_PASSWORD=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$PASSWORD'))")

# Mettre à jour le secret
flyctl secrets set DATABASE_URL="postgresql://digestuser:${ENCODED_PASSWORD}@pgbouncer.kyzl60xwk9xrpj9g.svc:5432/fly-db" \
  --app gs-stream-digest-staging
```

### 4. Vérifier la Connectivité Réseau

```bash
flyctl ssh console --app gs-stream-digest-staging
# Depuis le conteneur :
nc -zv pgbouncer.kyzl60xwk9xrpj9g.svc 5432
```

## Conclusion

Le problème principal est une **erreur d'authentification SASL** lors de la connexion à PostgreSQL. L'application détecte correctement `DATABASE_URL` et tente de se connecter à PostgreSQL, mais l'authentification échoue.

**Cause probable** : Mot de passe incorrect ou mal encodé dans le secret `DATABASE_URL`.

**Action immédiate** : Vérifier et mettre à jour le secret `DATABASE_URL` avec le bon mot de passe et le bon format d'URL.

### Notes Supplémentaires

Les problèmes identifiés précédemment (script de démarrage, volume SQLite) sont secondaires mais devraient quand même être corrigés pour éviter toute confusion future :

1. Le script `start-prod.sh` devrait vérifier `DATABASE_URL` avant d'exécuter les migrations
2. Le volume SQLite dans `fly.staging.toml` n'est plus nécessaire si PostgreSQL est utilisé
3. Le fichier `digest.db` existant dans le volume peut être supprimé une fois PostgreSQL fonctionnel

