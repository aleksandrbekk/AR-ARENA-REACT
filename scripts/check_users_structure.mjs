import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Получаем одну запись из users чтобы увидеть структуру
const { data: user } = await supabase
  .from("users")
  .select("*")
  .limit(1)
  .single();

console.log("=== СТРУКТУРА USERS ===");
console.log(JSON.stringify(user, null, 2));

// Также проверим bull_users
const { data: bullUser } = await supabase
  .from("bull_users")
  .select("*")
  .limit(1)
  .single();

console.log("\n=== СТРУКТУРА BULL_USERS ===");
console.log(JSON.stringify(bullUser, null, 2));
