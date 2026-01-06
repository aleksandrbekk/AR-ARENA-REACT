#!/bin/bash

# 🚀 Скрипт быстрого деплоя AR ARENA React

echo "╔══════════════════════════════════════╗"
echo "║   🚀 AR ARENA React Deployment      ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Сборка
echo "📦 Building..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Проверка переменной окружения для пароля
if [ -z "$SSH_PASS" ]; then
    echo "⚠️  SSH_PASS environment variable is not set."
    echo "   Please run with: SSH_PASS='your_password' ./deploy.sh"
    exit 1
fi

# Деплой
echo "🚀 Deploying to server..."
sshpass -p "$SSH_PASS" scp -r dist/* root@91.229.11.228:/www/ararena.pro/

if [ $? -ne 0 ]; then
    echo "❌ Deploy failed!"
    exit 1
fi

echo "✅ Deploy successful!"
echo ""
echo "🎉 Done! Check https://ararena.pro"
echo "   Telegram: @ARARENA_BOT"
