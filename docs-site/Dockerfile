# Stage 1 — build the VitePress book (docs.fivucsas.com)
FROM node:22-alpine AS build
WORKDIR /book
COPY book/package.json book/package-lock.json ./
RUN npm ci
COPY book/ ./
RUN npm run docs:build

# Stage 2 — serve the static output via nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /book/.vitepress/dist /usr/share/nginx/html
EXPOSE 80
