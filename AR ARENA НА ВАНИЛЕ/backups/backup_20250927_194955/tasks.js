// Инициализация Telegram WebApp
if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
}

// Проверка выполнения ежедневного задания
function isDailyTaskCompletedToday() {
    const today = new Date().toDateString();
    const completedDate = localStorage.getItem('daily_task_completed_date');
    return completedDate === today;
}

// Показываем спецзадания если НИКОГДА не выполнял
function showSpecialOffers() {
    // Показываем только если НИКОГДА не выполнял
    const alex_completed = localStorage.getItem('subscription_alexrich2018_completed');
    const premium_completed = localStorage.getItem('subscription_premium_news_completed');
    
    if (!alex_completed || !premium_completed) {
        document.getElementById('specialTasksSection').style.display = 'block';
        // Скрываем выполненные задания
        if (alex_completed) hideSpecialTask(1);
        if (premium_completed) hideSpecialTask(2);
    }
}

// Скрываем конкретное спецзадание
function hideSpecialTask(taskId) {
    const taskElement = document.getElementById(`specialTask${taskId}`);
    if (taskElement) {
        taskElement.style.display = 'none';
        console.log(`Скрываем спецзадание ${taskId}`);
    }
}

// Проверяем активные подписки через API
async function checkActiveSubscriptions() {
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || '190202791';
    
    // Проверяем реальную подписку через API
    const alexActive = await checkSubscription('-1001143184637');
    const premiumActive = await checkSubscription('-1002214737652');
    
    // Сохраняем статус активности
    localStorage.setItem('subscription_alexrich2018_active', alexActive);
    localStorage.setItem('subscription_premium_news_active', premiumActive);
    
    return { alexActive, premiumActive };
}

// Проверяем доступ к заданию
async function validateTaskAccess(taskElement) {
    const { alexActive, premiumActive } = await checkActiveSubscriptions();
    
    if (!alexActive || !premiumActive) {
        // Блокируем задание
        taskElement.disabled = true;
        
        // Показываем какие каналы нужны
        const missing = [];
        if (!alexActive) missing.push('Алексей Руденко | Криптоинвестор');
        if (!premiumActive) missing.push('PREMIUM NEWS');
        
        alert(`Для выполнения задания подпишитесь на:\n${missing.join('\n')}`);
        
        // Показываем кнопки подписки (но не спецзадания!)
        showSubscriptionButtons(missing);
        return false;
    }
    return true;
}

// Показываем нужные спецзадания
async function showRequiredSpecialTasks() {
    // Делаем реальную проверку подписок через Cloudflare Worker
    const alexSubscribed = await checkSubscription('-1001143184637'); // @AlexRich2018
    const premiumSubscribed = await checkSubscription('-1002214737652'); // @premium_news
    
    const specialSection = document.getElementById('specialTasksSection');
    
    // Показываем блок если есть незавершенные подписки
    if (!alexSubscribed || !premiumSubscribed) {
        if (specialSection) {
            specialSection.style.display = 'block';
            
            // Показываем только те задания, на которые не подписан
            if (alexSubscribed) {
                // Скрываем задание AlexRich2018
                const task1 = document.getElementById('specialTask1');
                if (task1) task1.style.display = 'none';
            } else {
                // Показываем задание AlexRich2018
                const task1 = document.getElementById('specialTask1');
                if (task1) task1.style.display = 'block';
            }
            
            if (premiumSubscribed) {
                // Скрываем задание PREMIUM NEWS
                const task2 = document.getElementById('specialTask2');
                if (task2) task2.style.display = 'none';
            } else {
                // Показываем задание PREMIUM NEWS
                const task2 = document.getElementById('specialTask2');
                if (task2) task2.style.display = 'block';
            }
        }
    }
}

// Рендеринг ежедневных заданий
function renderDailyTasks() {
    // ПЕРВАЯ проверка - выполнено ли сегодня
    if (isDailyTaskCompletedToday()) {
        // Просто ничего не показываем
        const dailyTask1 = document.getElementById('dailyTask1');
        if (dailyTask1) {
            dailyTask1.remove();
        }
        return;
    }

    console.log('Ежедневные задания доступны для выполнения');
}

// Рендеринг заданий обучения
function renderEducationTasks() {
    // Задания обучения уже есть в HTML, просто обновляем их состояние
    console.log('Рендерим задания обучения');
}

// Конфигурация заданий
const tasks = {
    // Спецзадания
    special: {
        1: {
            channelId: '-1001143184637',
            channelName: '@AlexRich2018',
            channelTitle: 'Алексей Руденко | Криптоинвестор',
            reward: 100
        },
        2: {
            channelId: '-1002214737652',
            channelName: '@premium_news',
            channelTitle: 'PREMIUM NEWS',
            reward: 100
        }
    },
    // Ежедневные задания
    daily: {
        1: { reward: 10, type: 'daily_login' }
    },
    // Обучение
    learning: {
        1: { id: 'edu_1', title: 'Квиз: Криптовалюты', reward: 75, icon: '🎯', type: 'crypto_quiz' }
    }
};

let completedTasks = 0;
let earnedAmount = 0;
let streakDays = 0;

// Инициализация
document.addEventListener('DOMContentLoaded', async function() {
    // Загружаем данные пользователя
    loadUserProfile();

    // ПЕРВЫМ ДЕЛОМ скрываем выполненное ежедневное задание
    if (isDailyTaskCompletedToday()) {
        const dailyTask1 = document.getElementById('dailyTask1');
        if (dailyTask1) {
            dailyTask1.style.display = 'none'; // Мгновенно скрываем
        }
    }

    // Принудительная проверка подписок
    await forceCheckSubscriptions();

    // Загружаем остальные задания (renderDailyTasks сама проверит и удалит карточку)
    renderDailyTasks();
    renderEducationTasks();

    // Показываем кнопку админки для администраторов
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    console.log('User ID:', userId);
    console.log('Telegram WebApp:', window.Telegram?.WebApp);

    // Проверяем права администратора и показываем кнопку админки
    const allowedAdmins = [190202791, '190202791', 5834159353, '5834159353'];
    if (allowedAdmins.includes(userId)) {
        const adminButton = document.getElementById('adminButton');
        if (adminButton) {
            adminButton.style.display = 'block';
            console.log('Показываем кнопку админки для администратора');
        }
    }
    
    // Временно показываем кнопки всем для тестирования
    const resetContainer = document.getElementById('resetButtonContainer');
    if (resetContainer) {
        resetContainer.style.display = 'block';
        console.log('Показываем кнопки сброса (временно для всех)');
    } else {
        console.log('resetButtonContainer не найден!');
    }
    
    // Оригинальная логика (закомментирована для тестирования)
    /*
    if (userId === 190202791 || userId === '190202791' || 
        userId === 5834159353 || userId === '5834159353') {
        const resetContainer = document.getElementById('resetButtonContainer');
        if (resetContainer) {
            resetContainer.style.display = 'block';
            console.log('Показываем кнопки сброса для админа');
        }
    }
    */
    
    // Загружаем состояния заданий
    await loadTaskStates();
    updateStats();
    // Убираем автоматическую проверку бонуса - только по клику!
});

// Загрузка профиля пользователя
function loadUserProfile() {
    console.log('Загружаем профиль пользователя...');
    const tg = window.Telegram?.WebApp;
    const user = tg?.initDataUnsafe?.user;
    
    console.log('Telegram WebApp:', tg);
    console.log('User data:', user);
    
    if (user) {
        // Имя пользователя (если элемент существует)
        const fullName = (user.first_name + ' ' + (user.last_name || '')).trim();
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = fullName;
        }
        console.log('Имя пользователя:', fullName);

        // Аватарка (если есть)
        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            if (user.photo_url) {
                avatar.src = user.photo_url;
                avatar.style.display = 'block';
                console.log('Аватар загружен:', user.photo_url);
            } else {
                // Показываем заглушку с первой буквой имени
                avatar.style.display = 'flex';
                avatar.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)';
                avatar.style.color = '#000';
                avatar.style.fontSize = '12px';
                avatar.style.fontWeight = 'bold';
                avatar.style.alignItems = 'center';
                avatar.style.justifyContent = 'center';
                avatar.textContent = user.first_name ? user.first_name[0].toUpperCase() : '?';
                console.log('Аватар-заглушка создан');
            }
        }
        
        // Баланс из localStorage или начальный
        const balance = localStorage.getItem('ar_balance') || 0;
        document.getElementById('userBalance').textContent = balance;
        document.getElementById('headerBalance').textContent = balance;
        console.log('Баланс:', balance);
    } else {
        // Если нет данных пользователя - тестовые данные
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = 'Тестовый пользователь';
        }

        // Тестовый аватар
        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            avatar.style.display = 'flex';
            avatar.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)';
            avatar.style.color = '#000';
            avatar.style.fontSize = '12px';
            avatar.style.fontWeight = 'bold';
            avatar.style.alignItems = 'center';
            avatar.style.justifyContent = 'center';
            avatar.textContent = 'Т';
        }
        
        // Баланс из localStorage или начальный
        const balance = localStorage.getItem('ar_balance') || 0;
        document.getElementById('userBalance').textContent = balance;
        document.getElementById('headerBalance').textContent = balance;
        console.log('Используем тестовые данные');
    }
}

// Загрузка состояний заданий
async function loadTaskStates() {
    console.log('=== ЗАГРУЗКА СОСТОЯНИЙ ЗАДАНИЙ ===');

    // Проверяем ежедневное задание
    if (isDailyTaskCompletedToday()) {
        // Удаляем из DOM если есть
        const dailyTask1 = document.getElementById('dailyTask1');
        if (dailyTask1) {
            dailyTask1.remove();
            console.log('Удалили выполненное ежедневное задание');
        }
    }

    // Показываем нужные спецзадания
    await showRequiredSpecialTasks();
    
    // Ежедневные задания
    for (let taskId in tasks.daily) {
        const state = localStorage.getItem(`daily_task_${taskId}_state`);
        if (state === 'completed') {
            completeDailyTask(taskId);
        }
    }
    
    // Обучение
    for (let taskId in tasks.learning) {
        const state = localStorage.getItem(`learning_task_${taskId}_state`);
        if (state === 'completed') {
            completeLearningTask(taskId);
        }
    }
}


// Обработка спецзаданий
async function handleSpecialTask(taskId) {
    const task = tasks.special[taskId];
    const button = document.getElementById(`btnSpecial${taskId}`);
    
    if (button.classList.contains('check')) {
        await checkSpecialSubscription(taskId);
    } else if (button.classList.contains('subscribe')) {
        openChannel(taskId);
    }
}

// Проверка подписки для спецзаданий
async function checkSpecialSubscription(taskId) {
    const task = tasks.special[taskId];
    const button = document.getElementById(`btnSpecial${taskId}`);
    
    // Состояние проверки
    button.className = 'task-button checking';
    button.innerHTML = '⏳ Проверяю...';
    button.disabled = true;
    
    try {
        const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || '190202791';
        
        const response = await fetch('https://ar-arena-check.levbekk.workers.dev', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                channel_id: task.channelId
            })
        });
        
        const data = await response.json();
        
        if (data.subscribed) {
            // Подписан - завершаем задание
            completeSpecialTask(taskId);
        } else {
            // Не подписан - показываем кнопку подписки
            button.className = 'task-button subscribe';
            button.innerHTML = '📱 Подписаться на канал';
            button.disabled = false;
        }
        
    } catch (error) {
        console.error('Ошибка проверки подписки:', error);
        // В случае ошибки возвращаем к проверке
        button.className = 'task-button check';
        button.innerHTML = '🔍 Проверить подписку';
        button.disabled = false;
    }
}

// Открытие канала
function openChannel(taskId) {
    const task = tasks.special[taskId];
    const channelUsername = task.channelName.replace('@', '');
    const channelUrl = `https://t.me/${channelUsername}`;
    
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.openTelegramLink(channelUrl);
    } else {
        window.open(channelUrl, '_blank');
    }
    
    // Возвращаем кнопку к проверке
    setTimeout(() => {
        const button = document.getElementById(`btnSpecial${taskId}`);
        button.className = 'task-button check';
        button.innerHTML = '🔍 Проверить подписку';
        button.disabled = false;
    }, 2000);
}

// Завершение спецзадания
function completeSpecialTask(taskId) {
    const task = tasks.special[taskId];
    const button = document.getElementById(`btnSpecial${taskId}`);
    const card = document.getElementById(`specialTask${taskId}`);
    
    // Проверяем, не было ли уже выполнено
    if (button.classList.contains('completed')) {
        return; // Уже выполнено, не начисляем повторно
    }
    
    // Состояние завершения
    button.className = 'task-button completed';
    button.innerHTML = '✅ Получено +100 AR';
    button.disabled = true;
    
    // Помечаем как выполненное НАВСЕГДА
    if (taskId == 1) {
        localStorage.setItem('subscription_alexrich2018_completed', 'true');
        localStorage.setItem('subscription_alexrich2018_active', 'true');
    } else if (taskId == 2) {
        localStorage.setItem('subscription_premium_news_completed', 'true');
        localStorage.setItem('subscription_premium_news_active', 'true');
    }
    
    // Начисляем монеты ТОЛЬКО при первом выполнении
    if (!localStorage.getItem(`special_task_${taskId}_rewarded`)) {
        createCoinAnimation(button, task.reward);
        updateUserBalance(task.reward);
        localStorage.setItem(`special_task_${taskId}_rewarded`, 'true');
    }
    
    // Скрываем задание навсегда
    hideSpecialTask(taskId);
    
    // Проверяем, можно ли скрыть весь блок
    const alex = localStorage.getItem('subscription_alexrich2018_completed');
    const premium = localStorage.getItem('subscription_premium_news_completed');
    if (alex && premium) {
        document.getElementById('specialTasksSection').style.display = 'none';
        // Больше не вызываем checkDailyBonus автоматически
    }
    
    // Обновляем статистику
    updateStats();
}

// Обработка ежедневных заданий
async function handleDailyTask(taskId) {
    const task = tasks.daily[taskId];
    const button = document.getElementById(`btnDaily${taskId}`);
    
    if (taskId === 1) { // Ежедневный вход
        await handleDailyLogin();
    } else {
        // Для других ежедневных заданий пока просто отмечаем как выполненные
        completeDailyTask(taskId);
    }
}

// Проверка ежедневного бонуса
async function checkDailyBonus() {
    const button = document.getElementById('btnDaily1');

    console.log('=== ПРОВЕРКА ЕЖЕДНЕВНОГО БОНУСА ===');

    // Проверяем выполнено ли задание сегодня
    if (isDailyTaskCompletedToday()) {
        // Если уже получено сегодня - удаляем карточку
        const dailyTask1 = document.getElementById('dailyTask1');
        if (dailyTask1) {
            dailyTask1.remove();
        }
        console.log('Уже получено сегодня - задание удалено');
        return;
    }

    // Делаем ТОЛЬКО реальную проверку подписок через Cloudflare Worker
    const alexSubscribed = await checkSubscription('-1001143184637'); // @AlexRich2018
    const premiumSubscribed = await checkSubscription('-1002214737652'); // @premium_news
    
    console.log('Результат проверки подписок:', { alexSubscribed, premiumSubscribed });
    
    if (!alexSubscribed || !premiumSubscribed) {
        console.log('НЕ ПОДПИСАН - блокируем бонус');
        // Если не подписан - блокируем бонус и показываем спецзадания
        await showRequiredSpecialTasks();
        button.innerHTML = '❌ Подпишитесь на каналы';
        button.disabled = true;
        button.className = 'task-button';
        button.style.background = '#666';
        return;
    }
    
    console.log('ПОДПИСАН - проверяем можно ли получить бонус');
    // Если подписан - проверяем можно ли получить бонус
    const lastClaim = localStorage.getItem('last_daily_claim');
    const now = Date.now();
    
    if (!lastClaim || now - parseInt(lastClaim) >= 24*60*60*1000) {
        // Можно получить бонус
        button.innerHTML = '🎁 Получить бонус';
        button.disabled = false;
        button.className = 'task-button check';
        button.style.background = '';
        console.log('Можно получить бонус');
    } else {
        // Уже получено сегодня
        button.innerHTML = '✅ Уже получено сегодня';
        button.disabled = true;
        button.className = 'task-button completed';
        console.log('Уже получено сегодня');
    }
}

// Обработка ежедневного входа
async function handleDailyLogin() {
    const button = document.getElementById('btnDaily1');
    
    console.log('=== ОБРАБОТКА ЕЖЕДНЕВНОГО ВХОДА ===');
    
    // Делаем ТОЛЬКО реальную проверку подписок через Cloudflare Worker
    const alexSubscribed = await checkSubscription('-1001143184637'); // @AlexRich2018
    const premiumSubscribed = await checkSubscription('-1002214737652'); // @premium_news
    
    console.log('Результат проверки подписок:', { alexSubscribed, premiumSubscribed });
    
    if (!alexSubscribed || !premiumSubscribed) {
        console.log('НЕ ПОДПИСАН - показываем спецзадания');
        // Если не подписан - показываем нужные спецзадания
        await showRequiredSpecialTasks();
        
        // Показываем какие именно каналы нужно подписать
        let missingChannels = [];
        if (!alexSubscribed) missingChannels.push('@AlexRich2018');
        if (!premiumSubscribed) missingChannels.push('@premium_news');
        
        alert(`Для получения ежедневного бонуса подпишитесь на каналы: ${missingChannels.join(', ')}`);
        return;
    }
    
    console.log('ПОДПИСАН - проверяем можно ли получить бонус');
    // Логика ежедневного бонуса
    const lastClaim = localStorage.getItem('last_daily_claim');
    const now = Date.now();
    
    if (!lastClaim || now - parseInt(lastClaim) >= 24*60*60*1000) {
        console.log('Начисляем бонус');
        // Начисляем награду
        updateUserBalance(10);
        localStorage.setItem('last_daily_claim', now.toString());
        button.innerHTML = '✅ Получено';
        button.disabled = true;
        button.className = 'task-button completed';
        
        // Показываем анимацию
        createCoinAnimation(button, 10);

        // Помечаем задание как выполненное сегодня
        const today = new Date().toDateString();
        localStorage.setItem('daily_task_completed_date', today);

        // Скрываем карточку задания
        const taskCard = button.closest('.task-card');
        if (taskCard) {
            taskCard.style.animation = 'fadeOut 0.5s';
            setTimeout(() => taskCard.remove(), 500);
        }
        
        updateStats();
    } else {
        button.innerHTML = '✅ Уже получено сегодня';
        button.disabled = true;
        button.className = 'task-button completed';
    }
}

// Завершение ежедневного задания
function completeDailyTask(taskId) {
    const task = tasks.daily[taskId];
    const button = document.getElementById(`btnDaily${taskId}`);
    const card = document.getElementById(`dailyTask${taskId}`);
    
    // Состояние завершения
    button.className = 'task-button completed';
    button.innerHTML = `✅ Получено +${task.reward} AR`;
    button.disabled = true;
    
    // Сохраняем состояние
    localStorage.setItem(`daily_task_${taskId}_state`, 'completed');
    
    // Показываем анимацию монет
    createCoinAnimation(button, task.reward);
    
    // Обновляем баланс и статистику
    updateUserBalance(task.reward);
    updateStats();
}

// Обработка заданий обучения
function handleLearningTask(taskId) {
    const task = tasks.learning[taskId];
    const button = document.getElementById(`btnLearning${taskId}`);

    if (task.type === 'crypto_quiz') {
        // Для квиза показываем сообщение "В разработке"
        alert('Задание в разработке');

        // Обновляем текст кнопки
        button.innerHTML = '🔄 В разработке';

        // Через 2 секунды возвращаем исходный текст
        setTimeout(() => {
            button.innerHTML = '🔍 Проверить';
        }, 2000);
    } else {
        // Для других заданий просто отмечаем как выполненные
        completeLearningTask(taskId);
    }
}

// Завершение задания обучения
function completeLearningTask(taskId) {
    const task = tasks.learning[taskId];
    const button = document.getElementById(`btnLearning${taskId}`);
    const card = document.getElementById(`learningTask${taskId}`);
    
    // Состояние завершения
    button.className = 'task-button completed';
    button.innerHTML = `✅ Получено +${task.reward} AR`;
    button.disabled = true;
    
    // Сохраняем состояние
    localStorage.setItem(`learning_task_${taskId}_state`, 'completed');
    
    // Показываем анимацию монет
    createCoinAnimation(button, task.reward);
    
    // Обновляем баланс и статистику
    updateUserBalance(task.reward);
    updateStats();
}

// Проверка подписки (общая функция)
async function checkSubscription(channelId) {
    try {
        const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || '190202791';
        
        console.log('Проверяем подписку:', { userId, channelId });
        
        const response = await fetch('https://ar-arena-check.levbekk.workers.dev', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                channel_id: channelId
            })
        });
        
        const data = await response.json();
        console.log('Результат проверки подписки:', data);
        
        return data.subscribed;
        
    } catch (error) {
        console.error('Ошибка проверки подписки:', error);
        return false;
    }
}

// Улучшенная анимация монет
function createCoinAnimation(button, amount) {
    // Создаем контейнер для монет
    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10000;
    `;
    document.body.appendChild(container);
    
    // Позиция кнопки
    const rect = button.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    
    // Создаем 15 монет с разными траекториями
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            const coin = document.createElement('div');
            const angle = (Math.PI * 2 * i) / 15;
            const velocity = 5 + Math.random() * 3;
            
            coin.innerHTML = '💰';
            coin.style.cssText = `
                position: absolute;
                font-size: 30px;
                left: ${startX}px;
                top: ${startY}px;
                transform: translate(-50%, -50%);
                animation: coinFly 1.5s ease-out forwards;
                --end-x: ${Math.sin(angle) * velocity * 20}px;
                --end-y: ${-Math.abs(Math.cos(angle)) * velocity * 30 - 100}px;
            `;
            
            container.appendChild(coin);
            
            // Добавляем золотые частицы
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: linear-gradient(135deg, #FFD700, #FFA500);
                border-radius: 50%;
                left: ${startX + Math.random() * 40 - 20}px;
                top: ${startY + Math.random() * 40 - 20}px;
                animation: particleFade 1s ease-out forwards;
            `;
            container.appendChild(particle);
            
        }, i * 50);
    }
    
    // Показываем текст +100 AR
    const rewardText = document.createElement('div');
    rewardText.innerHTML = `+${amount} AR`;
    rewardText.style.cssText = `
        position: absolute;
        left: ${startX}px;
        top: ${startY}px;
        transform: translate(-50%, -50%);
        font-size: 32px;
        font-weight: bold;
        background: linear-gradient(135deg, #FFD700, #FFA500);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: rewardPop 1.5s ease-out forwards;
        z-index: 10001;
    `;
    container.appendChild(rewardText);
    
    // Удаляем контейнер после анимации
    setTimeout(() => container.remove(), 2000);
}

// Обновление баланса пользователя
function updateUserBalance(reward) {
    const currentBalance = parseInt(localStorage.getItem('ar_balance') || '0');
    const newBalance = currentBalance + reward;
    localStorage.setItem('ar_balance', newBalance.toString());
    document.getElementById('userBalance').textContent = newBalance;
    document.getElementById('headerBalance').textContent = newBalance;
}

// Обновление статистики
function updateStats() {
    // Подсчитываем выполненные задания
    let completed = 0;
    let earned = 0;
    
    // Спецзадания
    for (let taskId in tasks.special) {
        if (localStorage.getItem(`special_task_${taskId}_state`) === 'completed') {
            completed++;
            earned += tasks.special[taskId].reward;
        }
    }
    
    // Ежедневные задания
    for (let taskId in tasks.daily) {
        if (localStorage.getItem(`daily_task_${taskId}_state`) === 'completed') {
            completed++;
            earned += tasks.daily[taskId].reward;
        }
    }
    
    // Обучение
    for (let taskId in tasks.learning) {
        if (localStorage.getItem(`learning_task_${taskId}_state`) === 'completed') {
            completed++;
            earned += tasks.learning[taskId].reward;
        }
    }
    
    // Обновляем отображение
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('earnedAmount').textContent = earned;
    
    // Streak (упрощенная логика)
    const streak = localStorage.getItem('streak_days') || 0;
    document.getElementById('streakDays').textContent = streak;
}


// Функция сброса для тестирования
function resetTasksForTesting() {
    if (confirm('Сбросить все задания для тестирования?')) {
        // Очищаем ВСЕ из localStorage
        localStorage.clear();
        
        // Принудительно сбрасываем состояния в памяти
        if (window.tasks) {
            // Сбрасываем спецзадания
            for (let taskId in tasks.special) {
                tasks.special[taskId].completed = false;
            }
            // Сбрасываем ежедневные
            for (let taskId in tasks.daily) {
                tasks.daily[taskId].completed = false;
            }
            // Сбрасываем обучение
            for (let taskId in tasks.learning) {
                tasks.learning[taskId].completed = false;
            }
        }
        
        // Перезагружаем страницу
        location.reload();
    }
}

// Функция сброса только ежедневного бонуса для тестирования
function resetDailyBonusOnly() {
    if (confirm('Сбросить только ежедневный бонус для тестирования?')) {
        // Удаляем только данные ежедневного бонуса
        localStorage.removeItem('last_daily_claim');
        localStorage.removeItem('daily_task_1_state');
        
        // Обновляем состояние кнопки ежедневного бонуса
        const button = document.getElementById('btnDaily1');
        if (button) {
            button.innerHTML = '🎁 Получить бонус';
            button.disabled = false;
            button.className = 'task-button check';
            button.style.background = '';
        }
        
        console.log('Ежедневный бонус сброшен');
    }
}

// Функция очистки старых данных о подписках
function clearOldSubscriptionData() {
    if (confirm('Очистить старые данные о подписках? Это заставит систему проверить подписки заново.')) {
        // Удаляем старые записи о выполнении подписок
        localStorage.removeItem('subscription_alexrich2018_completed');
        localStorage.removeItem('subscription_premium_news_completed');
        localStorage.removeItem('subscription_alexrich2018_active');
        localStorage.removeItem('subscription_premium_news_active');
        
        console.log('Старые данные о подписках очищены');
        location.reload();
    }
}

// Тестовая функция для проверки подписок
async function testSubscriptions() {
    console.log('=== ТЕСТ ПОДПИСОК ===');
    
    const alexSubscribed = await checkSubscription('-1001143184637');
    const premiumSubscribed = await checkSubscription('-1002214737652');
    
    console.log('AlexRich2018 подписан:', alexSubscribed);
    console.log('Premium News подписан:', premiumSubscribed);
    
    alert(`Результат проверки подписок:\n@AlexRich2018: ${alexSubscribed ? '✅ Подписан' : '❌ Не подписан'}\n@premium_news: ${premiumSubscribed ? '✅ Подписан' : '❌ Не подписан'}`);
    
    return { alexSubscribed, premiumSubscribed };
}

// Принудительная проверка подписок при загрузке
async function forceCheckSubscriptions() {
    console.log('=== ПРИНУДИТЕЛЬНАЯ ПРОВЕРКА ПОДПИСОК ===');

    const alexSubscribed = await checkSubscription('-1001143184637');
    const premiumSubscribed = await checkSubscription('-1002214737652');

    console.log('Принудительная проверка:', { alexSubscribed, premiumSubscribed });

    // Если не подписан - показываем спецзадания (но НЕ засчитываем задание!)
    if (!alexSubscribed || !premiumSubscribed) {
        console.log('НЕ ПОДПИСАН - показываем спецзадания');
        await showRequiredSpecialTasks();
    } else {
        console.log('ПОДПИСАН - скрываем спецзадания');
        const specialSection = document.getElementById('specialTasksSection');
        if (specialSection) {
            specialSection.style.display = 'none';
        }
    }

    return { alexSubscribed, premiumSubscribed };
}

// Функция сброса сейфов
function resetVaults() {
    if (confirm('Сбросить все сейфы и отмычки?')) {
        // Сброс данных сейфов
        localStorage.removeItem('last_lockpick_date');
        localStorage.removeItem('lastLockpickClaim');
        localStorage.removeItem('vaultState');
        localStorage.removeItem('totalVaultRewards');
        localStorage.removeItem('openedVaults');
        localStorage.removeItem('dailyLockpicks');
        alert('💎 Сейфы и отмычки сброшены!');
    }
}
