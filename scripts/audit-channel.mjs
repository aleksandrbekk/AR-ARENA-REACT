import { createClient } from '@supabase/supabase-js';

const KIKER_TOKEN = '8413063885:AAEa90SRTRBTJSl48JuivTEIPtPt69aMJ3k';
const CHANNEL_ID = '-1001634734020';
const SUPABASE_URL = 'https://syxjkircmiwpnpagznay.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getChatMemberCount() {
  const res = await fetch(`https://api.telegram.org/bot${KIKER_TOKEN}/getChatMemberCount?chat_id=${CHANNEL_ID}`);
  return await res.json();
}

async function getAdmins() {
  const res = await fetch(`https://api.telegram.org/bot${KIKER_TOKEN}/getChatAdministrators?chat_id=${CHANNEL_ID}`);
  return await res.json();
}

async function checkMember(userId) {
  const res = await fetch(`https://api.telegram.org/bot${KIKER_TOKEN}/getChatMember?chat_id=${CHANNEL_ID}&user_id=${userId}`);
  const data = await res.json();
  return data.ok ? data.result.status : 'not_found';
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const countRes = await getChatMemberCount();
  console.log('Channel members:', countRes.result);

  const adminsRes = await getAdmins();
  const admins = adminsRes.result || [];
  console.log('Admins/bots:', admins.length);
  admins.forEach(a => {
    console.log('  ' + a.user.first_name + ' (@' + (a.user.username || 'N/A') + ') ' + a.status + (a.user.is_bot ? ' [BOT]' : ''));
  });
  const botsCount = admins.filter(a => a.user.is_bot).length;
  const adminsCount = admins.filter(a => !a.user.is_bot).length;

  const { data: activeClients } = await supabase
    .from('premium_clients')
    .select('telegram_id, username, plan, expires_at, in_channel, payments_count')
    .gte('expires_at', new Date().toISOString());

  console.log('\nActive subscriptions in DB:', activeClients.length);

  let inChannelReal = 0;
  let notInChannel = 0;
  const notInChannelList = [];

  for (const client of activeClients) {
    if (!client.telegram_id) continue;
    const status = await checkMember(client.telegram_id);
    const isIn = ['member', 'creator', 'administrator', 'restricted'].includes(status);
    if (isIn) {
      inChannelReal++;
    } else {
      notInChannel++;
      notInChannelList.push({ tid: client.telegram_id, uname: client.username, plan: client.plan, status });
    }
    await sleep(50);
  }

  console.log('\nActive clients IN channel: ' + inChannelReal);
  console.log('Active clients NOT in channel: ' + notInChannel);

  if (notInChannelList.length > 0) {
    console.log('\nNot in channel:');
    notInChannelList.forEach(c => {
      console.log('  ' + c.tid + ' (@' + (c.uname || 'N/A') + ') plan=' + c.plan + ' status=' + c.status);
    });
  }

  const channelTotal = countRes.result;
  const ghosts = channelTotal - inChannelReal - botsCount;
  console.log('\n==== AUDIT SUMMARY ====');
  console.log('Channel total: ' + channelTotal);
  console.log('Bots: ' + botsCount + ', Admins: ' + adminsCount);
  console.log('Paid active (in channel): ' + inChannelReal);
  console.log('Ghosts (no active sub): ~' + ghosts);
  console.log('Paid active (NOT in channel): ' + notInChannel);
}

main().catch(e => console.error(e));
