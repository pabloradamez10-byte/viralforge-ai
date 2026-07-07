# Guia do Administrador — ViralForge AI

## 1. Acesso Admin

Por padrão, o primeiro usuário registrado recebe `role=ADMIN` via seed. Você pode ajustar manualmente:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'voce@exemplo.com';
```

## 2. Painel Admin

Rota: `/admin` (frontend).

Funcionalidades:
- Listagem de usuários
- Auditoria
- Estatísticas globais
- Gerenciar fontes de dados
- Health do sistema

## 3. Auditoria

Todos os eventos sensíveis são gravados em `audit_logs`:
- Login / Logout
- Criação/edição/exclusão de projetos
- Geração de planos
- Mudança de role/plano
- Uso de API keys

## 4. Gerenciar Fontes

Edite a tabela `sources` ou use a interface admin. Cada fonte tem:
- `slug` único
- `type` (google_trends, youtube, reddit, rss, tiktok, hackernews)
- `active` (true/false)
- `config` (jsonb com rate limits, default params)

## 5. Rate Limits

Configurados por rota em `src/shared/middlewares/rate-limit.ts`:
- Auth: 10 req/min por IP
- Trends search: 30 req/h por usuário (free), 300 (pro)
- AI: 20 req/h por usuário (free), 200 (pro)

## 6. Limpeza de Dados

```bash
# Job manual
npm run job:cleanup-old-trends -- --days=365
```

## 7. Backup

```bash
docker exec viralforge-postgres pg_dump -U viralforge viralforge > backup.sql
```

## 8. Monitoramento

- Logs: `docker compose logs -f backend`
- Métricas: `http://localhost:4000/metrics`
- Health: `http://localhost:4000/health` e `/ready`

## 9. Atualização

```bash
git pull
docker compose build
docker compose up -d
cd backend && npx prisma migrate deploy
```

## 10. Segurança Operacional

- Rotação de `JWT_SECRET` e `ENCRYPTION_KEY` a cada 90 dias
- Revogação de refresh tokens comprometida
- IP allowlist opcional no Nginx
- WAF (Cloudflare) recomendado em produção
