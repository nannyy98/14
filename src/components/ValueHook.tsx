import { useMemo } from 'react';
import { Zap, Truck, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getLocalizedValue, formatPrice } from '../lib/utils';

interface Product {
  id: string;
  name: { ru: string; uz: string } | string;
  price: number;
  stock: number;
  views: number;
}

interface ValueHookProps {
  products: Product[];
  language: 'ru' | 'uz';
}

export const ValueHook = ({ products, language }: ValueHookProps) => {
  const navigate = useNavigate();

  const hook = useMemo(() => {
    if (products.length === 0) return null;

    // Find most viewed
    const popular = [...products].sort((a, b) => b.views - a.views)[0];
    // Find cheapest price
    const prices = products.map((p) => p.price).filter((p) => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

    // Pick the best hook dynamically
    const hooks = [
      {
        icon: Zap,
        text: language === 'ru'
          ? `От ${formatPrice(minPrice)} — лучшие цены в Ташкенте`
          : `${formatPrice(minPrice)} dan boshlanadi — Toshkentdagi eng yaxshi narxlar`,
        color: 'from-red-600 to-orange-500',
        action: () => navigate('/catalog'),
      },
      {
        icon: TrendingUp,
        text: language === 'ru'
          ? `${popular ? getLocalizedValue(popular.name, language) : 'Хит недели'} — ${popular ? formatPrice(popular.price) : ''}`
          : `${popular ? getLocalizedValue(popular.name, language) : 'Hafta hiti'} — ${popular ? formatPrice(popular.price) : ''}`,
        color: 'from-surface-900 to-surface-700',
        action: () => navigate('/catalog'),
      },
      {
        icon: Truck,
        text: language === 'ru'
          ? `Бесплатная доставка при заказе от 500,000 сум`
          : "500,000 so'mdan bepul yetkazib berish",
        color: 'from-blue-600 to-blue-500',
        action: () => navigate('/catalog'),
      },
    ];

    // Rotate based on time (different hook every 30 seconds for returning users)
    const idx = Math.floor(Date.now() / 30000) % hooks.length;
    return hooks[idx];
  }, [products, language, navigate]);

  if (!hook) return null;

  const Icon = hook.icon;

  return (
    <div
      className={`bg-gradient-to-r ${hook.color} rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform`}
      onClick={hook.action}
    >
      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-white text-sm font-semibold flex-1 leading-snug">
        {hook.text}
      </p>
      <span className="text-white/60 text-xs">→</span>
    </div>
  );
};
