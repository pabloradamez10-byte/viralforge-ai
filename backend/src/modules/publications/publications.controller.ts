import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { PublicationsService } from './publications.service.js';
import { ExportFacelessDto, PreparePublicationDto } from './publications.dto.js';

export class PublicationsController {
  constructor(private service = new PublicationsService()) {}

  /**
   * GET /publications/export?scriptId=...&format=txt|json|srt|markdown
   * Retorna o conteúdo como download.
   */
  export = asyncHandler(async (req: Request, res: Response) => {
    const dto = ExportFacelessDto.parse({ ...req.query, ...req.body });
    const result = await this.service.export(req.userId!, dto);
    res.setHeader('Content-Type', result.mime);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  });

  /**
   * POST /publications/prepare
   * Monta o pacote para publicação (manual nesta fase).
   */
  prepare = asyncHandler(async (req: Request, res: Response) => {
    const dto = PreparePublicationDto.parse(req.body);
    res.json({ data: await this.service.prepare(req.userId!, dto) });
  });
}
