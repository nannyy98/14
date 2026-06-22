import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, CreditCard, Truck, Zap, Tag, ArrowLeft, ChevronRight, Package, Clock, MapPin, User, Phone, FileText, Shield, Gift } from 'lucide-react';
import { Layout } from '../components/Layout';
import { CouponInput } from '../components/CouponInput';
import { useTranslation } from '../hooks/useTranslation';
import { useCartStore } from '../store/useCartStore';
import { useAppStore } from '../store/useAppStore';
import { useCreatePayment, useDeliveryZones, useUserProfile } from '../lib/supabase/hooks';
import { formatPrice, getLocalizedValue } from '../lib/utils';
import { hapticNotification, getTelegramUser } from '../lib/telegram';
import { toast } from '../components/Toast';
import type { DeliveryZone } from '../lib/supabase/queries';

type Step = 'info' | 'delivery' | 'payment';

export const Checkout = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const getUserId = useAppStore((state) => state.getUserId);
  const user = getTelegramUser();
  const userId = user?.id || getUserId();

  const createPaymentMutation = useCreatePayment();
  const { data: deliveryZones = [], isLoading: zonesLoading } = useDeliveryZones(true);
  const { data: userProfile } = useUserProfile(userId || 0);

  const [step, setStep] = useState<Step>('info');
  const [formData, setFormData] = useState({
    fullName: userProfile?.first_name || user?.first_name || '',
    phone: userProfile?.phone || '',
    zoneId: '',
    address: userProfile?.address || '',
    deliveryType: 'standard' as 'standard' | 'express',
    paymentMethod: 'payme' as 'payme' | 'click' | 'uzum' | 'cash',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');
  const submittingRef = useRef(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discount: number } | null>(null);

  useEffect(() => {
    if (items.length === 0 && !orderPlaced) {
      navigate('/cart');
    }
  }, [items.length, orderPlaced, navigate]);

  const selectedZone: DeliveryZone | undefined = useMemo(() => {
    if (!formData.zoneId && deliveryZones.length > 0) return deliveryZones[0];
    return deliveryZones.find((z) => z.id === formData.zoneId) ?? deliveryZones[0];
  }, [formData.zoneId, deliveryZones]);

  const subtotal = getTotalPrice();

  const deliveryCost = useMemo(() => {
    if (!selectedZone) return 20000;
    const price = formData.deliveryType === 'express'
      ? selectedZone.express_price
      : selectedZone.standard_price;
    if (
      formData.deliveryType === 'standard' &&
      selectedZone.free_threshold &&
      selectedZone.free_threshold > 0 &&
      subtotal >= selectedZone.free_threshold
    ) {
      return 0;
    }
    return price;
  }, [selectedZone, formData.deliveryType, subtotal]);

  const totalAmount = subtotal + deliveryCost - (appliedCoupon?.discount || 0);
  const isFree = deliveryCost === 0 && formData.deliveryType === 'standard';
  const savingsFromFree = selectedZone?.free_threshold && selectedZone.free_threshold > subtotal
    ? selectedZone.free_threshold - subtotal : 0;

  const cityLabel = (zone: DeliveryZone) =>
    language === 'uz' ? zone.city_uz : zone.city_ru;

  const steps: { key: Step; label: string; icon: typeof User }[] = [
    { key: 'info', label: language === 'ru' ? 'Данные' : "Ma'lumotlar", icon: User },
    { key: 'delivery', label: language === 'ru' ? 'Доставка' : 'Yetkazish', icon: Truck },
    { key: 'payment', label: language === 'ru' ? 'Оплата' : "To'lov", icon: CreditCard },
  ];
  const currentStepIdx = steps.findIndex((s) => s.key === step);

  const validateStep = (s: Step): string | null => {
    if (s === 'info') {
      if (formData.fullName.trim().length < 2) {
        return language === 'ru' ? 'Введите имя (мин. 2 символа)' : 'Ismni kiriting (kamida 2 belgi)';
      }
      const phoneClean = formData.phone.replace(/[\s\-()]/g, '');
      if (phoneClean.length > 3 && !/^\+?[0-9]{9,13}$/.test(phoneClean)) {
        return language === 'ru' ? 'Некорректный телефон' : "Noto'g'ri telefon";
      }
    }
    if (s === 'delivery') {
      if (!formData.zoneId && deliveryZones.length === 0) {
        return language === 'ru' ? 'Выберите город' : 'Shaharni tanlang';
      }
      if (formData.address.trim().length < 5) {
        return language === 'ru' ? 'Введите адрес (мин. 5 символов)' : 'Manzilni kiriting (kamida 5 belgi)';
      }
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      toast.error(err);
      return;
    }
    const idx = steps.findIndex((s) => s.key === step);
    if (idx < steps.length - 1) {
      setStep(steps[idx + 1].key);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goBack = () => {
    const idx = steps.findIndex((s) => s.key === step);
    if (idx > 0) {
      setStep(steps[idx - 1].key);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);

    try {
      if (!userId) {
        toast.error(language === 'ru' ? 'Ошибка идентификации' : 'Aniqlash xatoligi');
        setLoading(false);
        submittingRef.current = false;
        return;
      }

      const city = selectedZone
        ? (language === 'uz' ? selectedZone.city_uz : selectedZone.city_ru)
        : '';

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'Apikey': anonKey,
        },
        body: JSON.stringify({
          telegram_user_id: userId,
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            size: item.size,
            color: item.color?.name,
            image: item.image,
          })),
          total_amount: totalAmount,
          customer_info: {
            name: formData.fullName,
            phone: formData.phone,
            city,
            address: formData.address,
            zone_id: selectedZone?.id,
            region: selectedZone
              ? (language === 'uz' ? selectedZone.region_uz : selectedZone.region_ru)
              : '',
          },
          delivery_type: formData.deliveryType,
          delivery_cost: deliveryCost,
          payment_method: formData.paymentMethod,
          notes: formData.notes,
          coupon_id: appliedCoupon?.id || undefined,
          discount_amount: appliedCoupon?.discount || 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const { order } = await response.json();
      setOrderId(order.id);

      if (formData.paymentMethod !== 'cash') {
        try {
          const paymentData = await createPaymentMutation.mutateAsync({
            orderId: order.id,
            amount: totalAmount,
            paymentMethod: formData.paymentMethod,
          });
          if (paymentData.paymentUrl) {
            localStorage.setItem('pending_order_id', order.id);
            clearCart();
            window.location.href = paymentData.paymentUrl;
            return;
          }
        } catch (paymentError) {
          console.error('Payment error:', paymentError);
          toast.error(language === 'ru' ? 'Ошибка платежа' : "To'lov xatoligi");
        }
      }

      setOrderPlaced(true);
      clearCart();
      hapticNotification('success');
      toast.success(t('order_success'));
    } catch (error) {
      console.error('Error placing order:', error);
      hapticNotification('error');
      toast.error(error instanceof Error ? error.message : t('error'));
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  if (items.length === 0 && !orderPlaced) return null;

  if (orderPlaced) {
    return (
      <Layout showBottomNav={false}>
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-surface-900 dark:bg-white flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-white dark:text-surface-900" />
            </div>
            <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-2">
              {language === 'ru' ? 'Заказ оформлен!' : 'Buyurtma berildi!'}
            </h2>
            <p className="text-surface-500 dark:text-surface-400 mb-1">
              {language === 'ru' ? 'Номер заказа' : "Buyurtma raqami"}:
            </p>
            <p className="text-2xl font-mono font-bold text-surface-900 dark:text-white mb-2">
              #{orderId.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-sm text-surface-400 dark:text-surface-500 mb-8 max-w-xs mx-auto">
              {language === 'ru'
                ? 'Мы свяжемся с вами для подтверждения'
                : "Tasdiqlash uchun siz bilan bog'lanamiz"}
            </p>

            <div className="space-y-3 max-w-xs mx-auto">
              <button
                onClick={() => navigate('/orders')}
                className="btn-brand w-full py-3.5 rounded-xl text-sm flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" />
                {language === 'ru' ? 'Мои заказы' : "Buyurtmalarim"}
              </button>
              <button
                onClick={() => navigate('/catalog')}
                className="w-full bg-surface-100 dark:bg-surface-700 text-surface-900 dark:text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-surface-200 transition"
              >
                {language === 'ru' ? 'Продолжить покупки' : "Xaridni davom ettirish"}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const daysLabel = (min: number, max: number) =>
    `${min}${min !== max ? `–${max}` : ''} ${language === 'ru' ? (max === 1 ? 'день' : 'дн.') : 'kun'}`;

  return (
    <Layout showBottomNav={false}>
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 pb-32">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700">
          <div className="px-4 py-3 flex items-center gap-3">
            {currentStepIdx > 0 && (
              <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700">
                <ArrowLeft className="w-5 h-5 text-surface-600 dark:text-surface-300" />
              </button>
            )}
            <h1 className="text-lg font-bold text-surface-900 dark:text-white flex-1">{t('checkout')}</h1>
          </div>
          {/* Step indicator */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2">
              {steps.map((s, i) => {
                const Icon = s.icon;
                const isActive = i === currentStepIdx;
                const isDone = i < currentStepIdx;
                return (
                  <div key={s.key} className="flex-1 flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isDone ? 'bg-surface-900 dark:bg-white text-white dark:text-surface-900' :
                      isActive ? 'bg-surface-900 dark:bg-white text-white dark:text-surface-900 ring-4 ring-surface-900/10 dark:ring-white/10' :
                      'bg-surface-100 dark:bg-surface-700 text-surface-400'
                    }`}>
                      {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3 h-3" />}
                    </div>
                    <span className={`text-xs font-medium hidden sm:inline ${
                      isActive ? 'text-surface-900 dark:text-white' : 'text-surface-400'
                    }`}>{s.label}</span>
                    {i < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 rounded-full ${isDone ? 'bg-surface-900 dark:bg-white' : 'bg-surface-200 dark:bg-surface-600'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* ── STEP 1: Customer Info ── */}
          {step === 'info' && (
            <div className="space-y-4">
              {/* Items summary */}
              <div className="bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm border border-surface-100 dark:border-surface-700">
                <h2 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {language === 'ru' ? 'Ваш заказ' : "Buyurtmangiz"}
                  <span className="text-xs bg-surface-100 dark:bg-surface-700 px-2 py-0.5 rounded-full">{items.length}</span>
                </h2>
                <div className="space-y-2.5">
                  {items.slice(0, 3).map((item) => (
                    <div key={item.productId} className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-surface-100 dark:bg-surface-700 rounded-lg overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <img src={item.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-surface-300"><Package className="w-5 h-5" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{getLocalizedValue(item.name, language)}</p>
                        <p className="text-xs text-surface-400">{item.quantity} × {formatPrice(item.price)}</p>
                      </div>
                      <span className="text-sm font-bold text-surface-900 dark:text-white">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  {items.length > 3 && (
                    <p className="text-xs text-surface-400 text-center">
                      +{items.length - 3} {language === 'ru' ? 'ещё' : 'yana'}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact form */}
              <div className="bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm border border-surface-100 dark:border-surface-700">
                <h2 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {t('customer_info')}
                </h2>
                <div className="space-y-3">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input
                      type="text"
                      required
                      placeholder={language === 'ru' ? 'Ваше имя' : 'Ismingiz'}
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="input-premium text-sm pl-10"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input
                      type="tel"
                      placeholder="+998 90 123 45 67"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input-premium text-sm pl-10"
                    />
                  </div>
                </div>
              </div>

              <button onClick={goNext} className="btn-brand w-full py-4 rounded-xl text-sm flex items-center justify-center gap-2">
                {language === 'ru' ? 'Далее' : 'Keyingi'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── STEP 2: Delivery ── */}
          {step === 'delivery' && (
            <div className="space-y-4">
              {/* City */}
              <div className="bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm border border-surface-100 dark:border-surface-700">
                <h2 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {language === 'ru' ? 'Город доставки' : 'Yetkazib berish shahri'}
                </h2>
                {zonesLoading ? (
                  <div className="h-12 bg-surface-100 dark:bg-surface-700 rounded-xl animate-pulse" />
                ) : (
                  <select
                    value={formData.zoneId || (deliveryZones[0]?.id ?? '')}
                    onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
                    className="input-premium text-sm"
                  >
                    {deliveryZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {cityLabel(zone)} — {language === 'uz' ? zone.region_uz : zone.region_ru}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Free shipping notice */}
              {selectedZone?.free_threshold && selectedZone.free_threshold > 0 && (
                <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 transition-all ${
                  subtotal >= selectedZone.free_threshold
                    ? 'bg-surface-900 dark:bg-white text-white dark:text-surface-900'
                    : 'bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600'
                }`}>
                  <Tag className="w-5 h-5 flex-shrink-0" />
                  {subtotal >= selectedZone.free_threshold ? (
                    <span className="text-sm font-semibold">
                      {language === 'ru' ? 'Бесплатная доставка!' : 'Bepul yetkazib berish!'}
                    </span>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-surface-900 dark:text-white">
                        {language === 'ru' ? 'Бесплатно от' : 'Bepul dan'} {formatPrice(selectedZone.free_threshold)}
                      </p>
                      <p className="text-xs text-surface-400">
                        {language === 'ru' ? `Ещё ${formatPrice(savingsFromFree)} до бесплатной` : `Bepulgacha ${formatPrice(savingsFromFree)} qoldi`}
                      </p>
                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 bg-surface-200 dark:bg-surface-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-surface-900 dark:bg-white rounded-full transition-all"
                          style={{ width: `${Math.min(100, (subtotal / selectedZone.free_threshold) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Delivery type */}
              <div className="bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm border border-surface-100 dark:border-surface-700">
                <h2 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  {t('delivery')}
                </h2>
                <div className="space-y-2.5">
                  <label className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                    formData.deliveryType === 'standard'
                      ? 'border-surface-900 dark:border-white bg-surface-50 dark:bg-surface-700 shadow-sm'
                      : 'border-surface-200 dark:border-surface-600 hover:border-surface-300'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        formData.deliveryType === 'standard' ? 'bg-surface-900 dark:bg-white text-white dark:text-surface-900' : 'bg-surface-100 dark:bg-surface-700 text-surface-500'
                      }`}>
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-surface-900 dark:text-white text-sm">{t('delivery_standard')}</p>
                        <p className="text-xs text-surface-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {selectedZone ? daysLabel(selectedZone.standard_days_min, selectedZone.standard_days_max) : '3–5 дн.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isFree && formData.deliveryType === 'standard' ? (
                        <span className="text-sm font-bold text-success">{language === 'ru' ? 'Бесплатно' : "Bepul"}</span>
                      ) : (
                        <span className="text-sm font-semibold text-surface-900 dark:text-white">
                          {selectedZone ? formatPrice(selectedZone.standard_price) : formatPrice(20000)}
                        </span>
                      )}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        formData.deliveryType === 'standard' ? 'border-surface-900 dark:border-white' : 'border-surface-300 dark:border-surface-500'
                      }`}>
                        {formData.deliveryType === 'standard' && <div className="w-2.5 h-2.5 rounded-full bg-surface-900 dark:bg-white" />}
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                    formData.deliveryType === 'express'
                      ? 'border-surface-900 dark:border-white bg-surface-50 dark:bg-surface-700 shadow-sm'
                      : 'border-surface-200 dark:border-surface-600 hover:border-surface-300'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        formData.deliveryType === 'express' ? 'bg-surface-900 dark:bg-white text-white dark:text-surface-900' : 'bg-surface-100 dark:bg-surface-700 text-surface-500'
                      }`}>
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-surface-900 dark:text-white text-sm">{t('delivery_express')}</p>
                        <p className="text-xs text-surface-400 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-warning" />
                          {selectedZone ? daysLabel(selectedZone.express_days_min, selectedZone.express_days_max) : '1–2 дн.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-surface-900 dark:text-white">
                        {selectedZone ? formatPrice(selectedZone.express_price) : formatPrice(50000)}
                      </span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        formData.deliveryType === 'express' ? 'border-surface-900 dark:border-white' : 'border-surface-300 dark:border-surface-500'
                      }`}>
                        {formData.deliveryType === 'express' && <div className="w-2.5 h-2.5 rounded-full bg-surface-900 dark:bg-white" />}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Address */}
              <div className="bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm border border-surface-100 dark:border-surface-700">
                <h2 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {t('address')}
                </h2>
                <textarea
                  required
                  rows={3}
                  placeholder={language === 'ru' ? 'Улица, дом, квартира, подъезд' : "Ko'cha, uy, xona, kirish"}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-premium text-sm resize-none"
                />
                <div className="mt-2">
                  <label className="flex items-center gap-2 text-xs text-surface-500">
                    <FileText className="w-3.5 h-3.5" />
                    {language === 'ru' ? 'Комментарий к доставке (необязательно)' : 'Yetkazib berish izohi (ixtiyoriy)'}
                  </label>
                  <input
                    type="text"
                    placeholder={language === 'ru' ? 'Например: 3 подъезд, кв. 15' : "Masalan: 3 kirish, xona 15"}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input-premium text-sm mt-1.5"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={goBack} className="px-5 py-4 rounded-xl border border-surface-200 dark:border-surface-600 text-sm font-semibold text-surface-700 dark:text-surface-300">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button onClick={goNext} className="btn-brand flex-1 py-4 rounded-xl text-sm flex items-center justify-center gap-2">
                  {language === 'ru' ? 'Далее' : 'Keyingi'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Payment ── */}
          {step === 'payment' && (
            <div className="space-y-4">
              {/* Coupon */}
              <div className="bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm border border-surface-100 dark:border-surface-700">
                <h2 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  {language === 'ru' ? 'Промокод' : 'Promo kod'}
                </h2>
                <CouponInput
                  telegramUserId={userId || 0}
                  orderAmount={subtotal + deliveryCost}
                  onApply={(couponId, discount, code) => {
                    setAppliedCoupon({ id: couponId, code, discount });
                    toast.success(language === 'ru' ? 'Купон применён' : "Kupon qo'llanildi");
                  }}
                  onRemove={() => {
                    setAppliedCoupon(null);
                    toast.success(language === 'ru' ? 'Купон убран' : "Kupon o'chirildi");
                  }}
                  appliedCoupon={appliedCoupon ? { code: appliedCoupon.code, discount: appliedCoupon.discount } : null}
                  language={language}
                />
              </div>

              {/* Payment method */}
              <div className="bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm border border-surface-100 dark:border-surface-700">
                <h2 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  {t('payment_method')}
                </h2>
                <div className="space-y-2">
                  {[
                    { id: 'payme', label: 'Payme', desc: language === 'ru' ? 'Быстрая оплата' : "Tez to'lov" },
                    { id: 'click', label: 'Click', desc: language === 'ru' ? 'Мобильный банк' : "Mobil bank" },
                    { id: 'uzum', label: 'Uzum Bank', desc: language === 'ru' ? 'Онлайн-оплата' : "Online to'lov" },
                    { id: 'cash', label: t('payment_cash'), desc: language === 'ru' ? 'При получении' : "Yetkazishda" },
                  ].map(({ id, label, desc }) => (
                    <label
                      key={id}
                      className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                        formData.paymentMethod === id
                          ? 'border-surface-900 dark:border-white bg-surface-50 dark:bg-surface-700 shadow-sm'
                          : 'border-surface-200 dark:border-surface-600 hover:border-surface-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          formData.paymentMethod === id ? 'bg-surface-900 dark:bg-white text-white dark:text-surface-900' : 'bg-surface-100 dark:bg-surface-700 text-surface-500'
                        }`}>
                          {id === 'cash' ? <Truck className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-semibold text-surface-900 dark:text-white text-sm">{label}</p>
                          <p className="text-xs text-surface-400">{desc}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        formData.paymentMethod === id ? 'border-surface-900 dark:border-white' : 'border-surface-300 dark:border-surface-500'
                      }`}>
                        {formData.paymentMethod === id && <div className="w-2.5 h-2.5 rounded-full bg-surface-900 dark:bg-white" />}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm border border-surface-100 dark:border-surface-700">
                <h2 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-3">
                  {language === 'ru' ? 'Итого' : 'Jami'}
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">{language === 'ru' ? 'Товары' : 'Mahsulotlar'} ({items.length})</span>
                    <span className="font-medium text-surface-900 dark:text-white">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">{t('delivery')}</span>
                    {isFree ? (
                      <span className="font-medium text-success">{language === 'ru' ? 'Бесплатно' : "Bepul"}</span>
                    ) : (
                      <span className="font-medium text-surface-900 dark:text-white">{formatPrice(deliveryCost)}</span>
                    )}
                  </div>
                  {appliedCoupon && appliedCoupon.discount > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>🎉 {language === 'ru' ? 'Скидка' : 'Chegirma'}</span>
                      <span className="font-semibold">-{formatPrice(appliedCoupon.discount)}</span>
                    </div>
                  )}
                  <div className="border-t border-surface-200 dark:border-surface-600 pt-2 flex justify-between">
                    <span className="font-bold text-surface-900 dark:text-white">{t('total')}</span>
                    <span className="text-xl font-extrabold text-surface-900 dark:text-white">{formatPrice(totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={goBack} className="px-5 py-4 rounded-xl border border-surface-200 dark:border-surface-600 text-sm font-semibold text-surface-700 dark:text-surface-300">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-brand flex-1 py-4 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t('loading')}</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      {formData.paymentMethod === 'cash'
                        ? t('place_order')
                        : language === 'ru' ? 'Оплатить' : "To'lash"} — {formatPrice(totalAmount)}
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-xs text-surface-400 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" />
                {language === 'ru' ? 'Безопасная оплата' : "Xavfsiz to'lov"}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
