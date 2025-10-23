#!/bin/bash

set -e

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI is not installed"
    exit 1
fi

# Check if project is set
PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT" ]; then
    echo "Error: No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "Using GCP Project: $PROJECT"
echo ""

# Prompt for database password
read -sp "Enter PostgreSQL database password: " DB_PASSWORD
echo ""
read -sp "Confirm PostgreSQL database password: " DB_PASSWORD_CONFIRM
echo ""

if [ "$DB_PASSWORD" != "$DB_PASSWORD_CONFIRM" ]; then
    echo "Error: Passwords do not match"
    exit 1
fi

# Prompt for Dynamic.xyz environment ID
read -p "Enter Dynamic.xyz Environment ID: " DYNAMIC_ENV_ID

# Prompt for WalletConnect Project ID
read -p "Enter WalletConnect Project ID: " WALLETCONNECT_PROJECT_ID

echo ""
echo "Generating random secrets..."

# Generate random secrets
SESSION_SECRET=$(openssl rand -base64 32)
MFA_SERVER_SALT=$(openssl rand -base64 32)

echo ""
echo "=========================================="
echo "Creating API Secrets"
echo "=========================================="

# API_NODE_ENV
echo "Creating API_NODE_ENV..."
echo -n "production" | gcloud secrets create API_NODE_ENV --data-file=- 2>/dev/null || \
    echo -n "production" | gcloud secrets versions add API_NODE_ENV --data-file=-

# API_PORT
echo "Creating API_PORT..."
echo -n "3000" | gcloud secrets create API_PORT --data-file=- 2>/dev/null || \
    echo -n "3000" | gcloud secrets versions add API_PORT --data-file=-

# API_DATABASE_URL
echo "Creating API_DATABASE_URL..."
DB_URL="postgresql://web3signer_user:${DB_PASSWORD}@/web3signer?host=/cloudsql/${PROJECT}:us-central1:web3-signer-db"
echo -n "$DB_URL" | gcloud secrets create API_DATABASE_URL --data-file=- 2>/dev/null || \
    echo -n "$DB_URL" | gcloud secrets versions add API_DATABASE_URL --data-file=-

# API_SESSION_SECRET
echo "Creating API_SESSION_SECRET..."
echo -n "$SESSION_SECRET" | gcloud secrets create API_SESSION_SECRET --data-file=- 2>/dev/null || \
    echo -n "$SESSION_SECRET" | gcloud secrets versions add API_SESSION_SECRET --data-file=-

# API_CORS_ORIGINS (placeholder - update after first deploy)
echo "Creating API_CORS_ORIGINS..."
echo -n "https://web3-signer-ui-dev-PLACEHOLDER.run.app" | gcloud secrets create API_CORS_ORIGINS --data-file=- 2>/dev/null || \
    echo -n "https://web3-signer-ui-dev-PLACEHOLDER.run.app" | gcloud secrets versions add API_CORS_ORIGINS --data-file=-

# API_MFA_SERVER_SALT
echo "Creating API_MFA_SERVER_SALT..."
echo -n "$MFA_SERVER_SALT" | gcloud secrets create API_MFA_SERVER_SALT --data-file=- 2>/dev/null || \
    echo -n "$MFA_SERVER_SALT" | gcloud secrets versions add API_MFA_SERVER_SALT --data-file=-

# API_LOG_LEVEL
echo "Creating API_LOG_LEVEL..."
echo -n "info" | gcloud secrets create API_LOG_LEVEL --data-file=- 2>/dev/null || \
    echo -n "info" | gcloud secrets versions add API_LOG_LEVEL --data-file=-

# API_RATE_LIMIT_WINDOW_MS
echo "Creating API_RATE_LIMIT_WINDOW_MS..."
echo -n "900000" | gcloud secrets create API_RATE_LIMIT_WINDOW_MS --data-file=- 2>/dev/null || \
    echo -n "900000" | gcloud secrets versions add API_RATE_LIMIT_WINDOW_MS --data-file=-

# API_RATE_LIMIT_MAX_REQUESTS
echo "Creating API_RATE_LIMIT_MAX_REQUESTS..."
echo -n "100" | gcloud secrets create API_RATE_LIMIT_MAX_REQUESTS --data-file=- 2>/dev/null || \
    echo -n "100" | gcloud secrets versions add API_RATE_LIMIT_MAX_REQUESTS --data-file=-

echo ""
echo "=========================================="
echo "Creating UI Secrets"
echo "=========================================="

# UI_VITE_API_URL (placeholder - update after first deploy)
echo "Creating UI_VITE_API_URL..."
echo -n "https://web3-signer-api-dev-PLACEHOLDER.run.app" | gcloud secrets create UI_VITE_API_URL --data-file=- 2>/dev/null || \
    echo -n "https://web3-signer-api-dev-PLACEHOLDER.run.app" | gcloud secrets versions add UI_VITE_API_URL --data-file=-

# UI_VITE_DYNAMIC_ENVIRONMENT_ID
echo "Creating UI_VITE_DYNAMIC_ENVIRONMENT_ID..."
echo -n "$DYNAMIC_ENV_ID" | gcloud secrets create UI_VITE_DYNAMIC_ENVIRONMENT_ID --data-file=- 2>/dev/null || \
    echo -n "$DYNAMIC_ENV_ID" | gcloud secrets versions add UI_VITE_DYNAMIC_ENVIRONMENT_ID --data-file=-

# UI_VITE_WALLETCONNECT_PROJECT_ID
echo "Creating UI_VITE_WALLETCONNECT_PROJECT_ID..."
echo -n "$WALLETCONNECT_PROJECT_ID" | gcloud secrets create UI_VITE_WALLETCONNECT_PROJECT_ID --data-file=- 2>/dev/null || \
    echo -n "$WALLETCONNECT_PROJECT_ID" | gcloud secrets versions add UI_VITE_WALLETCONNECT_PROJECT_ID --data-file=-

# UI_VITE_ENABLE_MFA
echo "Creating UI_VITE_ENABLE_MFA..."
echo -n "true" | gcloud secrets create UI_VITE_ENABLE_MFA --data-file=- 2>/dev/null || \
    echo -n "true" | gcloud secrets versions add UI_VITE_ENABLE_MFA --data-file=-

# UI_VITE_ENABLE_BATCH_SIGNING
echo "Creating UI_VITE_ENABLE_BATCH_SIGNING..."
echo -n "true" | gcloud secrets create UI_VITE_ENABLE_BATCH_SIGNING --data-file=- 2>/dev/null || \
    echo -n "true" | gcloud secrets versions add UI_VITE_ENABLE_BATCH_SIGNING --data-file=-

echo ""
echo "=========================================="
echo "Secrets Created Successfully!"
echo "=========================================="
echo ""
echo "⚠️  IMPORTANT: Update these secrets after first deployment:"
echo "   1. API_CORS_ORIGINS - Update with actual UI URL"
echo "   2. UI_VITE_API_URL - Update with actual API URL"
echo ""
echo "To update a secret:"
echo "   echo -n 'new-value' | gcloud secrets versions add SECRET_NAME --data-file=-"
echo ""
echo "To view secrets list:"
echo "   gcloud secrets list"
echo ""