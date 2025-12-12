---
trigger: always_on
---

# AR ARENA Tech Stack

## Технологии
- Framework: React 18 + TypeScript
- Стили: Tailwind CSS
- Backend: Supabase (PostgreSQL + Auth + Realtime)
- Платформа: Telegram Mini Apps
- Хостинг: Vercel (автодеплой при git push)

## Telegram Mini Apps
- SDK: @twa-dev/sdk
- Всегда вызывать: WebApp.ready() и WebApp.expand()
- Haptic feedback на кнопках: WebApp.HapticFeedback.impactOccurred('medium')

## Supabase
- RLS политики ОБЯЗАТЕЛЬНЫ для всех таблиц
- Без RLS данные недоступны клиенту

## Деплой
npm run build && git add . && git commit -m "описание" && git push
Vercel подхватывает автоматически → https://ararena.pro

## Структура проекта
src/pages/ — страницы
src/components/ — компоненты
src/hooks/ — React хуки
src/lib/ — утилиты, supabase client
src/config/ — конфигурация
public/icons/ — все иконки

