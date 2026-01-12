#!/bin/bash

echo "============================================"
echo "ТЕСТИРОВАНИЕ WEBHOOK'ОВ AR ARENA"
echo "============================================"
echo ""

# Базовый URL
BASE_URL="https://ararena.pro/api"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Проверка доступности webhook'ов
echo "📡 Проверка доступности endpoint'ов:"
echo "----------------------------------------"

endpoints=(
    "lava-premium-webhook"
    "0xprocessing-webhook"
    "upsert-user"
)

for endpoint in "${endpoints[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/$endpoint")
    if [ "$response" = "200" ] || [ "$response" = "405" ] || [ "$response" = "400" ]; then
        echo -e "${GREEN}✓${NC} $endpoint: $response (OK)"
    else
        echo -e "${RED}✗${NC} $endpoint: $response (ERROR)"
    fi
done

echo ""
echo "📋 Проверка последних вызовов (через Vercel CLI):"
echo "----------------------------------------"
echo "Для просмотра логов выполните:"
echo ""
echo -e "${YELLOW}1. Установите Vercel CLI:${NC}"
echo "   npm i -g vercel"
echo ""
echo -e "${YELLOW}2. Войдите в аккаунт:${NC}"
echo "   vercel login"
echo ""
echo -e "${YELLOW}3. Просмотрите логи функций:${NC}"
echo "   vercel logs --follow"
echo ""
echo -e "${YELLOW}4. Или конкретного webhook'а:${NC}"
echo "   vercel logs api/lava-premium-webhook.js"
echo "   vercel logs api/0xprocessing-webhook.js"
echo ""
echo "============================================"
echo ""
echo "🔍 Альтернативный способ через браузер:"
echo "----------------------------------------"
echo "1. Откройте: https://vercel.com/aleksandrbekk/ar-arena-react"
echo "2. Перейдите в Functions"
echo "3. Выберите нужную функцию"
echo "4. Смотрите Logs в реальном времени"
echo ""
echo "============================================"
echo ""
echo "🧪 Тестовый запрос к Lava webhook:"
echo "----------------------------------------"

# Тестовый POST запрос к Lava webhook
echo "Отправляем тестовый запрос..."
test_response=$(curl -X POST "$BASE_URL/lava-premium-webhook" \
    -H "Content-Type: application/json" \
    -d '{"test": true}' \
    -s -w "\nHTTP Code: %{http_code}\n")

echo "$test_response"
echo ""

echo "============================================"
echo "📊 Рекомендации:"
echo "----------------------------------------"
echo "1. Если webhook'и возвращают 200/405 - они работают"
echo "2. Код 405 означает что метод не разрешён (нормально для GET)"
echo "3. Проверьте реальные логи через Vercel Dashboard"
echo "4. Ищите ошибки с текстом '❌' или 'Error'"
echo "============================================"