FROM node:24-bookworm-slim AS base

WORKDIR /app
RUN corepack enable

FROM base AS pruner

# Keep dependency installation independent from application source changes.
# Docker reuses this layer until a workspace manifest or the lockfile changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/core/package.json ./packages/core/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store,sharing=locked \
  pnpm install --frozen-lockfile --network-concurrency=1 --fetch-retries=10 --fetch-retry-factor=2 --fetch-retry-mintimeout=10000 --fetch-retry-maxtimeout=120000 --fetch-timeout=60000
COPY . .
RUN pnpm turbo prune @home-server/api --docker

FROM base AS builder

COPY --from=pruner /app/out/json/ .
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store,sharing=locked \
  pnpm install --frozen-lockfile --network-concurrency=1 --fetch-retries=10 --fetch-retry-factor=2 --fetch-retry-mintimeout=10000 --fetch-retry-maxtimeout=120000 --fetch-timeout=60000
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@home-server/api

FROM node:24-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages/contracts ./packages/contracts
COPY --from=builder /app/packages/database ./packages/database

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
