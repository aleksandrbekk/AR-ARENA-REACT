// js/bull.js

// === DEBUG MODE ===
// Set to false for production to disable all console logs
const DEBUG = false;
const debugLog = (...args) => DEBUG && console.log('[Bull]', ...args);
const debugError = (...args) => DEBUG && console.error('[Bull ERROR]', ...args);
const debugWarn = (...args) => DEBUG && console.warn('[Bull WARN]', ...args);

// === МОК-ДАННЫЕ ПОЛЬЗОВАТЕЛЯ (фолбек) ===
const DEFAULT_USER = {
    telegram_id: 'mock_user_123',
    username: 'Player',
    energy: 100,
    bul_balance: 0,
    balance_ar: 0,
    level: 1,
    xp: 0,
    xp_to_next: 1000,
    active_boost: { multiplier: 1, expires_at: null },
    last_energy_update: new Date().toISOString()
};

// Загрузка состояния из localStorage или использование дефолтного
let savedUser = localStorage.getItem('bull_user_state');
let user = savedUser ? JSON.parse(savedUser) : JSON.parse(JSON.stringify(DEFAULT_USER));

// --- КОНСТАНТЫ И НАСТРОЙКИ ---
const ENERGY_REGEN_RATE_MINUTES = 3; // 1 энергия за 3 минуты
const MAX_ENERGY = 100;
const BULL_TAP_COST = 1; // Стоимость 1 тапа в энергии
const BASE_XP_PER_TAP = 1;

let energyIntervalId = null;
let noEnergyBannerTimeoutId = null;

// --- DOM ЭЛЕМЕНТЫ ---
const dom = {};

function cacheDomElements() {
    dom.userName = document.getElementById('userName');
    dom.userAvatar = document.getElementById('userAvatar');
    dom.headerArBalance = document.getElementById('headerArBalance');
    dom.mainBulBalance = document.getElementById('mainBulBalance');
    dom.bullTapArea = document.getElementById('bullTapArea');
    dom.bullImage = document.getElementById('bullImage');
    dom.clickEffectsLayer = document.getElementById('clickEffectsLayer');
    dom.energyCurrent = document.getElementById('energyCurrent');
    dom.energyMax = document.getElementById('energyMax');
    dom.levelCurrent = document.getElementById('levelCurrent');
    dom.xpProgressBar = document.getElementById('xpProgressBar');
    dom.tapRewardTemplate = document.getElementById('tapRewardTemplate');
    dom.energyGroup = document.querySelector('.energy-group');
}

// --- УТИЛИТЫ ---
function formatNumber(num) {
    return Math.floor(num).toLocaleString('ru-RU');
}

function saveUserState() {
    // Сохраняем только игровые данные, баланс AR не сохраняем в стейт быка, он в auth
    localStorage.setItem('bull_user_state', JSON.stringify(user));
    localStorage.setItem('bull_level', user.level.toString()); // Для skins.html
}

// --- ЛОГИКА ИГРЫ ---

function getRewardByLevel(level) {
    if (level < 5) return 1;
    if (level < 10) return 2;
    if (level < 20) return 5;
    if (level < 50) return 10;
    return 20;
}

function checkLevelUp() {
    if (user.xp >= user.xp_to_next) {
        user.level++;
        user.xp -= user.xp_to_next;
        user.xp_to_next = Math.floor(user.xp_to_next * 1.5);
        debugLog(`Level Up! New level: ${user.level}`);
        saveUserState();
    }
}

function showRewardAnimation(amount, clientX, clientY) {
    if (!dom.tapRewardTemplate) return;

    const rewardText = dom.tapRewardTemplate.content.cloneNode(true).firstElementChild;
    rewardText.textContent = `+${formatNumber(amount)}`;

    const layerRect = dom.clickEffectsLayer.getBoundingClientRect();
    const x = clientX - layerRect.left;
    const y = clientY - layerRect.top;

    rewardText.style.left = `${x}px`;
    rewardText.style.top = `${y}px`;
    rewardText.style.position = 'absolute';

    dom.clickEffectsLayer.appendChild(rewardText);

    rewardText.addEventListener('animationend', () => {
        rewardText.remove();
    });
}

function showNoEnergyBanner() {
    if (noEnergyBannerTimeoutId) clearTimeout(noEnergyBannerTimeoutId);

    let banner = document.getElementById('noEnergyBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'noEnergyBanner';
        banner.className = 'no-energy-banner';
        document.body.appendChild(banner);
    }
    banner.textContent = 'Нет энергии!';
    banner.classList.add('show');

    if (dom.energyGroup) dom.energyGroup.classList.add('shake');

    noEnergyBannerTimeoutId = setTimeout(() => {
        banner.classList.remove('show');
        if (dom.energyGroup) dom.energyGroup.classList.remove('shake');
    }, 2000);
}

// === УТИЛИТЫ БУСТОВ ===
function getActiveBoosts() {
    if (!user.active_boosts) user.active_boosts = [];

    // Фильтруем истекшие бусты
    const now = new Date();
    user.active_boosts = user.active_boosts.filter(boost => {
        return new Date(boost.expires_at) > now;
    });

    return user.active_boosts;
}

function getActiveBoostMultiplier() {
    const activeBoosts = getActiveBoosts();
    const rewardBoost = activeBoosts.find(b => b.type === 'reward_multiplier');
    return rewardBoost?.multiplier || 1;
}

function getActiveXpMultiplier() {
    const activeBoosts = getActiveBoosts();
    const xpBoost = activeBoosts.find(b => b.type === 'xp_multiplier');
    return xpBoost?.multiplier || 1;
}

function hasUnlimitedEnergy() {
    const activeBoosts = getActiveBoosts();
    return activeBoosts.some(b => b.type === 'unlimited_energy');
}

async function handleBullTap(event) {
    // Проверка энергии (учитываем unlimited energy)
    const unlimitedEnergy = hasUnlimitedEnergy();

    if (!unlimitedEnergy && user.energy <= 0) {
        showNoEnergyBanner();
        return;
    }

    // Анимация быка
    dom.bullImage.classList.add('tapped');
    setTimeout(() => {
        dom.bullImage.classList.remove('tapped');
    }, 150);

    // Вибрация
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }

    // Расчет наград с учетом бустов
    const baseReward = getRewardByLevel(user.level);
    const rewardMultiplier = getActiveBoostMultiplier();
    const finalReward = baseReward * rewardMultiplier;

    const baseXp = BASE_XP_PER_TAP;
    const xpMultiplier = getActiveXpMultiplier();
    const finalXp = baseXp * xpMultiplier;

    // Энергия тратится только если нет unlimited energy
    if (!unlimitedEnergy) {
        user.energy = Math.max(0, user.energy - BULL_TAP_COST);
    }

    user.bul_balance += finalReward;
    user.xp += finalXp;

    checkLevelUp();
    saveUserState();
    updateUI();

    // Для тапа используем координаты события или центр, если их нет (на всякий случай)
    const x = event.clientX || (dom.bullTapArea.getBoundingClientRect().left + dom.bullTapArea.offsetWidth / 2);
    const y = event.clientY || (dom.bullTapArea.getBoundingClientRect().top + dom.bullTapArea.offsetHeight / 2);

    showRewardAnimation(finalReward, x, y);
}

function startEnergyTimer() {
    if (energyIntervalId) clearInterval(energyIntervalId);

    const restoreEnergy = () => {
        const now = new Date();
        const lastUpdate = new Date(user.last_energy_update);
        const minutesPassed = Math.floor((now - lastUpdate) / (1000 * 60));

        if (minutesPassed >= 1 && user.energy < MAX_ENERGY) {
             if (minutesPassed >= ENERGY_REGEN_RATE_MINUTES) {
                 const energyToRestore = Math.floor(minutesPassed / ENERGY_REGEN_RATE_MINUTES);
                 if (energyToRestore > 0) {
                     user.energy = Math.min(MAX_ENERGY, user.energy + energyToRestore);
                     user.last_energy_update = now.toISOString();
                     saveUserState();
                     updateUI();
                 }
             }
        }
    };

    restoreEnergy();
    // Проверяем каждую минуту
    energyIntervalId = setInterval(restoreEnergy, 60 * 1000);
}

function updateUI() {
    // Имя и баланс берем приоритетно из window.currentUser (auth.js)
    const realUser = window.currentUser;
    const tg = window.Telegram?.WebApp;

    // Обновляем имя пользователя
    if (dom.userName) {
        let displayName = 'Player';
        if (tg?.initDataUnsafe?.user) {
            const tgUser = tg.initDataUnsafe.user;
            displayName = tgUser.first_name || tgUser.username || displayName;
        } else if (realUser) {
            displayName = realUser.first_name || realUser.username || displayName;
        }
        dom.userName.textContent = displayName;
    }

    // Баланс AR из реального пользователя
    if (dom.headerArBalance) {
        dom.headerArBalance.textContent = formatNumber(realUser?.balance_ar || user.balance_ar || 0);
    }

    // Игровые данные - из локального стейта
    if (dom.mainBulBalance) dom.mainBulBalance.textContent = formatNumber(user.bul_balance);
    if (dom.energyCurrent) dom.energyCurrent.textContent = Math.floor(user.energy);
    if (dom.energyMax) dom.energyMax.textContent = MAX_ENERGY;
    if (dom.levelCurrent) dom.levelCurrent.textContent = user.level;

    if (dom.xpProgressBar) {
        const xpPercentage = (user.xp / user.xp_to_next) * 100;
        dom.xpProgressBar.style.width = `${Math.min(100, xpPercentage)}%`;
    }

    // Обновляем аватар из Telegram WebApp
    if (dom.userAvatar) {
        // Пробуем получить фото из Telegram WebApp initDataUnsafe
        if (tg?.initDataUnsafe?.user?.photo_url) {
            dom.userAvatar.src = tg.initDataUnsafe.user.photo_url;
            debugLog('Avatar loaded from Telegram:', tg.initDataUnsafe.user.photo_url);
        } else if (realUser?.photo_url) {
            dom.userAvatar.src = realUser.photo_url;
            debugLog('Avatar loaded from realUser:', realUser.photo_url);
        }
    }

    // Header всегда видим (убран opacity transition)
    // REMOVED: headerElements.style.opacity code - header is always visible now
}

async function init() {
    debugLog('AR ARENA - Trading Bull: Инициализация...');
    cacheDomElements();

    // Загрузка скина
    const activeSkinFile = localStorage.getItem('active_skin_file') || 'bull.png';
    if (dom.bullImage) {
        dom.bullImage.src = `icons/bulls/${activeSkinFile}`;
    }

    // Настройка Telegram Fullscreen Mode
    const tg = window.Telegram?.WebApp;
    if (tg) {
        debugLog('Telegram WebApp detected');
        debugLog('Platform:', tg.platform);
        debugLog('ViewportHeight:', tg.viewportHeight);
        debugLog('IsExpanded:', tg.isExpanded);

        const isMobile = tg.platform && ['ios', 'android'].includes(tg.platform);

        tg.ready();
        tg.expand();

        debugLog('tg.expand() called');

        if (isMobile) {
            // ========== MOBILE: FULLSCREEN MODE ==========
            debugLog('Mobile platform detected - enabling fullscreen');

            tg.requestFullscreen(); // 🔥 CRITICAL: Включить fullscreen режим!

            // Padding для safe-area (учитываем notch и системные элементы)
            document.body.style.paddingTop = 'max(60px, calc(env(safe-area-inset-top) + 30px))';

            // Убедимся что body занимает весь экран
            document.body.style.height = '100vh';
            document.body.style.width = '100vw';
            document.body.style.maxHeight = '100vh';

            // Для iOS - дополнительная гарантия fullscreen
            if (tg.platform === 'ios') {
                document.documentElement.style.height = '100%';
                document.body.style.height = '100%';
            }

            debugLog('Body styles applied:', {
                height: document.body.style.height,
                paddingTop: document.body.style.paddingTop
            });

            // Telegram BackButton
            if (tg.BackButton) {
                tg.BackButton.show();
                tg.BackButton.onClick(() => {
                    tg.close(); // index.html - точка входа, закрываем приложение
                });
                debugLog('BackButton shown');
            }
        } else {
            // ========== DESKTOP: CUSTOM HEADER ==========
            debugLog('Desktop platform - creating custom header');

            const header = document.createElement('div');
            header.className = 'custom-header';
            header.innerHTML = `
                <button class="custom-back-btn" onclick="tg.close()">
                    <img src="icons/arrow-left.svg" alt="Back" width="20" height="20">
                    <span>Назад</span>
                </button>
                <span class="custom-header-title">AR ARENA</span>
                <div class="custom-header-spacer"></div>
            `;
            document.body.insertBefore(header, document.body.firstChild);

            // Padding для контента под кастомной шапкой
            document.body.style.paddingTop = '60px';
        }
    } else {
        debugWarn('Telegram WebApp not detected!');
    }

    // 🚀 ИНТЕГРАЦИЯ С AUTH.JS
    // Пытаемся получить реального пользователя
    if (window.getCurrentUser) {
        try {
            const realUser = await window.getCurrentUser();
            if (realUser) {
                debugLog('Real user loaded:', realUser.username);
                // Обновляем только идентификаторы, чтобы связать игровые данные
                user.telegram_id = realUser.telegram_id;
                // Баланс AR и имя берем динамически в updateUI
                saveUserState();
            }
        } catch (e) {
            debugWarn('Auth load warning:', e);
        }
    }

    updateUI();
    startEnergyTimer();

    if (dom.bullTapArea) {
        dom.bullTapArea.addEventListener('click', handleBullTap);
        dom.bullTapArea.addEventListener('touchstart', (e) => {
            e.preventDefault(); 
            handleBullTap(e.touches[0]);
        }, { passive: false });
    }
    
    debugLog('AR ARENA - Trading Bull: Инициализация завершена.');
}

document.addEventListener('DOMContentLoaded', init);

// Подписываемся на событие обновления пользователя из auth.js (если оно есть, или просто обновляем UI периодически)
window.addEventListener('userUpdated', updateUI);

window.addEventListener('beforeunload', () => {
    if (energyIntervalId) clearInterval(energyIntervalId);
    if (noEnergyBannerTimeoutId) clearTimeout(noEnergyBannerTimeoutId);
    saveUserState();
});

// ========== МИКРО-ТАЙМЕР РОЗЫГРЫША ==========
let giveawayTimerInterval = null;
let currentActiveGiveaway = null;

async function loadActiveGiveaway() {
    try {
        const supabase = window.supabaseClient || window.db;
        if (!supabase) {
            debugWarn('[GiveawayTimer] Supabase not connected');
            return null;
        }

        const { data: giveaway, error } = await supabase
            .from('giveaways')
            .select('id, main_title, start_date, end_date, status')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            debugError('[GiveawayTimer] Error loading giveaway:', error);
            return null;
        }

        if (!giveaway) {
            debugLog('[GiveawayTimer] No active giveaway found');
            return null;
        }

        debugLog('[GiveawayTimer] Active giveaway loaded:', giveaway.main_title);
        return giveaway;

    } catch (error) {
        debugError('[GiveawayTimer] Exception:', error);
        return null;
    }
}

function updateGiveawayTimer() {
    if (!currentActiveGiveaway) return;

    const now = new Date().getTime();
    const startDate = new Date(currentActiveGiveaway.start_date).getTime();
    const endDate = new Date(currentActiveGiveaway.end_date).getTime();

    const timerMicro = document.getElementById('giveawayTimerMicro');
    const timerTime = document.getElementById('timerMicroTime');

    if (!timerMicro || !timerTime) return;

    // Если розыгрыш ещё не начался - показываем таймер до начала продаж
    if (now < startDate) {
        const diff = startDate - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
            timerTime.textContent = `${days}д ${hours}ч`;
        } else if (hours > 0) {
            timerTime.textContent = `${hours}ч ${minutes}м`;
        } else {
            timerTime.textContent = `${minutes}м`;
        }

        timerMicro.style.display = 'block';
        return;
    }

    // Если продажи идут - показываем таймер до розыгрыша
    if (now >= startDate && now < endDate) {
        const diff = endDate - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
            timerTime.textContent = `${days}д ${hours}ч`;
        } else if (hours > 0) {
            timerTime.textContent = `${hours}ч ${minutes}м`;
        } else {
            timerTime.textContent = `${minutes}м`;
        }

        timerMicro.style.display = 'block';
        return;
    }

    // Если розыгрыш закончился - скрываем таймер и загружаем новый
    if (now >= endDate) {
        timerMicro.style.display = 'none';
        debugLog('[GiveawayTimer] Giveaway ended, reloading...');
        // Перезагружаем розыгрыш через 5 секунд
        setTimeout(() => {
            initGiveawayTimer();
        }, 5000);
    }
}

function navigateToGiveaway() {
    if (currentActiveGiveaway) {
        window.location.href = `giveaway.html?id=${currentActiveGiveaway.id}`;
    }
}

async function initGiveawayTimer() {
    // Очищаем старый таймер
    if (giveawayTimerInterval) {
        clearInterval(giveawayTimerInterval);
    }

    // Загружаем активный розыгрыш
    currentActiveGiveaway = await loadActiveGiveaway();

    if (!currentActiveGiveaway) {
        // Скрываем виджет если нет розыгрыша
        const timerMicro = document.getElementById('giveawayTimerMicro');
        if (timerMicro) {
            timerMicro.style.display = 'none';
        }
        debugLog('[GiveawayTimer] No active giveaway, timer hidden');
        return;
    }

    // Обновляем таймер сразу
    updateGiveawayTimer();

    // Запускаем интервал обновления каждую минуту (компактный таймер не требует секундной точности)
    giveawayTimerInterval = setInterval(updateGiveawayTimer, 60000);

    debugLog('[GiveawayTimer] Timer started for:', currentActiveGiveaway.main_title);
}

// Добавляем функцию в глобальную область для onclick
window.navigateToGiveaway = navigateToGiveaway;

// Запускаем таймер после загрузки Supabase
let supabaseRetries = 0;
const MAX_SUPABASE_RETRIES = 20; // Максимум 10 секунд ожидания (20 * 500ms)

function waitForSupabaseAndStartTimer() {
    if (window.supabaseClient || window.db) {
        debugLog('[GiveawayTimer] Supabase ready, starting timer...');
        initGiveawayTimer();
    } else if (supabaseRetries < MAX_SUPABASE_RETRIES) {
        supabaseRetries++;
        debugLog(`[GiveawayTimer] Waiting for Supabase... (attempt ${supabaseRetries}/${MAX_SUPABASE_RETRIES})`);
        setTimeout(waitForSupabaseAndStartTimer, 500);
    } else {
        debugError('[GiveawayTimer] Supabase failed to load after', MAX_SUPABASE_RETRIES, 'attempts');
    }
}

// Запускаем после небольшой задержки чтобы дать auth.js время загрузиться
setTimeout(waitForSupabaseAndStartTimer, 1000);