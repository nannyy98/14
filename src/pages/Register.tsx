import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, ShoppingBag } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { toast } from '../components/Toast';
import { userQueries } from '../lib/supabase/hooks';
import { isSupabaseConfigured } from '../lib/supabase';

export const Register = () => {
  const navigate = useNavigate();
  const { language, setRegistration } = useAppStore();
  const [name, setName] = useState(() => { const u = window.Telegram?.WebApp?.initDataUnsafe?.user; return u?.first_name || ''; });
  const [phone, setPhone] = useState('+998 ');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimName = name.trim();
    const trimPhone = phone.trim();
    const phoneClean = trimPhone.replace(/[\s\-()]/g, '');

    if (trimName.length < 2) {
      toast.error(language === 'ru' ? 'Введите имя (мин. 2 символа)' : 'Ismingizni kiriting (kamida 2 belgi)');
      return;
    }

    if (phoneClean.length > 3 && !/^\+?[0-9]{9,13}$/.test(phoneClean)) {
      toast.error(language === 'ru' ? 'Введите корректный номер телефона' : "To'g'ri telefon raqam kiriting");
      return;
    }

    setSaving(true);
    try {
      if (!isSupabaseConfigured) {
        toast.error(language === 'ru' ? 'База данных не настроена. Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env' : "Ma'lumotlar bazasi sozlanmagan. VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY ni .env fayliga qo'shing");
        return;
      }

      const numericId = parseInt(phoneClean.replace(/\D/g, '').slice(-9), 10) || Date.now();

      await userQueries.upsert(numericId, {
        first_name: trimName,
        username: null,
        language: language,
      });

      // Also update the phone
      await userQueries.updateProfile(numericId, {
        first_name: trimName,
        phone: trimPhone,
      });

      setRegistration(trimName, trimPhone);
      toast.success(language === 'ru' ? 'Регистрация успешна!' : "Ro'yxatdan o'tish muvaffaqiyatli!");
      navigate('/catalog');
    } catch (err) {
      console.error('Registration error:', err);
      toast.error(language === 'ru' ? 'Ошибка регистрации' : "Ro'yxatdan o'tishda xatolik");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-50">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-surface-100 rounded-2xl mb-5">
              <ShoppingBag className="w-8 h-8 text-surface-900" />
            </div>
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight mb-2">
              {language === 'ru' ? 'Добро пожаловать!' : 'Xush kelibsiz!'}
            </h1>
            <p className="text-surface-400 text-sm">
              {language === 'ru'
                ? `Добавьте телефон для доставки`
                : "Yetkazib berish uchun telefon qo'shing"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-2xl p-5 space-y-4 shadow-sm">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">
                  <User className="w-3.5 h-3.5" />
                  {language === 'ru' ? 'Ваше имя' : 'Ismingiz'} *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === 'ru' ? 'Иван Петров' : 'Ism Familiya'}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-surface-200 text-surface-900 placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-surface-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">
                  <Phone className="w-3.5 h-3.5" />
                  {language === 'ru' ? 'Телефон' : 'Telefon'} *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-surface-200 text-surface-900 placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-surface-400 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-surface-900 hover:bg-surface-800 disabled:bg-surface-400 text-white py-4 rounded-2xl font-semibold text-base transition-all flex items-center justify-center gap-2"
            >
              {saving && <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {language === 'ru' ? 'Продолжить' : 'Davom etish'}
            </button>
          </form>

          <button
            onClick={() => navigate('/catalog')}
            className="w-full text-center text-surface-400 text-sm mt-4 hover:text-surface-600 transition"
          >
            {language === 'ru' ? 'Пропустить' : "O'tkazib yuborish"} →
          </button>

          <p className="text-center text-surface-500 text-xs mt-4">
            {language === 'ru'
              ? 'Телефон нужен для доставки'
              : "Telefon yetkazib berish uchun kerak"}
          </p>
        </div>
      </div>
    </div>
  );
};
