#!/bin/bash
# StockFlow - 仅部署 Frontend（约 4-6 分钟，含 Docker 层缓存）
# Updated: 2026-02-28T17:30:00
# 用法: ./scripts/deploy-frontend.sh
# 前提: Backend 已部署

set -e
PROJECT_ID="${GCP_PROJECT:-stockmate-488805}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

echo "==> 部署 Frontend（增量，约 4-6 分钟）"
gcloud builds submit --config=cloudbuild-frontend.yaml --project="$PROJECT_ID"

echo ""
echo "✅ Frontend 部署完成"
