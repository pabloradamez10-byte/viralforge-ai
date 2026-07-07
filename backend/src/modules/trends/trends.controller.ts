import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { TrendsService } from './trends.service.js';
import { ListTrendsDto, SearchTrendsDto } from './trends.dto.js';

export class TrendsController {
  constructor(private service = new TrendsService()) {}

  search = asyncHandler(async (req: Request, res: Response) => {
    const dto = SearchTrendsDto.parse(req.body);
    const result = await this.service.search(req.userId!, dto);
    res.status(201).json({ data: result });
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const dto = ListTrendsDto.parse(req.query);
    res.json({ data: await this.service.list(req.userId!, dto) });
  });

  top = asyncHandler(async (req: Request, res: Response) => {
    const range = (req.query.range as any) || '7d';
    const limit = Number(req.query.limit ?? 10);
    res.json({ data: await this.service.top(range, limit) });
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id!;
    res.json({ data: await this.service.get(id) });
  });

  metrics = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id!;
    res.json({ data: await this.service.metrics(id) });
  });

  listSearches = asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await this.service.listSearches(req.userId!) });
  });
}
