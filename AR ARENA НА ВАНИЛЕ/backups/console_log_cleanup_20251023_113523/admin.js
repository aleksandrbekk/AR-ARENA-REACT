        import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

        // Конфигурация
        const SUPABASE_URL = 'https://syxjkircmiwpnpagznay.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g';
        const ADMIN_IDS = [190202791];

        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        let currentUser = null;

        // Проверка инициализации Supabase
        console.log('Supabase инициализирован:', !!supabase);
        console.log('Можно работать с БД:', typeof supabase.from === 'function');

        // Инициализация
        async function init() {
            // Инициализация стилей хедера разделов
            if (typeof sectionHeaderStyles !== 'undefined') {
                document.getElementById('section-header-styles').textContent = sectionHeaderStyles;
            }

            // Временно отключаем проверку для тестирования
            // if (await checkAdmin()) {
                window.Telegram?.WebApp?.ready();
                window.Telegram?.WebApp?.expand();
                await loadMainStats();
            // }
        }

        // Проверка администратора
        async function checkAdmin() {
            const initData = window.Telegram?.WebApp?.initData;
            if (!initData) {
                showNotification('Ошибка: Откройте через Telegram', 'error');
                return false;
            }

            const urlParams = new URLSearchParams(initData);
            const userParam = urlParams.get('user');
            if (!userParam) {
                showNotification('Ошибка: Нет данных пользователя', 'error');
                return false;
            }

            const user = JSON.parse(decodeURIComponent(userParam));
            // Временно отключаем проверку админа для тестирования
            // if (!ADMIN_IDS.includes(user.id)) {
            //     document.body.innerHTML = '<div style="color: white; text-align: center; padding: 50px; font-size: 20px;">❌ Доступ запрещен</div>';
            //     return false;
            // }

            currentUser = user || { first_name: 'Admin', id: 'admin' };
            // Убрали отображение информации об админе
            return true;
        }

        // Загрузка статистики для карточек
        async function loadMainStats() {
            try {
                // Общее количество пользователей
                const { count: totalUsers } = await supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true });
                const usersStatEl = document.getElementById('usersStat');
                if (usersStatEl) usersStatEl.textContent = totalUsers || 0;

                // Активные сегодня
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const { count: activeToday } = await supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true })
                    .gte('last_active', today.toISOString());
                const dashboardStatEl = document.getElementById('dashboardStat');
                if (dashboardStatEl) dashboardStatEl.textContent = activeToday || 0;

                // Количество рефералов
                const { count: referrals } = await supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true })
                    .not('referred_by', 'is', null);
                const referralsStatEl = document.getElementById('referralsStat');
                if (referralsStatEl) referralsStatEl.textContent = referrals || 0;

                // Общее количество монет
                const { data: coinsData } = await supabase
                    .from('users')
                    .select('balance_ar');
                const totalCoins = coinsData?.reduce((sum, user) => sum + (user.balance_ar || 0), 0) || 0;
                const financeStatEl = document.getElementById('financeStat');
                if (financeStatEl) financeStatEl.textContent = totalCoins.toLocaleString();

            } catch (error) {
                console.error('Ошибка загрузки статистики:', error);
            }
        }

        // Загрузка данных дашборда
        // Текущий период для отвалившихся
        let currentPeriod = '3days';
        let chartInstance = null;

        async function loadDashboard() {
            try {
                // Загружаем всех пользователей
                const { data: allUsers } = await supabase
                    .from('users')
                    .select('*')
                    .order('created_at', { ascending: false });

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // 1. Всего пользователей
                const totalUsersEl = document.getElementById('totalUsers');
                if (totalUsersEl) totalUsersEl.textContent = allUsers?.length || 0;

                // 2. Онлайн сейчас (последние 5 минут)
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                const onlineNow = allUsers?.filter(u => {
                    const lastActive = u.last_seen_at || u.last_active || u.last_login;
                    return lastActive && new Date(lastActive) >= fiveMinutesAgo;
                }).length || 0;
                const onlineNowEl = document.getElementById('onlineNow');
                if (onlineNowEl) onlineNowEl.textContent = onlineNow;

                // 3. Новых сегодня
                const newToday = allUsers?.filter(u => new Date(u.created_at) >= today).length || 0;
                const newTodayEl = document.getElementById('newToday');
                if (newTodayEl) newTodayEl.textContent = newToday;

                // 4. Отвалились сегодня (стали неактивными 3+ дня)
                const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
                const churnedToday = allUsers?.filter(u => {
                    const lastActive = new Date(u.last_seen_at || u.last_active || u.created_at);
                    const churnDate = new Date(lastActive.getTime() + 3 * 24 * 60 * 60 * 1000);
                    return churnDate >= today && churnDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
                }).length || 0;
                const churnedTodayEl = document.getElementById('churnedToday');
                if (churnedTodayEl) churnedTodayEl.textContent = churnedToday;

                // 4. Конверсия
                const usersWithTasks = allUsers?.filter(u => u.balance_ar > 50).length || 0;
                const conversionRate = allUsers?.length > 0 ?
                    Math.round((usersWithTasks / allUsers.length) * 100) : 0;
                const conversionRateEl = document.getElementById('conversionRate');
                if (conversionRateEl) conversionRateEl.textContent = conversionRate + '%';

                // 5. Отвалились (по умолчанию 3+ дня)
                updateChurnedUsers(allUsers, currentPeriod);

                // 6. Без заданий сегодня
                const noTasksToday = allUsers?.filter(u => {
                    const lastActive = u.last_seen_at || u.last_active || u.last_login;
                    return lastActive && new Date(lastActive) >= today && u.balance_ar <= 50;
                }).length || 0;
                const noTasksTodayEl = document.getElementById('noTasksToday');
                if (noTasksTodayEl) noTasksTodayEl.textContent = noTasksToday;

                // 7. Вчера активны
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayEnd = new Date(today);
                const yesterdayActive = allUsers?.filter(u => {
                    const lastActive = u.last_seen_at || u.last_active || u.last_login;
                    if (!lastActive) return false;
                    const activeDate = new Date(lastActive);
                    return activeDate >= yesterday && activeDate < yesterdayEnd;
                }).length || 0;
                const yesterdayEl = document.getElementById('yesterdayActive');
                if (yesterdayEl) yesterdayEl.textContent = yesterdayActive;

                // 8. Средний баланс
                const avgBalance = allUsers?.length > 0 ?
                    Math.round(allUsers.reduce((sum, u) => sum + (u.balance_ar || 0), 0) / allUsers.length) : 0;
                const avgBalanceEl = document.getElementById('avgBalance');
                if (avgBalanceEl) avgBalanceEl.textContent = avgBalance;

                // Сохраняем пользователей глобально для переключения периодов
                window.dashboardUsers = allUsers;

                // Загружаем пользователей в таблицу после небольшой задержки для гарантии что DOM готов
                setTimeout(async () => {
                    await loadUsers();
                }, 100);

                // Последние регистрации
                const { data: recentUsers } = await supabase
                    .from('users')
                    .select('telegram_id, username, first_name, created_at, referred_by')
                    .order('created_at', { ascending: false })
                    .limit(10);

                const recentHtml = recentUsers?.length ?
                    `<table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Имя</th>
                                <th>Время</th>
                                <th>Реферер</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${recentUsers.map(user => `
                                <tr>
                                    <td>${user.telegram_id}</td>
                                    <td>${user.first_name || user.username || 'Нет имени'}</td>
                                    <td>${new Date(user.created_at).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}</td>
                                    <td>${user.referred_by || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>` :
                    '<p style="text-align: center; color: rgba(255,255,255,0.5); font-size: 12px;">Нет новых регистраций</p>';

                document.getElementById('recentRegistrations').innerHTML = recentHtml;

                // Проблемные пользователи
                const { data: problemUsers } = await supabase
                    .from('users')
                    .select('telegram_id, username, first_name, last_login, tasks_completed')
                    .or(`last_login.lt.${threeDaysAgo.toISOString()},tasks_completed.eq.0`)
                    .limit(10);

                const problemHtml = problemUsers?.length ?
                    `<table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Имя</th>
                                <th>Последний вход</th>
                                <th>Заданий</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${problemUsers.map(user => `
                                <tr>
                                    <td>${user.telegram_id}</td>
                                    <td>${user.first_name || user.username || 'Нет имени'}</td>
                                    <td>${user.last_login ? new Date(user.last_login).toLocaleDateString('ru-RU') : 'Никогда'}</td>
                                    <td>${user.tasks_completed || 0}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>` :
                    '<p style="text-align: center; color: rgba(255,255,255,0.5); font-size: 12px;">Нет проблемных пользователей</p>';

                document.getElementById('problemUsers').innerHTML = problemHtml;

            } catch (error) {
                console.error('Ошибка загрузки дашборда:', error);
            }
        }

        // Функция генерации цвета аватара (как в index.html)
        function getAvatarColor(id) {
            const colors = [
                '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
                '#DDA0DD', '#98D8C8', '#FFD700', '#FF69B4', '#00CED1',
                '#FF7F50', '#6A5ACD', '#20B2AA', '#F4A460', '#FF6347'
            ];
            const numId = parseInt(id) || 0;
            return colors[numId % colors.length];
        }

        // Функция создания HTML аватара
        function createAvatar(user, size = 'normal') {
            const sizeClass = size === 'mini' ? 'avatar-placeholder-mini' : 'avatar-placeholder-small';
            const avatarClass = size === 'mini' ? 'referrer-avatar' : 'user-avatar';

            // Для текущего пользователя (админа) берем фото из Telegram напрямую
            const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
            if (tgUser && tgUser.id == user.telegram_id && tgUser.photo_url) {
                return `<img src="${tgUser.photo_url}" class="${avatarClass}" alt="">`;
            }

            // Для остальных используем photo_url из базы данных
            if (user.photo_url) {
                return `<img src="${user.photo_url}" class="${avatarClass}" alt="">`;
            } else {
                // Если фото нет - показываем цветной круг с буквой
                const initial = (user.first_name || user.username || 'U').charAt(0).toUpperCase();
                const color = getAvatarColor(user.telegram_id);
                return `<div class="${sizeClass}" style="background: ${color}">${initial}</div>`;
            }
        }

        // Загрузка пользователей
        async function loadUsers() {
            try {
                console.log('Начинаем загрузку пользователей...');

                // Загружаем всех пользователей - точно так же как в loadReferrals
                const { data: users } = await supabase
                    .from('users')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(50);

                console.log('Пользователи загружены:', users?.length || 0);

                // Генерируем таблицу с управлением балансом
                const html = users?.length ?
                    `<table style="font-size: 11px; width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <th style="text-align: left; padding: 10px;">Пользователь</th>
                                <th style="text-align: center; padding: 10px;">ID</th>
                                <th style="text-align: center; padding: 10px;">Баланс</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => `
                                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                    <td style="padding: 8px 10px;">
                                        <div class="user-avatar-wrapper" style="display: flex; align-items: center; gap: 10px;">
                                            ${createAvatar(user)}
                                            <div>
                                                <div style="color: rgba(255, 255, 255, 0.9);">${user.first_name || 'Без имени'}</div>
                                                ${user.username ? `<div style="font-size: 9px; color: rgba(255,255,255,0.5);">@${user.username}</div>` : ''}
                                            </div>
                                        </div>
                                    </td>
                                    <td style="text-align: center; color: rgba(255, 255, 255, 0.6); font-size: 10px;">${user.telegram_id}</td>
                                    <td style="text-align: center;">
                                        <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                                            <button onclick="changeBalance('${user.telegram_id}', -10)" style="background: rgba(255,69,58,0.2); border: 1px solid rgba(255,69,58,0.3); color: #FF453A; padding: 3px 6px; border-radius: 4px; font-size: 10px; cursor: pointer; font-weight: bold;" title="Убрать 10 AR">-10</button>
                                            <span style="font-weight: bold; color: #FFD700; min-width: 50px;">${user.balance_ar || 0} AR</span>
                                            <button onclick="changeBalance('${user.telegram_id}', 10)" style="background: rgba(52,199,89,0.2); border: 1px solid rgba(52,199,89,0.3); color: #34C759; padding: 3px 6px; border-radius: 4px; font-size: 10px; cursor: pointer; font-weight: bold;" title="Добавить 10 AR">+10</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>` :
                    '<p style="text-align: center; color: rgba(255,255,255,0.5); font-size: 12px; padding: 20px;">Нет пользователей</p>';

                // Обновляем элемент
                const usersListEl = document.getElementById('usersList');
                if (usersListEl) {
                    usersListEl.innerHTML = html;
                    console.log('Таблица пользователей обновлена');
                } else {
                    console.error('Элемент usersList не найден!');
                }

            } catch (error) {
                console.error('Ошибка загрузки пользователей:', error);
                const usersListEl = document.getElementById('usersList');
                if (usersListEl) {
                    usersListEl.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Ошибка загрузки пользователей</p>';
                }
            }
        }

        // Глобальные функции для управления пользователями
        window.changeBalance = async function(userId, amount) {
            try {
                const { data: user } = await supabase
                    .from('users')
                    .select('balance_ar')
                    .eq('telegram_id', userId)
                    .single();

                const newBalance = (user.balance_ar || 0) + amount;

                if (newBalance < 0) {
                    showNotification('Баланс не может быть отрицательным', 'error');
                    return;
                }

                await supabase
                    .from('users')
                    .update({ balance_ar: newBalance })
                    .eq('telegram_id', userId);

                loadUsers(); // Перезагружаем список
                showNotification(`Баланс обновлен: ${amount > 0 ? '+' : ''}${amount} AR`);
            } catch (error) {
                console.error('Ошибка изменения баланса:', error);
                showNotification('Ошибка изменения баланса', 'error');
            }
        }

        // Функция управления балансом (упрощенная)
        // changeBalance уже определена выше и используется кнопками +50/-50

        // Открытие раздела
        window.openSection = async function(section) {
            // Скрываем все разделы
            document.querySelectorAll('.section-content').forEach(content => {
                content.classList.remove('active');
            });

            // Показываем выбранный раздел
            document.getElementById(section).classList.add('active');

            // Загружаем данные для раздела
            if (section === 'dashboard') {
                await loadDashboard();
            } else if (section === 'tasks') {
                await loadQuizzes();
            }
        };

        // Возврат на главную
        window.goHome = function() {
            document.querySelectorAll('.section-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById('mainPage').classList.add('active');
            loadMainStats();
        };

        // Выход
        window.logout = function() {
            if (confirm('Вы уверены, что хотите выйти?')) {
                window.Telegram?.WebApp?.close();
            }
        };

        // Уведомления
        function showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 3000);
        }

        // Функция обновления отвалившихся пользователей
        function updateChurnedUsers(users, period = '3days') {
            let daysAgo;
            let label;

            switch(period) {
                case '3days':
                    daysAgo = 3;
                    label = 'Отвалились 3+ дней';
                    break;
                case '7days':
                    daysAgo = 7;
                    label = 'Отвалились 7+ дней';
                    break;
                case '30days':
                    daysAgo = 30;
                    label = 'Отвалились 30+ дней';
                    break;
                default:
                    daysAgo = 3;
                    label = 'Отвалились 3+ дней';
            }

            const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
            const churnedCount = users?.filter(u => {
                const lastActive = u.last_seen_at || u.last_active || u.last_login || u.created_at;
                return new Date(lastActive) < cutoffDate;
            }).length || 0;

            const displayEl = document.getElementById('churnedUsersDisplay');
            const labelEl = document.getElementById('churnedLabel');

            if (displayEl) displayEl.textContent = churnedCount;
            if (labelEl) labelEl.textContent = label;
        }

        // Функция переключения периода
        window.changePeriod = function(period) {
            currentPeriod = period;

            // Обновляем стили кнопок
            document.querySelectorAll('.period-btn').forEach(btn => {
                btn.style.background = 'rgba(255, 255, 255, 0.03)';
                btn.style.border = '1px solid rgba(255, 255, 255, 0.08)';
                btn.style.color = 'rgba(255, 255, 255, 0.7)';
            });

            const activeBtn = document.getElementById('period-' + period);
            if (activeBtn) {
                activeBtn.style.background = 'rgba(255, 215, 0, 0.15)';
                activeBtn.style.border = '1px solid rgba(255, 215, 0, 0.3)';
                activeBtn.style.color = '#FFD700';
            }

            // Обновляем данные
            if (window.dashboardUsers) {
                updateChurnedUsers(window.dashboardUsers, period);
            }
        };

        // Функция создания календаря активности
        function createActivityCalendar(users) {
            const today = new Date();
            const calendarPreview = document.querySelector('#calendarPreview > div');
            const calendarView = document.getElementById('activityCalendar');

            if (!calendarPreview || !calendarView) return;

            // Создаем данные для последних 30 дней
            const calendarData = [];
            for (let i = 29; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                const nextDay = new Date(date);
                nextDay.setDate(nextDay.getDate() + 1);

                const count = users?.filter(u => {
                    const created = new Date(u.created_at);
                    return created >= date && created < nextDay;
                }).length || 0;

                calendarData.push({
                    date: new Date(date),
                    count: count,
                    day: date.getDate(),
                    month: date.toLocaleDateString('ru-RU', { month: 'short' }),
                    weekday: date.toLocaleDateString('ru-RU', { weekday: 'short' })
                });
            }

            // Создаем мини-превью (последние 14 дней)
            calendarPreview.innerHTML = calendarData.slice(-14).map(d => {
                const intensity = d.count === 0 ? 0 : Math.min(1, d.count / 5);
                const color = d.count === 0
                    ? 'rgba(255, 255, 255, 0.03)'
                    : `rgba(255, 215, 0, ${0.2 + intensity * 0.8})`;

                return `
                    <div style="
                        width: 20px;
                        height: 20px;
                        background: ${color};
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        border-radius: 4px;
                        cursor: pointer;
                        position: relative;
                    " title="${d.day} ${d.month}: ${d.count} новых">
                    </div>
                `;
            }).join('');

            // Создаем полный календарь
            const weeks = [];
            let currentWeek = [];

            // Добавляем пустые ячейки в начале
            const firstDay = calendarData[0].date.getDay();
            const startPadding = firstDay === 0 ? 6 : firstDay - 1;
            for (let i = 0; i < startPadding; i++) {
                currentWeek.push(null);
            }

            // Заполняем календарь
            calendarData.forEach(d => {
                if (currentWeek.length === 7) {
                    weeks.push(currentWeek);
                    currentWeek = [];
                }
                currentWeek.push(d);
            });

            // Добавляем последнюю неделю
            if (currentWeek.length > 0) {
                while (currentWeek.length < 7) {
                    currentWeek.push(null);
                }
                weeks.push(currentWeek);
            }

            calendarView.innerHTML = `
                <div style="margin-bottom: 15px;">
                    <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 8px;">
                        ${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => `
                            <div style="
                                text-align: center;
                                font-size: 10px;
                                color: rgba(255, 255, 255, 0.4);
                                padding: 4px;
                            ">${day}</div>
                        `).join('')}
                    </div>
                    ${weeks.map(week => `
                        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 4px;">
                            ${week.map(day => {
                                if (!day) return '<div></div>';

                                const intensity = day.count === 0 ? 0 : Math.min(1, day.count / 5);
                                const color = day.count === 0
                                    ? 'rgba(255, 255, 255, 0.03)'
                                    : `rgba(255, 215, 0, ${0.2 + intensity * 0.8})`;

                                const isToday = day.date.toDateString() === today.toDateString();

                                return `
                                    <div style="
                                        aspect-ratio: 1;
                                        background: ${color};
                                        border: 1px solid ${isToday ? '#FFD700' : 'rgba(255, 255, 255, 0.08)'};
                                        border-radius: 6px;
                                        display: flex;
                                        flex-direction: column;
                                        align-items: center;
                                        justify-content: center;
                                        cursor: pointer;
                                        transition: all 0.2s;
                                        position: relative;
                                    " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                                        <div style="font-size: 11px; color: ${day.count > 0 ? '#000' : 'rgba(255, 255, 255, 0.6)'}; font-weight: 600;">
                                            ${day.day}
                                        </div>
                                        ${day.count > 0 ? `
                                            <div style="font-size: 9px; color: ${intensity > 0.5 ? '#000' : '#FFD700'}; margin-top: 2px;">
                                                +${day.count}
                                            </div>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `).join('')}
                </div>
                <div style="display: flex; align-items: center; gap: 15px; margin-top: 15px;">
                    <span style="font-size: 11px; color: rgba(255, 255, 255, 0.5);">Меньше</span>
                    <div style="display: flex; gap: 4px;">
                        ${[0, 0.2, 0.4, 0.6, 0.8, 1].map(intensity => `
                            <div style="
                                width: 14px;
                                height: 14px;
                                background: ${intensity === 0 ? 'rgba(255, 255, 255, 0.03)' : `rgba(255, 215, 0, ${0.2 + intensity * 0.8})`};
                                border: 1px solid rgba(255, 255, 255, 0.08);
                                border-radius: 3px;
                            "></div>
                        `).join('')}
                    </div>
                    <span style="font-size: 11px; color: rgba(255, 255, 255, 0.5);">Больше</span>
                </div>
            `;
        }

        // Функция переключения календаря
        window.toggleCalendar = function() {
            const calendarView = document.getElementById('calendarView');
            const calendarPreview = document.getElementById('calendarPreview');
            const toggleBtn = document.getElementById('calendarToggle');

            if (calendarView.style.display === 'none') {
                calendarView.style.display = 'block';
                calendarPreview.style.display = 'none';
                toggleBtn.textContent = 'Свернуть ▲';
            } else {
                calendarView.style.display = 'none';
                calendarPreview.style.display = 'block';
                toggleBtn.textContent = 'Развернуть ▼';
            }
        };

        // Простой график на Canvas без Chart.js
        function drawSimpleChart(canvas, data) {
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;

            // Очищаем canvas
            ctx.clearRect(0, 0, width, height);

            // Находим максимальное значение
            const maxValue = Math.max(...data.map(d => d.count), 1);

            // Рисуем линии сетки
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = (height - 20) * (1 - i / 4) + 10;
                ctx.beginPath();
                ctx.moveTo(30, y);
                ctx.lineTo(width - 10, y);
                ctx.stroke();
            }

            // Рисуем график
            if (data.length > 0) {
                const stepX = (width - 40) / (data.length - 1);

                // Рисуем линию
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.beginPath();

                data.forEach((point, index) => {
                    const x = 30 + index * stepX;
                    const y = (height - 20) * (1 - point.count / maxValue) + 10;

                    if (index === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });

                ctx.stroke();

                // Рисуем точки
                data.forEach((point, index) => {
                    const x = 30 + index * stepX;
                    const y = (height - 20) * (1 - point.count / maxValue) + 10;

                    ctx.fillStyle = '#FFD700';
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI * 2);
                    ctx.fill();

                    // Подписи
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(point.date, x, height - 2);
                });
            }
        }

        // Функции для раздела Рефералы
        async function loadReferrals() {
            try {
                // Загружаем всех пользователей
                const { data: users } = await supabase
                    .from('users')
                    .select('*');

                // Создаем маппинг id -> пользователь для быстрого поиска
                const userById = {};
                users.forEach(u => userById[u.id] = u);

                // Статистика - referred_by это ID пользователя, а не telegram_id
                const totalReferrals = users.filter(u => u.referred_by || u.referrer_id).length;
                const activeReferrals = users.filter(u => (u.referred_by || u.referrer_id) &&
                    (u.last_seen_at || u.last_active) &&
                    new Date(u.last_seen_at || u.last_active) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
                const orphans = users.filter(u => !u.referred_by && !u.referrer_id).length;

                // Подсчет рефералов для каждого пользователя - используем ID пользователя
                const referralCounts = {};
                users.forEach(user => {
                    const referrerId = user.referred_by || user.referrer_id;
                    if (referrerId) {
                        // Находим реферера по ID и используем его telegram_id для группировки
                        const referrer = userById[referrerId];
                        if (referrer) {
                            referralCounts[referrer.telegram_id] = (referralCounts[referrer.telegram_id] || 0) + 1;
                        }
                    }
                });

                // Топ реферер
                let topReferrer = { id: '-', count: 0 };
                for (const [id, count] of Object.entries(referralCounts)) {
                    if (count > topReferrer.count) {
                        topReferrer = { id, count };
                    }
                }

                // Среднее количество рефералов
                const referrers = Object.keys(referralCounts).length;
                const avgReferrals = referrers > 0 ? Math.round(totalReferrals / referrers) : 0;

                // Обновляем только существующие элементы статистики
                const totalReferralsEl = document.getElementById('totalReferrals');
                if (totalReferralsEl) totalReferralsEl.textContent = totalReferrals;

                const todayReferralsEl = document.getElementById('todayReferrals');
                if (todayReferralsEl) {
                    // Считаем рефералов за сегодня
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const todayRefs = users.filter(u => {
                        const hasRef = u.referred_by || u.referrer_id;
                        const createdAt = new Date(u.created_at);
                        return hasRef && createdAt >= today;
                    }).length;
                    todayReferralsEl.textContent = todayRefs;
                }

                const orphanUsersEl = document.getElementById('orphanUsers');
                if (orphanUsersEl) orphanUsersEl.textContent = orphans;

                // Создаем таблицу всех пользователей с управлением рефералами
                let usersTableHtml = `
                    <table style="font-size: 11px;">
                        <thead>
                            <tr>
                                <th style="width: 200px; text-align: left; padding-left: 10px;">Пользователь</th>
                                <th style="width: 80px; text-align: center;">ID</th>
                                <th style="width: 120px; text-align: center;">Пригласил</th>
                                <th style="width: 100px; text-align: center;">Рефералов</th>
                                <th style="width: 100px; text-align: center;">Баланс</th>
                                <th style="width: 100px; text-align: center;">Регистрация</th>
                                <th style="width: 100px; text-align: center;">Действия</th>
                            </tr>
                        </thead>
                        <tbody>`;

                for (const user of users) {
                    // Находим реферера по ID
                    const referrerId = user.referred_by || user.referrer_id;
                    const referrer = referrerId ? userById[referrerId] : null;
                    // Считаем рефералов
                    const refCount = users.filter(u => {
                        const refId = u.referred_by || u.referrer_id;
                        return refId && userById[refId] && userById[refId].telegram_id === user.telegram_id;
                    }).length;

                    usersTableHtml += `
                        <tr>
                            <td style="padding: 8px 10px;">
                                <div class="user-avatar-wrapper" style="display: flex; align-items: center; gap: 10px;">
                                    ${createAvatar(user)}
                                    <div>
                                        <div style="color: rgba(255, 255, 255, 0.9);">${user.first_name || 'Без имени'}</div>
                                        ${user.username ? `<div style="font-size: 9px; color: rgba(255,255,255,0.5);">@${user.username}</div>` : ''}
                                    </div>
                                </div>
                            </td>
                            <td style="text-align: center; color: rgba(255, 255, 255, 0.6); font-size: 10px;">${user.telegram_id}</td>
                            <td style="text-align: center; color: rgba(255, 255, 255, 0.8);">
                                ${referrer ? referrer.first_name || referrer.telegram_id : 'Без реферера'}
                            </td>
                            <td style="text-align: center; font-weight: bold; color: #FFD700;">${refCount}</td>
                            <td style="text-align: center;">${user.balance_ar || 0} AR</td>
                            <td style="text-align: center; font-size: 10px;">${new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
                            <td style="text-align: center;">
                                <button class="action-btn" onclick="showReferralTree('${user.telegram_id}')"
                                        style="background: none; border: none; padding: 5px; cursor: pointer; margin-right: 5px;"
                                        title="Дерево рефералов">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2">
                                        <path d="M12 2v6m0 0a3 3 0 1 0 0 6m0-6a3 3 0 1 1 0 6m0 0v2m0 0a3 3 0 1 0 0 6m0-6a3 3 0 1 1 0 6"></path>
                                        <path d="M9 8H3m6 8H3m18-8h-6m6 8h-6"></path>
                                    </svg>
                                </button>
                                <button class="action-btn" onclick="openSingleReferrerModal('${user.telegram_id}', '${user.referred_by || ''}')"
                                        style="background: none; border: none; padding: 5px; cursor: pointer;"
                                        title="Изменить реферера">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                            </td>
                        </tr>`;
                }

                usersTableHtml += `
                        </tbody>
                    </table>`;

                document.getElementById('referralUsersTable').innerHTML = usersTableHtml;

            } catch (error) {
                console.error('Ошибка загрузки рефералов:', error);
                showNotification('Ошибка загрузки данных рефералов', 'error');
            }
        }

        // Вычисление максимальной глубины реферальной цепочки
        function calculateMaxReferralDepth(users) {
            let maxDepth = 0;
            const userMap = {};
            users.forEach(u => userMap[u.telegram_id] = u);

            function getDepth(userId, visited = new Set()) {
                if (visited.has(userId)) return 0;
                visited.add(userId);

                const referrals = users.filter(u => u.referred_by === userId);
                if (referrals.length === 0) return 0;

                let max = 0;
                for (const ref of referrals) {
                    const depth = 1 + getDepth(ref.telegram_id, visited);
                    if (depth > max) max = depth;
                }
                return max;
            }

            users.forEach(user => {
                if (!user.referred_by) {
                    const depth = getDepth(user.telegram_id);
                    if (depth > maxDepth) maxDepth = depth;
                }
            });

            return maxDepth;
        }

        // Массовая смена реферера
        window.showMassReferrerChange = function() {
            document.getElementById('massReferrerModal').classList.add('active');
        };

        window.closeMassReferrerModal = function() {
            document.getElementById('massReferrerModal').classList.remove('active');
        };

        window.checkMassReferrals = async function() {
            const fromId = document.getElementById('massFromReferrer').value.trim();
            if (!fromId) {
                showNotification('Введите ID реферера', 'error');
                return;
            }

            try {
                const { count } = await supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true })
                    .eq('referred_by', fromId);

                document.getElementById('massReferralCount').textContent = count || 0;

                if (count === 0) {
                    showNotification('У этого пользователя нет рефералов', 'error');
                } else {
                    showNotification(`Найдено ${count} рефералов для переноса`);
                }
            } catch (error) {
                console.error('Ошибка проверки:', error);
                showNotification('Ошибка проверки рефералов', 'error');
            }
        };

        window.executeMassReferrerChange = async function() {
            const fromId = document.getElementById('massFromReferrer').value.trim();
            const toId = document.getElementById('massToReferrer').value.trim();

            if (!fromId || !toId) {
                showNotification('Заполните оба поля', 'error');
                return;
            }

            if (fromId === toId) {
                showNotification('ID должны отличаться', 'error');
                return;
            }

            if (!confirm(`Перенести всех рефералов от ${fromId} к ${toId}?`)) {
                return;
            }

            try {
                // Проверяем существование нового реферера
                const { data: newReferrer } = await supabase
                    .from('users')
                    .select('telegram_id')
                    .eq('telegram_id', toId)
                    .single();

                if (!newReferrer) {
                    showNotification('Новый реферер не найден', 'error');
                    return;
                }

                // Переносим рефералов
                const { error } = await supabase
                    .from('users')
                    .update({ referrer_id: toId })
                    .eq('referrer_id', fromId);

                if (error) throw error;

                showNotification('Рефералы успешно перенесены');
                closeMassReferrerModal();
                loadReferrals();
            } catch (error) {
                console.error('Ошибка переноса:', error);
                showNotification('Ошибка переноса рефералов', 'error');
            }
        };

        // Функция показа ТОП 100
        window.showTop100Modal = async function() {
            document.getElementById('top100Modal').classList.add('active');

            try {
                const { data: users } = await supabase
                    .from('users')
                    .select('*');

                // Создаем маппинг для быстрого поиска
                const userById = {};
                users.forEach(u => userById[u.id] = u);

                // Подсчет рефералов по уровням для каждого пользователя
                const userStats = {};

                users.forEach(user => {
                    userStats[user.telegram_id] = {
                        user: user,
                        level1: 0,
                        level2: 0,
                        totalReferrals: 0
                    };
                });

                // Считаем рефералов первого уровня
                users.forEach(user => {
                    const referrerId = user.referred_by || user.referrer_id;
                    if (referrerId) {
                        const referrer = userById[referrerId];
                        if (referrer && userStats[referrer.telegram_id]) {
                            userStats[referrer.telegram_id].level1++;
                            userStats[referrer.telegram_id].totalReferrals++;
                        }
                    }
                });

                // Считаем рефералов второго уровня
                users.forEach(user => {
                    const referrerId = user.referred_by || user.referrer_id;
                    if (referrerId) {
                        const referrer = userById[referrerId];
                        if (referrer) {
                            // Находим рефералов этого пользователя
                            const userReferrals = users.filter(u => {
                                const refId = u.referred_by || u.referrer_id;
                                return refId === user.id;
                            });

                            // Для каждого реферала первого уровня добавляем ко второму уровню реферера
                            userReferrals.forEach(() => {
                                const grandReferrerId = referrer.telegram_id;
                                if (userStats[grandReferrerId]) {
                                    userStats[grandReferrerId].level2++;
                                    userStats[grandReferrerId].totalReferrals++;
                                }
                            });
                        }
                    }
                });

                // Сортируем по правилам: 1 уровень, потом 2 уровень, потом по алфавиту
                const sortedUsers = Object.values(userStats)
                    .filter(stat => stat.totalReferrals > 0)
                    .sort((a, b) => {
                        if (a.level1 !== b.level1) {
                            return b.level1 - a.level1;
                        }
                        if (a.level2 !== b.level2) {
                            return b.level2 - a.level2;
                        }
                        // По алфавиту
                        const nameA = a.user.first_name || a.user.telegram_id;
                        const nameB = b.user.first_name || b.user.telegram_id;
                        return nameA.localeCompare(nameB);
                    })
                    .slice(0, 100);

                // Создаем HTML таблицу
                let tableHtml = `
                    <table style="width: 100%; font-size: 12px;">
                        <thead>
                            <tr>
                                <th style="width: 50px; text-align: center;">Место</th>
                                <th style="width: 250px; text-align: left; padding-left: 10px;">Пользователь</th>
                                <th style="width: 100px; text-align: center;">ID</th>
                                <th style="width: 120px; text-align: center;">Рефералы 1 ур.</th>
                                <th style="width: 120px; text-align: center;">Рефералы 2 ур.</th>
                                <th style="width: 100px; text-align: center;">Всего</th>
                            </tr>
                        </thead>
                        <tbody>`;

                sortedUsers.forEach((stat, index) => {
                    const placeStyle = index < 3 ? 'color: #FFD700; font-weight: bold; font-size: 16px;' : '';
                    const placeIcon = index === 0 ? '1' : index === 1 ? '2' : index === 2 ? '3' : `${index + 1}`;

                    tableHtml += `
                        <tr>
                            <td style="text-align: center; ${placeStyle}">${placeIcon}</td>
                            <td style="padding: 8px 10px;">
                                <div class="user-avatar-wrapper" style="display: flex; align-items: center; gap: 10px;">
                                    ${createAvatar(stat.user)}
                                    <div>
                                        <div style="color: rgba(255, 255, 255, 0.9);">${stat.user.first_name || 'Без имени'}</div>
                                        ${stat.user.username ? `<div style="font-size: 9px; color: rgba(255,255,255,0.5);">@${stat.user.username}</div>` : ''}
                                    </div>
                                </div>
                            </td>
                            <td style="text-align: center; color: rgba(255, 255, 255, 0.6); font-size: 10px;">${stat.user.telegram_id}</td>
                            <td style="text-align: center; font-weight: bold; color: #2ecc71;">${stat.level1}</td>
                            <td style="text-align: center; font-weight: bold; color: #3498db;">${stat.level2}</td>
                            <td style="text-align: center; font-weight: bold; color: #FFD700;">${stat.totalReferrals}</td>
                        </tr>`;
                });

                tableHtml += `
                        </tbody>
                    </table>`;

                document.getElementById('top100Content').innerHTML = tableHtml;

            } catch (error) {
                console.error('Ошибка загрузки ТОП 100:', error);
                document.getElementById('top100Content').innerHTML = '<p style="color: red;">Ошибка загрузки данных</p>';
            }
        };

        window.closeTop100Modal = function() {
            document.getElementById('top100Modal').classList.remove('active');
        };

        // Функция открытия модального окна смены реферера
        window.showChangeReferrer = function() {
            document.getElementById('changeReferrerModal').classList.add('active');
        };

        window.closeChangeReferrerModal = function() {
            document.getElementById('changeReferrerModal').classList.remove('active');
            document.getElementById('changeUserId').value = '';
            document.getElementById('changeNewReferrer').value = '';
        };

        // Функция выполнения смены реферера
        window.executeChangeReferrer = async function() {
            const userId = document.getElementById('changeUserId').value.trim();
            const newReferrerId = document.getElementById('changeNewReferrer').value.trim();

            if (!userId) {
                showNotification('Введите ID пользователя', 'error');
                return;
            }

            try {
                // Находим пользователя по telegram_id
                const { data: user } = await supabase
                    .from('users')
                    .select('*')
                    .eq('telegram_id', userId)
                    .single();

                if (!user) {
                    showNotification('Пользователь не найден', 'error');
                    return;
                }

                // Если указан новый реферер, находим его
                let newReferrerDbId = null;
                if (newReferrerId) {
                    const { data: referrer } = await supabase
                        .from('users')
                        .select('*')
                        .eq('telegram_id', newReferrerId)
                        .single();

                    if (!referrer) {
                        showNotification('Реферер не найден', 'error');
                        return;
                    }
                    newReferrerDbId = referrer.id;
                }

                // Обновляем реферера
                const { error } = await supabase
                    .from('users')
                    .update({ referrer_id: newReferrerDbId })
                    .eq('telegram_id', userId);

                if (error) throw error;

                showNotification('Реферер успешно изменен', 'success');
                closeChangeReferrerModal();
                await loadReferrals(); // Обновляем данные

            } catch (error) {
                console.error('Ошибка смены реферера:', error);
                showNotification('Ошибка при смене реферера', 'error');
            }
        };

        // Функция показа дерева рефералов (общая, без указания конкретного пользователя)
        window.showReferralTree = async function(referrerId) {
            // Если referrerId не передан, показываем модальное окно для ввода ID
            if (!referrerId) {
                const userId = prompt('Введите Telegram ID пользователя для просмотра дерева рефералов:');
                if (!userId) return;
                referrerId = userId.trim();
            }
            try {
                const { data: users } = await supabase
                    .from('users')
                    .select('*');

                const userById = {};
                users.forEach(u => userById[u.id] = u);

                // Находим основного пользователя
                const mainUser = users.find(u => u.telegram_id === referrerId);
                if (!mainUser) {
                    showNotification('Пользователь не найден', 'error');
                    return;
                }

                // Находим рефералов
                const referrals = users.filter(u => {
                    const refId = u.referred_by || u.referrer_id;
                    return refId && userById[refId] && userById[refId].telegram_id === referrerId;
                });

                // Показываем модальное окно с деревом
                let treeHtml = `
                    <div style="padding: 20px;">
                        <h4 style="color: #FFD700; margin-bottom: 20px;">Дерево рефералов: ${mainUser.first_name || mainUser.telegram_id}</h4>
                        <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 215, 0, 0.2); border-radius: 10px; padding: 15px;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                                ${createAvatar(mainUser)}
                                <div>
                                    <div style="font-weight: 600; color: #FFD700;">${mainUser.first_name || 'Без имени'}</div>
                                    <div style="font-size: 11px; color: rgba(255,255,255,0.5);">ID: ${mainUser.telegram_id}</div>
                                </div>
                            </div>`;

                if (referrals.length > 0) {
                    treeHtml += '<div style="border-left: 2px solid rgba(255, 215, 0, 0.2); margin-left: 20px; padding-left: 20px;">';
                    referrals.forEach((ref, index) => {
                        const isLast = index === referrals.length - 1;
                        treeHtml += `
                            <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
                                <div style="width: 20px; height: 2px; background: rgba(255, 215, 0, 0.2);"></div>
                                ${createAvatar(ref, 'mini')}
                                <div>
                                    <div style="font-size: 13px; font-weight: 500;">${ref.first_name || 'Без имени'}</div>
                                    <div style="font-size: 10px; color: rgba(255,255,255,0.5);">ID: ${ref.telegram_id} | ${ref.balance_ar || 0} AR</div>
                                </div>
                            </div>`;
                    });
                    treeHtml += '</div>';
                } else {
                    treeHtml += '<div style="color: rgba(255,255,255,0.5); font-size: 12px; margin-top: 10px;">Нет рефералов</div>';
                }

                treeHtml += `
                        </div>
                    </div>`;

                // Показываем в модальном окне
                const modal = document.getElementById('treeModal');
                if (!modal) {
                    // Создаем модальное окно для дерева
                    const modalDiv = document.createElement('div');
                    modalDiv.id = 'treeModal';
                    modalDiv.className = 'modal active';
                    modalDiv.innerHTML = `
                        <div class="modal-content">
                            <div class="modal-header">
                                <h3>Дерево рефералов</h3>
                                <button class="modal-close" onclick="document.getElementById('treeModal').classList.remove('active')">×</button>
                            </div>
                            <div class="modal-body" id="treeContent">
                                ${treeHtml}
                            </div>
                        </div>`;
                    document.body.appendChild(modalDiv);
                } else {
                    modal.classList.add('active');
                    document.getElementById('treeContent').innerHTML = treeHtml;
                }
            } catch (error) {
                console.error('Ошибка загрузки дерева:', error);
                showNotification('Ошибка загрузки дерева рефералов', 'error');
            }
        };

        window.transferAllReferrals = function(fromId) {
            document.getElementById('massFromReferrer').value = fromId;
            showMassReferrerChange();
        };

        // Функции для изменения реферера одного пользователя
        window.openSingleReferrerModal = async function(userId, currentReferrerDbId) {
            console.log('Открытие модалки редактирования:', { userId, currentReferrerDbId });

            const modalElement = document.getElementById('singleReferrerModal');
            if (!modalElement) {
                console.error('Модальное окно не найдено!');
                showNotification('Ошибка: модальное окно не найдено', 'error');
                return;
            }

            const userIdInput = document.getElementById('singleUserId');
            if (!userIdInput) {
                console.error('Поле singleUserId не найдено!');
                showNotification('Ошибка: поле ID не найдено', 'error');
                return;
            }

            userIdInput.value = userId;

            // Если есть текущий реферер, находим его telegram_id по id в БД
            if (currentReferrerDbId && currentReferrerDbId !== 'null' && currentReferrerDbId !== '') {
                try {
                    const { data: referrer, error } = await supabase
                        .from('users')
                        .select('telegram_id, first_name')
                        .eq('id', currentReferrerDbId)
                        .single();

                    console.log('Текущий реферер:', referrer, 'Ошибка:', error);

                    if (referrer && !error) {
                        document.getElementById('currentSingleReferrer').value =
                            `${referrer.first_name || 'ID'}: ${referrer.telegram_id}`;
                    } else {
                        document.getElementById('currentSingleReferrer').value = 'Нет реферера';
                    }
                } catch (error) {
                    console.error('Ошибка получения реферера:', error);
                    document.getElementById('currentSingleReferrer').value = 'Нет реферера';
                }
            } else {
                document.getElementById('currentSingleReferrer').value = 'Нет реферера';
            }

            document.getElementById('newSingleReferrer').value = '';
            modalElement.classList.add('active');
        };

        window.closeSingleReferrerModal = function() {
            document.getElementById('singleReferrerModal').classList.remove('active');
        };

        window.updateSingleReferrer = async function() {
            const userIdEl = document.getElementById('singleUserId');
            const newReferrerIdEl = document.getElementById('newSingleReferrer');

            if (!userIdEl || !newReferrerIdEl) {
                console.error('Не найдены поля ввода!', { userIdEl, newReferrerIdEl });
                showNotification('Ошибка: не найдены поля ввода', 'error');
                return;
            }

            const userId = userIdEl.value;
            const newReferrerId = newReferrerIdEl.value.trim();

            console.log('Обновление реферера:', { userId, newReferrerId });

            if (!userId) {
                showNotification('Ошибка: не указан ID пользователя', 'error');
                return;
            }

            if (!newReferrerId) {
                showNotification('Введите ID нового реферера', 'error');
                return;
            }

            if (userId === newReferrerId) {
                showNotification('Пользователь не может быть реферером сам себе', 'error');
                return;
            }

            try {
                // Находим нового реферера и получаем его id (не telegram_id!)
                const { data: referrer, error: refError } = await supabase
                    .from('users')
                    .select('id, telegram_id, first_name')
                    .eq('telegram_id', newReferrerId)
                    .single();

                console.log('Найден реферер:', referrer, 'Ошибка:', refError);

                if (refError || !referrer) {
                    showNotification(`Реферер с ID ${newReferrerId} не найден в базе`, 'error');
                    return;
                }

                // Находим пользователя, которому меняем реферера
                const { data: userToUpdate, error: userError } = await supabase
                    .from('users')
                    .select('id, telegram_id')
                    .eq('telegram_id', userId)
                    .single();

                console.log('Пользователь для обновления:', userToUpdate, 'Ошибка:', userError);

                if (userError || !userToUpdate) {
                    showNotification(`Пользователь с ID ${userId} не найден`, 'error');
                    return;
                }

                // Обновляем реферера - используем referrer.id, а не telegram_id!
                const { data: updateData, error } = await supabase
                    .from('users')
                    .update({ referrer_id: referrer.id })
                    .eq('id', userToUpdate.id)
                    .select();

                console.log('Результат обновления:', updateData, 'Ошибка:', error);

                if (error) throw error;

                showNotification(`✅ Реферер изменен на ${referrer.first_name || newReferrerId}`, 'success');
                closeSingleReferrerModal();

                // Перезагружаем таблицы в разделе рефералов
                if (document.getElementById('referrals').classList.contains('active')) {
                    await loadReferrals();
                }
            } catch (error) {
                console.error('Полная ошибка:', error);
                showNotification(`Ошибка: ${error.message || 'Неизвестная ошибка'}`, 'error');
            }
        };

        window.clearSingleReferrer = async function() {
            const userId = document.getElementById('singleUserId').value;

            try {
                const { error } = await supabase
                    .from('users')
                    .update({ referrer_id: null })
                    .eq('telegram_id', userId);

                if (error) throw error;

                showNotification('Реферер очищен');
                closeSingleReferrerModal();

                // Перезагружаем таблицы в разделе рефералов
                if (document.getElementById('referrals').classList.contains('active')) {
                    loadReferrals();
                }
            } catch (error) {
                console.error('Ошибка очистки реферера:', error);
                showNotification('Ошибка очистки реферера', 'error');
            }
        };

        // Обновляем функцию openSection
        const originalOpenSection = window.openSection;
        window.openSection = async function(section) {
            await originalOpenSection(section);

            // Вставляем хедеры для каждого раздела
            const sectionTitles = {
                'dashboard': 'Дашборд',
                'referrals': 'Рефералы',
                'shop': 'Магазин',
                'chests': 'Сундуки',
                'giveaways': 'Розыгрыши',
                'finance': 'Финансы',
                'settings': 'Настройки',
                'analytics': 'Аналитика',
                'logs': 'Логи и отладка'
            };

            const headerContainer = document.getElementById(`${section}-header`);
            if (headerContainer && typeof createSectionHeader !== 'undefined') {
                headerContainer.innerHTML = createSectionHeader(sectionTitles[section] || section);
            }

            if (section === 'referrals') {
                await loadReferrals();
            } else if (section === 'dashboard') {
                await loadDashboard();
            }
        };

        // Заглушка для редактирования
        window.editUser = function(id) {
            showNotification(`Редактирование пользователя ${id} будет доступно в следующем обновлении`);
        };

        // Функции для модальных окон статистики
        // Функции для календарей новых пользователей
        window.showNewUsersCalendar = async function() {
            document.getElementById('newUsersCalendarModal').classList.add('active');

            try {
                const { data: users } = await supabase
                    .from('users')
                    .select('*')
                    .order('created_at', { ascending: false });

                // Создаем календарь за 30 дней
                const today = new Date();
                const calendarData = [];
                let selectedDayUsers = [];

                for (let i = 29; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    date.setHours(0, 0, 0, 0);
                    const nextDay = new Date(date);
                    nextDay.setDate(nextDay.getDate() + 1);

                    const dayUsers = users?.filter(u => {
                        const created = new Date(u.created_at);
                        return created >= date && created < nextDay;
                    }) || [];

                    calendarData.push({
                        date: new Date(date),
                        count: dayUsers.length,
                        users: dayUsers,
                        day: date.getDate(),
                        month: date.toLocaleDateString('ru-RU', { month: 'short' }),
                        weekday: date.toLocaleDateString('ru-RU', { weekday: 'short' })
                    });
                }

                // Функция клика по дню
                window.selectNewUsersDay = function(dayIndex) {
                    selectedDayUsers = calendarData[dayIndex].users;
                    renderNewUsersList();
                };

                // Создаем календарную сетку
                const weeks = [];
                let currentWeek = [];

                const firstDay = calendarData[0].date.getDay();
                const startPadding = firstDay === 0 ? 6 : firstDay - 1;
                for (let i = 0; i < startPadding; i++) {
                    currentWeek.push(null);
                }

                calendarData.forEach((d, index) => {
                    if (currentWeek.length === 7) {
                        weeks.push(currentWeek);
                        currentWeek = [];
                    }
                    currentWeek.push({...d, index});
                });

                if (currentWeek.length > 0) {
                    while (currentWeek.length < 7) {
                        currentWeek.push(null);
                    }
                    weeks.push(currentWeek);
                }

                let html = `
                    <div style="padding: 20px;">
                        <h4 style="font-size: 16px; margin-bottom: 15px; color: #4CAF50;">Календарь новых пользователей</h4>
                        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-bottom: 8px;">
                            ${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => `
                                <div style="text-align: center; font-size: 11px; color: rgba(255, 255, 255, 0.4); padding: 4px;">${day}</div>
                            `).join('')}
                        </div>
                        ${weeks.map(week => `
                            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-bottom: 6px;">
                                ${week.map(day => {
                                    if (!day) return '<div></div>';

                                    const intensity = day.count === 0 ? 0 : Math.min(1, day.count / 5);
                                    const color = day.count === 0
                                        ? 'rgba(255, 255, 255, 0.03)'
                                        : `rgba(76, 175, 80, ${0.2 + intensity * 0.8})`;

                                    const isToday = day.date.toDateString() === today.toDateString();

                                    return `
                                        <div style="
                                            aspect-ratio: 1;
                                            background: ${color};
                                            border: 1px solid ${isToday ? '#4CAF50' : 'rgba(255, 255, 255, 0.08)'};
                                            border-radius: 8px;
                                            display: flex;
                                            flex-direction: column;
                                            align-items: center;
                                            justify-content: center;
                                            cursor: pointer;
                                            transition: all 0.2s;
                                            position: relative;
                                            padding: 4px;
                                        " title="${day.day} ${day.month}: ${day.count} новых"
                                          onclick="selectNewUsersDay(${day.index})"
                                          onmouseover="this.style.transform='scale(1.05)'"
                                          onmouseout="this.style.transform='scale(1)'">
                                            <div style="font-size: 12px; color: ${day.count > 0 ? '#000' : 'rgba(255, 255, 255, 0.6)'}; font-weight: 600;">
                                                ${day.day}
                                            </div>
                                            ${day.count > 0 ? `
                                                <div style="font-size: 10px; color: ${intensity > 0.5 ? '#000' : '#4CAF50'}; margin-top: 2px; font-weight: 700;">
                                                    +${day.count}
                                                </div>
                                            ` : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `).join('')}

                        <div style="display: flex; align-items: center; gap: 15px; margin-top: 20px;">
                            <span style="font-size: 11px; color: rgba(255, 255, 255, 0.5);">Меньше</span>
                            <div style="display: flex; gap: 4px;">
                                ${[0, 0.2, 0.4, 0.6, 0.8, 1].map(intensity => `
                                    <div style="
                                        width: 16px;
                                        height: 16px;
                                        background: ${intensity === 0 ? 'rgba(255, 255, 255, 0.03)' : `rgba(76, 175, 80, ${0.2 + intensity * 0.8})`};
                                        border: 1px solid rgba(255, 255, 255, 0.08);
                                        border-radius: 3px;
                                    "></div>
                                `).join('')}
                            </div>
                            <span style="font-size: 11px; color: rgba(255, 255, 255, 0.5);">Больше</span>
                        </div>
                    </div>`;

                document.getElementById('newUsersCalendarContent').innerHTML = html;

                // Функция рендера списка пользователей
                window.renderNewUsersList = function() {
                    if (selectedDayUsers.length === 0) {
                        document.getElementById('newUsersListContent').innerHTML = `
                            <div style="text-align: center; color: rgba(255, 255, 255, 0.5); padding: 20px;">
                                Выберите день в календаре для просмотра пользователей
                            </div>`;
                        return;
                    }

                    const listHtml = `
                        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 20px;">
                            <h4 style="margin: 0 0 15px 0; color: #4CAF50; font-size: 14px;">Пользователи (${selectedDayUsers.length})</h4>
                            <div style="max-height: 300px; overflow-y: auto;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                    <thead>
                                        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                                            <th style="text-align: left; padding: 8px; color: rgba(255, 255, 255, 0.7);">ID</th>
                                            <th style="text-align: left; padding: 8px; color: rgba(255, 255, 255, 0.7);">Имя</th>
                                            <th style="text-align: left; padding: 8px; color: rgba(255, 255, 255, 0.7);">Дата</th>
                                            <th style="text-align: right; padding: 8px; color: rgba(255, 255, 255, 0.7);">Баланс</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${selectedDayUsers.map(user => `
                                            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                <td style="padding: 8px; color: rgba(255, 255, 255, 0.8);">${user.telegram_id}</td>
                                                <td style="padding: 8px; color: rgba(255, 255, 255, 0.9);">${user.first_name || 'Без имени'}</td>
                                                <td style="padding: 8px; color: rgba(255, 255, 255, 0.6);">${new Date(user.created_at).toLocaleDateString()}</td>
                                                <td style="padding: 8px; text-align: right; color: #FFD700;">${user.balance || 0}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>`;

                    document.getElementById('newUsersListContent').innerHTML = listHtml;
                };

                // Показываем пустой список изначально
                renderNewUsersList();

            } catch (error) {
                console.error('Ошибка загрузки статистики новых пользователей:', error);
                document.getElementById('newUsersContent').innerHTML = '<p style="color: red;">Ошибка загрузки данных</p>';
            }
        };

        window.closeNewUsersCalendarModal = function() {
            document.getElementById('newUsersCalendarModal').classList.remove('active');
        };

        // Функция календаря отвалившихся пользователей
        window.showChurnedUsersCalendar = async function() {
            document.getElementById('churnedUsersCalendarModal').classList.add('active');

            try {
                const { data: users } = await supabase
                    .from('users')
                    .select('*')
                    .order('last_seen_at', { ascending: true, nullsFirst: false });

                const today = new Date();
                const calendarData = [];
                let selectedDayUsers = [];

                // Создаем календарь за 30 дней для отвалившихся
                for (let i = 29; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    date.setHours(0, 0, 0, 0);
                    const nextDay = new Date(date);
                    nextDay.setDate(nextDay.getDate() + 1);

                    // Пользователи, которые отвалились в этот день (не были активны 3+ дня от этой даты)
                    const dayChurnedUsers = users?.filter(u => {
                        const lastActive = new Date(u.last_seen_at || u.last_active || u.created_at);
                        const threeDaysFromDate = new Date(date.getTime() + 3 * 24 * 60 * 60 * 1000);

                        // Проверяем что последняя активность была раньше чем 3 дня от текущей даты
                        // И что пользователь был создан раньше чем 3 дня от текущей даты
                        return lastActive < date && lastActive >= new Date(date.getTime() - 24 * 60 * 60 * 1000);
                    }) || [];

                    calendarData.push({
                        date: new Date(date),
                        count: dayChurnedUsers.length,
                        users: dayChurnedUsers,
                        day: date.getDate(),
                        month: date.toLocaleDateString('ru-RU', { month: 'short' }),
                        weekday: date.toLocaleDateString('ru-RU', { weekday: 'short' })
                    });
                }

                // Функция клика по дню
                window.selectChurnedUsersDay = function(dayIndex) {
                    selectedDayUsers = calendarData[dayIndex].users;
                    renderChurnedUsersList();
                };

                // Создаем календарную сетку
                const weeks = [];
                let currentWeek = [];

                const firstDay = calendarData[0].date.getDay();
                const startPadding = firstDay === 0 ? 6 : firstDay - 1;
                for (let i = 0; i < startPadding; i++) {
                    currentWeek.push(null);
                }

                calendarData.forEach((d, index) => {
                    if (currentWeek.length === 7) {
                        weeks.push(currentWeek);
                        currentWeek = [];
                    }
                    currentWeek.push({...d, index});
                });

                if (currentWeek.length > 0) {
                    while (currentWeek.length < 7) {
                        currentWeek.push(null);
                    }
                    weeks.push(currentWeek);
                }

                let html = `
                    <div style="padding: 20px;">
                        <h4 style="font-size: 16px; margin-bottom: 15px; color: #FF5722;">Календарь отвалившихся пользователей</h4>
                        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-bottom: 8px;">
                            ${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => `
                                <div style="text-align: center; font-size: 11px; color: rgba(255, 255, 255, 0.4); padding: 4px;">${day}</div>
                            `).join('')}
                        </div>
                        ${weeks.map(week => `
                            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-bottom: 6px;">
                                ${week.map(day => {
                                    if (!day) return '<div></div>';

                                    const intensity = day.count === 0 ? 0 : Math.min(1, day.count / 3);
                                    const color = day.count === 0
                                        ? 'rgba(255, 255, 255, 0.03)'
                                        : `rgba(255, 87, 34, ${0.2 + intensity * 0.8})`;

                                    const isToday = day.date.toDateString() === today.toDateString();

                                    return `
                                        <div style="
                                            aspect-ratio: 1;
                                            background: ${color};
                                            border: 1px solid ${isToday ? '#FF5722' : 'rgba(255, 255, 255, 0.08)'};
                                            border-radius: 8px;
                                            display: flex;
                                            flex-direction: column;
                                            align-items: center;
                                            justify-content: center;
                                            cursor: pointer;
                                            transition: all 0.2s;
                                            position: relative;
                                            padding: 4px;
                                        " title="${day.day} ${day.month}: ${day.count} отвалились"
                                          onclick="selectChurnedUsersDay(${day.index})"
                                          onmouseover="this.style.transform='scale(1.05)'"
                                          onmouseout="this.style.transform='scale(1)'">
                                            <div style="font-size: 12px; color: ${day.count > 0 ? '#fff' : 'rgba(255, 255, 255, 0.6)'}; font-weight: 600;">
                                                ${day.day}
                                            </div>
                                            ${day.count > 0 ? `
                                                <div style="font-size: 10px; color: ${intensity > 0.5 ? '#fff' : '#FF5722'}; margin-top: 2px; font-weight: 700;">
                                                    -${day.count}
                                                </div>
                                            ` : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `).join('')}

                        <div style="display: flex; align-items: center; gap: 15px; margin-top: 20px;">
                            <span style="font-size: 11px; color: rgba(255, 255, 255, 0.5);">Меньше</span>
                            <div style="display: flex; gap: 4px;">
                                ${[0, 0.2, 0.4, 0.6, 0.8, 1].map(intensity => `
                                    <div style="
                                        width: 16px;
                                        height: 16px;
                                        background: ${intensity === 0 ? 'rgba(255, 255, 255, 0.03)' : `rgba(255, 87, 34, ${0.2 + intensity * 0.8})`};
                                        border: 1px solid rgba(255, 255, 255, 0.08);
                                        border-radius: 3px;
                                    "></div>
                                `).join('')}
                            </div>
                            <span style="font-size: 11px; color: rgba(255, 255, 255, 0.5);">Больше</span>
                        </div>
                    </div>`;

                document.getElementById('churnedUsersCalendarContent').innerHTML = html;

                // Функция рендера списка отвалившихся пользователей
                window.renderChurnedUsersList = function() {
                    if (selectedDayUsers.length === 0) {
                        document.getElementById('churnedUsersListContent').innerHTML = `
                            <div style="text-align: center; color: rgba(255, 255, 255, 0.5); padding: 20px;">
                                Выберите день в календаре для просмотра отвалившихся пользователей
                            </div>`;
                        return;
                    }

                    const listHtml = `
                        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 20px;">
                            <h4 style="margin: 0 0 15px 0; color: #FF5722; font-size: 14px;">Отвалившиеся пользователи (${selectedDayUsers.length})</h4>
                            <div style="max-height: 300px; overflow-y: auto;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                    <thead>
                                        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                                            <th style="text-align: left; padding: 8px; color: rgba(255, 255, 255, 0.7);">ID</th>
                                            <th style="text-align: left; padding: 8px; color: rgba(255, 255, 255, 0.7);">Имя</th>
                                            <th style="text-align: left; padding: 8px; color: rgba(255, 255, 255, 0.7);">Последняя активность</th>
                                            <th style="text-align: right; padding: 8px; color: rgba(255, 255, 255, 0.7);">Баланс</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${selectedDayUsers.map(user => `
                                            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                                <td style="padding: 8px; color: rgba(255, 255, 255, 0.8);">${user.telegram_id}</td>
                                                <td style="padding: 8px; color: rgba(255, 255, 255, 0.9);">${user.first_name || 'Без имени'}</td>
                                                <td style="padding: 8px; color: rgba(255, 255, 255, 0.6);">${new Date(user.last_seen_at || user.created_at).toLocaleDateString()}</td>
                                                <td style="padding: 8px; text-align: right; color: #FFD700;">${user.balance || 0}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>`;

                    document.getElementById('churnedUsersListContent').innerHTML = listHtml;
                };

                // Показываем пустой список изначально
                renderChurnedUsersList();

            } catch (error) {
                console.error('Ошибка загрузки статистики отвалившихся:', error);
                document.getElementById('churnedContent').innerHTML = '<p style="color: red;">Ошибка загрузки данных</p>';
            }
        };

        window.closeChurnedUsersCalendarModal = function() {
            document.getElementById('churnedUsersCalendarModal').classList.remove('active');
        };

        window.showNoTasksStats = async function() {
            document.getElementById('noTasksModal').classList.add('active');

            try {
                const { data: users } = await supabase
                    .from('users')
                    .select('*');

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Пользователи, которые были активны сегодня, но не выполнили задания
                const noTasksUsers = users.filter(u => {
                    const lastActive = u.last_seen_at || u.last_active || u.last_login;
                    return lastActive && new Date(lastActive) >= today && u.balance_ar <= 50;
                });

                let html = `
                    <div style="margin-bottom: 15px; padding: 15px; background: rgba(241, 196, 15, 0.1); border-radius: 10px;">
                        <p style="margin: 0; font-size: 13px;">Всего пользователей без заданий сегодня: <strong style="color: #f1c40f;">${noTasksUsers.length}</strong></p>
                    </div>
                    <table style="width: 100%; font-size: 12px;">
                        <thead>
                            <tr>
                                <th style="text-align: left; padding: 10px;">Пользователь</th>
                                <th style="text-align: center; padding: 10px;">ID</th>
                                <th style="text-align: center; padding: 10px;">Последняя активность</th>
                                <th style="text-align: center; padding: 10px;">Баланс</th>
                            </tr>
                        </thead>
                        <tbody>`;

                noTasksUsers.forEach(user => {
                    const lastActive = user.last_seen_at || user.last_active || user.last_login;
                    html += `
                        <tr style="border-top: 1px solid rgba(255,255,255,0.1);">
                            <td style="padding: 10px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    ${createAvatar(user)}
                                    <span>${user.first_name || 'Без имени'}</span>
                                </div>
                            </td>
                            <td style="text-align: center; padding: 10px; color: rgba(255,255,255,0.6);">${user.telegram_id}</td>
                            <td style="text-align: center; padding: 10px;">${new Date(lastActive).toLocaleTimeString('ru-RU')}</td>
                            <td style="text-align: center; padding: 10px;">${user.balance_ar} AR</td>
                        </tr>`;
                });

                html += `
                        </tbody>
                    </table>`;

                document.getElementById('noTasksContent').innerHTML = html;

            } catch (error) {
                console.error('Ошибка загрузки статистики без заданий:', error);
                document.getElementById('noTasksContent').innerHTML = '<p style="color: red;">Ошибка загрузки данных</p>';
            }
        };

        window.closeNoTasksModal = function() {
            document.getElementById('noTasksModal').classList.remove('active');
        };

        // ===== УПРАВЛЕНИЕ КВИЗАМИ =====

        // Загрузка квизов
        window.loadQuizzes = async function() {
            console.log('Раздел Задания загружен');
            console.log('Начинаем загрузку квизов из БД...');

            try {
                const { data: quizzes, error } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('type', 'educational_quiz')
                    .order('created_at', { ascending: false });

                console.log('Ответ от БД получен:', { quizzes, error });

                if (error) {
                    console.error('Ошибка загрузки квизов:', error);
                    document.getElementById('quizzesList').innerHTML = '<p style="color: red;">Ошибка загрузки квизов</p>';
                    return;
                }

                const quizzesList = document.getElementById('quizzesList');
                
                if (!quizzes || quizzes.length === 0) {
                    quizzesList.innerHTML = '<p style="color: rgba(255, 255, 255, 0.6);">Квизов пока нет</p>';
                    return;
                }

                quizzesList.innerHTML = quizzes.map(quiz => `
                    <div class="quiz-card">
                        <div class="quiz-header">
                            <h3 class="quiz-title">${quiz.title || 'Без названия'}</h3>
                            <label class="quiz-toggle">
                                <input type="checkbox" ${quiz.is_active ? 'checked' : ''}
                                       onchange="toggleQuizStatus('${quiz.id}', this.checked)">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="quiz-info">
                            <div class="quiz-stat">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="#FFD700" stroke-width="2"/>
                                    <path d="M12 6V12L16 14" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                                <span>${quiz.reward_ar || 0} AR</span>
                            </div>
                            <div class="quiz-stat">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M9 11H15M9 15H15M7 7H17C18.1 7 19 7.9 19 9V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V9C5 7.9 5.9 7 7 7Z" stroke="#888" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                                <span>${quiz.questions?.length || 0} вопросов</span>
                            </div>
                        </div>
                        <div class="quiz-actions">
                            <button onclick="editQuiz('${quiz.id}')" class="quiz-btn quiz-btn-edit">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                            <button onclick="deleteQuiz('${quiz.id}')" class="quiz-btn quiz-btn-delete">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6L18 18" stroke="#ff4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                `).join('');

            } catch (error) {
                console.error('Ошибка:', error);
                document.getElementById('quizzesList').innerHTML = '<p style="color: red;">Ошибка загрузки квизов</p>';
            }
        };

        // Подсчет количества вопросов
        function getQuestionsCount(questions) {
            if (!questions) return 0;
            if (Array.isArray(questions)) return questions.length;
            if (questions.questions && Array.isArray(questions.questions)) return questions.questions.length;
            return 0;
        }

        // Функции управления модальным окном
        window.openQuizModal = function() {
            document.getElementById('quiz-modal').style.display = 'flex';
            // Сброс формы
            document.getElementById('quiz-title').value = '';
            document.getElementById('quiz-description').value = '';
            document.getElementById('quiz-reward').value = '50';
            document.getElementById('quiz-completion').value = '';
            document.getElementById('questions-container').innerHTML = '';
        };

        window.closeQuizModal = function() {
            document.getElementById('quiz-modal').style.display = 'none';
        };

        // Добавление вопроса в модальном окне
        window.addQuestion = function() {
            const container = document.getElementById('questions-container');
            const questionCount = container.children.length + 1;

            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-item';
            questionDiv.style.cssText = `
                border: 1px solid rgba(255,215,0,0.3);
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 15px;
                background: rgba(255,255,255,0.05);
            `;

            questionDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <label style="color: #FFD700; font-weight: 500;">Вопрос ${questionCount}:</label>
                    <button onclick="this.parentElement.parentElement.remove()" style="
                        background: rgba(255,68,68,0.2);
                        color: #ff4444;
                        border: 1px solid rgba(255,68,68,0.3);
                        border-radius: 5px;
                        padding: 5px 10px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    ">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="#ff4444" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        Удалить
                    </button>
                </div>
                <input type="text" placeholder="Текст вопроса" class="input-field question-text">
                <div style="margin-top: 10px;">
                    <label style="color: #888; font-size: 12px;">Варианты ответов:</label>
                    <div class="answers-container">
                        <div style="margin: 5px 0;">
                            <input type="radio" name="correct-${questionCount}" value="0">
                            <input type="text" placeholder="Вариант 1" class="input-field answer-option" style="width: calc(100% - 30px); display: inline-block; margin: 0;">
                        </div>
                        <div style="margin: 5px 0;">
                            <input type="radio" name="correct-${questionCount}" value="1">
                            <input type="text" placeholder="Вариант 2" class="input-field answer-option" style="width: calc(100% - 30px); display: inline-block; margin: 0;">
                        </div>
                        <div style="margin: 5px 0;">
                            <input type="radio" name="correct-${questionCount}" value="2">
                            <input type="text" placeholder="Вариант 3" class="input-field answer-option" style="width: calc(100% - 30px); display: inline-block; margin: 0;">
                        </div>
                        <div style="margin: 5px 0;">
                            <input type="radio" name="correct-${questionCount}" value="3">
                            <input type="text" placeholder="Вариант 4" class="input-field answer-option" style="width: calc(100% - 30px); display: inline-block; margin: 0;">
                        </div>
                    </div>
                    <label style="color: #888; font-size: 12px; margin-top: 10px; display: block;">Отметьте правильный ответ</label>
                </div>
            `;

            container.appendChild(questionDiv);
        };

        // Сохранение квиза из модального окна
        window.saveQuizFromModal = async function() {
            try {
                const title = document.getElementById('quiz-title').value.trim();
                const description = document.getElementById('quiz-description').value.trim();
                const reward_ar = parseInt(document.getElementById('quiz-reward').value) || 50;
                const completion_message = document.getElementById('quiz-completion').value.trim() || 'Спасибо за прохождение квиза!';

                if (!title) {
                    alert('Введите название квиза');
                    return;
                }

                // Собираем вопросы
                const questionItems = document.querySelectorAll('#questions-container .question-item');
                const questions = [];

                questionItems.forEach((item, index) => {
                    const questionText = item.querySelector('.question-text').value.trim();
                    const answerOptions = item.querySelectorAll('.answer-option');
                    const correctRadio = item.querySelector(`input[name="correct-${index+1}"]:checked`);

                    if (questionText) {
                        const answers = [];
                        answerOptions.forEach(option => {
                            if (option.value.trim()) {
                                answers.push(option.value.trim());
                            }
                        });

                        if (answers.length > 0 && correctRadio) {
                            questions.push({
                                question: questionText,
                                answers: answers,
                                correct: parseInt(correctRadio.value)
                            });
                        }
                    }
                });

                // Проверяем, редактируем или создаем новый
                const editId = document.getElementById('quiz-modal').getAttribute('data-edit-id');

                const quizData = {
                    type: 'educational_quiz',
                    title,
                    description,
                    reward_ar,
                    questions: questions,
                    completion_message,
                    is_active: true
                };

                console.log('Сохраняем квиз:', quizData);

                let result;
                if (editId) {
                    // Обновляем существующий квиз
                    result = await supabase
                        .from('tasks')
                        .update(quizData)
                        .eq('id', editId)
                        .select();
                } else {
                    // Создаем новый квиз
                    result = await supabase
                        .from('tasks')
                        .insert([quizData])
                        .select();
                }

                if (result.error) {
                    console.error('Ошибка сохранения квиза:', result.error);
                    alert('Ошибка сохранения квиза: ' + result.error.message);
                    return;
                }

                // Очищаем атрибут редактирования
                document.getElementById('quiz-modal').removeAttribute('data-edit-id');

                closeQuizModal();
                await loadQuizzes();
                alert(editId ? 'Квиз успешно обновлен!' : 'Квиз успешно создан!');

            } catch (error) {
                console.error('Ошибка:', error);
                alert('Произошла ошибка при сохранении квиза');
            }
        };

        // Показать форму создания квиза (старая версия для совместимости)
        window.showCreateQuizForm = function() {
            document.getElementById('createQuizForm').style.display = 'block';
            document.getElementById('completionMessage').value = 'Спасибо за прохождение квиза!';
            
            // Сброс вопросов
            const container = document.getElementById('questionsContainer');
            container.innerHTML = `
                <div class="question-item" style="
                    border: 1px solid rgba(255,215,0,0.3);
                    border-radius: 10px;
                    padding: 15px;
                    margin-bottom: 15px;
                    background: rgba(255,255,255,0.05);
                ">
                    <div style="margin-bottom: 10px;">
                        <label style="color: white; display: block; margin-bottom: 5px;">Вопрос 1:</label>
                        <input type="text" class="question-text" placeholder="Текст вопроса" style="
                            width: 100%;
                            padding: 8px;
                            border: 1px solid rgba(255,255,255,0.2);
                            border-radius: 6px;
                            background: rgba(255,255,255,0.1);
                            color: white;
                        ">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="color: white; display: block; margin-bottom: 5px;">Варианты ответов (по одному на строку):</label>
                        <textarea class="question-options" placeholder="Вариант 1&#10;Вариант 2&#10;Вариант 3&#10;Вариант 4" style="
                            width: 100%;
                            padding: 8px;
                            border: 1px solid rgba(255,255,255,0.2);
                            border-radius: 6px;
                            background: rgba(255,255,255,0.1);
                            color: white;
                            height: 80px;
                            resize: vertical;
                        "></textarea>
                    </div>
                    <div>
                        <label style="color: white; display: block; margin-bottom: 5px;">Обучающий текст:</label>
                        <textarea class="question-education" placeholder="Объяснение правильного ответа" style="
                            width: 100%;
                            padding: 8px;
                            border: 1px solid rgba(255,255,255,0.2);
                            border-radius: 6px;
                            background: rgba(255,255,255,0.1);
                            color: white;
                            height: 60px;
                            resize: vertical;
                        "></textarea>
                    </div>
                </div>
            `;
        }

        // Скрыть форму создания квиза
        function hideCreateQuizForm() {
            document.getElementById('createQuizForm').style.display = 'none';
            // Очищаем атрибут редактирования
            document.getElementById('createQuizForm').removeAttribute('data-edit-id');
            
            // Возвращаем кнопку к исходному состоянию
            const saveBtn = document.querySelector('button[onclick="saveQuiz()"]');
            if (saveBtn) {
                saveBtn.textContent = '💾 Сохранить квиз';
            }
        }

        // Добавить вопрос
        function addQuestion() {
            const container = document.getElementById('questionsContainer');
            const questionCount = container.children.length + 1;
            
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-item';
            questionDiv.style.cssText = `
                border: 1px solid rgba(255,215,0,0.3);
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 15px;
                background: rgba(255,255,255,0.05);
            `;
            
            questionDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <label style="color: #FFD700; font-weight: 500; font-size: 16px;">Вопрос ${questionCount}:</label>
                    <button onclick="removeQuestion(this)" style="
                        background: rgba(255,68,68,0.2);
                        color: #ff4444;
                        border: 1px solid rgba(255,68,68,0.3);
                        border-radius: 6px;
                        padding: 6px 12px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 500;
                        transition: all 0.3s;
                    " onmouseover="this.style.background='rgba(255,68,68,0.3)'; this.style.borderColor='#ff4444';"
                       onmouseout="this.style.background='rgba(255,68,68,0.2)'; this.style.borderColor='rgba(255,68,68,0.3)';">Удалить</button>
                </div>
                <div style="margin-bottom: 15px;">
                    <input type="text" class="question-text" placeholder="Текст вопроса" style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 8px;
                        background: rgba(255,255,255,0.1);
                        color: white;
                        font-size: 14px;
                        transition: all 0.3s;
                    " onfocus="this.style.borderColor='#FFD700'; this.style.background='rgba(255,255,255,0.15)';"
                       onblur="this.style.borderColor='rgba(255,255,255,0.2)'; this.style.background='rgba(255,255,255,0.1)';">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="color: white; display: block; margin-bottom: 8px; font-weight: 500;">Варианты ответов (по одному на строку):</label>
                    <textarea class="question-options" placeholder="Вариант 1&#10;Вариант 2&#10;Вариант 3&#10;Вариант 4" style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 8px;
                        background: rgba(255,255,255,0.1);
                        color: white;
                        height: 100px;
                        resize: vertical;
                        font-size: 14px;
                        transition: all 0.3s;
                    " onfocus="this.style.borderColor='#FFD700'; this.style.background='rgba(255,255,255,0.15)';"
                       onblur="this.style.borderColor='rgba(255,255,255,0.2)'; this.style.background='rgba(255,255,255,0.1)';"></textarea>
                </div>
                <div>
                    <label style="color: white; display: block; margin-bottom: 8px; font-weight: 500;">Обучающий текст:</label>
                    <textarea class="question-education" placeholder="Объяснение правильного ответа" style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 8px;
                        background: rgba(255,255,255,0.1);
                        color: white;
                        height: 80px;
                        resize: vertical;
                        font-size: 14px;
                        transition: all 0.3s;
                    " onfocus="this.style.borderColor='#FFD700'; this.style.background='rgba(255,255,255,0.15)';"
                       onblur="this.style.borderColor='rgba(255,255,255,0.2)'; this.style.background='rgba(255,255,255,0.1)';"></textarea>
                </div>
            `;
            
            container.appendChild(questionDiv);
        }

        // Удалить вопрос
        function removeQuestion(button) {
            const questionItem = button.closest('.question-item');
            questionItem.remove();
            
            // Обновляем номера вопросов
            const container = document.getElementById('questionsContainer');
            const questions = container.querySelectorAll('.question-item');
            questions.forEach((item, index) => {
                const label = item.querySelector('label');
                if (label) {
                    label.textContent = `Вопрос ${index + 1}:`;
                }
            });
        }

        // Сбор вопросов из формы
        function collectQuestions() {
            const questions = [];
            const questionItems = document.querySelectorAll('.question-item');
            
            questionItems.forEach((item, index) => {
                const text = item.querySelector('.question-text').value.trim();
                const optionsText = item.querySelector('.question-options').value.trim();
                const education = item.querySelector('.question-education').value.trim();
                
                if (text && optionsText) {
                    const options = optionsText.split('\n').filter(opt => opt.trim()).map(opt => opt.trim());
                    
                    questions.push({
                        question: text,
                        options: options,
                        education_text: education || 'Спасибо за ответ!'
                    });
                }
            });
            
            return questions;
        }

        // Сохранение квиза
        async function saveQuiz() {
            try {
                const title = document.getElementById('quizTitle').value.trim();
                const description = document.getElementById('quizDescription').value.trim();
                const reward_ar = parseInt(document.getElementById('quizReward').value) || 100;
                const completion_message = document.getElementById('completionMessage').value.trim() || 'Спасибо за прохождение квиза!';
                
                if (!title) {
                    alert('Введите название квиза');
                    return;
                }
                
                const questions = collectQuestions();
                if (questions.length === 0) {
                    alert('Добавьте хотя бы один вопрос');
                    return;
                }
                
                // ВАЖНО: questions должен быть массивом!
                const quizData = {
                    type: 'educational_quiz',
                    title: title,
                    description: description,
                    reward_ar: reward_ar,
                    questions: questions, // МАССИВ, не объект!
                    completion_message: completion_message,
                    is_active: true
                };
                
                console.log('Сохраняем квиз:', quizData);
                
                // Проверяем, редактируем ли существующий квиз
                const editId = document.getElementById('createQuizForm').getAttribute('data-edit-id');
                
                let result;
                if (editId) {
                    // Обновляем существующий квиз
                    result = await supabase
                        .from('tasks')
                        .update(quizData)
                        .eq('id', editId)
                        .select();
                } else {
                    // Создаем новый квиз
                    result = await supabase
                        .from('tasks')
                        .insert([quizData])
                        .select();
                }
                
                if (result.error) {
                    console.error('Ошибка сохранения квиза:', result.error);
                    alert('Ошибка сохранения квиза: ' + result.error.message);
                    return;
                }
                
                alert(editId ? 'Квиз успешно обновлен!' : 'Квиз успешно создан!');
                hideCreateQuizForm();
                loadQuizzes(); // Перезагружаем список
                
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Произошла ошибка при сохранении квиза');
            }
        }

        // Редактирование квиза
        window.editQuiz = async function(quizId) {
            try {
                // Загружаем данные квиза
                const { data: quiz, error } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('id', quizId)
                    .single();

                if (error) {
                    console.error('Ошибка загрузки квиза:', error);
                    alert('Ошибка загрузки квиза');
                    return;
                }

                // Открываем модальное окно
                openQuizModal();

                // Заполняем форму данными квиза
                document.getElementById('quiz-title').value = quiz.title || '';
                document.getElementById('quiz-description').value = quiz.description || '';
                document.getElementById('quiz-reward').value = quiz.reward_ar || 50;
                document.getElementById('quiz-completion').value = quiz.completion_message || 'Спасибо за прохождение квиза!';

                // Сохраняем ID редактируемого квиза
                document.getElementById('quiz-modal').setAttribute('data-edit-id', quizId);

                // Загружаем вопросы
                const container = document.getElementById('questions-container');
                container.innerHTML = '';

                let questions = [];
                if (quiz.questions) {
                    if (Array.isArray(quiz.questions)) {
                        questions = quiz.questions;
                    }
                }

                if (questions.length > 0) {
                    questions.forEach((q, index) => {
                        addQuestion();
                        const questionItems = container.querySelectorAll('.question-item');
                        const currentItem = questionItems[index];

                        // Заполняем текст вопроса
                        currentItem.querySelector('.question-text').value = q.question || '';

                        // Заполняем варианты ответов
                        const answerOptions = currentItem.querySelectorAll('.answer-option');
                        if (q.answers && Array.isArray(q.answers)) {
                            q.answers.forEach((answer, ansIndex) => {
                                if (answerOptions[ansIndex]) {
                                    answerOptions[ansIndex].value = answer;
                                }
                            });
                        }

                        // Отмечаем правильный ответ
                        const correctRadio = currentItem.querySelector(`input[name="correct-${index+1}"][value="${q.correct}"]`);
                        if (correctRadio) {
                            correctRadio.checked = true;
                        }
                    });
                } else {
                    // Добавляем один пустой вопрос
                    addQuestion();
                }

            } catch (error) {
                console.error('Ошибка при редактировании квиза:', error);
                // Не показываем alert, просто логируем ошибку
            }
        };

        // Переключение статуса квиза
        window.toggleQuizStatus = async function(quizId, isActive) {
            try {
                const { error } = await supabase
                    .from('tasks')
                    .update({ is_active: isActive })
                    .eq('id', quizId);

                if (error) {
                    console.error('Ошибка обновления статуса:', error);
                    // Откатываем изменение
                    await loadQuizzes();
                    return;
                }

            } catch (error) {
                console.error('Ошибка:', error);
                // Откатываем изменение
                await loadQuizzes();
            }
        };

        // Удаление квиза
        window.deleteQuiz = async function(quizId) {
            if (!confirm('Удалить квиз? Это действие нельзя отменить!')) {
                return;
            }

            try {
                const { error } = await supabase
                    .from('tasks')
                    .delete()
                    .eq('id', quizId);

                if (error) {
                    console.error('Ошибка удаления квиза:', error);
                    alert('Ошибка удаления: ' + error.message);
                    return;
                }

                await loadQuizzes(); // Перезагружаем список

            } catch (error) {
                console.error('Ошибка:', error);
                alert('Произошла ошибка при удалении квиза');
            }
        };

        // Загружаем квизы при открытии раздела
        document.addEventListener('DOMContentLoaded', function() {
            // Загружаем квизы при первом открытии страницы
            setTimeout(loadQuizzes, 1000);
        });

        // ======================
        // СИСТЕМА ЛОГОВ И ОТЛАДКИ
        // ======================

        // Массив для хранения всех логов
        let allLogs = [];
        let autoRefresh = false;
        let logsSection = null;

        // Инициализация системы логов
        function initLogsSystem() {
            logsSection = document.getElementById('logs');
            if (!logsSection) return;

            // Перехватываем console методы
            const originalConsole = {
                log: console.log,
                error: console.error,
                warn: console.warn,
                info: console.info
            };

            // Функция добавления лога
            function addLog(level, args, originalMethod) {
                const timestamp = new Date();
                const message = args.map(arg =>
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' ');

                // Определяем тип лога
                let logType = 'general';
                if (message.includes('[AUTH]')) logType = 'auth';
                else if (message.includes('REFERRAL') || message.includes('[REFERRAL]')) logType = 'referral';
                else if (level === 'error') logType = 'error';

                // Добавляем в массив
                const logEntry = {
                    timestamp,
                    level,
                    message,
                    type: logType,
                    id: Date.now() + Math.random()
                };

                allLogs.push(logEntry);

                // Ограничиваем количество логов (последние 500)
                if (allLogs.length > 500) {
                    allLogs = allLogs.slice(-500);
                }

                // Обновляем интерфейс если находимся в разделе логов
                if (document.getElementById('logs').classList.contains('active')) {
                    updateLogsDisplay();
                }

                // Вызываем оригинальный метод
                originalMethod.apply(console, args);
            }

            // Перехватываем все консольные методы
            console.log = function(...args) { addLog('log', args, originalConsole.log); };
            console.error = function(...args) { addLog('error', args, originalConsole.error); };
            console.warn = function(...args) { addLog('warn', args, originalConsole.warn); };
            console.info = function(...args) { addLog('info', args, originalConsole.info); };

            // Обработчики кнопок
            document.getElementById('clearLogsBtn').addEventListener('click', clearLogs);
            document.getElementById('exportLogsBtn').addEventListener('click', exportLogs);
            document.getElementById('autoRefreshBtn').addEventListener('click', toggleAutoRefresh);

            // Обработчики фильтров
            ['filterAuth', 'filterReferral', 'filterError', 'filterGeneral'].forEach(id => {
                document.getElementById(id).addEventListener('change', updateLogsDisplay);
            });

            document.getElementById('searchLogs').addEventListener('input', updateLogsDisplay);

            console.log('🔍 [LOGS] Система логов инициализирована - все консольные сообщения перехватываются');
        }

        // Загрузка логов из localStorage
        function loadLogsFromStorage() {
            try {
                const logs = localStorage.getItem('ar_arena_logs');
                if (logs) {
                    allLogs = JSON.parse(logs);
                    console.log(`🔧 [ADMIN] Загружено ${allLogs.length} логов из localStorage`);
                } else {
                    allLogs = [];
                }
            } catch (error) {
                console.error('Ошибка загрузки логов из localStorage:', error);
                allLogs = [];
            }
        }

        // Обновление отображения логов
        function updateLogsDisplay() {
            const console = document.getElementById('logsConsole');
            if (!console) return;

            // Загружаем свежие логи из localStorage
            loadLogsFromStorage();

            // Получаем состояние фильтров
            const filters = {
                auth: document.getElementById('filterAuth').checked,
                referral: document.getElementById('filterReferral').checked,
                error: document.getElementById('filterError').checked,
                general: document.getElementById('filterGeneral').checked
            };

            const searchTerm = document.getElementById('searchLogs').value.toLowerCase();

            // Фильтруем логи
            let filteredLogs = allLogs.filter(log => {
                if (!filters[log.type]) return false;
                if (searchTerm && !log.message.toLowerCase().includes(searchTerm)) return false;
                return true;
            });

            // Отображаем последние 100 логов для производительности
            filteredLogs = filteredLogs.slice(-100);

            // Формируем HTML
            if (filteredLogs.length === 0) {
                console.innerHTML = `
                    <div style="color: #888; text-align: center; margin-top: 200px;">
                        <span style="font-size: 16px;">🔍</span><br>
                        ${allLogs.length === 0 ?
                            'Ожидание логов... Откройте приложение с реферальной ссылкой' :
                            'Логи отфильтрованы - снимите фильтры для просмотра'}
                    </div>
                `;
            } else {
                console.innerHTML = filteredLogs.map(log => {
                    const time = new Date(log.timestamp).toLocaleTimeString('ru-RU', { hour12: false });
                    const color = getLogColor(log.level, log.type);
                    const icon = getLogIcon(log.level, log.type);
                    const page = log.page ? `[${log.page}]` : '';

                    return `
                        <div style="margin: 2px 0; padding: 4px 0; border-left: 3px solid ${color}; padding-left: 10px;">
                            <span style="color: #888; font-size: 11px;">${time} ${page}</span>
                            <span style="color: ${color}; margin: 0 8px;">${icon}</span>
                            <span style="color: #e0e0e0;">${escapeHtml(log.message)}</span>
                        </div>
                    `;
                }).join('');
            }

            // Прокручиваем к концу
            console.scrollTop = console.scrollHeight;

            // Обновляем статистику
            updateLogsStats();
        }

        // Получение цвета для типа лога
        function getLogColor(level, type) {
            if (type === 'auth') return '#FFD700';
            if (type === 'referral') return '#4CAF50';
            if (type === 'error' || level === 'error') return '#FF5722';
            if (level === 'warn') return '#FF9800';
            return '#2196F3';
        }

        // Получение иконки для типа лога
        function getLogIcon(level, type) {
            if (type === 'auth') return 'AUTH';
            if (type === 'referral') return 'REF';
            if (type === 'error' || level === 'error') return 'ERR';
            if (level === 'warn') return 'WARN';
            return 'INFO';
        }

        // Экранирование HTML
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Обновление статистики
        function updateLogsStats() {
            const stats = allLogs.reduce((acc, log) => {
                acc[log.type] = (acc[log.type] || 0) + 1;
                acc.total++;
                return acc;
            }, { auth: 0, referral: 0, error: 0, general: 0, total: 0 });

            document.getElementById('authLogsCount').textContent = stats.auth;
            document.getElementById('referralLogsCount').textContent = stats.referral;
            document.getElementById('errorLogsCount').textContent = stats.error;
            document.getElementById('totalLogsCount').textContent = stats.total;
        }

        // Очистка логов
        function clearLogs() {
            allLogs = [];
            try {
                localStorage.removeItem('ar_arena_logs');
                console.log('🔍 [LOGS] Логи очищены из localStorage');
            } catch (error) {
                console.error('Ошибка очистки логов:', error);
            }
            updateLogsDisplay();
        }

        // Экспорт логов
        function exportLogs() {
            const content = allLogs.map(log =>
                `${log.timestamp.toISOString()} [${log.level.toUpperCase()}] [${log.type.toUpperCase()}] ${log.message}`
            ).join('\n');

            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ar-arena-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
            a.click();
            URL.revokeObjectURL(url);

            console.log('🔍 [LOGS] Логи экспортированы');
        }

        // Переключение авто-обновления
        function toggleAutoRefresh() {
            autoRefresh = !autoRefresh;
            const btn = document.getElementById('autoRefreshBtn');

            if (autoRefresh) {
                btn.innerHTML = 'Авто-обновление: ВКЛ';
                btn.style.background = 'linear-gradient(135deg, #FF6B35, #F7931E)';
                startAutoRefresh();
            } else {
                btn.innerHTML = 'Авто-обновление: ВЫКЛ';
                btn.style.background = 'linear-gradient(135deg, #11998E, #38EF7D)';
                stopAutoRefresh();
            }

            console.log(`🔍 [LOGS] Авто-обновление ${autoRefresh ? 'включено' : 'выключено'}`);
        }

        // Запуск авто-обновления
        let autoRefreshInterval;
        function startAutoRefresh() {
            autoRefreshInterval = setInterval(() => {
                if (document.getElementById('logs').classList.contains('active')) {
                    updateLogsDisplay();
                }
            }, 2000);
        }

        // Остановка авто-обновления
        function stopAutoRefresh() {
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
            }
        }

        // Запуск системы при загрузке страницы
        setTimeout(() => {
            initLogsSystem();
            // Загружаем логи из localStorage при старте
            loadLogsFromStorage();
            updateLogsDisplay();
        }, 1000);

        // Очистка таймеров при закрытии страницы (предотвращение утечек памяти)
        window.addEventListener('beforeunload', () => {
            stopAutoRefresh();
        });

        // Запуск
        init();
