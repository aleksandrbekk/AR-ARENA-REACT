#!/usr/bin/env python3
import asyncio
import sys
from telethon import TelegramClient
from telethon.tl.functions.messages import ExportChatInviteRequest

API_ID = 35438443
API_HASH = '1c34e9c209e438e5ad09e207a5248164'
CHANNEL_ID = -1001634734020
CHAT_ID = -1001828659569

async def create_and_send_links(user_id):
    client = TelegramClient('ar_arena_session', API_ID, API_HASH)
    await client.connect()

    if not await client.is_user_authorized():
        print("NOT_AUTHORIZED")
        return

    # Создаём ссылки
    channel = await client.get_entity(CHANNEL_ID)
    chat = await client.get_entity(CHAT_ID)

    channel_invite = await client(ExportChatInviteRequest(
        peer=channel,
        usage_limit=1,
        expire_date=None
    ))

    chat_invite = await client(ExportChatInviteRequest(
        peer=chat,
        usage_limit=1,
        expire_date=None
    ))

    print(f"Канал: {channel_invite.link}")
    print(f"Чат: {chat_invite.link}")

    # Отправляем пользователю
    message = f"""🎉 Ваши ссылки для доступа к AR Club:

📺 Канал: {channel_invite.link}
💬 Чат: {chat_invite.link}

Ссылки одноразовые, используйте их сейчас!"""

    try:
        user = await client.get_entity(int(user_id))
        await client.send_message(user, message)
        print(f"\n✅ Отправлено пользователю {user_id}")
    except Exception as e:
        print(f"\n❌ Ошибка отправки: {e}")
        print(f"\nСсылки (отправь вручную):")
        print(message)

    await client.disconnect()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python send_invite.py USER_ID")
    else:
        asyncio.run(create_and_send_links(sys.argv[1]))
