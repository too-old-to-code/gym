FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    STATE_FILE=/data/state.json \
    STATIC_DIR=/app/dist
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
COPY shared ./shared
COPY config ./config
VOLUME /data
EXPOSE 8080
CMD ["npx", "tsx", "server/main.ts"]
