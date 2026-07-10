# Fluxograma — ViralForge AI

## 1. Fluxo Geral do Usuário

```
┌─────────────┐
│   SIGN UP   │
└──────┬──────┘
       │ email + senha
       ▼
┌─────────────┐
│  ONBOARDING │ → escolher nicho, idioma, região
└──────┬──────┘
       ▼
┌─────────────┐
│  DASHBOARD  │ → visão geral, alertas, top trends
└──────┬──────┘
       │
       ├──► Trend Intelligence (busca multi-fonte)
       ├──► AI Strategy (perguntas estratégicas)
       ├──► AI Content Planner (gerar plano)
       ├──► Analytics (comparativos, heatmap)
       └──► Histórico (replay temporal)
```

## 2. Fluxo de Coleta de Dados

```
┌──────────────────┐
│   CRON SCHEDULER │ (a cada 30 min)
└─────────┬────────┘
          ▼
┌──────────────────┐
│  BullMQ: Queue   │
│  "trends.collect"│
└─────────┬────────┘
          ▼
┌──────────────────────────────────────────────┐
│  Worker: Fan-out por fonte                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │ Google  │ │ YouTube │ │ Reddit  │  ...   │
│  │ Trends  │ │  API    │ │  API    │        │
│  └────┬────┘ └────┬────┘ └────┬────┘        │
└───────┼───────────┼───────────┼──────────────┘
        ▼           ▼           ▼
┌──────────────────────────────────────┐
│  Normalizador → TrendRecord schema   │
└──────────┬───────────────────────────┘
           ▼
┌──────────────────────┐
│  Persistir (Postgres)│
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  Trend Analyzer      │ → métricas, séries, sazonalidade
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  Insight Engine (AI) │ → gera insights explicáveis
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  Cache + WebSocket   │ → dashboards ao vivo
└──────────────────────┘
```

## 3. Fluxo do AI Strategy

```
Usuário: "Sobre o que devo gravar hoje?"
   │
   ▼
Strategy Service
   │
   ├──► Recupera top trends (crescimento, oportunidade)
   ├──► Recupera histórico recente do usuário
   ├──► Recupera nicho + idioma configurado
   │
   ▼
Constrói contexto estruturado (RAG-like)
   │
   ▼
LLM (OpenAI/Anthropic/Ollama) com system prompt + contexto
   │
   ▼
Resposta explicada + evidências (links, métricas)
```

## 4. Fluxo do AI Content Planner

```
Usuário escolhe uma trend
   │
   ▼
Planner Service
   │
   ├──► Pega métricas da trend
   ├──► Pega top vídeos/posts (apenas metadados)
   ├──► Pega palavras-chave relacionadas
   │
   ▼
Prompt estruturado pedindo 20 ideias
   │
   ▼
LLM → JSON validado (Zod)
   │
   ▼
Persistir ContentPlan + ContentIdea[]
   │
   ▼
Retornar para o frontend
```

## 5. Fluxo de Autenticação

```
POST /auth/register
   → hash senha (bcrypt 12)
   → criar user
   → gerar access (15 min) + refresh (30 d)
POST /auth/login
   → valida credenciais
   → emite tokens
POST /auth/refresh
   → valida refresh hash
   → rotaciona (revoga o antigo)
POST /auth/logout
   → revoga refresh
```

## 6. Fluxo de Rate Limit

```
Request
   → Redis: INCR `rl:{userId}:{route}:{minute}`
   → se > limite → 429
   → senão → next
```
