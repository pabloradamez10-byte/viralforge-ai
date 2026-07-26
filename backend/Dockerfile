# ── Build ─────────────────────────────────────────────────────
# Debian Bookworm + OpenSSL 3: compatível com Prisma 5.x.
FROM node:20-bookworm-slim AS build

WORKDIR /app

ENV NODE_ENV=development

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      openssl \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN npm config set registry https://registry.npmjs.org/

COPY package.json package-lock.json ./

RUN npm ci \
    --include=dev \
    --no-audit \
    --no-fund

RUN npm install \
    --no-save \
    --no-package-lock \
    --no-audit \
    --no-fund \
    prisma@5.22.0

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts

RUN npx --no-install prisma generate
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

# O Railway expõe muitos CPUs virtuais, mas pouca memória. Sem limite, o x264
# abriu dezenas de threads e o processo foi encerrado por falta de memória.
# Este wrapper mantém todos os renders do app em um consumo previsível.
RUN mv /usr/bin/ffmpeg /usr/bin/ffmpeg-real \
    && printf '#!/bin/sh\nexec /usr/bin/ffmpeg-real -threads 2 -filter_threads 1 -filter_complex_threads 1 "$@"\n' > /usr/local/bin/ffmpeg \
    && chmod +x /usr/local/bin/ffmpeg

RUN npm config set registry https://registry.npmjs.org/

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts ./scripts

RUN npm ci \
    --omit=dev \
    --no-audit \
    --no-fund

# Railway executa `npm run prisma:deploy` dentro da imagem final antes de
# iniciar a aplicação. Por isso o Prisma CLI precisa existir no runtime.
RUN npm install \
    --no-save \
    --no-package-lock \
    --no-audit \
    --no-fund \
    prisma@5.22.0

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist

RUN mkdir -p \
    /app/storage/work \
    /app/storage/renders \
    /app/storage/videos \
    /app/storage/smart-clips

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const port=process.env.PORT||4000; fetch('http://127.0.0.1:'+port+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
