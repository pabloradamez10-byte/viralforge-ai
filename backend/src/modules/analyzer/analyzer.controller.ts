import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { AnalyzerService } from './analyzer.service.js';
import { RunAnalyzerDto } from './analyzer.dto.js';

export class AnalyzerController {
  constructor(private service = new AnalyzerService()) {}

  run = asyncHandler(async (req: Request, res: Response) => {
    const dto = RunAnalyzerDto.parse(req.body);
    const result = await this.service.run(req.userId!, dto);
    res.json({ data: result });
  });

  report = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.searchId!;
    res.json({ data: await this.service.report(req.userId!, id) });
  });
}
