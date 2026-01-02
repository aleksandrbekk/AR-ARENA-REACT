// js/boosts.js - Логика бустеров

// === КОНФИГУРАЦИЯ БУСТЕРОВ ===
const BOOSTS = {
    // ЭНЕРГИЯ
    energy_50: {
        id: 'energy_50',
        type: 'energy',
        name: 'Энергетик',
        description: '+50 энергии мгновенно',
        effect: { type: 'instant_energy', value: 50 },
        price_bul: 500,
        price_ar: 50
    },
    energy_100: {
        id: 'energy_100',
        type: 'energy',
        name: 'Полный бак',
        description: 'Полное восстановление энергии',
        effect: { type: 'instant_energy', value: 100 },
        price_bul: 1000,
        price_ar: 100
    },
    energy_unlimited: {
        id: 'energy_unlimited',
        type: 'energy',
        name: 'Безлимит',
        description: 'Энергия не тратится 1 час',
        effect: { type: 'unlimited_energy', duration: 3600 },
        price_bul: 2000,
        price_ar: 200
    },

    // МНОЖИТЕЛИ
    mult_x2: {
        id: 'mult_x2',
        type: 'multiplier',
        name: 'x2 награды',
        description: 'Двойные награды за тапы (1 час)',
        effect: { type: 'reward_multiplier', multiplier: 2, duration: 3600 },
        price_bul: 1500,
        price_ar: 150
    },
    mult_x3: {
        id: 'mult_x3',
        type: 'multiplier',
        name: 'x3 награды',
        description: 'Тройные награды за тапы (1 час)',
        effect: { type: 'reward_multiplier', multiplier: 3, duration: 3600 },
        price_bul: 3000,
        price_ar: 300
    },

    // XP
    xp_500: {
        id: 'xp_500',
        type: 'xp',
        name: '+500 XP',
        description: 'Мгновенно +500 опыта',
        effect: { type: 'instant_xp', value: 500 },
        price_bul: 1000,
        price_ar: 100
    },
    xp_x2: {
        id: 'xp_x2',
        type: 'xp',
        name: 'x2 опыт',
        description: 'Двойной XP за тапы (1 час)',
        effect: { type: 'xp_multiplier', multiplier: 2, duration: 3600 },
        price_bul: 2000,
        price_ar: 200
    },

    // АВТОТАП
    auto_tap_10: {
        id: 'auto_tap_10',
        type: 'automation',
        name: 'Турбо x1',
        description: '10 тапов в секунду (30 сек)',
        effect: { type: 'auto_tap', taps_per_second: 10, duration: 30 },
        price_bul: 1000,
        price_ar: 100
    },
    auto_tap_20: {
        id: 'auto_tap_20',
        type: 'automation',
        name: 'Турбо x2',
        description: '20 тапов в секунду (30 сек)',
        effect: { type: 'auto_tap', taps_per_second: 20, duration: 30 },
        price_bul: 2500,
        price_ar: 250
    },

    // БЫСТРАЯ РЕГЕНЕРАЦИЯ
    energy_regen_x2: {
        id: 'energy_regen_x2',
        type: 'energy',
        name: 'Быстрая регенерация x2',
        description: '+1 энергия каждые 90 секунд (1 час)',
        effect: { type: 'energy_regen_multiplier', multiplier: 2, duration: 3600 },
        price_bul: 1500,
        price_ar: 150
    },
    energy_regen_x3: {
        id: 'energy_regen_x3',
        type: 'energy',
        name: 'Быстрая регенерация x3',
        description: '+1 энергия каждые 60 секунд (1 час)',
        effect: { type: 'energy_regen_multiplier', multiplier: 3, duration: 3600 },
        price_bul: 3000,
        price_ar: 300
    }
};

// === КОМБО ПРЕДЛОЖЕНИЯ ===
const COMBO_OFFERS = {
    starter_pack: {
        id: 'starter_pack',
        name: 'Стартовый набор',
        description: 'Энергетик + x2 награды + 500 XP',
        boosts: ['energy_50', 'mult_x2', 'xp_500'],
        original_price_bul: 4000, // 500 + 1500 + 1000
        combo_price_bul: 3200,    // Скидка 20%
        original_price_ar: 400,
        combo_price_ar: 320
    },
    power_pack: {
        id: 'power_pack',
        name: 'Силовой набор',
        description: 'Безлимит энергии + x3 награды + Турбо x1',
        boosts: ['energy_unlimited', 'mult_x3', 'auto_tap_10'],
        original_price_bul: 6000, // 2000 + 3000 + 1000
        combo_price_bul: 4800,    // Скидка 20%
        original_price_ar: 600,
        combo_price_ar: 480
    },
    ultimate_pack: {
        id: 'ultimate_pack',
        name: 'Максимальный набор',
        description: 'Безлимит + x3 награды + x2 XP + Турбо x2 + Быстрая регенерация x3',
        boosts: ['energy_unlimited', 'mult_x3', 'xp_x2', 'auto_tap_20', 'energy_regen_x3'],
        original_price_bul: 12500, // 2000 + 3000 + 2000 + 2500 + 3000
        combo_price_bul: 10000,    // Скидка 20%
        original_price_ar: 1250,
        combo_price_ar: 1000
    }
};

// === ДОСТИЖЕНИЯ (ACHIEVEMENTS) ===
const ACHIEVEMENTS = {
    first_boost: {
        id: 'first_boost',
        name: 'Первый буст',
        description: 'Купи свой первый бустер',
        reward_ar: 100,
        condition: (stats) => stats.total_purchases >= 1
    },
    boost_collector: {
        id: 'boost_collector',
        name: 'Коллекционер',
        description: 'Купи 10 бустеров',
        reward_ar: 500,
        condition: (stats) => stats.total_purchases >= 10
    },
    boost_master: {
        id: 'boost_master',
        name: 'Мастер бустов',
        description: 'Купи 50 бустеров',
        reward_ar: 2000,
        condition: (stats) => stats.total_purchases >= 50
    },
    energy_lover: {
        id: 'energy_lover',
        name: 'Энергетик',
        description: 'Купи 5 бустеров энергии',
        reward_ar: 300,
        condition: (stats) => stats.energy_boosts >= 5
    },
    multiplier_fan: {
        id: 'multiplier_fan',
        name: 'Множитель',
        description: 'Купи 5 бустеров множителей',
        reward_ar: 300,
        condition: (stats) => stats.multiplier_boosts >= 5
    },
    big_spender: {
        id: 'big_spender',
        name: 'Крупный покупатель',
        description: 'Потрать 10000 BUL на бустеры',
        reward_ar: 1000,
        condition: (stats) => stats.total_bul_spent >= 10000
    }
};

// === СОСТОЯНИЕ ===
let userState = null;
const MAX_ENERGY = 100;

// === DOM ЭЛЕМЕНТЫ ===
const dom = {
    bulBalance: document.getElementById('bulBalance'),
    arBalance: document.getElementById('arBalance'),
    activeBoostsPanel: document.getElementById('activeBoostsPanel'),
    activeBoostsList: document.getElementById('activeBoostsList'),
    purchaseHistoryPanel: document.getElementById('purchaseHistoryPanel'),
    historyContent: document.getElementById('historyContent'),
    historyList: document.getElementById('historyList'),
    historyToggle: document.getElementById('historyToggle')
};

// === УТИЛИТЫ ===
function formatNumber(num) {
    return Math.floor(num).toLocaleString('ru-RU');
}

function saveToLocalStorage() {
    localStorage.setItem('bull_user_state', JSON.stringify(userState));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('bull_user_state');
    if (saved) {
        userState = JSON.parse(saved);
    } else {
        // Создаем дефолтное состояние
        userState = {
            telegram_id: 'mock',
            energy: 100,
            bul_balance: 0,
            balance_ar: 0,
            level: 1,
            xp: 0,
            xp_to_next: 1000,
            active_boosts: [],
            last_energy_update: new Date().toISOString()
        };
    }

    // Инициализация purchase_history если нет
    if (!userState.purchase_history) {
        userState.purchase_history = [];
    }

    // Инициализация achievements
    if (!userState.achievements) {
        userState.achievements = {
            unlocked: [], // ID разблокированных ачивок
            claimed: []   // ID полученных наград
        };
    }

    // Инициализация статистики для ачивок
    if (!userState.boost_stats) {
        userState.boost_stats = {
            total_purchases: 0,
            energy_boosts: 0,
            multiplier_boosts: 0,
            xp_boosts: 0,
            automation_boosts: 0,
            total_bul_spent: 0,
            total_ar_spent: 0
        };
    }
}

// === ПОКАЗ НОТИФИКАЦИИ ===
function showNotification(message, type = 'success') {
    // Вибрация
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
    }

    // Создаем нотификацию
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: calc(env(safe-area-inset-top) + 20px);
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? 'linear-gradient(135deg, #11998E, #38EF7D)' : 'linear-gradient(135deg, #FF416C, #FF4B2B)'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        animation: slideDown 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// === ПРИМЕНЕНИЕ БУСТА ===
async function applyBoostEffect(boost) {
    const effect = boost.effect;

    if (effect.type === 'instant_energy') {
        // Мгновенное восстановление энергии
        const oldEnergy = userState.energy;
        userState.energy = Math.min(MAX_ENERGY, userState.energy + effect.value);
        const added = userState.energy - oldEnergy;
        showNotification(`+${added} энергии!`, 'success');
    }

    if (effect.type === 'unlimited_energy') {
        // Безлимитная энергия
        const expiresAt = new Date(Date.now() + effect.duration * 1000).toISOString();
        userState.active_boosts = userState.active_boosts || [];
        userState.active_boosts.push({
            type: 'unlimited_energy',
            name: boost.name,
            expires_at: expiresAt
        });
        showNotification('Безлимитная энергия активирована!', 'success');
    }

    if (effect.type === 'reward_multiplier') {
        // Множитель наград
        const expiresAt = new Date(Date.now() + effect.duration * 1000).toISOString();
        userState.active_boosts = userState.active_boosts || [];
        userState.active_boosts.push({
            type: 'reward_multiplier',
            name: boost.name,
            multiplier: effect.multiplier,
            expires_at: expiresAt
        });
        showNotification(`x${effect.multiplier} награды активировано!`, 'success');
    }

    if (effect.type === 'instant_xp') {
        // Мгновенный XP
        userState.xp += effect.value;

        // Проверка level up
        while (userState.xp >= userState.xp_to_next) {
            userState.level++;
            userState.xp -= userState.xp_to_next;
            userState.xp_to_next = Math.floor(userState.xp_to_next * 1.5);
            showNotification(`Level Up! Уровень ${userState.level}!`, 'success');
        }

        showNotification(`+${effect.value} XP!`, 'success');
    }

    if (effect.type === 'xp_multiplier') {
        // Множитель XP
        const expiresAt = new Date(Date.now() + effect.duration * 1000).toISOString();
        userState.active_boosts = userState.active_boosts || [];
        userState.active_boosts.push({
            type: 'xp_multiplier',
            name: boost.name,
            multiplier: effect.multiplier,
            expires_at: expiresAt
        });
        showNotification(`x${effect.multiplier} опыт активирован!`, 'success');
    }

    if (effect.type === 'auto_tap') {
        // Автоматические тапы
        const expiresAt = new Date(Date.now() + effect.duration * 1000).toISOString();
        userState.active_boosts = userState.active_boosts || [];
        userState.active_boosts.push({
            type: 'auto_tap',
            name: boost.name,
            taps_per_second: effect.taps_per_second,
            expires_at: expiresAt
        });
        showNotification(`Турбо-режим активирован! ${effect.taps_per_second} tps`, 'success');

        // Запускаем автотап
        startAutoTap(effect.taps_per_second, effect.duration);
    }

    if (effect.type === 'energy_regen_multiplier') {
        // Ускоренная регенерация энергии
        const expiresAt = new Date(Date.now() + effect.duration * 1000).toISOString();
        userState.active_boosts = userState.active_boosts || [];
        userState.active_boosts.push({
            type: 'energy_regen_multiplier',
            name: boost.name,
            multiplier: effect.multiplier,
            expires_at: expiresAt
        });
        const regenTime = Math.floor(180 / effect.multiplier);
        showNotification(`Быстрая регенерация! +1 энергия/${regenTime}с`, 'success');
    }

    saveToLocalStorage();
    updateUI();
}

// === ПОКУПКА БУСТА ===
async function buyBoost(boostId, paymentMethod) {
    const boost = BOOSTS[boostId];
    if (!boost) {
        console.error('Буст не найден:', boostId);
        return;
    }

    // Проверка баланса
    const price = paymentMethod === 'bul' ? boost.price_bul : boost.price_ar;
    const balance = paymentMethod === 'bul' ? userState.bul_balance : userState.balance_ar;
    const currency = paymentMethod === 'bul' ? 'BUL' : 'AR';

    if (balance < price) {
        showNotification(`Недостаточно ${currency}! Нужно ${price}`, 'error');
        return;
    }

    // Подтверждение покупки
    const tg = window.Telegram?.WebApp;
    if (tg?.showConfirm) {
        const confirmed = await new Promise(resolve => {
            tg.showConfirm(
                `Купить "${boost.name}" за ${price} ${currency}?`,
                resolve
            );
        });
        if (!confirmed) return;
    } else {
        if (!confirm(`Купить "${boost.name}" за ${price} ${currency}?`)) {
            return;
        }
    }

    // Списание
    if (paymentMethod === 'bul') {
        userState.bul_balance -= price;
    } else {
        userState.balance_ar -= price;
        // TODO: Списание AR через Supabase
        // await supabase.rpc('deduct_balance', { telegram_id, amount: price });
    }

    // Добавление в историю покупок
    addPurchaseToHistory(boost, paymentMethod, price);

    // Применение эффекта
    await applyBoostEffect(boost);

    // Обновление UI
    updateUI();
}

// === ПОКУПКА КОМБО ===
async function buyCombo(comboId, paymentMethod) {
    const combo = COMBO_OFFERS[comboId];
    if (!combo) {
        console.error('Комбо не найдено:', comboId);
        return;
    }

    // Проверка баланса
    const price = paymentMethod === 'bul' ? combo.combo_price_bul : combo.combo_price_ar;
    const balance = paymentMethod === 'bul' ? userState.bul_balance : userState.balance_ar;
    const currency = paymentMethod === 'bul' ? 'BUL' : 'AR';

    if (balance < price) {
        showNotification(`Недостаточно ${currency}! Нужно ${price}`, 'error');
        return;
    }

    // Подтверждение покупки
    const tg = window.Telegram?.WebApp;
    const discount = Math.round((1 - price / (paymentMethod === 'bul' ? combo.original_price_bul : combo.original_price_ar)) * 100);
    if (tg?.showConfirm) {
        const confirmed = await new Promise(resolve => {
            tg.showConfirm(
                `Купить "${combo.name}" за ${price} ${currency}? (скидка ${discount}%)`,
                resolve
            );
        });
        if (!confirmed) return;
    } else {
        if (!confirm(`Купить "${combo.name}" за ${price} ${currency}? (скидка ${discount}%)`)) {
            return;
        }
    }

    // Списание
    if (paymentMethod === 'bul') {
        userState.bul_balance -= price;
    } else {
        userState.balance_ar -= price;
    }

    // Применение всех бустов из комбо
    for (const boostId of combo.boosts) {
        const boost = BOOSTS[boostId];
        if (boost) {
            await applyBoostEffect(boost);
            // Добавляем в историю каждый буст
            addPurchaseToHistory(boost, paymentMethod, 0); // Цена 0 т.к. оплачено комбо
        }
    }

    showNotification(`Комбо "${combo.name}" активировано!`, 'success');

    // Обновление UI
    updateUI();
}

// === ОБНОВЛЕНИЕ АКТИВНЫХ БУСТОВ ===
function updateActiveBoosts() {
    if (!userState.active_boosts || userState.active_boosts.length === 0) {
        dom.activeBoostsPanel.style.display = 'none';
        return;
    }

    // Фильтруем истекшие
    const now = new Date();
    userState.active_boosts = userState.active_boosts.filter(boost => {
        return new Date(boost.expires_at) > now;
    });

    if (userState.active_boosts.length === 0) {
        dom.activeBoostsPanel.style.display = 'none';
        saveToLocalStorage();
        return;
    }

    // Показываем
    dom.activeBoostsPanel.style.display = 'block';
    dom.activeBoostsList.innerHTML = '';

    userState.active_boosts.forEach(boost => {
        const timeLeft = Math.floor((new Date(boost.expires_at) - now) / 1000);
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;

        const item = document.createElement('div');
        item.className = 'active-boost-item';
        item.innerHTML = `
            <div class="active-boost-name">${boost.name}</div>
            <div class="active-boost-timer">${minutes}:${seconds.toString().padStart(2, '0')}</div>
        `;
        dom.activeBoostsList.appendChild(item);
    });
}

// === АВТОТАП ===
function startAutoTap(tapsPerSecond, durationSeconds) {
    let elapsed = 0;
    const interval = 1000 / tapsPerSecond; // Интервал между тапами

    const autoTapTimer = setInterval(() => {
        elapsed += interval;

        // Симулируем тап (вызываем функцию из bull.js если доступна)
        if (window.simulateTap) {
            window.simulateTap();
        }

        // Остановка по истечении времени
        if (elapsed >= durationSeconds * 1000) {
            clearInterval(autoTapTimer);
            showNotification('Турбо-режим завершен!', 'success');
        }
    }, interval);
}

// === ИСТОРИЯ ПОКУПОК ===
function addPurchaseToHistory(boost, paymentMethod, price) {
    if (!userState.purchase_history) {
        userState.purchase_history = [];
    }

    userState.purchase_history.unshift({
        boost_name: boost.name,
        boost_id: boost.id,
        payment_method: paymentMethod,
        price: price,
        timestamp: new Date().toISOString()
    });

    // Ограничиваем историю до 50 записей
    if (userState.purchase_history.length > 50) {
        userState.purchase_history = userState.purchase_history.slice(0, 50);
    }

    // Обновление статистики для ачивок
    updateBoostStats(boost, paymentMethod, price);

    // Проверка достижений
    checkAchievements();

    saveToLocalStorage();
    updatePurchaseHistory();
}

function updateBoostStats(boost, paymentMethod, price) {
    const stats = userState.boost_stats;

    stats.total_purchases++;

    if (paymentMethod === 'bul') {
        stats.total_bul_spent += price;
    } else {
        stats.total_ar_spent += price;
    }

    // Категории бустов
    if (boost.type === 'energy') {
        stats.energy_boosts++;
    } else if (boost.type === 'multiplier') {
        stats.multiplier_boosts++;
    } else if (boost.type === 'xp') {
        stats.xp_boosts++;
    } else if (boost.type === 'automation') {
        stats.automation_boosts++;
    }
}

function checkAchievements() {
    const stats = userState.boost_stats;
    const unlocked = userState.achievements.unlocked;

    Object.values(ACHIEVEMENTS).forEach(achievement => {
        // Если уже разблокировано, пропускаем
        if (unlocked.includes(achievement.id)) return;

        // Проверяем условие
        if (achievement.condition(stats)) {
            unlocked.push(achievement.id);
            showAchievementUnlocked(achievement);
        }
    });

    saveToLocalStorage();
}

function showAchievementUnlocked(achievement) {
    showNotification(`Достижение разблокировано: ${achievement.name}!`, 'success');

    // Haptic feedback
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
}

function updatePurchaseHistory() {
    if (!dom.purchaseHistoryPanel) return;

    const history = userState.purchase_history || [];

    if (history.length === 0) {
        dom.purchaseHistoryPanel.style.display = 'none';
        return;
    }

    dom.purchaseHistoryPanel.style.display = 'block';
    dom.historyList.innerHTML = '';

    history.forEach(item => {
        const date = new Date(item.timestamp);
        const timeAgo = getTimeAgo(date);

        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-item-info">
                <div class="history-item-name">${item.boost_name}</div>
                <div class="history-item-time">${timeAgo}</div>
            </div>
            <div class="history-item-price">
                -${item.price} ${item.payment_method.toUpperCase()}
            </div>
        `;
        dom.historyList.appendChild(historyItem);
    });
}

function getTimeAgo(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // в секундах

    if (diff < 60) return 'Только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} д назад`;

    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function toggleHistory() {
    const content = dom.historyContent;
    const toggle = dom.historyToggle;

    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.classList.add('open');
    } else {
        content.style.display = 'none';
        toggle.classList.remove('open');
    }
}

// === ОБНОВЛЕНИЕ UI ===
function updateUI() {
    if (!userState) return;

    // Получаем реального пользователя из auth.js
    const realUser = window.currentUser;

    // Балансы
    const bulBalanceEl = document.getElementById('bulBalance');
    const arBalanceEl = document.getElementById('arBalance');

    if (bulBalanceEl) {
        bulBalanceEl.textContent = formatNumber(userState.bul_balance || 0);
    }
    if (arBalanceEl) {
        arBalanceEl.textContent = formatNumber(realUser?.balance_ar || userState.balance_ar || 0);
    }

    // Активные бусты
    updateActiveBoosts();

    // История покупок
    updatePurchaseHistory();
}

// === ИНИЦИАЛИЗАЦИЯ ===
async function init() {
    console.log('Boosts: Инициализация...');

    // Загрузка состояния
    loadFromLocalStorage();

    // Интеграция с auth.js
    if (window.getCurrentUser) {
        try {
            const realUser = await window.getCurrentUser();
            if (realUser) {
                console.log('✅ [Boosts] Real user loaded:', realUser.username);
                userState.telegram_id = realUser.telegram_id;
                userState.balance_ar = realUser.balance_ar || 0;
            }
        } catch (e) {
            console.warn('⚠️ [Boosts] Auth load warning:', e);
        }
    }

    // Telegram WebApp
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
        tg.expand();

        // BackButton
        if (tg.BackButton) {
            tg.BackButton.show();
            tg.BackButton.onClick(() => {
                window.location.href = 'index.html';
            });
        }
    }

    updateUI();

    // Таймер обновления активных бустов
    setInterval(updateActiveBoosts, 1000);

    console.log('Boosts: Инициализация завершена');
}

// Глобальные функции (вызываются из HTML)
window.buyBoost = buyBoost;
window.buyCombo = buyCombo;
window.toggleHistory = toggleHistory;

// Запуск
document.addEventListener('DOMContentLoaded', init);
