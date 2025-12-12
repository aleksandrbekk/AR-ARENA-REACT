# 🌾 FARM SPECIFICATION

## Версия: 1.0
## Дата: 12.12.2025

---

## 📋 ОБЗОР

**Ферма** — система пассивного дохода в валюте BUL с недельным лидербордом.

### Ключевые механики:
1. **Пассивный доход** — оборудование генерит BUL/час
2. **Локации** — разблокируются за BUL, дают слоты для оборудования
3. **Оборудование** — покупается и апгрейдится за BUL
4. **Лидерборд** — топ-100 недели получают AR + отмычки
5. **Буст скинов** — AR-скины дают множитель к доходу

---

## 🏗️ ЛОКАЦИИ

### Таблица: `locations`

| Поле | Тип | Описание |
|------|-----|----------|
| `slug` | text PK | Уникальный идентификатор |
| `name` | text | Название на русском |
| `image` | text | Путь к иконке |
| `price` | numeric | Цена в BUL (0 = бесплатно) |
| `required_level` | integer | Минимальный уровень игрока |
| `slots` | integer | Количество слотов для оборудования |
| `sort_order` | integer | Порядок отображения |

### Данные:

```sql
INSERT INTO locations (slug, name, image, price, required_level, slots, sort_order) VALUES
('dorm', 'Общага', '/icons/locations/dorm.png', 0, 1, 3, 1),
('apartment', 'Съёмная квартира', '/icons/locations/apartment.png', 50000, 5, 5, 2),
('office', 'Офис', '/icons/locations/office.png', 200000, 10, 8, 3),
('farm', 'Крипто-ферма', '/icons/locations/farm.png', 1000000, 20, 12, 4);
```

### Таблица: `user_locations`

| Поле | Тип | Описание |
|------|-----|----------|
| `user_id` | bigint FK | ID пользователя |
| `location_slug` | text FK | Slug локации |
| `purchased` | boolean | Куплено ли |
| `purchased_at` | timestamptz | Дата покупки |

---

## ⚙️ ОБОРУДОВАНИЕ

### Таблица: `equipment`

| Поле | Тип | Описание |
|------|-----|----------|
| `slug` | text PK | Уникальный идентификатор |
| `name` | text | Название |
| `icon` | text | Путь к иконке |
| `base_price` | numeric | Базовая цена покупки |
| `base_income` | numeric | Базовый доход BUL/час |
| `price_multiplier` | numeric | Множитель цены за уровень |
| `income_multiplier` | numeric | Множитель дохода за уровень |
| `max_level` | integer | Максимальный уровень |
| `location_slug` | text | Минимальная локация |
| `sort_order` | integer | Порядок отображения |

### Данные:

```sql
INSERT INTO equipment (slug, name, icon, base_price, base_income, price_multiplier, income_multiplier, max_level, location_slug, sort_order) VALUES
('usb_miner', 'USB Miner', '/icons/equipment/usb_miner.png', 1000, 10, 1.5, 1.2, 10, 'dorm', 1),
('gpu_rig', 'GPU Rig', '/icons/equipment/gpu_rig.png', 10000, 50, 1.5, 1.2, 10, 'dorm', 2),
('asic', 'ASIC', '/icons/equipment/asic.png', 50000, 200, 1.5, 1.2, 10, 'apartment', 3),
('server_rack', 'Server Rack', '/icons/equipment/server_rack.png', 150000, 500, 1.5, 1.2, 10, 'office', 4),
('mining_container', 'Mining Container', '/icons/equipment/mining_container.png', 500000, 1500, 1.5, 1.2, 10, 'farm', 5);
```

### Таблица: `user_equipment`

| Поле | Тип | Описание |
|------|-----|----------|
| `user_id` | bigint FK | ID пользователя |
| `equipment_slug` | text FK | Slug оборудования |
| `level` | integer | Текущий уровень (1-10) |
| `purchased_at` | timestamptz | Дата покупки |

---

## 📊 ФОРМУЛЫ

### Доход от оборудования:
```
income = base_income × income_multiplier^(level - 1)
```

**Пример USB Miner:**
- Level 1: 10 × 1.2^0 = 10 BUL/час
- Level 5: 10 × 1.2^4 = 20.7 BUL/час
- Level 10: 10 × 1.2^9 = 51.6 BUL/час

### Цена апгрейда:
```
upgrade_price = base_price × price_multiplier^(current_level)
```

**Пример USB Miner:**
- Level 1→2: 1000 × 1.5^1 = 1,500 BUL
- Level 5→6: 1000 × 1.5^5 = 7,594 BUL
- Level 9→10: 1000 × 1.5^9 = 38,443 BUL

### Общий доход:
```
total_income = SUM(equipment_income) × skin_bonus
```

### Накопленный доход:
```
accumulated = (total_income / 3600) × elapsed_seconds
max_accumulated = total_income × 4  // 4 часа лимит
```

---

## 👔 БУСТ ОТ СКИНОВ

### Таблица скинов (колонка `farm_bonus`):

| Скин | Rarity | Цена AR | farm_bonus |
|------|--------|---------|------------|
| Bull (базовый) | Common | 0 | 1.00 |
| Lawyer | Rare | 100 | 1.05 |
| Banker | Epic | 500 | 1.15 |
| Politician | Legendary | 2,000 | 1.35 |
| Crypto Bro | Legendary | 5,000 | 1.60 |
| LOKI | Mythic | 15,000 | 2.00 |

### Применение:
```sql
final_income = base_income × skin.farm_bonus
```

---

## 🏆 ЛИДЕРБОРД

### Механика:
1. При сборе дохода → BUL добавляется в `users.farm_collected_weekly`
2. Топ-100 по этому полю = лидерборд
3. Каждое воскресенье 00:00 UTC:
   - Раздача призов топ-100
   - Сброс `farm_collected_weekly` на 0

### Таблица: `users` (дополнительные поля)

| Поле | Тип | Описание |
|------|-----|----------|
| `farm_collected_weekly` | numeric | Собрано за текущую неделю |
| `last_passive_claim` | timestamptz | Последний сбор |
| `current_farm_location` | text | Текущая локация |

### Призы:

| Место | AR | Отмычки | Особое |
|-------|-----|---------|--------|
| 1 | 500 | 10 | Exclusive Skin |
| 2 | 300 | 5 | — |
| 3 | 200 | 3 | — |
| 4-10 | 100 | 2 | — |
| 11-50 | 50 | 1 | — |
| 51-100 | 20 | 0 | — |

---

## 🔄 RPC ФУНКЦИИ

### 1. get_farm_state(p_telegram_id text)

**Возвращает:**
```json
{
  "user_level": 5,
  "balance_bul": 15000,
  "last_passive_claim": "2025-12-12T10:00:00Z",
  "current_location": {
    "slug": "dorm",
    "name": "Общага",
    "image": "/icons/locations/dorm.png"
  },
  "equipment": [
    {
      "slug": "usb_miner",
      "name": "USB Miner",
      "owned": true,
      "current_level": 3,
      "max_level": 10,
      "current_income": 14.4,
      "upgrade_price": 3375
    }
  ],
  "locations": [
    {
      "slug": "dorm",
      "name": "Общага",
      "purchased": true,
      "can_purchase": false
    }
  ]
}
```

### 2. claim_farm_income(p_telegram_id text)

**Логика:**
1. Рассчитать income_per_hour из оборудования
2. elapsed_seconds = now() - last_passive_claim
3. capped_seconds = MIN(elapsed_seconds, 4 * 3600)
4. claimed = FLOOR((income_per_hour / 3600) × capped_seconds)
5. Добавить к balance_bul
6. Добавить к farm_collected_weekly (для лидерборда)
7. Обновить last_passive_claim

**Возвращает:**
```json
{
  "success": true,
  "claimed_amount": 1250,
  "new_balance": 16250
}
```

### 3. purchase_equipment(p_telegram_id, p_equipment_slug)

**Проверки:**
- Пользователь существует
- Оборудование существует
- Локация куплена
- Ещё не куплено
- Достаточно BUL

**Возвращает:**
```json
{
  "success": true,
  "new_balance": 14000
}
```

### 4. upgrade_equipment(p_telegram_id, p_equipment_slug)

**Проверки:**
- Пользователь существует
- Оборудование куплено
- Не достигнут max_level
- Достаточно BUL

**Возвращает:**
```json
{
  "success": true,
  "new_level": 4,
  "new_income": 17.28,
  "new_balance": 11625
}
```

### 5. purchase_location(p_telegram_id, p_location_slug)

**Проверки:**
- Пользователь существует
- Локация существует
- Достигнут required_level
- Ещё не куплена
- Достаточно BUL

**Возвращает:**
```json
{
  "success": true,
  "new_balance": 150000
}
```

### 6. get_farm_leaderboard(p_limit integer DEFAULT 100)

**Возвращает:**
```json
[
  {
    "rank": 1,
    "telegram_id": "123456",
    "username": "CryptoBro",
    "avatar": "/avatars/...",
    "farm_collected_weekly": 985000,
    "skin_name": "LOKI"
  }
]
```

---

## ⏰ CRON JOBS

### Недельный сброс (pg_cron):

```sql
-- Каждое воскресенье 00:00 UTC
SELECT cron.schedule(
  'farm_weekly_reset',
  '0 0 * * 0',
  $$
    -- 1. Раздать призы топ-100
    -- 2. Сбросить farm_collected_weekly
    UPDATE users SET farm_collected_weekly = 0;
  $$
);
```

---

## 🎨 UI КОМПОНЕНТЫ

### FarmPage.tsx
- Header с балансом BUL
- LocationCard (текущая локация + кнопка "Сменить")
- StatsPanel (доход/час, накоплено, прогресс-бар 0-4ч)
- ClaimButton (золотой градиент)
- EquipmentList (карточки с Buy/Upgrade)
- LeaderboardSection (топ-100 + твоя позиция)

### LocationModal
- Список всех локаций
- Статус: куплено / можно купить / заблокировано
- Кнопка покупки

### EquipmentCard
- Иконка, название, уровень
- Текущий доход
- Кнопка: Buy (если нет) / Upgrade (если есть) / MAX (если max_level)
- Цена действия

---

## 📱 SAFE-AREA

```tsx
<div className="pt-[env(safe-area-inset-top,60px)] pb-[env(safe-area-inset-bottom,20px)]">
```

---

## 🔗 СВЯЗАННЫЕ МОДУЛИ

- **Скины** → `farm_bonus` множитель
- **Рефералы** → 10% L1, 5% L2 от сбора
- **Лотерея** → синхрон недельного цикла
- **Транзакции** → логирование всех операций

---

## 📚 РЕФЕРЕНСЫ

- Legacy: `~/Desktop/AR ARENA VANILA ВЕРСИЯ/farm.html`
- Notion: [СТАНЦИЯ 7: ФЕРМА](https://www.notion.so/2c333667161d819fbcebcec2f8362e48)
