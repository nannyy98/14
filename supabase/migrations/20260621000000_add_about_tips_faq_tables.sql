-- About page table (single row for dynamic content)
CREATE TABLE IF NOT EXISTS about_page (
  id TEXT PRIMARY KEY DEFAULT 'main',
  title_ru TEXT NOT NULL DEFAULT 'StyleTech Shop',
  title_uz TEXT NOT NULL DEFAULT 'StyleTech Shop',
  content_ru TEXT NOT NULL DEFAULT '',
  content_uz TEXT NOT NULL DEFAULT '',
  mission_ru TEXT NOT NULL DEFAULT '',
  mission_uz TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tips table
CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ru TEXT NOT NULL,
  title_uz TEXT NOT NULL,
  content_ru TEXT NOT NULL,
  content_uz TEXT NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'style' CHECK (category IN ('style', 'care', 'faq')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FAQ table
CREATE TABLE IF NOT EXISTS faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_ru TEXT NOT NULL,
  question_uz TEXT NOT NULL,
  answer_ru TEXT NOT NULL,
  answer_uz TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE about_page ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can read about_page" ON about_page FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read tips" ON tips FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read faq" ON faq FOR SELECT USING (is_active = true);

-- Admin full access (via service role)
CREATE POLICY "Service role full access about_page" ON about_page FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access tips" ON tips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access faq" ON faq FOR ALL USING (true) WITH CHECK (true);

-- Seed data for about_page
INSERT INTO about_page (id, title_ru, title_uz, content_ru, content_uz, mission_ru, mission_uz)
VALUES (
  'main',
  'StyleTech Shop',
  'StyleTech Shop',
  'Мы — современный интернет-магазин стильной одежды и аксессуаров для рынка Узбекистана. Наша миссия — сделать качественную моду доступной каждому.',
  'Biz O''zbekiston bozori uchun zamonaviy, chiroyli kiyim va aksessuarlar internet-do''konimiz. Bizning maqsadimiz — har bir kishi uchun sifatli modani qilish.',
  'Предоставлять качественную одежду по доступным ценам с быстрой доставкой по всему Узбекистану.',
  'Barcha O''zbekiston bo''ylab tez yetkazib berish bilan qulay narxlarda sifatli kiyimni taqdim etish.'
)
ON CONFLICT (id) DO NOTHING;

-- Seed tips
INSERT INTO tips (title_ru, title_uz, content_ru, content_uz, category, sort_order) VALUES
('Как сочетать цвета одежды', 'Kiyim ranglarini qanday birlashtirish kerak', 'Базовые правила сочетания: чёрный, белый и серый сочетаются со всем. Для ярких акцентов используйте правило 60-30-10.', 'Asosiy qoidalar: qora, oq va kulrang hamma narsa bilan mos keladi. Yorqin aktsentlar uchun 60-30-10 qoidasini ishlating.', 'style', 1),
('Стирка худи и футболок', 'Xudi va futbolkalarni yuvish', 'Стирайте при 30°C, выворачивая наизнанку. Не используйте отбеливатель. Сушите в расправленном виде.', '30°C da, teskari tomoni bilan yuving. Oqartiruvchi ishlatmang. tekis holatda quriting.', 'care', 2),
('Тренды сезона: минимализм', 'Mavsum trendlari: minimalizm', 'В этом сезоне в тренде минимализм — чистые линии, монохромные образы и качественные базовые вещи.', 'Ushbu mavsumda minimalizm trendda — toza chiziqlar, monoxrom obrazlar va sifatli asosiy narsalar.', 'style', 3),
('Как носить худи правильно', 'Xudini to''g''ri kiyish', 'Худи — универсальная вещь. Сочетайте с джинсами для casual look, с брюками-палаццо для элегантного стиля.', 'Xudi — universal narsa. Casual ko''rish uchun jinslar bilan, elegant uslub uchun palaçço shimlar bilan birlashtiring.', 'style', 4)
ON CONFLICT DO NOTHING;

-- Seed FAQ
INSERT INTO faq (question_ru, question_uz, answer_ru, answer_uz, sort_order) VALUES
('Как сделать заказ?', 'Buyurtmani qanday berish mumkin?', 'Выберите товар в каталоге, добавьте в корзину, выберите размер и цвет, затем нажмите «Оформить заказ».', 'Katalogdan mahsulotni tanlang, savatga qo''shing, o''lcham va rangni tanlang, keyin «Buyurtma berish» tugmasini bosing.', 1),
('Можно ли вертировать товар?', 'Mahsulotni qaytarish mumkinmi?', 'Да, в течение 14 дней после доставки. Откройте раздел «Заказы» и нажмите «Запросить возврат».', 'Ha, yetkazib berilgandan keyin 14 kun ichida. «Buyurtmalar» bo''limini oching va «Qaytarish so''rovi» tugmasini bosing.', 2),
('Как применить промокод?', 'Promo kodni qanday qo''llash mumkin?', 'При оформлении заказа введите промокод в поле «Промокод» и нажмите «Применить».', 'Buyurtma berish paytida «Promo kod» maydoniga promo kodni kiriting va «Qo''llash» tugmasini bosing.', 3)
ON CONFLICT DO NOTHING;
