import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { ProjectsService } from './projects.service.js';
import { CreateProjectDto, UpdateProjectDto } from './projects.dto.js';

export class ProjectsController {
  constructor(private service = new ProjectsService()) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await this.service.list(req.userId!) });
  });
  create = asyncHandler(async (req: Request, res: Response) => {
    const dto = CreateProjectDto.parse(req.body);
    res.status(201).json({ data: await this.service.create(req.userId!, dto) });
  });
  get = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id!;
    res.json({ data: await this.service.get(id, req.userId!) });
  });
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id!;
    const dto = UpdateProjectDto.parse(req.body);
    res.json({ data: await this.service.update(id, req.userId!, dto) });
  });
  remove = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id!;
    await this.service.remove(id, req.userId!);
    res.status(204).send();
  });
}
