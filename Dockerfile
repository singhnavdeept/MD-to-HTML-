# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install deps first (layer cache)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source and build (Vite SPA + esbuild backend)
COPY . .
RUN npm run build

# ─── Stage 2: Production image ────────────────────────────────────────────────
FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Only production deps
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Raw articles directory — bind-mounted from EC2 host at runtime
RUN mkdir -p /app/raw_articles

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
