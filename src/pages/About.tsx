import { useState, useEffect } from 'react';
import { Shield, Truck, Heart, Star, Phone, MapPin, Clock } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useTranslation } from '../hooks/useTranslation';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AboutPage {
  title_ru: string;
  title_uz: string;
  content_ru: string;
  content_uz: string;
  mission_ru: string;
  mission_uz: string;
  image_url: string | null;
}

const FALLBACK_ABOUT: AboutPage = {
  title_ru: 'StyleTech Shop',
  title_uz: 'StyleTech Shop',
  content_ru: 'Мы — современный интернет-магазин стильной одежды и аксессуаров для рынка Узбекистана. Наша миссия — сделать качественную моду доступной каждому.',
  content_uz: "Biz O'zbekiston bozori uchun zamonaviy, chiroyli kiyim va aksessuarlar internet-do'konimiz. Bizning maqsadimiz — har bir kishi uchun sifatli modani qilish.",
  mission_ru: 'Предоставлять качественную одежду по доступным ценам с быстрой доставкой по всему Узбекистану.',
  mission_uz: "Barcha O'zbekiston bo'ylab tez yetkazib berish bilan qulay narxlarda sifatli kiyimni taqdim etish.",
  image_url: null,
};

const VALUES = [
  { icon: Shield, label_ru: 'Гарантия качества', label_uz: 'Sifat kafolati' },
  { icon: Truck, label_ru: 'Быстрая доставка', label_uz: 'Tez yetkazib berish' },
  { icon: Heart, label_ru: 'Забота о клиентах', label_uz: "Mijozlarga g'amxo'rlik" },
  { icon: Star, label_ru: 'Лучшие цены', label_uz: 'Eng yaxshi narxlar' },
];

export const About = () => {
  const { language } = useTranslation();
  const [about, setAbout] = useState<AboutPage>(FALLBACK_ABOUT);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const fetchData = async () => {
      const { data } = await supabase
        .from('about_page')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      if (data) setAbout(data as AboutPage);
    };
    fetchData();
  }, []);

  return (
    <Layout showBottomNav={false}>
      <div className="px-4 py-4 space-y-5 pb-8">
        {/* Hero */}
        <div className="text-center py-6">
          {about.image_url && (
            <img src={about.image_url} alt="" className="w-20 h-20 rounded-2xl mx-auto mb-4 object-cover" />
          )}
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-2">
            {language === 'ru' ? about.title_ru : about.title_uz}
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed max-w-md mx-auto">
            {language === 'ru' ? about.content_ru : about.content_uz}
          </p>
        </div>

        {/* Mission */}
        <div className="bg-surface-900 dark:bg-white rounded-2xl p-5 text-white dark:text-surface-900">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-2 opacity-70">
            {language === 'ru' ? 'Наша миссия' : 'Bizning maqsadimiz'}
          </h2>
          <p className="text-base font-medium leading-relaxed">
            {language === 'ru' ? about.mission_ru : about.mission_uz}
          </p>
        </div>

        {/* Values */}
        <div className="grid grid-cols-2 gap-3">
          {VALUES.map(({ icon: Icon, label_ru, label_uz }, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm border border-surface-100 dark:border-surface-700 text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center mx-auto mb-2">
                <Icon className="w-5 h-5 text-surface-900 dark:text-white" />
              </div>
              <p className="text-xs font-semibold text-surface-900 dark:text-white">
                {language === 'ru' ? label_ru : label_uz}
              </p>
            </div>
          ))}
        </div>

        {/* Contact info */}
        <div className="bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm border border-surface-100 dark:border-surface-700">
          <h2 className="text-sm font-bold text-surface-900 dark:text-white mb-3">
            {language === 'ru' ? 'Контакты' : "Aloqa ma'lumotlari"}
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-surface-400" />
              <span className="text-sm text-surface-700 dark:text-surface-300">+998 90 123 45 67</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-surface-400" />
              <span className="text-sm text-surface-700 dark:text-surface-300">
                {language === 'ru' ? 'г. Ташкент, ул. Амир Темур, 108' : "Toshkent sh., Amir Temur ko'ch., 108"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-surface-400" />
              <span className="text-sm text-surface-700 dark:text-surface-300">
                {language === 'ru' ? 'Пн–Вс: 09:00–21:00' : 'Dush-Yak: 09:00–21:00'}
              </span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-surface-400 dark:text-surface-600">StyleTech Shop v1.0</p>
      </div>
    </Layout>
  );
};
