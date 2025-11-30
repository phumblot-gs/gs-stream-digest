# Guide de Suppression des Volumes SQLite

**Date** : 2025-11-30

## État Actuel des Volumes

### Staging (gs-stream-digest-staging)
- `vol_40l1718q06np3zk4` : **created** (non attaché)
- `vol_re8dn83m6q2dmmor` : **created** (attaché à la machine `2873324f161248`)

### Production (gs-stream-digest)
- `vol_rn86m8w0ympzkqer` : **created** (attaché à la machine `d8d4030b196e78`)
- Note : Selon le dashboard Fly.io, ce volume est en statut "pending_destroy" (suppression en cours)

## Méthodes de Suppression

### Méthode 1 : Via le Dashboard Fly.io (Recommandé)

1. **Aller sur le dashboard** : https://fly.io/apps/gs-stream-digest-staging/volumes
2. **Sélectionner le volume** à supprimer
3. **Cliquer sur "Destroy"** ou "Delete"
4. **Confirmer la suppression**

Pour la production : https://fly.io/apps/gs-stream-digest/volumes

### Méthode 2 : Détacher puis Supprimer via CLI

#### Pour Staging

**Étape 1 : Détacher le volume de la machine**

Le volume `vol_re8dn83m6q2dmmor` est attaché à la machine `2873324f161248`. Pour le détacher :

```bash
# Option A : Redéployer l'application (détachera automatiquement les volumes non configurés)
flyctl deploy --config fly.staging.toml --app gs-stream-digest-staging

# Option B : Créer une nouvelle machine sans volume et supprimer l'ancienne
flyctl machine clone 2873324f161248 --app gs-stream-digest-staging --region cdg --vm-size shared-cpu-1x --vm-memory 1024
# Puis mettre à jour la nouvelle machine avec la dernière image
# Et supprimer l'ancienne machine
```

**Étape 2 : Supprimer le volume non attaché**

Une fois le volume détaché :

```bash
# Supprimer le volume non attaché
flyctl volumes destroy vol_40l1718q06np3zk4 --yes

# Supprimer le volume détaché
flyctl volumes destroy vol_re8dn83m6q2dmmor --yes
```

#### Pour Production

Le volume `vol_rn86m8w0ympzkqer` est en cours de suppression automatique (pending_destroy). Si ce n'est pas le cas :

```bash
# Vérifier l'état
flyctl volumes show vol_rn86m8w0ympzkqer --app gs-stream-digest

# Si toujours attaché, redéployer pour détacher
flyctl deploy --config fly.toml --app gs-stream-digest

# Puis supprimer
flyctl volumes destroy vol_rn86m8w0ympzkqer --yes
```

### Méthode 3 : Redéploiement Complet (Plus Simple)

La méthode la plus simple est de redéployer complètement les applications. Cela créera de nouvelles machines sans volumes :

```bash
# Staging
flyctl deploy --config fly.staging.toml --app gs-stream-digest-staging

# Production  
flyctl deploy --config fly.toml --app gs-stream-digest
```

Ensuite, supprimer les anciennes machines avec volumes :

```bash
# Lister les machines
flyctl machines list --app gs-stream-digest-staging
flyctl machines list --app gs-stream-digest

# Supprimer les anciennes machines (celles avec volumes attachés)
flyctl machine remove <MACHINE_ID> --app <APP_NAME> --force
```

Puis supprimer les volumes :

```bash
flyctl volumes destroy vol_40l1718q06np3zk4 vol_re8dn83m6q2dmmor --yes
flyctl volumes destroy vol_rn86m8w0ympzkqer --yes
```

## ⚠️ Notes Importantes

1. **Les volumes sont cryptés** : Les données ne peuvent pas être récupérées après suppression
2. **Vérifier avant suppression** : S'assurer que les applications fonctionnent correctement avec PostgreSQL
3. **Le volume production** semble être en cours de suppression automatique selon le dashboard
4. **Les volumes non attachés** peuvent être supprimés directement sans risque

## 🔍 Vérification Post-Suppression

Après suppression, vérifier qu'il ne reste plus de volumes :

```bash
flyctl volumes list --app gs-stream-digest-staging
flyctl volumes list --app gs-stream-digest
```

Les deux commandes devraient retourner une liste vide ou "No volumes found".

## 📝 Commandes Rapides

### Supprimer tous les volumes SQLite restants

```bash
# Staging
flyctl volumes destroy vol_40l1718q06np3zk4 --yes
flyctl volumes destroy vol_re8dn83m6q2dmmor --yes

# Production (si pas déjà en pending_destroy)
flyctl volumes destroy vol_rn86m8w0ympzkqer --yes
```

**Note** : Si un volume est attaché à une machine, il faut d'abord le détacher ou supprimer la machine.

