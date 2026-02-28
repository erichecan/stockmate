#!/bin/bash
# 修复 GCP Cloud Build bucket 权限错误
# 运行: ./scripts/fix-gcp-permissions.sh
# 需要: 项目 Owner 或 具备 IAM 管理权限
# Updated: 2026-02-28T16:30:00

set -e
PROJECT_ID="${1:-stockmate-488805}"

echo "==> 修复 GCP 权限 (项目: $PROJECT_ID)"
echo ""

# 若报 "Billing must be enabled"，请先到控制台关联计费后再运行本脚本

# 1. 获取当前用户
USER_EMAIL=$(gcloud config get-value account 2>/dev/null)
if [ -z "$USER_EMAIL" ]; then
  echo "❌ 未登录。请先运行: gcloud auth login"
  exit 1
fi
echo "当前用户: $USER_EMAIL"

# 2. 启用所需 API
echo ""
echo "==> 启用 API..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com \
  storage-api.googleapis.com \
  serviceusage.googleapis.com \
  --project="$PROJECT_ID"

# 3. 授予当前用户所需角色
echo ""
echo "==> 授予 IAM 角色..."

# Cloud Build 编辑（创建构建）
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="user:$USER_EMAIL" \
  --role="roles/cloudbuild.builds.editor" \
  --quiet 2>/dev/null || true

# Storage Admin（上传构建源码到 bucket）
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="user:$USER_EMAIL" \
  --role="roles/storage.admin" \
  --quiet 2>/dev/null || true

# Service Usage Consumer（使用 API）
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="user:$USER_EMAIL" \
  --role="roles/serviceusage.serviceUsageAdmin" \
  --quiet 2>/dev/null || true

# Cloud Run Admin（部署服务）
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="user:$USER_EMAIL" \
  --role="roles/run.admin" \
  --quiet 2>/dev/null || true

# 4. 确保 Cloud Build 服务账号有部署权限
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)' 2>/dev/null)
if [ -n "$PROJECT_NUMBER" ]; then
  CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
  echo "==> 配置 Cloud Build 服务账号: $CLOUDBUILD_SA"
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$CLOUDBUILD_SA" \
    --role="roles/run.admin" \
    --quiet 2>/dev/null || true
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$CLOUDBUILD_SA" \
    --role="roles/artifactregistry.writer" \
    --quiet 2>/dev/null || true
fi

# 5. 创建/检查 Cloud Build 默认 bucket
BUCKET_NAME="${PROJECT_ID}_cloudbuild"
if ! gsutil ls -b "gs://${BUCKET_NAME}" 2>/dev/null; then
  echo "==> 创建 Cloud Build 默认 bucket..."
  gsutil mb -p "$PROJECT_ID" -l us-central1 "gs://${BUCKET_NAME}" 2>/dev/null || echo "  (bucket 可能已存在或由 Cloud Build 自动创建)"
fi

echo ""
echo "✅ 权限配置完成！"
echo ""
echo "请等待 1-2 分钟让 IAM 生效，然后运行:"
echo "  gcloud builds submit --config=cloudbuild.yaml --project=$PROJECT_ID"
echo ""
