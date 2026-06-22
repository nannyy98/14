import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../supabase';
import {
  productQueries,
  categoryQueries,
  orderQueries,
  reviewQueries,
  promotionQueries,
  referralQueries,
  paymentQueries,
  bannerQueries,
  deliveryZoneQueries,
  inventoryQueries,
  userQueries,
  favoriteQueries,
  couponQueries,
  returnQueries,
  notificationQueries,
  auditLogQueries,
  productRelationQueries,
  priceRuleQueries,
  notificationSubscriptionQueries,
  socialProofQueries,
  urgencyQueries,
  type ProductFilters,
  type ProductSort,
  PAGE_SIZE,
} from './queries';
import type { Database } from '../supabase';

export { userQueries } from './queries';

// Products
export const useProducts = (filters?: ProductFilters, sort?: ProductSort) => {
  return useInfiniteQuery({
    queryKey: ['products', filters, sort],
    queryFn: ({ pageParam = 0 }) => productQueries.getAll(filters, sort, pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });
};

export const useProduct = (slug: string) => {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => productQueries.getBySlug(slug),
    enabled: !!slug,
  });
};

export const useIncrementViews = () => {
  return useMutation({
    mutationFn: (productId: string) => productQueries.incrementViews(productId),
  });
};

export const useProductsByIds = (ids: string[]) => {
  return useQuery({
    queryKey: ['products', 'byIds', ids],
    queryFn: () => productQueries.getByIds(ids),
    enabled: ids.length > 0,
  });
};

export const useCartStockCheck = (productIds: string[]) => {
  return useQuery({
    queryKey: ['cart_stock', productIds],
    queryFn: async () => {
      if (!productIds.length || !isSupabaseConfigured) return {};
      const { data } = await supabase
        .from('products')
        .select('id, stock')
        .in('id', productIds);
      const stockMap: Record<string, number> = {};
      (data ?? []).forEach((p: { id: string; stock: number }) => { stockMap[p.id] = p.stock; });
      return stockMap;
    },
    enabled: productIds.length > 0,
    refetchInterval: 30000,
    staleTime: 15000,
  });
};

export const useUploadProductImages = () => {
  return useMutation({
    mutationFn: (files: File[]) => productQueries.uploadImages(files),
  });
};

// Users
export const useUserProfile = (telegramId: number) => {
  return useQuery({
    queryKey: ['user_profile', telegramId],
    queryFn: () => userQueries.getByTelegramId(telegramId),
    enabled: telegramId > 0,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ telegramId, updates }: { telegramId: number; updates: { phone?: string; address?: string; first_name?: string } }) =>
      userQueries.updateProfile(telegramId, updates),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user_profile', variables.telegramId] });
    },
  });
};

// Categories
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryQueries.getAll(),
  });
};

// Orders
export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderData: Database['public']['Tables']['orders']['Insert']) =>
      orderQueries.create(orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const useOrders = (telegramUserId: number) => {
  return useQuery({
    queryKey: ['orders', telegramUserId],
    queryFn: () => orderQueries.getByTelegramUserId(telegramUserId),
    enabled: telegramUserId > 0,
  });
};

export const useOrder = (orderId: string) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderQueries.getById(orderId),
    enabled: !!orderId,
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, changedBy, note }: { id: string; status: string; changedBy?: string; note?: string }) =>
      orderQueries.updateStatus(id, status, changedBy, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

// Inventory
export const useInventoryProducts = () => {
  return useQuery({
    queryKey: ['inventory_products'],
    queryFn: () => inventoryQueries.getAllWithStock(),
  });
};

export const useUpdateStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, newStock }: { productId: string; newStock: number }) =>
      inventoryQueries.updateStock(productId, newStock),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useAdjustStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, delta }: { productId: string; delta: number }) =>
      inventoryQueries.adjustStock(productId, delta),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

// Reviews
export const useProductReviews = (productId: string) => {
  return useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => reviewQueries.getByProductId(productId),
    enabled: !!productId,
  });
};

export const useProductReviewsWithVotes = (productId: string, sort: 'newest' | 'highest' | 'helpful' = 'newest') => {
  return useQuery({
    queryKey: ['reviews_with_votes', productId, sort],
    queryFn: () => reviewQueries.getWithVotes(productId, sort),
    enabled: !!productId,
  });
};

export const useRatingBreakdown = (productId: string) => {
  return useQuery({
    queryKey: ['rating_breakdown', productId],
    queryFn: () => reviewQueries.getRatingBreakdown(productId),
    enabled: !!productId,
  });
};

export const useVoteReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, userId, helpful }: { reviewId: string; userId: number; helpful: boolean }) =>
      reviewQueries.voteHelpful(reviewId, userId, helpful),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews_with_votes'] });
    },
  });
};

export const useCreateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewData: Database['public']['Tables']['reviews']['Insert']) =>
      reviewQueries.create(reviewData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', data.product_id] });
    },
  });
};

export const useProductRating = (productId: string) => {
  return useQuery({
    queryKey: ['rating', productId],
    queryFn: () => reviewQueries.getAverageRating(productId),
    enabled: !!productId,
  });
};

// Promotions
export const usePromotions = (type?: 'new_arrival' | 'sale' | 'featured') => {
  return useQuery({
    queryKey: ['promotions', type],
    queryFn: () => promotionQueries.getActive(type),
  });
};

export const usePromotionProducts = (promotionId: string) => {
  return useQuery({
    queryKey: ['promotion-products', promotionId],
    queryFn: () => promotionQueries.getProductsByPromotion(promotionId),
    enabled: !!promotionId,
  });
};

// Referrals
export const useReferralByCode = (code: string) => {
  return useQuery({
    queryKey: ['referral', code],
    queryFn: () => referralQueries.getByCode(code),
    enabled: !!code,
  });
};

export const useCreateReferral = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (telegramId: number) => referralQueries.create(telegramId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });
};

export const useUserReferrals = (telegramId: number) => {
  return useQuery({
    queryKey: ['referrals', telegramId],
    queryFn: () => referralQueries.getByReferrer(telegramId),
    enabled: !!telegramId,
  });
};

export const useRedeemReferral = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ referralId, telegramId }: { referralId: string; telegramId: number }) =>
      referralQueries.redeem(referralId, telegramId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });
};

// Delivery Zones
export const useDeliveryZones = (activeOnly = true) => {
  return useQuery({
    queryKey: ['delivery_zones', activeOnly],
    queryFn: () => activeOnly ? deliveryZoneQueries.getActive() : deliveryZoneQueries.getAll(),
    staleTime: 1000 * 60 * 30, // 30 minutes - delivery zones rarely change
  });
};

export const useCreateDeliveryZone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deliveryZoneQueries.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_zones'] });
    },
  });
};

export const useUpdateDeliveryZone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Database['public']['Tables']['delivery_zones']['Update']> }) => deliveryZoneQueries.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_zones'] });
    },
  });
};

export const useDeleteDeliveryZone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deliveryZoneQueries.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_zones'] });
    },
  });
};

// Banners
export const useBanners = (activeOnly = true) => {
  return useQuery({
    queryKey: ['banners', activeOnly],
    queryFn: () => activeOnly ? bannerQueries.getActive() : bannerQueries.getAll(),
    staleTime: 1000 * 60 * 15, // 15 minutes - banners rarely change
  });
};

export const useCreateBanner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bannerQueries.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
  });
};

export const useUpdateBanner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Database['public']['Tables']['banners']['Update']> }) => bannerQueries.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
  });
};

export const useDeleteBanner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bannerQueries.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
  });
};

// Payments
export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, amount, paymentMethod }: {
      orderId: string;
      amount: number;
      paymentMethod: 'payme' | 'click' | 'uzum';
    }) => paymentQueries.createPayment(orderId, amount, paymentMethod),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

// Favorites
export const useFavorites = (telegramUserId: number) => {
  return useQuery({
    queryKey: ['favorites', telegramUserId],
    queryFn: () => favoriteQueries.getByUser(telegramUserId),
    enabled: telegramUserId > 0,
  });
};

export const useFavoriteIds = (telegramUserId: number) => {
  return useQuery({
    queryKey: ['favorite_ids', telegramUserId],
    queryFn: () => favoriteQueries.getProductIds(telegramUserId),
    enabled: telegramUserId > 0,
    staleTime: 1000 * 60,
  });
};

export const useToggleFavorite = (telegramUserId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, isFavorite }: { productId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        await favoriteQueries.remove(telegramUserId, productId);
      } else {
        await favoriteQueries.add(telegramUserId, productId);
      }
    },
    onMutate: async ({ productId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ['favorite_ids', telegramUserId] });
      const prev = queryClient.getQueryData<string[]>(['favorite_ids', telegramUserId]) ?? [];
      queryClient.setQueryData<string[]>(
        ['favorite_ids', telegramUserId],
        isFavorite ? prev.filter((id) => id !== productId) : [...prev, productId]
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['favorite_ids', telegramUserId], ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite_ids', telegramUserId] });
      queryClient.invalidateQueries({ queryKey: ['favorites', telegramUserId] });
    },
  });
};

// Coupons
export const useValidateCoupon = () => {
  return useMutation({
    mutationFn: ({ code, telegramUserId, orderAmount }: { code: string; telegramUserId: number; orderAmount: number }) =>
      couponQueries.validate(code, telegramUserId, orderAmount),
  });
};

export const useCoupons = () => {
  return useQuery({
    queryKey: ['coupons'],
    queryFn: () => couponQueries.getAll(),
  });
};

export const useCreateCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: couponQueries.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coupons'] }),
  });
};

export const useUpdateCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => couponQueries.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coupons'] }),
  });
};

export const useDeleteCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: couponQueries.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coupons'] }),
  });
};

// Returns
export const useCreateReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: returnQueries.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['returns'] }),
  });
};

export const useUserReturns = (telegramUserId: number) => {
  return useQuery({
    queryKey: ['returns', telegramUserId],
    queryFn: () => returnQueries.getByUser(telegramUserId),
    enabled: telegramUserId > 0,
  });
};

export const useAllReturns = () => {
  return useQuery({
    queryKey: ['returns'],
    queryFn: () => returnQueries.getAll(),
  });
};

export const useUpdateReturnStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, adminNote }: { id: string; status: 'pending' | 'approved' | 'rejected' | 'refunded'; adminNote?: string }) =>
      returnQueries.updateStatus(id, status, adminNote),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['returns'] }),
  });
};

// Notifications
export const useNotifications = (telegramUserId: number) => {
  return useQuery({
    queryKey: ['notifications', telegramUserId],
    queryFn: () => notificationQueries.getByUser(telegramUserId),
    enabled: telegramUserId > 0,
    refetchInterval: 30000,
  });
};

export const useUnreadNotificationCount = (telegramUserId: number) => {
  return useQuery({
    queryKey: ['notification_count', telegramUserId],
    queryFn: () => notificationQueries.getUnreadCount(telegramUserId),
    enabled: telegramUserId > 0,
    refetchInterval: 30000,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationQueries.markAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notification_count'] }),
  });
};

export const useMarkAllNotificationsRead = (telegramUserId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationQueries.markAllAsRead(telegramUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification_count'] });
    },
  });
};

// Audit Log
export const useAuditLog = (limit?: number) => {
  return useQuery({
    queryKey: ['audit_log'],
    queryFn: () => auditLogQueries.getAll(limit),
  });
};

// Product Relations
export const useProductRelations = (productId: string, type?: 'upsell' | 'cross_sell' | 'bundle') => {
  return useQuery({
    queryKey: ['product_relations', productId, type],
    queryFn: () => productRelationQueries.getRelated(productId, type),
    enabled: !!productId,
  });
};

export const useCreateProductRelation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productRelationQueries.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product_relations'] }),
  });
};

// Price Rules
export const usePriceRules = () => {
  return useQuery({
    queryKey: ['price_rules'],
    queryFn: () => priceRuleQueries.getActive(),
    staleTime: 1000 * 60 * 30,
  });
};

export const useVolumeDiscount = (totalAmount: number, itemsCount: number) => {
  return useQuery({
    queryKey: ['volume_discount', totalAmount, itemsCount],
    queryFn: () => priceRuleQueries.calculateDiscount(totalAmount, itemsCount),
    enabled: totalAmount > 0 && itemsCount >= 3,
  });
};


// Notification Subscriptions
export const useNotificationSubscriptions = (userId: number, productId: string) => {
  return useQuery({
    queryKey: ['notif_subs', userId, productId],
    queryFn: () => notificationSubscriptionQueries.getUserSubscriptions(userId, productId),
    enabled: userId > 0 && !!productId,
  });
};

export const useSubscribeNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, productId, type, targetPrice }: {
      userId: number;
      productId: string;
      type: 'price_drop' | 'back_in_stock' | 'low_stock';
      targetPrice?: number;
    }) => notificationSubscriptionQueries.subscribe(userId, productId, type, targetPrice),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notif_subs', variables.userId, variables.productId] });
    },
  });
};

export const useUnsubscribeNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, productId, type }: { userId: number; productId: string; type: string }) =>
      notificationSubscriptionQueries.unsubscribe(userId, productId, type),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notif_subs', variables.userId, variables.productId] });
    },
  });
};


// Social Proof
export const useSocialProof = (productIds: string[]) => {
  return useQuery({
    queryKey: ['social_proof', productIds],
    queryFn: () => socialProofQueries.getForProducts(productIds),
    enabled: productIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });
};

export const useBoughtToday = (productId: string) => {
  return useQuery({
    queryKey: ['bought_today', productId],
    queryFn: () => socialProofQueries.getBoughtToday(productId),
    enabled: !!productId,
    staleTime: 1000 * 60 * 5,
  });
};


// Urgency & Scarcity
export const useActiveViewers = (productId: string) => {
  return useQuery({
    queryKey: ['active_viewers', productId],
    queryFn: () => urgencyQueries.getActiveViewers(productId),
    enabled: !!productId,
    refetchInterval: 60000,
    staleTime: 30000,
  });
};

export const useCartPressure = (productId: string) => {
  return useQuery({
    queryKey: ['cart_pressure', productId],
    queryFn: () => urgencyQueries.getCartPressure(productId),
    enabled: !!productId,
    staleTime: 60000,
  });
};

export const useRecordViewer = () => {
  return useMutation({
    mutationFn: ({ productId, userId }: { productId: string; userId: number }) =>
      urgencyQueries.recordViewer(productId, userId),
  });
};
