# StockFlow GCP 部署指南

> 项目 ID: stockmate-488805 | 项目编号: 30589716607

## 一、前置条件

1. **启用计费**（必须）：[控制台关联计费](https://console.cloud.google.com/billing/linkedaccount?project=stockmate-488805)
   - 新用户有 $300 免费额度

2. 安装 [gcloud CLI](https://cloud.google.com/sdk/docs/install-sdk?hl=zh-cn)

3. 登录并设置项目：
   ```bash
   gcloud auth login
   gcloud config set project stockmate-488805
   ```

4. **修复 bucket 权限**（若 `gcloud builds submit` 报 forbidden）：
   ```bash
   ./scripts/fix-gcp-permissions.sh
   ```

## 二、环境变量 / Secret

### Backend (Cloud Run stockmate-api)

在 Cloud Run 控制台或 `gcloud run services update` 中配置：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Neon Postgres 连接串 (必填) |
| `JWT_ACCESS_SECRET` | JWT  access 密钥 |
| `JWT_REFRESH_SECRET` | JWT refresh 密钥 |
| `CORS_ORIGIN` | 前端 URL，逗号分隔，如 `https://stockmate-web-xxx.run.app` |

### Frontend

`NEXT_PUBLIC_API_URL` 在构建时由 Cloud Build 自动注入（指向 Backend URL + `/api`）。

## 三、部署方式

### 方式 A：手动部署（本地提交）

```bash
# 若遇 bucket forbidden，先运行: ./scripts/fix-gcp-permissions.sh
gcloud builds submit --config=cloudbuild.yaml --project=stockmate-488805
```

### 方式 B：自动部署（GitHub Trigger，推荐）

Push 到 `main` 即自动部署，无需本地提交。

1. **首次**：在 [Cloud Build 触发器](https://console.cloud.google.com/cloud-build/triggers;region=us-central1?project=stockmate-488805) 连接 GitHub 仓库
2. 运行：
   ```bash
   ./scripts/create-github-trigger.sh
   ```

部署完成后会输出：
- Backend: `https://stockmate-api-xxx-uc.a.run.app`
- Frontend: `https://stockmate-web-xxx-uc.a.run.app`

## 四、首次部署后

1. 在 Cloud Run → stockmate-api → 编辑 → 变量中添加 `DATABASE_URL`、`JWT_*`、`CORS_ORIGIN`
2. `CORS_ORIGIN` 填 Frontend 的完整 URL（如 `https://stockmate-web-xxx.run.app`）
3. 数据库迁移（可选，若未在部署流程中执行）：
   ```bash
   cd backend && npx prisma migrate deploy
   ```

## 五、本地测试镜像

```bash
# Backend
docker build -t stockmate-api -f backend/Dockerfile .
docker run -p 3001:3001 -e DATABASE_URL="你的连接串" stockmate-api

# Frontend (需先有 Backend URL)
docker build -t stockmate-web --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001/api -f frontend/Dockerfile .
docker run -p 3000:3000 stockmate-web
```
