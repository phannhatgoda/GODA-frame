# ---- deps + build ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runtime ----
FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN useradd -m -u 1001 goda && mkdir -p /app/data && chown goda /app/data
COPY --from=build --chown=goda /app/.next/standalone ./
COPY --from=build --chown=goda /app/.next/static ./.next/static
COPY --from=build --chown=goda /app/public ./public
USER goda
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["node", "server.js"]
