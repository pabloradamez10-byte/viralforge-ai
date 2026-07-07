import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { HistoryService } from './history.service.js';
import { CompareHistoryDto, ListHistoryDto } from './history.dto.js';

export class HistoryController {
  constructor(private service = new HistoryService()) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const dto = ListHistoryDto.parse(req.query);
    res.json({ data: await this.service.list(req.userId!, dto) });
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id!;
    res.json({ data: await this.service.get(req.userId!, id) });
  });

  compare = asyncHandler(async (req: Request, res: Response) => {
    const dto = CompareHistoryDto.parse(req.query);
    res.json({ data: await this.service.compare(req.userId!, dto) });
  });
}
