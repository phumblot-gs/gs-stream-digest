# Conception des Permissions Avancées

## 🎯 Objectifs

1. **Restriction par accountId** : Un utilisateur ne peut accéder qu'aux événements de son accountId (par défaut)
2. **Rôle superadmin** : Un rôle spécial qui donne accès à tous les accountId
3. **Restriction par type d'événement** : Pouvoir restreindre l'accès à certains types d'événements pour un accountId spécifique

## 📊 Analyse de l'Existant

### Ce qui existe déjà

1. **PermissionEngine** : Fait déjà des vérifications par accountId
2. **Table `permission_rules`** : Stocke des conditions JSONB pour les permissions
3. **Champ `role` dans AuthUser** : Existe mais n'est pas utilisé pour les permissions
4. **Support des eventTypes** : Déjà présent dans `matchesConditions`

### Ce qui manque

1. Vérification du rôle superadmin
2. Système de restrictions par type d'événement pour un accountId
3. Filtrage automatique des événements lors des requêtes (query, stream)

## 🏗️ Architecture Proposée

### Principe : Séparation des Responsabilités

```
┌─────────────────┐
│ Authentication  │ → Identifie l'utilisateur (userId, accountId, role, scopes)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Authorization   │ → Vérifie les permissions (accountId, eventTypes, rôle)
│ (PermissionEngine)│
└─────────────────┘
```

**Règle importante** : L'authentification identifie QUI fait la requête, l'autorisation détermine CE QU'IL PEUT FAIRE.

## 🔐 1. Restriction par AccountId

### Comportement par défaut

**Règle** : Un utilisateur a accès uniquement aux événements de son `accountId` sauf si :
- Il a le rôle `superadmin`
- Il a des règles de permission explicites dans `permission_rules`

### Implémentation dans PermissionEngine

```typescript
// apps/api/src/services/permissions.ts

export class PermissionEngine {
  // Constantes pour les rôles
  private readonly SUPERADMIN_ROLE = 'superadmin';
  
  /**
   * Vérifie si un utilisateur peut accéder à un accountId
   */
  async canAccessAccount(user: User, accountId: string): Promise<boolean> {
    // Superadmin a accès à tout
    if (user.role === this.SUPERADMIN_ROLE) {
      return true;
    }
    
    // L'utilisateur a toujours accès à son propre accountId
    if (user.accountId === accountId) {
      return true;
    }
    
    // Vérifier les règles de permission explicites
    const rules = await this.db.query(
      `SELECT * FROM permission_rules 
       WHERE account_id = $1 AND user_id = $2`,
      [accountId, user.userId]
    );
    
    return rules.rows.length > 0;
  }
  
  /**
   * Récupère tous les accountId auxquels un utilisateur a accès
   */
  async getUserAccountIds(user: User): Promise<string[]> {
    // Superadmin a accès à tout → retourner null signifie "tous"
    if (user.role === this.SUPERADMIN_ROLE) {
      return []; // Tableau vide = pas de restriction
    }
    
    const accountIds = [user.accountId]; // Toujours son propre accountId
    
    // Ajouter les accountId depuis les règles de permission
    const result = await this.db.query(
      `SELECT DISTINCT account_id FROM permission_rules WHERE user_id = $1`,
      [user.userId]
    );
    
    result.rows.forEach((row: any) => {
      if (!accountIds.includes(row.account_id)) {
        accountIds.push(row.account_id);
      }
    });
    
    return accountIds;
  }
}
```

## 👑 2. Rôle Superadmin

### Définition

Le rôle `superadmin` donne accès complet à :
- ✅ Tous les accountId
- ✅ Tous les types d'événements
- ✅ Toutes les actions (read, write, stream, manage)

### ✅ Choix Validé : Stockage du Rôle

**Option 1 + Option 2** : Stockage hybride selon le type d'authentification

#### Option 1 : Dans le token OAuth/JWT (Pour les utilisateurs OAuth)
```json
{
  "sub": "user-uuid",
  "account_id": "account-uuid",
  "role": "superadmin",
  "scopes": ["events:read", "events:write", ...]
}
```

**Avantages** :
- Le rôle est déjà présent dans les tokens OAuth de Grand Shooting
- Pas besoin de requête supplémentaire en base
- Cohérent avec l'authentification OAuth

#### Option 2 : Dans la table `api_keys` (Pour les clés API)
```sql
ALTER TABLE api_keys ADD COLUMN role TEXT DEFAULT NULL;
```

**Avantages** :
- Permet d'attribuer un rôle spécifique à une clé API
- Indépendant du token OAuth
- Facile à gérer via l'API de gestion des clés

**Implémentation** :
- Les tokens OAuth/JWT : Le rôle est extrait depuis les claims JWT par `OAuthStrategy`
- Les clés API : Le rôle est lu depuis `api_keys.role` par `APIKeyStrategy`
- Les deux sont ensuite disponibles dans `AuthUser.role`

### Vérification du rôle superadmin

```typescript
// apps/api/src/services/permissions.ts

async canAccessAccount(user: User, accountId: string): Promise<boolean> {
  // Superadmin a accès à tout
  if (user.role === 'superadmin') {
    return true;
  }
  // ... reste de la logique
}

async canAccessEventType(user: User, accountId: string, eventType: string): Promise<boolean> {
  // Superadmin a accès à tous les types d'événements
  if (user.role === 'superadmin') {
    return true;
  }
  // ... vérification des restrictions
}
```

## 🎯 3. Restriction par Type d'Événement

### Cas d'usage

**Exemple** : Un utilisateur de l'accountId=34 devrait avoir accès uniquement aux événements de type `newImage` pour cet accountId.

### Options de conception

#### Option A : Utiliser la table `permission_rules` existante

**Avantages** :
- Pas besoin de nouvelle table
- Structure flexible avec JSONB
- Déjà en place

**Structure** :
```sql
-- Exemple de règle dans permission_rules
{
  "accountId": "34",
  "userId": "user-uuid",
  "conditions": {
    "eventTypes": ["newImage"],  -- Seulement ces types
    "allowedAccountIds": ["34"]   -- Seulement cet accountId
  },
  "actions": ["events:read", "events:stream"]
}
```

**Inconvénient** : La table `permission_rules` est conçue pour donner des permissions supplémentaires, pas pour restreindre.

#### ✅ Option B : Nouvelle table `event_access_rules` (VALIDÉE)

**Avantages** :
- Séparation claire des responsabilités
- Plus facile à comprendre et maintenir
- Permet des règles granulaires par accountId + eventType
- Performance optimale avec index sur (account_id, user_id)

**Structure** :
```sql
CREATE TABLE event_access_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- Restrictions
  allowed_event_types TEXT[] DEFAULT NULL, -- NULL = tous les types autorisés
  denied_event_types TEXT[] DEFAULT NULL,  -- Types explicitement interdits
  
  -- Métadonnées
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id, user_id)
);

CREATE INDEX idx_event_access_account_user ON event_access_rules(account_id, user_id);
CREATE INDEX idx_event_access_user ON event_access_rules(user_id);
```

**Exemple d'utilisation** :
```sql
-- User peut accéder uniquement à 'newImage' pour accountId=34
INSERT INTO event_access_rules (account_id, user_id, allowed_event_types)
VALUES ('34', 'user-uuid', ARRAY['newImage']);

-- User peut accéder à tous les types SAUF 'deletedImage' pour accountId=34
INSERT INTO event_access_rules (account_id, user_id, denied_event_types)
VALUES ('34', 'user-uuid', ARRAY['deletedImage']);
```

**Comportement** :
- Si `allowed_event_types` est NULL ou vide → Tous les types sont autorisés (sauf ceux dans `denied_event_types`)
- Si `allowed_event_types` contient des valeurs → Seulement ces types sont autorisés
- Si `denied_event_types` contient des valeurs → Ces types sont explicitement interdits (priorité sur `allowed_event_types`)

### Implémentation dans PermissionEngine

```typescript
// apps/api/src/services/permissions.ts

/**
 * Vérifie si un utilisateur peut accéder à un type d'événement pour un accountId
 */
async canAccessEventType(
  user: User, 
  accountId: string, 
  eventType: string
): Promise<boolean> {
  // Superadmin a accès à tout
  if (user.role === 'superadmin') {
    return true;
  }
  
  // Vérifier d'abord l'accès à l'accountId
  if (!(await this.canAccessAccount(user, accountId))) {
    return false;
  }
  
  // Récupérer les règles d'accès aux événements
  const rules = await this.db.query(
    `SELECT allowed_event_types, denied_event_types
     FROM event_access_rules
     WHERE account_id = $1 AND user_id = $2`,
    [accountId, user.userId]
  );
  
  // Si aucune règle, accès complet (comportement par défaut)
  if (rules.rows.length === 0) {
    return true;
  }
  
  const rule = rules.rows[0];
  
  // Vérifier les types interdits
  if (rule.denied_event_types && rule.denied_event_types.includes(eventType)) {
    return false;
  }
  
  // Vérifier les types autorisés
  if (rule.allowed_event_types && rule.allowed_event_types.length > 0) {
    return rule.allowed_event_types.includes(eventType);
  }
  
  // Si allowed_event_types est NULL ou vide, tous les types sont autorisés
  return true;
}

/**
 * Filtre les types d'événements autorisés pour un utilisateur et un accountId
 */
async getAllowedEventTypes(user: User, accountId: string): Promise<string[] | null> {
  // Superadmin → null signifie "tous les types"
  if (user.role === 'superadmin') {
    return null;
  }
  
  // Vérifier l'accès à l'accountId
  if (!(await this.canAccessAccount(user, accountId))) {
    return [];
  }
  
  const rules = await this.db.query(
    `SELECT allowed_event_types, denied_event_types
     FROM event_access_rules
     WHERE account_id = $1 AND user_id = $2`,
    [accountId, user.userId]
  );
  
  if (rules.rows.length === 0) {
    return null; // Pas de restriction
  }
  
  const rule = rules.rows[0];
  
  // Si des types sont explicitement autorisés, les retourner
  if (rule.allowed_event_types && rule.allowed_event_types.length > 0) {
    return rule.allowed_event_types;
  }
  
  // Sinon, null = tous les types autorisés (sauf ceux dans denied_event_types)
  return null;
}
```

## 🔄 Intégration dans les Endpoints

### 1. Endpoint POST /api/events (Publier)

```typescript
app.post('/api/events', authMiddleware, async (c) => {
  const user = c.get('user') as AuthUser;
  const validated = EventSchemaZ.parse({...});
  
  // Vérifier l'accès à l'accountId
  if (!(await permissions.canAccessAccount(user, validated.scope.accountId))) {
    return c.json({ error: 'Forbidden', message: 'Access denied to this account' }, 403);
  }
  
  // Vérifier l'accès au type d'événement (optionnel pour la publication)
  // (On pourrait vouloir restreindre la publication aussi)
  
  // ... reste du code
});
```

### 2. Endpoint POST /api/events/query (Lire)

```typescript
app.post('/api/events/query', authMiddleware, async (c) => {
  const user = c.get('user') as AuthUser;
  const { filters, timeRange, limit, cursor } = await c.req.json();
  
  // Récupérer les accountId autorisés
  const allowedAccountIds = await permissions.getUserAccountIds(user);
  
  // Si superadmin, allowedAccountIds est vide = pas de restriction
  const accountIds = user.role === 'superadmin' 
    ? (filters?.accountIds || null)  // Tous les accountId si pas de filtre
    : (filters?.accountIds || allowedAccountIds).filter(id => 
        allowedAccountIds.length === 0 || allowedAccountIds.includes(id)
      );
  
  // Filtrer les types d'événements autorisés pour chaque accountId
  const eventTypes = filters?.eventTypes || [];
  
  // Pour chaque accountId, récupérer les types autorisés
  const allowedEventTypesByAccount: Record<string, string[] | null> = {};
  
  for (const accountId of accountIds) {
    const allowedTypes = await permissions.getAllowedEventTypes(user, accountId);
    allowedEventTypesByAccount[accountId] = allowedTypes;
  }
  
  // Construire la liste finale des types autorisés
  let finalEventTypes: string[] | undefined = undefined;
  
  if (eventTypes.length > 0) {
    // Intersection entre les types demandés et les types autorisés
    finalEventTypes = eventTypes.filter(eventType => {
      return accountIds.some(accountId => {
        const allowed = allowedEventTypesByAccount[accountId];
        return allowed === null || allowed.includes(eventType);
      });
    });
  } else {
    // Si aucun type spécifié, utiliser tous les types autorisés
    const allAllowedTypes = new Set<string>();
    Object.values(allowedEventTypesByAccount).forEach(types => {
      if (types === null) {
        // Si null, tous les types sont autorisés pour cet accountId
        // On ne peut pas filtrer ici, donc on laisse passer
        return;
      }
      types.forEach(type => allAllowedTypes.add(type));
    });
    
    if (allAllowedTypes.size > 0) {
      finalEventTypes = Array.from(allAllowedTypes);
    }
  }
  
  // Requête avec les filtres
  const events = await eventDb.queryEvents({
    accountIds: accountIds.length > 0 ? accountIds : undefined,
    eventTypes: finalEventTypes,
    timeRange,
    limit,
    cursor
  });
  
  // Filtrer les résultats pour s'assurer qu'on ne retourne que ce qui est autorisé
  const filteredEvents = events.filter((event: any) => {
    const accountId = event.scope_account_id;
    const eventType = event.event_type;
    
    const allowedTypes = allowedEventTypesByAccount[accountId];
    if (allowedTypes === null) {
      return true; // Tous les types autorisés
    }
    return allowedTypes.includes(eventType);
  });
  
  return c.json({
    events: filteredEvents.map(/* ... */),
    cursor,
    hasMore: filteredEvents.length === limit
  });
});
```

### 3. Endpoint POST /api/events/stream (Stream temps réel)

```typescript
app.post('/api/events/stream', authMiddleware, async (c) => {
  const user = c.get('user') as AuthUser;
  const { filters } = await c.req.json();
  
  // Même logique que pour query, mais appliquée au stream NATS
  const allowedAccountIds = await permissions.getUserAccountIds(user);
  
  // Construire les filtres NATS avec les restrictions
  const natsFilters = {
    accountIds: user.role === 'superadmin' 
      ? filters?.accountIds 
      : (filters?.accountIds || allowedAccountIds).filter(id =>
          allowedAccountIds.length === 0 || allowedAccountIds.includes(id)
        ),
    eventTypes: filters?.eventTypes // Filtrer côté NATS si possible
  };
  
  // ... reste du code
});
```

## 📊 Schéma de Base de Données Complet

### Migration à créer : `003_advanced_permissions.sql`

```sql
-- Ajouter le rôle aux clés API
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS role TEXT DEFAULT NULL;

-- Table pour les restrictions d'accès aux événements
CREATE TABLE IF NOT EXISTS event_access_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- Restrictions
  allowed_event_types TEXT[] DEFAULT NULL, -- NULL = tous les types autorisés
  denied_event_types TEXT[] DEFAULT NULL,  -- Types explicitement interdits
  
  -- Métadonnées
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_access_account_user ON event_access_rules(account_id, user_id);
CREATE INDEX IF NOT EXISTS idx_event_access_user ON event_access_rules(user_id);

-- Commentaires pour documentation
COMMENT ON TABLE event_access_rules IS 'Règles de restriction d''accès aux types d''événements par accountId et user';
COMMENT ON COLUMN event_access_rules.allowed_event_types IS 'Liste des types d''événements autorisés. NULL = tous autorisés';
COMMENT ON COLUMN event_access_rules.denied_event_types IS 'Liste des types d''événements interdits';
COMMENT ON COLUMN api_keys.role IS 'Rôle de l''utilisateur (superadmin, admin, user, etc.)';
```

## 🎨 Exemples d'Utilisation

### Exemple 1 : Utilisateur normal (accountId=34)

```sql
-- Pas de règle spéciale → accès à tous les événements de son accountId
-- Comportement par défaut
```

### Exemple 2 : Utilisateur avec restriction sur les types d'événements

```sql
-- User peut accéder uniquement à 'newImage' pour accountId=34
INSERT INTO event_access_rules (account_id, user_id, allowed_event_types)
VALUES ('34', 'user-uuid', ARRAY['newImage']);
```

### Exemple 3 : Superadmin

```sql
-- Le rôle est dans le token OAuth ou dans api_keys.role
-- Pas besoin de règles spéciales → accès à tout automatiquement
```

### Exemple 4 : Utilisateur avec accès à plusieurs accountId

```sql
-- Accès à accountId=34 avec restriction sur les types
INSERT INTO event_access_rules (account_id, user_id, allowed_event_types)
VALUES ('34', 'user-uuid', ARRAY['newImage']);

-- Accès à accountId=56 sans restriction
-- (pas de règle = accès complet à tous les types)
```

## ✅ Avantages de cette Approche

1. **Séparation claire** : Authentification vs Autorisation
2. **Flexibilité** : Supporte les cas simples et complexes
3. **Performance** : Filtrage au niveau de la base de données
4. **Extensibilité** : Facile d'ajouter de nouvelles restrictions
5. **Sécurité** : Principe du moindre privilège par défaut

## 🔐 Sécurité

### Bonnes pratiques

1. **Par défaut, restriction** : Un utilisateur n'a accès qu'à son accountId
2. **Superadmin explicite** : Le rôle doit être explicitement défini
3. **Validation stricte** : Toujours vérifier les permissions avant d'autoriser
4. **Logging** : Logger les tentatives d'accès refusées
5. **Audit** : Traçabilité des règles de permission

## 🚀 Prochaines Étapes

1. ✅ Créer la migration `003_advanced_permissions.sql`
2. ✅ Modifier `PermissionEngine` pour supporter les nouvelles fonctionnalités
3. ✅ Ajouter le support du rôle dans `OAuthStrategy` et `APIKeyStrategy`
4. ✅ Modifier les endpoints pour utiliser les nouvelles vérifications
5. ✅ Créer des endpoints pour gérer les `event_access_rules`
6. ✅ Ajouter des tests unitaires et d'intégration
7. ✅ Documenter l'API pour les développeurs

---

## 💡 Réponse à tes Questions

### Est-ce faisable ?

**Oui, absolument !** L'architecture actuelle est déjà bien conçue pour supporter ces fonctionnalités. Il faut :
- Ajouter une table `event_access_rules` pour les restrictions par type
- Modifier `PermissionEngine` pour vérifier le rôle superadmin
- Intégrer les vérifications dans les endpoints

### Y a-t-il une meilleure façon de faire ?

**Cette approche est bonne** car :
- ✅ Séparation claire entre authentification et autorisation
- ✅ Utilise les structures existantes (permission_rules, role)
- ✅ Flexible et extensible
- ✅ Performance optimale avec filtrage en base

**Alternative possible** : Utiliser uniquement `permission_rules` avec des conditions JSONB plus complexes, mais cela serait moins clair et moins performant.

### Où placer cette logique ?

**Dans `PermissionEngine`** (pas dans l'authentification) car :
- L'authentification identifie QUI fait la requête
- L'autorisation détermine CE QU'IL PEUT FAIRE
- C'est déjà là que se trouve la logique de permissions

