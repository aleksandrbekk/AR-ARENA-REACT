#!/usr/bin/env node
// Скрипт для отправки приветственного сообщения клиенту
// Запуск: node scripts/send-welcome-message.mjs <telegram_id> <tariff>

import 'dotenv/config';

const TELEGRAM_ID = process.argv[2] || '2129858110';
const TARIFF = process.argv[3] || 'classic';

// Используем KIKER_BOT_TOKEN для всего (он работает)
const BOT_TOKEN = process.env.KIKER_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

const CHANNEL_ID = '-1001634734020';
const CHAT_ID = '-1001828659569';

const TARIFF_INFO = {
  classic: { name: 'CLASSIC', days: 30, image: 'https://ararena.pro/cards/classic.png' },
  gold: { name: 'GOLD', days: 90, image: 'https://ararena.pro/cards/gold.png' },
  platinum: { name: 'PLATINUM', days: 180, image: 'https://ararena.pro/cards/platinum.png' },
  private: { name: 'PRIVATE', days: 365, image: 'https://ararena.pro/cards/PRIVATE.png' }
};

async function createInviteLink(chatId) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/createChatInviteLink?chat_id=${chatId}&member_limit=1`
    );
    const result = await response.json();
    if (result.ok) {
      console.log(`✅ Invite link created for ${chatId}`);
      return result.result.invite_link;
    }
    console.log(`❌ Failed to create invite link:`, result);
    return null;
  } catch (error) {
    console.log(`❌ Error creating invite link:`, error.message);
    return null;
  }
}

async function sendPhoto(telegramId, photoUrl, caption, replyMarkup) {
  const body = {
    chat_id: telegramId,
    photo: photoUrl,
    caption,
    parse_mode: 'HTML',
    reply_markup: replyMarkup
  };

  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  return response.json();
}

async function main() {
  console.log(`\n🚀 Отправка приветственного сообщения`);
  console.log(`👤 Telegram ID: ${TELEGRAM_ID}`);
  console.log(`📋 Тариф: ${TARIFF}\n`);

  if (!BOT_TOKEN) {
    console.error('❌ Не найден KIKER_BOT_TOKEN или TELEGRAM_BOT_TOKEN в .env');
    process.exit(1);
  }

  const tariffInfo = TARIFF_INFO[TARIFF] || TARIFF_INFO.classic;

  // Создаём invite ссылки
  console.log('📨 Создание invite ссылок...');
  const channelLink = await createInviteLink(CHANNEL_ID);
  const chatLink = await createInviteLink(CHAT_ID);

  // Формируем сообщение
  const welcomeText = `🎉 <b>Добро пожаловать в Premium AR Club!</b>\n\n` +
    `Ваша подписка <b>${tariffInfo.name}</b> активирована на ${tariffInfo.days} дней.\n\n` +
    `👇 Нажмите кнопки ниже для доступа:\n\n` +
    `📞 Служба заботы: @Andrey_cryptoinvestor`;

  // Формируем кнопки
  const buttons = [];
  if (channelLink) buttons.push([{ text: '📢 Канал Premium', url: channelLink }]);
  if (chatLink) buttons.push([{ text: '💬 Чат Premium', url: chatLink }]);
  const replyMarkup = { inline_keyboard: buttons };

  // Отправляем
  console.log('📤 Отправка сообщения...');
  const result = await sendPhoto(TELEGRAM_ID, tariffInfo.image, welcomeText, replyMarkup);

  if (result.ok) {
    console.log(`\n✅ Сообщение успешно отправлено!`);
    console.log(`📢 Канал: ${channelLink || 'N/A'}`);
    console.log(`💬 Чат: ${chatLink || 'N/A'}`);
  } else {
    console.log(`\n❌ Ошибка отправки:`, result);
  }
}

main().catch(console.error);
