# Quickstart — ViralForge AI

## 1. Subir tudo (Docker)

```bash
cd viralforge-ai
cp .env.example .env
# edite .env e adicione suas chaves
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml exec backend npx prisma migrate deploy
docker compose -f infra/docker-compose.yml exec backend npm run db:seed
```

Acesse:
- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- Swagger: http://localhost:4000/api/docs

## 2. Login

- Email: `admin@viralforge.ai`
- Senha: `ChangeMe123!` (ALTERE IMEDIATAMENTE em produção)

## 3. Configurar fontes (opcional, mas recomendado)

Em `Settings` (futuro) ou via `POST /api/v1/admin/trigger-collect` (admin):

```bash
curl -X POST http://localhost:4000/api/v1/admin/trigger-collect \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"inteligência artificial","region":"BR","language":"pt"}'
```

## 4. Usar o módulo Virais → Faceless

1. **Login** no app
2. Vá em **Virais encontrados** (sidebar)
3. Digite um nicho (ex: "marketing digital") e clique **Buscar virais**
4. Clique em **Criar versão PT-BR faceless** em um vídeo
5. Escolha tom, duração, gere o roteiro
6. Copie, exporte (`.txt`, `.md`, `.srt`, `.json`) ou vá em **Ir para publicação**
7. Em **Publicação**, escolha a plataforma alvo, prepare o pacote e publique manualmente

## 5. Variáveis de ambiente

| Variável | Onde | Função |
|----------|------|--------|
| `YOUTUBE_API_KEY` | backend `.env` | Habilita coleta no YouTube Data API v3 |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | backend `.env` | Habilita coleta no Reddit |
| `OPENAI_API_KEY` | backend `.env` | Habilita geração de roteiros com LLM (fallback funciona sem) |
| `DATABASE_URL` | backend `.env` | Conexão PostgreSQL |
| `REDIS_URL` | backend `.env` | Conexão Redis (cache + filas) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` / `ENCRYPTION_KEY` | backend `.env` | Segurança |
| `VITE_API_URL` | frontend `.env` | URL do backend (default `/api/v1` em dev) |

## 6. Endpoints principais

| Recurso | Endpoint |
|---------|----------|
| Auth | `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh` |
| Trends | `POST /api/v1/trends/search`, `GET /api/v1/trends`, `GET /api/v1/trends/top` |
| Analyzer | `POST /api/v1/analyzer/run`, `GET /api/v1/analyzer/report/:id` |
| History | `GET /api/v1/history`, `GET /api/v1/history/compare` |
| Virais | `GET /api/v1/viral-videos`, `POST /api/v1/viral-videos/search` |
| Faceless | `POST /api/v1/faceless/generate`, `GET /api/v1/faceless` |
| Publications | `POST /api/v1/publications/export`, `POST /api/v1/publications/prepare` |
| Admin | `GET /api/v1/admin/stats`, `POST /api/v1/admin/trigger-collect` |
| Docs | `GET /api/docs` (Swagger UI) |

## 7. Sem chaves de API

Tudo funciona, mas:

- **Sem `YOUTUBE_API_KEY`**: lista de virais do YouTube virá vazia (TikTok/Reddit se configurados ainda funcionam)
- **Sem `OPENAI_API_KEY`**: roteiros faceless usam o **fallback determinístico** (sempre produz algo)

O sistema é projetado para **nunca quebrar** por falta de chave.
