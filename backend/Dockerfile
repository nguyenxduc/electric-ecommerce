# Image prod cho API, worker va job migrate/seed (cung mot image, khac command).
FROM node:22.19-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
# Prisma query engine tren musl can openssl.
RUN apk add --no-cache openssl

FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# prisma.config.ts doc DATABASE_URL; generate khong ket noi DB nen gia tri gia la du.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate
USER node
EXPOSE 3000
CMD ["node", "server.js"]
