# Production Dockerfile for SAMAY (Single-container deployment)
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Build Client
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client ./client
RUN cd client && npm run build

# 2. Prepare Server
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev
COPY server ./server

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV DEMO_MODE=1

# Copy built client bundle and server
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server ./server

WORKDIR /app/server
EXPOSE 4000

CMD ["node", "src/index.js"]
