-- Script pour créer l'utilisateur digest_user avec les permissions appropriées
-- À exécuter sur staging et production

-- Générer un mot de passe fort (à remplacer lors de l'exécution)
-- Staging password: DigestUser2025Staging!
-- Production password: DigestUser2025Production!

-- Créer l'utilisateur
CREATE USER digest_user WITH PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';

-- Accorder les permissions de connexion
GRANT CONNECT ON DATABASE "fly-db" TO digest_user;

-- Accorder l'utilisation du schéma public
GRANT USAGE ON SCHEMA public TO digest_user;

-- Accorder les permissions sur les tables (pour les tables digest_* uniquement)
-- Ces permissions seront données après la création des tables

-- Permissions futures pour les nouvelles tables commençant par digest_
-- Note: PostgreSQL ne supporte pas les permissions basées sur un préfixe de nom de table
-- On devra accorder les permissions explicitement après la création des tables

-- Afficher les permissions
\du digest_user
