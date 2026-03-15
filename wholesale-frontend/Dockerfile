# StockFlow 批发站前台 - Next.js 独立服务
# 2026-03-15 从 frontend 拆分为独立镜像，部署到 Cloud Run stockmate-wholesale
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY wholesale-frontend/package.json wholesale-frontend/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY wholesale-frontend/ .
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_API_BASE_AUTH
ARG NEXT_PUBLIC_TENANT_SLUG
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL:-http://localhost:3001/api/wholesale}
ENV NEXT_PUBLIC_API_BASE_AUTH=${NEXT_PUBLIC_API_BASE_AUTH:-http://localhost:3001/api}
ENV NEXT_PUBLIC_TENANT_SLUG=${NEXT_PUBLIC_TENANT_SLUG:-test-company}
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
