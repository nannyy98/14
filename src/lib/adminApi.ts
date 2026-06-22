import { getCurrentAdmin } from './auth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function adminApiCall(action: string, table: string, params?: {
  data?: unknown;
  filters?: Record<string, unknown>;
  id?: string;
}) {
  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase not configured');
  }

  const admin = getCurrentAdmin();
  if (!admin?._token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/admin-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
      'Apikey': anonKey,
    },
    body: JSON.stringify({
      action,
      table,
      sessionToken: admin._token,
      ...params,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Admin API error');
  }

  const result = await response.json();
  return result.data;
}

export const adminQueries = {
  getOrders: async () => {
    return adminApiCall('select', 'orders');
  },

  updateOrderStatus: async (orderId: string, status: string, changedBy: string) => {
    return adminApiCall('updateOrderStatus', 'orders', {
      id: orderId,
      data: { status, changed_by: changedBy },
    });
  },

  getProducts: async () => {
    return adminApiCall('select', 'products');
  },

  createProduct: async (product: Record<string, unknown>) => {
    return adminApiCall('insert', 'products', { data: product });
  },

  updateProduct: async (id: string, updates: Record<string, unknown>) => {
    return adminApiCall('update', 'products', { id, data: updates });
  },

  deleteProduct: async (id: string) => {
    return adminApiCall('delete', 'products', { id });
  },

  getBanners: async () => {
    return adminApiCall('select', 'banners');
  },

  createBanner: async (banner: Record<string, unknown>) => {
    return adminApiCall('insert', 'banners', { data: banner });
  },

  updateBanner: async (id: string, updates: Record<string, unknown>) => {
    return adminApiCall('update', 'banners', { id, data: updates });
  },

  deleteBanner: async (id: string) => {
    return adminApiCall('delete', 'banners', { id });
  },

  getDeliveryZones: async () => {
    return adminApiCall('select', 'delivery_zones');
  },

  createDeliveryZone: async (zone: Record<string, unknown>) => {
    return adminApiCall('insert', 'delivery_zones', { data: zone });
  },

  updateDeliveryZone: async (id: string, updates: Record<string, unknown>) => {
    return adminApiCall('update', 'delivery_zones', { id, data: updates });
  },

  deleteDeliveryZone: async (id: string) => {
    return adminApiCall('delete', 'delivery_zones', { id });
  },

  getCoupons: async () => {
    return adminApiCall('select', 'coupons');
  },

  createCoupon: async (coupon: Record<string, unknown>) => {
    return adminApiCall('insert', 'coupons', { data: coupon });
  },

  updateCoupon: async (id: string, updates: Record<string, unknown>) => {
    return adminApiCall('update', 'coupons', { id, data: updates });
  },

  deleteCoupon: async (id: string) => {
    return adminApiCall('delete', 'coupons', { id });
  },

  getReturns: async () => {
    return adminApiCall('select', 'returns');
  },

  updateReturnStatus: async (id: string, updates: Record<string, unknown>) => {
    return adminApiCall('update', 'returns', { id, data: updates });
  },

  getUsers: async () => {
    return adminApiCall('select', 'users');
  },

  getAuditLog: async () => {
    return adminApiCall('select', 'audit_log');
  },

  getAdminAccounts: async () => {
    return adminApiCall('select', 'admin_accounts');
  },

  createAdminAccount: async (account: Record<string, unknown>) => {
    return adminApiCall('insert', 'admin_accounts', { data: account });
  },

  updateAdminAccount: async (id: string, updates: Record<string, unknown>) => {
    return adminApiCall('update', 'admin_accounts', { id, data: updates });
  },
};
