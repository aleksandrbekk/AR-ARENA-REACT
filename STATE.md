# Current State

## ✅ Исправление UTM трекинга и гонок кликов — ВЫПОЛНЕНО (20.02.2026)

### Что сделано:
- Добавлены RPC функции в Supabase (`increment_utm_link_clicks`, `increment_utm_link_conversions`) для атомарного обновления.
- Обновлены `VideoSalesPage.tsx`, `VideoSalesPageTg.tsx` и `StreamPage.tsx` для использования RPC функций.
- Добавлена защита от дублирования `view_start` и `code_correct` сессий через `sessionStorage`.
- Внедрен fall-back на чтение UTM меток из `localStorage` при потере `utm_source` из URL при навигации.
- Переименована метка в админ-панели на "усп. кодов".
- Изменения покрыты сборкой и отправлены в продакшен.

---

## ✅ ProfilePage — Полная переделка — ВЫПОЛНЕНО (11.02.2026)

### Что сделано:
- Полный редизайн ProfilePage в Premium Glass стиле
- Секции: Аватар+имя (Crown badge для Premium), Баланс AR (золотое свечение), Premium подписка (purple glow / CTA), Партнёры (L1/L2 pills, заработано AR, навигация), Розыгрыши (последние 3), Дата регистрации
- Убрано: активный персонаж, тап/реген бонусы, куплено скинов, всего тапов
- Параллельная загрузка данных (Promise.all)
- Framer Motion анимации
- Логотип на главной: fix blend mode (mix-blend-lighten)
- Скины: убран price_bul из типа Skin, оставлен только price_ar
- SkinsPage: убрана проверка INSUFFICIENT_BUL
- Build OK

### ⏳ Ожидает:
- Тестирование в Telegram
- Коммит и деплой

---

## ✅ Удалена ферма и валюта BUL — ВЫПОЛНЕНО (11.02.2026)

### Что сделано:
- Удалены FarmPage.tsx и FarmPageGemini.tsx, роуты /farm и /farm-alt
- Убран balance_bul из GameState, TapResult, AuthProvider
- Убран farm_bonus из Skin, StatusBar, SkinBonuses, ProfilePage
- Все цены/балансы переведены на AR: SkinsPage, GiveawayCard, BuyTicketModal, GiveawayResultsPage
- Почищена админка: убрана колонка BUL, кнопка ± BUL, секция Ферма
- CurrencyIcon и BalanceDisplay упрощены до AR
- PartnersPage: убрана карточка "Заработано BUL"
- GiveawayManager: убран переключатель валюты AR/BUL
- **22 файла изменено, -1076 строк удалено**
- Build OK, коммит cfcbe30 запушен

### Единственная валюта: **AR COIN**

---

## 🎨 GiveawayPageNew Premium Design - РЕАЛИЗОВАНО (07.01.2026)

### ✅ Что сделано:
- UI исправления: убрана красная кнопка, header pt-[70px]
- Data fetching из Supabase (giveaway, stats, myTickets)
- BuyTicketModal интеграция
- Loading/NotFound states

### ⏳ Ожидает:
- Тестирование в Telegram
- 3D иконки (трофей + билет)

---

## 🔗 Инвайт-ссылки Premium - ИСПРАВЛЕНО (06.01.2026)
- Ссылки теперь бессрочные + одноразовые
- Требуется деплой Edge Function

---

## 🚀 Партнёрская программа - ГОТОВО (06.01.2026)
- Frontend: /partners с полным UI
- RPC: generate_referral_code, apply_referral_code, process_referral_bonus, get_partner_stats
- Параметры: L1=10%, L2=5%

---

## 📌 Previous: Live Arena - ВЫПОЛНЕНО (05.01.2025)
- Tour1 Drum, Tour2 Ликвидация, Semifinal, Final Battle, ResultsScreen
