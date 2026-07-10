import { prisma } from '../../config/prisma.js';

export class UsersRepository {
  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }
  update(id: string, data: Parameters<typeof prisma.user.update>[0]['data']) {
    return prisma.user.update({ where: { id }, data });
  }
  delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }
  usageSummary(id: string) {
    return Promise.all([
      prisma.trendSearch.count({ where: { userId: id } }),
      prisma.contentPlan.count({ where: { userId: id } }),
      prisma.insight.count({ where: { userId: id } }),
    ]).then(([searches, plans, insights]) => ({ searches, plans, insights }));
  }
  listAllAdmin() {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, email: true, name: true, role: true, plan: true, createdAt: true },
    });
  }
}
