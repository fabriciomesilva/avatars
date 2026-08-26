# ============================================
# Stage 1 — Build Frontend
# ============================================
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY frontend/ ./
RUN npm run build

# ============================================
# Stage 2 — Build Backend
# ============================================
FROM node:20-alpine AS backend-build

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY backend/ ./
RUN npm run build

# ============================================
# Stage 3 — Production Runtime
# ============================================
FROM node:20-alpine AS runtime

# Criar usuário não-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copiar backend compilado
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/package.json ./package.json
COPY --from=backend-build /app/backend/package-lock.json* ./

# Instalar apenas dependências de produção
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi && npm cache clean --force

# Copiar frontend compilado para ser servido estaticamente
COPY --from=frontend-build /app/frontend/dist ./public

# Criar diretório de cache
RUN mkdir -p /app/cache/frames && chown -R appuser:appgroup /app/cache

# Trocar para usuário não-root
USER appuser

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5580/api/health || exit 1

EXPOSE 5580

ENV NODE_ENV=production
ENV PORT=5580

CMD ["node", "dist/server.js"]
