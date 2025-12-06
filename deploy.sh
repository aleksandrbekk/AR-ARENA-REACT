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

# Деплой
echo "🚀 Deploying to server..."
sshpass -p 'T9WLiUYq0Uv0Yn2W' scp -r dist/* root@91.229.11.228:/www/ararena.pro/

if [ $? -ne 0 ]; then
    echo "❌ Deploy failed!"
    exit 1
fi

echo "✅ Deploy successful!"
echo ""
echo "🎉 Done! Check https://ararena.pro"
echo "   Telegram: @ARARENA_BOT"
