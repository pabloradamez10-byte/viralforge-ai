import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { AffiliateProductsRepository } from './affiliate-products.repository.js';
import type { CreateAffiliateProductDto, UpdateAffiliateProductDto } from './affiliate-products.dto.js';

function toCreateData(userId: string, dto: CreateAffiliateProductDto): Prisma.AffiliateProductUncheckedCreateInput {
  return {
    userId,
    platform: dto.platform,
    title: dto.title,
    productUrl: dto.productUrl,
    affiliateUrl: dto.affiliateUrl,
    imageUrl: dto.imageUrl,
    category: dto.category,
    price: dto.price,
    commissionRate: dto.commissionRate,
    salesCount: dto.salesCount,
    rating: dto.rating,
    benefits: dto.benefits,
    active: dto.active,
  };
}

export class AffiliateProductsService {
  constructor(private repo = new AffiliateProductsRepository()) {}

  list(userId: string) { return this.repo.list(userId); }

  async get(id: string, userId: string) {
    const product = await this.repo.findById(id, userId);
    if (!product) throw new NotFoundError('Affiliate product');
    return product;
  }

  async create(userId: string, dto: CreateAffiliateProductDto) {
    try {
      return await this.repo.create(toCreateData(userId, dto));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('Este produto já está na sua biblioteca.');
      }
      throw error;
    }
  }

  async update(id: string, userId: string, dto: UpdateAffiliateProductDto) {
    await this.get(id, userId);
    try {
      return await this.repo.update(id, dto);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('Este produto já está na sua biblioteca.');
      }
      throw error;
    }
  }

  async remove(id: string, userId: string) {
    await this.get(id, userId);
    await this.repo.delete(id);
  }
}
