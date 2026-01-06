INSERT INTO public.giveaways (
    title,
    subtitle,
    description,
    price,
    currency,
    jackpot_current_amount,
    end_date,
    status
) VALUES (
    'Еженедельный Джекпот',
    'Испытай удачу и выиграй гору AR!',
    'Грандиозный розыгрыш для самых активных игроков.',
    10,
    'ar',
    10000,
    NOW() + INTERVAL '3 days',
    'active'
), (
    'Бычий Раш',
    'Розыгрыш BUL токенов',
    'Мгновенная лотерея.',
    1000,
    'bul',
    500000,
    NOW() + INTERVAL '1 day',
    'active'
);
