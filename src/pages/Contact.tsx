import { useState } from 'react';
import { MessageCircle, Phone, ChevronDown, ChevronUp, Clock, MapPin, Mail } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useTranslation } from '../hooks/useTranslation';
import { tg } from '../lib/telegram';

const SUPPORT_BOT = 'https://t.me/STYLE_TECH_SUPPORT';
const SUPPORT_PHONE = '+998901234567';
const WORK_HOURS = '09:00 — 21:00';

const FAQ_ITEMS = [
  {
    q_ru: 'Как отследить свой заказ?',
    q_uz: "Buyurtmani qanday kuzatish mumkin?",
    a_ru: 'Перейдите в раздел «Заказы» внизу экрана. Там вы увидите актуальный статус вашего заказа с анимацией пути доставки.',
    a_uz: "Ekran pastidagi \"Buyurtmalar\" bo'limiga o'ting. Yetkazib berish yo'li animatsiyasi bilan buyurtmangizning joriy holatini ko'rasiz.",
  },
  {
    q_ru: 'Сколько длится доставка?',
    q_uz: "Yetkazib berish qancha vaqt oladi?",
    a_ru: 'Стандартная доставка: 3–7 рабочих дней. Экспресс-доставка: 1–2 рабочих дня. Сроки зависят от вашего региона.',
    a_uz: "Standart yetkazib berish: 3-7 ish kuni. Ekspress yetkazib berish: 1-2 ish kuni. Muddatlar mintaqangizga bog'liq.",
  },
  {
    q_ru: 'Как оформить возврат?',
    q_uz: "Qaytarishni qanday rasmiylashtirish mumkin?",
    a_ru: 'В разделе «Заказы» нажмите «Запросить возврат» рядом с доставленным заказом. Выберите товары и укажите причину.',
    a_uz: "\"Buyurtmalar\" bo'limida yetkazilgan buyurtma yonidagi \"Qaytarish so'rovi\" tugmasini bosing. Mahsulotlarni tanlang va sababini ko'rsating.",
  },
  {
    q_ru: 'Какие способы оплаты доступны?',
    q_uz: "Qanday to'lov usullari mavjud?",
    a_ru: 'Мы принимаем Payme, Click, Uzum Bank, а также наличные при получении.',
    a_uz: "Biz Payme, Click, Uzum Bank, shuningdek, yetkazib berishda naqd pulni qabul qilamiz.",
  },
  {
    q_ru: 'Можно ли изменить заказ после оформления?',
    q_uz: "Buyurtma berilgandan keyin o'zgartirish mumkinmi?",
    a_ru: 'Да, свяжитесь с нашим колл-центром в течение 1 часа после оформления, и мы поможем внести изменения.',
    a_uz: "Ha, buyurtma berilgandan so'ng 1 soat ichida bizning call-center bilan bog'laning, biz o'zgarishlar kiritishga yordam beramiz.",
  },
  {
    q_ru: 'Есть ли гарантия на товары?',
    q_uz: "Mahsulotlarga kafolat bormi?",
    a_ru: 'Да, на все товары действует гарантия возврата в течение 14 дней с момента доставки.',
    a_uz: "Ha, barcha mahsulotlarga yetkazib berilganidan boshlab 14 kun ichida qaytarish kafolati beriladi.",
  },
];

export const Contact = () => {
  const { language } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleCall = () => {
    window.open(`tel:${SUPPORT_PHONE}`, '_self');
  };

  const handleChat = () => {
    if (tg) {
      (tg as { openTelegramLink?: (url: string) => void }).openTelegramLink?.(SUPPORT_BOT);
    } else {
      window.open(SUPPORT_BOT, '_blank');
    }
  };

  return (
    <Layout showBottomNav={false}>
      <div className="px-4 py-4 space-y-4 pb-8">
        <h1 className="text-xl font-bold text-surface-900 dark:text-white">
          {language === 'ru' ? 'Связаться с нами' : "Biz bilan bog'lanish"}
        </h1>

        {/* Contact cards */}
        <div className="space-y-3">
          {/* Chat with bot */}
          <button
            onClick={handleChat}
            className="w-full bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm border border-surface-100 dark:border-surface-700 flex items-center gap-4 active:scale-[0.98] transition-transform"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-bold text-surface-900 dark:text-white">
                {language === 'ru' ? 'Написать в поддержку' : "Qo'llab-quvvatlashga yozish"}
              </h3>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                {language === 'ru' ? 'Ответим за 5 минут' : "5 daqiqada javob beramiz"}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-surface-400 -rotate-90" />
          </button>

          {/* Call */}
          <button
            onClick={handleCall}
            className="w-full bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm border border-surface-100 dark:border-surface-700 flex items-center gap-4 active:scale-[0.98] transition-transform"
          >
            <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center flex-shrink-0">
              <Phone className="w-7 h-7 text-white" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-bold text-surface-900 dark:text-white">
                {language === 'ru' ? 'Позвонить' : "Qo'ng'iroq qilish"}
              </h3>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{SUPPORT_PHONE}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-surface-400 -rotate-90" />
          </button>
        </div>

        {/* Info */}
        <div className="bg-surface-50 dark:bg-surface-800 rounded-2xl p-4 border border-surface-100 dark:border-surface-700">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-surface-400" />
              <div>
                <p className="text-xs text-surface-500 dark:text-surface-400">{language === 'ru' ? 'Часы работы' : 'Ish vaqti'}</p>
                <p className="text-sm font-medium text-surface-900 dark:text-white">{WORK_HOURS}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-surface-400" />
              <div>
                <p className="text-xs text-surface-500 dark:text-surface-400">{language === 'ru' ? 'Адрес' : 'Manzil'}</p>
                <p className="text-sm font-medium text-surface-900 dark:text-white">
                  {language === 'ru' ? 'г. Ташкент, ул. Амир Темур, 108' : 'Toshkent sh., Amir Temur ko\'ch., 108'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-surface-400" />
              <div>
                <p className="text-xs text-surface-500 dark:text-surface-400">Email</p>
                <p className="text-sm font-medium text-surface-900 dark:text-white">support@styletech.uz</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-base font-bold text-surface-900 dark:text-white mb-3">
            {language === 'ru' ? 'Часто задаваемые вопросы' : "Ko'p beriladigan savollar"}
          </h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-surface-800 rounded-xl border border-surface-100 dark:border-surface-700 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-3.5 text-left"
                >
                  <span className="text-sm font-medium text-surface-900 dark:text-white pr-2">
                    {language === 'ru' ? item.q_ru : item.q_uz}
                  </span>
                  {openFaq === idx ? (
                    <ChevronUp className="w-4 h-4 text-surface-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-surface-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === idx && (
                  <div className="px-3.5 pb-3.5 pt-0">
                    <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                      {language === 'ru' ? item.a_ru : item.a_uz}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};
