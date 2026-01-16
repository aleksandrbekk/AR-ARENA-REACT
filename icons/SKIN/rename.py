#!/usr/bin/env python3
import os

skin_dir = "/Users/aleksandrbekk/Desktop/AR ARENA/icons/SKIN"
os.chdir(skin_dir)

# Original mapping: old name -> new sequential number
rename_map = {
    "bull .png": 1,    # with space
    "Bull2.png": 2,
    "Bull3.png": 3,
    "Bull4.png": 4,
    "Bull5.png": 5,
    "BULL6.png": 6,
    "Bull8.png": 7,
    "Bull9.png": 8,
    "Bull10.png": 9,
    "Bull11.png": 10,
    "Bull12.png": 11,
    "Bull13.png": 12,
    "bull14.png": 13,
    "BULL19.png": 14,
    "Bull20.png": 15,
}

# First pass: rename to temp files
for old_name, num in rename_map.items():
    if os.path.exists(old_name):
        os.rename(old_name, f"temp_{num:02d}.png")
        print(f"Step 1: {old_name} -> temp_{num:02d}.png")

# Second pass: rename to final names
for num in range(1, 16):
    temp_name = f"temp_{num:02d}.png"
    final_name = f"Bull{num}.png"
    if os.path.exists(temp_name):
        os.rename(temp_name, final_name)
        print(f"Step 2: {temp_name} -> {final_name}")

print("\nDone! Final files:")
for f in sorted(os.listdir(skin_dir)):
    if f.endswith('.png'):
        print(f"  {f}")
