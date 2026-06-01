FROM node:22.19-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
ENV DATABASE_URL='postgresql://postgres:postgres@db:5432/ecommerce?schema=public'
RUN npx prisma generate

EXPOSE 3000

CMD sh -c "npx prisma migrate deploy && npm run dev"
