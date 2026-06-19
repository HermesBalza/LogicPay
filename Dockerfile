FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

RUN apk add --no-cache python3 py3-pip && \
    pip install --no-cache-dir --break-system-packages numbers-parser

COPY --from=build /app/dist ./dist
COPY server ./server

RUN mkdir -p /app/data

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "server/index.js"]
