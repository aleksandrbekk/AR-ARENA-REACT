// AR ARENA - Подключение к Supabase
const SUPABASE_URL = 'https://syxjkircmiwpnpagznay.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g';

// Ждём загрузки библиотеки Supabase
(function initSupabase() {
    // Проверяем доступность библиотеки
    if (typeof window.supabase === 'undefined') {
        console.warn('⏳ Ожидание загрузки Supabase библиотеки...');
        setTimeout(initSupabase, 100);
        return;
    }

    // Сохраняем ссылку на библиотеку
    const supabaseLib = window.supabase;

    // Инициализация клиента
    const client = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase клиент инициализирован');

    // Экспорт клиента (НЕ переопределяем window.supabase!)
    window.supabaseClient = client;

    // Для совместимости со старым кодом
    if (!window.db) {
        window.db = client;
    }
})();
