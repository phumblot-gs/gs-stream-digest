# Vérification Configuration Production

**Date** : 2025-11-30  
**Application** : gs-stream-digest (production)

## ✅ Éléments Corrects

1. **Cluster PostgreSQL** : `d2gznoqmkl70pkm8` existe et est opérationnel (status: ready)
2. **Secret DATABASE_URL** : Existe dans les secrets Fly.io
3. **Fichier fly.toml** : A été mis à jour pour supprimer le volume SQLite
4. **Tous les autres secrets** : Présents et configurés

## ⚠️ Problèmes Identifiés

### 1. Volume SQLite toujours monté

**Problème** : Le volume `gs_digest_production_data` est toujours monté dans la configuration déployée.

**Preuve** :
```bash
$ flyctl config show --app gs-stream-digest
"mounts": [
  {
    "source": "gs_digest_production_data",
    "destination": "/app/apps/backend/data",
    "initial_size": "1gb"
  }
]
```

**Impact** : Le volume SQLite est toujours monté même si nous n'utilisons plus SQLite.

**Solution** : La configuration dans `fly.toml` a été mise à jour, mais il faut redéployer pour que les changements prennent effet.

### 2. DATABASE_PATH toujours défini

**Problème** : `DATABASE_PATH` est toujours défini dans l'environnement de production.

**Preuve** :
```bash
$ flyctl ssh console --app gs-stream-digest -C "env | grep DATABASE"
DATABASE_URL=postgresql://fly-user:...@pgbouncer.d2gznoqmkl70pkm8.flympg.net/fly-db
DATABASE_PATH=/app/apps/backend/data/digest.db
```

**Impact** : Avec les modifications du code, `DATABASE_PATH` n'est plus utilisé, mais sa présence peut créer de la confusion.

**Solution** : `DATABASE_PATH` n'est plus utilisé dans le code, donc ce n'est plus un problème. Cependant, il serait préférable de le supprimer des variables d'environnement si elles sont définies explicitement.

### 3. Utilisateur PostgreSQL incorrect

**Problème** : `DATABASE_URL` utilise `fly-user` au lieu de `digestuser`.

**Preuve** :
```
DATABASE_URL=postgresql://fly-user:...@pgbouncer.d2gznoqmkl70pkm8.flympg.net/fly-db
```

**Impact** : L'application utilise peut-être le mauvais utilisateur. Selon la documentation, `digestuser` devrait être utilisé avec le rôle `writer`.

**Solution** : Vérifier si l'application est attachée au cluster PostgreSQL avec le bon utilisateur, ou mettre à jour le secret `DATABASE_URL`.

### 4. Configuration déployée non synchronisée

**Problème** : Le fichier `fly.toml` local a été mis à jour, mais la configuration déployée sur Fly.io n'a pas été synchronisée.

**Solution** : Redéployer l'application pour appliquer les changements.

## 📋 Actions Recommandées

### Action 1 : Vérifier l'attachement PostgreSQL

Vérifier si l'application production est correctement attachée au cluster PostgreSQL :

```bash
flyctl mpg attach d2gznoqmkl70pkm8 --app gs-stream-digest --database fly-db --username digestuser
```

Cela va :
- Attacher l'application au cluster PostgreSQL
- Configurer le réseau privé
- Créer/mettre à jour le secret `DATABASE_URL` avec le bon utilisateur

### Action 2 : Redéployer l'application

Après avoir mis à jour la configuration, redéployer pour appliquer les changements :

```bash
flyctl deploy --config fly.toml --app gs-stream-digest
```

Cela va :
- Appliquer la nouvelle configuration sans volume SQLite
- Redémarrer l'application avec le nouveau code (sans SQLite)
- Utiliser uniquement PostgreSQL

### Action 3 : Supprimer le volume SQLite (optionnel)

Si le volume SQLite n'est plus nécessaire, il peut être supprimé :

```bash
# D'abord, détacher le volume de la machine
flyctl volumes detach vol_vdmgpgygml6xq01v --app gs-stream-digest

# Ensuite, supprimer le volume (ATTENTION : perte de données)
flyctl volumes destroy vol_vdmgpgygml6xq01v --app gs-stream-digest
```

**⚠️ ATTENTION** : Ne supprimer le volume que si vous êtes sûr qu'il ne contient pas de données importantes.

### Action 4 : Mettre à jour la documentation

Le fichier `DATABASE_URL_CONFIG.md` mentionne encore SQLite. Il devrait être mis à jour pour refléter que seul PostgreSQL est utilisé.

## 🔍 Vérifications Post-Déploiement

Après le déploiement, vérifier :

1. **Logs de démarrage** :
   ```bash
   flyctl logs --app gs-stream-digest | grep -E "Database|PostgreSQL|DATABASE_URL"
   ```
   Devrait afficher : `[Database] Using PostgreSQL`

2. **Variables d'environnement** :
   ```bash
   flyctl ssh console --app gs-stream-digest -C "env | grep DATABASE"
   ```
   Devrait afficher uniquement `DATABASE_URL` (pas `DATABASE_PATH`)

3. **Configuration déployée** :
   ```bash
   flyctl config show --app gs-stream-digest | grep mounts
   ```
   Ne devrait pas afficher de mounts

4. **Test de connexion** :
   ```bash
   curl https://gs-stream-digest.fly.dev/api/digests
   ```
   Devrait fonctionner sans erreur 500

## 📝 Résumé

| Élément | État | Action Requise |
|---------|------|----------------|
| Cluster PostgreSQL | ✅ Opérationnel | Aucune |
| Secret DATABASE_URL | ✅ Existe | Vérifier utilisateur |
| Configuration fly.toml | ✅ Mise à jour | Redéployer |
| Volume SQLite | ⚠️ Toujours monté | Redéployer pour supprimer |
| DATABASE_PATH | ⚠️ Toujours défini | Non bloquant (non utilisé) |
| Code sans SQLite | ✅ Modifié | Redéployer |

## 🎯 Prochaines Étapes

1. **Vérifier l'attachement PostgreSQL** avec le bon utilisateur
2. **Redéployer l'application** pour appliquer les changements
3. **Vérifier les logs** pour confirmer que PostgreSQL est utilisé
4. **Tester l'application** pour s'assurer qu'elle fonctionne correctement
5. **Supprimer le volume SQLite** si nécessaire (après vérification)

