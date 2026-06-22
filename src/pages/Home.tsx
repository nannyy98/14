import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { getTelegramUser } from '../lib/telegram';
import { Gift, Star, ChevronRight, Sparkles, TrendingUp, Shield, Truck, Zap, Percent, Clock } from 'lucide-react';
import { useCreateReferral, useUserReferrals, useProducts, useBanners, usePromotions, useProductsByIds } from '../lib/supabase/hooks';
import { userQueries } from '../lib/supabase/queries';
import { getRecentlyViewed } from '../lib/recentlyViewed';
import { Logo } from '../components/Logo';
import { ValueHook } from '../components/ValueHook';
import { BannerSlider } from '../components/BannerSlider';
import { FlashSaleBanner } from '../components/FlashSaleBanner';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Skeleton';

export const Home = () => {
  const navigate = useNavigate();
  const { language, setLanguage, setTelegramUserId } = useAppStore();
  const [showReferral, setShowReferral] = useState(false);
  const [entered, setEntered] = useState(false);

  const createReferral = useCreateReferral();
  const user = getTelegramUser();
  const { data: userReferrals = [] } = useUserReferrals(user?.id || 0);
  const { data: banners = [] } = useBanners(true);
  const { data: promotions = [] } = usePromotions('sale');

  const [recentIds, setRecentIds] = useState<string[]>([]);
  const { data: recentProducts = [] } = useProductsByIds(recentIds);

  useEffect(() => {
    setRecentIds(getRecentlyViewed());
  }, []);
  const { data: productsData, isLoading: productsLoading } = useProducts(
    undefined,
    { field: 'views', order: 'desc' }
  );
  const featuredProducts = productsData?.pages.flatMap((p) => p.items) ?? [];

  useEffect(() => {
    if (user) {
      setTelegramUserId(user.id);
      const langCode = user.language_code;
      if (langCode === 'uz' || langCode === 'ru') {
        setLanguage(langCode);
      }

      // Auto-register user in database on first visit
      userQueries.upsert(user.id, {
        first_name: user.first_name || 'User',
        username: user.username,
        language: langCode === 'uz' ? 'uz' : 'ru',
      }).catch(console.error);

      if (userReferrals.length === 0 && createReferral.status === 'idle') {
        createReferral.mutate(user.id);
      }
    }
  }, [user?.id, userReferrals.length, createReferral.status, createReferral, setLanguage, setTelegramUserId, user?.first_name, user?.username, user?.language_code]);

  const handleLanguageSelect = (lang: 'ru' | 'uz') => {
    setLanguage(lang);
    setEntered(true);
    setTimeout(() => {
      navigate('/catalog');
    }, 300);
  };

  // Instant Start: Telegram users skip welcome screen entirely
  if (user?.id && !entered) {
    setEntered(true);
    // Auto-navigate to catalog
    setTimeout(() => navigate('/catalog'), 100);
    return null;
  }

  if (!entered) {
    return (
      <div className="min-h-screen flex flex-col gradient-hero relative overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative z-10">
          <div className="w-full max-w-sm">
            {/* Logo & Brand */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center mb-6">
                <Logo size="xl" variant="full" className="!flex-col !items-center !gap-3" />
              </div>
              <p className="text-white font-bold text-lg mt-3 text-balance max-w-xs mx-auto">
                {language === 'ru'
                  ? 'Экономь до 30% на каждом заказе'
                  : "Har bir buyurtmada 30% gacha tejashing"}
              </p>
              <p className="text-surface-400 text-xs mt-2 text-balance max-w-xs mx-auto">
                {language === 'ru'
                  ? 'Бесплатная доставка от 500,000 сум'
                  : "500,000 so'mdan bepul yetkazib berish"}
              </p>
            </div>

            {/* Language Selection */}
            <div className="space-y-3 mb-8">
              <button
                onClick={() => handleLanguageSelect('ru')}
                className="w-full flex items-center gap-4 bg-white/8 hover:bg-white/12 active:scale-[0.98] border border-white/10 text-white py-4 px-5 rounded-2xl font-semibold text-base transition-colors duration-150 group"
              >
                <span className="text-2xl">🇷🇺</span>
                <div className="text-left flex-1">
                  <p className="font-semibold">Русский</p>
                  <p className="text-xs text-surface-400 font-normal">Russian</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => handleLanguageSelect('uz')}
                className="w-full flex items-center gap-4 bg-white/8 hover:bg-white/12 active:scale-[0.98] border border-white/10 text-white py-4 px-5 rounded-2xl font-semibold text-base transition-colors duration-150 group"
              >
                <span className="text-2xl">🇺🇿</span>
                <div className="text-left flex-1">
                  <p className="font-semibold">O'zbekcha</p>
                  <p className="text-xs text-surface-400 font-normal">Uzbek</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Referral */}
            {user && userReferrals.length > 0 && (
              <div className="mb-8">
                <button
                  onClick={() => setShowReferral(!showReferral)}
                  className="w-full bg-white/6 hover:bg-white/10 text-white/80 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm border border-white/6 hover:border-white/12"
                >
                  <Gift className="w-4 h-4" />
                  <span>
                    {language === 'ru' ? 'Пригласить друга' : "Do'stni taklif qilish"}
                  </span>
                </button>

                {showReferral && (
                  <div className="mt-3 bg-white rounded-2xl p-4 shadow-float">
                    <h3 className="font-bold text-surface-900 mb-2 text-sm">
                      {language === 'ru' ? 'Ваша реферальная ссылка' : 'Referal havolangiz'}
                    </h3>
                    <div className="bg-surface-50 rounded-xl p-3 mb-2">
                      <code className="text-xs text-surface-800 break-all font-mono">
                        {userReferrals[0].referral_code}
                      </code>
                    </div>
                    <p className="text-xs text-surface-500">
                      {language === 'ru'
                        ? `+${userReferrals[0].bonus_amount.toLocaleString()} сум за каждого друга!`
                        : `Har bir do'st uchun +${userReferrals[0].bonus_amount.toLocaleString()} so'm!`}
                    </p>
                    {userReferrals[0].is_redeemed && (
                      <div className="mt-2 text-xs text-success font-medium flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        <span>{language === 'ru' ? 'Использован!' : 'Ishlatildi!'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-1.5 text-white/40">
                <Truck className="w-3.5 h-3.5" />
                <span className="text-2xs">{language === 'ru' ? 'Доставка' : 'Yetkazish'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/40">
                <Shield className="w-3.5 h-3.5" />
                <span className="text-2xs">{language === 'ru' ? 'Гарантия' : 'Kafolat'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/40">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-2xs">{language === 'ru' ? 'Качество' : 'Sifat'}</span>
              </div>
            </div>

            <p className="text-center text-surface-500 text-2xs mt-8">
              StyleTech Shop v1.0
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Catalog preview for logged-in users
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Hero Banner */}
      {banners.length > 0 && (
        <BannerSlider banners={banners} language={language} />
      )}

      {/* Instant Value Hook */}
      <div className="px-4 pt-3">
        <ValueHook products={featuredProducts} language={language} />
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Features strip */}
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {[
            { icon: Truck, label: language === 'ru' ? 'Быстрая доставка' : 'Tez yetkazish', color: 'bg-surface-100 text-surface-700' },
            { icon: Shield, label: language === 'ru' ? 'Гарантия качества' : 'Sifat kafolati', color: 'bg-surface-100 text-surface-700' },
            { icon: Sparkles, label: language === 'ru' ? 'Новинки каждую неделю' : 'Har hafta yangiliklar', color: 'bg-surface-100 text-surface-700' },
          ].map(({ icon: Icon, label, color }, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap ${color}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-semibold">{label}</span>
            </div>
          ))}
        </div>

        {/* Popular Products */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">
              <TrendingUp className="w-5 h-5 text-surface-600" />
              {language === 'ru' ? 'Популярное' : 'Mashhur'}
            </h2>
            <button
              onClick={() => navigate('/catalog')}
              className="text-xs font-semibold text-surface-900 hover:text-surface-700 transition-colors"
            >
              {language === 'ru' ? 'Все' : 'Hammasi'} →
            </button>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {featuredProducts.slice(0, 4).map((product) => (
                <div key={product.id}>
                  <ProductCard product={product} language={language} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recently Viewed */}
        {recentProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">
                <Clock className="w-5 h-5 text-surface-600" />
                {language === 'ru' ? 'Вы смотрели' : "Siz ko'rganlar"}
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
              {recentProducts.slice(0, 8).map((product) => (
                <div
                  key={product.id}
                  className="flex-shrink-0 w-[140px]"
                >
                  <ProductCard product={product} language={language} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Flash Sales */}
        {promotions.filter((p) => p.ends_at).length > 0 && (
          <section>
            {promotions.filter((p) => p.ends_at).slice(0, 1).map((promo) => (
              <FlashSaleBanner key={promo.id} promotion={promo} language={language} />
            ))}
          </section>
        )}

        {/* Promotions */}
        {promotions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">
                <Percent className="w-5 h-5 text-danger" />
                {language === 'ru' ? 'Акции и скидки' : 'Aksiyalar'}
              </h2>
              <button
                onClick={() => navigate('/catalog')}
                className="text-xs font-semibold text-surface-900 hover:text-surface-700 transition-colors"
              >
                {language === 'ru' ? 'Все' : 'Hammasi'} →
              </button>
            </div>
            <div className="space-y-3">
              {promotions.slice(0, 2).map((promo) => (
                <div
                  key={promo.id}
                  className="bg-gradient-to-r from-surface-900 to-surface-800 rounded-2xl p-4 text-white cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => navigate('/catalog')}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-accent" />
                    <span className="text-sm font-bold">
                      {typeof promo.title === 'object' ? (promo.title[language] || promo.title.ru) : promo.title}
                    </span>
                  </div>
                  {promo.discount_percent && (
                    <span className="inline-block bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      -{promo.discount_percent}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="bg-surface-900 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-bold">
              {language === 'ru' ? 'Скидка 10% на первый заказ' : "Birinchi buyurtmaga 10% chegirma"}
            </h3>
          </div>
          <p className="text-white/80 text-xs mb-3">
            {language === 'ru'
              ? 'Используйте промокод STYLE при оформлении заказа'
              : "STYLE promo kodini kiriting buyurtma paytida"}
          </p>
          <button
            onClick={() => navigate('/catalog')}
            className="bg-white text-surface-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/90 active:scale-95 transition-all"
          >
            {language === 'ru' ? 'Купить сейчас' : 'Hozir xarid qilish'}
          </button>
        </div>
      </div>
    </div>
  );
};
