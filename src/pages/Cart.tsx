import { useState, useMemo } from 'react';
import { Trash2, Minus, Plus, ShoppingBag, Lock, AlertTriangle, Heart, ArrowRight, Tag, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useTranslation } from '../hooks/useTranslation';
import { useCartStore } from '../store/useCartStore';
import { useCartStockCheck, useVolumeDiscount, useProducts } from '../lib/supabase/hooks';
import { formatPrice, getLocalizedValue } from '../lib/utils';
import { ProductCard } from '../components/ProductCard';
import { hapticNotification } from '../lib/telegram';

export const Cart = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, getTotalPrice } = useCartStore();
  const [confirmRemove, setConfirmRemove] = useState<{ productId: string; size?: string; colorHex?: string } | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const cartProductIds = useMemo(() => items.map((i) => i.productId), [items]);
  const { data: stockMap = {} } = useCartStockCheck(cartProductIds);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const { data: discount } = useVolumeDiscount(getTotalPrice(), totalItems);

  const { data: recommendedData } = useProducts(undefined, { field: 'views', order: 'desc' });
  const recommended = recommendedData?.pages.flatMap((p) => p.items)
    .filter((p) => !cartProductIds.includes(p.id))
    .slice(0, 6) ?? [];

  const getStockWarning = (productId: string, quantity: number) => {
    const stock = stockMap[productId];
    if (stock === undefined) return null;
    if (stock === 0) return language === 'ru' ? 'Нет в наличии' : 'Mavjud emas';
    if (stock < quantity) return language === 'ru' ? `Осталось только ${stock} шт.` : `Faqat ${stock} ta qoldi`;
    if (stock <= 3) return language === 'ru' ? `Осталось мало (${stock} шт.)` : `Kam qoldi (${stock} ta)`;
    return null;
  };

  const getStock = (productId: string) => stockMap[productId] ?? 99;

  const handleRemove = (productId: string, size?: string, colorHex?: string) => {
    setConfirmRemove({ productId, size, colorHex });
  };

  const confirmRemoveItem = () => {
    if (confirmRemove) {
      removeItem(confirmRemove.productId, confirmRemove.size, confirmRemove.colorHex);
      setConfirmRemove(null);
    }
  };

  const handleSaveForLater = (item: typeof items[0]) => {
    removeItem(item.productId, item.size, item.color?.hex);
    hapticNotification('success');
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center px-4 py-16">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-3xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
              <ShoppingBag className="w-12 h-12 text-surface-300 dark:text-surface-600" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
              <span className="text-lg">🛒</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-2">
            {language === 'ru' ? 'Корзина пуста' : "Savat bo'sh"}
          </h2>
          <p className="text-sm text-surface-500 dark:text-surface-400 mb-8 text-center max-w-xs">
            {language === 'ru'
              ? 'Добавьте товары из каталога, чтобы оформить заказ'
              : "Buyurtma berish uchun katalogdan mahsulotlar qo'shing"}
          </p>
          <button
            onClick={() => navigate('/catalog')}
            className="btn-brand px-8 py-3.5 rounded-xl text-sm flex items-center gap-2"
          >
            {language === 'ru' ? 'Перейти в каталог' : "Katalogga o'tish"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-3 pt-3">
        <h1 className="text-lg font-bold text-surface-900 dark:text-white mb-3">
          {t('cart')} <span className="text-surface-400 font-normal text-sm">({totalItems} {language === 'ru' ? 'шт.' : 'dona'})</span>
        </h1>

        <div className="space-y-2.5 pb-52">
          {items.map((item) => {
            const stock = getStock(item.productId);
            const maxQty = Math.min(stock, 99);
            const cartKey = `${item.productId}-${item.size ?? ''}-${item.color?.hex ?? ''}`;

            return (
              <div
                key={cartKey}
                className="bg-white dark:bg-surface-800 rounded-2xl p-3 shadow-sm"
              >
                <div className="flex gap-3">
                  {/* Image — clickable */}
                  <button
                    onClick={() => navigate(`/product/${item.productId}`)}
                    className="w-20 h-20 bg-surface-100 dark:bg-surface-700 rounded-xl overflow-hidden flex-shrink-0"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={getLocalizedValue(item.name, language)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-surface-400 text-xs">
                        {t('no_image')}
                      </div>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    {/* Name + Price */}
                    <div className="flex items-start justify-between">
                      <button
                        onClick={() => navigate(`/product/${item.productId}`)}
                        className="text-sm font-medium text-surface-900 dark:text-white truncate pr-2 hover:underline"
                      >
                        {getLocalizedValue(item.name, language)}
                      </button>
                    </div>

                    {/* Size + Color */}
                    <div className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 flex flex-wrap gap-x-2">
                      {item.size && <span>{t('size')}: {item.size}</span>}
                      {item.color && (
                        <span className="flex items-center gap-1">
                          {t('color')}:
                          <span
                            className="inline-block w-3 h-3 rounded-full border border-surface-300"
                            style={{ backgroundColor: item.color.hex }}
                          />
                          {item.color.name}
                        </span>
                      )}
                    </div>

                    {/* Stock warning */}
                    {getStockWarning(item.productId, item.quantity) && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <AlertTriangle className="w-3 h-3 text-warning" />
                        <span className="text-xs text-warning font-medium">
                          {getStockWarning(item.productId, item.quantity)}
                        </span>
                      </div>
                    )}

                    {/* Price + Quantity + Actions */}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm font-bold text-surface-900">
                        {formatPrice(item.price * item.quantity)}
                        {item.quantity > 1 && (
                          <span className="text-xs font-normal text-surface-400 ml-1">
                            ({formatPrice(item.price)} × {item.quantity})
                          </span>
                        )}
                      </p>

                      <div className="flex items-center gap-1.5">
                        {/* Save for later */}
                        <button
                          onClick={() => handleSaveForLater(item)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-surface-400 hover:text-danger transition"
                          title={language === 'ru' ? 'Убрать' : "O'chirish"}
                        >
                          <Heart className="w-3.5 h-3.5" />
                        </button>

                        {/* Quantity controls */}
                        <button
                          onClick={() => {
                            if (item.quantity <= 1) {
                              handleRemove(item.productId, item.size, item.color?.hex);
                            } else {
                              updateQuantity(item.productId, item.quantity - 1, item.size, item.color?.hex);
                            }
                          }}
                          className="w-7 h-7 rounded-full bg-surface-100 dark:bg-surface-700 flex items-center justify-center disabled:opacity-40 active:scale-90 transition"
                        >
                          {item.quantity <= 1 ? <Trash2 className="w-3.5 h-3.5 text-red-400" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>

                        <span className="text-sm font-semibold w-6 text-center text-surface-900 dark:text-white">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1, item.size, item.color?.hex)}
                          disabled={item.quantity >= maxQty}
                          className="w-7 h-7 rounded-full bg-surface-100 dark:bg-surface-700 flex items-center justify-center disabled:opacity-40 active:scale-90 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Recommended products */}
          {recommended.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-bold text-surface-900 dark:text-white">
                  {language === 'ru' ? 'Добавить к заказу?' : "Buyurtmaga qo'shish?"}
                </h3>
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2">
                {recommended.map((product) => (
                  <div key={product.id} className="flex-shrink-0 w-[130px]">
                    <ProductCard product={product} language={language} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed checkout bar */}
      <div className="fixed bottom-14 left-0 right-0 bg-white dark:bg-surface-800 border-t border-surface-100 dark:border-surface-700 px-4 pt-3 pb-3 pb-safe shadow-elevated z-40">
        {/* Promo code */}
        {!promoApplied && (
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex-1 relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder={language === 'ru' ? 'Промокод' : 'Promo kod'}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-700 text-xs text-surface-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-surface-900"
              />
            </div>
            <button
              onClick={() => {
                if (promoCode) {
                  setPromoApplied(true);
                  hapticNotification('success');
                }
              }}
              className="px-3 py-2 rounded-xl bg-surface-900 text-white text-xs font-semibold"
            >
              {language === 'ru' ? 'ОК' : 'OK'}
            </button>
          </div>
        )}

        {promoApplied && (
          <div className="flex items-center justify-between mb-2.5 bg-success/10 rounded-xl px-3 py-2">
            <span className="text-xs font-medium text-success flex items-center gap-1">
              ✅ {promoCode}
            </span>
            <button onClick={() => { setPromoApplied(false); setPromoCode(''); }} className="text-xs text-surface-400">
              ✕
            </button>
          </div>
        )}

        {/* Price breakdown */}
        <div className="space-y-1 mb-2.5">
          <div className="flex justify-between text-xs text-surface-500">
            <span>{language === 'ru' ? 'Товары' : 'Mahsulotlar'} ({totalItems})</span>
            <span>{formatPrice(getTotalPrice())}</span>
          </div>
          {discount && (
            <div className="flex justify-between text-xs text-success font-medium">
              <span>🎉 {language === 'ru' ? 'Скидка за объём' : 'Hajm chegirmasi'}</span>
              <span>-{formatPrice(discount.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-surface-500">
            <span>{language === 'ru' ? 'Доставка' : 'Yetkazish'}</span>
            <span className="text-success">{language === 'ru' ? 'Рассчитается' : 'Hisoblanadi'}</span>
          </div>
          <div className="border-t border-surface-100 dark:border-surface-700 pt-1.5 flex justify-between">
            <span className="text-sm font-bold text-surface-900 dark:text-white">{t('total')}</span>
            <span className="text-lg font-extrabold text-surface-900">
              {formatPrice(getTotalPrice() - (discount?.discount_amount || 0))}
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate('/checkout')}
          className="btn-brand w-full py-3.5 rounded-xl text-sm flex items-center justify-center gap-2"
        >
          {language === 'ru' ? 'Оформить заказ' : "Buyurtma berish"}
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-center gap-1.5 mt-2">
          <Lock className="w-3 h-3 text-surface-400" />
          <span className="text-xs text-surface-400">
            {language === 'ru' ? 'Безопасная оплата' : "Xavfsiz to'lov"}
          </span>
        </div>
      </div>

      {/* Remove confirmation modal */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
          <div className="bg-white dark:bg-surface-800 rounded-2xl p-5 w-full max-w-xs shadow-xl">
            <p className="text-sm font-medium text-surface-900 dark:text-white text-center mb-4">
              {t('confirm_remove_item')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className="flex-1 py-2.5 rounded-xl bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 text-sm font-medium active:scale-95 transition"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmRemoveItem}
                className="flex-1 py-2.5 rounded-xl bg-danger text-white text-sm font-medium active:scale-95 transition"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
