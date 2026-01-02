// AR ARENA - Система авторизации пользователей
// 🔥 ВЕРСИЯ AUTH.JS: v1759200000 - SIMPLIFIED FRONTEND-ONLY (2025-09-30)
// 🚀 Backend-first architecture: Вся логика регистрации и бонусов в bot.py
console.log('🚀 AUTH.JS ЗАГРУЖЕН - SIMPLIFIED VERSION v1759200000');
console.log('📌 Регистрация и бонусы обрабатываются в bot.py (backend)');

// ======================
// СИСТЕМА ЛОГОВ В LOCALSTORAGE
// ======================

function saveLogToStorage(level, message) {
    try {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level,
            message: String(message),
            type: message.includes('[AUTH]') ? 'auth' :
                  message.includes('REFERRAL') || message.includes('[REFERRAL]') ? 'referral' :
                  level === 'error' ? 'error' : 'general',
            page: window.location.pathname,
            id: Date.now() + Math.random()
        };

        let logs = [];
        try {
            const existing = localStorage.getItem('ar_arena_logs');
            if (existing) logs = JSON.parse(existing);
        } catch (e) {
            console.warn('Ошибка чтения логов из localStorage:', e);
        }

        logs.push(logEntry);

        if (logs.length > 200) {
            logs = logs.slice(-200);
        }

        localStorage.setItem('ar_arena_logs', JSON.stringify(logs));
    } catch (error) {
        console.warn('Ошибка сохранения лога в localStorage:', error);
    }
}

// Перехватываем оригинальные методы console
const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
};

console.log = function(...args) {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    saveLogToStorage('log', message);
    originalConsole.log.apply(console, args);
};

console.error = function(...args) {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    saveLogToStorage('error', message);
    originalConsole.error.apply(console, args);
};

console.warn = function(...args) {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    saveLogToStorage('warn', message);
    originalConsole.warn.apply(console, args);
};

console.info = function(...args) {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    saveLogToStorage('info', message);
    originalConsole.info.apply(console, args);
};

console.log('🔧 [AUTH] Система логов в localStorage инициализирована');
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
            balance_ar: 100,
            balance_coins: 0
        };

        updateUI();
        return;
    }

    try {
        console.log('[AUTH] Проверка пользователя в базе данных...');

        // Ищем существующего пользователя
        const { data: userData, error: selectError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('telegram_id', tgUser.id);

        if (selectError) {
            console.error('[AUTH] Ошибка запроса к БД:', selectError);
            showError('Ошибка подключения к базе данных');
            return;
        }

        // Получаем первого пользователя из массива
        const existingUser = userData && userData.length > 0 ? userData[0] : null;

        if (!existingUser) {
            // Пользователь не найден - показываем сообщение
            console.log('[AUTH] Пользователь не найден в БД');
            showBotRedirect();
            return;
        }

        // Проверяем, не заблокирован ли пользователь
        if (existingUser.is_blocked) {
            console.log('[AUTH] Пользователь заблокирован!');
            showBlockedScreen();
            return;
        }

        // Пользователь существует и не заблокирован - обновляем last_seen_at
        console.log('[AUTH] Пользователь найден, обновляем last_seen...');

        const updateData = {
            last_seen_at: new Date().toISOString(),
            username: tgUser.username || existingUser.username,
            first_name: tgUser.first_name || existingUser.first_name,
            last_name: tgUser.last_name || existingUser.last_name,
            photo_url: tgUser.photo_url || existingUser.photo_url
        };

        const { data: updatedUser, error: updateError } = await supabaseClient
            .from('users')
            .update(updateData)
            .eq('id', existingUser.id)
            .select()
            .single();

        if (updateError) {
            console.error('[AUTH] Ошибка обновления пользователя:', updateError);
            window.currentUser = existingUser;
        } else {
            console.log('[AUTH] Пользователь успешно обновлен');
            window.currentUser = updatedUser;
        }

        updateUI();

    } catch (error) {
        console.error('[AUTH] Критическая ошибка:', error);
        showError('Произошла ошибка при авторизации');
    }
}

// Показать сообщение о необходимости открыть бота
function showBotRedirect() {
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
            <div style="font-size: 64px; margin-bottom: 20px;">🎮</div>
            <h1 style="color: #FFD700; margin-bottom: 20px; font-size: 24px;">
                Добро пожаловать в AR ARENA!
            </h1>
            <p style="color: rgba(255, 255, 255, 0.7); max-width: 300px; margin-bottom: 30px; line-height: 1.5;">
                Для начала работы откройте бота<br>
                <strong style="color: #FFD700;">@ARARENA_BOT</strong><br>
                и нажмите кнопку START
            </p>
            <button style="
                padding: 15px 40px;
                background: linear-gradient(135deg, #FFD700, #FFA500);
                border: none;
                border-radius: 12px;
                color: #000;
                font-weight: bold;
                font-size: 16px;
                cursor: pointer;
                box-shadow: 0 5px 15px rgba(255, 215, 0, 0.3);
            " onclick="window.open('https://t.me/ARARENA_BOT', '_blank')">
                Открыть бота
            </button>
        </div>
    `;
}

// Показать экран блокировки
function showBlockedScreen() {
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
}

// Показать ошибку
function showError(message) {
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
            <h1 style="color: #ff6464; margin-bottom: 20px;">Ошибка</h1>
            <p style="color: rgba(255, 255, 255, 0.7); max-width: 300px;">
                ${message}
            </p>
            <button style="
                margin-top: 30px;
                padding: 12px 30px;
                background: rgba(255, 100, 100, 0.2);
                border: 1px solid rgba(255, 100, 100, 0.4);
                border-radius: 10px;
                color: white;
                cursor: pointer;
            " onclick="location.reload()">Попробовать снова</button>
        </div>
    `;
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

// Функция обновления баланса (для покупок и заданий)
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

// Функция получения текущего пользователя
async function getCurrentUser() {
    console.log('[AUTH] getCurrentUser called, currentUser =', window.currentUser ? window.currentUser.telegram_id : 'null');

    // Если пользователь уже загружен, возвращаем его
    if (window.currentUser) {
        return window.currentUser;
    }

    // Если пользователь еще не загружен, ждем инициализации
    console.log('[AUTH] Waiting for auth initialization...');
    let attempts = 0;
    while (!window.currentUser && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    if (!window.currentUser) {
        console.error('[AUTH] Failed to get user after waiting');
        return null;
    }

    return window.currentUser;
}

// Экспортируем функции
window.updateBalance = updateBalance;
window.updateUI = updateUI;
window.initAuth = initAuth;
window.getCurrentUser = getCurrentUser;

// Запуск инициализации
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}

// Резервная инициализация через 500мс
setTimeout(() => {
    if (!window.currentUser) {
        console.log('[AUTH] Повторная попытка инициализации');
        initAuth();
    }
}, 500);

console.log('[AUTH] Модуль авторизации загружен (simplified version)');