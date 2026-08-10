import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

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
    queryFn: async () => (await api.get<{ data: AffiliateProduct[] }>('/affiliate-products')).data.data,
  });
}

export function useCreateAffiliateProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: AffiliateProductInput) => (await api.post('/affiliate-products', input)).data.data as AffiliateProduct,
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateAffiliateProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<AffiliateProductInput> }) => (await api.patch(`/affiliate-products/${id}`, input)).data.data as AffiliateProduct,
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteAffiliateProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/affiliate-products/${id}`),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}
