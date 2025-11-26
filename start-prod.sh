#!/bin/sh
# Script de démarrage pour production (Docker/Fly.io)

echo "🚀 Starting GS Stream Digest in production mode..."

# Run database migrations
echo "📊 Running database migrations..."
cd /app/apps/backend
export DATABASE_PATH=./data/digest.db
npm run db:migrate || echo "⚠️  Migrations failed or already applied"

# Start backend in background
echo "🔧 Starting backend on port 3000..."
cd /app
DATABASE_PATH=./apps/backend/data/digest.db npm run start --workspace=@gs-digest/backend &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
sleep 5

# Start frontend
echo "🎨 Starting frontend on port 3001..."
npm run start --workspace=@gs-digest/frontend &
FRONTEND_PID=$!

echo "✅ Both services started!"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
