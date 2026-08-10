import { z } from 'zod';

const optionalNumber = (min: number, max?: number) =>
  z.preprocess(
    (value) => value === '' || value === null ? undefined : value,
    z.coerce.number().min(min).max(max ?? Number.MAX_SAFE_INTEGER).optional(),
  );

export const CreateAffiliateProductDto = z.object({
  platform: z.enum(['SHOPEE']).default('SHOPEE'),
  title: z.string().trim().min(2).max(180),
  productUrl: z.string().trim().url().max(2000),
  affiliateUrl: z.string().trim().url().max(2000).optional().or(z.literal('')).transform((value) => value || undefined),
  imageUrl: z.string().trim().url().max(2000).optional().or(z.literal('')).transform((value) => value || undefined),
  category: z.string().trim().max(80).optional().or(z.literal('')).transform((value) => value || undefined),
  price: optionalNumber(0),
  commissionRate: optionalNumber(0, 100),
  salesCount: optionalNumber(0).default(0),
  rating: optionalNumber(0, 5),
  benefits: z.string().trim().max(1000).optional().or(z.literal('')).transform((value) => value || undefined),
  active: z.boolean().optional().default(true),
});
export type CreateAffiliateProductDto = z.infer<typeof CreateAffiliateProductDto>;

export const UpdateAffiliateProductDto = CreateAffiliateProductDto.partial();
export type UpdateAffiliateProductDto = z.infer<typeof UpdateAffiliateProductDto>;
