# ДОРОЖНАЯ КАРТА: Перенос системы розыгрышей

## Цель
Перенести полную механику розыгрышей из старой версии (vanilla) на новый стек (React + Supabase Edge Functions).

---

## ТЕКУЩЕЕ СОСТОЯНИЕ

### Что уже есть:
- [x] Таблица `giveaways` в Supabase
- [x] Таблица `giveaway_tickets`
- [x] Страница списка розыгрышей (`GiveawaysPage.tsx`)
- [x] Страница деталей розыгрыша (`GiveawayDetailsPage.tsx`)
- [x] Страница результатов (`GiveawayResultsPage.tsx`)
- [x] Edge Function генерации (`generate-giveaway-result/index.ts`)
- [x] Полная 4-этапная механика (Tour 1 → Tour 2 → Semifinal → Final)
- [x] LIVE страница (`LiveArenaPage.tsx`)
- [x] Tour 1 Drum (барабан выбора 20 участников)
- [x] Tour 2 Cards (карточки ликвидации)
- [x] Semifinal Traffic Light
- [x] Final Battle (Быки и Медведи)
- [x] Results Screen с подиумом

### Чего не хватает:
- [ ] Автоматический запуск по cron (сейчас вручную)

---

## МЕХАНИКА РОЗЫГРЫША (из старой версии)

### Этап 1: Квалификация (Tour 1)
- Из ВСЕХ билетов случайно выбираются **20 участников**
- Каждый билет = 1 шанс попасть
- Используется криптографически безопасный RNG

### Этап 2: Отбор финалистов (Tour 2)
- Из 20 участников выбираются **5 финалистов**
- Визуализация: выбор карт (flip cards)

### Этап 3: Полуфинал — Traffic Light
- 5 участников, нужно набрать 3 "попадания"
- Кто первым набирает 3 — **выбывает** (место 5, затем 4)
- Остаются **3 финалиста**

### Этап 4: Финал — Battle of Traders
- 3 финалиста по очереди крутят рулетку (bull/bear)
- Кто первым набирает **3 быка** — **выигрывает** (места 1, 2, 3)

---

## ЭТАПЫ РАЗРАБОТКИ

### Фаза 1: Backend (Edge Functions)
**Срок: ~1 день**

- [ ] **1.1** Обновить `generate-giveaway-result/index.ts`
  - Добавить 4-этапную логику
  - Tour 1: выбор 20 из всех
  - Tour 2: выбор 5 из 20
  - Semifinal: Traffic Light (выбивание 2)
  - Final: Battle of Traders (места 1-2-3)
  - Сохранение полных результатов в `draw_results`

- [ ] **1.2** Обновить `run-expired-giveaways/index.ts`
  - Автоматический запуск по истечении `end_date`
  - Вызов функции генерации

- [ ] **1.3** Тестирование Edge Function
  - Создать тестовый розыгрыш
  - Проверить генерацию результатов
  - Валидация структуры `draw_results`

### Фаза 2: LIVE страница
**Срок: ~2 дня**

- [ ] **2.1** Создать `LiveArenaPage.tsx`
  - Загрузка данных розыгрыша
  - Отображение текущего этапа
  - Прогресс-бар

- [ ] **2.2** Компонент Tour 1 — Drum/Барабан
  - Анимация вращения барабана
  - Выбор 20 участников
  - Отображение выбранных билетов

- [ ] **2.3** Компонент Tour 2 — Card Selection
  - 20 карт (рубашкой вверх)
  - Переворот 5 карт
  - Анимация выбора финалистов

- [ ] **2.4** Компонент Semifinal — Traffic Light
  - 5 участников с индикаторами (0/3)
  - Анимация спинов
  - Выбивание при 3 попаданиях
  - Визуализация мест 4-5

- [ ] **2.5** Компонент Final — Battle of Traders
  - 3 финалиста
  - Рулетка bull/bear
  - Счётчик быков
  - Определение мест 1-2-3

- [ ] **2.6** Компонент Victory
  - Конфетти
  - Пьедестал победителей
  - Призовой фонд

### Фаза 3: Интеграция
**Срок: ~0.5 дня**

- [ ] **3.1** Обновить `GiveawayResultsPage.tsx`
  - Показывать полные этапы из `draw_results`
  - Кнопка "Посмотреть анимацию"

- [ ] **3.2** Обновить `GiveawayDetailsPage.tsx`
  - Показывать кнопку LIVE когда таймер истёк
  - Редирект на LiveArenaPage

- [ ] **3.3** Роутинг
  - `/live/:id` — LIVE страница
  - `/giveaway/:id/results` — результаты

### Фаза 4: Тестирование
**Срок: ~0.5 дня**

- [ ] **4.1** E2E тест полного цикла
  - Создание розыгрыша
  - Покупка билетов
  - Истечение таймера
  - Просмотр LIVE
  - Проверка результатов

- [ ] **4.2** Тест в Telegram Mini App
  - Проверка на реальном устройстве

---

## КРИТЕРИИ УСПЕХА

### Функциональные:
1. ✅ Розыгрыш автоматически запускается по `end_date`
2. ✅ Генерируются результаты всех 4 этапов
3. ✅ LIVE страница показывает анимацию всех этапов
4. ✅ Победители определяются честно (crypto RNG)
5. ✅ Результаты сохраняются и доступны для просмотра

### Визуальные:
1. ✅ Анимации плавные (60 fps)
2. ✅ Стиль соответствует дизайн-системе (золото + чёрный)
3. ✅ Работает в Telegram Mini App fullscreen
4. ✅ Адаптивность под разные экраны

### Технические:
1. ✅ `npm run build` без ошибок
2. ✅ Edge Functions деплоятся без ошибок
3. ✅ Нет утечек памяти в анимациях
4. ✅ Время загрузки LIVE страницы < 2 сек

---

## СТРУКТУРА draw_results (целевая)

```json
{
  "generated_at": "2025-01-02T12:00:00Z",
  "seed": "abc123...",
  "total_participants": 150,
  "total_tickets": 500,

  "tour1": {
    "winners": [1, 45, 78, ...],  // 20 номеров билетов
    "participants": ["user1", "user2", ...]  // 20 telegram_id
  },

  "tour2": {
    "selected_indices": [3, 7, 12, 15, 19],
    "finalists": [
      { "ticket_number": 78, "user_id": "123", "username": "Alex" },
      ...
    ]
  },

  "semifinal": {
    "spins": [
      { "spin": 1, "ticket": 78, "hits": 1 },
      { "spin": 2, "ticket": 45, "hits": 1 },
      ...
    ],
    "eliminated": [
      { "ticket_number": 78, "user_id": "123", "place": 5, "hits": 3 },
      { "ticket_number": 45, "user_id": "456", "place": 4, "hits": 3 }
    ],
    "finalists3": [...]
  },

  "final": {
    "turn_order": [0, 2, 1],
    "turns": [
      { "turn": 1, "player": 0, "result": "bull", "bulls": 1, "bears": 0 },
      ...
    ],
    "player_scores": [
      { "bulls": 3, "bears": 1, "place": 1 },
      { "bulls": 2, "bears": 2, "place": 3 },
      { "bulls": 3, "bears": 0, "place": 2 }
    ]
  },

  "winners": [
    { "place": 1, "ticket_number": 12, "user_id": "789", "username": "Winner1" },
    { "place": 2, "ticket_number": 34, "user_id": "012", "username": "Winner2" },
    ...
  ]
}
```

---

## ПОРЯДОК ВЫПОЛНЕНИЯ

1. **Сейчас:** Обновляю Edge Function
2. **Затем:** Создаю LIVE страницу поэтапно
3. **Потом:** Интегрирую с существующими страницами
4. **Финал:** Тестирую полный цикл

---

## ФАЙЛЫ ДЛЯ ИЗМЕНЕНИЯ

| Файл | Действие |
|------|----------|
| `supabase/functions/generate-giveaway-result/index.ts` | Переписать |
| `supabase/functions/run-expired-giveaways/index.ts` | Обновить |
| `src/pages/LiveArenaPage.tsx` | Создать |
| `src/components/live/Tour1Drum.tsx` | Создать |
| `src/components/live/Tour2Cards.tsx` | Создать |
| `src/components/live/SemifinalTrafficLight.tsx` | Создать |
| `src/components/live/FinalBattle.tsx` | Создать |
| `src/components/live/VictoryScreen.tsx` | Создать |
| `src/pages/GiveawayResultsPage.tsx` | Обновить |
| `src/pages/GiveawayDetailsPage.tsx` | Обновить |
| `src/App.tsx` | Добавить роут |

---

*Последнее обновление: 2025-01-02*
