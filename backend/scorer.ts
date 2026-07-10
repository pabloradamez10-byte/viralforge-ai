import { Prisma } from '@prisma/client';
import { ProjectsRepository } from './projects.repository.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import type { CreateProjectDto, UpdateProjectDto } from './projects.dto.js';

export class ProjectsService {
  constructor(private repo = new ProjectsRepository()) {}

  list(userId: string) {
    return this.repo.list(userId);
  }
  async get(id: string, userId: string) {
    const p = await this.repo.findById(id, userId);
    if (!p) throw new NotFoundError('Project');
    return p;
  }
  async create(userId: string, dto: CreateProjectDto) {
    const data: Prisma.ProjectUncheckedCreateInput = {
      userId,
      name: dto.name,
      description: dto.description,
      niche: dto.niche,
      settings: (dto.settings ?? {}) as Prisma.InputJsonValue,
    };
    return this.repo.create(userId, data);
  }
  async update(id: string, userId: string, dto: UpdateProjectDto) {
    await this.get(id, userId);
    const data: Prisma.ProjectUncheckedUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.niche !== undefined ? { niche: dto.niche } : {}),
      ...(dto.settings !== undefined ? { settings: dto.settings as Prisma.InputJsonValue } : {}),
    };
    return this.repo.update(id, data);
  }
  async remove(id: string, userId: string) {
    await this.get(id, userId);
    await this.repo.delete(id);
  }
}
