import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Promotion } from '../lib/supabase/queries';
import { getLocalizedValue } from '../lib/utils';

interface FlashSaleBannerProps {
  promotion: Promotion;
  language: 'ru' | 'uz';
}

function getTimeLeft(endDate: string) {
  const now = new Date().getTime();
  const end = new Date(endDate).getTime();
  const diff = end - now;

  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

export const FlashSaleBanner = ({ promotion, language }: FlashSaleBannerProps) => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(promotion.ends_at!));

  useEffect(() => {
    if (!promotion.ends_at) return;
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(promotion.ends_at!));
    }, 1000);
    return () => clearInterval(timer);
  }, [promotion.ends_at]);

  if (!timeLeft) return null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-orange-500 to-red-600 p-4 cursor-pointer active:scale-[0.98] transition-transform"
      onClick={() => navigate('/catalog')}
    >
      {/* Animated background shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ backgroundSize: '200% 100%' }} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">
              {getLocalizedValue(promotion.title, language)}
            </h3>
            {promotion.discount_percent && (
              <span className="text-white/80 text-xs font-semibold">
                -{promotion.discount_percent}%
              </span>
            )}
          </div>
        </div>

        {/* Countdown timer */}
        <div className="flex items-center gap-1.5">
          <span className="text-white/70 text-xs font-medium mr-1">
            {language === 'ru' ? 'Осталось' : 'Qoldi'}:
          </span>
          {timeLeft.days > 0 && (
            <TimeBlock value={timeLeft.days} label={language === 'ru' ? 'д' : 'k'} />
          )}
          <TimeBlock value={timeLeft.hours} label={language === 'ru' ? 'ч' : 'soat'} />
          <span className="text-white font-bold text-lg">:</span>
          <TimeBlock value={timeLeft.minutes} label={language === 'ru' ? 'м' : 'min'} />
          <span className="text-white font-bold text-lg">:</span>
          <TimeBlock value={timeLeft.seconds} label={language === 'ru' ? 'с' : 's'} />
        </div>
      </div>
    </div>
  );
};

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/20 rounded-lg px-2 py-1 min-w-[36px] text-center">
        <span className="text-white font-bold text-lg leading-none">{value.toString().padStart(2, '0')}</span>
      </div>
      <span className="text-white/60 text-[9px] mt-0.5">{label}</span>
    </div>
  );
}
