#!/bin/sh
# Script de démarrage pour production (Docker/Fly.io)

echo "🚀 Starting GS Stream Digest in production mode..."

# Run database migrations
echo "📊 Running database migrations..."
cd /app/packages/database
export DATABASE_PATH=/app/apps/backend/data/digest.db
npm run db:migrate || echo "⚠️  Migrations failed or already applied"

# Start backend in background
echo "🔧 Starting backend on port 3000..."
cd /app/apps/backend
export DATABASE_PATH=/app/apps/backend/data/digest.db
export PORT=3000
# Use start:dev temporarily until we have proper TypeScript compilation
npm run start:dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
sleep 5

# Start frontend
echo "🎨 Starting frontend on port 3001..."
cd /app/apps/frontend
export PORT=3001
export BACKEND_URL=http://localhost:3000
npm start > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!

echo "✅ Both services started!"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
