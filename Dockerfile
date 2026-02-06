FROM node:24-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat ffmpeg

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src/server/db/schema.ts ./src/server/db/schema.ts

RUN npm install drizzle-kit typescript tsx

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

COPY --from=builder /app/package.json ./package.json

CMD ["npm", "run", "start"]
