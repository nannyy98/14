import { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, X, Sparkles, History, TrendingUp } from 'lucide-react';
import { Layout } from '../components/Layout';
import { ProductCard } from '../components/ProductCard';
import { BannerSlider } from '../components/BannerSlider';
import { ProductCardSkeleton } from '../components/Skeleton';
import { useTranslation } from '../hooks/useTranslation';
import { useDebounce } from '../hooks/useDebounce';
import { useSearchAutocomplete } from '../hooks/useSearchAutocomplete';
import { useProducts, useCategories, useBanners } from '../lib/supabase/hooks';
import { getLocalizedValue, cn } from '../lib/utils';
import { getSearchHistory, clearSearchHistory, addSearchHistory } from '../lib/searchHistory';
import { ValueHook } from '../components/ValueHook';

export const Catalog = () => {
  const { t, language } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [showFilters, setShowFilters] = useState(false);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [sortBy, setSortBy] = useState<'created_at' | 'price' | 'views'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);

  const { suggestions: autocompleteSuggestions, isLoading: autocompleteLoading } = useSearchAutocomplete(searchQuery, language);

  const { data: categories = [] } = useCategories();
  const { data: banners = [] } = useBanners(true);

  const filters = {
    categoryId: selectedCategory,
    minPrice,
    maxPrice,
    sizes: selectedSizes.length > 0 ? selectedSizes : undefined,
    colors: selectedColors.length > 0 ? selectedColors : undefined,
    inStock: inStockOnly,
    search: debouncedSearch || undefined,
  };

  const sort = { field: sortBy, order: sortOrder };

  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  useEffect(() => {
    if (debouncedSearch) {
      addSearchHistory(debouncedSearch);
      setSearchHistory(getSearchHistory());
    }
  }, [debouncedSearch]);

  const selectSearchHistory = (query: string) => {
    setSearchQuery(query);
    setShowSearchHistory(false);
    searchInputRef.current?.blur();
  };

  const {
    data: productsData,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useProducts(filters, sort);

  const products = productsData?.pages.flatMap((p) => p.items) ?? [];
  const total = productsData?.pages[0]?.total ?? 0;

  const allSizes = Array.from(new Set(products.flatMap((p) => p.sizes))).sort();
  const allColors = Array.from(
    new Map(products.flatMap((p) => p.colors).map((c: { name: string; hex: string }) => [c.hex, c])).values()
  );

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) => prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]);
  };

  const toggleColor = (hex: string) => {
    setSelectedColors((prev) => prev.includes(hex) ? prev.filter((c) => c !== hex) : [...prev, hex]);
  };

  const clearFilters = () => {
    setSelectedCategory(undefined);
    setSearchQuery('');
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setSelectedSizes([]);
    setSelectedColors([]);
    setInStockOnly(false);
  };

  const activeFiltersCount =
    (selectedCategory ? 1 : 0) + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) +
    selectedSizes.length + selectedColors.length + (inStockOnly ? 1 : 0);

  return (
    <Layout>
      {banners.length > 0 && (
        <BannerSlider banners={banners} language={language} />
      )}

      {/* Instant Value Hook — first thing user sees */}
      {!debouncedSearch && !selectedCategory && (
        <div className="px-4 pt-3">
          <ValueHook products={products.slice(0, 20)} language={language} />
        </div>
      )}

      <div className="px-4 pt-4 pb-2 space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-surface-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearchHistory(true)}
            onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
            className="input-premium pl-10 pr-12"
          />
          {searchQuery && searchQuery !== debouncedSearch && (
            <div className="absolute right-12 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-surface-400 border-t-transparent rounded-full animate-spin" />
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all",
              showFilters ? "bg-surface-900 text-white" : "hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-surface-900 text-white text-2xs rounded-full w-4 h-4 flex items-center justify-center font-bold animate-bounce-in">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Autocomplete dropdown */}
        {showSearchHistory && autocompleteSuggestions.length > 0 && (
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-card border border-surface-200 dark:border-surface-700 p-2">
            {autocompleteLoading && (
              <div className="flex items-center justify-center py-2">
                <span className="w-4 h-4 border-2 border-surface-400 border-t-surface-900 rounded-full animate-spin" />
              </div>
            )}
            <div className="space-y-0.5">
              {autocompleteSuggestions.map((suggestion) => (
                <button
                  key={`${suggestion.source}-${suggestion.text}`}
                  onClick={() => selectSearchHistory(suggestion.text)}
                  className="w-full flex items-center gap-2.5 py-2 px-2.5 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-700 transition text-left"
                >
                  {suggestion.source === 'history' ? (
                    <History className="w-3.5 h-3.5 text-surface-400" />
                  ) : suggestion.source === 'popular' ? (
                    <TrendingUp className="w-3.5 h-3.5 text-accent" />
                  ) : (
                    <Search className="w-3.5 h-3.5 text-surface-400" />
                  )}
                  <span className="text-sm text-surface-700 dark:text-surface-300 flex-1 truncate">
                    {suggestion.text}
                  </span>
                  {suggestion.source === 'history' && (
                    <span className="text-[10px] text-surface-400 bg-surface-100 dark:bg-surface-700 px-1.5 py-0.5 rounded-full">
                      {language === 'ru' ? 'недавно' : 'yaqinda'}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {searchHistory.length > 0 && (
              <div className="border-t border-surface-100 dark:border-surface-700 mt-1 pt-1">
                <button
                  onClick={() => {
                    clearSearchHistory();
                    setSearchHistory([]);
                  }}
                  className="w-full text-xs text-surface-400 hover:text-danger transition py-1.5"
                >
                  {language === 'ru' ? 'Очистить историю' : 'Tarixni tozalash'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Categories scroll */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-2 pb-1">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={cn(
                "px-4 py-2 rounded-xl whitespace-nowrap text-xs font-semibold transition-all duration-200",
                !selectedCategory
                  ? 'bg-surface-900 text-white'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'
              )}
            >
              {t('all_products')}
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "px-4 py-2 rounded-xl whitespace-nowrap text-xs font-semibold transition-all duration-200",
                  selectedCategory === category.id
                    ? 'bg-surface-900 text-white'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'
                )}
              >
                {getLocalizedValue(category.name, language)}
              </button>
            ))}
          </div>
        </div>

        {/* Sort row */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-surface-400 font-medium">
            {isLoading ? '...' : `${total} ${language === 'ru' ? 'товаров' : 'mahsulot'}`}
          </span>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as 'created_at' | 'price' | 'views');
              setSortOrder(order as 'asc' | 'desc');
            }}
            className="px-3 py-1.5 rounded-xl border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 text-xs font-medium outline-none focus:ring-2 focus:ring-surface-100"
          >
            <option value="created_at-desc">{t('newest')}</option>
            <option value="price-asc">{t('price_low')}</option>
            <option value="price-desc">{t('price_high')}</option>
            <option value="views-desc">{t('popularity')}</option>
          </select>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="mx-4 mb-3 card-premium p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-surface-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-surface-600" />
              {t('filters')}
            </h3>
            <div className="flex items-center gap-3">
              {activeFiltersCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-surface-900 font-semibold hover:text-surface-700">
                  {t('reset')}
                </button>
              )}
              <button onClick={() => setShowFilters(false)} className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700">
                <X className="w-4 h-4 text-surface-400" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
                {t('price_from')} - {t('price_to')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="0"
                  value={minPrice || ''}
                  onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : undefined)}
                  className="flex-1 input-premium !py-2 !px-3 text-sm"
                />
                <span className="text-surface-300 text-sm">—</span>
                <input
                  type="number"
                  placeholder="∞"
                  value={maxPrice || ''}
                  onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
                  className="flex-1 input-premium !py-2 !px-3 text-sm"
                />
              </div>
            </div>

            {allSizes.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">{t('size')}</label>
                <div className="flex flex-wrap gap-1.5">
                  {allSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => toggleSize(size)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200",
                        selectedSizes.includes(size)
                          ? 'bg-surface-900 text-white border-surface-900'
                          : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 border-surface-200 dark:border-surface-600 hover:border-surface-400'
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {allColors.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">{t('color')}</label>
                <div className="flex flex-wrap gap-2">
                  {allColors.map((color: { name: string; hex: string }) => (
                    <button
                      key={color.hex}
                      onClick={() => toggleColor(color.hex)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all duration-200",
                        selectedColors.includes(color.hex)
                          ? 'border-surface-900 scale-110 ring-2 ring-surface-200'
                          : 'border-surface-200 dark:border-surface-600 hover:scale-105'
                      )}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded text-surface-900 focus:ring-surface-100"
              />
              <span className="text-xs font-medium text-surface-600 dark:text-surface-300">{t('in_stock')}</span>
            </label>
          </div>
        </div>
      )}

      {/* Products */}
      <div className="px-4 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-surface-300 dark:text-surface-600" />
            </div>
            <p className="text-sm font-medium text-surface-400">
              {debouncedSearch || activeFiltersCount > 0
                ? language === 'ru' ? 'Товары не найдены' : 'Mahsulotlar topilmadi'
                : language === 'ru' ? 'Нет товаров' : "Mahsulotlar yo'q"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <div key={product.id}>
                  <ProductCard product={product} language={language} />
                </div>
              ))}
            </div>

            {hasNextPage && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 text-sm font-semibold text-surface-900 dark:text-white hover:bg-surface-50 dark:hover:bg-surface-700 transition-all disabled:opacity-60"
                >
                  {isFetchingNextPage ? (
                    <>
                      <span className="w-4 h-4 border-2 border-surface-400 border-t-surface-900 rounded-full animate-spin" />
                      {language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...'}
                    </>
                  ) : (
                    language === 'ru'
                      ? `Показать ещё (${total - products.length})`
                      : `Yana ko'rsatish (${total - products.length})`
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};
