# dev: Vite dev server cho docker-compose. runtime (mac dinh): build tinh + nginx non-root.
FROM node:22.23.5-alpine AS dev
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package*.json ./
RUN npm ci --no-audit --no-fund
COPY --chown=node:node . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM dev AS build
# Mac dinh goi API cung origin qua ingress (/api, /socket.io).
ARG VITE_API_BASE_URL=/api
ARG VITE_USD_TO_VND_RATE=25000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_USD_TO_VND_RATE=$VITE_USD_TO_VND_RATE
RUN npm run build

# nginx goi cua Alpine (duoc va nhanh hon image nginx-unprivileged chinh chu), chay non-root.
FROM alpine:3.23 AS runtime
RUN apk upgrade --no-cache && apk add --no-cache nginx
COPY nginx-main.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
# -e: log loi khoi dong ra stderr thay vi /var/lib/nginx (khong ghi duoc khi non-root).
CMD ["nginx", "-e", "/dev/stderr", "-g", "daemon off;"]
