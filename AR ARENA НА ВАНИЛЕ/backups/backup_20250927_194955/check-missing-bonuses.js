// Скрипт для проверки и начисления пропущенных реферальных бонусов
// Добавь этот код в auth.js или вызови отдельно

async function checkAndFixMissingBonuses() {
    console.log('[BONUS-CHECK] Проверка пропущенных реферальных бонусов...');

    try {
        // Находим все реферальные связи
        const { data: relations } = await supabaseClient
            .from('users')
            .select('id, referrer_id')
            .not('referrer_id', 'is', null);

        if (!relations || relations.length === 0) {
            console.log('[BONUS-CHECK] Реферальных связей не найдено');
            return;
        }

        for (const relation of relations) {
            // Проверяем, есть ли транзакция о выплате бонуса
            const { data: existingBonus } = await supabaseClient
                .from('transactions')
                .select('id')
                .eq('user_id', relation.referrer_id)
                .eq('type', 'referral_bonus')
                .like('description', '%' + relation.id + '%');

            if (!existingBonus || existingBonus.length === 0) {
                // Бонус не был выплачен - начисляем
                console.log('[BONUS-CHECK] Найден пропущенный бонус для реферера:', relation.referrer_id);

                // Получаем информацию о пользователях
                const { data: referrer } = await supabaseClient
                    .from('users')
                    .select('balance_ar, telegram_id, first_name')
                    .eq('id', relation.referrer_id)
                    .single();

                const { data: referred } = await supabaseClient
                    .from('users')
                    .select('first_name')
                    .eq('id', relation.id)
                    .single();

                if (referrer) {
                    // Начисляем 100 AR
                    const newBalance = (referrer.balance_ar || 0) + 100;

                    await supabaseClient
                        .from('users')
                        .update({ balance_ar: newBalance })
                        .eq('id', relation.referrer_id);

                    // Записываем транзакцию
                    await supabaseClient
                        .from('transactions')
                        .insert({
                            user_id: relation.referrer_id,
                            type: 'referral_bonus',
                            amount: 100,
                            status: 'completed',
                            description: `Бонус за приглашение пользователя ${referred?.first_name || 'Unknown'} (восстановлен)`,
                            created_at: new Date().toISOString()
                        });

                    console.log(`[BONUS-CHECK] ✅ Начислено 100 AR пользователю ${referrer.first_name} (${referrer.telegram_id})`);
                }
            }
        }

        console.log('[BONUS-CHECK] Проверка завершена');

    } catch (error) {
        console.error('[BONUS-CHECK] Ошибка:', error);
    }
}

// Автоматически запускаем проверку при загрузке
if (typeof window !== 'undefined' && window.supabaseClient) {
    setTimeout(() => {
        checkAndFixMissingBonuses();
    }, 3000); // Запускаем через 3 секунды после загрузки
}