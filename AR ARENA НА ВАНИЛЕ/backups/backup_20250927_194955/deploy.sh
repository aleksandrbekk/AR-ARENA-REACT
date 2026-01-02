#!/bin/bash

# Deploy AR ARENA files to server

echo "🚀 Загрузка файлов AR ARENA на сервер..."

# Сервер и путь
SERVER="aruser@83.166.246.186"
REMOTE_PATH="/var/www/neurocamp/arena/"

# Файлы для загрузки
FILES=(
    "auth.js"
    "index.html"
    "bot.py"
    "bot.js"
    "package.json"
    "bot-instructions.md"
)

echo "📦 Файлы для загрузки:"
for file in "${FILES[@]}"; do
    echo "  - $file"
done

echo ""
echo "🔑 Введите пароль для сервера при запросе"
echo ""

# Загружаем файлы
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "📤 Загружаю $file..."
        scp -o ConnectTimeout=10 "$file" "$SERVER:$REMOTE_PATH"
        if [ $? -eq 0 ]; then
            echo "✅ $file загружен успешно"
        else
            echo "❌ Ошибка загрузки $file"
        fi
    else
        echo "⚠️  Файл $file не найден"
    fi
done

echo ""
echo "✨ Деплой завершен!"
echo "🔗 Проверьте приложение в Telegram Mini App"