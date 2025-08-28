# ---------- Builder ----------
  FROM node:20-alpine AS builder
  WORKDIR /app
  
  COPY package.json package-lock.json* ./
  RUN npm ci || npm i
  
  COPY prisma ./prisma
  RUN npx prisma generate
  
  COPY tsconfig.json ./tsconfig.json
  COPY src ./src
  RUN npm run build
  
  # ---------- Runtime ----------
  FROM node:20-alpine
  WORKDIR /app
  ENV NODE_ENV=production
  
  COPY --from=builder /app/node_modules ./node_modules
  COPY --from=builder /app/prisma ./prisma
  COPY --from=builder /app/dist ./dist
  COPY package.json ./
  
  EXPOSE 3333
  CMD ["node", "dist/index.js"]
    