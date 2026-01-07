# AR ARENA — Деплой

## Автоматический деплой (Vercel)

```bash
git add .
git commit -m "feat/fix: описание"
git push
```

Vercel автоматически подхватывает → https://ararena.pro

## Локальная разработка

```bash
npm run dev
```

Откроется http://localhost:5173 с mock user (ID: 190202791)

## Проверка

**ВАЖНО:** Тестировать ТОЛЬКО в Telegram (@ARARENA_BOT), не в браузере!

## Edge Functions (Supabase)

Если нужно задеплоить Edge Function:

```bash
supabase login
supabase functions deploy <function-name> --project-ref syxjkircmiwpnpagznay
```

## Устранение проблем

### Ошибки сборки
```bash
rm -rf dist node_modules
npm install
npm run build
```

### Telegram WebApp не инициализируется
- Проверить что приложение открыто из Telegram
- В dev режиме используется mock user
