#!/bin/bash
# StockFlow 批发站前台 - 独立部署到 Cloud Run（stockmate-wholesale）
# 2026-03-15 用法: ./scripts/deploy-wholesale.sh
# 前提: Backend (stockmate-api) 已部署

set -e
PROJECT_ID="${GCP_PROJECT:-stockmate-488805}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

echo "==> 部署批发站前台（独立服务 stockmate-wholesale，约 5–8 分钟）"
gcloud builds submit --config=cloudbuild-wholesale.yaml --project="$PROJECT_ID"

echo ""
echo "✅ 批发站前台部署完成"
echo "   请将批发站 URL 加入 Backend 的 CORS_ORIGIN（Cloud Run → stockmate-api → 编辑 → 变量）"
echo "   查看 URL: gcloud run services describe stockmate-wholesale --region=us-central1 --format='value(status.url)'"
