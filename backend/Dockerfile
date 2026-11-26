# Image prod cho API, worker va job migrate/seed (cung mot image, khac command).
FROM node:22.23.5-alpine AS base
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
# Runtime chi chay `node ...` (migrate goi node_modules/.bin/prisma): bo npm/yarn khoi
# image cuoi, bot be mat tan cong va CVE cua goi kem npm (vd tar).
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn-* \
      /usr/local/bin/yarn /usr/local/bin/yarnpkg
USER node
EXPOSE 3000
CMD ["node", "server.js"]
