// Инициализация Telegram WebApp
if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
}

// Таблица наград с вероятностями
const rewards = [
    { amount: 10, chance: 40, rarity: 'common' },
    { amount: 25, chance: 30, rarity: 'uncommon' },
    { amount: 50, chance: 20, rarity: 'rare' },
    { amount: 100, chance: 8, rarity: 'legendary' },
    { amount: 500, chance: 2, rarity: 'epic' }
];

// Проверка подписки на канал (используем рабочий метод из tasks.js)
async function checkSubscription(channelId) {
    try {
        const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || '190202791';

        console.log('=== ПРОВЕРКА ПОДПИСКИ ===');
        console.log('User ID:', userId);
        console.log('Channel ID:', channelId);

        const response = await fetch('https://ar-arena-check.levbekk.workers.dev', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                channel_id: channelId
            })
        });

        const data = await response.json();
        console.log('Ответ от сервера:', data);
        console.log('subscribed:', data.subscribed, 'status:', data.status);

        // Проверяем новый формат ответа API
        // API возвращает {"subscribed":true,"status":"administrator"} или {"subscribed":false}
        const isSubscribed = data.subscribed === true ||
                           data.subscribed === 'true' ||
                           data.subscribed === "true" ||
                           String(data.subscribed).toLowerCase() === 'true' ||
                           data.subscribed === 1 ||
                           data.subscribed === '1';

        // Дополнительно проверяем статус - administrator означает подписку
        const hasValidStatus = data.status === 'administrator' ||
                              data.status === 'member' ||
                              data.status === 'creator' ||
                              String(data.status).toLowerCase() === 'administrator';

        // Обратная совместимость со старым форматом API (is_member)
        const oldFormatMember = data.is_member === true ||
                               data.is_member === 'true' ||
                               data.is_member === "true" ||
                               String(data.is_member).toLowerCase() === 'true' ||
                               data.is_member === 1 ||
                               data.is_member === '1';

        // Подписка активна если subscribed=true ИЛИ есть валидный статус ИЛИ старый формат is_member=true
        const isMember = isSubscribed || hasValidStatus || oldFormatMember;

        console.log('Финальный результат:', isMember);
        return isMember;
    } catch (error) {
        console.error('Ошибка проверки подписки:', error);
        return false;
    }
}

// Проверка возможности получить отмычку сегодня
function canClaimLockpick() {
    const lastClaim = localStorage.getItem('lastLockpickClaim');
    console.log('=== canClaimLockpick check ===');
    console.log('lastLockpickClaim from localStorage:', lastClaim);

    // Также проверяем, был ли открыт кейс сегодня
    const chestOpenedDate = localStorage.getItem('chestOpenedDate');
    const today = new Date().toDateString();
    if (chestOpenedDate === today) {
        console.log('Кейс уже был открыт сегодня - нельзя получить новую отмычку');
        return false;
    }

    if (!lastClaim || lastClaim === 'null' || lastClaim === '' || lastClaim === 'NaN') {
        console.log('No valid previous claim found - can claim');
        if (lastClaim === 'NaN') {
            console.log('Clearing invalid NaN value');
            localStorage.removeItem('lastLockpickClaim');
        }
        return true;
    }

    const lastClaimTimestamp = parseInt(lastClaim);
    if (isNaN(lastClaimTimestamp)) {
        console.log('Invalid timestamp in localStorage - clearing and allowing claim');
        localStorage.removeItem('lastLockpickClaim');
        return true;
    }

    const lastClaimDate = new Date(lastClaimTimestamp);
    const now = new Date();

    console.log('Last claim date:', lastClaimDate.toLocaleString());
    console.log('Current date:', now.toLocaleString());

    // Получаем начало сегодняшнего дня (00:00)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    console.log('Today start:', todayStart.toLocaleString());

    // Можно получить отмычку, если последнее получение было до начала сегодняшнего дня
    const canClaim = lastClaimDate < todayStart;
    console.log('Can claim result:', canClaim);
    console.log('=== End check ===');

    return canClaim;
}

// Функция для получения ежедневной отмычки
function claimDailyLockpick() {
    if (!canClaimLockpick()) {
        alert('Отмычку можно получить после 00:00');
        return;
    }

    // Используем новую логику
    checkSubscriptionsForLockpick();
}

// Проверка подписок для получения отмычки (новая логика)
async function checkSubscriptionsForLockpick() {
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || '190202791';
    const isAdmin = userId === 190202791 || userId === '190202791' ||
                    userId === 5834159353 || userId === '5834159353';

    console.log('Начинаем проверку подписок для отмычки...');

    // Сначала проверяем, можно ли вообще получить отмычку сегодня
    if (!isAdmin && !canClaimLockpick()) {
        console.log('Отмычка уже была получена сегодня');
        const button = document.getElementById('lockpickBtn');
        if (button) {
            const now = new Date();
            const midnight = new Date(now);
            midnight.setDate(midnight.getDate() + 1);
            midnight.setHours(0, 0, 0, 0);
            const timeLeft = midnight - now;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            button.innerHTML = `<span>⏰ Через ${hours}ч ${minutes}мин</span>`;
            button.disabled = true;
            button.classList.add('disabled');
        }
        return;
    }

    const alex = await checkSubscription('-1001143184637');
    console.log('Подписка на Алексей Руденко:', alex);

    const premium = await checkSubscription('-1002214737652');
    console.log('Подписка на PREMIUM NEWS:', premium);

    if (alex && premium) {
        console.log('Обе подписки активны, выдаем отмычку!');
        giveLockpick();
    } else {
        console.log('Не все подписки активны, показываем кнопки');
        showSubscriptionButtons(!alex, !premium);
    }
}

// Показать кнопки подписки
function showSubscriptionButtons(needAlex, needPremium) {
    let html = '<div class="subscription-buttons">';

    if (needAlex) {
        html += '<button id="alexBtn" class="sub-btn check compact" onclick="checkAlexSubscription()">Проверить подписку</button>';
    }

    if (needPremium) {
        html += '<button id="premiumBtn" class="sub-btn check compact" onclick="checkPremiumSubscription()">Проверить подписку</button>';
    }

    html += '</div>';

    const container = document.querySelector('.lockpick-container');
    if (!container) {
        console.error('Не найден контейнер .lockpick-container');
        return;
    }

    const existing = container.querySelector('.subscription-buttons');
    if (existing) existing.remove();
    container.insertAdjacentHTML('beforeend', html);
}

// Проверка подписки на Алексей Руденко
function checkAlexSubscription() {
    const btn = document.getElementById('alexBtn');
    btn.className = 'sub-btn subscribe compact';
    btn.innerHTML = 'Подписаться';
    btn.onclick = () => {
        window.Telegram?.WebApp?.openTelegramLink('https://t.me/AlexRich2018');
        btn.className = 'sub-btn check compact';
        btn.innerHTML = 'Проверить подписку';
        btn.onclick = async () => {
            const subscribed = await checkSubscription('-1001143184637');
            if (subscribed) {
                btn.className = 'sub-btn success';
                btn.innerHTML = '✅ Подписан';
                setTimeout(() => btn.remove(), 2000);
                checkIfBothSubscribed();
            } else {
                checkAlexSubscription();
            }
        };
    };
}

// Проверка подписки на PREMIUM NEWS
function checkPremiumSubscription() {
    const btn = document.getElementById('premiumBtn');
    btn.className = 'sub-btn subscribe compact';
    btn.innerHTML = 'Подписаться';
    btn.onclick = () => {
        window.Telegram?.WebApp?.openTelegramLink('https://t.me/premium_news');
        btn.className = 'sub-btn check compact';
        btn.innerHTML = 'Проверить подписку';
        btn.onclick = async () => {
            const subscribed = await checkSubscription('-1002214737652');
            if (subscribed) {
                btn.className = 'sub-btn success';
                btn.innerHTML = '✅ Подписан';
                setTimeout(() => btn.remove(), 2000);
                checkIfBothSubscribed();
            } else {
                checkPremiumSubscription();
            }
        };
    };
}

// Проверить обе подписки
async function checkIfBothSubscribed() {
    // Проверяем админа
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const isAdmin = userId === 190202791 || userId === '190202791' ||
                    userId === 5834159353 || userId === '5834159353';

    // Проверяем, можно ли получить отмычку
    if (!isAdmin && !canClaimLockpick()) {
        console.log('Отмычка уже была получена сегодня (в checkIfBothSubscribed)');
        return;
    }

    const alex = await checkSubscription('-1001143184637');
    const premium = await checkSubscription('-1002214737652');
    if (alex && premium) {
        giveLockpick();
    }
}

// Выдать отмычку
function giveLockpick() {
    console.log('Функция giveLockpick вызвана!');

    const claimTime = Date.now();
    if (isNaN(claimTime)) {
        console.error('ERROR: claimTime is NaN!');
        return;
    }
    localStorage.setItem('lastLockpickClaim', claimTime.toString());
    console.log('Saved claim time (timestamp):', claimTime);
    console.log('Saved claim time (date):', new Date(claimTime).toLocaleString());

    const current = parseInt(localStorage.getItem('dailyLockpicks') || '0');
    const newCount = current + 1;
    localStorage.setItem('dailyLockpicks', newCount);
    localStorage.setItem('hasLockpick', 'true');
    console.log('Отмычка сохранена в localStorage');

    // Обновляем отображение
    const button = document.getElementById('lockpickBtn');
    if (button) {
        button.innerHTML = '<span>✅ Отмычка получена!</span>';
        button.className = 'lockpick-btn btn-success';
        button.disabled = true;
    }

    // Убираем кнопки подписки
    const subButtons = document.querySelector('.subscription-buttons');
    if (subButtons) {
        subButtons.remove();
    }

    // Показываем анимацию получения отмычки
    showLockpickAnimation();

    // Обновляем счетчик
    updateLockpickCounter(newCount);

    // Активируем сундуки
    setTimeout(() => {
        enableChests();
        if (button) {
            button.style.display = 'none';
        }
        const info = document.querySelector('.lockpick-info');
        if (info) info.style.display = 'none';
        const instruction = document.getElementById('instructionText');
        if (instruction) instruction.style.display = 'block';
    }, 2000);
}

// Анимация получения отмычки
function showLockpickAnimation() {
    const container = document.querySelector('.lockpick-container');

    // Создаем элемент летящей отмычки
    const flyingLockpick = document.createElement('div');
    flyingLockpick.className = 'flying-lockpick';
    flyingLockpick.innerHTML = `
        <img src="icons/kiy.png?v=1758366341" alt="Отмычка" style="width: 60px; height: 60px; filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.5));">
    `;

    container.appendChild(flyingLockpick);

    // Удаляем элемент после анимации
    setTimeout(() => flyingLockpick.remove(), 1500);
}

// Вспомогательная функция для обновления текста кнопки
function updateButtonText(button, text) {
    if (!button) return;
    const span = button.querySelector('span');
    if (span) {
        span.textContent = text;
    } else {
        button.textContent = text;
    }
}

// Обновление счетчика отмычек
function updateLockpickCounter(count) {
    // Обновляем счетчик в углу
    const cornerCounter = document.getElementById('cornerLockpickCount');
    if (cornerCounter) {
        // Счетчик показывает только 0 или 1
        const displayCount = count > 0 ? 1 : 0;
        cornerCounter.textContent = displayCount;

        // Анимация при изменении
        cornerCounter.style.transform = 'scale(1.2)';
        setTimeout(() => {
            cornerCounter.style.transform = 'scale(1)';
        }, 300);
    }

    // Удален старый счетчик под кнопкой
}

// Получение отмычки (главная функция)
async function getLockpick() {
    console.log('=== getLockpick вызвана ===');
    const button = document.getElementById('lockpickBtn');

    if (!button) {
        console.error('Кнопка lockpickBtn не найдена!');
        return;
    }

    // Проверка для админов
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const isAdmin = userId === 190202791 || userId === '190202791' ||
                    userId === 5834159353 || userId === '5834159353';

    console.log('Checking if can claim - Is Admin:', isAdmin, 'Can Claim:', canClaimLockpick());

    // Для обычных пользователей проверяем лимит
    if (!isAdmin && !canClaimLockpick()) {
        console.log('Отмычка уже получена сегодня!');
        const now = new Date();
        const midnight = new Date(now);
        midnight.setDate(midnight.getDate() + 1);
        midnight.setHours(0, 0, 0, 0);

        const hoursLeft = Math.ceil((midnight - now) / (1000 * 60 * 60));
        updateButtonText(button, `⏰ Через ${hoursLeft} час.`);
        button.className = 'lockpick-btn btn-error';

        setTimeout(() => {
            updateButtonText(button, '🔑 Получить отмычку');
            button.className = 'lockpick-btn';
        }, 3000);
        return;
    }

    // Запускаем проверку подписок
    button.disabled = true;
    button.innerHTML = '<img src="icons/loading.png" style="width: 20px; height: 20px; animation: spin 2s ease-in-out infinite;">';
    await checkSubscriptionsForLockpick();
}

// Показать модальное окно подписки
function showSubscriptionModal() {
    const modal = document.getElementById('subscriptionModal');
    modal.classList.add('show');
}

// Показать красивые карточки заданий для подписки
function showSubscriptionTasks(alexSubscribed, premiumSubscribed) {
    const modal = document.createElement('div');
    modal.className = 'subscription-modal show';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.background = 'rgba(0, 0, 0, 0.9)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '1000';

    modal.innerHTML = `
        <div class="modal-content" style="
            background: linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(0, 0, 0, 0.95));
            border: 2px solid rgba(255, 215, 0, 0.3);
            border-radius: 20px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
        ">
            <h3 style="color: #FFD700; text-align: center; margin-bottom: 20px;">🔐 Требуется подписка</h3>
            <div class="subscription-tasks" style="display: flex; flex-direction: column; gap: 15px;">
                ${!alexSubscribed ? `
                    <div class="task-card" style="
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 215, 0, 0.2);
                        border-radius: 12px;
                        padding: 15px;
                        display: flex;
                        align-items: center;
                        gap: 15px;
                    ">
                        <div class="task-icon" style="font-size: 24px;">📢</div>
                        <div class="task-info" style="flex: 1;">
                            <h4 style="margin: 0; color: #fff; font-size: 16px;">Алексей Руденко | Криптоинвестор</h4>
                            <p style="margin: 5px 0 0; color: rgba(255, 215, 0, 0.7); font-size: 12px;">+100 AR за подписку</p>
                        </div>
                        <button onclick="subscribeToChannel('AlexRich2018')" style="
                            background: linear-gradient(45deg, #FFD700, #FFA500);
                            border: none;
                            color: #000;
                            padding: 8px 16px;
                            border-radius: 8px;
                            font-size: 12px;
                            font-weight: 600;
                            cursor: pointer;
                        ">Подписаться</button>
                    </div>
                ` : ''}
                ${!premiumSubscribed ? `
                    <div class="task-card" style="
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 215, 0, 0.2);
                        border-radius: 12px;
                        padding: 15px;
                        display: flex;
                        align-items: center;
                        gap: 15px;
                    ">
                        <div class="task-icon" style="font-size: 24px;">📰</div>
                        <div class="task-info" style="flex: 1;">
                            <h4 style="margin: 0; color: #fff; font-size: 16px;">PREMIUM NEWS</h4>
                            <p style="margin: 5px 0 0; color: rgba(255, 215, 0, 0.7); font-size: 12px;">+100 AR за подписку</p>
                        </div>
                        <button onclick="subscribeToChannel('premium_news')" style="
                            background: linear-gradient(45deg, #FFD700, #FFA500);
                            border: none;
                            color: #000;
                            padding: 8px 16px;
                            border-radius: 8px;
                            font-size: 12px;
                            font-weight: 600;
                            cursor: pointer;
                        ">Подписаться</button>
                    </div>
                ` : ''}
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button onclick="checkSubscriptionAndGetLockpick()" style="
                    background: linear-gradient(45deg, #4CAF50, #45a049);
                    border: none;
                    color: #fff;
                    padding: 12px 30px;
                    border-radius: 20px;
                    cursor: pointer;
                    flex: 1;
                    font-weight: 600;
                ">✅ Я подписался</button>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: #fff;
                    padding: 12px 30px;
                    border-radius: 20px;
                    cursor: pointer;
                    flex: 1;
                ">Закрыть</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Подписка на канал
function subscribeToChannel(channelName) {
    window.open(`https://t.me/${channelName}`, '_blank');
}

// Проверить подписку после нажатия "Я подписался"
async function checkSubscriptionAndGetLockpick() {
    // Закрываем текущее модальное окно
    const modals = document.querySelectorAll('.subscription-modal');
    modals.forEach(modal => modal.remove());

    const button = document.getElementById('lockpickBtn');

    // Показываем процесс проверки
    button.disabled = true;
    button.innerHTML = '<img src="icons/loading.png" style="width: 20px; height: 20px; animation: spin 2s ease-in-out infinite;">';
    button.className = 'lockpick-btn';

    // Проверка для админов
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const isAdmin = userId === 190202791 || userId === '190202791' ||
                    userId === 5834159353 || userId === '5834159353';

    // Проверяем подписки
    let alexActive = false;
    let premiumActive = false;

    if (isAdmin) {
        alexActive = true;
        premiumActive = true;
        console.log('Админ - автоматически даем доступ');
    } else {
        console.log('Начинаем проверку подписок...');
        alexActive = await checkSubscription('-1001143184637');
        premiumActive = await checkSubscription('-1002214737652');
        console.log('Результат проверки:', { alexActive, premiumActive });
    }

    if (!alexActive || !premiumActive) {
        // Если все еще не подписан
        console.log('Подписка не найдена после повторной проверки');
        updateButtonText(button, '❌ Подписка не найдена');
        button.className = 'lockpick-btn btn-error';
        button.disabled = false;

        // Показываем сообщение
        alert('Подписка не обнаружена! Убедитесь, что вы подписались на оба канала:\n\n1. @AlexRich2018\n2. @premium_news');

        // Снова показываем модальное окно
        setTimeout(() => {
            updateButtonText(button, '🔑 Получить отмычку');
            button.className = 'lockpick-btn';
            showSubscriptionTasks(alexActive, premiumActive);
        }, 2000);
        return;
    }

    // Если подписка подтверждена - выдаем отмычку
    console.log('Подписка подтверждена! Выдаем отмычку...');
    const now = Date.now();
    localStorage.setItem('lastLockpickClaim', now.toString());
    console.log('Saved lockpick claim time (in final check):', now);
    updateButtonText(button, '✅ Отмычка получена!');
    button.className = 'lockpick-btn btn-success';

    // Активируем сундуки
    setTimeout(() => {
        enableChests();
        button.style.display = 'none';
        document.querySelector('.lockpick-info').style.display = 'none';
        document.getElementById('instructionText').style.display = 'block';
    }, 1000);
}

// Закрыть модальное окно подписки
function closeSubscriptionModal() {
    const modal = document.getElementById('subscriptionModal');
    modal.classList.remove('show');
}

// Разблокировать сундуки
function enableChests() {
    console.log('Активируем сундуки для открытия');
    const chests = document.querySelectorAll('.chest');

    // Устанавливаем флаг, что можно открыть ОДИН сундук
    window.canOpenChest = true;

    chests.forEach(chest => {
        chest.classList.remove('locked');
        chest.classList.add('unlocked');

        // Добавляем обработчик клика
        chest.onclick = function() {
            if (window.canOpenChest) {
                console.log('Открываем сундук, блокируем остальные');
                window.canOpenChest = false; // Блокируем повторное открытие
                openChest(this);

                // Блокируем все остальные сундуки
                const allChests = document.querySelectorAll('.chest');
                allChests.forEach(c => {
                    if (c !== this) {
                        c.classList.add('locked');
                        c.classList.remove('unlocked');
                        c.onclick = null;
                    }
                });
            } else {
                console.log('Сундук уже был открыт, игнорируем клик');
            }
        };
    });
}

// Расчет награды
function calculateReward() {
    const random = Math.random() * 100;
    let cumulativeChance = 0;

    for (const reward of rewards) {
        cumulativeChance += reward.chance;
        if (random <= cumulativeChance) {
            return reward;
        }
    }

    return rewards[0]; // На всякий случай
}

// Открытие сундука с анимацией
function openChest(chestElement) {
    console.log('=== ОТКРЫТИЕ СУНДУКА ===');

    // Проверяем, есть ли отмычка
    const hasLockpick = localStorage.getItem('hasLockpick') === 'true';
    if (!hasLockpick && !window.canOpenChest) {
        console.log('Нет отмычки для открытия сундука');
        return;
    }

    // Сохраняем факт, что кейс был открыт сегодня
    const today = new Date().toDateString();
    localStorage.setItem('chestOpenedDate', today);

    // Сохраняем индекс открытого сундука
    const chestIndex = Array.from(document.querySelectorAll('.chest')).indexOf(chestElement);
    localStorage.setItem('lastOpenedChest', chestIndex.toString());

    console.log('Сохранен факт открытия кейса:', today, 'Индекс:', chestIndex);

    // Блокируем повторные клики на ВСЕХ сундуках
    const chests = document.querySelectorAll('.chest');
    chests.forEach(c => {
        c.onclick = null;
        c.style.cursor = 'not-allowed';
    });

    // Сбрасываем счетчик отмычек на 0 и убираем флаг наличия отмычки
    localStorage.setItem('lockpicksAvailable', '0');
    localStorage.removeItem('hasLockpick');
    updateLockpickCounter(0);

    // Блокируем возможность открыть другие сундуки
    window.canOpenChest = false;

    // Добавляем класс анимации открытия
    chestElement.classList.add('opening');

    // Меняем картинку на открытый сундук НЕМЕДЛЕННО
    const img = chestElement.querySelector('.chest-image');
    console.log('Нашли элемент картинки:', img);

    if (img) {
        const oldSrc = img.src;
        console.log('Старый путь картинки (keis1.png):', oldSrc);

        // Меняем картинку сразу без предзагрузки
        img.src = 'icons/02.png?v=1758366341';
        img.setAttribute('src', 'icons/02.png?v=1758366341');
        console.log('Путь изменен на:', img.src);
    } else {
        console.error('НЕ НАЙДЕН элемент .chest-image!');
    }

    // Убираем класс opening и добавляем opened через 400мс
    setTimeout(() => {
        chestElement.classList.remove('opening');
        chestElement.classList.add('opened');
        console.log('Сундук помечен как opened');

        // Делаем все сундуки снова темными (как до получения отмычки)
        const allChests = document.querySelectorAll('.chest');
        allChests.forEach(chest => {
            if (!chest.classList.contains('opened')) {
                chest.classList.remove('unlocked');
                chest.classList.add('locked');
            }
        });
    }, 400);

    // Расчет награды
    const reward = calculateReward();

    // Запускаем анимацию монет сразу
    setTimeout(() => {
        createCoinsAnimation(chestElement, reward.amount);
    }, 100);

    // Показываем результат после анимации
    setTimeout(() => {
        showReward(reward);
    }, 1200);
}

// Анимация вылета монет
function createCoinsAnimation(chestElement, amount) {
    const container = chestElement.querySelector('.coins-container');

    // Количество монет зависит от суммы
    let coinCount = 5;
    if (amount >= 50) coinCount = 8;
    if (amount >= 100) coinCount = 12;
    if (amount >= 500) coinCount = 20;

    // Создаем монеты с разной анимацией
    for (let i = 0; i < coinCount; i++) {
        setTimeout(() => {
            const coin = document.createElement('div');
            coin.className = 'coin';

            // Случайное направление вылета
            const angle = (Math.PI * 2 * i) / coinCount + Math.random() * 0.5;
            const distance = 60 + Math.random() * 40;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance - 50;

            coin.style.setProperty('--coin-x', `${x}px`);
            coin.style.setProperty('--coin-y', `${y}px`);

            container.appendChild(coin);

            // Удаляем монету после анимации
            setTimeout(() => coin.remove(), 1500);
        }, i * 50);
    }
}

// Показ награды
function showReward(reward) {
    const modal = document.getElementById('rewardModal');
    const amountElement = document.getElementById('rewardAmount');

    // Обновляем текст в новом компактном формате
    amountElement.textContent = `+${reward.amount} AR`;
    modal.classList.add('show');

    // Сохраняем сегодняшнюю награду
    localStorage.setItem('todayReward', reward.amount.toString());

    // Эффекты в зависимости от редкости
    if (reward.rarity === 'epic') {
        createEpicEffect();
    } else if (reward.rarity === 'legendary') {
        createConfetti();
    }

    // Сохраняем награду (но не начисляем до клика на кнопку)
    window.pendingReward = reward.amount;
}

// Вернуться назад
function goBack() {
    window.location.href = 'tasks.html';
}

// Забрать награду
function claimReward() {
    if (window.pendingReward) {
        // Начисляем баланс
        const currentBalance = parseInt(localStorage.getItem('ar_balance') || '0');
        const newBalance = currentBalance + window.pendingReward;
        localStorage.setItem('ar_balance', newBalance.toString());

        // Обновляем статистику
        const totalEarned = parseInt(localStorage.getItem('total_earned') || '0');
        localStorage.setItem('total_earned', (totalEarned + window.pendingReward).toString());

        const rewardAmount = window.pendingReward;
        // Очищаем pending reward
        window.pendingReward = null;

        // Закрываем модальное окно
        const modal = document.getElementById('rewardModal');
        modal.classList.remove('show');

        // Показываем результат вместо кнопки
        showRewardResult(rewardAmount);
    }
}

// Показать результат после получения награды
function showRewardResult(amount) {
    const button = document.getElementById('lockpickBtn');
    const info = document.querySelector('.lockpick-info');
    const instruction = document.getElementById('instructionText');

    if (button) {
        button.style.display = 'none';
    }

    if (info) {
        info.style.display = 'none';
    }

    if (instruction) {
        instruction.innerHTML = `
            <div style="text-align: center; padding: 5px 0;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 8px;">
                    <span style="color: #FFD700; font-size: 20px; font-weight: 600;">+${amount} AR</span>
                    <span style="color: rgba(255, 255, 255, 0.8); font-size: 14px;">получено</span>
                </div>
                <div style="display: inline-block; text-align: center;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 3px;">
                        <img src="icons/time.png" style="width: 16px; height: 16px; opacity: 0.8; flex-shrink: 0;">
                        <span style="color: rgba(255, 255, 255, 0.7); font-size: 13px; white-space: nowrap;">Следующая попытка через:</span>
                    </div>
                    <div id="nextTimer" style="color: #FFD700; font-size: 14px; font-weight: 500; font-family: monospace; min-width: 70px; display: inline-block;"></div>
                </div>
            </div>
        `;
        instruction.style.display = 'block';
    }

    // Запускаем таймер
    updateNextLockpickTimer();
    setInterval(updateNextLockpickTimer, 1000);
}

// Обновить таймер до следующей отмычки
function updateNextLockpickTimer() {
    const timer = document.getElementById('nextTimer');
    if (!timer) return;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const diff = tomorrow - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    timer.textContent = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Эпический эффект для 500 AR
function createEpicEffect() {
    // Создаем фиолетовые искры
    const colors = ['#9333ea', '#a855f7', '#c084fc', '#e879f9', '#f0abfc'];

    for (let i = 0; i < 100; i++) {
        const spark = document.createElement('div');
        spark.style.position = 'fixed';
        spark.style.width = '4px';
        spark.style.height = '4px';
        spark.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        spark.style.boxShadow = `0 0 10px ${colors[0]}`;
        spark.style.borderRadius = '50%';
        spark.style.left = '50%';
        spark.style.top = '50%';
        spark.style.zIndex = '9999';
        document.body.appendChild(spark);

        const angle = (Math.PI * 2 * i) / 100;
        const velocity = 5 + Math.random() * 10;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;

        spark.animate([
            { transform: 'translate(-50%, -50%)', opacity: 1 },
            { transform: `translate(calc(-50% + ${vx * 50}px), calc(-50% + ${vy * 50}px))`, opacity: 0 }
        ], {
            duration: 2000,
            easing: 'cubic-bezier(0, 0, 0.2, 1)'
        }).onfinish = () => spark.remove();
    }
}

// Конфетти для легендарной награды
function createConfetti() {
    const colors = ['#FFD700', '#FFA500', '#FF6347', '#FF1493', '#00CED1'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.borderRadius = '2px';
        confetti.style.zIndex = '9999';
        document.body.appendChild(confetti);

        // Анимация падения
        const duration = Math.random() * 3 + 2;
        const rotation = Math.random() * 360;
        const drift = (Math.random() - 0.5) * 200;

        confetti.animate([
            { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
            { transform: `translateY(100vh) translateX(${drift}px) rotate(${rotation}deg)`, opacity: 0 }
        ], {
            duration: duration * 1000,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }).onfinish = () => confetti.remove();
    }
}

// Обработка спецзаданий в модальном окне
async function handleSpecialTask(taskId) {
    const button = document.getElementById(`btnSpecial${taskId}`);
    const channelUrls = {
        1: 'https://t.me/AlexRich2018',
        2: 'https://t.me/premium_news'
    };

    // Если кнопка "Подписаться" - открываем канал
    if (button.textContent.includes('Подписаться')) {
        window.open(channelUrls[taskId], '_blank');

        // Меняем на кнопку проверки
        updateButtonText(button, '🔍 Проверить');
        button.className = 'subscribe-btn check';
        return;
    }

    // Если кнопка "Проверить" - проверяем подписку
    button.disabled = true;
    button.innerHTML = '<img src="icons/loading.png" style="width: 20px; height: 20px; animation: spin 2s ease-in-out infinite;">';
    button.className = 'subscribe-btn checking';

    const channelIds = {
        1: '-1001143184637',
        2: '-1002214737652'
    };

    const isSubscribed = await checkSubscription(channelIds[taskId]);

    if (isSubscribed) {
        updateButtonText(button, '✅ Подписан');
        button.className = 'subscribe-btn completed';
        button.disabled = true;

        // Проверяем обе подписки
        const btn1 = document.getElementById('btnSpecial1');
        const btn2 = document.getElementById('btnSpecial2');

        if (btn1.classList.contains('completed') && btn2.classList.contains('completed')) {
            // Обе подписки выполнены - закрываем модальное окно и даем отмычку
            setTimeout(() => {
                closeSubscriptionModal();
                // Перезапускаем получение отмычки
                getLockpick();
            }, 1000);
        }
    } else {
        updateButtonText(button, '❌ Не подписан');
        button.className = 'subscribe-btn error';

        setTimeout(() => {
            updateButtonText(button, 'Подписаться');
            button.className = 'subscribe-btn';
            button.disabled = false;
        }, 2000);
    }
}

// Функция тестирования API
async function testAPI() {
    // Создаем модальное окно для результатов
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        overflow-y: auto;
        padding: 20px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: #1a1a1a;
        border: 2px solid #FFD700;
        border-radius: 15px;
        padding: 20px;
        max-width: 90%;
        width: 400px;
        color: white;
        max-height: 80vh;
        overflow-y: auto;
    `;

    let resultHTML = '<h3 style="color: #FFD700; margin-bottom: 15px;">🔍 Результаты теста API</h3>';

    // Получаем ID пользователя
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const userName = window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || 'Неизвестно';

    resultHTML += `<div style="margin-bottom: 15px; padding: 10px; background: rgba(255, 255, 255, 0.1); border-radius: 5px;">`;
    resultHTML += `<strong>👤 Ваши данные:</strong><br>`;
    resultHTML += `User ID: <span style="color: #4CAF50">${userId || 'Не определен'}</span><br>`;
    resultHTML += `Имя: ${userName}`;
    resultHTML += `</div>`;

    const testUserId = userId || '190202791';

    // Тестируем оба канала
    const channels = [
        { id: '-1001143184637', name: 'Алексей Руденко' },
        { id: '-1002214737652', name: 'PREMIUM NEWS' }
    ];

    resultHTML += '<div style="margin-bottom: 15px;"><strong>📊 Проверка подписок:</strong></div>';

    for (const channel of channels) {
        try {
            const response = await fetch('https://ar-arena-check.levbekk.workers.dev', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: testUserId,
                    channel_id: channel.id
                })
            });

            const data = await response.json();

            resultHTML += `<div style="margin-bottom: 10px; padding: 10px; background: rgba(255, 255, 255, 0.05); border-radius: 5px;">`;
            resultHTML += `<strong>${channel.name}:</strong><br>`;
            resultHTML += `Channel ID: ${channel.id}<br>`;
            // Используем ту же логику проверки, что и в основной функции
            // Проверяем строковые значения тоже, так как JSON может их как строки передать
            const isSubscribed = data.subscribed === true ||
                               data.subscribed === 'true' ||
                               data.subscribed === "true" ||
                               String(data.subscribed).toLowerCase() === 'true' ||
                               data.subscribed === 1 ||
                               data.subscribed === '1';

            const hasValidStatus = data.status === 'administrator' ||
                                  data.status === 'member' ||
                                  data.status === 'creator' ||
                                  String(data.status).toLowerCase() === 'administrator';

            // Обратная совместимость со старым форматом API (is_member)
            const oldFormatMember = data.is_member === true ||
                                   data.is_member === 'true' ||
                                   data.is_member === "true" ||
                                   String(data.is_member).toLowerCase() === 'true' ||
                                   data.is_member === 1 ||
                                   data.is_member === '1';

            const isMember = isSubscribed || hasValidStatus || oldFormatMember;

            // Добавляем детальное логирование для отладки
            console.log(`${channel.name} проверка:`, {
                data: data,
                isSubscribed: isSubscribed,
                hasValidStatus: hasValidStatus,
                oldFormatMember: oldFormatMember,
                finalResult: isMember
            });

            resultHTML += `Статус: ${isMember ? '<span style="color: #4CAF50">✅ ПОДПИСАН</span>' : '<span style="color: #f44336">❌ НЕ ПОДПИСАН</span>'}<br>`;
            resultHTML += `<small style="color: #888">Ответ API: ${JSON.stringify(data)}</small>`;
            resultHTML += `</div>`;

        } catch (error) {
            resultHTML += `<div style="margin-bottom: 10px; padding: 10px; background: rgba(255, 0, 0, 0.1); border-radius: 5px;">`;
            resultHTML += `<strong>${channel.name}:</strong><br>`;
            resultHTML += `<span style="color: #f44336">⚠️ Ошибка: ${error.message}</span>`;
            resultHTML += `</div>`;
        }
    }

    // Добавляем кнопку закрытия в синем стиле
    resultHTML += `<button onclick="this.parentElement.parentElement.remove()" style="
        background: linear-gradient(135deg, #4A90E2, #357ABD);
        color: white;
        border: none;
        padding: 15px 25px;
        border-radius: 12px;
        cursor: pointer;
        width: 100%;
        margin-top: 20px;
        font-weight: 600;
        font-size: 16px;
        box-shadow: 0 4px 15px rgba(74, 144, 226, 0.3);
        transition: all 0.3s ease;
    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(74, 144, 226, 0.4)'"
       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(74, 144, 226, 0.3)'">Закрыть</button>`;

    content.innerHTML = resultHTML;
    modal.appendChild(content);
    document.body.appendChild(modal);
}

// Инициализация при загрузке
// Убрал функцию quickRestoreOpenedChest так как теперь сундуки генерируются правильно в HTML

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== Инициализация страницы vault ===');

    // Проверка для админов
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const isAdmin = userId === 190202791 || userId === '190202791' ||
                    userId === 5834159353 || userId === '5834159353';

    console.log('User ID:', userId, 'Is Admin:', isAdmin);

    // Инициализируем счетчик отмычек при загрузке
    const currentLockpicks = parseInt(localStorage.getItem('lockpicksAvailable') || '0');
    updateLockpickCounter(currentLockpicks);

    // Получаем элементы
    const button = document.getElementById('lockpickBtn');
    const info = document.querySelector('.lockpick-info');
    const instruction = document.getElementById('instructionText');

    if (!button) {
        console.error('Кнопка lockpickBtn не найдена!');
        return;
    }

    // Проверяем, был ли уже открыт кейс сегодня
    const chestOpenedDate = localStorage.getItem('chestOpenedDate');
    const today = new Date().toDateString();
    const chestAlreadyOpenedToday = chestOpenedDate === today;

    if (chestAlreadyOpenedToday) {
        console.log('Кейс уже был открыт сегодня');

        // Получаем сохраненную награду
        const todayReward = parseInt(localStorage.getItem('todayReward') || '0');

        // Показываем кнопку приглушенной
        button.style.opacity = '0.5';
        button.style.cursor = 'not-allowed';
        button.disabled = true;
        button.classList.add('disabled');

        // Показываем информацию о взломе
        if (info) {
            info.innerHTML = `
                <div style="text-align: center;">
                    <div style="color: rgba(255, 255, 255, 0.8); margin-bottom: 8px;">Сегодня вы взломали кейс</div>
                    <div style="color: #FFD700; font-size: 18px; font-weight: 600; margin-bottom: 10px;">Ваша награда: ${todayReward} AR</div>
                    <div style="color: rgba(255, 255, 255, 0.6); font-size: 13px;">Следующая попытка доступна через:</div>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px;">
                        <img src="icons/time.png" style="width: 20px; height: 20px; opacity: 0.9;">
                        <div id="nextTimer" style="color: #FFD700; font-size: 16px; font-weight: 500;"></div>
                    </div>
                </div>
            `;
            info.style.display = 'block';
        }

        // Запускаем таймер
        updateNextLockpickTimer();
        setInterval(updateNextLockpickTimer, 1000);

        // Сундуки уже правильно отображены через HTML генерацию - не трогаем их

        return; // Выходим, больше ничего не делаем
    }

    // Проверяем, есть ли у пользователя неиспользованная отмычка
    const hasLockpick = localStorage.getItem('hasLockpick') === 'true';
    if (hasLockpick && !isAdmin) {
        console.log('У пользователя есть неиспользованная отмычка, активируем сундуки');
        // Скрываем кнопку получения отмычки
        button.style.display = 'none';
        if (info) info.style.display = 'none';

        if (instruction) {
            instruction.style.display = 'block';
            instruction.innerHTML = '<p>Выбери кейс</p>';
        }

        // Активируем сундуки
        enableChests();
        return;
    }

    // Проверяем, можно ли получить отмычку
    const canClaim = canClaimLockpick();
    console.log('Can claim lockpick:', canClaim);

    if (!canClaim && !isAdmin) {
        console.log('Отмычка уже была получена сегодня, блокируем кнопку');

        // Вычисляем оставшееся время до полуночи
        const now = new Date();
        const midnight = new Date(now);
        midnight.setDate(midnight.getDate() + 1);
        midnight.setHours(0, 0, 0, 0);
        const timeLeft = midnight - now;

        // Форматируем время
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

        // Блокируем кнопку и показываем таймер
        button.innerHTML = `<img src="icons/kiy.png?v=1758366341" alt="Отмычка" class="lockpick-icon">
                          <span>⏰ Через ${hours}ч ${minutes}мин</span>`;
        button.disabled = true;
        button.classList.add('disabled');
        button.style.opacity = '0.6';
        button.style.cursor = 'not-allowed';
    } else {
        console.log('Отмычка доступна для получения');
        // Кнопка активна
        button.innerHTML = `<img src="icons/kiy.png?v=1758366341" alt="Отмычка" class="lockpick-icon">
                          <span>Получить отмычку</span>`;
        button.disabled = false;
        button.classList.remove('disabled');
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
    }
});

// Функция сброса данных Vault (для админки)
function resetVaultData() {
    if (confirm('Вы уверены, что хотите сбросить все данные Vault?')) {
        // Сброс всех данных Vault
        localStorage.removeItem('lastLockpickClaim');
        localStorage.removeItem('hasLockpick');
        localStorage.removeItem('lockpicksAvailable');
        localStorage.removeItem('chestOpenedDate');
        localStorage.removeItem('todayReward');
        localStorage.removeItem('lastOpenedChest');
        localStorage.removeItem('dailyLockpicks');
        localStorage.removeItem('ar_balance');
        localStorage.removeItem('total_earned');

        // Показываем уведомление
        alert('Данные Vault успешно сброшены!');

        // Перезагружаем страницу
        location.reload();
    }
}

// Экспортируем функции в глобальную область для использования в HTML
window.getLockpick = getLockpick;
window.claimReward = claimReward;
window.goBack = goBack;
window.handleSpecialTask = handleSpecialTask;
window.closeSubscriptionModal = closeSubscriptionModal;
window.resetVaultData = resetVaultData;