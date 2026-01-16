#!/usr/bin/env python3
import os

skin_dir = "/Users/aleksandrbekk/Desktop/AR ARENA/icons/SKIN"

# Order by coolness (1 = basic, 15 = top)
order = [
    "User.png",        # 1 - Базовый
    "Gamer.png",       # 2 - Геймер
    "Athlete.png",     # 3 - Спортсмен
    "Rapper.png",      # 4 - Рэпер
    "Programmer.png",  # 5 - Программист
    "Designer.png",    # 6 - Дизайнер
    "Lawyer.png",      # 7 - Адвокат
    "Politician.png",  # 8 - Политик
    "Banker.png",      # 9 - Банкир
    "Mafia.png",       # 10 - Мафиози
    "Richman.png",     # 11 - Богач
    "UFCChampion.png", # 12 - Чемпион UFC
    "Loki.png",        # 13 - Локи
    "VDV.png",         # 14 - ВДВшник
    "Cryptan.png",     # 15 - Криптан
]

# Step 1: rename to temp files
for i, name in enumerate(order, 1):
    old_path = os.path.join(skin_dir, name)
    temp_path = os.path.join(skin_dir, f"temp_{i:02d}.png")
    if os.path.exists(old_path):
        os.rename(old_path, temp_path)
        print(f"Step 1: {name} -> temp_{i:02d}.png")

# Step 2: rename to Bull1.png, Bull2.png, etc.
for i in range(1, 16):
    temp_path = os.path.join(skin_dir, f"temp_{i:02d}.png")
    final_path = os.path.join(skin_dir, f"Bull{i}.png")
    if os.path.exists(temp_path):
        os.rename(temp_path, final_path)
        print(f"Step 2: temp_{i:02d}.png -> Bull{i}.png")

print("\nFinal files:")
for f in sorted(os.listdir(skin_dir), key=lambda x: int(x.replace('Bull','').replace('.png','')) if x.startswith('Bull') and x.endswith('.png') else 999):
    if f.endswith('.png'):
        print(f"  {f}")
