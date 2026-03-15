#!/bin/bash
# StockFlow 一键部署 - 从 backend/.env 读取环境变量并完成 GCP 部署
# Updated: 2026-02-26T16:15:00
#
# 用法: ./scripts/deploy.sh
# 前置: backend/.env 需包含 DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET

set -e
PROJECT_ID="${GCP_PROJECT:-stockmate-488805}"
ENV_FILE="backend/.env"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ 未找到 $ENV_FILE，请先配置后再部署"
  exit 1
fi

echo "==> 加载 $ENV_FILE"
set -a
source "$ENV_FILE"
set +a

for key in DATABASE_URL JWT_ACCESS_SECRET JWT_REFRESH_SECRET; do
  eval "val=\${$key}"
  if [ -z "$val" ]; then
    echo "❌ $ENV_FILE 缺少必填变量: $key"
    exit 1
  fi
done

CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:3000}"

# 构造 substitutions，注意值中逗号需特殊处理，用 ^^ 作占位再替换
# gcloud 的 substitutions 格式 KEY=VALUE，多个用逗号分隔，值中不能含逗号
_SUB_DB=$(echo "$DATABASE_URL" | sed 's/,/\\,/g')
_SUB_JWT_A=$(echo "$JWT_ACCESS_SECRET" | sed 's/,/\\,/g')
_SUB_JWT_R=$(echo "$JWT_REFRESH_SECRET" | sed 's/,/\\,/g')

echo "==> 提交 Cloud Build (project=$PROJECT_ID)"
gcloud builds submit \
  --config=cloudbuild.yaml \
  --project="$PROJECT_ID" \
  --substitutions="_ENV_DATABASE_URL=$_SUB_DB,_ENV_JWT_ACCESS=$_SUB_JWT_A,_ENV_JWT_REFRESH=$_SUB_JWT_R,_ENV_CORS=$CORS_ORIGIN"

echo ""
echo "✅ 部署完成"
