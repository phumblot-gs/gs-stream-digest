# Guide de déploiement Vercel - Documentation API

Ce guide explique comment déployer la documentation API sur Vercel avec le domaine `digest-docs.grand-shooting.com`.

## Pré-requis

- Compte Vercel actif
- Accès au gestionnaire DNS de `grand-shooting.com`
- Vercel CLI installé (`npm install -g vercel`)

## Étape 1: Configuration DNS

Configurer un enregistrement CNAME pour le sous-domaine:

```
Type: CNAME
Nom: digest-docs
Valeur: cname.vercel-dns.com
TTL: Auto ou 3600
```

## Étape 2: Premier déploiement manuel (Initialization)

### Installation de Vercel CLI

```bash
npm install -g vercel
```

### Connexion et déploiement initial

```bash
# Se placer dans le dossier api-docs
cd apps/api-docs

# Se connecter à Vercel (si pas déjà fait)
vercel login

# Premier déploiement en production
vercel --prod
```

Lors du premier déploiement, Vercel va demander:
- **Set up and deploy?** Yes
- **Which scope?** Choisir votre équipe/compte
- **Link to existing project?** No (première fois) ou Yes si le projet existe
- **Project name?** gs-stream-digest-docs (ou autre nom de votre choix)
- **Directory?** ./ (laisser par défaut)
- **Override settings?** No

### Important: Récupérer les identifiants

Après le déploiement, récupérer les identifiants nécessaires pour le CI/CD:

```bash
# Obtenir l'Organization ID
vercel whoami
# Notez l'ID affiché

# Les autres IDs sont disponibles dans .vercel/project.json
cat .vercel/project.json
```

Vous aurez besoin de:
1. **VERCEL_TOKEN**: Token d'accès personnel (créé dans Account Settings > Tokens)
2. **VERCEL_ORG_ID**: ID de votre organisation/compte
3. **VERCEL_PROJECT_ID**: ID du projet (dans .vercel/project.json)

## Étape 3: Configuration des GitHub Secrets

Ajouter les secrets dans votre repository GitHub:

1. Aller dans **Settings** > **Secrets and variables** > **Actions**
2. Cliquer sur **New repository secret**
3. Ajouter les 3 secrets:

```
VERCEL_TOKEN: votre_token_personnel
VERCEL_ORG_ID: votre_org_id
VERCEL_PROJECT_ID: votre_project_id
```

### Créer un token Vercel

1. Aller sur [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Cliquer sur **Create Token**
3. Nom: `GitHub Actions - gs-stream-digest-docs`
4. Scope: Full Account
5. Expiration: No expiration (ou selon vos préférences)
6. Copier le token (il ne sera affiché qu'une fois)

## Étape 4: Configuration du domaine personnalisé

### Via le Dashboard Vercel

1. Aller dans le projet déployé sur [vercel.com/dashboard](https://vercel.com/dashboard)
2. Onglet **Settings** > **Domains**
3. Ajouter le domaine: `digest-docs.grand-shooting.com`
4. Vercel va vérifier la configuration DNS
5. Attendre la propagation DNS (peut prendre jusqu'à 24h)

### Via CLI

```bash
vercel domains add digest-docs.grand-shooting.com
```

## Étape 5: Configuration des environnements

Vercel créera automatiquement 3 environnements:

- **Production** (`main` branch): `digest-docs.grand-shooting.com`
- **Staging** (`staging` branch): URL preview Vercel
- **Preview** (Pull Requests): URL preview unique par PR

## Étape 6: Vérification

Une fois le déploiement terminé:

```bash
# Vérifier que la documentation est accessible
curl -I https://digest-docs.grand-shooting.com

# Vérifier le certificat SSL (auto-géré par Vercel)
curl -vI https://digest-docs.grand-shooting.com 2>&1 | grep "SSL certificate"
```

Tester dans le navigateur:
- Page d'accueil avec introduction
- Documentation interactive Redoc
- Exemples de code
- Responsive design

## Déploiement automatique (CI/CD)

Une fois les GitHub Secrets configurés, le workflow GitHub Actions déploiera automatiquement:

```
Push to main → Build → Deploy to Production → digest-docs.grand-shooting.com
Push to staging → Build → Deploy to Staging → Vercel preview URL
Pull Request → Build → Deploy to Preview → Vercel preview URL unique
```

Le workflow inclut:
- Validation du fichier OpenAPI
- Build de la documentation
- Tests de lint
- Déploiement sur l'environnement approprié
- Commentaire automatique sur les PRs avec l'URL de preview

## Mise à jour de la documentation

Pour mettre à jour la documentation:

1. Modifier `openapi.yaml`
2. Tester localement:
   ```bash
   cd apps/api-docs
   npm run dev    # Preview sur http://localhost:8080
   npm run lint   # Vérifier la validité
   npm run build  # Tester le build
   ```
3. Commit et push:
   ```bash
   git add apps/api-docs/openapi.yaml
   git commit -m "docs: update API endpoints"
   git push origin main
   ```
4. GitHub Actions déploie automatiquement sur Vercel (1-2 minutes)
5. Vérifier sur `digest-docs.grand-shooting.com`

## Configuration avancée

### Variables d'environnement (optionnel)

Si vous avez besoin de variables d'environnement, les configurer dans Vercel:

```bash
# Via CLI
vercel env add VARIABLE_NAME

# Ou via Dashboard: Project Settings > Environment Variables
```

### Redirections personnalisées

Modifier [vercel.json](./vercel.json) pour ajouter des redirections:

```json
{
  "redirects": [
    {
      "source": "/docs",
      "destination": "/",
      "permanent": true
    }
  ]
}
```

### Analytics Vercel (optionnel)

Activer les analytics pour suivre le trafic:

1. Dashboard Vercel > Project Settings > Analytics
2. Enable Analytics
3. Statistiques disponibles dans l'onglet Analytics

## Monitoring

### Logs de déploiement

```bash
# Voir les logs du dernier déploiement
vercel logs

# Logs en temps réel
vercel logs --follow

# Logs d'un déploiement spécifique
vercel logs [deployment-url]
```

### Status du projet

```bash
# Status du dernier déploiement
vercel inspect

# Lister tous les déploiements
vercel ls
```

## Rollback

En cas de problème, revenir à une version précédente:

### Via Dashboard

1. Dashboard Vercel > Deployments
2. Trouver le déploiement précédent fonctionnel
3. Cliquer sur **"..."** > **"Promote to Production"**

### Via CLI

```bash
# Lister les déploiements
vercel ls

# Promouvoir un déploiement spécifique en production
vercel promote [deployment-url]
```

## Troubleshooting

### Build échoue

```bash
# Tester le build localement
cd apps/api-docs
npm run lint
npm run build

# Vérifier les erreurs OpenAPI
npm run lint -- --format stylish
```

### DNS ne se résout pas

```bash
# Vérifier la configuration DNS
dig digest-docs.grand-shooting.com
nslookup digest-docs.grand-shooting.com

# Attendre la propagation DNS (jusqu'à 24h)
```

### GitHub Actions échoue

1. Vérifier que les secrets sont correctement configurés
2. Vérifier les logs dans Actions > Deploy API Documentation
3. Vérifier que `package-lock.json` existe dans `apps/api-docs/`

## Ressources

- [Documentation Vercel](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Redocly CLI Docs](https://redocly.com/docs/cli/)
- [OpenAPI 3.0 Spec](https://spec.openapis.org/oas/v3.0.3)
- [GitHub Actions with Vercel](https://vercel.com/guides/how-can-i-use-github-actions-with-vercel)

## Checklist de déploiement

- [ ] DNS configuré (CNAME vers `cname.vercel-dns.com`)
- [ ] Vercel CLI installé
- [ ] Premier déploiement manuel réussi (`vercel --prod`)
- [ ] Token Vercel créé
- [ ] GitHub Secrets configurés (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
- [ ] Domaine personnalisé ajouté dans Vercel
- [ ] SSL actif (vérifié via `curl -I`)
- [ ] Build local réussi (`npm run build`)
- [ ] Lint passé (`npm run lint`)
- [ ] GitHub Actions testé (push sur main ou staging)
- [ ] Documentation accessible publiquement sur `digest-docs.grand-shooting.com`
- [ ] Preview URLs fonctionnelles sur les PRs

## Maintenance

### Mise à jour de Redocly CLI

```bash
cd apps/api-docs
npm update @redocly/cli
npm run build  # Tester le build
git commit -am "chore: update Redocly CLI"
git push
```

### Nettoyage des anciens déploiements

Vercel garde automatiquement un historique. Pour nettoyer:

```bash
# Via CLI (garder les 10 derniers)
vercel remove [old-deployment-url] --yes

# Ou via Dashboard: Deployments > ... > Delete
```
