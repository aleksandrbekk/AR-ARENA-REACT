
-- 1. Добавляем колонку image_url, если её нет (безопасно)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'image_url') THEN
        ALTER TABLE public.giveaways ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- 2. Создаем тестовый розыгрыш (удаляем старый с таким ID если был, чтобы не было конфликта)
DELETE FROM public.giveaways WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

INSERT INTO public.giveaways (
    id,
    title,
    subtitle,
    description,
    price,
    currency,
    jackpot_current_amount,
    end_date,
    draw_date,
    status,
    image_url,
    prizes
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'TEST GIVEAWAY (Banner V2)',
    'Тест баннера, таймера и кнопки результатов.',
    'Test description',
    1,
    'ar',
    5000,
    NOW() + INTERVAL '10 minutes',
    NOW() + INTERVAL '11 minutes',
    'active',
    'https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?w=1600&h=900&fit=crop',
    '[{"place": 1, "amount": 500, "percentage": 50}]'::jsonb
);
