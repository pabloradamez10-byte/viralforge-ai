import { prisma } from '../../config/prisma.js';
import type { Prisma } from '@prisma/client';

export class ProjectsRepository {
  list(userId: string) {
    return prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }
  findById(id: string, userId: string) {
    return prisma.project.findFirst({ where: { id, userId } });
  }
  create(userId: string, data: Omit<Prisma.ProjectUncheckedCreateInput, 'user' | 'userId'>) {
    return prisma.project.create({ data: { ...data, userId } });
  }
  update(id: string, data: Prisma.ProjectUncheckedUpdateInput) {
    return prisma.project.update({ where: { id }, data });
  }
  delete(id: string) {
    return prisma.project.delete({ where: { id } });
  }
}
