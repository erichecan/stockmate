#!/usr/bin/env bash
# 2026-03-15 一键释放 3000/3001/4000 并启动后端 + 批发站前端（全自动）
# 在 stockmate 根目录执行: ./scripts/start-local-dev.sh 或 bash scripts/start-local-dev.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[1/4] 释放端口 3000, 3001, 4000 ..."
for port in 3000 3001 4000; do
  pid=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pid" ]; then
    kill -9 $pid 2>/dev/null || true
    echo "  已结束占用 $port 的进程: $pid"
  fi
done
pkill -f "nest start" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 2
echo "  端口已释放。"

echo "[2/4] 启动后端 (http://localhost:3001) ..."
cd "$ROOT/backend"
pnpm run start:dev > "$ROOT/scripts/.dev-backend.log" 2>&1 &
BACKEND_PID=$!
echo "  后端 PID: $BACKEND_PID (日志: scripts/.dev-backend.log)"

echo "[3/4] 启动批发站前端 (http://localhost:4000) ..."
cd "$ROOT/wholesale-frontend"
pnpm run dev > "$ROOT/scripts/.dev-wholesale.log" 2>&1 &
FRONTEND_PID=$!
echo "  批发站前端 PID: $FRONTEND_PID (日志: scripts/.dev-wholesale.log)"

echo "[4/4] 等待服务就绪 ..."
sleep 8
if lsof -i :3001 -P -n 2>/dev/null | grep -q LISTEN; then
  echo "  后端 3001: 已监听"
else
  echo "  后端 3001: 未检测到监听，请查看 scripts/.dev-backend.log"
fi
if lsof -i :4000 -P -n 2>/dev/null | grep -q LISTEN; then
  echo "  批发站 4000: 已监听"
else
  echo "  批发站 4000: 未检测到监听，请查看 scripts/.dev-wholesale.log"
fi

echo ""
echo "--- 本地开发已启动 ---"
echo "  后端 API:    http://localhost:3001"
echo "  Swagger:     http://localhost:3001/api/docs"
echo "  批发站前台:  http://localhost:4000"
echo ""
echo "停止服务: kill $BACKEND_PID $FRONTEND_PID"
echo "或: pkill -f 'nest start'; pkill -f 'next dev'"
