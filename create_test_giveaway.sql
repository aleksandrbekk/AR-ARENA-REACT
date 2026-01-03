
-- Удаляем старый тест, если есть
DELETE FROM public.giveaways WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- Создаем новый на 2 минуты
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
    '🔥 FAST TEST (2 мин)',
    'Купи билет, подожди 2 минуты и увидишь кнопку "Результаты".',
    'Test description',
    1,
    'ar',
    777,
    NOW() + INTERVAL '2 minutes',
    NOW() + INTERVAL '3 minutes',
    'active',
    'https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?w=1600&h=900&fit=crop',
    '[{"place": 1, "amount": 777, "percentage": 100}]'::jsonb
);
