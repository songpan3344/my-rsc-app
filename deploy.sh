#!/usr/bin/env bash
# 用法：
#   ./deploy.sh                 构建并部署当前代码（版本 = git short sha 或时间戳）
#   ./deploy.sh v1.2.3          用指定版本号构建并部署
#   ./deploy.sh rollback        回滚到上一版本（只换镜像 tag，不重新构建）
set -euo pipefail
cd "$(dirname "$0")"

VERSION_FILE=".deployed-version"
PREV_FILE=".previous-version"
HEALTH_URL="http://127.0.0.1:3000/api/health"

arg="${1:-}"
rollback=false

if [ "$arg" = "rollback" ]; then
  rollback=true
  if [ ! -f "$PREV_FILE" ]; then
    echo "没有可回滚的版本（缺少 $PREV_FILE）" >&2
    exit 1
  fi
  version="$(cat "$PREV_FILE")"
  echo "==> 回滚到 $version（使用本机残留的旧镜像）"
elif [ -n "$arg" ]; then
  version="$arg"
else
  version="$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d-%H%M%S)"
fi

[ -f .env ] || cp .env.example .env

# 自愈权限：rsync 同步会把目录权限重置为源端 755，这里收紧回 750/600
chmod 600 .env 2>/dev/null || true
chmod 750 . 2>/dev/null || true

# 把版本号写入 .env（Compose 用它做镜像 tag 插值，也注入容器）
if grep -q '^APP_VERSION=' .env; then
  sed -i.bak "s/^APP_VERSION=.*/APP_VERSION=$version/" .env
  rm -f .env.bak
else
  printf '\nAPP_VERSION=%s\n' "$version" >> .env
fi

if [ "$rollback" = true ]; then
  # 关键：--no-build 保证旧镜像缺失时直接失败，
  # 而不是用当前代码重建旧 tag（那会造成"假回滚"）
  docker compose up -d --no-deps --no-build app
else
  docker compose build app
  docker compose up -d --no-deps --no-build app
fi

echo "==> 等待健康检查并校验版本： $HEALTH_URL (expect release=$version)"
for _ in $(seq 1 20); do
  body="$(curl -fsS "$HEALTH_URL" 2>/dev/null || true)"
  if [ -n "$body" ] && printf '%s' "$body" | grep -qF "\"release\":\"$version\""; then
    # 成功后才记录上一版，避免失败的部署污染回滚目标
    if [ "$rollback" = false ] && [ -f "$VERSION_FILE" ]; then
      cp "$VERSION_FILE" "$PREV_FILE"
    fi
    echo "$version" > "$VERSION_FILE"
    echo "==> 部署成功：$version"
    printf '%s\n' "$body"
    # 只清理 dangling（无 tag）镜像，保留带 tag 的回滚镜像
    docker image prune -f >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 2
done

echo "==> 健康检查失败或版本不符。旧镜像仍在时可尝试：./deploy.sh rollback" >&2
docker compose logs --tail=50 app >&2 || true
exit 1