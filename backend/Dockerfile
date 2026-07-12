# ── Build ─────────────────────────────────────────────────────
# Debian Bookworm + OpenSSL 3: compatível com Prisma 5.x.
FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      openssl \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Força o registro público e evita URLs internas presentes
# no package-lock.json antigo.
RUN npm config set registry https://registry.npmjs.org/

# Copiamos somente package.json de propósito.
# O package-lock.json atual não será usado.
COPY package.json ./

RUN npm install \
    --no-audit \
    --no-fund

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Usa o Prisma 5.22.0 instalado no package.json.
RUN npm exec prisma generate

RUN npm run build


# ── Runtime ───────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      openssl \
      ca-certificates \
      ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN npm config set registry https://registry.npmjs.org/

# Novamente, não copiamos o package-lock.json.
COPY package.json ./
COPY prisma ./prisma

# Instala apenas dependências necessárias em produção.
RUN npm install \
    --omit=dev \
    --no-audit \
    --no-fund

# Gera o Prisma Client no ambiente final.
RUN npm exec prisma generate

COPY --from=build /app/dist ./dist

RUN mkdir -p \
    /app/storage/work \
    /app/storage/renders \
    /app/storage/videos

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const port=process.env.PORT||4000; fetch('http://127.0.0.1:'+port+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
