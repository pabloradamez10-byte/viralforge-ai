import { prisma } from '../../config/prisma.js';
import type { Prisma } from '@prisma/client';

export class AffiliateProductsRepository {
  list(userId: string) {
    return prisma.affiliateProduct.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  }

  findById(id: string, userId: string) {
    return prisma.affiliateProduct.findFirst({ where: { id, userId } });
  }

  create(data: Prisma.AffiliateProductUncheckedCreateInput) {
    return prisma.affiliateProduct.create({ data });
  }

  update(id: string, data: Prisma.AffiliateProductUncheckedUpdateInput) {
    return prisma.affiliateProduct.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.affiliateProduct.delete({ where: { id } });
  }
}
