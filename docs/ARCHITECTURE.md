# Arquitetura — ViralForge AI

## 1. Princípios

- **Clean Architecture** (camadas independentes)
- **SOLID**
- **Repository Pattern** (acesso a dados isolado)
- **Service Layer** (regras de negócio isoladas)
- **DTOs** (contratos entre camadas)
- **Validação** (Zod no boundary da API)
- **Observabilidade** (logs estruturados, métricas, tracing)

## 2. Visão de Alto Nível

```
┌──────────────────────────────────────────────────────────┐
│                     FRONTEND (React 19)                  │
│   SPA · React Query · Zustand · Tailwind · Shadcn        │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTPS / JSON
┌────────────────────▼─────────────────────────────────────┐
│                  API GATEWAY (Nginx)                     │
│      Rate Limit · TLS · Static · Compression             │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│              BACKEND (Node.js + Express)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Auth    │  │  Trends  │  │ Analyzer │  │ Insights │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Strategy │  │ Planner  │  │Analytics │  │ History  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│  ┌─────────────────────────────────────────────────────┐ │
│  │   Services: AI · Scrapers · Cache · Queue           │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────┬──────────────────┬──────────────────┬─────────┘
           │                  │                  │
   ┌───────▼──────┐  ┌────────▼────────┐  ┌──────▼──────┐
   │  PostgreSQL  │  │      Redis      │  │  BullMQ     │
   │  (Prisma)    │  │  (Cache+Queue)  │  │  Workers    │
   └──────────────┘  └─────────────────┘  └─────────────┘
                                          │
                                  ┌───────▼────────┐
                                  │  External APIs │
                                  │  Google, YT,   │
                                  │  Reddit, RSS   │
                                  └────────────────┘
```

## 3. Camadas do Backend

```
src/
├── config/           # Configuração (env, logger, etc.)
├── modules/          # Domínios (1 pasta por bounded context)
│   └── trends/
│       ├── trends.controller.ts    # Recebe HTTP, retorna DTO
│       ├── trends.service.ts       # Regras de negócio
│       ├── trends.repository.ts    # Acesso ao banco
│       ├── trends.routes.ts        # Rotas Express
│       ├── trends.dto.ts           # DTOs Zod
│       ├── trends.types.ts         # Tipos TS
│       └── __tests__/
├── services/         # Serviços cross-domain
│   ├── ai/           # LLM client, prompts, embeddings
│   ├── scrapers/     # Coletores (YouTube, Reddit, RSS, etc.)
│   ├── cache/        # Wrapper Redis
│   └── queue/        # BullMQ producers/consumers
├── shared/           # Código compartilhado
│   ├── middlewares/  # auth, error, rate-limit, validate
│   ├── utils/        # crypto, date, slug
│   ├── errors/       # Classes de erro customizadas
│   ├── types/        # Tipos globais
│   └── validators/   # Schemas Zod reutilizáveis
└── server.ts         # Bootstrap
```

## 4. Fluxo de uma Request

```
Client
  → Nginx (rate limit, TLS)
    → Express
      → Middlewares: requestId, cors, helmet, auth, validate(dto)
        → Controller (parse, retorna DTO)
          → Service (regra de negócio)
            → Repository (Prisma) OU Service externo (cache, AI, scraper)
              → DB / Redis / BullMQ / API externa
```

## 5. Fluxo de Coleta de Tendências

```
CronJob (a cada N minutos)
  → BullMQ: job "trends:collect"
    → Worker coleta de cada fonte em paralelo
      → Normaliza para TrendRecord (schema unificado)
        → Persiste no DB (snapshot diário)
          → Analyzer recalcula métricas
            → Insight Engine gera insights
              → Cache invalidado, dashboards atualizados
```

## 6. Estratégia de Cache

| Camada | TTL | Quando invalidar |
|--------|-----|------------------|
| Trends agregadas | 15 min | Após novo snapshot |
| Analytics dashboards | 5 min | Após escrita |
| AI Strategy respostas | 1 h | Manual / nova coleta |
| Auth tokens | — | Refresh |

## 7. Segurança em Camadas

1. **Rede**: Nginx, TLS, IP allowlist opcional
2. **App**: JWT, refresh rotation, RBAC
3. **Input**: Zod validation, sanitização
4. **DB**: Prisma parametrizado, secrets criptografados
5. **Saída**: Helmet headers, CORS estrito
6. **Audit**: Logs estruturados, eventos sensíveis

## 8. Prontidão para ML (Fase 2+)

- Tabelas `ml_dataset` e `ml_feature` já previstas
- Snapshots diários = séries temporais prontas
- Embeddings de trends armazenados para similaridade
- Hook para treinar/avaliar modelos off-line
- Workers BullMQ para batch training

## 9. Observabilidade

- **Logs**: Pino, JSON estruturado, requestId
- **Métricas**: `/metrics` Prometheus-ready
- **Healthchecks**: `/health` (liveness), `/ready` (readiness)
- **Tracing**: correlation IDs em todas as chamadas
