#!/bin/bash
# StockFlow - 仅部署 Backend（约 3-5 分钟，含 Docker 层缓存）
# Updated: 2026-02-28T17:30:00
# 用法: ./scripts/deploy-backend.sh

set -e
PROJECT_ID="${GCP_PROJECT:-stockmate-488805}"
ENV_FILE="backend/.env"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ 未找到 $ENV_FILE"
  exit 1
fi

echo "==> 加载 $ENV_FILE"
set -a
source "$ENV_FILE"
set +a

for key in DATABASE_URL JWT_ACCESS_SECRET JWT_REFRESH_SECRET; do
  eval "val=\${$key}"
  if [ -z "$val" ]; then
    echo "❌ $ENV_FILE 缺少: $key"
    exit 1
  fi
done

CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:3000}"
_SUB_DB=$(echo "$DATABASE_URL" | sed 's/,/\\,/g')
_SUB_JWT_A=$(echo "$JWT_ACCESS_SECRET" | sed 's/,/\\,/g')
_SUB_JWT_R=$(echo "$JWT_REFRESH_SECRET" | sed 's/,/\\,/g')

echo "==> 部署 Backend（增量，约 3-5 分钟）"
gcloud builds submit \
  --config=cloudbuild-backend.yaml \
  --project="$PROJECT_ID" \
  --substitutions="_ENV_DATABASE_URL=$_SUB_DB,_ENV_JWT_ACCESS=$_SUB_JWT_A,_ENV_JWT_REFRESH=$_SUB_JWT_R,_ENV_CORS=$CORS_ORIGIN"

echo ""
echo "✅ Backend 部署完成"
