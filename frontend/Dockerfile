FROM node:20-alpine AS base

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

EXPOSE 5173
CMD ["pnpm", "run", "dev", "--host"] 