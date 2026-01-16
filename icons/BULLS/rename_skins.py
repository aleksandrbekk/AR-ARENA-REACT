#!/usr/bin/env python3
import os

skin_dir = "/Users/aleksandrbekk/Desktop/AR ARENA/icons/SKIN"

# Mapping: old name -> new name
rename_map = {
    "Bull1.png": "User.png",
    "Bull2.png": "Gamer.png",
    "Bull3.png": "Athlete.png",
    "Bull4.png": "Rapper.png",
    "Bull5.png": "Programmer.png",
    "Bull6.png": "Designer.png",
    "Bull8.png": "Lawyer.png",
    "Bull9.png": "Politician.png",
    "Bull10.png": "Mafia.png",
    "Bull11.png": "Banker.png",
    "Bull12.png": "Paratrooper.png",
    "Bull13.png": "Loki.png",
    "Bull15.png": "UFCChampion.png",
    "Bull16.png": "Cryptan.png",
}

# Delete duplicate
duplicate = os.path.join(skin_dir, "Bull14.png")
if os.path.exists(duplicate):
    os.remove(duplicate)
    print(f"Deleted duplicate: Bull14.png")

# Rename files
for old_name, new_name in rename_map.items():
    old_path = os.path.join(skin_dir, old_name)
    new_path = os.path.join(skin_dir, new_name)
    if os.path.exists(old_path):
        os.rename(old_path, new_path)
        print(f"{old_name} -> {new_name}")
    else:
        print(f"NOT FOUND: {old_name}")

print("\nFinal files:")
for f in sorted(os.listdir(skin_dir)):
    if f.endswith('.png'):
        print(f"  {f}")
