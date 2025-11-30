# GS Stream Digest - Documentation API

Documentation interactive de l'API publique GS Stream Digest, générée avec Redocly.

## 🚀 Développement local

```bash
# Installer les dépendances
npm install

# Prévisualiser la documentation (port 8080)
npm run dev

# Linter le fichier OpenAPI
npm run lint
```

## 📦 Build

```bash
# Générer la documentation statique
npm run build

# Bundler le fichier OpenAPI en JSON
npm run bundle
```

Les fichiers de build seront générés dans le dossier `dist/`.

## 🌐 Déploiement

La documentation est automatiquement déployée sur Vercel à chaque push sur `main`:

- **Production**: https://digest-docs.grand-shooting.com
- **Preview**: Généré automatiquement pour chaque PR

## 📝 Structure

```
apps/api-docs/
├── openapi.yaml      # Spécification OpenAPI 3.0
├── index.html        # Template HTML personnalisé
├── redocly.yaml      # Configuration Redocly
├── package.json      # Dépendances
└── dist/             # Build output (généré)
```

## 🔧 Configuration DNS

Configurer les enregistrements DNS pour `digest-docs.grand-shooting.com`:

```
Type: CNAME
Name: digest-docs
Value: cname.vercel-dns.com
```

## 📚 Documentation de l'API

### Endpoints disponibles

- `GET /api/v1/digests` - Lister tous les digests
- `GET /api/v1/digests/:id` - Récupérer un digest
- `GET /api/v1/templates` - Lister les templates
- `GET /api/v1/stats` - Obtenir les statistiques

### Authentication

Toutes les requêtes nécessitent une clé API:

```bash
curl -H "X-API-Key: gs_live_xxxx" \
  https://digest-api.grand-shooting.com/api/v1/digests
```

### Rate Limiting

- Limite: 100 requêtes/minute par clé API
- En-têtes de réponse: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## 🛠️ Mise à jour de la documentation

1. Modifier le fichier `openapi.yaml`
2. Tester localement avec `npm run dev`
3. Linter avec `npm run lint`
4. Commit et push sur `main`
5. Vercel déploie automatiquement

## 📖 Ressources

- [OpenAPI 3.0 Specification](https://spec.openapis.org/oas/v3.0.3)
- [Redocly CLI Documentation](https://redocly.com/docs/cli/)
- [Vercel Documentation](https://vercel.com/docs)
