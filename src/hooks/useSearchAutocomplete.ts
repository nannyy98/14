import { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSearchHistory } from '../lib/searchHistory';

export interface SearchSuggestion {
  text: string;
  source: 'history' | 'popular' | 'product';
}

export function getSearchHistorySuggestions(query: string): SearchSuggestion[] {
  if (!query.trim()) return [];
  const history = getSearchHistory();
  const q = query.toLowerCase();
  return history
    .filter((h) => h.toLowerCase().includes(q))
    .slice(0, 5)
    .map((text) => ({ text, source: 'history' }));
}

export function useSearchAutocomplete(query: string, language: 'ru' | 'uz' = 'ru') {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const historySuggestions = useMemo(() => {
    return getSearchHistorySuggestions(query);
  }, [query]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions(historySuggestions);
      return;
    }

    let cancelled = false;

    const fetchSuggestions = async () => {
      setIsLoading(true);
      const results: SearchSuggestion[] = [...historySuggestions];

      if (!isSupabaseConfigured) {
        setSuggestions(results.slice(0, 8));
        setIsLoading(false);
        return;
      }

      try {
        const { data: products } = await supabase
          .from('products')
          .select('name')
          .eq('is_active', true)
          .limit(10);

        if (!cancelled && products) {
          const nameSuggestions = products
            .map((p) => {
              const name = p.name;
              if (typeof name === 'object' && name !== null) {
                return (name as Record<string, string>)[language] || (name as Record<string, string>).ru || '';
              }
              return String(name);
            })
            .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5)
            .map((text) => ({ text, source: 'product' as const }));

          const seen = new Set(results.map((s) => s.text.toLowerCase()));
          for (const s of nameSuggestions) {
            if (!seen.has(s.text.toLowerCase())) {
              results.push(s);
              seen.add(s.text.toLowerCase());
            }
          }
        }
      } catch {
        // Silently fail
      }

      if (!cancelled) {
        setSuggestions(results.slice(0, 8));
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, language, historySuggestions]);

  return { suggestions, isLoading };
}
