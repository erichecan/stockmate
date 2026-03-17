# StockFlow GCP 部署指南

> 项目 ID: stockmate-488805 | 项目编号: 30589716607  
> 默认区域: **europe-west1**（比利时，欧洲）

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
| `CORS_ORIGIN` | 前端 URL，逗号分隔，如 `https://stockmate-web-xxx.run.app,https://stockmate-wholesale-xxx.run.app` |

### Frontend

`NEXT_PUBLIC_API_URL` 在构建时由 Cloud Build 自动注入（指向 Backend URL + `/api`）。

### 批发站前台（独立服务 stockmate-wholesale）

构建时自动注入：`NEXT_PUBLIC_API_BASE_URL`、`NEXT_PUBLIC_API_BASE_AUTH`（指向 Backend URL）。部署后需将批发站 URL 加入 Backend 的 `CORS_ORIGIN`。

## 三、部署方式

### 增量部署（推荐，单次约 3-6 分钟）

按需部署，避免每次全量 15 分钟：

```bash
# 仅 Backend 有改动时（约 3-5 分钟，含 Docker 层缓存）
./scripts/deploy-backend.sh

# 仅 Frontend 有改动时（约 4-6 分钟，从已部署 Backend 取 URL）
./scripts/deploy-frontend.sh

# 仅批发站前台有改动时（约 5-8 分钟，独立服务 stockmate-wholesale）
./scripts/deploy-wholesale.sh
```

### 全量部署（Backend + Frontend 一起，约 15 分钟）

```bash
# 需在 backend/.env 中配置 DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
./scripts/deploy.sh
```

### 方式 C：自动部署（GitHub Trigger）

Push 到 `main` 即自动部署，无需本地提交。

1. **首次**：在 [Cloud Build 触发器](https://console.cloud.google.com/cloud-build/triggers;region=europe-west1?project=stockmate-488805) 连接 GitHub 仓库
2. 运行：
   ```bash
   ./scripts/create-github-trigger.sh
   ```

部署完成后会输出（区域 europe-west1，域名中可能带 `ew` 等标识）：
- Backend: `https://stockmate-api-xxx-ew.a.run.app`
- Frontend: `https://stockmate-web-xxx-ew.a.run.app`
- 批发站前台: `https://stockmate-wholesale-xxx-ew.a.run.app`（独立服务，需单独执行 `./scripts/deploy-wholesale.sh`）

## 四、首次部署后

1. 若用 `./scripts/deploy.sh`，`backend/.env` 中的 `CORS_ORIGIN` 应包含 Frontend URL（如 `https://stockmate-web-xxx.run.app`），部署后 Frontend 才能正常调用 API
2. 或在 Cloud Run → stockmate-api → 编辑 → 变量中手动添加/更新 `CORS_ORIGIN`
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
