#!/bin/bash
cd "/Users/aleksandrbekk/Desktop/AR ARENA/icons/SKIN/"

# Rename to temp files first to avoid conflicts
mv "bull .png" "temp_01.png" 2>/dev/null
mv "Bull2.png" "temp_02.png" 2>/dev/null
mv "Bull3.png" "temp_03.png" 2>/dev/null
mv "Bull4.png" "temp_04.png" 2>/dev/null
mv "Bull5.png" "temp_05.png" 2>/dev/null
mv "BULL6.png" "temp_06.png" 2>/dev/null
mv "Bull8.png" "temp_07.png" 2>/dev/null
mv "Bull9.png" "temp_08.png" 2>/dev/null
mv "Bull10.png" "temp_09.png" 2>/dev/null
mv "Bull11.png" "temp_10.png" 2>/dev/null
mv "Bull12.png" "temp_11.png" 2>/dev/null
mv "Bull13.png" "temp_12.png" 2>/dev/null
mv "bull14.png" "temp_13.png" 2>/dev/null
mv "BULL19.png" "temp_14.png" 2>/dev/null
mv "Bull20.png" "temp_15.png" 2>/dev/null

# Rename to final names
mv "temp_01.png" "Bull1.png" 2>/dev/null
mv "temp_02.png" "Bull2.png" 2>/dev/null
mv "temp_03.png" "Bull3.png" 2>/dev/null
mv "temp_04.png" "Bull4.png" 2>/dev/null
mv "temp_05.png" "Bull5.png" 2>/dev/null
mv "temp_06.png" "Bull6.png" 2>/dev/null
mv "temp_07.png" "Bull7.png" 2>/dev/null
mv "temp_08.png" "Bull8.png" 2>/dev/null
mv "temp_09.png" "Bull9.png" 2>/dev/null
mv "temp_10.png" "Bull10.png" 2>/dev/null
mv "temp_11.png" "Bull11.png" 2>/dev/null
mv "temp_12.png" "Bull12.png" 2>/dev/null
mv "temp_13.png" "Bull13.png" 2>/dev/null
mv "temp_14.png" "Bull14.png" 2>/dev/null
mv "temp_15.png" "Bull15.png" 2>/dev/null

echo "Done! Files:"
ls -1 *.png
