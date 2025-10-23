#!/bin/sh
set -e

echo "Starting API deployment..."

# Generate Prisma Client for production
echo "Generating Prisma Client..."
cd /app/apps/api
npx prisma generate --schema ./prisma/schema.psql.prisma

# Run Prisma migrations
echo "Running database migrations..."
npx prisma migrate deploy --schema ./prisma/schema.psql.prisma

echo "Migrations completed successfully"

# Start the application
echo "Starting application server..."
cd /app
node dist/apps/api/main.js