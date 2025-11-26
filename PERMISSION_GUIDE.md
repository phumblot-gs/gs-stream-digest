# Guide des Permissions et Rôles

## Vue d'ensemble

Le système de permissions de GS Stream Events utilise une architecture à trois niveaux de rôles avec des scopes granulaires et support des événements publics.

## Architecture des Rôles

### 1. Hiérarchie des rôles

```
SUPERADMIN
    ↓
  ADMIN (par accountId)
    ↓
  USER (par accountId)
```

### 2. Permissions par rôle

#### **SUPERADMIN**
- **Accès total** à tous les accountIds
- Peut créer des clés API avec n'importe quel rôle
- Peut gérer toutes les clés API du système
- Accès en lecture/écriture à tous les événements
- Peut marquer n'importe quel événement comme public
- **UUID spécial** : `00000000-0000-0000-0000-000000000000`

#### **ADMIN**
- **Limité à son accountId**
- Peut créer des clés API (admin ou user) pour son accountId
- Peut gérer toutes les clés API de son accountId
- Peut donner des accès cross-account à d'autres utilisateurs
- Peut marquer des événements de son account comme publics
- Accès aux événements selon ses scopes

#### **USER**
- **Limité à son accountId**
- Peut uniquement lister ses propres clés API
- Accès aux événements selon ses scopes
- Ne peut pas créer de nouvelles clés API
- Ne peut pas modifier les permissions

## Initialisation du Système

### 1. Première clé SUPERADMIN

Pour initialiser le système sur un nouvel environnement :

```bash
# Development
pnpm run init:superadmin

# Staging
NODE_ENV=staging pnpm run init:superadmin

# Production (nécessite une double confirmation)
NODE_ENV=production pnpm run init:superadmin
```

**Important** :
- Ce script ne peut être exécuté qu'une seule fois
- La clé générée doit être sauvegardée de manière sécurisée
- Elle ne sera plus jamais affichée

### 2. Création d'autres superadmins

Seul un superadmin existant peut créer d'autres superadmins :

```bash
curl -X POST https://api.gs-stream.fly.dev/api/keys \
  -H "Authorization: Bearer gs_live_SUPERADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nouveau Superadmin",
    "accountId": "00000000-0000-0000-0000-000000000000",
    "role": "superadmin",
    "scopes": ["*"],
    "isTest": false
  }'
```

## Gestion des Clés API

### Création de clés par rôle

#### Superadmin créant un admin d'account

```bash
curl -X POST https://api.gs-stream.fly.dev/api/keys \
  -H "Authorization: Bearer gs_live_SUPERADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin Account X",
    "accountId": "account-uuid-x",
    "role": "admin",
    "scopes": ["events:write", "events:read", "keys:manage"],
    "isTest": false
  }'
```

#### Admin créant un user

```bash
curl -X POST https://api.gs-stream.fly.dev/api/keys \
  -H "Authorization: Bearer gs_live_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "User Service Y",
    "accountId": "same-account-as-admin",
    "role": "user",
    "scopes": ["events:write", "events:read"],
    "isTest": false
  }'
```

### Règles de création

| Créateur | Peut créer |
|----------|------------|
| SUPERADMIN | ✅ superadmin<br>✅ admin (tout accountId)<br>✅ user (tout accountId) |
| ADMIN | ❌ superadmin<br>✅ admin (même accountId)<br>✅ user (même accountId) |
| USER | ❌ Aucune création possible |

## Événements Publics

Les événements peuvent être marqués comme publics, les rendant accessibles à tous les utilisateurs authentifiés, peu importe leur accountId.

### Marquer un type d'événement comme public

Seuls les admins d'un account ou les superadmins peuvent rendre des événements publics :

```typescript
// Via l'API (à implémenter)
POST /api/events/public
{
  "accountId": "account-uuid",
  "eventType": "announcement.published"
}
```

### Cas d'usage des événements publics

- **Annonces système** : Messages visibles par tous les utilisateurs
- **Statuts publics** : État de services accessibles à tous
- **Métriques publiques** : Statistiques d'usage globales
- **Événements de marketplace** : Produits disponibles pour tous

### Requête d'événements publics

```bash
# Tous les utilisateurs authentifiés peuvent lire les événements publics
curl -X POST https://api.gs-stream.fly.dev/api/events/query \
  -H "Authorization: Bearer gs_live_ANY_VALID_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "eventTypes": ["announcement.published"],
      "publicOnly": true
    }
  }'
```

## Permissions Cross-Account

Les admins peuvent donner accès à leur account à d'autres utilisateurs :

```sql
-- Table permission_rules
INSERT INTO permission_rules (user_id, account_id, granted_by)
VALUES ('user-externe-id', 'mon-account-id', 'admin-user-id');
```

Cela permet des scénarios comme :
- **Consultants** : Accès temporaire à plusieurs accounts clients
- **Services partagés** : Un service technique accédant à plusieurs accounts
- **Audits** : Accès en lecture seule pour vérification

## Filtrage des Données

### Requêtes selon le rôle

#### Superadmin
```typescript
// Voit tous les événements de tous les accounts
const events = await db.query(`
  SELECT * FROM events
  -- Pas de filtre WHERE
`);
```

#### Admin/User
```typescript
// Voit uniquement les événements de son account (ou avec permission)
const events = await db.query(`
  SELECT * FROM events
  WHERE scope_account_id = $1
     OR scope_account_id IN (
       SELECT account_id FROM permission_rules
       WHERE user_id = $2
     )
     OR (event_type, scope_account_id) IN (
       SELECT event_type, account_id FROM public_event_types
     )
`, [user.accountId, user.userId]);
```

## Scopes et Rôles

Les scopes définissent les actions possibles, les rôles définissent la portée :

| Action | Scope requis | + Rôle limite la portée |
|--------|-------------|-------------------------|
| Publier un événement | `events:write` | À son accountId seulement (sauf superadmin) |
| Lire des événements | `events:read` | De son accountId + publics (sauf superadmin) |
| Créer une clé API | `keys:manage` | Selon les règles du rôle |
| Gérer les webhooks | `webhooks:manage` | Pour son accountId seulement |

## Migration depuis l'ancien système

Pour migrer les clés existantes :

```sql
-- Assigner le rôle user par défaut aux clés existantes
UPDATE api_keys
SET role = 'user'
WHERE role IS NULL;

-- Promouvoir certaines clés en admin (manuellement)
UPDATE api_keys
SET role = 'admin'
WHERE id IN ('uuid-1', 'uuid-2')
  AND account_id = 'account-uuid';
```

## Sécurité

### Bonnes pratiques

1. **Principe du moindre privilège** : Donnez toujours le rôle minimum nécessaire
2. **Rotation des clés** : Changez régulièrement les clés, surtout les superadmin
3. **Audit trail** : Loggez toutes les actions des superadmins et admins
4. **Séparation des environnements** : Clés différentes pour dev/staging/prod
5. **Stockage sécurisé** : Utilisez un gestionnaire de secrets (Vault, AWS Secrets Manager)

### Recommandations par rôle

#### Pour les superadmins
- Limiter au maximum le nombre de clés superadmin
- Utiliser uniquement pour l'administration
- Ne jamais utiliser en production pour les opérations courantes
- Rotation obligatoire tous les 3 mois

#### Pour les admins
- Un admin par équipe/service par account
- Documenter qui a accès admin et pourquoi
- Révision trimestrielle des accès

#### Pour les users
- Clés spécifiques par service/application
- Scopes minimaux nécessaires
- Expiration automatique recommandée

## Exemples de Configuration

### Setup typique pour une entreprise

```yaml
# Account: company-xyz (uuid: abc-123)

Superadmin:
  - CTO uniquement (1 clé)

Admins:
  - Team Lead Backend (1 clé)
  - DevOps Lead (1 clé)

Users:
  - Service API principal: events:write, events:read
  - Service Analytics: events:read
  - Service Webhook: events:stream
  - Service Import: events:write
```

### Setup pour un SaaS multi-tenant

```yaml
# Chaque client = 1 accountId

Par client:
  Admin:
    - Account Manager du client (peut créer des users)

  Users:
    - Integration API: scopes selon besoins
    - Dashboard readonly: events:read uniquement

Global (superadmin):
  - Support Tier 3 uniquement
  - Ops critiques
```

## Troubleshooting

### "Permission denied" lors de la création de clé

**Vérifiez** :
1. Le rôle de la clé utilisée pour l'authentification
2. Que l'accountId cible correspond (pour admin)
3. Que le rôle demandé est autorisé

### Événements non visibles

**Vérifiez** :
1. Les scopes de la clé (`events:read` requis)
2. L'accountId des événements
3. Si des permissions cross-account sont nécessaires
4. Si les événements devraient être publics

### Impossible de créer un superadmin

**Solution** :
1. Utilisez une clé superadmin existante
2. Si aucune n'existe, utilisez `pnpm run init:superadmin`
3. Vérifiez que le script n'a pas déjà été exécuté

## API Reference

### Endpoints modifiés pour les rôles

Tous les endpoints respectent maintenant la hiérarchie des rôles :

| Endpoint | Comportement selon rôle |
|----------|------------------------|
| `POST /api/events` | Vérifie accountId sauf superadmin |
| `GET /api/events/stream` | Filtre par accountId + publics |
| `POST /api/events/query` | Filtre automatique sauf superadmin |
| `POST /api/keys` | Création selon règles de rôle |
| `GET /api/keys` | Liste selon visibilité du rôle |
| `DELETE /api/keys/:id` | Suppression selon permissions |