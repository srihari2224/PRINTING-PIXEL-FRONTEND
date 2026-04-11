# ============================================================
# PixelPrint — FILE_UPLOADER / frontend
# Next.js app (built, then served in production mode)
# ============================================================

# ── Stage 1: install dependencies ────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app

# Copy manifests first (layer-cache optimization)
COPY package.json package-lock.json ./

# Install ALL deps (including devDependencies needed for the build)
RUN npm ci

# ── Stage 2: build the Next.js app ───────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Bring in node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the entire frontend source
COPY . .

# Build the production bundle.
# ARG lets docker-compose pass NEXT_PUBLIC_* values at build time.
# ⚠️  To change the backend API URL, update NEXT_PUBLIC_API_URL in
#     the .env.docker file (see root docker-compose.yml).
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_RAZORPAY_KEY_ID
ARG NEXT_PUBLIC_GOOGLE_MAPS_KEY

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_RAZORPAY_KEY_ID=$NEXT_PUBLIC_RAZORPAY_KEY_ID
ENV NEXT_PUBLIC_GOOGLE_MAPS_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_KEY

RUN npm run build

# ── Stage 3: production runner ────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app

# Only copy the artefacts needed to run (not the full source)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Expose the port Next.js will listen on.
# ⚠️  Change the left side (host port) in docker-compose.yml to avoid conflicts.
EXPOSE 3000

# Run the optimised Next.js standalone server
CMD ["node", "server.js"]
