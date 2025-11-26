# Guide de Contribution - GS Stream Digest

## 📋 Table des matières

- [Code de conduite](#code-de-conduite)
- [Comment contribuer](#comment-contribuer)
- [Processus de développement](#processus-de-développement)
- [Standards de code](#standards-de-code)
- [Tests](#tests)
- [Documentation](#documentation)
- [Pull Requests](#pull-requests)

## Code de conduite

### Notre engagement

Nous nous engageons à maintenir un environnement ouvert et accueillant pour tous les contributeurs, indépendamment de leur niveau d'expérience, genre, identité et expression de genre, orientation sexuelle, handicap, apparence personnelle, taille corporelle, race, ethnicité, âge, religion ou nationalité.

### Nos standards

Exemples de comportements contribuant à créer un environnement positif :

- Utiliser un langage accueillant et inclusif
- Respecter les différents points de vue et expériences
- Accepter gracieusement les critiques constructives
- Se concentrer sur ce qui est le mieux pour la communauté
- Faire preuve d'empathie envers les autres membres

### Responsabilités

Les mainteneurs du projet sont responsables de clarifier les standards de comportement acceptable et sont censés prendre des actions correctives appropriées et justes en réponse à tout comportement inacceptable.

## Comment contribuer

### 🐛 Reporter des bugs

Avant de créer un rapport de bug, vérifiez que le problème n'a pas déjà été signalé dans les [issues](https://github.com/grandshooting/gs-stream-digest/issues).

**Pour signaler un bug :**

1. Utilisez le template de bug report
2. Incluez un titre clair et descriptif
3. Décrivez les étapes exactes pour reproduire le problème
4. Fournissez les informations suivantes :
   - Version de Node.js
   - Système d'exploitation
   - Logs d'erreur complets
   - Screenshots si applicable
5. Expliquez le comportement attendu vs observé

### 💡 Suggérer des améliorations

Les suggestions d'amélioration sont les bienvenues !

**Pour suggérer une amélioration :**

1. Vérifiez que l'idée n'a pas déjà été proposée
2. Créez une issue avec le tag `enhancement`
3. Décrivez clairement la fonctionnalité
4. Expliquez pourquoi elle serait utile
5. Proposez une implémentation si possible

### 🔧 Soumettre des changements

1. **Fork** le repository
2. **Clone** votre fork localement
3. **Créez** une branche pour votre feature/fix
4. **Développez** votre changement
5. **Testez** votre code
6. **Committez** avec des messages clairs
7. **Push** vers votre fork
8. **Créez** une Pull Request

## Processus de développement

### 1. Configuration de l'environnement

```bash
# Cloner votre fork
git clone https://github.com/YOUR_USERNAME/gs-stream-digest.git
cd gs-stream-digest

# Ajouter le repo upstream
git remote add upstream https://github.com/grandshooting/gs-stream-digest.git

# Installer les dépendances
npm install

# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# Initialiser la base de données
npm run db:generate
npm run db:migrate

# Lancer en développement
npm run dev
```

### 2. Workflow Git

```bash
# Mettre à jour votre fork
git checkout main
git pull upstream main
git push origin main

# Créer une branche pour votre feature
git checkout -b feature/nom-de-la-feature

# Après vos changements
git add .
git commit -m "feat: description du changement"
git push origin feature/nom-de-la-feature
```

### 3. Conventions de nommage des branches

- `feature/` - Nouvelles fonctionnalités
- `fix/` - Corrections de bugs
- `docs/` - Documentation uniquement
- `refactor/` - Refactoring du code
- `test/` - Ajout ou modification de tests
- `perf/` - Améliorations de performance

### 4. Format des commits

Nous suivons [Conventional Commits](https://www.conventionalcommits.org/) :

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types :**
- `feat` - Nouvelle fonctionnalité
- `fix` - Correction de bug
- `docs` - Documentation
- `style` - Formatage (ne change pas la logique)
- `refactor` - Refactoring
- `perf` - Amélioration des performances
- `test` - Ajout de tests
- `chore` - Maintenance

**Exemples :**
```bash
feat(digest): add custom filter for event data
fix(email): correct template variable escaping
docs(api): update authentication documentation
refactor(scheduler): simplify cron expression parsing
```

## Standards de code

### TypeScript

```typescript
// ✅ Bon - Types explicites
interface DigestConfig {
  name: string;
  schedule: string;
  recipients: string[];
}

function createDigest(config: DigestConfig): Promise<Digest> {
  // ...
}

// ❌ Mauvais - Pas de types
function createDigest(config) {
  // ...
}
```

### Conventions générales

1. **Indentation** : 2 espaces (pas de tabs)
2. **Longueur de ligne** : 100 caractères max
3. **Point-virgules** : Toujours les utiliser
4. **Quotes** : Simple quotes pour les strings
5. **Trailing commas** : Toujours en multilignes
6. **Nommage** :
   - `camelCase` pour les variables et fonctions
   - `PascalCase` pour les classes et types
   - `UPPER_SNAKE_CASE` pour les constantes
   - `kebab-case` pour les fichiers

### ESLint et Prettier

Le projet utilise ESLint et Prettier. Avant de committer :

```bash
# Linter
npm run lint

# Formatage
npm run format

# Type checking
npm run type-check
```

### Structure des fichiers

```typescript
// 1. Imports externes
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

// 2. Imports internes
import { DigestService } from '@/services/digest';
import { requireAuth } from '@/middleware/auth';

// 3. Types et interfaces
interface DigestController {
  list: (request: Request, reply: Reply) => Promise<void>;
}

// 4. Constantes
const DEFAULT_LIMIT = 20;

// 5. Fonctions/Classes principales
export class DigestController implements DigestController {
  // ...
}

// 6. Exports
export default DigestController;
```

## Tests

### Structure des tests

```typescript
// digest.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { DigestService } from './digest.service';

describe('DigestService', () => {
  let service: DigestService;

  beforeEach(() => {
    service = new DigestService();
  });

  describe('createDigest', () => {
    it('should create a digest with valid config', async () => {
      // Arrange
      const config = { /* ... */ };

      // Act
      const result = await service.createDigest(config);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe(config.name);
    });

    it('should throw error with invalid config', async () => {
      // ...
    });
  });
});
```

### Exécuter les tests

```bash
# Tests unitaires
npm test

# Tests avec coverage
npm run test:coverage

# Tests en mode watch
npm run test:watch

# Tests d'intégration
npm run test:integration

# Tests E2E
npm run test:e2e
```

### Couverture de code

Nous visons une couverture minimale de :
- 80% pour les statements
- 75% pour les branches
- 80% pour les fonctions
- 80% pour les lignes

## Documentation

### Documentation du code

```typescript
/**
 * Crée un nouveau digest avec la configuration fournie
 *
 * @param config - Configuration du digest
 * @param userId - ID de l'utilisateur créateur
 * @returns Le digest créé
 * @throws {ValidationError} Si la configuration est invalide
 * @throws {AuthorizationError} Si l'utilisateur n'a pas les droits
 *
 * @example
 * ```typescript
 * const digest = await createDigest({
 *   name: 'Daily Summary',
 *   schedule: '0 9 * * *',
 *   recipients: ['team@example.com']
 * }, 'usr_123');
 * ```
 */
export async function createDigest(
  config: DigestConfig,
  userId: string
): Promise<Digest> {
  // ...
}
```

### Documentation API

Utilisez les schémas Fastify pour documenter automatiquement les endpoints :

```typescript
const createDigestSchema = {
  description: 'Créer un nouveau digest',
  tags: ['digests'],
  body: z.object({
    name: z.string().min(1).max(100),
    schedule: z.string(),
    recipients: z.array(z.string().email())
  }),
  response: {
    201: DigestResponseSchema,
    400: ErrorResponseSchema
  }
};

fastify.post('/digests', {
  schema: createDigestSchema,
  preHandler: requireAuth()
}, handler);
```

### README et guides

- Mettez à jour le README pour les changements majeurs
- Ajoutez des guides dans `/docs` pour les nouvelles fonctionnalités
- Incluez des exemples de code pratiques
- Gardez la documentation synchronisée avec le code

## Pull Requests

### Checklist avant PR

- [ ] Code testé localement
- [ ] Tests unitaires ajoutés/mis à jour
- [ ] Documentation mise à jour
- [ ] Lint et formatage passés
- [ ] Build réussi (`npm run build`)
- [ ] Changelog mis à jour si nécessaire
- [ ] PR liée à une issue

### Template de PR

```markdown
## Description
Brève description des changements

## Type de changement
- [ ] Bug fix
- [ ] Nouvelle fonctionnalité
- [ ] Breaking change
- [ ] Documentation

## Tests
- [ ] Tests existants passent
- [ ] Nouveaux tests ajoutés
- [ ] Tests manuels effectués

## Screenshots
Si applicable

## Checklist
- [ ] Code suit les conventions
- [ ] Auto-review effectuée
- [ ] Documentation mise à jour
- [ ] Pas de warnings
```

### Processus de review

1. **Auto-review** : Relisez votre code avant de créer la PR
2. **CI/CD** : Assurez-vous que tous les checks passent
3. **Review** : Au moins 1 approbation requise
4. **Feedback** : Répondez aux commentaires de manière constructive
5. **Merge** : Squash and merge pour un historique propre

### Critères de review

Les reviewers vérifieront :

- **Fonctionnalité** : Le code fait-il ce qu'il est censé faire ?
- **Design** : L'architecture est-elle appropriée ?
- **Complexité** : Le code est-il plus complexe que nécessaire ?
- **Tests** : Les tests sont-ils suffisants et pertinents ?
- **Nommage** : Les noms sont-ils clairs et descriptifs ?
- **Commentaires** : Le code complexe est-il documenté ?
- **Style** : Le code suit-il les conventions ?
- **Performance** : Y a-t-il des problèmes de performance évidents ?
- **Sécurité** : Y a-t-il des failles de sécurité ?

## 🏷️ Labels des issues

| Label | Description |
|-------|-------------|
| `bug` | Quelque chose ne fonctionne pas |
| `enhancement` | Nouvelle fonctionnalité ou amélioration |
| `documentation` | Amélioration de la documentation |
| `good first issue` | Bon pour les nouveaux contributeurs |
| `help wanted` | Aide externe appréciée |
| `question` | Demande d'information |
| `wontfix` | Ne sera pas traité |
| `duplicate` | Issue déjà existante |
| `invalid` | Ne semble pas correct |

## 📞 Contact

- **Questions générales** : Ouvrir une issue avec le tag `question`
- **Sécurité** : security@grand-shooting.com
- **Slack** : [#gs-stream-digest](https://grandshooting.slack.com/channels/gs-stream-digest)
- **Email** : digest-dev@grand-shooting.com

## 🙏 Remerciements

Merci de contribuer à GS Stream Digest ! Votre aide est précieuse pour améliorer le projet.

---

*Guide de contribution v1.0.0 - Grand Shooting © 2024*