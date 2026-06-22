import { useState, useEffect } from 'react';
import { Sparkles, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useTranslation } from '../hooks/useTranslation';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface Tip {
  id: string;
  title_ru: string;
  title_uz: string;
  content_ru: string;
  content_uz: string;
  image_url: string | null;
  category: 'style' | 'care' | 'faq';
  sort_order: number;
}

interface FaqItem {
  id: string;
  question_ru: string;
  question_uz: string;
  answer_ru: string;
  answer_uz: string;
  sort_order: number;
}

const FALLBACK_TIPS: Tip[] = [
  {
    id: 'tip-1',
    title_ru: 'Как сочетать цвета одежды',
    title_uz: "Kiyim ranglarini qanday birlashtirish kerak",
    content_ru: 'Базовые правила сочетания: чёрный, белый и серый сочетаются со всем. Для ярких акцентов используйте правило 60-30-10: 60% основного цвета, 30% вторичного и 10% акцентного.',
    content_uz: "Asosiy qoidalar: qora, oq va kulrang hamma narsa bilan mos keladi. Yorqin aktsentlar uchun 60-30-10 qoidasini ishlating: 60% asosiy rang, 30% ikkinchi darajali va 10% aktsent rang.",
    image_url: null,
    category: 'style',
    sort_order: 1,
  },
  {
    id: 'tip-2',
    title_ru: 'Стирка худи и футболок',
    title_uz: "Xudi va futbolkalarni yuvish",
    content_ru: 'Стирайте при 30°C, выворачивая наизнанку. Не используйте отбеливатель. Сушите в расправленном виде. Гладите при низкой температуре через ткань.',
    content_uz: "30°C da, teskari tomoni bilan yuving. Oqartiruvchi ishlatmang. tekis holatda quriting. Past haroratda, mato orqali dazmolang.",
    image_url: null,
    category: 'care',
    sort_order: 2,
  },
  {
    id: 'tip-3',
    title_ru: 'Тренды сезона: минимализм',
    title_uz: "Mavsum trendlari: minimalizm",
    content_ru: 'В этом сезоне в тренде минимализм — чистые линии, монохромные образы и качественные базовые вещи. Инвестируйте в классические вещи, которые прослужат дольше одного сезона.',
    content_uz: "Ushbu mavsumda minimalizm trendda — toza chiziqlar, monoxrom obrazlar va sifatli asosiy narsalar. Bitta mavsumdan ko'proq xizmat qiladigan klassik narsalarga sarmoya kiriting.",
    image_url: null,
    category: 'style',
    sort_order: 3,
  },
  {
    id: 'tip-4',
    title_ru: 'Как носить худи правильно',
    title_uz: "Xudini to'g'ri kiyish",
    content_ru: 'Худи — универсальная вещь. Сочетайте с джинсами для casual look, с брюками-палаццо для элегантного стиля. Не заправляйте — так выглядит актуально.',
    content_uz: "Xudi — universal narsa. Casual ko'rinish uchun jinslar bilan, elegant uslub uchun palaçço shimlar bilan birlashtiring. Tiqib qo'ymang — bu zamonaviy ko'rinadi.",
    image_url: null,
    category: 'style',
    sort_order: 4,
  },
];

const FALLBACK_FAQ: FaqItem[] = [
  {
    id: 'faq-1',
    question_ru: 'Как сделать заказ?',
    question_uz: "Buyurtmani qanday berish mumkin?",
    answer_ru: 'Выберите товар в каталоге, добавьте в корзину, выберите размер и цвет, затем нажмите «Оформить заказ».',
    answer_uz: "Katalogdan mahsulotni tanlang, savatga qo'shing, o'lcham va rangni tanlang, keyin «Buyurtma berish» tugmasini bosing.",
    sort_order: 1,
  },
  {
    id: 'faq-2',
    question_ru: 'Можно ли вернуть товар?',
    question_uz: "Mahsulotni qaytarish mumkinmi?",
    answer_ru: 'Да, в течение 14 дней после доставки.',
    answer_uz: "Ha, yetkazib berilgandan keyin 14 kun ichida.",
    sort_order: 2,
  },
  {
    id: 'faq-3',
    question_ru: 'Как применить промокод?',
    question_uz: "Promo kodni qanday qo'llash mumkin?",
    answer_ru: 'При оформлении заказа введите промокод в поле «Промокод» и нажмите «Применить».',
    answer_uz: "Buyurtma berish paytida «Promo kod» maydoniga promo kodni kiriting va «Qo'llash» tugmasini bosing.",
    sort_order: 3,
  },
];

export const Tips = () => {
  const { language } = useTranslation();
  const [activeTab, setActiveTab] = useState<'style' | 'faq'>('style');
  const [tips, setTips] = useState<Tip[]>(FALLBACK_TIPS);
  const [faqItems, setFaqItems] = useState<FaqItem[]>(FALLBACK_FAQ);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const fetchData = async () => {
      const { data: tipsData } = await supabase
        .from('tips')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (tipsData && tipsData.length > 0) setTips(tipsData as Tip[]);

      const { data: faqData } = await supabase
        .from('faq')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (faqData && faqData.length > 0) setFaqItems(faqData as FaqItem[]);
    };
    fetchData();
  }, []);

  const styleTips = tips.filter((t) => t.category === 'style' || t.category === 'care');

  return (
    <Layout showBottomNav={false}>
      <div className="px-4 py-4 space-y-4 pb-8">
        <h1 className="text-xl font-bold text-surface-900 dark:text-white">
          {language === 'ru' ? 'Советы и помощь' : "Maslahatlar yordam"}
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 bg-surface-100 dark:bg-surface-800 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('style')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'style'
                ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm'
                : 'text-surface-500 dark:text-surface-400'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {language === 'ru' ? 'Стиль' : 'Uslub'}
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'faq'
                ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm'
                : 'text-surface-500 dark:text-surface-400'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            {language === 'ru' ? 'Вопросы' : 'Savollar'}
          </button>
        </div>

        {/* Style Tips */}
        {activeTab === 'style' && (
          <div className="space-y-3">
            {styleTips.map((tip) => (
              <div
                key={tip.id}
                className="bg-white dark:bg-surface-800 rounded-2xl overflow-hidden shadow-sm border border-surface-100 dark:border-surface-700"
              >
                {tip.image_url && (
                  <img src={tip.image_url} alt="" className="w-full h-40 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      tip.category === 'style'
                        ? 'bg-surface-900 text-white dark:bg-white dark:text-surface-900'
                        : 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300'
                    }`}>
                      {tip.category === 'style'
                        ? (language === 'ru' ? 'стиль' : 'uslub')
                        : (language === 'ru' ? 'уход' : 'parvarish')}
                    </span>
                  </div>
                  <h3 className="font-bold text-surface-900 dark:text-white mb-1.5">
                    {language === 'ru' ? tip.title_ru : tip.title_uz}
                  </h3>
                  <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                    {language === 'ru' ? tip.content_ru : tip.content_uz}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FAQ */}
        {activeTab === 'faq' && (
          <div className="space-y-2">
            {faqItems.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-surface-800 rounded-xl border border-surface-100 dark:border-surface-700 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === item.id ? null : item.id)}
                  className="w-full flex items-center justify-between p-3.5 text-left"
                >
                  <span className="text-sm font-medium text-surface-900 dark:text-white pr-2">
                    {language === 'ru' ? item.question_ru : item.question_uz}
                  </span>
                  {openFaq === item.id ? (
                    <ChevronUp className="w-4 h-4 text-surface-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-surface-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === item.id && (
                  <div className="px-3.5 pb-3.5 pt-0">
                    <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                      {language === 'ru' ? item.answer_ru : item.answer_uz}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
