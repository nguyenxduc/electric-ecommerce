# dev: Vite dev server cho docker-compose. runtime (mac dinh): build tinh + nginx non-root.
FROM node:22.19-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM dev AS build
# Mac dinh goi API cung origin qua ingress (/api, /socket.io).
ARG VITE_API_BASE_URL=/api
ARG VITE_USD_TO_VND_RATE=25000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_USD_TO_VND_RATE=$VITE_USD_TO_VND_RATE
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
