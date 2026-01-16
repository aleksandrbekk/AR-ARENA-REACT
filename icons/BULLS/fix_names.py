#!/usr/bin/env python3
import os

skin_dir = "/Users/aleksandrbekk/Desktop/AR ARENA/icons/SKIN"

# Fix names
rename_map = {
    "БОГАЧ.png": "Richman.png",
    "БАНКИР.png": "Banker.png",
    "LOKI .png": "Loki.png",  # remove space before .png
}

for old_name, new_name in rename_map.items():
    old_path = os.path.join(skin_dir, old_name)
    new_path = os.path.join(skin_dir, new_name)
    if os.path.exists(old_path):
        # Remove target if exists (in case of overwrite)
        if os.path.exists(new_path):
            os.remove(new_path)
        os.rename(old_path, new_path)
        print(f"{old_name} -> {new_name}")
    else:
        print(f"NOT FOUND: {old_name}")

print("\nFinal files:")
for f in sorted(os.listdir(skin_dir)):
    if f.endswith('.png'):
        print(f"  {f}")
