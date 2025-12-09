# 🔥 LAVA.TOP ИНТЕГРАЦИЯ - ГОТОВА

## ✅ ЧТО СДЕЛАНО

### 1. API Endpoints (задеплоены на сервер)

#### `/api/lava-webhook` - Webhook для приёма платежей
- **URL:** `https://ararena.pro/api/lava-webhook`
- **Метод:** POST
- **Авторизация:** Header `x-api-key: ararena-webhook-secret-2024`
- **Функционал:**
  - Принимает событие `payment.success` от Lava.top
  - Ищет пользователя по `telegram_id` (из clientUTM) или `email`
  - Зачисляет AR (1 RUB = 1 AR)
  - Записывает транзакцию с `lava_contract_id`

#### `/api/lava-create-invoice` - Создание счёта на оплату
- **URL:** `https://ararena.pro/api/lava-create-invoice`
- **Метод:** POST
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "telegramId": "123456789",
    "amount": 100,
    "currency": "RUB"
  }
  ```
- **Ответ:**
  ```json
  {
    "ok": true,
    "paymentUrl": "https://gate.lava.top/...",
    "contractId": "...",
    "amount": 100,
    "currency": "RUB"
  }
  ```

### 2. База данных (Supabase)

Таблица `transactions` обновлена:
- ✅ Добавлено поле `lava_contract_id` (TEXT)
- ✅ Создан индекс для быстрого поиска
- ✅ SQL выполнен в Supabase

---

## 🚀 КАК ИСПОЛЬЗОВАТЬ

### Шаг 1: Создание счёта (из Telegram Mini App)

```javascript
const response = await fetch('https://ararena.pro/api/lava-create-invoice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    telegramId: tg.initDataUnsafe.user.id,
    amount: 100, // RUB
    currency: 'RUB'
  })
});

const { paymentUrl } = await response.json();

// Открыть URL оплаты
window.open(paymentUrl, '_blank');
```

### Шаг 2: Webhook обработка (автоматически)

После оплаты Lava.top отправит webhook на:
```
POST https://ararena.pro/api/lava-webhook
Header: x-api-key: ararena-webhook-secret-2024
```

Webhook автоматически:
1. Найдёт пользователя
2. Зачислит AR
3. Создаст транзакцию

---

## ⚙️ НАСТРОЙКИ В LAVA.TOP

### Webhook URL
```
https://ararena.pro/api/lava-webhook
```

### Headers
```
x-api-key: ararena-webhook-secret-2024
```

### События
- ✅ `payment.success`

---

## 🔑 КЛЮЧИ И ДАННЫЕ

| Параметр | Значение |
|----------|----------|
| API Key | `OZiQUDFJAz5eunrbUrUjA2ToAYjCgXWqaxzK7ibQA23uk3VoR6ijcGEO9Y9lfPjM` |
| Offer ID | `836adba6-5365-40f6-a646-aef9621f3af4` |
| Webhook Secret | `ararena-webhook-secret-2024` |
| Supabase URL | `https://syxjkircmiwpnpagznay.supabase.co` |

---

## 📁 ФАЙЛЫ

```
/www/ararena.pro/api/
├── lava-webhook.js          ✅ Задеплоен
└── lava-create-invoice.js   ✅ Задеплоен

Supabase:
└── transactions (lava_contract_id)  ✅ Обновлена
```

---

## 🧪 ТЕСТИРОВАНИЕ

1. Создать тестовый счёт через `/api/lava-create-invoice`
2. Оплатить (или симулировать webhook от Lava.top)
3. Проверить зачисление AR в Supabase

---

## 📝 TODO (для фронтенда)

- [ ] Кнопка "Купить AR" в Telegram Mini App
- [ ] Форма выбора суммы (100, 500, 1000 RUB)
- [ ] Вызов `/api/lava-create-invoice`
- [ ] Открытие `paymentUrl` в новом окне
- [ ] Уведомление после зачисления AR

---

**Статус:** 🟢 ГОТОВО К ИСПОЛЬЗОВАНИЮ
