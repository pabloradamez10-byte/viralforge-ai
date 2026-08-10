import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AffiliateProduct {
  id: string;
  platform: 'SHOPEE';
  title: string;
  productUrl: string;
  affiliateUrl?: string;
  imageUrl?: string;
  category?: string;
  price?: string;
  commissionRate?: string;
  salesCount: number;
  rating?: number;
  benefits?: string;
  active: boolean;
  updatedAt: string;
}

export type AffiliateProductInput = Omit<AffiliateProduct, 'id' | 'updatedAt' | 'price' | 'commissionRate'> & {
  price?: number;
  commissionRate?: number;
};

const key = ['affiliate-products'];

export function useAffiliateProducts() {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from('affiliate_products').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(fromRow);
    },
  });
}

export function useCreateAffiliateProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: AffiliateProductInput) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Sua sessão expirou. Entre novamente.');
      const { data, error } = await supabase.from('affiliate_products').insert(toRow(input, auth.user.id)).select().single();
      if (error) throw error;
      return fromRow(data);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateAffiliateProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<AffiliateProductInput> }) => {
      const { data, error } = await supabase.from('affiliate_products').update(toPartialRow(input)).eq('id', id).select().single();
      if (error) throw error;
      return fromRow(data);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteAffiliateProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('affiliate_products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}

function fromRow(row: any): AffiliateProduct {
  return {
    id: row.id, platform: row.platform, title: row.title, productUrl: row.product_url,
    affiliateUrl: row.affiliate_url ?? undefined, imageUrl: row.image_url ?? undefined,
    category: row.category ?? undefined, price: row.price ?? undefined,
    commissionRate: row.commission_rate ?? undefined, salesCount: row.sales_count,
    rating: row.rating ?? undefined, benefits: row.benefits ?? undefined,
    active: row.active, updatedAt: row.updated_at,
  };
}

function toRow(input: Partial<AffiliateProductInput>, userId?: string) {
  return {
    ...(userId ? { user_id: userId } : {}),
    ...(input.platform !== undefined ? { platform: input.platform } : {}),
    ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    ...(input.productUrl !== undefined ? { product_url: input.productUrl.trim() } : {}),
    ...(input.affiliateUrl !== undefined ? { affiliate_url: input.affiliateUrl?.trim() || null } : {}),
    ...(input.imageUrl !== undefined ? { image_url: input.imageUrl?.trim() || null } : {}),
    ...(input.category !== undefined ? { category: input.category?.trim() || null } : {}),
    ...(input.price !== undefined ? { price: input.price } : {}),
    ...(input.commissionRate !== undefined ? { commission_rate: input.commissionRate } : {}),
    ...(input.salesCount !== undefined ? { sales_count: input.salesCount } : {}),
    ...(input.rating !== undefined ? { rating: input.rating } : {}),
    ...(input.benefits !== undefined ? { benefits: input.benefits?.trim() || null } : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
  };
}

const toPartialRow = (input: Partial<AffiliateProductInput>) => toRow(input);
