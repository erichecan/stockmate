#!/bin/bash
# 创建 GitHub 自动部署 Trigger - push 到 main 即自动部署
# 前置: 需先在 GCP Console 连接 GitHub 仓库 (Cloud Build > 触发器 > 管理存储库)
# 运行: ./scripts/create-github-trigger.sh
# Updated: 2026-02-28T16:30:00

set -e
PROJECT_ID="${1:-stockmate-488805}"
REGION="us-central1"
REPO_OWNER="erichecan"
REPO_NAME="stockmate"

echo "==> 创建 Cloud Build GitHub Trigger"
echo "    项目: $PROJECT_ID"
echo "    仓库: $REPO_OWNER/$REPO_NAME"
echo ""

# 检查是否已有连接
CONNECTIONS=$(gcloud builds connections list --region=$REGION --project=$PROJECT_ID 2>/dev/null | grep -c github.com || true)
if [ "$CONNECTIONS" -eq 0 ]; then
  echo "⚠️  未检测到 GitHub 连接。请先完成以下步骤："
  echo ""
  echo "  1. 打开 https://console.cloud.google.com/cloud-build/triggers;region=$REGION?project=$PROJECT_ID"
  echo "  2. 点击「连接存储库」"
  echo "  3. 选择 GitHub，授权并选择仓库 $REPO_OWNER/$REPO_NAME"
  echo "  4. 完成后重新运行本脚本"
  echo ""
  exit 1
fi

# 删除同名旧 trigger（若有）
gcloud builds triggers delete stockmate-deploy --region=$REGION --project=$PROJECT_ID --quiet 2>/dev/null || true

# 创建 trigger（使用 2nd gen）
gcloud beta builds triggers create github \
  --name="stockmate-deploy" \
  --region=$REGION \
  --project=$PROJECT_ID \
  --repository="$REPO_OWNER/$REPO_NAME" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --require-approval=false \
  --include-workflow=false

echo ""
echo "✅ Trigger 已创建！"
echo ""
echo "此后每次 push 到 main 分支将自动触发部署。"
echo ""
