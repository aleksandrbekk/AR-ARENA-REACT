// Инициализация Telegram WebApp
const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

// Username вашего бота
const BOT_USERNAME = 'ARARENA_BOT';

// Получаем данные пользователя
const user = tg?.initDataUnsafe?.user || window.currentUser;
const userId = user?.telegram_id || user?.id;

// Генерируем реферальную ссылку через бота
// ВАЖНО: Используем ID текущего пользователя, а не захардкоженный
const refLink = userId ? `https://t.me/${BOT_USERNAME}?start=ref_${userId}` : '';

// Устанавливаем ссылку в поле при загрузке
document.addEventListener('DOMContentLoaded', () => {
    const refLinkInput = document.getElementById('refLink');
    if (refLinkInput) {
        refLinkInput.value = refLink;
        console.log('Установлена реферальная ссылка:', refLink);
    }

    // Показываем ID пользователя для отладки
    console.log('Ваш Telegram ID:', userId);
    console.log('Ваша реферальная ссылка:', refLink);

    // Обновляем баланс из localStorage или currentUser
    const balanceElement = document.getElementById('userBalance');
    if (balanceElement) {
        const balance = window.currentUser?.balance_ar ||
                       localStorage.getItem('ar_balance') ||
                       '0';
        balanceElement.textContent = balance;
    }

    // Загружаем статистику
    loadReferralStats();
});

// Типы лендингов
const landingTypes = {
    main: 'landing-ar.html',
    futures: 'landing-ar.html',
    spot: 'landing-ar.html',
    gaming: 'landing-ar.html'
};

// Функции для работы с лендингами
function openLanding(type) {
    const url = `${landingTypes[type]}?ref=${userId}&type=${type}`;
    window.open(url, '_blank');
}

function copyLanding(type) {
    const url = `https://ar.skillnetwork.pro/${landingTypes[type]}?ref=${userId}`;
    navigator.clipboard.writeText(url).then(() => {
        const typeNames = {
            main: 'главный',
            futures: 'Futures',
            spot: 'SPOT',
            gaming: 'Gaming'
        };
        showNotification(`Ссылка на ${typeNames[type]} лендинг скопирована!`);
    }).catch(() => {
        // Fallback для старых браузеров
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);

        const typeNames = {
            main: 'главный',
            futures: 'Futures',
            spot: 'SPOT',
            gaming: 'Gaming'
        };
        showNotification(`Ссылка на ${typeNames[type]} лендинг скопирована!`);
    });
}

// Функция копирования реферальной ссылки
function copyRefLink() {
    const input = document.getElementById('refLink');
    if (!input || !input.value) {
        showNotification('Ошибка: ссылка не найдена');
        return;
    }

    // Метод для мобильных устройств
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(input.value).then(() => {
            showNotification('✅ Реферальная ссылка скопирована!');
        }).catch(err => {
            console.error('Ошибка копирования:', err);
            fallbackCopy(input);
        });
    } else {
        fallbackCopy(input);
    }
}

// Резервный метод копирования
function fallbackCopy(input) {
    input.select();
    input.setSelectionRange(0, 99999); // Для мобильных

    try {
        document.execCommand('copy');
        showNotification('✅ Реферальная ссылка скопирована!');
    } catch (err) {
        console.error('Fallback копирование не удалось:', err);
        showNotification('Ошибка копирования. Выделите и скопируйте вручную.');
    }
}

// Функция поделиться
function shareRefLink() {
    const text = `🎮 Присоединяйся к AR ARENA!

💰 Получи 50 AR бонус при регистрации
🎯 Зарабатывай выполняя задания
🏆 Участвуй в конкурсах

Регистрируйся по моей ссылке:`;

    if (window.Telegram?.WebApp) {
        // Используем Telegram метод для шаринга
        window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(text)}`);
    } else {
        // Fallback для браузера
        window.open(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(text)}`, '_blank');
    }
}

// Показать уведомление
function showNotification(message) {
    // Удаляем существующие уведомления
    const existingNotifications = document.querySelectorAll('.notification, .copy-notification');
    existingNotifications.forEach(n => n.remove());

    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 30px;
        border-radius: 50px;
        font-size: 14px;
        font-weight: bold;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideDown 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Удаляем через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Загрузка статистики рефералов
function loadReferralStats() {
    // Загружаем количество друзей
    const friendsCount = localStorage.getItem('referrals_count') || '0';
    const totalEarned = localStorage.getItem('referrals_earned') || '0';

    const friendsElement = document.getElementById('totalFriends');
    if (friendsElement) friendsElement.textContent = friendsCount;

    const earnedElement = document.getElementById('totalEarned');
    if (earnedElement) earnedElement.textContent = totalEarned;

    // Определяем ранг
    const friends = parseInt(friendsCount);
    let rank = 'Новичок';
    if (friends >= 100) rank = 'Легенда';
    else if (friends >= 50) rank = 'Мастер';
    else if (friends >= 20) rank = 'Эксперт';
    else if (friends >= 10) rank = 'Продвинутый';
    else if (friends >= 5) rank = 'Активный';
    else if (friends >= 1) rank = 'Начинающий';

    const rankElement = document.getElementById('currentRank');
    if (rankElement) {
        rankElement.textContent = 'РАНГ';
        rankElement.nextElementSibling.textContent = rank;
    }
}

// Модальные окна
function showFriends() {
    const modal = document.getElementById('friendsModal');
    if (modal) modal.style.display = 'block';
}

function showRanks() {
    const modal = document.getElementById('ranksModal');
    if (modal) modal.style.display = 'block';
}

function showTransactions() {
    const modal = document.getElementById('transactionsModal');
    if (modal) modal.style.display = 'block';
}

function showEarningScheme() {
    const modal = document.getElementById('earningModal');
    if (modal) modal.style.display = 'block';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// Закрытие модалок при клике вне
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Добавляем стили для анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }

    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
    }
`;
document.head.appendChild(style);

console.log('[REFERRAL] Модуль реферальной системы загружен');