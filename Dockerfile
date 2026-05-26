FROM node:22-alpine AS builder
RUN apk update && apk upgrade --no-cache
WORKDIR /app

COPY package*.json ./
COPY apps/server/package*.json ./apps/server/
COPY packages/shared/package*.json ./packages/shared/

RUN npm ci

COPY . .

RUN npm run build:shared
RUN npm run build:server

EXPOSE 8080

CMD ["npm", "--workspace", "apps/server", "run", "start"]