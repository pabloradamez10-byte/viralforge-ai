import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { CreateAffiliateProductDto, UpdateAffiliateProductDto } from './affiliate-products.dto.js';
import { AffiliateProductsService } from './affiliate-products.service.js';

export class AffiliateProductsController {
  constructor(private service = new AffiliateProductsService()) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await this.service.list(req.userId!) });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json({ data: await this.service.create(req.userId!, CreateAffiliateProductDto.parse(req.body)) });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await this.service.update(req.params.id!, req.userId!, UpdateAffiliateProductDto.parse(req.body)) });
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await this.service.remove(req.params.id!, req.userId!);
    res.status(204).send();
  });
}
