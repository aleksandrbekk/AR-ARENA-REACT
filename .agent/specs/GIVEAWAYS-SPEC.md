# 🎁 GIVEAWAYS SPECIFICATION

**Версия:** 1.0
**Дата:** 12.12.2025
**Статус:** Утверждено

---

## 📖 КОНЦЕПЦИЯ

**Giveaways (Розыгрыши)** — еженедельная механика с покупкой билетов за премиум валюту **AR**.

### Основные принципы:
1. **Билеты** — покупаются за AR, каждый билет = уникальный номер
2. **Джекпот** — растёт от продаж билетов
3. **Результаты** — случайный выбор победителей
4. **Auto-Clone** — автоматическое создание нового розыгрыша после завершения
5. **Прозрачность** — все результаты видны в LiveArena

---

## 🎫 МЕХАНИКА БИЛЕТОВ

### Покупка билета
1. Пользователь выбирает количество билетов (1, 5, 10, 50, ...)
2. Проверяется баланс AR
3. Генерируются уникальные номера билетов
4. AR списывается с баланса
5. Часть AR идёт в джекпот

### Уникальность номеров
- Номера билетов уникальны **в рамках одного розыгрыша**
- Формат: `1, 2, 3, ..., N`
- Генерация: последовательно, начиная с `MAX(ticket_number) + 1`

### Ограничения
- Минимум 1 билет за раз
- Максимум 100 билетов за раз (защита от спама)
- Нельзя купить билет после `end_date` розыгрыша

---

## 💰 МЕХАНИКА ДЖЕКПОТА

### Формула джекпота
```
jackpot += ticket_price_ar × count × (jackpot_percentage / 100)
```

**Пример:**
- Цена билета: 10 AR
- Куплено: 5 билетов
- `jackpot_percentage`: 80%
- Джекпот увеличится на: `10 × 5 × 0.8 = 40 AR`

### Остаток AR
```
platform_fee = ticket_price_ar × count × (1 - jackpot_percentage / 100)
```

**Пример:**
- Цена билета: 10 AR
- Куплено: 5 билетов
- `jackpot_percentage`: 80%
- Комиссия платформы: `10 × 5 × 0.2 = 10 AR`

### Распределение джекпота
Джекпот распределяется между победителями по местам:
- **1 место:** 50% джекпота
- **2 место:** 30% джекпота
- **3 место:** 20% джекпота

**Пример:**
- Джекпот: 1000 AR
- 1 место: 500 AR
- 2 место: 300 AR
- 3 место: 200 AR

---

## 🎲 ГЕНЕРАЦИЯ РЕЗУЛЬТАТОВ

### Алгоритм
1. Получить все билеты розыгрыша
2. Случайно выбрать 3 уникальных номера билетов
3. Определить владельцев билетов
4. Начислить призы по формуле распределения джекпота
5. Сохранить результаты в таблицу `giveaway_results`
6. Обновить баланс победителей

### Псевдокод
```sql
SELECT ticket_number, user_id
FROM giveaway_tickets
WHERE giveaway_id = p_giveaway_id
ORDER BY RANDOM()
LIMIT 3;

-- 1 место: user_1 → jackpot * 0.5
-- 2 место: user_2 → jackpot * 0.3
-- 3 место: user_3 → jackpot * 0.2
```

### Обработка дублей (один пользователь купил несколько билетов)
- Если один пользователь выиграл несколько мест — всё равно получает приз за каждое место
- Пример: user_1 выиграл 1 и 3 места → получит 70% джекпота

---

## 🔄 AUTO-CLONE МЕХАНИКА

### Концепция
Розыгрыш с флагом `is_recurring = true` автоматически клонируется после завершения.

### Алгоритм
1. Проверка: `end_date` прошла?
2. Проверка: `is_recurring = true`?
3. Создание копии розыгрыша:
   - Новые `start_date`, `end_date` (смещение на `duration_days`)
   - Джекпот обнуляется или наследуется (настраивается)
   - Название, описание, цена билета — копируются

### RPC функция: `clone_giveaway()`
```sql
CREATE OR REPLACE FUNCTION clone_giveaway(p_old_giveaway_id INT)
RETURNS INT AS $$
DECLARE
  v_new_id INT;
  v_duration_days INT;
BEGIN
  -- Получить duration_days старого розыгрыша
  SELECT duration_days INTO v_duration_days
  FROM giveaways
  WHERE id = p_old_giveaway_id;

  -- Создать копию
  INSERT INTO giveaways (
    name, prize_description, ticket_price_ar, jackpot_percentage,
    is_recurring, duration_days, start_date, end_date, jackpot
  )
  SELECT
    name,
    prize_description,
    ticket_price_ar,
    jackpot_percentage,
    is_recurring,
    duration_days,
    NOW(), -- новый start_date
    NOW() + INTERVAL '1 day' * v_duration_days, -- новый end_date
    0 -- джекпот обнуляется
  FROM giveaways
  WHERE id = p_old_giveaway_id
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;
```

### Триггер автозапуска (pg_cron)
```sql
-- Каждые 10 минут проверять завершённые recurring розыгрыши
SELECT cron.schedule(
  'auto-clone-giveaways',
  '*/10 * * * *',
  $$
  SELECT clone_giveaway(id)
  FROM giveaways
  WHERE end_date < NOW()
    AND is_recurring = true
    AND NOT EXISTS (
      SELECT 1 FROM giveaways g2
      WHERE g2.start_date > giveaways.end_date
        AND g2.name = giveaways.name
    );
  $$
);
```

---

## 📊 RPC ФУНКЦИИ

### 1. `buy_giveaway_ticket_v2()`
**Назначение:** Покупка билетов на розыгрыш

**Параметры:**
- `p_telegram_id` (BIGINT) — ID пользователя в Telegram
- `p_giveaway_id` (INT) — ID розыгрыша
- `p_count` (INT) — количество билетов

**Возвращает:** JSON
```json
{
  "success": true,
  "tickets": [1234, 1235, 1236],
  "new_balance": 450,
  "jackpot": 1200
}
```

**Логика:**
1. Проверить, что розыгрыш существует и `end_date` не прошла
2. Получить `user_id` по `telegram_id`
3. Проверить баланс AR: `balance_ar >= ticket_price_ar * p_count`
4. Получить `MAX(ticket_number)` для данного розыгрыша
5. Сгенерировать номера: `max + 1, max + 2, ..., max + p_count`
6. Списать AR: `balance_ar -= ticket_price_ar * p_count`
7. Увеличить джекпот: `jackpot += ticket_price_ar * p_count * (jackpot_percentage / 100)`
8. Вставить записи в `giveaway_tickets`
9. Вернуть JSON с результатом

**SQL (примерный):**
```sql
CREATE OR REPLACE FUNCTION buy_giveaway_ticket_v2(
  p_telegram_id BIGINT,
  p_giveaway_id INT,
  p_count INT
)
RETURNS JSON AS $$
DECLARE
  v_user_id INT;
  v_balance_ar DECIMAL;
  v_ticket_price DECIMAL;
  v_jackpot_pct DECIMAL;
  v_max_ticket INT;
  v_new_tickets INT[];
  v_i INT;
  v_total_cost DECIMAL;
  v_jackpot_increase DECIMAL;
BEGIN
  -- Получить user_id
  SELECT id, balance_ar INTO v_user_id, v_balance_ar
  FROM users
  WHERE telegram_id = p_telegram_id;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Получить параметры розыгрыша
  SELECT ticket_price_ar, jackpot_percentage INTO v_ticket_price, v_jackpot_pct
  FROM giveaways
  WHERE id = p_giveaway_id AND end_date > NOW();

  IF v_ticket_price IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Giveaway not found or ended');
  END IF;

  -- Проверить баланс
  v_total_cost := v_ticket_price * p_count;
  IF v_balance_ar < v_total_cost THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient AR balance');
  END IF;

  -- Получить max ticket_number
  SELECT COALESCE(MAX(ticket_number), 0) INTO v_max_ticket
  FROM giveaway_tickets
  WHERE giveaway_id = p_giveaway_id;

  -- Генерировать номера билетов
  v_new_tickets := ARRAY[]::INT[];
  FOR v_i IN 1..p_count LOOP
    v_new_tickets := array_append(v_new_tickets, v_max_ticket + v_i);
    INSERT INTO giveaway_tickets (giveaway_id, user_id, ticket_number)
    VALUES (p_giveaway_id, v_user_id, v_max_ticket + v_i);
  END LOOP;

  -- Списать AR и увеличить джекпот
  v_jackpot_increase := v_total_cost * (v_jackpot_pct / 100);
  UPDATE users SET balance_ar = balance_ar - v_total_cost WHERE id = v_user_id;
  UPDATE giveaways SET jackpot = jackpot + v_jackpot_increase WHERE id = p_giveaway_id;

  -- Получить новый баланс и джекпот
  SELECT balance_ar INTO v_balance_ar FROM users WHERE id = v_user_id;
  SELECT jackpot INTO v_jackpot_increase FROM giveaways WHERE id = p_giveaway_id;

  RETURN json_build_object(
    'success', true,
    'tickets', v_new_tickets,
    'new_balance', v_balance_ar,
    'jackpot', v_jackpot_increase
  );
END;
$$ LANGUAGE plpgsql;
```

---

### 2. `generate_giveaway_result()`
**Назначение:** Генерация результатов розыгрыша

**Параметры:**
- `p_giveaway_id` (INT) — ID розыгрыша

**Возвращает:** JSON
```json
{
  "success": true,
  "winners": [
    { "place": 1, "telegram_id": 123456, "ticket_number": 42, "prize_ar": 500 },
    { "place": 2, "telegram_id": 789012, "ticket_number": 17, "prize_ar": 300 },
    { "place": 3, "telegram_id": 345678, "ticket_number": 99, "prize_ar": 200 }
  ]
}
```

**Логика:**
1. Проверить, что розыгрыш существует и `end_date` прошла
2. Проверить, что результаты ещё не сгенерированы
3. Получить все билеты розыгрыша
4. Случайно выбрать 3 уникальных билета
5. Рассчитать призы (50%, 30%, 20% от джекпота)
6. Начислить AR победителям
7. Сохранить результаты в `giveaway_results`
8. Вернуть JSON с победителями

**SQL (примерный):**
```sql
CREATE OR REPLACE FUNCTION generate_giveaway_result(p_giveaway_id INT)
RETURNS JSON AS $$
DECLARE
  v_jackpot DECIMAL;
  v_winners JSON;
  v_ticket RECORD;
  v_place INT := 1;
  v_prize DECIMAL;
  v_prizes DECIMAL[] := ARRAY[0.5, 0.3, 0.2]; -- 50%, 30%, 20%
BEGIN
  -- Получить джекпот
  SELECT jackpot INTO v_jackpot
  FROM giveaways
  WHERE id = p_giveaway_id AND end_date < NOW();

  IF v_jackpot IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Giveaway not found or not ended');
  END IF;

  -- Проверить, что результаты ещё не сгенерированы
  IF EXISTS (SELECT 1 FROM giveaway_results WHERE giveaway_id = p_giveaway_id) THEN
    RETURN json_build_object('success', false, 'error', 'Results already generated');
  END IF;

  -- Выбрать 3 случайных билета
  FOR v_ticket IN
    SELECT user_id, ticket_number
    FROM giveaway_tickets
    WHERE giveaway_id = p_giveaway_id
    ORDER BY RANDOM()
    LIMIT 3
  LOOP
    v_prize := v_jackpot * v_prizes[v_place];

    -- Начислить приз
    UPDATE users SET balance_ar = balance_ar + v_prize WHERE id = v_ticket.user_id;

    -- Сохранить результат
    INSERT INTO giveaway_results (giveaway_id, user_id, place, prize_ar, ticket_number)
    VALUES (p_giveaway_id, v_ticket.user_id, v_place, v_prize, v_ticket.ticket_number);

    v_place := v_place + 1;
  END LOOP;

  -- Получить результаты для возврата
  SELECT json_agg(
    json_build_object(
      'place', place,
      'telegram_id', u.telegram_id,
      'ticket_number', ticket_number,
      'prize_ar', prize_ar
    )
  ) INTO v_winners
  FROM giveaway_results gr
  JOIN users u ON gr.user_id = u.id
  WHERE giveaway_id = p_giveaway_id;

  RETURN json_build_object('success', true, 'winners', v_winners);
END;
$$ LANGUAGE plpgsql;
```

---

### 3. `clone_giveaway()`
См. раздел "AUTO-CLONE МЕХАНИКА" выше.

---

## 🗄️ СТРУКТУРА ТАБЛИЦ

### `giveaways`
```sql
CREATE TABLE giveaways (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  prize_description TEXT,
  ticket_price_ar DECIMAL(10, 2) NOT NULL,
  jackpot DECIMAL(10, 2) DEFAULT 0,
  jackpot_percentage DECIMAL(5, 2) DEFAULT 80, -- например, 80%
  is_recurring BOOLEAN DEFAULT false,
  duration_days INT DEFAULT 7,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `giveaway_tickets`
```sql
CREATE TABLE giveaway_tickets (
  id SERIAL PRIMARY KEY,
  giveaway_id INT NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_number INT NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (giveaway_id, ticket_number) -- уникальность номера в рамках розыгрыша
);

CREATE INDEX idx_tickets_giveaway ON giveaway_tickets(giveaway_id);
CREATE INDEX idx_tickets_user ON giveaway_tickets(user_id);
```

### `giveaway_results`
```sql
CREATE TABLE giveaway_results (
  id SERIAL PRIMARY KEY,
  giveaway_id INT NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place INT NOT NULL CHECK (place BETWEEN 1 AND 3),
  prize_ar DECIMAL(10, 2) NOT NULL,
  ticket_number INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (giveaway_id, place) -- одно место = один победитель
);

CREATE INDEX idx_results_giveaway ON giveaway_results(giveaway_id);
CREATE INDEX idx_results_user ON giveaway_results(user_id);
```

---

## 🎨 UI/UX

### GiveawaysPage (список)
- Карточки розыгрышей
- Фильтр: Активные / Завершённые
- Для каждой карточки:
  - Название
  - Джекпот (текущий)
  - Цена билета
  - Дата окончания (таймер)
  - Кнопка "Участвовать"

### GiveawayPage (детальная)
- Информация о призах
- Текущий джекпот (большими цифрами, золото)
- Цена билета
- Таймер до окончания
- Кнопка "Купить билеты" (CTA, золотой градиент)
- Модалка выбора количества билетов (1, 5, 10, 50, 100)
- Список купленных билетов пользователя

### LiveArena (результаты)
- Анимированная сетка всех билетов
- Выделение выигрышных номеров (золотом)
- Список победителей:
  - Место (1, 2, 3)
  - Username
  - Номер билета
  - Приз (AR)

---

## 📚 LEGACY REFERENCE

Старая версия (vanilla JS):
```
~/Desktop/AR ARENA VANILA ВЕРСИЯ/
├── giveaway.html     ← Детальная страница
├── livearena.html    ← Визуализация результатов
└── giveaways.html    ← Список розыгрышей
```

---

## 🎯 ИТОГО

1. **Покупка билетов:** `buy_giveaway_ticket_v2(telegram_id, giveaway_id, count)`
2. **Генерация результатов:** `generate_giveaway_result(giveaway_id)` (вызывается вручную или по таймеру)
3. **Auto-Clone:** `clone_giveaway(old_id)` (вызывается автоматически pg_cron)
4. **Джекпот:** Растёт от продаж, распределяется 50/30/20%
5. **Прозрачность:** Все результаты видны в LiveArena

---

**Версия документа:** 1.0
**Утверждено:** Александр
**Дата:** 12.12.2025
