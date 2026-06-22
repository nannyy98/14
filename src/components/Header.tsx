import { useState } from 'react';
import { ShoppingBag, User, Bell, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { useAppStore } from '../store/useAppStore';
import { useUnreadNotificationCount } from '../lib/supabase/hooks';
import { Logo } from './Logo';
import { NotificationCenter } from './NotificationCenter';

export const Header = () => {
  const totalItems = useCartStore((state) => state.getTotalItems());
  const { getUserId } = useAppStore();
  const userId = getUserId();
  const { data: unreadCount = 0 } = useUnreadNotificationCount(userId);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 glass dark:glass-dark border-b border-surface-100/50 dark:border-surface-700/50">
        <div className="px-4 h-14 flex items-center justify-between">
          <Link to="/catalog" className="flex items-center gap-2">
            <Logo size="sm" variant="icon" />
            <span className="text-sm font-bold tracking-widest text-surface-900 dark:text-white uppercase">
              StyleTech
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
            >
              <Bell className="w-5 h-5 text-surface-600 dark:text-surface-300" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-surface-900 text-white text-2xs font-bold rounded-full animate-bounce-in">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <Link
              to="/cart"
              className="relative p-2.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
            >
              <ShoppingBag className="w-5 h-5 text-surface-600 dark:text-surface-300" />
              {totalItems > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-surface-900 text-white text-2xs font-bold rounded-full animate-bounce-in">
                  {totalItems}
                </span>
              )}
            </Link>

            <Link
              to="/profile"
              className="p-2.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
            >
              <User className="w-5 h-5 text-surface-600 dark:text-surface-300" />
            </Link>
          </div>
        </div>
      </header>

      {showNotifications && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-surface-800 rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">Уведомления</h2>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <NotificationCenter />
          </div>
        </div>
      )}
    </>
  );
};
