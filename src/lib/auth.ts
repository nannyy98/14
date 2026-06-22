import { supabase } from './supabase';

export type AdminRole = 'super_admin' | 'admin' | 'manager' | 'seller' | 'support' | 'content';

export interface AdminUser {
  id: string;
  first_name: string;
  email: string;
  role: AdminRole;
  _token?: string;
  _expiresAt?: number;
}

const STORAGE_KEY = 'styletech_admin';
const SESSION_VERIFY_KEY = 'styletech_admin_session_verified';
const SESSION_VERIFY_TTL = 5 * 60 * 1000; // 5 minutes client-side cache
const SESSION_DURATION = 4 * 60 * 60 * 1000; // 4 hours session lifetime

function hashToken(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

function isSessionExpired(user: AdminUser): boolean {
  if (!user._expiresAt) return false;
  return Date.now() > user._expiresAt;
}

function saveAdmin(user: AdminUser): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  localStorage.setItem(SESSION_VERIFY_KEY, Date.now().toString());
}

export async function loginAdmin(email: string, password: string): Promise<AdminUser | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) return null;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'Apikey': anonKey,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.success || !data.admin) return null;

    const user: AdminUser = {
      id: data.admin.id,
      first_name: data.admin.first_name,
      email: data.admin.email,
      role: data.admin.role as AdminRole,
      _token: data.sessionToken,
      _expiresAt: Date.now() + SESSION_DURATION,
    };

    saveAdmin(user);
    return user;
  } catch {
    return null;
  }
}

async function refreshAdminSession(user: AdminUser): Promise<boolean> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey || !user._token) return false;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'Apikey': anonKey,
      },
      body: JSON.stringify({ action: 'refresh', sessionToken: user._token }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    if (!data.success || !data.sessionToken) return false;

    user._token = data.sessionToken;
    user._expiresAt = Date.now() + SESSION_DURATION;
    saveAdmin(user);
    return true;
  } catch {
    return false;
  }
}

export async function verifyAdminSession(): Promise<boolean> {
  const user = getCurrentAdmin();
  if (!user || !user._token) return false;

  // Check if session has expired
  if (isSessionExpired(user)) {
    // Try to refresh
    const refreshed = await refreshAdminSession(user);
    if (!refreshed) {
      logoutAdmin();
      return false;
    }
    return true;
  }

  // Check if we verified recently (client-side cache)
  const lastVerify = parseInt(localStorage.getItem(SESSION_VERIFY_KEY) || '0', 10);
  if (Date.now() - lastVerify < SESSION_VERIFY_TTL) {
    return true;
  }

  // Verify server-side
  const { data } = await supabase
    .from('admin_accounts')
    .select('id')
    .eq('id', user.id)
    .eq('session_token', hashToken(user._token))
    .eq('is_active', true)
    .maybeSingle();

  if (data) {
    localStorage.setItem(SESSION_VERIFY_KEY, Date.now().toString());
    return true;
  }

  // Session invalid — clear local storage
  logoutAdmin();
  return false;
}

export function getCurrentAdmin(): AdminUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

export function logoutAdmin(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_VERIFY_KEY);
}

export function canManageUsers(user: AdminUser | null): boolean {
  return user?.role === 'super_admin' || user?.role === 'admin';
}

export function canManageOrders(user: AdminUser | null): boolean {
  return ['super_admin', 'admin', 'manager', 'support'].includes(user?.role ?? '');
}

export function canManageProducts(user: AdminUser | null): boolean {
  return ['super_admin', 'admin', 'manager', 'seller', 'content'].includes(user?.role ?? '');
}

export function canManageBanners(user: AdminUser | null): boolean {
  return ['super_admin', 'admin', 'manager', 'content'].includes(user?.role ?? '');
}

export function canManageDelivery(user: AdminUser | null): boolean {
  return ['super_admin', 'admin', 'manager'].includes(user?.role ?? '');
}

export function canViewAuditLog(user: AdminUser | null): boolean {
  return ['super_admin', 'admin'].includes(user?.role ?? '');
}

export function canManageCoupons(user: AdminUser | null): boolean {
  return ['super_admin', 'admin', 'manager'].includes(user?.role ?? '');
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Суперадмин',
  admin: 'Администратор',
  manager: 'Менеджер',
  seller: 'Продавец',
  support: 'Поддержка',
  content: 'Контент-менеджер',
};
