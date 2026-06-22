import { ShoppingCart, Package, User, LayoutGrid, Heart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useCartStore } from '../store/useCartStore';
import { useFavoriteIds } from '../lib/supabase/hooks';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';

export const BottomNav = () => {
  const { t, language } = useTranslation();
  const location = useLocation();
  const totalItems = useCartStore((state) => state.getTotalItems());
  const userId = useAppStore((s) => s.getUserId());
  const { data: favoriteIds = [] } = useFavoriteIds(userId);

  const navItems = [
    { path: '/catalog', icon: LayoutGrid, label: t('catalog') },
    { path: '/favorites', icon: Heart, label: language === 'ru' ? 'Избранное' : 'Tanlangan', badge: favoriteIds.length },
    { path: '/cart', icon: ShoppingCart, label: t('cart'), badge: totalItems },
    { path: '/orders', icon: Package, label: t('orders') },
    { path: '/profile', icon: User, label: t('profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass dark:glass-dark border-t border-surface-100/50 dark:border-surface-700/50 pb-safe">
      <div className="flex items-stretch justify-around h-16">
        {navItems.map(({ path, icon: Icon, label, badge }) => {
          const isActive = location.pathname === path ||
            (path === '/catalog' && location.pathname.startsWith('/product'));
          const isFavorites = path === '/favorites';
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 gap-1 relative transition-colors duration-150',
                isActive
                  ? 'text-surface-900'
                  : 'text-surface-400 dark:text-surface-500 active:text-surface-600 dark:active:text-surface-300'
              )}
            >
              <div className="relative">
                <div className={cn(
                  'p-1 rounded-xl transition-colors duration-150',
                  isActive && 'bg-surface-100 dark:bg-surface-700'
                )}>
                  <Icon
                    className="w-5 h-5 transition-colors duration-150"
                    strokeWidth={isActive ? 2.5 : 1.8}
                    style={isActive && isFavorites ? { fill: '#C9A24D', color: '#C9A24D' } : undefined}
                  />
                </div>
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 flex items-center justify-center px-1 bg-surface-900 text-white text-2xs font-bold rounded-full animate-bounce-in">
                    {badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-2xs transition-colors duration-150",
                isActive ? "font-bold" : "font-medium"
              )}>
                {label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-surface-900 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
