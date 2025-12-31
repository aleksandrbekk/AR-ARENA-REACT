import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function compare() {
  // Читаем список из канала
  const channelMembers = JSON.parse(fs.readFileSync('scripts/channel_members.json', 'utf-8'));
  const channelIds = channelMembers.filter(m => m.is_bot === false).map(m => m.id);

  console.log('В канале (без ботов):', channelIds.length);

  // Получаем всех из базы
  const { data: dbUsers, error } = await supabase
    .from('premium_clients')
    .select('telegram_id, username, plan, expires_at, in_channel');

  if (error) {
    console.error('DB Error:', error);
    return;
  }

  const dbIds = dbUsers.map(u => u.telegram_id);
  console.log('В базе:', dbUsers.length);

  // В канале, но НЕ в базе
  const inChannelNotInDb = channelIds.filter(id => !dbIds.includes(id));
  console.log('\n=== В КАНАЛЕ, но НЕТ в базе (' + inChannelNotInDb.length + ') ===');
  inChannelNotInDb.forEach(id => {
    const member = channelMembers.find(m => m.id === id);
    console.log('  ID:', id, '| @' + (member.username || 'no_username') + ' |', member.first_name || '');
  });

  // В базе с in_channel=true, но НЕТ в канале
  const dbInChannel = dbUsers.filter(u => u.in_channel === true);
  const inDbNotInChannel = dbInChannel.filter(u => !channelIds.includes(u.telegram_id));
  console.log('\n=== В базе in_channel=true, но НЕТ в канале (' + inDbNotInChannel.length + ') ===');
  inDbNotInChannel.slice(0, 30).forEach(u => {
    console.log('  ID:', u.telegram_id, '| @' + (u.username || 'no_username') + ' | expires:', u.expires_at);
  });
  if (inDbNotInChannel.length > 30) console.log('  ... и ещё', inDbNotInChannel.length - 30);

  // Истёкшие, которые ещё в канале
  const now = new Date().toISOString();
  const expiredInChannel = dbUsers.filter(u =>
    channelIds.includes(u.telegram_id) &&
    u.expires_at < now
  );
  console.log('\n=== ИСТЕКЛИ, но ещё В КАНАЛЕ (' + expiredInChannel.length + ') ===');
  expiredInChannel.forEach(u => {
    console.log('  ID:', u.telegram_id, '| @' + (u.username || 'no_username') + ' | expired:', u.expires_at);
  });
}

compare();
