// ===== SHOP.JS - СИСТЕМА ПОКУПОК И РЕФЕРАЛЬНЫХ НАЧИСЛЕНИЙ =====

// Инициализация Telegram WebApp
const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

// Получаем данные пользователя
const userData = {
    telegram_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id || '190202791',
    balance: parseInt(localStorage.getItem('ar_balance') || '50'),
    referrer: localStorage.getItem('my_referrer') || null
};

// Функция покупки продукта
function buyProduct(productId, price) {
    console.log(`Попытка покупки: ${productId} за ${price} AR`);

    // Подтверждение покупки
    if (!confirm(`💰 Подтвердите покупку\n\nТовар: ${getProductName(productId)}\nЦена: ${price} AR\n\nПродолжить?`)) {
        return;
    }

    // Используем функцию из реферальной системы
    if (window.ReferralSystem && window.ReferralSystem.processPurchase) {
        const success = window.ReferralSystem.processPurchase(productId, price);
        if (success) {
            // Дополнительные действия после покупки
            showSuccessMessage(productId, price);
            updateBalanceDisplay();
            updateHeaderBalance();
        }
    } else {
        // Fallback на старую систему если ReferralSystem не загружена
        // Обновляем текущий баланс
        userData.balance = parseInt(localStorage.getItem('ar_balance') || '50');

        // Проверка баланса
        if (userData.balance < price) {
            alert(`❌ Недостаточно AR монет!\nНужно: ${price} AR\nДоступно: ${userData.balance} AR`);
            return;
        }

        // Списание монет
        userData.balance -= price;
        localStorage.setItem('ar_balance', userData.balance);

        // Обновление отображения баланса
        updateBalanceDisplay();
        updateHeaderBalance();

        // Начисление реферальных бонусов
        processReferralBonus(price);

        // Сохранение транзакции
        saveTransaction('purchase', price, productId);

        // Уведомление об успешной покупке
        showSuccessMessage(productId, price);

        console.log(`✅ Покупка успешна: ${productId} за ${price} AR`);

    } catch (error) {
        console.error('Ошибка при покупке:', error);
        alert('❌ Произошла ошибка при покупке. Попробуйте еще раз.');
    }
}

// Получение названия продукта
function getProductName(productId) {
    const productNames = {
        'test_signal': '🎯 Тестовый сигнал',
        'spot_club': '📈 КЛУБ СПОТ торговли',
        'futures_signals': '⚡ Торговля на фьючерсах'
    };
    return productNames[productId] || 'Неизвестный товар';
}

// Обработка реферальных начислений
function processReferralBonus(purchaseAmount) {
    console.log('Обработка реферальных бонусов за покупку:', purchaseAmount);

    if (!userData.referrer) {
        console.log('У пользователя нет реферера');
        return;
    }

    try {
        // 10% рефереру уровня 1
        const level1Bonus = Math.floor(purchaseAmount * 0.1);
        addReferralBonus(userData.referrer, level1Bonus, 1, 'purchase');
        console.log(`Начислено рефереру L1 ${userData.referrer}: ${level1Bonus} AR`);

        // Получаем реферера уровня 2
        const level2Referrer = getReferrerOfUser(userData.referrer);
        if (level2Referrer) {
            // 5% рефереру уровня 2
            const level2Bonus = Math.floor(purchaseAmount * 0.05);
            addReferralBonus(level2Referrer, level2Bonus, 2, 'purchase');
            console.log(`Начислено рефереру L2 ${level2Referrer}: ${level2Bonus} AR`);
        }

    } catch (error) {
        console.error('Ошибка при начислении реферальных:', error);
    }
}

// Получение реферера пользователя (реферер уровня 2)
function getReferrerOfUser(userId) {
    try {
        const allUsers = JSON.parse(localStorage.getItem('all_users') || '{}');
        return allUsers[userId]?.referrer || null;
    } catch (error) {
        console.error('Ошибка получения реферера:', error);
        return null;
    }
}

// Добавление бонуса рефереру
function addReferralBonus(referrerId, amount, level, source) {
    try {
        // Получаем все реферальные данные
        const referrals = JSON.parse(localStorage.getItem('all_referrals') || '{}');

        if (!referrals[referrerId]) {
            referrals[referrerId] = {
                earned: 0,
                level1_count: 0,
                level2_count: 0,
                transactions: []
            };
        }

        // Начисляем бонус
        referrals[referrerId].earned += amount;

        // Записываем транзакцию
        referrals[referrerId].transactions = referrals[referrerId].transactions || [];
        referrals[referrerId].transactions.push({
            amount: amount,
            level: level,
            source: source,
            from_user: userData.telegram_id,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('ru-RU')
        });

        // Сохраняем
        localStorage.setItem('all_referrals', JSON.stringify(referrals));

        // Обновляем баланс реферера (если он текущий пользователь)
        if (referrerId === userData.telegram_id) {
            const currentBalance = parseInt(localStorage.getItem('ar_balance') || '0');
            localStorage.setItem('ar_balance', currentBalance + amount);
            updateBalanceDisplay();
            updateHeaderBalance();
        }

        console.log(`✅ Бонус начислен: ${amount} AR пользователю ${referrerId} (уровень ${level})`);

    } catch (error) {
        console.error('Ошибка начисления бонуса:', error);
    }
}

// Сохранение транзакции
function saveTransaction(type, amount, details) {
    try {
        const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        const transaction = {
            id: Date.now() + Math.random(),
            user_id: userData.telegram_id,
            type: type,
            amount: amount,
            details: details,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('ru-RU'),
            time: new Date().toLocaleTimeString('ru-RU')
        };

        transactions.push(transaction);
        localStorage.setItem('transactions', JSON.stringify(transactions));

        console.log('Транзакция сохранена:', transaction);

    } catch (error) {
        console.error('Ошибка сохранения транзакции:', error);
    }
}

// Обновление отображения баланса
function updateBalanceDisplay() {
    try {
        const balance = parseInt(localStorage.getItem('ar_balance') || '0');
        const balanceElement = document.getElementById('balance');
        if (balanceElement) {
            balanceElement.textContent = balance;
        }
        userData.balance = balance;
    } catch (error) {
        console.error('Ошибка обновления баланса:', error);
    }
}

// Обновление баланса в шапке
function updateHeaderBalance() {
    try {
        const balance = parseInt(localStorage.getItem('ar_balance') || '0');
        const headerBalance = document.getElementById('userBalance');
        if (headerBalance) {
            headerBalance.textContent = balance;
        }
    } catch (error) {
        console.error('Ошибка обновления баланса в шапке:', error);
    }
}

// Показать сообщение об успешной покупке
function showSuccessMessage(productId, price) {
    const productName = getProductName(productId);
    const message = `✅ Покупка успешна!\n\n${productName}\nСписано: ${price} AR\nОстаток: ${userData.balance} AR`;
    alert(message);
}

// Получение статистики покупок пользователя
function getUserPurchases() {
    try {
        const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        return transactions.filter(t => t.type === 'purchase' && t.user_id === userData.telegram_id);
    } catch (error) {
        console.error('Ошибка получения покупок:', error);
        return [];
    }
}

// Инициализация при загрузке страницы
function initializeShop() {
    console.log('Инициализация магазина...');

    // Обновляем отображение баланса
    updateBalanceDisplay();
    updateHeaderBalance();

    // Загружаем аватар пользователя
    loadUserAvatar();

    // Устанавливаем реферера из URL (если есть)
    checkReferralLink();

    console.log('Пользователь:', {
        id: userData.telegram_id,
        balance: userData.balance,
        referrer: userData.referrer
    });
}

// Загрузка аватара пользователя
function loadUserAvatar() {
    try {
        const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const avatarElement = document.getElementById('userAvatar');

        if (user && avatarElement) {
            if (user.photo_url) {
                avatarElement.src = user.photo_url;
                avatarElement.style.display = 'block';
            } else {
                // Создаем заглушку с инициалом
                const initial = user.first_name?.charAt(0)?.toUpperCase() || 'U';
                avatarElement.style.display = 'none';
                // Можно добавить создание div с инициалом
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки аватара:', error);
    }
}

// Проверка реферальной ссылки
function checkReferralLink() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const refParam = urlParams.get('ref');

        if (refParam && refParam !== userData.telegram_id) {
            // Сохраняем реферера
            localStorage.setItem('my_referrer', refParam);
            userData.referrer = refParam;
            console.log('Установлен реферер:', refParam);
        }
    } catch (error) {
        console.error('Ошибка обработки реферальной ссылки:', error);
    }
}

// Обновление баланса при изменениях в localStorage
window.addEventListener('storage', function(e) {
    if (e.key === 'ar_balance') {
        updateBalanceDisplay();
        updateHeaderBalance();
    }
});

// Обновление баланса при возвращении на страницу
window.addEventListener('pageshow', function(event) {
    updateBalanceDisplay();
    updateHeaderBalance();
});

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', initializeShop);

// Экспорт функций для использования в других скриптах
window.shopFunctions = {
    buyProduct,
    updateBalanceDisplay,
    getUserPurchases,
    processReferralBonus
};

console.log('📦 Shop.js загружен успешно!');