# StockFlow GCP 部署指南

> 项目 ID: stockmate-488805 | 项目编号: 30589716607

## 一、前置条件

1. 安装 [gcloud CLI](https://cloud.google.com/sdk/docs/install)
2. 登录并设置项目：
   ```bash
   gcloud auth login
   gcloud config set project stockmate-488805
   ```
3. 启用 API：
   ```bash
   gcloud services enable cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com
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

## 三、部署命令

```bash
# 在项目根目录
gcloud builds submit --config=cloudbuild.yaml --project=stockmate-488805
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
