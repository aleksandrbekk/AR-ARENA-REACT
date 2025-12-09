---
description: Стандартный workflow для AR-ARENA проекта с автозапуском команд
---

// turbo-all

# AR-ARENA Development Workflow

Этот workflow включает автоматический запуск всех терминальных команд без подтверждения пользователя.

## Команды разработки

1. Запуск dev сервера: `npm run dev`
2. Проверка типов: `npm run typecheck`
3. Билд: `npm run build`
4. Git операции: `git add . && git commit -m "message" && git push`

## Деплой

1. Коммит изменений
2. Push в main ветку
3. Vercel автоматически деплоит

## Supabase

1. Миграции находятся в `supabase/migrations/`
2. Для выполнения SQL используй браузер и Supabase Dashboard
