import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { FacelessService } from './faceless.service.js';
import { GenerateFacelessDto } from './faceless.dto.js';

export class FacelessController {
  constructor(private service = new FacelessService()) {}

  generate = asyncHandler(async (req: Request, res: Response) => {
    const dto = GenerateFacelessDto.parse(req.body);
    const sourceUrl: string | undefined = req.body?.sourceUrl;
    const result = await this.service.generate(req.userId!, dto, sourceUrl);
    res.status(201).json({ data: result });
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Math.min(Number(req.query.pageSize ?? 20), 50);
    res.json({ data: await this.service.list(req.userId!, page, pageSize) });
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id!;
    res.json({ data: await this.service.get(req.userId!, id) });
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id!;
    await this.service.remove(req.userId!, id);
    res.status(204).send();
  });
}
