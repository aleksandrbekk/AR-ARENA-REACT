
-- Create a Test Giveaway with specific UUID so we can link to it immediately
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
    'Full cycle test: Buy a ticket, wait for timer, see results.',
    'Test description',
    1,
    'ar',
    1000,
    NOW() + INTERVAL '5 minutes',
    NOW() + INTERVAL '6 minutes',
    'active',
    'https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?w=1600&h=900&fit=crop',
    '[
      {"place": 1, "amount": 500, "percentage": 50},
      {"place": 2, "amount": 300, "percentage": 30},
      {"place": 3, "amount": 200, "percentage": 20}
    ]'::jsonb
);
