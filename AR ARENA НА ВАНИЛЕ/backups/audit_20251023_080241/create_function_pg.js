// Создание SQL функции через прямое подключение PostgreSQL
const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
    host: 'db.syxjkircmiwpnpagznay.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'jobjin-1wirto-pujQaw',
    ssl: {
        rejectUnauthorized: false
    }
});

async function createFunction() {
    try {
        console.log('🔌 Подключение к базе данных...');
        await client.connect();
        console.log('✅ Подключено!');

        // Читаем SQL из файла
        const sql = fs.readFileSync('/Users/aleksandrbekk/Desktop/AR ARENA/buy_tickets_function.sql', 'utf8');

        console.log('📝 Выполнение SQL...');
        const result = await client.query(sql);

        console.log('✅ Функция buy_lottery_tickets создана успешно!');
        console.log('Результат:', result);

    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        console.error('Детали:', error);
    } finally {
        await client.end();
        console.log('🔌 Соединение закрыто');
    }
}

createFunction();
