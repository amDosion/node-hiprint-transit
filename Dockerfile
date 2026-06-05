# 从源码用 rollup 构建 dist，再用同一 Node 24 LTS 运行自包含 ESM bundle
FROM node:24 AS build
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx rollup -c

FROM node:24
WORKDIR /node-hiprint-transit
COPY --from=build /app/dist/ .
EXPOSE 17521
CMD ["node", "index.js"]
