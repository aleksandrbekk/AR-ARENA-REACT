import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Проверяем все таблицы
const { data: botUsers, count: botCount } = await supabase
  .from("bot_users")
  .select("*", { count: "exact" });

const { data: users, count: usersCount } = await supabase
  .from("users")
  .select("*", { count: "exact" });

const { data: premiumClients, count: premiumCount } = await supabase
  .from("premium_clients")
  .select("telegram_id", { count: "exact" });

console.log("=== СТАТИСТИКА ТАБЛИЦ ===");
console.log("bot_users:", botCount);
console.log("users:", usersCount);
console.log("premium_clients:", premiumCount);

// Пересечения
const botIds = new Set(botUsers.map(u => u.telegram_id));
const userIds = new Set(users.map(u => u.telegram_id));
const premiumIds = new Set(premiumClients.map(u => u.telegram_id));

// Premium кто НЕ в users
const premiumNotInUsers = [...premiumIds].filter(id => !userIds.has(id));
console.log("\n=== АНОМАЛИИ ===");
console.log("Premium клиентов НЕ в таблице users:", premiumNotInUsers.length);

// Premium кто НЕ в bot_users
const premiumNotInBot = [...premiumIds].filter(id => !botIds.has(id));
console.log("Premium клиентов НЕ в таблице bot_users:", premiumNotInBot.length);

// Users кто НЕ в bot_users
const usersNotInBot = [...userIds].filter(id => !botIds.has(id));
console.log("Users НЕ в таблице bot_users:", usersNotInBot.length);

// Примеры из users
console.log("\n=== ПРИМЕРЫ ИЗ USERS (первые 5) ===");
users.slice(0, 5).forEach(u => {
  console.log("ID:", u.telegram_id, "| @" + (u.username || "no_user"), "| created:", u.created_at?.slice(0, 10));
});

// Когда записывается в users?
console.log("\n=== ДАТЫ ЗАПИСЕЙ В USERS ===");
const dates = users.map(u => u.created_at?.slice(0, 10)).filter(Boolean);
const uniqueDates = [...new Set(dates)].sort();
console.log("Уникальные даты:", uniqueDates);
