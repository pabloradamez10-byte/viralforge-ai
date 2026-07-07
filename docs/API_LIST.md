# Lista de APIs Integradas — ViralForge AI

> Apenas APIs **oficiais** ou **dados públicos**. Nada de scraping proibido, nada de burlar limites.

| Fonte | Tipo | Auth | Status | Documentação |
|-------|------|------|--------|--------------|
| **Google Trends** | Interesse de busca (público) | Nenhuma / SerpAPI opcional | ✅ Pronto | https://trends.google.com/ |
| **YouTube Data API v3** | Vídeos públicos (metadados) | OAuth2 / API Key | ✅ Pronto | https://developers.google.com/youtube/v3 |
| **Reddit API** | Posts públicos | OAuth2 client credentials | ✅ Pronto | https://www.reddit.com/dev/api/ |
| **TikTok Creative Center** | Trends públicos | Sem auth (scraper respeitoso) | ✅ Pronto | https://ads.tiktok.com/business/creativecenter/inspiration/popular/ |
| **Google News RSS** | Notícias | Nenhuma | ✅ Pronto | https://news.google.com/rss |
| **RSS Genérico** | Feeds públicos | Nenhuma | ✅ Pronto | RFC 2822 |
| **Hacker News (Firebase)** | Tech trends | Nenhuma | ✅ Pronto | https://github.com/HackerNews/API |
| **OpenAI / Anthropic / Ollama** | LLM para insights e planner | API Key | ✅ Pronto (configurável) | — |

## Endpoints Internos (Backend)

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET  /api/v1/auth/me`

### Users
- `GET    /api/v1/users/me`
- `PATCH  /api/v1/users/me`
- `DELETE /api/v1/users/me`
- `GET    /api/v1/users/me/usage`

### Projects
- `GET    /api/v1/projects`
- `POST   /api/v1/projects`
- `GET    /api/v1/projects/:id`
- `PATCH  /api/v1/projects/:id`
- `DELETE /api/v1/projects/:id`

### Trends
- `POST   /api/v1/trends/search`
- `GET    /api/v1/trends`
- `GET    /api/v1/trends/:id`
- `GET    /api/v1/trends/top`
- `GET    /api/v1/trends/:id/metrics`
- `GET    /api/v1/trends/:id/timeseries`

### Analyzer
- `POST   /api/v1/analyzer/run`
- `GET    /api/v1/analyzer/report/:searchId`

### Insights
- `GET    /api/v1/insights`
- `GET    /api/v1/insights/:id`
- `POST   /api/v1/insights/generate`

### Strategy
- `POST   /api/v1/strategy/ask`
- `GET    /api/v1/strategy/suggestions`

### Planner
- `POST   /api/v1/planner/generate`
- `GET    /api/v1/planner`
- `GET    /api/v1/planner/:id`

### Analytics
- `GET    /api/v1/analytics/overview`
- `GET    /api/v1/analytics/heatmap`
- `GET    /api/v1/analytics/growth`
- `GET    /api/v1/analytics/compare?from=&to=`

### History
- `GET    /api/v1/history`
- `GET    /api/v1/history/:id`
- `GET    /api/v1/history/compare?range=7d|30d|90d|12m`

### API Keys
- `GET    /api/v1/api-keys`
- `POST   /api/v1/api-keys`
- `DELETE /api/v1/api-keys/:id`

### Admin
- `GET    /api/v1/admin/users`
- `GET    /api/v1/admin/audit-logs`
- `GET    /api/v1/admin/stats`

## Documentação Interativa

`/api/docs` — Swagger UI

## Variáveis de Ambiente (chaves que o usuário precisa configurar)

```env
# AI Provider
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OLLAMA_BASE_URL=

# YouTube
YOUTUBE_API_KEY=

# Reddit
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=ViralForgeAI/1.0

# Google Trends (opcional: SerpAPI para dados mais ricos)
SERPAPI_KEY=

# App
JWT_SECRET=
JWT_REFRESH_SECRET=
ENCRYPTION_KEY=
```
