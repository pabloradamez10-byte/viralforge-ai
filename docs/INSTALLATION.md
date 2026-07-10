# Guia de Instalação — ViralForge AI

## Requisitos

- **Node.js** >= 20
- **Docker** + Docker Compose
- **PostgreSQL 16** (ou via Docker)
- **Redis 7** (ou via Docker)
- **pnpm** ou **npm**

## 1. Clonar e configurar

```bash
git clone <repo>
cd viralforge-ai
```

## 2. Variáveis de ambiente

### Backend
```bash
cd backend
cp .env.example .env
# edite .env com suas chaves
```

### Frontend
```bash
cd ../frontend
cp .env.example .env
```

## 3. Subir com Docker (recomendado)

```bash
cd ..
docker compose up -d
```

Isso sobe: postgres, redis, backend, frontend, nginx.

Verifique:
- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- Swagger: http://localhost:4000/api/docs
- Health: http://localhost:4000/health

## 4. Subir manualmente (desenvolvimento)

```bash
# 1. Subir só banco e redis
docker compose up -d postgres redis

# 2. Backend
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev

# 3. Frontend (em outro terminal)
cd frontend
npm install
npm run dev
```

## 5. Configurar APIs externas (opcional mas recomendado)

Acesse `http://localhost:5173/settings/api-keys` e cadastre suas chaves, **ou** preencha no `.env` do backend.

APIs suportadas:
- OpenAI / Anthropic / Ollama
- YouTube Data API
- Reddit
- SerpAPI (Google Trends enriquecido)

## 6. Verificação

```bash
curl http://localhost:4000/health
# {"status":"ok",...}

curl http://localhost:4000/api/docs-json | head
```

## 7. Primeiro acesso

1. Acesse `/register`
2. Crie sua conta
3. Faça login
4. Configure seu projeto (nicho, idioma, região)
5. Vá em **Trends** e faça sua primeira busca

## Troubleshooting

- **Porta ocupada**: altere `PORT` no `.env`
- **Prisma falha**: rode `npx prisma migrate reset`
- **Redis falha**: `docker compose restart redis`
- **LLM sem resposta**: configure `OPENAI_API_KEY` ou use Ollama local
