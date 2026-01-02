// Инициализация Telegram WebApp
const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

// console.log('[REFERRAL] Telegram WebApp инициализирован');

// Функция расчета ранга по количеству рефералов
function calculateRank(referralCount) {
    if (referralCount === 0) return 'Новичок';
    if (referralCount >= 1 && referralCount <= 5) return 'Бронза';
    if (referralCount >= 6 && referralCount <= 20) return 'Серебро';
    if (referralCount >= 21 && referralCount <= 50) return 'Золото';
    if (referralCount > 50) return 'Легенда';
    return 'Новичок';
}

// Username вашего бота
const BOT_USERNAME = 'ARARENA_BOT';

// Получаем данные пользователя
const user = tg?.initDataUnsafe?.user || window.currentUser;
const telegramId = user?.id || user?.telegram_id;  // Telegram ID пользователя

// Генерируем реферальные ссылки
const refLink = telegramId ? `https://t.me/${BOT_USERNAME}?start=${telegramId}` : '';
const landingLink = telegramId ? `https://ar.skillnetwork.pro/landing-ar.html?ref=${telegramId}` : '';

// Глобальная переменная для хранения UUID из БД
let userUUID = null;

// Функция получения UUID по telegram_id
async function getUserUUID() {
    if (userUUID) return userUUID;  // Кэшируем результат

    if (!telegramId || typeof supabaseClient === 'undefined') {
        console.error('[REFERRAL] ❌ Нет telegram_id или supabaseClient недоступен');
        return null;
    }

    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('id')
            .eq('telegram_id', telegramId)
            .single();

        if (error || !data) {
            console.error('[REFERRAL] ❌ Ошибка получения UUID:', error);
            return null;
        }

        userUUID = data.id;
        // console.log('[REFERRAL] ✅ UUID получен по telegram_id:', userUUID);
        return userUUID;

    } catch (error) {
        console.error('[REFERRAL] ❌ Критическая ошибка:', error);
        return null;
    }
}

// Устанавливаем ссылку в поле при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    // Заполняем поле с реферальной ссылкой
    const refLinkInput = document.getElementById('refLink');
    if (refLinkInput) {
        refLinkInput.value = refLink;
        // console.log('Установлена реферальная ссылка:', refLink);
    }

    // Показываем ID пользователя для отладки
    // console.log('Ваш Telegram ID:', telegramId);
    // console.log('Ваша ссылка на лендинг:', landingLink);

    // Ждем загрузки currentUser из auth.js (как в shop.js)
    waitForAuth();
});

// Функция ожидания загрузки auth.js (как в shop.js)
function waitForAuth() {
    if (typeof supabaseClient !== 'undefined' && window.currentUser) {
        // console.log('[REFERRAL] ✅ Auth загружен, currentUser доступен');
        // console.log('[REFERRAL] currentUser:', window.currentUser);

        // Обновляем баланс
        const balanceElement = document.getElementById('userBalance');
        if (balanceElement) {
            balanceElement.textContent = window.currentUser.balance_ar || '0';
        }

        // Обновляем аватар
        updateUserAvatar();

        // Загружаем статистику
        loadReferralStats();
        loadReferralsList();
    } else {
        // console.log('[REFERRAL] ⏳ Ожидание auth.js и currentUser...');
        setTimeout(waitForAuth, 200);
    }
}

// Функция обновления аватара
function updateUserAvatar() {
    // console.log('[REFERRAL] Попытка обновить аватар...');
    // console.log('[REFERRAL] window.currentUser:', window.currentUser);
    // console.log('[REFERRAL] photo_url:', window.currentUser?.photo_url);

    const avatarElement = document.getElementById('userAvatar');
    if (avatarElement && window.currentUser && window.currentUser.photo_url) {
        avatarElement.src = window.currentUser.photo_url;
        avatarElement.style.display = 'block';
        // console.log('[REFERRAL] ✅ Аватар обновлен:', window.currentUser.photo_url);
    } else {
        // console.log('[REFERRAL] ⚠️ Аватар не обновлен. Причина:');
        // console.log('  - avatarElement:', avatarElement);
        // console.log('  - window.currentUser:', window.currentUser);
        // console.log('  - photo_url:', window.currentUser?.photo_url);
    }
}

// Функции для работы с лендингами
function openLanding(type) {
    const url = `https://ar.skillnetwork.pro/landing-ar.html?ref=${telegramId}`;
    window.open(url, '_blank');
}

function copyLanding(type) {
    const url = `https://ar.skillnetwork.pro/landing-ar.html?ref=${telegramId}`;
    navigator.clipboard.writeText(url).then(() => {
        showNotification('✅ Ссылка на лендинг скопирована!');
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
        showNotification('✅ Ссылка на лендинг скопирована!');
    });
}

// Функция копирования реферальной ссылки
function copyRefLink(event) {
    const input = document.getElementById('refLink');
    if (!input || !input.value) {
        showNotification('Ошибка: ссылка не найдена', event);
        return;
    }

    // Метод для мобильных устройств
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(input.value).then(() => {
            showNotification('Реферальная ссылка скопирована!', event);
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

💰 Получи 100 AR бонус при регистрации
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
function showNotification(message, event) {
    // Удаляем существующие уведомления
    const existingNotifications = document.querySelectorAll('.notification, .copy-notification');
    existingNotifications.forEach(n => n.remove());

    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = message;

    // Определяем позицию уведомления
    let posX = '50%';
    let posY = '50%';
    let transform = 'translate(-50%, -50%)';

    if (event && event.target) {
        const rect = event.target.getBoundingClientRect();
        posX = rect.left + rect.width / 2 + 'px';
        posY = rect.top - 60 + 'px';
        transform = 'translateX(-50%)';
    }

    notification.style.cssText = `
        position: fixed;
        left: ${posX};
        top: ${posY};
        transform: ${transform};
        background: linear-gradient(135deg, #FFD700, #FFA500);
        color: #000;
        padding: 12px 24px;
        border-radius: 50px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 4px 20px rgba(255, 215, 0, 0.4);
        z-index: 10000;
        animation: fadeInOut 2s ease;
        pointer-events: none;
    `;

    document.body.appendChild(notification);

    // Удаляем через 2 секунды
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Загрузка статистики рефералов из БД
async function loadReferralStats() {
    // console.log('[REFERRAL] 🔄 Начинаем загрузку статистики...');
    // console.log('[REFERRAL] Telegram ID:', telegramId);

    if (!telegramId) {
        console.error('[REFERRAL] ❌ Telegram ID не определён');
        return;
    }

    try {
        // Проверяем доступность Supabase
        if (typeof supabaseClient === 'undefined') {
            console.error('[REFERRAL] ❌ Supabase недоступен');
            return;
        }

        // Получаем UUID пользователя
        const uuid = await getUserUUID();
        if (!uuid) {
            console.error('[REFERRAL] ❌ Не удалось получить UUID');
            return;
        }

        // console.log('[REFERRAL] ✅ Supabase доступен, загружаем рефералов для UUID:', uuid);

        // Загружаем ВСЕХ пользователей (как в админке)
        const { data: allUsers, error: usersError } = await supabaseClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (usersError || !allUsers) {
            console.error('[REFERRAL] ❌ Ошибка загрузки пользователей:', usersError);
            return;
        }

        // console.log('[REFERRAL] ✅ Загружено пользователей всего:', allUsers.length);

        // Level 1: пользователи с referrer_id = текущий UUID
        const l1Referrals = allUsers.filter(u => u.referrer_id === uuid);
        // console.log('[REFERRAL] L1 рефералов:', l1Referrals.length, l1Referrals.map(u => u.first_name));

        // Level 2: пользователи с referrer_id = любой ID из L1
        const l1Ids = l1Referrals.map(u => u.id);
        const l2Referrals = allUsers.filter(u => l1Ids.includes(u.referrer_id));
        // console.log('[REFERRAL] L2 рефералов:', l2Referrals.length, l2Referrals.map(u => u.first_name));

        // Общее количество друзей = L1 + L2
        const totalFriends = l1Referrals.length + l2Referrals.length;
        // console.log('[REFERRAL] 👥 Всего друзей:', totalFriends);

        // Подсчитываем ВЕСЬ доход из transactions (включая welcome bonus)
        const { data: commissions, error: commError } = await supabaseClient
            .from('transactions')
            .select('amount, type')
            .eq('user_id', uuid)
            .in('type', ['referral_bonus', 'referral_commission', 'referral_bonus_l2', 'referral_commission_l2', 'welcome', 'bonus']);

        let totalEarned = 0;
        if (commError) {
            console.error('[REFERRAL] ❌ Ошибка загрузки транзакций:', commError);
        }

        if (!commError && commissions) {
            // console.log('[REFERRAL] ✅ Загружено транзакций:', commissions.length);
            // console.log('[REFERRAL] Данные транзакций:', commissions);
            totalEarned = commissions.reduce((sum, t) => sum + (t.amount || 0), 0);
            // console.log(`[REFERRAL] 💰 Подсчитано комиссий: ${commissions.length} транзакций = ${totalEarned} AR`);
        } else {
            // Fallback на старый расчёт если не удалось загрузить транзакции
            totalEarned = l1Referrals.length * 200 + l2Referrals.length * 100;
            // console.log('[REFERRAL] ⚠️ Используем упрощённый расчёт (fallback):', totalEarned, 'AR');
        }

        // Обновляем UI
        const friendsElement = document.getElementById('totalFriends');
        if (friendsElement) friendsElement.textContent = totalFriends;

        const earnedElement = document.getElementById('totalEarned');
        if (earnedElement) earnedElement.textContent = totalEarned;

        // Определяем ранг (используем новую функцию)
        const rank = calculateRank(totalFriends);

        // Обновляем профиль сверху
        const userNameElement = document.getElementById('userName');
        const userUsernameElement = document.getElementById('userUsername');
        const userAvatarImg = document.getElementById('userAvatarImg');
        const userAvatarPlaceholder = document.getElementById('userAvatarPlaceholder');
        const userBalanceTopElement = document.getElementById('userBalanceTop');
        const userRankElement = document.getElementById('userRank');

        if (userNameElement && window.currentUser) {
            const fullName = `${window.currentUser.first_name || ''} ${window.currentUser.last_name || ''}`.trim() || window.currentUser.username || 'Пользователь';
            userNameElement.textContent = fullName;
        }

        if (userUsernameElement && window.currentUser) {
            userUsernameElement.textContent = window.currentUser.username ? `@${window.currentUser.username}` : '';
        }

        // Обновляем аватар
        if (userAvatarImg && userAvatarPlaceholder && window.currentUser) {
            if (window.currentUser.photo_url) {
                userAvatarImg.src = window.currentUser.photo_url;
                userAvatarImg.style.display = 'block';
                userAvatarPlaceholder.style.display = 'none';
            } else {
                const initial = (window.currentUser.first_name || window.currentUser.username || 'U').charAt(0).toUpperCase();
                userAvatarPlaceholder.textContent = initial;
                userAvatarImg.style.display = 'none';
                userAvatarPlaceholder.style.display = 'flex';
            }
        }

        if (userBalanceTopElement && window.currentUser) {
            userBalanceTopElement.textContent = window.currentUser.balance_ar || 0;
        }

        if (userRankElement) {
            userRankElement.textContent = rank;
        }

        // console.log(`[REFERRAL] Загружено: L1=${l1Referrals.length}, L2=${l2Referrals.length}`);

        // Сохраняем список для модальных окон с полем level
        window.referralsList = [
            ...l1Referrals.map(u => ({ ...u, level: 1, user: u })),
            ...l2Referrals.map(u => ({ ...u, level: 2, user: u }))
        ];

        // Сохраняем в localStorage для главной страницы
        localStorage.setItem('friendsCount', totalFriends);
        // console.log('[REFERRAL] ✅ Сохранено в localStorage: friendsCount =', totalFriends);

        // ========== ОБНОВЛЕНИЕ ВКЛАДОК ==========

        // Вкладка "Мои средства": показываем текущий баланс пользователя
        const totalEarnedBigElement = document.getElementById('totalEarnedBig');
        if (totalEarnedBigElement && window.currentUser) {
            totalEarnedBigElement.textContent = window.currentUser.balance_ar || 0;
            // console.log('[REFERRAL] Обновлён баланс в "Мои средства":', window.currentUser.balance_ar);
        }

        // Вкладка "Команда": обновляем счетчики L1 и L2
        const l1CountElement = document.getElementById('l1Count');
        const l2CountElement = document.getElementById('l2Count');
        if (l1CountElement) l1CountElement.textContent = l1Referrals.length;
        if (l2CountElement) l2CountElement.textContent = l2Referrals.length;

        // Вкладка "Команда": заполняем списки рефералов
        const teamList1 = document.getElementById('teamList1');
        const teamList2 = document.getElementById('teamList2');

        if (teamList1) {
            if (l1Referrals.length > 0) {
                teamList1.innerHTML = l1Referrals.map(ref => createReferralCard({ ...ref, level: 1, user: ref })).join('');
            } else {
                teamList1.innerHTML = '<div style="text-align:center; color:#888; padding:20px;">Пока нет рефералов L1</div>';
            }
        }

        if (teamList2) {
            if (l2Referrals.length > 0) {
                teamList2.innerHTML = l2Referrals.map(ref => createReferralCard({ ...ref, level: 2, user: ref })).join('');
            } else {
                teamList2.innerHTML = '<div style="text-align:center; color:#888; padding:20px;">Пока нет рефералов L2</div>';
            }
        }

        // console.log('[REFERRAL] ✅ Вкладки обновлены');

    } catch (error) {
        console.error('[REFERRAL] Критическая ошибка:', error);
    }
}

// Загрузка списка рефералов
async function loadReferralsList() {
    if (!window.currentUser || !window.referralsList) return;

    const listContainer = document.getElementById('referralsList');
    if (!listContainer) return;

    if (window.referralsList.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #888;">
                У вас пока нет рефералов.<br>
                Поделитесь своей ссылкой с друзьями!
            </div>
        `;
        return;
    }

    // Формируем HTML для списка
    listContainer.innerHTML = window.referralsList.map(ref => {
        const user = ref.user;
        const levelBadge = ref.level === 1 ?
            '<span style="background:#FFD700; color:#000; padding:2px 8px; border-radius:12px; font-size:12px;">L1</span>' :
            '<span style="background:#C0C0C0; color:#000; padding:2px 8px; border-radius:12px; font-size:12px;">L2</span>';

        const registrationBonus = ref.level === 1 ? 200 : 100;
        const name = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Пользователь' : 'Загрузка...';

        return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.05); border-radius:10px; margin-bottom:10px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    ${levelBadge}
                    <span>${name}</span>
                </div>
                <div style="color:#FFD700;">
                    <div style="font-size:12px; color:#888;">Бонус за регистрацию</div>
                    <div>+${registrationBonus} AR</div>
                </div>
            </div>
        `;
    }).join('');
}

// Функция форматирования даты
function formatDate(dateString) {
    if (!dateString) return 'Недавно';
    const date = new Date(dateString);
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Функция расчета времени с последнего визита
function getLastSeenText(lastSeen) {
    if (!lastSeen) return 'Не был онлайн';

    const now = new Date();

    // Если время приходит без 'Z', добавляем чтобы правильно парсить UTC
    const lastSeenUTC = lastSeen.endsWith('Z') ? lastSeen : lastSeen + 'Z';
    const last = new Date(lastSeenUTC);

    const diffMs = now - last;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // DEBUG: показываем точное время в консоли
    // console.log(`[TIME] now=${now.toISOString()}, last=${lastSeenUTC}, diffMins=${diffMins}`);

    // Онлайн - если был активен менее 30 минут назад
    if (diffMins < 30) return 'В сети';

    // Показываем точное время
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дн назад`;

    // Если давно - показываем дату
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return `${last.getDate()} ${months[last.getMonth()]}`;
}

// Создание карточки реферала
function createReferralCard(ref) {
    const user = ref.user || ref;
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Пользователь';
    const username = user.username;
    const regDate = formatDate(ref.created_at);
    const lastSeenRaw = user.last_seen_at || user.last_seen;

    const lastSeen = getLastSeenText(lastSeenRaw);

    // Аватар или инициал
    const initial = (user.first_name || user.username || 'U').charAt(0).toUpperCase();
    const avatarHtml = user.photo_url
        ? `<img src="${user.photo_url}" style="width:44px; height:44px; border-radius:50%; object-fit:cover; border:2px solid #FFD700;">`
        : `<div style="width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, #FFD700, #FFA500); display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:bold; color:#000; border:2px solid #FFD700; box-shadow:0 4px 12px rgba(255,215,0,0.3);">${initial}</div>`;

    return `
        <div style="background:linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(255,215,0,0.02) 100%);
                    border:1px solid rgba(255,215,0,0.4);
                    padding:14px;
                    margin:8px 0;
                    border-radius:16px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    transition: all 0.3s ease;">
            <div style="display:flex; gap:12px;">
                <!-- Аватар -->
                ${avatarHtml}

                <!-- Инфо блок -->
                <div style="flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center;">
                    <!-- Имя и статус -->
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
                        <div style="font-size:14px;
                                    color:#fff;
                                    font-weight:500;
                                    overflow:hidden;
                                    text-overflow:ellipsis;
                                    white-space:nowrap;
                                    flex:1;">${name}</div>

                        <!-- Иконки справа -->
                        <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                            <!-- SVG иконка сообщения -->
                            ${username ? `
                                <svg width="18" height="18" viewBox="0 0 24 24"
                                     onclick="window.open('https://t.me/${username}', '_blank')"
                                     style="cursor:pointer; transition: all 0.2s; opacity:0.9;"
                                     onmouseover="this.style.opacity='1'; this.style.transform='scale(1.15)'"
                                     onmouseout="this.style.opacity='0.9'; this.style.transform='scale(1)'">
                                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"
                                          fill="#FFD700"/>
                                    <circle cx="8" cy="10" r="1.3" fill="#FFD700"/>
                                    <circle cx="12" cy="10" r="1.3" fill="#FFD700"/>
                                    <circle cx="16" cy="10" r="1.3" fill="#FFD700"/>
                                </svg>
                            ` : ''}

                            <!-- SVG иконка "В сети" -->
                            ${lastSeen.includes('В сети') ? `
                                <svg width="18" height="18" viewBox="0 0 18 18" style="filter: drop-shadow(0 0 3px rgba(0,255,0,0.5));">
                                    <circle cx="9" cy="9" r="7" fill="#00ff00" opacity="0.25"/>
                                    <circle cx="9" cy="9" r="5" fill="#00ff00" opacity="0.5"/>
                                    <circle cx="9" cy="9" r="3.5" fill="#00ff00"/>
                                </svg>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Даты -->
                    <div style="display:flex;
                                gap:8px;
                                font-size:11px;
                                color:#999;
                                align-items:center;">
                        <span>${regDate}</span>
                        ${!lastSeen.includes('В сети') ? `<span style="color:#555;">•</span><span>${lastSeen}</span>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Модальные окна
async function showFriends() {
    // console.log('[REFERRAL] Открываем модальное окно друзей...');

    // 🔥 ПЕРЕЗАГРУЖАЕМ ДАННЫЕ ИЗ БД перед показом
    // console.log('[REFERRAL] 🔄 Перезагружаем данные рефералов...');
    await loadReferralStats();
    // console.log('[REFERRAL] ✅ Данные обновлены');

    const modal = document.getElementById('friendsModal');
    if (modal) {
        modal.style.display = 'block';

        // Загружаем друзей в модальное окно
        if (window.referralsList) {
            const l1List = document.getElementById('line1');
            const l2List = document.getElementById('line2');

            const l1Refs = window.referralsList.filter(r => r.level === 1);
            const l2Refs = window.referralsList.filter(r => r.level === 2);

            // console.log('[REFERRAL] L1 рефералов для отображения:', l1Refs.length);
            // console.log('[REFERRAL] L2 рефералов для отображения:', l2Refs.length);

            if (l1List) {
                l1List.innerHTML = l1Refs.length > 0
                    ? l1Refs.map(ref => createReferralCard(ref)).join('')
                    : '<div style="text-align:center; color:#888; padding:20px;">Пока нет рефералов L1</div>';
            }

            if (l2List) {
                l2List.innerHTML = l2Refs.length > 0
                    ? l2Refs.map(ref => createReferralCard(ref)).join('')
                    : '<div style="text-align:center; color:#888; padding:20px;">Пока нет рефералов L2</div>';
            }
        }
    }
}

function showLine(lineNumber) {
    const line1 = document.getElementById('line1');
    const line2 = document.getElementById('line2');
    const tabs = document.querySelectorAll('.tab-btn');

    if (lineNumber === 1) {
        if (line1) line1.style.display = 'block';
        if (line2) line2.style.display = 'none';
        tabs[0]?.classList.add('active');
        tabs[1]?.classList.remove('active');
    } else {
        if (line1) line1.style.display = 'none';
        if (line2) line2.style.display = 'block';
        tabs[0]?.classList.remove('active');
        tabs[1]?.classList.add('active');
    }
}

function showRanks() {
    const modal = document.getElementById('ranksModal');
    if (modal) modal.style.display = 'block';
}

async function showTransactions() {
    // console.log('[REFERRAL] 🔄 Открываем модальное окно транзакций...');

    const modal = document.getElementById('transactionsModal');
    if (!modal) {
        console.error('[REFERRAL] ❌ Модальное окно transactionsModal не найдено');
        return;
    }

    modal.style.display = 'block';

    // Проверки
    if (!telegramId) {
        console.error('[REFERRAL] ❌ telegramId не определён');
        return;
    }

    if (typeof supabaseClient === 'undefined') {
        console.error('[REFERRAL] ❌ supabaseClient не определён');
        return;
    }

    // Получаем UUID
    const uuid = await getUserUUID();
    if (!uuid) {
        console.error('[REFERRAL] ❌ Не удалось получить UUID');
        return;
    }

    // console.log('[REFERRAL] ✅ Загружаем транзакции для UUID:', uuid);

    try {
        const { data: transactions, error } = await supabaseClient
            .from('transactions')
            .select('*')
            .eq('user_id', uuid)
            .in('type', ['referral_bonus', 'referral_commission', 'referral_bonus_l2', 'referral_commission_l2'])
            .order('created_at', { ascending: false })
            .limit(50);

            if (error) {
                console.error('[REFERRAL] ❌ Ошибка загрузки транзакций:', error);
                return;
            }

            // console.log('[REFERRAL] ✅ Загружено транзакций:', transactions?.length || 0);
            // console.log('[REFERRAL] Данные транзакций:', transactions);

            const listElement = document.getElementById('transactionsList');
            if (!listElement) {
                console.error('[REFERRAL] ❌ Элемент transactionsList не найден');
                return;
            }

            if (listElement && transactions) {
                listElement.innerHTML = transactions.length > 0 ? transactions.map(t => {
                    const date = new Date(t.created_at).toLocaleDateString('ru-RU');

                    // Определяем тип транзакции
                    let typeLabel = '';
                    if (t.type === 'referral_bonus') {
                        typeLabel = 'Регистрационный бонус L1';
                    } else if (t.type === 'referral_commission') {
                        typeLabel = 'Комиссия с покупки L1 (10%)';
                    } else if (t.type === 'referral_bonus_l2') {
                        typeLabel = 'Регистрационный бонус L2';
                    } else if (t.type === 'referral_commission_l2') {
                        typeLabel = 'Комиссия с покупки L2 (5%)';
                    }

                    return `
                        <div style="display:flex; justify-content:space-between; padding:12px; background:rgba(255,255,255,0.05); margin:5px 0; border-radius:8px;">
                            <div style="flex:1;">
                                <div style="font-size:14px; margin-bottom:4px;">${typeLabel}</div>
                                <div style="font-size:12px; color:#888;">${date}</div>
                                ${t.description ? `<div style="font-size:11px; color:#666; margin-top:2px;">${t.description}</div>` : ''}
                            </div>
                            <div style="color:#FFD700; font-weight:bold; font-size:16px; display:flex; align-items:center;">+${t.amount} AR</div>
                        </div>
                    `;
                }).join('') : '<div style="text-align:center; color:#888; padding:20px;">Нет транзакций</div>';
            }
    } catch (error) {
        console.error('[REFERRAL] ❌ Ошибка загрузки транзакций:', error);
    }
}

function showEarningScheme() {
    const modal = document.getElementById('earningModal');
    if (modal) modal.style.display = 'block';
}

// 🐛 ОТЛАДКА: Показать ВСЕ транзакции (не только реферальные)
async function showAllTransactionsDebug() {
    // console.log('[REFERRAL] 🐛 ОТЛАДКА: Загружаем ВСЕ транзакции...');

    if (!telegramId || typeof supabaseClient === 'undefined') {
        console.error('[REFERRAL] ❌ telegramId или supabaseClient недоступен');
        alert('Ошибка: пользователь не авторизован');
        return;
    }

    // Получаем UUID
    const uuid = await getUserUUID();
    if (!uuid) {
        console.error('[REFERRAL] ❌ Не удалось получить UUID');
        alert('Ошибка: не удалось получить UUID');
        return;
    }

    try {
        const { data: allTransactions, error } = await supabaseClient
            .from('transactions')
            .select('*')
            .eq('user_id', uuid)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('[REFERRAL] ❌ Ошибка загрузки:', error);
            alert('Ошибка загрузки транзакций');
            return;
        }

        // console.log('[REFERRAL] 🐛 ВСЕ ТРАНЗАКЦИИ:', allTransactions);
        // console.log('[REFERRAL] 🐛 Количество:', allTransactions?.length || 0);

        // Подсчёт по типам
        const byType = {};
        let total = 0;
        allTransactions?.forEach(t => {
            byType[t.type] = (byType[t.type] || 0) + 1;
            total += t.amount || 0;
        });

        // console.log('[REFERRAL] 🐛 По типам:', byType);
        // console.log('[REFERRAL] 🐛 Общая сумма:', total);

        // Показываем в alert
        alert(`🐛 ОТЛАДКА ТРАНЗАКЦИЙ\n\nВсего: ${allTransactions?.length || 0}\nОбщая сумма: ${total} AR\n\nПо типам:\n${Object.entries(byType).map(([type, count]) => `${type}: ${count}`).join('\n')}\n\nПодробности в консоли (F12)`);

    } catch (error) {
        console.error('[REFERRAL] ❌ Критическая ошибка:', error);
        alert('Критическая ошибка: ' + error.message);
    }
}

// Добавляем глобальную функцию для вызова из консоли
window.showAllTransactionsDebug = showAllTransactionsDebug;

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

// ========== ФУНКЦИИ ДЛЯ ВКЛАДОК ==========

// Переключение вкладок
function switchTab(tabName) {
    // console.log('[REFERRAL] Переключение на вкладку:', tabName);

    // Скрыть все контенты
    const allContents = ['reflinkContent', 'balanceContent', 'teamContent', 'aboutContent'];
    allContents.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // Убрать active у всех вкладок
    const allTabs = ['tabReflink', 'tabBalance', 'tabTeam', 'tabAbout'];
    allTabs.forEach(id => {
        const tab = document.getElementById(id);
        if (tab) {
            tab.style.background = '#1a1a1a';
            tab.style.color = '#FFD700';
            tab.style.border = '1px solid #FFD700';
        }
    });

    // Показать нужный контент
    const contentMap = {
        'reflink': 'reflinkContent',
        'balance': 'balanceContent',
        'team': 'teamContent',
        'about': 'aboutContent'
    };
    const contentId = contentMap[tabName];
    const content = document.getElementById(contentId);
    if (content) content.style.display = 'block';

    // Активировать вкладку
    const tabMap = {
        'reflink': 'tabReflink',
        'balance': 'tabBalance',
        'team': 'tabTeam',
        'about': 'tabAbout'
    };
    const activeTab = document.getElementById(tabMap[tabName]);
    if (activeTab) {
        activeTab.style.background = '#FFD700';
        activeTab.style.color = '#000';
        activeTab.style.border = 'none';
    }

    // Загружаем данные при переходе на вкладку "Мои средства"
    if (tabName === 'balance') {
        // Обновляем баланс из currentUser
        const totalEarnedBigElement = document.getElementById('totalEarnedBig');
        if (totalEarnedBigElement && window.currentUser) {
            totalEarnedBigElement.textContent = window.currentUser.balance_ar || 0;
            // console.log('[REFERRAL] Обновлён баланс при переключении на вкладку:', window.currentUser.balance_ar);
        }
        loadTransactions();
    }
}

// Переключение уровней команды
function showTeamLevel(level) {
    // console.log('[REFERRAL] Переключение уровня команды:', level);

    // Переключение списков
    const list1 = document.getElementById('teamList1');
    const list2 = document.getElementById('teamList2');
    if (list1) list1.style.display = level === 1 ? 'block' : 'none';
    if (list2) list2.style.display = level === 2 ? 'block' : 'none';

    // Переключение кнопок
    const btn1 = document.getElementById('levelBtn1');
    const btn2 = document.getElementById('levelBtn2');
    if (btn1) {
        if (level === 1) {
            btn1.style.background = '#FFD700';
            btn1.style.color = '#000';
            btn1.style.border = 'none';
        } else {
            btn1.style.background = '#1a1a1a';
            btn1.style.color = '#FFD700';
            btn1.style.border = '1px solid #FFD700';
        }
    }
    if (btn2) {
        if (level === 2) {
            btn2.style.background = '#FFD700';
            btn2.style.color = '#000';
            btn2.style.border = 'none';
        } else {
            btn2.style.background = '#1a1a1a';
            btn2.style.color = '#FFD700';
            btn2.style.border = '1px solid #FFD700';
        }
    }
}

// ========== ФУНКЦИИ ДЛЯ ВКЛАДКИ "МОИ СРЕДСТВА" ==========

// Глобальный массив транзакций
let allTransactions = [];
let currentFilter = 'all';

// Загрузка транзакций
async function loadTransactions() {
    // console.log('[REFERRAL] 🔄 Загружаем транзакции для вкладки "Мои средства"...');

    if (!telegramId || typeof supabaseClient === 'undefined') {
        console.error('[REFERRAL] ❌ telegramId или supabaseClient недоступен');
        return;
    }

    const uuid = await getUserUUID();
    if (!uuid) {
        console.error('[REFERRAL] ❌ Не удалось получить UUID');
        return;
    }

    try {
        const { data: transactions, error } = await supabaseClient
            .from('transactions')
            .select('*')
            .eq('user_id', uuid)
            .in('type', ['referral_bonus', 'referral_bonus_l2', 'referral_commission', 'referral_commission_l2', 'welcome'])
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('[REFERRAL] ❌ Ошибка загрузки транзакций:', error);
            return;
        }

        // console.log('[REFERRAL] ✅ Загружено транзакций:', transactions?.length || 0);
        // console.log('[REFERRAL] Типы транзакций:', transactions?.map(t => t.type) || []);
        allTransactions = transactions || [];
        renderTransactions(allTransactions);

    } catch (error) {
        console.error('[REFERRAL] ❌ Критическая ошибка загрузки транзакций:', error);
    }
}

// Фильтр транзакций
function filterTransactions(type) {
    // console.log('[REFERRAL] Фильтр транзакций:', type);
    currentFilter = type;

    // Обновляем стили кнопок
    const filterAll = document.getElementById('filterAll');
    const filterRegistration = document.getElementById('filterRegistration');
    const filterPurchase = document.getElementById('filterPurchase');

    [filterAll, filterRegistration, filterPurchase].forEach(btn => {
        if (btn) {
            btn.style.background = '#1a1a1a';
            btn.style.color = '#FFD700';
            btn.style.border = '1px solid #FFD700';
        }
    });

    if (type === 'all' && filterAll) {
        filterAll.style.background = '#FFD700';
        filterAll.style.color = '#000';
        filterAll.style.border = 'none';
    } else if (type === 'registration' && filterRegistration) {
        filterRegistration.style.background = '#FFD700';
        filterRegistration.style.color = '#000';
        filterRegistration.style.border = 'none';
    } else if (type === 'purchase' && filterPurchase) {
        filterPurchase.style.background = '#FFD700';
        filterPurchase.style.color = '#000';
        filterPurchase.style.border = 'none';
    }

    // Фильтруем транзакции
    let filtered = allTransactions;
    if (type === 'registration') {
        filtered = allTransactions.filter(t => t.type === 'referral_bonus' || t.type === 'referral_bonus_l2');
        // console.log('[REFERRAL] Фильтр "Регистрации":', filtered.length, 'из', allTransactions.length);
    } else if (type === 'purchase') {
        filtered = allTransactions.filter(t => t.type === 'referral_commission' || t.type === 'referral_commission_l2');
        // console.log('[REFERRAL] Фильтр "Покупки":', filtered.length, 'из', allTransactions.length);
    } else {
        // console.log('[REFERRAL] Фильтр "Все":', allTransactions.length);
    }

    renderTransactions(filtered);
}

// Отрисовка транзакций
function renderTransactions(transactions) {
    const listElement = document.getElementById('transactionsListBalance');
    if (!listElement) return;

    if (transactions.length === 0) {
        listElement.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 16px; color: #888; margin-bottom: 8px;">Пока нет доходов с рефералов</div>
                <div style="font-size: 14px; color: #666;">Пригласите друзей чтобы начать зарабатывать</div>
            </div>
        `;
        return;
    }

    listElement.innerHTML = transactions.map(t => {
        const date = new Date(t.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

        // Определяем тип, иконку и описание
        let typeLabel = '';
        let icon = '';
        let description = t.description || '';

        // Извлекаем telegram_id из metadata (если есть) или из description
        let telegramIdStr = '';
        if (t.metadata && t.metadata.telegram_id) {
            telegramIdStr = t.metadata.telegram_id;
        } else {
            // Извлекаем ID из description формата "Бонус lvl 1 • ID: 12345"
            const idMatch = description.match(/ID:\s*(\d+)/);
            if (idMatch) {
                telegramIdStr = idMatch[1];
            }
        }

        if (t.type === 'referral_bonus') {
            typeLabel = telegramIdStr ? `Бонус lvl 1 • ID: ${telegramIdStr}` : 'Бонус lvl 1';
            icon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="7" width="18" height="12" rx="2" stroke="#FFD700" stroke-width="2" fill="none"/>
                <path d="M7 7V5a5 5 0 0110 0v2" stroke="#FFD700" stroke-width="2" fill="none"/>
                <circle cx="12" cy="13" r="2" fill="#FFD700"/>
            </svg>`;
        } else if (t.type === 'referral_bonus_l2') {
            typeLabel = telegramIdStr ? `Бонус lvl 2 • ID: ${telegramIdStr}` : 'Бонус lvl 2';
            icon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="8" width="16" height="10" rx="2" stroke="#FFD700" stroke-width="1.5" fill="none"/>
                <path d="M8 8V6a4 4 0 018 0v2" stroke="#FFD700" stroke-width="1.5" fill="none"/>
                <circle cx="12" cy="13" r="1.5" fill="#FFD700"/>
            </svg>`;
        } else if (t.type === 'referral_commission') {
            typeLabel = telegramIdStr ? `Покупка lvl 1 • ID: ${telegramIdStr}` : 'Покупка lvl 1';
            icon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="7" cy="7" r="2.5" fill="#FFD700"/>
                <circle cx="17" cy="17" r="2.5" fill="#FFD700"/>
                <path d="M5 19L19 5" stroke="#FFD700" stroke-width="2.5" stroke-linecap="round"/>
            </svg>`;
        } else if (t.type === 'referral_commission_l2') {
            typeLabel = telegramIdStr ? `Покупка lvl 2 • ID: ${telegramIdStr}` : 'Покупка lvl 2';
            icon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="7" cy="7" r="2" fill="#FFD700"/>
                <circle cx="17" cy="17" r="2" fill="#FFD700"/>
                <path d="M6 18L18 6" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/>
            </svg>`;
        } else if (t.type === 'welcome') {
            typeLabel = 'Приветственный бонус';
            icon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#FFD700"/>
            </svg>`;
        }

        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid #333; min-height: 56px; margin: 0;">
                <!-- Левая часть -->
                <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                    <div style="flex-shrink: 0;">${icon}</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 14px; font-weight: 600; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${typeLabel}</div>
                        <div style="font-size: 11px; color: #666;">${date}</div>
                    </div>
                </div>
                <!-- Правая часть -->
                <div style="text-align: right; flex-shrink: 0; padding-left: 12px;">
                    <div style="font-size: 18px; font-weight: bold; color: #FFD700;">+${t.amount}</div>
                    <div style="font-size: 10px; color: #888;">AR</div>
                </div>
            </div>
        `;
    }).join('');
}

// console.log('[REFERRAL] Модуль реферальной системы загружен');