[README.md](https://github.com/user-attachments/files/29873040/README.md)
# ViralForge AI

> **"Transformando dados em conteúdo que gera resultados."**

Plataforma SaaS de inteligência de mercado para criadores de conteúdo. Analisa tendências públicas da internet e produz **insights originais** baseados em dados oficiais, ajudando criadores a decidir **o que criar**, **quando criar** e **como estruturar** seu conteúdo.

> ⚠️ **Sem cópia de vídeos. Sem download de conteúdo protegido. Sem violação de termos de uso.** Apenas dados públicos via APIs oficiais e fontes abertas.

---

## 🎯 Visão Geral

ViralForge AI consolida sinais de:

- Google Trends
- YouTube Data API
- Reddit API
- TikTok Creative Center (público)
- Google News
- RSS Feeds públicos

A partir disso, aplica um motor de análise, gera insights explicáveis e produz planos de conteúdo originais.

## 🏗️ Arquitetura

Monorepo com 3 camadas desacopladas:

```
viralforge-ai/
├── backend/         # Node.js + Express + Prisma + PostgreSQL + Redis
├── frontend/        # React 19 + TypeScript + Vite + Tailwind + Shadcn
├── database/        # Migrations, seeds, schema
├── infra/           # Docker, Docker Compose, Nginx
└── docs/            # Documentação técnica e de produto
```

Veja [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) para detalhes completos.

## 🚀 Stack

| Camada       | Tecnologias |
|--------------|-------------|
| Backend      | Node.js 20, Express, Prisma, PostgreSQL 16, Redis 7, BullMQ, JWT, Zod, Swagger |
| Frontend     | React 19, TypeScript, Vite, Tailwind, Shadcn, Framer Motion, React Query, Zustand, React Router |
| Infra        | Docker, Docker Compose, Nginx, GitHub Actions |
| Observability | Pino (logs), Prometheus-ready metrics |

## 📦 Módulos (Fase 1 - MVP)

1. **Trend Intelligence** — coleta multi-fonte
2. **Trend Analyzer** — métricas, sazonalidade, concorrência
3. **Insight Engine** — IA explicável (LLM) com base em dados
4. **AI Strategy** — respostas estratégicas via RAG sobre dados coletados
5. **AI Content Planner** — geração de 20 ideias com estrutura completa
6. **Analytics** — dashboards, heatmaps, comparativos
7. **Histórico** — base histórica com comparações temporais
8. **ML Ready** — arquitetura preparada para treinamento futuro

## ⚙️ Início Rápido

```bash
# 1. Clonar
git clone <repo>
cd viralforge-ai

# 2. Subir dependências
docker compose up -d

# 3. Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev

# 4. Frontend
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

Veja [`docs/INSTALLATION.md`](docs/INSTALLATION.md) para o guia completo.

## 📚 Documentação

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Arquitetura detalhada
- [`docs/ER_MODEL.md`](docs/ER_MODEL.md) — Modelo Entidade-Relacionamento
- [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md) — Guia do Desenvolvedor
- [`docs/ADMIN_GUIDE.md`](docs/ADMIN_GUIDE.md) — Guia do Administrador
- [`docs/API_LIST.md`](docs/API_LIST.md) — Lista de APIs integradas
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — Roadmap V1 / V2 / V3
- [`docs/FLOWCHART.md`](docs/FLOWCHART.md) — Fluxograma do sistema

## 🔐 Segurança

- JWT com refresh tokens rotativos
- Bcrypt para senhas (cost 12)
- Helmet + CORS configurado
- Rate limit por IP e por usuário
- Validação Zod em todos os endpoints
- Logs estruturados com correlação
- Prisma (proteção contra SQL Injection)
- Sanitização contra XSS
- CSRF protection para fluxos sensíveis
- API Keys criptografadas em repouso (AES-256)

## 📜 Licença

Proprietary © ViralForge AI. Todos os direitos reservados.
