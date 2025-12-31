import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const now = new Date().toISOString();

// Все истёкшие
const { data: allExpired } = await supabase
  .from("premium_clients")
  .select("telegram_id, username, expires_at, in_channel, in_chat, tags")
  .lt("expires_at", now);

console.log("=== ВСЕ ИСТЁКШИЕ (" + allExpired.length + ") ===\n");

allExpired.forEach(u => {
  const tags = u.tags || [];
  const kicked = tags.includes("kicked") ? "🔴 KICKED" : "";
  const inCh = u.in_channel ? "📺" : "";
  const inChat = u.in_chat ? "💬" : "";
  const days = Math.floor((Date.now() - new Date(u.expires_at)) / (1000*60*60*24));
  console.log("@" + (u.username || "no_user").padEnd(20), "|", inCh, inChat, "|", kicked, "| истёк", days, "дн.");
});

// Будут кикнуты
const toKick = allExpired.filter(u => {
  const tags = u.tags || [];
  return tags.includes("kicked") === false && (u.in_channel || u.in_chat);
});

console.log("\n=== БУДУТ КИКНУТЫ (" + toKick.length + ") ===");
toKick.forEach(u => {
  console.log("  @" + (u.username || "no_user"), "| ID:", u.telegram_id);
});
