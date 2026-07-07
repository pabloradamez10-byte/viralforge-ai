# Roadmap — ViralForge AI

## V1 — Inteligência (MVP) — FASE ATUAL

> Entrega a base do SaaS + inteligência de dados.

### Infra
- [x] Monorepo (backend / frontend / docs / infra / db)
- [x] Docker Compose
- [x] CI básico
- [x] Swagger / OpenAPI
- [x] Healthchecks

### Backend
- [x] Auth (JWT + Refresh rotation, bcrypt)
- [x] Users (perfil, plano, RBAC)
- [x] Projects (workspace)
- [x] Trend Intelligence (Google Trends, YouTube, Reddit, Google News, RSS, TikTok, HN)
- [x] Trend Analyzer (crescimento, queda, concorrência, sazonalidade, lifetime)
- [x] Insight Engine (LLM com contexto)
- [x] AI Strategy (RAG-like sobre dados)
- [x] AI Content Planner (20 ideias)
- [x] Analytics (overview, heatmap, comparativos)
- [x] Histórico (comparação 7d/30d/90d/12m)
- [x] API Keys (criptografadas)
- [x] Rate limit, validação, logs

### Frontend
- [x] Login / Cadastro
- [x] Dashboard
- [x] Trends UI
- [x] Insights UI
- [x] Strategy UI
- [x] Planner UI
- [x] Analytics UI
- [x] Histórico UI
- [x] Settings + API Keys

### Banco
- [x] Schema completo
- [x] Migrações
- [x] Seeds

---

## V2 — Engajamento & ML (próxima fase)

> Após sua autorização.

- Coleta ativa multi-tenant (filas por projeto)
- Treinamento de modelos próprios (forecasting, classificação de nicho)
- Recomendações personalizadas por perfil de usuário
- Embeddings semânticos de trends (busca por similaridade)
- Alertas inteligentes (email, push, webhook)
- Exportação (PDF, CSV, Notion)
- Integrações: Zapier, Make, n8n
- Multi-idioma do produto (i18n)
- Stripe / billing completo
- Planos (Free, Pro, Agency, Enterprise)
- OAuth social (Google, GitHub)
- 2FA
- Auditoria avançada

---

## V3 — Conteúdo & Publicação (após V2)

> Apenas após nova autorização explícita.

- Geração de roteiros longos
- Geração de thumbnails (descrição)
- Sugestão de cortes / highlights
- Sugestão de horários de postagem
- Publicação agendada (YouTube, TikTok, Instagram) via APIs oficiais
- Editor de conteúdo (rich text)
- Workspace colaborativo (equipes)
- White-label para agencies
- Mobile app (React Native)

---

## 🚫 Nunca Será

- ❌ Download de vídeos de terceiros
- ❌ Reprodução não autorizada
- ❌ Bypass de paywalls ou termos de uso
- ❌ Scrapers que violem `robots.txt`
- ❌ Redistribuição de conteúdo protegido
