import { useState, useEffect } from 'react';
import { Eye, ShoppingCart, Clock, Flame, AlertTriangle } from 'lucide-react';

interface UrgencyWidgetProps {
  productId: string;
  stock?: number;
  promoEndsAt?: string | null;
  views?: number;
  language: 'ru' | 'uz';
  activeViewers?: number;
  cartPressure?: number;
}

export const UrgencyWidget = ({
  stock = 0,
  promoEndsAt,
  views = 0,
  language,
  activeViewers = 0,
  cartPressure = 0,
}: UrgencyWidgetProps) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!promoEndsAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const end = new Date(promoEndsAt).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}ч ${minutes}м`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}м ${seconds}с`);
      } else {
        setTimeLeft(`${seconds}с`);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [promoEndsAt]);

  const items: Array<{
    icon: typeof Eye;
    text: string;
    color: string;
    pulse?: boolean;
  }> = [];

  // Countdown timer
  if (timeLeft && promoEndsAt) {
    items.push({
      icon: Clock,
      text: language === 'ru' ? `Акция заканчивается через ${timeLeft}` : `Aksiya ${timeLeft} da tugaydi`,
      color: 'text-danger',
      pulse: true,
    });
  }

  // Active viewers
  if (activeViewers > 1) {
    items.push({
      icon: Eye,
      text: language === 'ru'
        ? `${activeViewers} человек смотрят сейчас`
        : `${activeViewers} kishi hozir ko'rishda`,
      color: 'text-blue-500',
    });
  }

  // Cart pressure
  if (cartPressure > 0) {
    items.push({
      icon: ShoppingCart,
      text: language === 'ru'
        ? `${cartPressure} человек положили в корзину`
        : `${cartPressure} kishi savatga qo'ydi`,
      color: 'text-warning',
    });
  }

  // Low stock urgency
  if (stock > 0 && stock <= 3) {
    items.push({
      icon: AlertTriangle,
      text: language === 'ru'
        ? `Осталось всего ${stock} шт. — хватит ненадолго!`
        : `Faqat ${stock} ta qoldi — ko'p turmaydi!`,
      color: 'text-danger',
      pulse: true,
    });
  } else if (stock > 0 && stock <= 10) {
    items.push({
      icon: Flame,
      text: language === 'ru'
        ? `Осталось ${stock} шт.`
        : `${stock} ta qoldi`,
      color: 'text-warning',
    });
  }

  // Trending
  if (views > 200) {
    items.push({
      icon: Flame,
      text: language === 'ru' ? '🔥 Хит продаж' : '🔥 Sotish hiti',
      color: 'text-danger',
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={i}
            className={`flex items-center gap-2 text-xs font-medium ${item.color}`}
          >
            <Icon className={`w-3.5 h-3.5 flex-shrink-0`} />
            <span>{item.text}</span>
          </div>
        );
      })}
    </div>
  );
};

export const UrgencyBadge = ({
  stock,
  promoEndsAt,
  views,
  language,
}: {
  stock?: number;
  promoEndsAt?: string | null;
  views?: number;
  language: 'ru' | 'uz';
}) => {
  if (stock !== undefined && stock > 0 && stock <= 5) {
    return (
      <div className="absolute top-2 left-2 z-10 bg-danger text-white text-2xs font-bold px-2 py-1 rounded-lg">
        {language === 'ru' ? `Осталось ${stock}!` : `${stock} qoldi!`}
      </div>
    );
  }

  if (promoEndsAt) {
    return (
      <div className="absolute top-2 left-2 z-10 bg-danger text-white text-2xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {language === 'ru' ? 'АКЦИЯ' : 'AKSIYA'}
      </div>
    );
  }

  if (views !== undefined && views > 100) {
    return (
      <div className="absolute top-2 left-2 z-10 bg-surface-900 text-white text-2xs font-bold px-2 py-1 rounded-lg">
        🔥 {language === 'ru' ? 'Хит' : 'Hit'}
      </div>
    );
  }

  return null;
};
