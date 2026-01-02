// AR ARENA - Система авторизации пользователей
console.log('[AUTH] Загрузка модуля авторизации...');

// Глобальная переменная для хранения текущего пользователя
window.currentUser = null;

// Главная функция инициализации авторизации
async function initAuth() {
    console.log('[AUTH] Начало инициализации...');

    // Получаем Telegram WebApp
    const tg = window.Telegram?.WebApp;

    if (!tg) {
        console.log('[AUTH] Telegram WebApp недоступен - работа в браузере');
        setTestMode();
        return;
    }

    // Инициализируем Telegram WebApp
    tg.ready();
    tg.expand();

    // Получаем данные пользователя
    const tgUser = tg.initDataUnsafe?.user;

    if (!tgUser) {
        console.log('[AUTH] Нет данных пользователя Telegram');
        setTestMode();
        return;
    }

    console.log('[AUTH] Получены данные пользователя:', {
        id: tgUser.id,
        name: `${tgUser.first_name} ${tgUser.last_name || ''}`,
        username: tgUser.username
    });

    // Работаем с базой данных Supabase
    await authenticateUser(tgUser);
}

// Функция авторизации через Supabase
async function authenticateUser(tgUser) {
    // Проверяем доступность Supabase
    if (typeof supabaseClient === 'undefined') {
        console.log('[AUTH] Supabase недоступен - используем локальные данные');

        window.currentUser = {
            telegram_id: tgUser.id,
            username: tgUser.username || '',
            first_name: tgUser.first_name || 'Пользователь',
            last_name: tgUser.last_name || '',
            balance_ar: 50,
            balance_coins: 0
        };

        updateUI();
        return;
    }

    try {
        console.log('[AUTH] Проверка пользователя в базе данных...');

        // Ищем существующего пользователя (используем .maybeSingle() вместо .single())
        const { data: userData, error: selectError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('telegram_id', tgUser.id);

        if (selectError) {
            console.error('[AUTH] Ошибка запроса к БД:', selectError);
            setLocalUser(tgUser);
            return;
        }

        // Получаем первого пользователя из массива (если есть)
        const existingUser = userData && userData.length > 0 ? userData[0] : null;

        if (existingUser) {
            // Проверяем, не заблокирован ли пользователь
            if (existingUser.is_blocked) {
                console.log('[AUTH] Пользователь заблокирован!');

                // Показываем сообщение о блокировке
                document.body.innerHTML = `
                    <div style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        background: #0A0A0A;
                        color: white;
                        text-align: center;
                        padding: 20px;
                    ">
                        <h1 style="color: #ff6464; margin-bottom: 20px;">Доступ заблокирован</h1>
                        <p style="color: rgba(255, 255, 255, 0.7); max-width: 300px;">
                            Ваш аккаунт был заблокирован администратором.
                            <br><br>
                            По вопросам разблокировки обратитесь в поддержку.
                        </p>
                        <button style="
                            margin-top: 30px;
                            padding: 12px 30px;
                            background: rgba(255, 100, 100, 0.2);
                            border: 1px solid rgba(255, 100, 100, 0.4);
                            border-radius: 10px;
                            color: white;
                            cursor: pointer;
                        " onclick="window.Telegram?.WebApp?.close()">Закрыть</button>
                    </div>
                `;
                return; // Прерываем авторизацию
            }

            // Пользователь существует и не заблокирован - обновляем last_seen_at
            console.log('[AUTH] Пользователь найден, обновляем данные');

            // Извлекаем параметр из URL для существующих пользователей
            let startParam = null;

            // Через HASH в URL
            if (window.location.hash) {
                let hashValue = window.location.hash.substring(1);
                if (hashValue.includes('?')) {
                    hashValue = hashValue.split('?')[0];
                }
                if (hashValue && hashValue.startsWith('ref_')) {
                    startParam = hashValue;
                    console.log('[AUTH] Параметр для существующего пользователя:', startParam);
                }
            }

            // Проверяем есть ли реферальная ссылка для существующего пользователя
            let updateData = {
                last_seen_at: new Date().toISOString(),
                username: tgUser.username || existingUser.username,
                first_name: tgUser.first_name || existingUser.first_name,
                last_name: tgUser.last_name || existingUser.last_name,
                photo_url: tgUser.photo_url || existingUser.photo_url  // Обновляем аватарку
            };

            // Если у пользователя нет реферера, но есть реферальная ссылка - добавляем
            if (!existingUser.referrer_id && startParam && startParam.startsWith('ref_')) {
                const refTelegramId = startParam.replace('ref_', '');
                console.log('[AUTH] Существующий пользователь с реферальной ссылкой:', refTelegramId);

                const { data: referrerData } = await supabaseClient
                    .from('users')
                    .select('id')
                    .eq('telegram_id', refTelegramId)
                    .single();

                if (referrerData) {
                    updateData.referrer_id = referrerData.id;
                    console.log('[AUTH] Добавляем реферера к существующему пользователю:', referrerData.id);

                    // Проверяем, был ли уже начислен бонус за этого пользователя
                    try {
                        // Проверяем существующие связи
                        const { data: existingRelation } = await supabaseClient
                            .from('referral_relations')
                            .select('id')
                            .eq('user_id', existingUser.id)
                            .eq('referrer_id', referrerData.id)
                            .single();

                        if (!existingRelation) {
                            // Бонус еще не начислялся - начисляем
                            console.log('[AUTH] Первое привязывание реферера - начисляем бонус');

                            // Получаем текущий баланс реферера
                            const { data: refUser } = await supabaseClient
                                .from('users')
                                .select('balance_ar')
                                .eq('id', referrerData.id)
                                .single();

                            if (refUser) {
                                const newBalance = (refUser.balance_ar || 0) + 100;

                                // Обновляем баланс
                                await supabaseClient
                                    .from('users')
                                    .update({ balance_ar: newBalance })
                                    .eq('id', referrerData.id);

                                console.log('[AUTH] Начислено 100 AR рефереру (существующий пользователь)');

                                // Записываем транзакцию
                                await supabaseClient
                                    .from('transactions')
                                    .insert({
                                        user_id: referrerData.id,
                                        type: 'referral_bonus',
                                        amount: 100,
                                        status: 'completed',
                                        description: `Бонус за приглашение пользователя ${tgUser.first_name}`,
                                        created_at: new Date().toISOString()
                                    });

                                // Создаем связь в referral_relations
                                await supabaseClient
                                    .from('referral_relations')
                                    .insert({
                                        user_id: existingUser.id,
                                        referrer_id: referrerData.id,
                                        level: 1,
                                        status: 'active',
                                        created_at: new Date().toISOString()
                                    });
                            }
                        } else {
                            console.log('[AUTH] Бонус за этого пользователя уже был начислен');
                        }
                    } catch (error) {
                        console.error('[AUTH] Ошибка начисления бонуса рефереру:', error);
                    }
                }
            }

            const { data: updatedUser, error: updateError } = await supabaseClient
                .from('users')
                .update(updateData)
                .eq('id', existingUser.id)
                .select()
                .single();

            if (updateError) {
                console.error('[AUTH] Ошибка обновления:', updateError);
                window.currentUser = existingUser;
            } else {
                window.currentUser = updatedUser;
            }

        } else {
            // Новый пользователь - создаем с бонусом 50 AR
            console.log('[AUTH] Создание нового пользователя с бонусом 50 AR');

            // ВРЕМЕННАЯ ВИДИМАЯ ОТЛАДКА ДЛЯ ПРОВЕРКИ
            const debugDiv = document.createElement('div');
            debugDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:10px;z-index:9999;font-size:12px;';

            const sp = window.Telegram?.WebApp?.initDataUnsafe?.start_param || 'НЕТ';
            const urlParams = new URLSearchParams(window.location.search);
            const startappParam = urlParams.get('startapp') || 'НЕТ';
            const refParam = urlParams.get('ref') || 'НЕТ';
            let hashValue = window.location.hash ? window.location.hash.substring(1) : 'НЕТ';
            // Очищаем хеш от лишних параметров для отладки
            if (hashValue !== 'НЕТ' && hashValue.includes('?')) {
                hashValue = hashValue.split('?')[0] + ' (+ данные)';
            }

            debugDiv.innerHTML = `
                <b>🔴 ОТЛАДКА РЕФЕРАЛА:</b><br>
                initDataUnsafe.start_param: ${sp}<br>
                URL HASH: ${hashValue}<br>
                URL startapp: ${startappParam}<br>
                URL ref: ${refParam}<br>
                Supabase: ${typeof supabaseClient !== 'undefined' ? '✅' : '❌'}<br>
                User: ${tgUser.first_name} (${tgUser.id})
            `;
            document.body.appendChild(debugDiv);
            setTimeout(() => debugDiv.remove(), 30000); // Показываем 30 секунд

            // Отладка всех возможных способов получения start_param
            console.log('=== ОТЛАДКА РЕФЕРАЛЬНОЙ ССЫЛКИ ===');
            console.log('1. initDataUnsafe:', window.Telegram?.WebApp?.initDataUnsafe);
            console.log('2. start_param:', window.Telegram?.WebApp?.initDataUnsafe?.start_param);
            console.log('3. initData:', window.Telegram?.WebApp?.initData);
            console.log('4. URL params:', window.location.search);

            // Также попробуем распарсить initData вручную
            const initData = window.Telegram?.WebApp?.initData;
            if (initData) {
                const params = new URLSearchParams(initData);
                console.log('5. Parsed start_param:', params.get('start_param'));
            }

            // Закомментировано для продакшена - раскомментируйте для отладки
            // const debugInfo = document.createElement('div');
            // debugInfo.style.cssText = 'position:fixed;bottom:100px;left:10px;right:10px;background:black;color:lime;padding:10px;z-index:9999;font-size:10px;border:1px solid lime;';
            // ... остальной код отладки ...

            // Проверяем реферальную ссылку из разных источников
            let referrerId = null;
            let startParam = null;

            // 1. Основной способ - через initDataUnsafe.start_param (стандарт Telegram)
            startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
            console.log('[AUTH] start_param из initDataUnsafe:', startParam);

            // 2. Через HASH в URL (новый способ для Telegram)
            if (!startParam && window.location.hash) {
                let hashValue = window.location.hash.substring(1); // убираем #
                // Отрезаем все после ? если есть
                if (hashValue.includes('?')) {
                    hashValue = hashValue.split('?')[0];
                }
                if (hashValue && hashValue.startsWith('ref_')) {
                    startParam = hashValue;
                    console.log('[AUTH] Параметр из HASH:', startParam);
                }
            }

            // 3. Через URL параметр startapp (резервный способ)
            if (!startParam) {
                const urlParams = new URLSearchParams(window.location.search);
                const startappParam = urlParams.get('startapp');
                if (startappParam) {
                    startParam = startappParam;
                    console.log('[AUTH] Параметр из URL startapp:', startParam);
                }
            }

            // 3. Резервный способ - параметр ref в URL
            if (!startParam) {
                const urlParams = new URLSearchParams(window.location.search);
                const refParam = urlParams.get('ref');
                if (refParam) {
                    startParam = `ref_${refParam}`;
                    console.log('[AUTH] Реферальный ID из URL ref:', refParam);
                }
            }

            // 4. Парсинг initData вручную
            if (!startParam) {
                const initData = window.Telegram?.WebApp?.initData;
                if (initData) {
                    const params = new URLSearchParams(initData);
                    startParam = params.get('start_param');
                    if (startParam) {
                        console.log('[AUTH] start_param из parsed initData:', startParam);
                    }
                }
            }

            console.log('[AUTH] Итоговый start параметр:', startParam);

            // Добавляем к отладке
            if (debugDiv) {
                debugDiv.innerHTML += `<br><b>Обработка:</b> startParam = ${startParam}`;
            }

            if (startParam && startParam.startsWith('ref_')) {
                const refTelegramId = startParam.replace('ref_', '');
                console.log('[AUTH] Ищем реферера с telegram_id:', refTelegramId, 'тип:', typeof refTelegramId);

                if (debugDiv) {
                    debugDiv.innerHTML += `<br>Ищем реферера: ${refTelegramId}`;
                }

                // Находим пользователя-реферера - пробуем как строку и как число
                let { data: referrerData, error: refError } = await supabaseClient
                    .from('users')
                    .select('*')  // Выбираем все поля для отладки
                    .eq('telegram_id', refTelegramId);

                // Если не нашли как строку, пробуем как число
                if ((!referrerData || referrerData.length === 0) && !refError) {
                    const refTelegramIdNum = parseInt(refTelegramId);
                    console.log('[AUTH] Пробуем найти как число:', refTelegramIdNum);
                    const result = await supabaseClient
                        .from('users')
                        .select('*')
                        .eq('telegram_id', refTelegramIdNum);
                    referrerData = result.data;
                    refError = result.error;
                }

                console.log('[AUTH] Результат поиска реферера:', referrerData, 'Ошибка:', refError);

                if (debugDiv) {
                    debugDiv.innerHTML += `<br>Результат поиска: ${JSON.stringify(referrerData)}`;
                }

                if (!refError && referrerData && referrerData.length > 0) {
                    referrerId = referrerData[0].id;
                    console.log('[AUTH] Найден реферер с ID:', referrerId);
                    if (debugDiv) {
                        debugDiv.innerHTML += `<br>✅ Реферер найден: ID=${referrerId}`;
                    }
                } else {
                    console.log('[AUTH] Реферер не найден. Data:', referrerData);
                    if (debugDiv) {
                        debugDiv.innerHTML += `<br>❌ Реферер НЕ найден в базе`;
                    }
                }
            }

            const { data: newUser, error: insertError } = await supabaseClient
                .from('users')
                .insert({
                    telegram_id: tgUser.id,
                    username: tgUser.username || null,
                    first_name: tgUser.first_name || 'User',
                    last_name: tgUser.last_name || null,
                    photo_url: tgUser.photo_url || null,  // Сохраняем аватарку
                    balance_ar: 50,  // Приветственный бонус
                    balance_coins: 0,
                    referrer_id: referrerId,  // Добавляем реферера
                    created_at: new Date().toISOString(),
                    last_seen_at: new Date().toISOString()
                })
                .select()
                .single();

            if (insertError) {
                console.error('[AUTH] Ошибка создания пользователя:', insertError);
                setLocalUser(tgUser);
                return;
            }

            window.currentUser = newUser;
            console.log('[AUTH] Новый пользователь создан успешно');

            // Начисляем бонусы рефереру если есть
            if (referrerId) {
                console.log('[AUTH] Начисляем L1 бонус рефереру:', referrerId);

                try {
                    // Получаем текущий баланс реферера
                    const { data: referrerData } = await supabaseClient
                        .from('users')
                        .select('balance_ar')
                        .eq('id', referrerId)
                        .single();

                    if (referrerData) {
                        // L1 бонус - 100 AR
                        const newBalance = (referrerData.balance_ar || 0) + 100;

                        await supabaseClient
                            .from('users')
                            .update({ balance_ar: newBalance })
                            .eq('id', referrerId);

                        console.log('[AUTH] Начислено 100 AR рефереру');

                        // Записываем транзакцию о бонусе
                        await supabaseClient
                            .from('transactions')
                            .insert({
                                user_id: referrerId,
                                type: 'referral_bonus',
                                amount: 100,
                                status: 'completed',
                                description: `Бонус за приглашение пользователя ${tgUser.first_name}`,
                                created_at: new Date().toISOString()
                            });

                        // Создаем связь в referral_relations
                        await supabaseClient
                            .from('referral_relations')
                            .insert({
                                user_id: newUser.id,
                                referrer_id: referrerId,
                                level: 1,
                                status: 'pending',
                                created_at: new Date().toISOString()
                            });

                        // Записываем транзакцию реферального бонуса
                        await supabaseClient
                            .from('transactions')
                            .insert({
                                user_id: referrerId,
                                type: 'referral_bonus',
                                amount: 100,
                                description: `L1 бонус за пользователя ${tgUser.first_name}`,
                                created_at: new Date().toISOString()
                            });
                    }
                } catch (refBonusError) {
                    console.error('[AUTH] Ошибка начисления реферального бонуса:', refBonusError);
                }
            }

            // Записываем транзакцию о бонусе
            try {
                await supabaseClient
                    .from('transactions')
                    .insert({
                        user_id: newUser.id,
                        type: 'bonus',
                        amount: 50,
                        description: 'Приветственный бонус',
                        created_at: new Date().toISOString()
                    });
            } catch (e) {
                console.log('[AUTH] Транзакция бонуса не записана:', e);
            }
        }

        updateUI();

    } catch (error) {
        console.error('[AUTH] Критическая ошибка:', error);
        setLocalUser(tgUser);
    }

    // УДАЛЯЕМ автоматическую проверку - она создает проблемы
    // Бонусы должны начисляться только при регистрации нового пользователя
}

// Установка локального пользователя без БД
function setLocalUser(tgUser) {
    window.currentUser = {
        telegram_id: tgUser.id,
        username: tgUser.username || '',
        first_name: tgUser.first_name || 'Пользователь',
        last_name: tgUser.last_name || '',
        balance_ar: 50,
        balance_coins: 0
    };

    updateUI();
}

// Тестовый режим для браузера
function setTestMode() {
    window.currentUser = {
        telegram_id: 12345,
        username: 'test_user',
        first_name: 'Гость',
        last_name: '',
        balance_ar: 0,
        balance_coins: 0
    };

    updateUI();
}

// Обновление интерфейса
function updateUI() {
    if (!window.currentUser) return;

    // Обновляем имя
    const nameElement = document.getElementById('user-name');
    if (nameElement) {
        const fullName = window.currentUser.first_name +
                        (window.currentUser.last_name ? ' ' + window.currentUser.last_name : '');
        nameElement.textContent = fullName;
    }

    // Обновляем баланс AR
    const balanceElement = document.getElementById('user-balance');
    if (balanceElement) {
        balanceElement.textContent = window.currentUser.balance_ar || 0;
    }

    console.log('[AUTH] Интерфейс обновлен');
}

// Функция обновления баланса
async function updateBalance(amount, type = 'update', description = '') {
    if (!window.currentUser) return false;

    const newBalance = (window.currentUser.balance_ar || 0) + amount;

    // Если есть Supabase - обновляем в БД
    if (typeof supabaseClient !== 'undefined' && window.currentUser.id) {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .update({ balance_ar: newBalance })
                .eq('id', window.currentUser.id)
                .select()
                .single();

            if (!error) {
                window.currentUser = data;

                // Записываем транзакцию
                await supabaseClient
                    .from('transactions')
                    .insert({
                        user_id: window.currentUser.id,
                        type: type,
                        amount: amount,
                        description: description,
                        created_at: new Date().toISOString()
                    });
            }
        } catch (e) {
            console.error('[AUTH] Ошибка обновления баланса:', e);
        }
    } else {
        // Локальное обновление
        window.currentUser.balance_ar = newBalance;
    }

    updateUI();
    return true;
}

// Экспортируем функции
window.updateBalance = updateBalance;
window.updateUI = updateUI;
window.initAuth = initAuth;

// Запуск инициализации
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    // DOM уже загружен
    initAuth();
}

// Резервная инициализация через 500мс
setTimeout(() => {
    if (!window.currentUser) {
        console.log('[AUTH] Повторная попытка инициализации');
        initAuth();
    }
}, 500);

console.log('[AUTH] Модуль авторизации загружен');