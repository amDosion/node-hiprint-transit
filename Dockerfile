# 从源码用 rollup 构建 dist/(rollup4 需 node>=18), 再用 node:16 运行自包含 ESM bundle(对齐上游运行时)
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx rollup -c

FROM node:16
WORKDIR /node-hiprint-transit
COPY --from=build /app/dist/ .
EXPOSE 17521
CMD ["node", "index.js"]
