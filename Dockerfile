# Dockerfile multi-stage pour frontend Next.js + backend Fastify
FROM node:20-alpine AS base

# Installation des dépendances nécessaires
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copier les fichiers de configuration du monorepo
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.json ./

# Copier tous les packages et apps
COPY apps ./apps
COPY packages ./packages

# Installer toutes les dépendances
RUN npm ci

# Build stage
FROM base AS builder

WORKDIR /app

# Arguments pour les variables Next.js publiques
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

# Les rendre disponibles comme variables d'environnement pour le build
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}

# Build tous les packages
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/apps/backend/data/digest.db

# Copier les node_modules et les builds
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/frontend/.next ./apps/frontend/.next
COPY --from=builder /app/apps/frontend/package.json ./apps/frontend/
COPY --from=builder /app/apps/frontend/next.config.js ./apps/frontend/
COPY --from=builder /app/apps/backend ./apps/backend
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/tsconfig.json ./

# Créer le répertoire data pour SQLite
RUN mkdir -p /app/apps/backend/data

# Copier le script de démarrage
COPY start-prod.sh /app/start-prod.sh
RUN chmod +x /app/start-prod.sh

EXPOSE 3000 3001

CMD ["/app/start-prod.sh"]
