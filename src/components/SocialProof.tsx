import { Star, TrendingUp, Flame, ShoppingBag } from 'lucide-react';

interface SocialProofProps {
  boughtToday?: number;
  totalBought?: number;
  avgRating?: number;
  reviewCount?: number;
  views?: number;
  stock?: number;
  language: 'ru' | 'uz';
  compact?: boolean;
}

export const SocialProofBadge = ({
  boughtToday = 0,
  avgRating = 0,
  reviewCount = 0,
  views = 0,
  stock = 0,
  language,
  compact = false,
}: SocialProofProps) => {
  const badges: Array<{ icon: typeof Star; text: string; color: string }> = [];

  // Rating badge
  if (avgRating > 0 && reviewCount > 0) {
    badges.push({
      icon: Star,
      text: `${avgRating.toFixed(1)} (${reviewCount})`,
      color: 'text-accent',
    });
  }

  // Bought today
  if (boughtToday > 0) {
    badges.push({
      icon: ShoppingBag,
      text: language === 'ru' ? `Купили сегодня: ${boughtToday}` : `Bugun sotildi: ${boughtToday}`,
      color: 'text-success',
    });
  }

  // Trending (high views)
  if (views > 100) {
    badges.push({
      icon: TrendingUp,
      text: language === 'ru' ? 'Популярно сейчас' : 'Hozir ommabop',
      color: 'text-danger',
    });
  }

  // Low stock urgency
  if (stock > 0 && stock <= 5) {
    badges.push({
      icon: Flame,
      text: language === 'ru' ? `Осталось ${stock} шт.` : `${stock} ta qoldi`,
      color: 'text-warning',
    });
  }

  if (badges.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {badges.slice(0, 2).map((badge, i) => {
          const Icon = badge.icon;
          return (
            <span key={i} className={`flex items-center gap-1 text-[10px] font-semibold ${badge.color}`}>
              <Icon className="w-3 h-3" />
              {badge.text}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {badges.map((badge, i) => {
        const Icon = badge.icon;
        return (
          <div
            key={i}
            className={`flex items-center gap-1.5 text-xs font-medium ${badge.color}`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{badge.text}</span>
          </div>
        );
      })}
    </div>
  );
};

export const SocialProofBar = ({
  boughtToday = 0,
  totalBought = 0,
  avgRating = 0,
  reviewCount = 0,
  views = 0,
  stock = 0,
  language,
}: SocialProofProps) => {
  return (
    <div className="bg-surface-50 dark:bg-surface-700/50 rounded-xl p-3 space-y-2">
      <SocialProofBadge
        boughtToday={boughtToday}
        totalBought={totalBought}
        avgRating={avgRating}
        reviewCount={reviewCount}
        views={views}
        stock={stock}
        language={language}
      />
      {totalBought > 0 && (
        <p className="text-[10px] text-surface-400">
          {language === 'ru'
            ? `Всего куплено: ${totalBought} шт. за 30 дней`
            : `Jami sotilgan: 30 kunda ${totalBought} ta`}
        </p>
      )}
    </div>
  );
};
