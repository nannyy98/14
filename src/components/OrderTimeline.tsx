import { Check, Package, CreditCard, Clock, Truck, XCircle, RotateCcw } from 'lucide-react';
import { getStatusLabel } from '../lib/orderStatuses';
import type { StatusHistoryEntry } from '../lib/supabase';

interface OrderTimelineProps {
  status: string;
  statusHistory: StatusHistoryEntry[];
  language: 'ru' | 'uz';
}

const STATUS_STEPS = ['new', 'paid', 'processing', 'assembled', 'shipped', 'delivered'];

const STEP_CONFIG: Record<string, { icon: typeof Check; emoji: string }> = {
  new: { icon: Package, emoji: '📦' },
  paid: { icon: CreditCard, emoji: '💰' },
  processing: { icon: Clock, emoji: '⚙️' },
  assembled: { icon: Package, emoji: '📋' },
  shipped: { icon: Truck, emoji: '🚚' },
  delivered: { icon: Check, emoji: '✅' },
};

export const OrderTimeline = ({ status, statusHistory, language }: OrderTimelineProps) => {
  const historyMap = new Map(statusHistory.map((h) => [h.status, h]));
  const currentIdx = STATUS_STEPS.indexOf(status);

  if (status === 'cancelled' || status === 'return_requested' || status === 'returned') {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
          {status === 'cancelled' ? (
            <XCircle className="w-5 h-5 text-danger" />
          ) : (
            <RotateCcw className="w-5 h-5 text-danger" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-danger">{getStatusLabel(status, language)}</p>
          {historyMap.get(status) && (
            <p className="text-xs text-surface-400 mt-0.5">
              {new Date(historyMap.get(status)!.changed_at).toLocaleDateString('ru-RU', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </div>
    );
  }

  const progressPercent = currentIdx >= 0 ? (currentIdx / (STATUS_STEPS.length - 1)) * 100 : 0;

  return (
    <div className="py-2">
      {/* Road visualization */}
      <div className="relative mb-6">
        {/* Road background */}
        <div className="absolute top-[18px] left-[12px] right-[12px] h-[4px] bg-surface-200 dark:bg-surface-600 rounded-full" />

        {/* Progress fill */}
        <div
          className="absolute top-[18px] left-[12px] h-[4px] bg-surface-900 dark:bg-white rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `calc(${progressPercent}% - 24px)` }}
        />

        {/* Dashed road lines */}
        <div className="absolute top-[19px] left-[12px] right-[12px] h-[2px] overflow-hidden">
          <div
            className="h-full bg-surface-400/30 dark:bg-surface-500/30"
            style={{
              backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 6px, currentColor 6px, currentColor 12px)',
              width: `calc(${100 - progressPercent}% + 24px)`,
              marginLeft: `calc(${progressPercent}% - 12px)`,
            }}
          />
        </div>

        {/* Car */}
        <div
          className="absolute top-[2px] transition-[left] duration-700 ease-out z-10"
          style={{ left: `calc(${Math.max(0, Math.min(progressPercent, 100))}% - 16px)` }}
        >
          <div className="text-2xl">
            🚗
          </div>
        </div>

        {/* Step dots */}
        <div className="relative flex justify-between">
          {STATUS_STEPS.map((step, idx) => {
            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const history = historyMap.get(step);

            return (
              <div key={step} className="flex flex-col items-center" style={{ width: '16%' }}>
                {/* Dot */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center z-10 transition-transform duration-300 ${
                    isCompleted
                      ? 'bg-surface-900 dark:bg-white text-white dark:text-surface-900 scale-100'
                      : isCurrent
                      ? 'bg-surface-900 dark:bg-white text-white dark:text-surface-900 scale-110 ring-4 ring-surface-900/10 dark:ring-white/10'
                      : 'bg-surface-100 dark:bg-surface-700 text-surface-400 dark:text-surface-500 scale-90'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" strokeWidth={3} />
                  ) : (
                    <span className="text-sm">{STEP_CONFIG[step]?.emoji}</span>
                  )}
                </div>

                {/* Label */}
                <p className={`text-[10px] font-semibold mt-1.5 text-center leading-tight ${
                  isCompleted || isCurrent
                    ? 'text-surface-900 dark:text-white'
                    : 'text-surface-400 dark:text-surface-500'
                }`}>
                  {getStatusLabel(step, language)}
                </p>

                {/* Timestamp */}
                {history && (
                  <p className="text-[9px] text-surface-400 dark:text-surface-500 mt-0.5">
                    {new Date(history.changed_at).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'short',
                    })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Status message */}
      <div className={`rounded-xl px-3 py-2 text-center text-xs font-medium ${
        currentIdx === STATUS_STEPS.length - 1
          ? 'bg-surface-900 dark:bg-white text-white dark:text-surface-900'
          : 'bg-surface-50 dark:bg-surface-700 text-surface-600 dark:text-surface-300'
      }`}>
        {currentIdx === STATUS_STEPS.length - 1
          ? (language === 'ru' ? '🎉 Заказ доставлен!' : '🎉 Buyurtma yetkazildi!')
          : (language === 'ru'
            ? `Ваш заказ в пути — ${getStatusLabel(status, language).toLowerCase()}`
            : `Buyurtmangiz yo'lda — ${getStatusLabel(status, language).toLowerCase()}`)}
      </div>
    </div>
  );
};
