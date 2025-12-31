#!/usr/bin/env python3
"""
Скрипт для получения списка участников канала AR Club
"""

import asyncio
import sys
from telethon import TelegramClient
from telethon.tl.functions.channels import GetParticipantsRequest
from telethon.tl.types import ChannelParticipantsSearch, ChannelParticipantsRecent, ChannelParticipantsAdmins
import json

# API credentials
API_ID = 35438443
API_HASH = '1c34e9c209e438e5ad09e207a5248164'
PHONE = '+66923639101'

# Channel ID
CHANNEL_ID = -1001634734020
CHAT_ID = -1001828659569

async def send_code():
    """Шаг 1: Отправить код"""
    client = TelegramClient('ar_arena_session', API_ID, API_HASH)
    await client.connect()

    if await client.is_user_authorized():
        print("ALREADY_AUTHORIZED")
        await client.disconnect()
        return

    result = await client.send_code_request(PHONE)
    print(f"CODE_SENT:{result.phone_code_hash}")
    await client.disconnect()

async def verify_code(code, phone_code_hash, password=None):
    """Шаг 2: Ввести код и получить участников"""
    client = TelegramClient('ar_arena_session', API_ID, API_HASH)
    await client.connect()

    try:
        await client.sign_in(PHONE, code, phone_code_hash=phone_code_hash)
        print("Авторизация успешна!")
    except Exception as e:
        if "Two-steps verification" in str(e) and password:
            from telethon.errors import SessionPasswordNeededError
            try:
                await client.sign_in(password=password)
                print("Авторизация с 2FA успешна!")
            except Exception as e2:
                print(f"Ошибка 2FA: {e2}")
                await client.disconnect()
                return
        else:
            print(f"Ошибка авторизации: {e}")
            await client.disconnect()
            return

    # Получаем канал
    try:
        channel = await client.get_entity(CHANNEL_ID)
        print(f"Канал: {channel.title}")
    except Exception as e:
        print(f"Ошибка получения канала: {e}")
        await client.disconnect()
        return

    # Получаем участников
    print("Получаем список участников...")

    all_participants = []
    offset = 0
    limit = 200

    while True:
        participants = await client(GetParticipantsRequest(
            channel=channel,
            filter=ChannelParticipantsSearch(''),
            offset=offset,
            limit=limit,
            hash=0
        ))

        if not participants.users:
            break

        all_participants.extend(participants.users)
        offset += len(participants.users)
        print(f"  Загружено: {len(all_participants)}")

        if len(participants.users) < limit:
            break

    print(f"\nВсего в канале: {len(all_participants)}")

    # Сохраняем
    members_data = []
    for user in all_participants:
        members_data.append({
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_bot': user.bot
        })

    with open('channel_members.json', 'w', encoding='utf-8') as f:
        json.dump(members_data, f, ensure_ascii=False, indent=2)

    print("Сохранено в channel_members.json")

    # IDs без ботов
    ids = [u.id for u in all_participants if not u.bot]
    print(f"\nIDs ({len(ids)}):")
    print(json.dumps(ids))

    await client.disconnect()

async def get_members_authorized():
    """Если уже авторизован - просто получить участников"""
    client = TelegramClient('ar_arena_session', API_ID, API_HASH)
    await client.connect()

    if not await client.is_user_authorized():
        print("NOT_AUTHORIZED")
        await client.disconnect()
        return

    print("Уже авторизован, получаем участников...")

    # Получаем участников КАНАЛА используя get_participants (лучше для больших каналов)
    channel = await client.get_entity(CHANNEL_ID)
    print(f"\n=== КАНАЛ: {channel.title} ===")
    print(f"Участников по данным канала: {channel.participants_count}")

    # Обходим лимит 200: ищем по буквам алфавита
    all_users = {}

    # Русские + английские буквы + цифры
    search_queries = [''] + list('абвгдеёжзийклмнопрстуфхцчшщъыьэюя') + list('abcdefghijklmnopqrstuvwxyz') + list('0123456789')

    for query in search_queries:
        try:
            participants = await client.get_participants(channel, search=query, limit=200)
            for user in participants:
                if user.id not in all_users:
                    all_users[user.id] = user
            if query == '':
                print(f"  Базовый запрос: {len(participants)}")
            elif len(participants) > 0:
                print(f"  '{query}': +{len([u for u in participants if u.id not in all_users])}")
        except Exception as e:
            pass

    channel_participants = list(all_users.values())
    print(f"Всего уникальных участников: {len(channel_participants)}")

    # Сохраняем КАНАЛ
    channel_data = []
    for user in channel_participants:
        channel_data.append({
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_bot': user.bot
        })

    with open('channel_members.json', 'w', encoding='utf-8') as f:
        json.dump(channel_data, f, ensure_ascii=False, indent=2)

    print("Сохранено в channel_members.json")

    # Теперь получаем ЧАТ
    try:
        chat = await client.get_entity(CHAT_ID)
        print(f"\n=== ЧАТ: {chat.title} ===")

        chat_users = {}
        search_queries = [''] + list('абвгдеёжзийклмнопрстуфхцчшщъыьэюя') + list('abcdefghijklmnopqrstuvwxyz') + list('0123456789')

        for query in search_queries:
            try:
                participants = await client.get_participants(chat, search=query, limit=200)
                for user in participants:
                    if user.id not in chat_users:
                        chat_users[user.id] = user
            except:
                pass

        chat_participants = list(chat_users.values())
        print(f"Всего в чате: {len(chat_participants)}")

        chat_data = []
        for user in chat_participants:
            chat_data.append({
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_bot': user.bot
            })

        with open('chat_members.json', 'w', encoding='utf-8') as f:
            json.dump(chat_data, f, ensure_ascii=False, indent=2)

        print("Сохранено в chat_members.json")

        chat_ids = [u.id for u in chat_participants if not u.bot]
        print(f"IDs без ботов: {len(chat_ids)}")

    except Exception as e:
        print(f"Ошибка получения чата: {e}")

    await client.disconnect()

if __name__ == '__main__':
    if len(sys.argv) == 1:
        # Проверяем авторизацию или отправляем код
        asyncio.run(send_code())
    elif sys.argv[1] == 'get':
        # Получить участников (если уже авторизован)
        asyncio.run(get_members_authorized())
    elif len(sys.argv) >= 3:
        # Ввод кода: python script.py CODE HASH [PASSWORD]
        code = sys.argv[1]
        phone_hash = sys.argv[2]
        password = sys.argv[3] if len(sys.argv) > 3 else None
        asyncio.run(verify_code(code, phone_hash, password))
