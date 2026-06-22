const STORAGE_KEY = 'recently_viewed_products';
const MAX_ITEMS = 12;

export function getRecentlyViewed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addToRecentlyViewed(productId: string) {
  if (!productId) return;
  const items = getRecentlyViewed().filter((id) => id !== productId);
  items.unshift(productId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

export function clearRecentlyViewed() {
  localStorage.removeItem(STORAGE_KEY);
}
