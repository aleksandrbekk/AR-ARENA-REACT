import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function compare() {
  // Читаем список из чата
  const chatMembers = JSON.parse(fs.readFileSync('scripts/chat_members.json', 'utf-8'));
  const chatIds = chatMembers.filter(m => m.is_bot === false).map(m => m.id);

  console.log('В чате (без ботов):', chatIds.length);

  // Получаем всех из базы
  const { data: dbUsers, error } = await supabase
    .from('premium_clients')
    .select('telegram_id, username, plan, expires_at, in_chat');

  if (error) {
    console.error('DB Error:', error);
    return;
  }

  const dbIds = dbUsers.map(u => u.telegram_id);
  console.log('В базе:', dbUsers.length);

  // В чате, но НЕ в базе
  const inChatNotInDb = chatIds.filter(id => !dbIds.includes(id));
  console.log('\n=== В ЧАТЕ, но НЕТ в базе (' + inChatNotInDb.length + ') ===');
  inChatNotInDb.forEach(id => {
    const member = chatMembers.find(m => m.id === id);
    console.log('  ID:', id, '| @' + (member.username || 'no_username') + ' |', member.first_name || '');
  });

  // В базе с in_chat=true, но НЕТ в чате
  const dbInChat = dbUsers.filter(u => u.in_chat === true);
  const inDbNotInChat = dbInChat.filter(u => !chatIds.includes(u.telegram_id));
  console.log('\n=== В базе in_chat=true, но НЕТ в чате (' + inDbNotInChat.length + ') ===');
  inDbNotInChat.slice(0, 30).forEach(u => {
    console.log('  ID:', u.telegram_id, '| @' + (u.username || 'no_username') + ' | expires:', u.expires_at);
  });
  if (inDbNotInChat.length > 30) console.log('  ... и ещё', inDbNotInChat.length - 30);

  // Истёкшие, которые ещё в чате
  const now = new Date().toISOString();
  const expiredInChat = dbUsers.filter(u =>
    chatIds.includes(u.telegram_id) &&
    u.expires_at < now
  );
  console.log('\n=== ИСТЕКЛИ, но ещё В ЧАТЕ (' + expiredInChat.length + ') ===');
  expiredInChat.forEach(u => {
    console.log('  ID:', u.telegram_id, '| @' + (u.username || 'no_username') + ' | expired:', u.expires_at);
  });
}

compare();
