# Modelo Entidade-Relacionamento — ViralForge AI

## Diagrama (Mermaid)

```mermaid
erDiagram
    USER ||--o{ REFRESH_TOKEN : "has"
    USER ||--o{ PROJECT : "owns"
    USER ||--o{ TREND_SEARCH : "performs"
    USER ||--o{ CONTENT_PLAN : "generates"
    USER ||--o{ INSIGHT : "receives"
    USER ||--o{ USER_API_KEY : "stores"
    USER ||--o{ AUDIT_LOG : "generates"

    PROJECT ||--o{ TREND_SEARCH : "groups"
    PROJECT ||--o{ CONTENT_PLAN : "groups"
    PROJECT ||--o{ INSIGHT : "groups"

    TREND_SEARCH ||--o{ TREND_RECORD : "produces"
    TREND_SEARCH ||--o{ TREND_METRIC : "produces"
    TREND_SEARCH ||--o{ INSIGHT : "yields"

    TREND_RECORD ||--|| TREND_METRIC : "analyzed by"
    TREND_RECORD }o--|| SOURCE : "from"
    TREND_RECORD }o--o| CATEGORY : "belongs to"

    CONTENT_PLAN ||--|{ CONTENT_IDEA : "contains"

    USER_API_KEY }o--|| SOURCE : "authenticates"

    USER {
        uuid id PK
        string email
        string password_hash
        string name
        string avatar_url
        enum role
        enum plan
        boolean email_verified
        timestamp created_at
        timestamp updated_at
    }

    REFRESH_TOKEN {
        uuid id PK
        uuid user_id FK
        string token_hash
        string user_agent
        string ip
        timestamp expires_at
        timestamp revoked_at
        timestamp created_at
    }

    PROJECT {
        uuid id PK
        uuid user_id FK
        string name
        string description
        string niche
        jsonb settings
        timestamp created_at
        timestamp updated_at
    }

    SOURCE {
        uuid id PK
        string slug UK
        string name
        enum type
        string base_url
        boolean active
        jsonb config
    }

    TREND_SEARCH {
        uuid id PK
        uuid user_id FK
        uuid project_id FK
        string query
        string region
        string language
        jsonb filters
        timestamp created_at
    }

    TREND_RECORD {
        uuid id PK
        uuid search_id FK
        uuid source_id FK
        uuid category_id FK
        string external_id
        string title
        string url
        jsonb payload
        timestamp collected_at
        timestamp published_at
    }

    TREND_METRIC {
        uuid id PK
        uuid record_id FK
        uuid search_id FK
        int volume
        int growth_pct
        int decline_pct
        float competition_score
        float opportunity_score
        float seasonality_score
        int lifetime_days
        int popularity
        jsonb time_series
        date snapshot_date
    }

    CATEGORY {
        uuid id PK
        string slug UK
        string name
        uuid parent_id FK
    }

    INSIGHT {
        uuid id PK
        uuid user_id FK
        uuid project_id FK
        uuid search_id FK
        enum kind
        string title
        text body
        text explanation
        jsonb evidence
        float confidence
        timestamp created_at
    }

    CONTENT_PLAN {
        uuid id PK
        uuid user_id FK
        uuid project_id FK
        uuid search_id FK
        string title
        enum status
        timestamp created_at
    }

    CONTENT_IDEA {
        uuid id PK
        uuid plan_id FK
        int position
        string title
        string hook
        text description
        string cta
        text hashtags
        text keywords
        jsonb video_structure
    }

    USER_API_KEY {
        uuid id PK
        uuid user_id FK
        uuid source_id FK
        string label
        string encrypted_key
        jsonb meta
        timestamp created_at
        timestamp last_used_at
    }

    AUDIT_LOG {
        uuid id PK
        uuid user_id FK
        string action
        string resource
        jsonb metadata
        string ip
        timestamp created_at
    }
```

## Tabelas Principais (Resumo)

| Tabela | Propósito |
|--------|-----------|
| `users` | Contas, perfil, plano, role |
| `refresh_tokens` | Tokens de rotação JWT |
| `projects` | Workspace do usuário (canal, marca) |
| `sources` | Fontes de dados configuráveis (Google, YT, Reddit…) |
| `trend_searches` | Pesquisas executadas pelos usuários |
| `trend_records` | Tendências brutas coletadas |
| `trend_metrics` | Métricas calculadas (crescimento, concorrência…) |
| `categories` | Taxonomia |
| `insights` | Insights gerados pela IA |
| `content_plans` | Planos de conteúdo |
| `content_ideas` | 20 ideias por plano |
| `user_api_keys` | Chaves criptografadas dos usuários |
| `audit_logs` | Auditoria |

## Índices Estratégicos

- `trend_records(source_id, collected_at DESC)` — séries temporais
- `trend_records(title gin_trgm_ops)` — busca por similaridade
- `trend_metrics(snapshot_date, record_id)` — analytics rápidos
- `insights(user_id, created_at DESC)` — feed
- `audit_logs(user_id, created_at DESC)` — auditoria
