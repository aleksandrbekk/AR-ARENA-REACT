// tasks.js

// === Настройки ===
const WORKER_URL = "https://shy-fire-8e70.levbekk.workers.dev";
const CHANNELS = [
  { username: "@AlexRich2018", title: "Подпишись на AlexRich2018", reward: 100 },
  { username: "@premium_news", title: "Подпишись на Premium News", reward: 150 }
];

// Проверка подписки через Cloudflare Worker
async function checkSubscription(userId) {
  try {
    const response = await fetch("https://shy-fire-8e70.levbekk.workers.dev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId })
    });

    const data = await response.json();
    return data.subscribed === true;
  } catch (error) {
    console.error("Ошибка при проверке подписки:", error);
    return false;
  }
}

// === Получаем реальный user_id из Telegram Mini App ===
let userId = null;
let currentUser = null;

if (window.Telegram && window.Telegram.WebApp) {
  const tg = window.Telegram.WebApp;
  userId = tg.initDataUnsafe?.user?.id || null;
  currentUser = { telegram_id: userId };
} else {
  // для теста в браузере без Telegram
  userId = "test_user_123";
  currentUser = { telegram_id: userId };
}

// === Проверка подписки через Cloudflare Worker ===
async function checkSubscription(channel) {
  try {
    console.log("Проверка подписки:", { userId, channel });

    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        user_id: userId, 
        channel: channel.replace("@", "") 
      })
    });

    const data = await response.json();
    console.log("Ответ воркера:", data);

    return data.subscribed === true;
  } catch (err) {
    console.error("Ошибка проверки подписки:", err);
    return false;
  }
}

// === Отрисовка заданий ===
function renderTasks() {
  const list = document.getElementById("tasksList");
  if (!list) {
    console.error("❌ Контейнер #tasksList не найден в tasks.html");
    return;
  }

  list.innerHTML = "";

  CHANNELS.forEach((task) => {
    const card = document.createElement("div");
    card.className = "task-card";

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;

    const reward = document.createElement("div");
    reward.className = "task-reward";
    reward.textContent = `+${task.reward} монет`;

    const btn = document.createElement("button");
    btn.className = "task-button";
    btn.textContent = "🔗 Подписаться";

    // Шаг 1: переход на канал
    btn.onclick = () => {
      window.open(`https://t.me/${task.username.replace("@", "")}`, "_blank");
      btn.textContent = "🔍 Проверить подписку";

      // Шаг 2: проверка подписки
      btn.onclick = async () => {
        btn.disabled = true;
        btn.textContent = "⏳ Проверка...";

        const subscribed = await checkSubscription(task.username);
        if (subscribed) {
          btn.textContent = "✅ Подписка подтверждена!";
          btn.classList.add("completed");
          updateProgress(task.reward);
        } else {
          btn.textContent = "❌ Нет подписки";
          btn.disabled = false;
        }
      };
    };

    card.appendChild(title);
    card.appendChild(reward);
    card.appendChild(btn);
    list.appendChild(card);
  });
}

// === Обработка заданий ===
async function handleTask(task) {
  if (task.type === "subscription") {
    const userId = currentUser?.telegram_id;
    if (!userId) {
      alert("Ошибка: не удалось получить ваш Telegram ID");
      return;
    }

    const subscribed = await checkSubscription(userId);

    if (subscribed) {
      completeTask(task);
    } else {
      alert("❌ Вы не подписаны на все каналы!");
    }
  } else {
    // оставляем старую обработку для других типов заданий
    completeTask(task);
  }
}

// === Завершение задания ===
function completeTask(task) {
  updateProgress(task.reward);
  console.log(`Задание "${task.title}" выполнено! Получено ${task.reward} монет.`);
}

// === Прогресс и награды ===
let totalCoins = parseInt(localStorage.getItem("coins") || "0", 10);

function updateProgress(reward) {
  totalCoins += reward;
  localStorage.setItem("coins", totalCoins);

  const coinsEl = document.getElementById("coins");
  if (coinsEl) coinsEl.textContent = totalCoins;

  const completedCount = document.getElementById("completedCount");
  if (completedCount) {
    let completed = parseInt(completedCount.textContent || "0", 10) + 1;
    completedCount.textContent = completed;
  }
}

// === Сброс прогресса ===
function resetProgress() {
  localStorage.clear();
  totalCoins = 0;
  document.getElementById("coins").textContent = totalCoins;
  const completedCount = document.getElementById("completedCount");
  if (completedCount) completedCount.textContent = "0";
  renderTasks();
}

// === Запуск ===
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("coins").textContent = totalCoins;
  renderTasks();
});