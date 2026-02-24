// Список админских Telegram ID
export const ADMIN_IDS = [190202791, 144828618, 288542643, 288475216]

export function isAdmin(telegramId: number | undefined): boolean {
    return telegramId ? ADMIN_IDS.includes(telegramId) : false
}
