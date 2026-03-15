# StockFlow Backend - NestJS API
# Updated: 2026-02-26T16:10:00 - 修复 pnpm 下 .prisma 路径不存在导致 build 失败
# 原因：pnpm 将 Prisma Client 生成到 .pnpm 而非 node_modules/.prisma，COPY 该路径会报错
# 解决：完整 node_modules 已包含生成结果，移除冗余 COPY

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Dependencies (build context = repo root)
FROM base AS deps
COPY backend/package.json backend/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY backend/ .
# Prisma generate 不需要真实连接
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost/db?sslmode=require"
RUN npx prisma generate
RUN pnpm run build

# Production
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001
ENV PORT=3001

# Updated: 2026-02-26T16:22:00 - NestJS 输出 dist/src/main.js
CMD ["node", "dist/src/main.js"]
