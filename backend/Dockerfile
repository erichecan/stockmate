# StockFlow Backend - NestJS API
# Updated: 2026-02-28T16:00:00

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
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001
ENV PORT=3001

CMD ["node", "dist/main.js"]
