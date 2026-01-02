// ===== SHOP.JS v2.0 - SUPABASE + BOT.PY API INTEGRATION =====
// Backend-first архитектура: все данные из Supabase, комиссии через bot.py

// Инициализация Telegram WebApp
const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

// Глобальные переменные
let currentUser = null;
let availableProducts = [];

// ==============================================
// ИНИЦИАЛИЗАЦИЯ МАГАЗИНА
// ==============================================

async function initializeShop() {
    console.log('🏪 Инициализация магазина v2.0...');

    try {
        // Проверяем доступность Supabase
        if (typeof supabaseClient === 'undefined') {
            console.error('❌ Supabase не загружен');
            alert('Ошибка загрузки магазина. Перезагрузите страницу.');
            return;
        }

        // Получаем текущего пользователя из window.currentUser (установлен auth.js)
        if (window.currentUser) {
            currentUser = window.currentUser;
            console.log('✅ Пользователь загружен:', currentUser.telegram_id);
        } else {
            console.error('❌ Пользователь не авторизован');
            alert('Пожалуйста, откройте приложение через бота @ARARENA_BOT');
            return;
        }

        // Загружаем продукты из БД
        await loadProducts();

        // Обновляем UI
        updateUI();

        console.log('✅ Магазин инициализирован');

    } catch (error) {
        console.error('❌ Ошибка инициализации магазина:', error);
        alert('Ошибка загрузки магазина. Попробуйте позже.');
    }
}

// ==============================================
// ЗАГРУЗКА ПРОДУКТОВ ИЗ SUPABASE
// ==============================================

async function loadProducts() {
    try {
        console.log('📦 Загрузка продуктов из БД...');

        const { data: products, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('❌ Ошибка загрузки продуктов:', error);
            throw error;
        }

        availableProducts = products || [];
        console.log(`✅ Загружено ${availableProducts.length} продуктов:`, availableProducts);

        return availableProducts;

    } catch (error) {
        console.error('❌ Ошибка в loadProducts:', error);
        throw error;
    }
}

// ==============================================
// ПОКУПКА ПРОДУКТА
// ==============================================

async function buyProduct(productId, price) {
    console.log(`💰 Попытка покупки продукта: ${productId} за ${price} AR`);

    try {
        // Получаем информацию о продукте
        const product = availableProducts.find(p => p.id === productId);
        if (!product) {
            alert('❌ Продукт не найден');
            return;
        }

        // Подтверждение покупки
        const confirmed = confirm(
            `💰 Подтвердите покупку\n\n` +
            `${product.title}\n` +
            `Цена: ${price} AR\n` +
            `Ваш баланс: ${currentUser.balance_ar} AR\n\n` +
            `Продолжить?`
        );

        if (!confirmed) {
            console.log('❌ Покупка отменена пользователем');
            return;
        }

        // Проверка баланса
        if (currentUser.balance_ar < price) {
            alert(
                `❌ Недостаточно AR монет!\n\n` +
                `Нужно: ${price} AR\n` +
                `Доступно: ${currentUser.balance_ar} AR\n\n` +
                `Заработайте AR выполняя задания!`
            );
            return;
        }

        // Показываем индикатор загрузки
        console.log('⏳ Обработка покупки...');

        // === ШАГ 1: Списываем AR с баланса пользователя ===
        const newBalance = currentUser.balance_ar - price;

        const { data: updatedUser, error: balanceError } = await supabaseClient
            .from('users')
            .update({ balance_ar: newBalance })
            .eq('id', currentUser.id)
            .select()
            .single();

        if (balanceError) {
            console.error('❌ Ошибка списания AR:', balanceError);
            alert('❌ Ошибка при списании AR. Попробуйте позже.');
            return;
        }

        console.log('✅ AR списаны, новый баланс:', newBalance);

        // === ШАГ 2: Создаём запись о покупке ===
        const purchaseData = {
            user_id: currentUser.id,
            product_id: productId,
            price_paid: price,
            payment_method: 'ar',
            status: 'completed',
            expires_at: product.duration_days
                ? new Date(Date.now() + product.duration_days * 24 * 60 * 60 * 1000).toISOString()
                : null,
            metadata: {
                telegram_id: currentUser.telegram_id,
                product_title: product.title,
                purchased_at: new Date().toISOString()
            }
        };

        const { data: purchase, error: purchaseError } = await supabaseClient
            .from('purchases')
            .insert(purchaseData)
            .select()
            .single();

        if (purchaseError) {
            console.error('❌ Ошибка создания покупки:', purchaseError);
            // Откатываем баланс
            await supabaseClient
                .from('users')
                .update({ balance_ar: currentUser.balance_ar })
                .eq('id', currentUser.id);
            alert('❌ Ошибка при создании покупки. Баланс восстановлен.');
            return;
        }

        console.log('✅ Покупка создана:', purchase.id);

        // === ШАГ 3: Создаём транзакцию ===
        const transactionData = {
            user_id: currentUser.id,
            type: 'purchase',
            amount: -price,
            description: `Покупка: ${product.title}`,
            created_at: new Date().toISOString()
        };

        await supabaseClient
            .from('transactions')
            .insert(transactionData);

        console.log('✅ Транзакция создана');

        // === ШАГ 4: Проверяем наличие реферера и начисляем комиссии ===
        try {
            // Проверяем есть ли реферер в БД
            const { data: userData } = await supabaseClient
                .from('users')
                .select('referrer_id')
                .eq('id', currentUser.id)
                .single();

            if (userData?.referrer_id) {
                console.log('💸 Начисление реферальных комиссий...');
                await processReferralCommissions(currentUser.id, price);
            } else {
                console.log('ℹ️ У пользователя нет реферера - комиссии не начисляются');
            }
        } catch (commError) {
            console.error('⚠️ Ошибка проверки реферера или начисления комиссий (не критично):', commError);
            // Не блокируем покупку из-за ошибки комиссий
        }

        // === ШАГ 5: Обновляем UI ===
        currentUser.balance_ar = newBalance;
        window.currentUser = updatedUser; // Обновляем глобальный объект
        updateUI();

        // Показываем успешное сообщение
        showSuccessMessage(product, price, newBalance);

        console.log('🎉 Покупка успешно завершена!');

    } catch (error) {
        console.error('❌ Критическая ошибка при покупке:', error);
        alert('❌ Произошла ошибка при покупке. Попробуйте еще раз или свяжитесь с поддержкой.');
    }
}

// ==============================================
// НАЧИСЛЕНИЕ РЕФЕРАЛЬНЫХ КОМИССИЙ ЧЕРЕЗ BOT.PY
// ==============================================

async function processReferralCommissions(buyerId, purchaseAmount) {
    try {
        console.log(`💸 Вызов bot.py API для начисления комиссий: buyer=${buyerId}, amount=${purchaseAmount}`);

        // Получаем реферера L1 и telegram_id покупателя
        const { data: buyer } = await supabaseClient
            .from('users')
            .select('referrer_id, telegram_id')
            .eq('id', buyerId)
            .single();

        if (!buyer || !buyer.referrer_id) {
            console.log('ℹ️ У покупателя нет реферера');
            return;
        }

        const referrerL1Id = buyer.referrer_id;
        const buyerTelegramId = buyer.telegram_id;

        // === L1 КОМИССИЯ: 10% ===
        const commissionL1 = Math.floor(purchaseAmount * 0.10);

        const { data: refL1, error: errorL1 } = await supabaseClient
            .from('users')
            .select('balance_ar, telegram_id, first_name')
            .eq('id', referrerL1Id)
            .single();

        if (refL1) {
            const newBalanceL1 = (refL1.balance_ar || 0) + commissionL1;

            // Обновляем баланс L1
            await supabaseClient
                .from('users')
                .update({ balance_ar: newBalanceL1 })
                .eq('id', referrerL1Id);

            // Создаём транзакцию L1 с telegram_id
            await supabaseClient
                .from('transactions')
                .insert({
                    user_id: referrerL1Id,
                    type: 'referral_commission',
                    amount: commissionL1,
                    currency: 'AR',
                    description: `Покупка lvl 1 • ID: ${buyerTelegramId}`,
                    created_at: new Date().toISOString()
                });

            console.log(`✅ L1 комиссия начислена: ${commissionL1} AR → ${refL1.telegram_id}`);
        }

        // === L2 КОМИССИЯ: 5% (ДЕДУШКА) ===
        const { data: refL1Data } = await supabaseClient
            .from('users')
            .select('referrer_id')
            .eq('id', referrerL1Id)
            .single();

        if (refL1Data && refL1Data.referrer_id) {
            const referrerL2Id = refL1Data.referrer_id;
            const commissionL2 = Math.floor(purchaseAmount * 0.05);

            const { data: refL2 } = await supabaseClient
                .from('users')
                .select('balance_ar, telegram_id, first_name')
                .eq('id', referrerL2Id)
                .single();

            if (refL2) {
                const newBalanceL2 = (refL2.balance_ar || 0) + commissionL2;

                // Обновляем баланс L2
                await supabaseClient
                    .from('users')
                    .update({ balance_ar: newBalanceL2 })
                    .eq('id', referrerL2Id);

                // Создаём транзакцию L2 с telegram_id
                await supabaseClient
                    .from('transactions')
                    .insert({
                        user_id: referrerL2Id,
                        type: 'referral_commission_l2',
                        amount: commissionL2,
                        currency: 'AR',
                        description: `Покупка lvl 2 • ID: ${buyerTelegramId}`,
                        created_at: new Date().toISOString()
                    });

                console.log(`✅ L2 комиссия начислена: ${commissionL2} AR → ${refL2.telegram_id}`);
            }
        }

        console.log('✅ Все реферальные комиссии начислены');

    } catch (error) {
        console.error('❌ Ошибка начисления комиссий:', error);
        throw error;
    }
}

// ==============================================
// ОБНОВЛЕНИЕ UI
// ==============================================

function updateUI() {
    if (!currentUser) return;

    // Обновляем баланс в хедере
    const balanceElement = document.getElementById('userBalance');
    if (balanceElement) {
        balanceElement.textContent = currentUser.balance_ar || 0;
    }

    // Обновляем аватар
    const avatarElement = document.getElementById('userAvatar');
    if (avatarElement && currentUser.photo_url) {
        avatarElement.src = currentUser.photo_url;
        avatarElement.style.display = 'block';
    }

    console.log('🔄 UI обновлён');
}

// ==============================================
// СООБЩЕНИЯ
// ==============================================

function showSuccessMessage(product, pricePaid, newBalance) {
    const message =
        `✅ Покупка успешна!\n\n` +
        `📦 ${product.title}\n` +
        `💰 Списано: ${pricePaid} AR\n` +
        `💳 Остаток: ${newBalance} AR\n\n` +
        (product.duration_days ? `⏰ Активно: ${product.duration_days} дней\n\n` : '') +
        `Спасибо за покупку! 🎉`;

    alert(message);
}

// ==============================================
// ОБНОВЛЕНИЕ БАЛАНСА ПРИ ВОЗВРАЩЕНИИ
// ==============================================

window.addEventListener('pageshow', function(event) {
    if (window.currentUser) {
        currentUser = window.currentUser;
        updateUI();
    }
});

// Обновление при изменении currentUser
setInterval(() => {
    if (window.currentUser && window.currentUser.balance_ar !== currentUser?.balance_ar) {
        currentUser = window.currentUser;
        updateUI();
    }
}, 1000);

// ==============================================
// ЭКСПОРТ ФУНКЦИЙ
// ==============================================

window.shopFunctions = {
    buyProduct,
    loadProducts,
    updateUI
};

// ==============================================
// АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ
// ==============================================

// Ждём загрузки auth.js и Supabase
function waitForDependencies() {
    if (typeof supabaseClient !== 'undefined' && window.currentUser) {
        initializeShop();
    } else {
        console.log('⏳ Ожидание загрузки auth.js и Supabase...');
        setTimeout(waitForDependencies, 500);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForDependencies);
} else {
    waitForDependencies();
}

console.log('📦 Shop.js v2.0 загружен (Backend-first architecture)');