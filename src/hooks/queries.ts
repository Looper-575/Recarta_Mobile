import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type {
  Address,
  Area,
  Brand,
  Cart,
  Category,
  City,
  Customer,
  Home,
  OrderDetail,
  OrderSummary,
  Paginated,
  PickupLocation,
  PickupSlot,
  Product,
  ProductDetail,
  Region,
  Settings,
} from '@/lib/types';
import { useSession } from '@/state/session';

/** Laravel's paginated resource collections: next page while there is one. */
function nextPage(last: { meta: { current_page: number; last_page: number } }) {
  return last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined;
}

export const useSettings = () =>
  useQuery({
    queryKey: ['settings'],
    queryFn: () => api<Settings>('settings'),
    staleTime: 10 * 60 * 1000,
  });

export const useHome = () => useQuery({ queryKey: ['home'], queryFn: () => api<Home>('home') });

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: () => api<{ data: Category[] }>('categories').then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

export type ListFilters = { sort?: string };

type ProductPage = Paginated<Product> & { meta: { category?: Category; brand?: Brand; total?: number } };

export const useCategoryProducts = (categoryId: number, filters: ListFilters) =>
  useInfiniteQuery({
    queryKey: ['category-products', categoryId, filters],
    queryFn: ({ pageParam }) =>
      api<ProductPage>(`categories/${categoryId}/products`, { query: { page: pageParam, ...filters } }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });

export const useBrandProducts = (slug: string, filters: ListFilters) =>
  useInfiniteQuery({
    queryKey: ['brand-products', slug, filters],
    queryFn: ({ pageParam }) => api<ProductPage>(`brands/${slug}/products`, { query: { page: pageParam, ...filters } }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });

export const useSearch = (q: string) =>
  useInfiniteQuery({
    queryKey: ['search', q],
    queryFn: ({ pageParam }) => api<ProductPage>('search', { query: { q, page: pageParam } }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: q.trim().length > 0,
  });

export const useSuggest = (q: string) =>
  useQuery({
    queryKey: ['suggest', q],
    queryFn: () =>
      api<{ products: { id: number; title: string; category: string | null }[]; categories: Category[]; brands: Brand[] }>(
        'search/suggest',
        { query: { q } },
      ),
    enabled: q.trim().length >= 2,
    staleTime: 60 * 1000,
  });

export const useProduct = (idOrSlug: string) =>
  useQuery({
    queryKey: ['product', idOrSlug],
    queryFn: () => api<{ data: ProductDetail }>(`products/${idOrSlug}`).then((r) => r.data),
  });

// --- Cart ---------------------------------------------------------------------

export const useCart = () => {
  const token = useSession((s) => s.token);
  const cartToken = useSession((s) => s.cartToken);
  return useQuery({
    // Keyed by who owns the cart, so logging in or out shows the right one.
    queryKey: ['cart', token ? 'customer' : cartToken ?? 'none'],
    queryFn: () => api<Cart>('cart'),
  });
};

/** Cart changes answer with the whole cart, which replaces the cached one. */
function useCartMutation<V>(request: (vars: V) => Promise<Cart>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => client.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export const useAddToCart = () =>
  useCartMutation((vars: { item_id: number; quantity?: number }) => api<Cart>('cart/items', { method: 'POST', body: vars }));

export const useSetCartQuantity = () =>
  useCartMutation((vars: { item_id: number; quantity: number }) =>
    api<Cart>(`cart/items/${vars.item_id}`, { method: 'PATCH', body: { quantity: vars.quantity } }),
  );

export const useRemoveFromCart = () =>
  useCartMutation((itemId: number) => api<Cart>(`cart/items/${itemId}`, { method: 'DELETE' }));

// --- Account ------------------------------------------------------------------

export const useMe = () => {
  const token = useSession((s) => s.token);
  return useQuery({
    queryKey: ['me', token],
    queryFn: async () => {
      const me = await api<{ data: Customer }>('me').then((r) => r.data);
      await useSession.getState().setCustomer(me);
      return me;
    },
    enabled: !!token,
  });
};

export const useOrders = () => {
  const token = useSession((s) => s.token);
  return useInfiniteQuery({
    queryKey: ['orders', token],
    queryFn: ({ pageParam }) => api<Paginated<OrderSummary>>('orders', { query: { page: pageParam } }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: !!token,
  });
};

export const useOrder = (id: number) =>
  useQuery({
    queryKey: ['order', id],
    queryFn: () => api<{ data: OrderDetail }>(`orders/${id}`).then((r) => r.data),
  });

// --- Delivery geography -------------------------------------------------------

const geo = { staleTime: 30 * 60 * 1000 };

export const useRegions = () =>
  useQuery({ queryKey: ['regions'], queryFn: () => api<{ data: Region[] }>('regions').then((r) => r.data), ...geo });

export const useCities = (regionId?: number | null) =>
  useQuery({
    queryKey: ['cities', regionId ?? 'all'],
    queryFn: () => api<{ data: City[] }>('cities', { query: { region_id: regionId ?? undefined } }).then((r) => r.data),
    ...geo,
  });

export const useAreas = (cityId?: number | null) =>
  useQuery({
    queryKey: ['areas', cityId],
    queryFn: () => api<{ data: Area[] }>('areas', { query: { city_id: cityId! } }).then((r) => r.data),
    enabled: !!cityId,
    ...geo,
  });

export const usePickupLocations = (cityId?: number | null) =>
  useQuery({
    queryKey: ['pickup-locations', cityId],
    queryFn: () => api<{ data: PickupLocation[] }>('pickup-locations', { query: { city_id: cityId! } }).then((r) => r.data),
    enabled: !!cityId,
    ...geo,
  });

export const usePickupSlots = (locationId?: number | null) =>
  useQuery({
    queryKey: ['pickup-slots', locationId],
    queryFn: () => api<{ data: PickupSlot[] }>(`pickup-locations/${locationId}/slots`).then((r) => r.data),
    enabled: !!locationId,
  });

// --- Account area -------------------------------------------------------------

export type WishlistEntry = {
  product_id: number;
  item_id: number;
  title: string;
  item_title: string;
  thumbnail: string | null;
  price: number;
  original_price: number;
  sellable: boolean;
};

export type WalletEntry = { credit: number | string | null; debit: number | string | null; type: string | null; transaction_date: string | null; order_id: number | null };

export type NotificationEntry = {
  order_id: number;
  order_number: string;
  status: string;
  notes: string | null;
  created_at: string | null;
};

export type ReturnEntry = {
  id: number;
  order_id: number;
  order_number: string;
  type: string;
  status: string;
  reason: string;
  items: { item_id: number; quantity: number; amount: number }[];
  created_at: string | null;
};

export const useAddresses = () => {
  const token = useSession((s) => s.token);
  return useQuery({
    queryKey: ['addresses'],
    queryFn: () => api<{ data: Address[] }>('addresses').then((r) => r.data),
    enabled: !!token,
  });
};

export const useWishlist = () => {
  const token = useSession((s) => s.token);
  return useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api<{ data: WishlistEntry[] }>('wishlist').then((r) => r.data),
    enabled: !!token,
  });
};

export const useToggleWishlist = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, add }: { itemId: number; add: boolean }) =>
      api(`wishlist/${itemId}`, { method: add ? 'POST' : 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['wishlist'] }),
  });
};

export const useWallet = () =>
  useInfiniteQuery({
    queryKey: ['wallet'],
    queryFn: ({ pageParam }) =>
      api<Paginated<WalletEntry> & { balance: number }>('wallet', { query: { page: pageParam } }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });

export const useNotifications = () =>
  useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) => api<Paginated<NotificationEntry>>('notifications', { query: { page: pageParam } }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });

export const useReturns = () =>
  useInfiniteQuery({
    queryKey: ['returns'],
    queryFn: ({ pageParam }) => api<Paginated<ReturnEntry>>('returns', { query: { page: pageParam } }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
