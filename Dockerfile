# Build stage
# node·pnpm 버전은 CI(.github/workflows/ci.yml)와 맞춘다. 다르면 CI가 통과한 것과 다른 도구로 배포 이미지를 만든다.
FROM node:24-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Production stage
# 태그를 고정한다. 버전 없는 alpine 태그는 빌드할 때마다 다른 nginx가 올 수 있다.
FROM nginx:1.30-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
