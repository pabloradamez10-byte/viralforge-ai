# Guia do Desenvolvedor — ViralForge AI

## 1. Stack

- Node.js 20 + TypeScript 5
- Express 4
- Prisma 5 + PostgreSQL 16
- Redis 7 + BullMQ
- Zod para validação
- Pino para logs
- Jest para testes
- ESLint + Prettier

## 2. Estrutura de Módulos

Cada módulo segue o mesmo layout:

```
modules/<bounded-context>/
├── <name>.controller.ts   # HTTP layer
├── <name>.service.ts      # Business rules
├── <name>.repository.ts   # DB access (Prisma)
├── <name>.routes.ts       # Express routes
├── <name>.dto.ts          # Zod schemas + DTOs
├── <name>.types.ts        # TS types
├── <name>.mapper.ts       # Entity ↔ DTO
└── __tests__/
    ├── <name>.service.spec.ts
    └── <name>.controller.spec.ts
```

## 3. Convenção de Commits

```
feat(scope): add new trend analyzer
fix(auth): handle expired refresh token
docs: update README
refactor(planner): extract prompt builder
test(trends): add unit tests
chore(deps): bump prisma
```

## 4. Estilo de Código

- `npm run lint`
- `npm run format`
- `npm run typecheck`

## 5. Criando um Novo Módulo

Exemplo: `src/modules/example/`

1. **DTOs** (`example.dto.ts`):
```ts
import { z } from 'zod';
export const CreateExampleDto = z.object({ name: z.string().min(2) });
export type CreateExampleDto = z.infer<typeof CreateExampleDto>;
```

2. **Repository** (`example.repository.ts`):
```ts
import { prisma } from '@/database/prisma';
export class ExampleRepository {
  findAll = () => prisma.example.findMany();
  create = (data: CreateExampleDto) => prisma.example.create({ data });
}
```

3. **Service** (`example.service.ts`):
```ts
export class ExampleService {
  constructor(private repo = new ExampleRepository()) {}
  async create(dto: CreateExampleDto) {
    return this.repo.create(dto);
  }
}
```

4. **Controller** (`example.controller.ts`):
```ts
import { Request, Response } from 'express';
import { asyncHandler } from '@/shared/utils/async-handler';
export class ExampleController {
  constructor(private service = new ExampleService()) {}
  create = asyncHandler(async (req: Request, res: Response) => {
    const dto = CreateExampleDto.parse(req.body);
    const created = await this.service.create(dto);
    res.status(201).json({ data: created });
  });
}
```

5. **Routes** (`example.routes.ts`):
```ts
import { Router } from 'express';
import { auth } from '@/shared/middlewares/auth';
const c = new ExampleController();
export const exampleRoutes = Router();
exampleRoutes.post('/', auth, c.create);
```

## 6. Testes

```bash
npm run test          # todos
npm run test:unit     # unit
npm run test:cov      # coverage
```

## 7. Logs

```ts
import { logger } from '@/config/logger';
logger.info({ trendId }, 'Trend collected');
```

## 8. Migrations

```bash
npx prisma migrate dev --name <name>
npx prisma migrate deploy
npx prisma studio
```

## 9. Background Jobs (BullMQ)

Criar worker:
```ts
new Worker('trends.collect', async (job) => {
  // ...
});
```

## 10. Adicionando uma Nova Fonte de Tendências

1. Criar `src/services/scrapers/<source>.ts` com a interface `TrendSource`
2. Adicionar seed em `src/database/seeds/sources.ts`
3. Adicionar no `collector.fanout`
4. Adicionar config no `.env`
5. Adicionar testes
