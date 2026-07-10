# Módulo Virais + Faceless + Publicação — ViralForge AI

> Documentação do **MVP** da Fase 1: vídeos virais públicos → versão faceless original em PT-BR.

## ⚖️ Princípios

1. **Não baixamos vídeos** de terceiros. Apenas coletamos metadados públicos via APIs oficiais.
2. **Não copiamos conteúdo protegido.** O título/descrição do vídeo é usado APENAS como insumo semântico (semente do tema).
3. **O roteiro gerado é sempre ORIGINAL**, escrito do zero. Sem paráfrase, sem "regurgitação".
4. **Publicação é manual nesta fase.** Estrutura já preparada para YouTube Data API e TikTok Content Posting API.

## 🧱 Arquitetura

```
Vídeo público (YouTube / TikTok / Reddit)
        │  (apenas metadados)
        ▼
  ViralVideosService
        │
        ├── score 0..100
        │     (views, engajamento, recência, completude)
        │
        ▼
   /viral-videos (GET, POST /search)
        │
        ▼
   Usuário clica "Criar versão PT-BR faceless"
        │
        ▼
  FacelessService.generate()
        │
        ├── 1) LLM (OpenAI / Anthropic / Ollama) gera roteiro ORIGINAL em PT-BR
        │     com system prompt rigoroso
        │
        └── 2) Fallback determinístico: gera roteiro estruturado por templates
              (sempre produz algo usável mesmo sem LLM)
        │
        ▼
   /faceless/generate (POST) — salva no banco
        │
        ▼
   Usuário exporta:
        • .txt   (texto puro)
        • .md    (markdown formatado)
        • .srt   (legendas)
        • .json  (dados completos)
        │
        ▼
   /publications/prepare — monta pacote de publicação
   (com estrutura para YouTube / TikTok / Instagram)
```

## 🌐 Endpoints REST

### Vídeos virais
```
GET    /api/v1/viral-videos
       ?niche=...&platform=YOUTUBE|TIKTOK|REDDIT|ALL
       &region=BR&language=pt&minScore=60&page=1&pageSize=20

POST   /api/v1/viral-videos/search
       body: { niche, platform?, region?, language?, maxResults? }
```

### Gerador faceless
```
POST   /api/v1/faceless/generate
       body: {
         sourceVideoId, sourcePlatform, sourceTitle,
         sourceDescription?, sourceTags?, niche?,
         targetDuration: "short"|"medium"|"long",
         tone: "curioso"|"educativo"|"polêmico"|"storytelling"|"humor",
         language: "pt-BR"
       }

GET    /api/v1/faceless
GET    /api/v1/faceless/:id
DELETE /api/v1/faceless/:id
```

### Publicação
```
POST   /api/v1/publications/export
       body: { scriptId, format: "txt"|"json"|"srt"|"markdown" }
       response: download com Content-Disposition

POST   /api/v1/publications/prepare
       body: {
         scriptId, target: "YOUTUBE"|"TIKTOK"|"INSTAGRAM"|"MANUAL",
         scheduledAt?, caption?, visibility: "public"|"unlisted"|"private"
       }
       response: pacote + metadados para integração futura
```

## 🛡️ Garantias

| Garantia | Como é cumprida |
|----------|-----------------|
| Não baixar vídeos | Nenhum endpoint baixa. Coletamos só `title`, `url`, `views`, `thumbnail` (URL pública). |
| Não copiar | O prompt do sistema instrui a IA a nunca copiar. O fallback determinístico usa templates com topic extraction + reescrita. |
| Usar APIs oficiais | YouTube Data API v3, Reddit OAuth2, TikTok Creative Center público. |
| Mostrar só como referência | Cada vídeo tem link "Abrir original" → leva à página original. |
| Roteiro 100% PT-BR | `language: "pt-BR"` é default e validado. |
| Exportação segura | Endpoint `export` retorna Content-Disposition; nada vaza do servidor. |

## 🖥️ Frontend

Páginas:

- `/virals` — busca e lista de vídeos virais
- `/faceless/new/:videoId` — gerador a partir de um viral
- `/faceless/:id` — edição de um roteiro salvo
- `/faceless` — listagem de todos os roteiros
- `/publications/:id` — preparar pacote e exportar

UI: **dark mode** profissional (`slate-950` base, accents `brand-500`/`violet-500`).

## ⚙️ Variáveis de ambiente usadas

```env
YOUTUBE_API_KEY=...         # habilita YouTube
REDDIT_CLIENT_ID=...        # habilita Reddit
REDDIT_CLIENT_SECRET=...
OPENAI_API_KEY=...          # habilita LLM (opcional — fallback funciona sem)
```

Se nenhuma chave estiver configurada, o sistema ainda funciona:
- Vídeos virais retorna lista vazia (até configurar)
- Roteiros faceless usa fallback determinístico (sempre gera algo)

## 🛣️ Próximos passos (V2)

- OAuth2 do usuário para YouTube/TikTok/Instagram
- Editor visual de cenas (drag-and-drop)
- Geração de imagens por cena (Replicate/Stability)
- Renderização server-side do vídeo (FFmpeg)
- Agendamento e publicação automática com fila
