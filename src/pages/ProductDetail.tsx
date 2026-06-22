import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShoppingCart, Share2, Heart, Star, ChevronLeft, ChevronRight, Send, Bell, BellOff, ThumbsUp, Filter } from 'lucide-react';
import { Layout } from '../components/Layout';
import { ProductCard } from '../components/ProductCard';
import { useTranslation } from '../hooks/useTranslation';
import { useCartStore } from '../store/useCartStore';
import { useProduct, useIncrementViews, useProductRating, useFavoriteIds, useToggleFavorite, useCreateReview, useProductRelations, usePriceRules, useNotificationSubscriptions, useSubscribeNotification, useUnsubscribeNotification, useBoughtToday, useActiveViewers, useCartPressure, useRecordViewer, useProductReviewsWithVotes, useRatingBreakdown, useVoteReview } from '../lib/supabase/hooks';
import { useAppStore } from '../store/useAppStore';
import { formatPrice, getLocalizedValue } from '../lib/utils';
import { hapticNotification, tg, getTelegramUser } from '../lib/telegram';
import { addToRecentlyViewed } from '../lib/recentlyViewed';
import { toast } from '../components/Toast';
import { SocialProofBar } from '../components/SocialProof';
import { UrgencyWidget } from '../components/UrgencyWidget';

export const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const addItem = useCartStore((state) => state.addItem);

  const userId = useAppStore((s) => s.getUserId());
  const user = getTelegramUser();
  const { data: favoriteIds = [] } = useFavoriteIds(userId);
  const toggleFavorite = useToggleFavorite(userId);

  const { data: product, isLoading } = useProduct(slug!);
  const incrementViews = useIncrementViews();
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest' | 'helpful'>('newest');
  const { data: reviews = [] } = useProductReviewsWithVotes(product?.id || '', reviewSort);
  const { data: ratingBreakdown = [] } = useRatingBreakdown(product?.id || '');
  const voteMutation = useVoteReview();
  const { data: rating } = useProductRating(product?.id || '');
  const { data: crossSells = [] } = useProductRelations(product?.id || '', 'cross_sell');
  const { data: priceRules = [] } = usePriceRules();
  const { data: boughtToday = 0 } = useBoughtToday(product?.id || '');
  const { data: activeViewers = 0 } = useActiveViewers(product?.id || '');
  const { data: cartPressure = 0 } = useCartPressure(product?.id || '');
  const recordViewerMutation = useRecordViewer();
  const { data: subscriptions = [] } = useNotificationSubscriptions(userId, product?.id || '');
  const subscribeMutation = useSubscribeNotification();
  const unsubscribeMutation = useUnsubscribeNotification();
  const { data: upsells = [] } = useProductRelations(product?.id || '', 'upsell');

  const isFavorite = product ? favoriteIds.includes(product.id) : false;

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [selectedColor, setSelectedColor] = useState<{ name: string; hex: string } | undefined>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const createReview = useCreateReview();

  useEffect(() => {
    if (product) {
      if (product.sizes && product.sizes.length > 0) setSelectedSize(product.sizes[0]);
      if (product.colors && product.colors.length > 0) setSelectedColor(product.colors[0] as { name: string; hex: string });
      incrementViews.mutate(product.id);
      addToRecentlyViewed(product.id);
      if (userId > 0) {
        recordViewerMutation.mutate({ productId: product.id, userId });
      }
    }
  }, [product?.id]);

  const handleShare = async () => {
    if (!product) return;
    const shareUrl = `${window.location.origin}/product/${product.slug}`;
    const shareText = `${getLocalizedValue(product.name, language)} - ${formatPrice(product.price as number)}`;
    if (tg) {
      (tg as { openTelegramLink?: (url: string) => void }).openTelegramLink?.(
        `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
      );
    } else if (navigator.share) {
      try { await navigator.share({ title: getLocalizedValue(product.name, language), text: shareText, url: shareUrl }); }
      catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success(language === 'ru' ? 'Ссылка скопирована' : 'Havola nusxalandi');
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (product.sizes.length > 0 && !selectedSize) { toast.warning(t('select_size')); return; }
    if (product.colors.length > 0 && !selectedColor) { toast.warning(t('select_color')); return; }
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price as number,
      image: product.images[0] || '',
      quantity,
      size: selectedSize,
      color: selectedColor,
    });
    hapticNotification('success');
    toast.success(t('add_to_cart'));
    navigate('/cart');
  };

  const nextImage = () => {
    if (!product) return;
    setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    if (!product) return;
    setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) nextImage();
    if (distance < -50) prevImage();
    setTouchStart(0);
    setTouchEnd(0);
  };

  const isSubscribed = (type: string) => subscriptions.some((s) => s.type === type && s.is_active);

  const toggleSubscription = (type: 'price_drop' | 'back_in_stock' | 'low_stock') => {
    if (!product || !userId) return;
    if (isSubscribed(type)) {
      unsubscribeMutation.mutate({ userId, productId: product.id, type });
      toast.success(language === 'ru' ? 'Уведомление отключено' : "Bildirishnoma o'chirildi");
    } else {
      subscribeMutation.mutate({ userId, productId: product.id, type });
      toast.success(language === 'ru' ? 'Вы будете уведомлены' : "Sizga xabar beriladi");
    }
  };

  const handleSubmitReview = async () => {
    if (!product || !userId) return;
    setReviewSubmitting(true);
    try {
      await createReview.mutateAsync({
        product_id: product.id,
        telegram_user_id: userId,
        rating: reviewRating,
        text: reviewComment.trim() || null,
        is_approved: true,
        user_name: user?.first_name || 'Гость',
      });
      toast.success(language === 'ru' ? 'Отзыв добавлен!' : "Sharh qo'shildi!");
      setShowReviewForm(false);
      setReviewComment('');
      setReviewRating(5);
    } catch {
      toast.error(language === 'ru' ? 'Ошибка отправки' : 'Xatolik');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Layout showBottomNav={false}>
        <div className="min-h-screen bg-surface-50 flex flex-col">
          {/* skeleton gallery */}
          <div className="w-full bg-surface-100" style={{ height: '62vh' }}>
            <div className="w-full h-full skeleton" />
          </div>
          <div className="p-6 space-y-4">
            <div className="h-6 w-2/3 skeleton rounded-lg" />
            <div className="h-5 w-1/3 skeleton rounded-lg" />
            <div className="h-4 w-full skeleton rounded-lg" />
            <div className="h-4 w-4/5 skeleton rounded-lg" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout showBottomNav={false}>
        <div className="min-h-screen bg-surface-50 flex items-center justify-center">
          <div className="text-center px-8">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white border border-surface-200 flex items-center justify-center shadow-card mb-6 mx-auto transition-transform duration-150 active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 text-surface-700" />
            </button>
            <p className="text-surface-500 text-sm">
              {language === 'ru' ? 'Товар не найден' : 'Mahsulot topilmadi'}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const images = product.images.length > 0 ? product.images : [''];

  return (
    <Layout showBottomNav={false}>
      <div className="bg-surface-50 min-h-screen pb-28">

        {/* ─── GALLERY ─── */}
        <div className="relative w-full bg-surface-100 dark:bg-surface-800" style={{ height: '62vh' }}>

          {/* Back button — always visible, always clickable */}
          <button
            onClick={() => navigate(-1)}
            aria-label="Назад"
            className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-card transition-transform duration-150 active:scale-95 hover:bg-white"
          >
            <ArrowLeft className="w-5 h-5 text-surface-900" />
          </button>

          {/* Main image */}
          <div
            className="w-full h-full overflow-hidden select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {product.images.length > 0 ? (
              <img
                key={currentImageIndex}
                src={images[currentImageIndex]}
                alt={getLocalizedValue(product.name, language)}
                className="w-full h-full object-cover"
                style={{ transition: 'opacity 200ms ease' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-surface-300 text-sm">
                {t('no_image')}
              </div>
            )}
          </div>

          {/* Prev / Next arrows (only when >1 image) */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/85 flex items-center justify-center shadow-sm transition-transform duration-150 active:scale-95 hover:bg-white"
              >
                <ChevronLeft className="w-5 h-5 text-surface-900" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/85 flex items-center justify-center shadow-sm transition-transform duration-150 active:scale-95 hover:bg-white"
              >
                <ChevronRight className="w-5 h-5 text-surface-900" />
              </button>
            </>
          )}

          {/* Dot indicators */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-20">
              {images.map((_: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setCurrentImageIndex(i)}
                  className="transition-all duration-200"
                  style={{
                    width: i === currentImageIndex ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === currentImageIndex ? 'rgba(28,28,28,0.85)' : 'rgba(28,28,28,0.25)',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ─── THUMBNAIL STRIP ─── */}
        {images.length > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide bg-white dark:bg-surface-800 border-b border-surface-200/60">
            {images.map((img: string, i: number) => (
              <button
                key={i}
                onClick={() => setCurrentImageIndex(i)}
                className={`flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden transition-all duration-200 ${
                  i === currentImageIndex
                    ? 'ring-2 ring-surface-900 ring-offset-1'
                    : ''
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* ─── PRODUCT INFO ─── */}
        <div className="bg-white dark:bg-surface-800 px-5 pt-5 pb-6">

          {/* Name */}
          <h1
            className="font-semibold text-surface-900 leading-snug mb-1"
            style={{ fontSize: 19, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {getLocalizedValue(product.name, language)}
          </h1>

          {/* Rating */}
          {rating && rating.count > 0 && (
            <div className="flex items-center gap-1.5 mb-2">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${i < Math.round(rating.average) ? 'text-accent fill-current' : 'text-surface-300'}`}
                  />
                ))}
              </div>
              <span className="text-xs text-surface-500">
                {rating.average.toFixed(1)} · {rating.count} {language === 'ru' ? 'отзывов' : 'sharh'}
              </span>
            </div>
          )}

          {/* Social Proof Bar */}
          <SocialProofBar
            boughtToday={boughtToday}
            totalBought={product.views || 0}
            avgRating={rating?.average || 0}
            reviewCount={rating?.count || 0}
            views={product.views || 0}
            stock={product.stock}
            language={language}
          />

          {/* Urgency Widget */}
          <UrgencyWidget
            productId={product.id}
            stock={product.stock}
            promoEndsAt={null}
            views={product.views || 0}
            language={language}
            activeViewers={activeViewers}
            cartPressure={cartPressure}
          />

          {/* Price + stock row */}
          <div className="flex items-center justify-between mb-5 mt-3">
            <p className="text-xl font-bold text-surface-900" style={{ fontSize: 22 }}>
              {formatPrice(product.price as number)}
            </p>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${product.stock > 0 ? 'bg-success' : 'bg-danger'}`} />
              <span className={`text-xs font-medium ${product.stock > 0 ? 'text-success' : 'text-danger'}`}>
                {product.stock > 0
                  ? (product.stock < 10
                    ? `${language === 'ru' ? 'Осталось' : 'Qoldi'}: ${product.stock}`
                    : t('in_stock'))
                  : t('out_of_stock')}
              </span>
            </div>
          </div>

          {/* Sizes */}
          {product.sizes.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2.5">
                {t('select_size')}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size: string) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[44px] h-11 px-4 rounded-xl text-sm font-semibold border transition-all duration-150 active:scale-95 ${
                      selectedSize === size
                        ? 'bg-surface-900 text-white border-surface-900'
                        : 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white border-surface-200 dark:border-surface-600'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Colors */}
          {product.colors.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2.5">
                {t('select_color')}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color: { name: string; hex: string }) => (
                  <button
                    key={color.hex}
                    onClick={() => setSelectedColor(color)}
                    className={`flex items-center gap-2 px-3 h-11 rounded-xl text-sm font-medium border transition-all duration-150 active:scale-95 ${
                      selectedColor?.hex === color.hex
                        ? 'bg-surface-50 dark:bg-surface-700 text-surface-900 dark:text-white border-surface-900 dark:border-surface-400'
                        : 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white border-surface-200 dark:border-surface-600'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color.hex, border: '1px solid rgba(28,28,28,0.12)' }}
                    />
                    {color.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2.5">
              {t('quantity')}
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-11 h-11 rounded-xl flex items-center justify-center border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 transition-all duration-150 active:scale-95"
              >
                <Minus className="w-4 h-4 text-surface-700 dark:text-surface-300" />
              </button>
              <span className="text-xl font-bold min-w-[2rem] text-center text-surface-900 dark:text-white">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                className="w-11 h-11 rounded-xl flex items-center justify-center border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 transition-all duration-150 active:scale-95"
              >
                <Plus className="w-4 h-4 text-surface-700 dark:text-surface-300" />
              </button>
            </div>
          </div>

          {/* Volume discount hints */}
          {priceRules.filter((r) => r.type === 'volume' && r.is_active).map((rule) => {
            const minQty = (rule.conditions as Record<string, unknown>)?.min_quantity as number || 0;
            if (minQty <= 1) return null;
            return (
              <div key={rule.id} className="mb-3 bg-surface-50 dark:bg-surface-700 rounded-xl px-3 py-2 flex items-center gap-2">
                <span className="text-sm">🎉</span>
                <p className="text-xs text-surface-600 dark:text-surface-300">
                  {language === 'ru'
                    ? `Купите ${minQty}+ товаров — скидка ${rule.discount_value}%`
                    : `${minQty}+ mahsulot sotib oling — ${rule.discount_value}% chegirma`}
                </p>
              </div>
            );
          })}

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2.5">
              {t('description')}
            </h2>
            <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed whitespace-pre-line">
              {getLocalizedValue(product.description, language)}
            </p>
          </div>

          {/* Specs */}
          {product.specs && Object.keys(product.specs).length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
                {t('specifications')}
              </h2>
              <div className="rounded-xl overflow-hidden border border-surface-200 dark:border-surface-600">
                {Object.entries(product.specs).map(([key, value], i) => (
                  <div
                    key={key}
                    className={`flex justify-between py-3 px-4 text-sm ${
                      i > 0 ? 'border-t border-surface-200 dark:border-surface-600' : ''
                    } ${i % 2 === 0 ? 'bg-surface-50 dark:bg-surface-700' : 'bg-white dark:bg-surface-800'}`}
                  >
                    <span className="text-surface-500">{key}</span>
                    <span className="text-surface-900 font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                {language === 'ru' ? 'Отзывы' : 'Sharhlar'} ({reviews.length})
              </h2>
              {userId > 0 && (
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="text-xs font-semibold text-surface-900 dark:text-white hover:text-surface-700 transition"
                >
                  {showReviewForm ? (language === 'ru' ? 'Отмена' : 'Bekor') : (language === 'ru' ? 'Написать отзыв' : 'Sharh yozish')}
                </button>
              )}
            </div>

            {/* Rating Breakdown */}
            {rating && rating.count > 0 && ratingBreakdown.length > 0 && (
              <div className="bg-surface-50 dark:bg-surface-700/50 rounded-xl p-4 mb-3">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">{rating.average.toFixed(1)}</p>
                    <div className="flex items-center gap-0.5 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < Math.round(rating.average) ? 'text-accent fill-current' : 'text-surface-300'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-surface-400 mt-1">{rating.count} {language === 'ru' ? 'отзывов' : 'sharh'}</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const bd = ratingBreakdown.find((b) => b.stars === stars);
                      const count = bd?.count || 0;
                      const pct = rating.count > 0 ? (count / rating.count) * 100 : 0;
                      return (
                        <div key={stars} className="flex items-center gap-2">
                          <span className="text-xs text-surface-500 w-3">{stars}</span>
                          <Star className="w-3 h-3 text-accent fill-current" />
                          <div className="flex-1 h-2 bg-surface-200 dark:bg-surface-600 rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-surface-400 w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Sort */}
            {reviews.length > 1 && (
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-3.5 h-3.5 text-surface-400" />
                {(['newest', 'highest', 'helpful'] as const).map((sort) => (
                  <button
                    key={sort}
                    onClick={() => setReviewSort(sort)}
                    className={`text-xs px-2.5 py-1 rounded-lg transition ${
                      reviewSort === sort
                        ? 'bg-surface-900 text-white dark:bg-white dark:text-surface-900'
                        : 'bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400'
                    }`}
                  >
                    {sort === 'newest' ? (language === 'ru' ? 'Новые' : 'Yangilar') :
                     sort === 'highest' ? (language === 'ru' ? 'Лучшие' : 'Eng yaxshi') :
                     (language === 'ru' ? 'Полезные' : "Foydali")}
                  </button>
                ))}
              </div>
            )}

            {/* Review form */}
            {showReviewForm && (
              <div className="rounded-xl p-4 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 mb-3">
                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">
                  {language === 'ru' ? 'Ваша оценка' : 'Bahoyingiz'}
                </p>
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="transition-transform active:scale-110"
                    >
                      <Star className={`w-6 h-6 ${star <= reviewRating ? 'text-accent fill-current' : 'text-surface-300'}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  placeholder={language === 'ru' ? 'Расскажите о вашем опыте...' : 'Tajribangiz haqida yozing...'}
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-surface-900 focus:border-transparent outline-none mb-3"
                />
                <button
                  onClick={handleSubmitReview}
                  disabled={reviewSubmitting}
                  className="btn-brand w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                >
                  {reviewSubmitting && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  <Send className="w-4 h-4" />
                  {language === 'ru' ? 'Отправить' : 'Yuborish'}
                </button>
              </div>
            )}

            {/* Reviews list */}
            {reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.slice(0, 5).map((review: Record<string, unknown>) => (
                  <div
                    key={review.id as string}
                    className="rounded-xl p-4 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-surface-900">{String(review.user_name || 'Аноним')}</span>
                        {!!review.is_verified_purchase && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
                            {language === 'ru' ? 'Покупка подтверждена' : 'Sotib olish tasdiqlangan'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < (review.rating as number) ? 'text-accent fill-current' : 'text-surface-300'}`} />
                        ))}
                      </div>
                    </div>
                    {!!review.text && (
                      <p className="text-sm text-surface-600 leading-relaxed mb-2">{String(review.text)}</p>
                    )}
                    {/* Photos */}
                    {Array.isArray(review.photos) && (review.photos as string[]).length > 0 && (
                      <div className="flex gap-2 mb-2 overflow-x-auto">
                        {(review.photos as string[]).map((photo: string, i: number) => (
                          <img key={i} src={photo} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                        ))}
                      </div>
                    )}
                    {/* Helpful */}
                    {userId > 0 && (
                      <div className="flex items-center gap-3 pt-2 border-t border-surface-200/50 dark:border-surface-600/50">
                        <button
                          onClick={() => voteMutation.mutate({ reviewId: review.id as string, userId, helpful: true })}
                          className="flex items-center gap-1.5 text-xs text-surface-400 hover:text-surface-900 dark:hover:text-white transition"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {language === 'ru' ? 'Полезно' : 'Foydali'}
                          {(review.helpful_count as number) > 0 && (
                            <span className="text-surface-300">({String(review.helpful_count)})</span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : !showReviewForm ? (
              <p className="text-sm text-surface-400 text-center py-4">
                {language === 'ru' ? 'Пока нет отзывов. Будьте первым!' : "Hali sharhlar yo'q. Birinchi bo'ling!"}
              </p>
            ) : null}
          </div>

          {/* Notification Subscriptions */}
          {userId > 0 && product && (
            <div className="mb-4">
              <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
                {language === 'ru' ? 'Уведомления' : 'Bildirishnomalar'}
              </h2>
              <div className="space-y-2">
                {product.stock === 0 && (
                  <button
                    onClick={() => toggleSubscription('back_in_stock')}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isSubscribed('back_in_stock')
                        ? 'border-success bg-success/5 text-surface-900 dark:text-white'
                        : 'border-surface-200 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700'
                    }`}
                  >
                    {isSubscribed('back_in_stock') ? (
                      <BellOff className="w-5 h-5 text-success" />
                    ) : (
                      <Bell className="w-5 h-5 text-surface-500" />
                    )}
                    <div className="text-left">
                      <p className="text-sm font-medium">
                        {language === 'ru' ? 'Сообщить о поступлении' : 'Mavjudligini xabar qilish'}
                      </p>
                      <p className="text-xs text-surface-400">
                        {language === 'ru' ? 'Мы сообщим когда товар снова будет в наличии' : "Mahsulot mavjud bo'lganda xabar beramiz"}
                      </p>
                    </div>
                  </button>
                )}
                {product.stock > 0 && product.stock <= 5 && (
                  <button
                    onClick={() => toggleSubscription('low_stock')}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isSubscribed('low_stock')
                        ? 'border-warning bg-warning/5 text-surface-900 dark:text-white'
                        : 'border-surface-200 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700'
                    }`}
                  >
                    {isSubscribed('low_stock') ? (
                      <BellOff className="w-5 h-5 text-warning" />
                    ) : (
                      <Bell className="w-5 h-5 text-surface-500" />
                    )}
                    <div className="text-left">
                      <p className="text-sm font-medium">
                        {language === 'ru' ? `Осталось ${product.stock} шт.` : `${product.stock} ta qoldi`}
                      </p>
                      <p className="text-xs text-surface-400">
                        {language === 'ru' ? 'Уведомить когда будет мало' : "Kam qolganda xabar bering"}
                      </p>
                    </div>
                  </button>
                )}
                <button
                  onClick={() => toggleSubscription('price_drop')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isSubscribed('price_drop')
                      ? 'border-danger bg-danger/5 text-surface-900 dark:text-white'
                      : 'border-surface-200 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700'
                  }`}
                >
                  {isSubscribed('price_drop') ? (
                    <BellOff className="w-5 h-5 text-danger" />
                  ) : (
                    <Bell className="w-5 h-5 text-surface-500" />
                  )}
                  <div className="text-left">
                    <p className="text-sm font-medium">
                      {language === 'ru' ? 'Уведомить о скидке' : 'Chegirma haqida xabar bering'}
                    </p>
                    <p className="text-xs text-surface-400">
                      {language === 'ru' ? 'Мы сообщим когда цена снизится' : "Narx tushganda xabar beramiz"}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Related Products */}
          {(crossSells.length > 0 || upsells.length > 0) && (
            <div className="mt-4">
              {crossSells.length > 0 && (
                <div className="mb-4">
                  <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
                    {language === 'ru' ? 'Часто покупают вместе' : "Ko'p birga sotib olinadi"}
                  </h2>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2">
                    {crossSells.map((rel: Record<string, unknown>) => {
                      const p = rel.products as Record<string, unknown> | undefined;
                      if (!p) return null;
                      return (
                        <div key={rel.id as string} className="flex-shrink-0 w-[130px]">
                          <ProductCard product={p as never} language={language} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {upsells.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
                    {language === 'ru' ? 'Вам может понравиться' : "Sizga yoqishi mumkin"}
                  </h2>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2">
                    {upsells.map((rel: Record<string, unknown>) => {
                      const p = rel.products as Record<string, unknown> | undefined;
                      if (!p) return null;
                      return (
                        <div key={rel.id as string} className="flex-shrink-0 w-[130px]">
                          <ProductCard product={p as never} language={language} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── FIXED BOTTOM BAR ─── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-surface-800/95 border-t border-surface-200 dark:border-surface-700 shadow-elevated pb-safe"
      >
        <div className="flex items-center gap-3 px-4 py-3">

          {/* Wishlist */}
          <button
            onClick={() => {
              if (!product) return;
              toggleFavorite.mutate({ productId: product.id, isFavorite });
              hapticNotification(isFavorite ? 'warning' : 'success');
            }}
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all duration-150 active:scale-95 ${
              isFavorite
                ? 'bg-danger-light border-danger/30'
                : 'bg-white dark:bg-surface-700 border-surface-200 dark:border-surface-600'
            }`}
          >
            <Heart
              className={`w-5 h-5 transition-all duration-150 ${
                isFavorite ? 'text-danger fill-danger' : 'text-surface-500 dark:text-surface-400'
              }`}
            />
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 transition-all duration-150 active:scale-95"
          >
            <Share2 className="w-5 h-5 text-surface-500" />
          </button>

          {/* Add to Cart — primary CTA */}
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className={`flex-1 h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed ${
              product.stock === 0
                ? 'bg-surface-300 dark:bg-surface-600 text-white'
                : 'bg-surface-900 text-white hover:bg-surface-800'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>{product.stock === 0 ? t('out_of_stock') : t('add_to_cart')}</span>
          </button>
        </div>
      </div>
    </Layout>
  );
};
