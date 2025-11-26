# 🎯 Configuration SSO SAML - Configuration Finale

**Date** : 30 septembre 2025
**Status** : ✅ Prêt pour configuration IdP

---

## 📊 Récapitulatif des environnements

| Environnement | Projet Supabase | URL | Provider ID | Status |
|--------------|-----------------|-----|-------------|--------|
| **Dev/Staging** | `wlctowxjygyqzrooiemw` | `m1-api.grand-shooting.com` | `abe9d65e-e070-4a93-884b-2f663e926816` | ✅ OK |
| **Production** | `vxzkojrjjlssginmqrfq` | `vxzkojrjjlssginmqrfq.supabase.co` | `bfd4ae93-7b9d-444b-94d3-1962dd0d2dad` | ✅ OK |

---

## 🔧 Configuration de l'Identity Provider (IdP) Grand Shooting

Vous devez créer **2 configurations SAML** dans votre IdP Grand Shooting :

### **1️⃣ Configuration PRODUCTION**

| Paramètre | Valeur |
|-----------|--------|
| **Nom** | Sourcing - Production |
| **Entity ID (Audience)** | `https://vxzkojrjjlssginmqrfq.supabase.co/auth/v1/sso/saml/metadata` |
| **ACS URL** | `https://vxzkojrjjlssginmqrfq.supabase.co/auth/v1/sso/saml/acs` |
| **NameID Format** | `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress` |
| **Sign Assertions** | ✅ Oui |

**Attributs SAML à envoyer** :
```xml
<saml:Attribute Name="email">
  <saml:AttributeValue>user@example.com</saml:AttributeValue>
</saml:Attribute>

<saml:Attribute Name="firstname">
  <saml:AttributeValue>John</saml:AttributeValue>
</saml:Attribute>

<saml:Attribute Name="lastname">
  <saml:AttributeValue>Doe</saml:AttributeValue>
</saml:Attribute>
```

---

### **2️⃣ Configuration DEV/STAGING**

| Paramètre | Valeur |
|-----------|--------|
| **Nom** | Sourcing - Dev/Staging |
| **Entity ID (Audience)** | `https://m1-api.grand-shooting.com/auth/v1/sso/saml/metadata` |
| **ACS URL** | `https://m1-api.grand-shooting.com/auth/v1/sso/saml/acs` |
| **NameID Format** | `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress` |
| **Sign Assertions** | ✅ Oui |

**Attributs SAML à envoyer** : (identiques à production)
```xml
<saml:Attribute Name="email">
  <saml:AttributeValue>user@example.com</saml:AttributeValue>
</saml:Attribute>

<saml:Attribute Name="firstname">
  <saml:AttributeValue>John</saml:AttributeValue>
</saml:Attribute>

<saml:Attribute Name="lastname">
  <saml:AttributeValue>Doe</saml:AttributeValue>
</saml:Attribute>
```

---

## ✅ Configuration déjà effectuée côté Supabase

### **Dev/Staging** ✅
- ✅ Provider SSO créé
- ✅ Attribute Mapping configuré
- ✅ `.env.development` mis à jour
- ✅ Metadata SAML correct (sans duplication)

### **Production** ✅
- ✅ Provider SSO créé (sans custom domain)
- ✅ Attribute Mapping configuré
- ✅ `.env.production` mis à jour
- ✅ URL Supabase directe utilisée

---

## 📁 Fichiers de configuration

### **`.env.development`**
```bash
VITE_SUPABASE_PROJECT_ID="wlctowxjygyqzrooiemw"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://m1-api.grand-shooting.com"
VITE_SSO_PROVIDER_ID="abe9d65e-e070-4a93-884b-2f663e926816"
```

### **`.env.production`**
```bash
VITE_SUPABASE_PROJECT_ID="vxzkojrjjlssginmqrfq"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://vxzkojrjjlssginmqrfq.supabase.co"
VITE_SSO_PROVIDER_ID="bfd4ae93-7b9d-444b-94d3-1962dd0d2dad"
```

---

## 🧪 Comment tester

### **Dev/Staging**
```bash
npm run dev
```
Puis allez sur http://localhost:8080/ et testez la connexion SSO.

### **Production**
```bash
npm run build
# Déployez sur Vercel/votre environnement de production
```

---

## 🎉 Prochaines étapes

1. **Configurer l'IdP Grand Shooting** avec les 2 configurations SAML ci-dessus
2. **Tester l'authentification** sur dev/staging
3. **Tester l'authentification** sur production
4. **Vérifier** que les utilisateurs sont bien créés dans Supabase après connexion

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs dans la console du navigateur
2. Exécutez le script de diagnostic : `./check-saml-config.sh YOUR_TOKEN`
3. Vérifiez que l'Audience dans l'assertion SAML correspond aux Entity ID configurés

---

## 📚 Documentation complète

- [docs/SSO_CONFIGURATION.md](docs/SSO_CONFIGURATION.md) - Documentation détaillée
- [check-saml-config.sh](check-saml-config.sh) - Script de diagnostic
- [setup-sso-dev-staging.sh](setup-sso-dev-staging.sh) - Script de setup dev/staging
- [final-fix-production-sso.sh](final-fix-production-sso.sh) - Script de setup production

---

**✅ La configuration SSO est maintenant prête. Il ne reste plus qu'à configurer l'IdP !**
