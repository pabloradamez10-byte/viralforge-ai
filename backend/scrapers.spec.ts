import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { ViralVideosService } from './viral-videos.service.js';
import { ListViralVideosDto, SearchViralVideosDto } from './viral-videos.dto.js';

export class ViralVideosController {
  constructor(private service = new ViralVideosService()) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const dto = ListViralVideosDto.parse(req.query);
    res.json({ data: await this.service.list(dto) });
  });

  search = asyncHandler(async (req: Request, res: Response) => {
    const dto = SearchViralVideosDto.parse(req.body);
    res.json({ data: await this.service.search(dto) });
  });
}
