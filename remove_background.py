import os
from PIL import Image

def remove_black_background(image_path, threshold=20):
    try:
        img = Image.open(image_path).convert("RGBA")
        datas = img.getdata()
        
        newData = []
        for item in datas:
            # Check if pixel is black (or very close to it)
            if item[0] <= threshold and item[1] <= threshold and item[2] <= threshold:
                # Make it transparent
                newData.append((0, 0, 0, 0))
            else:
                # Keep original pixel
                newData.append(item)
        
        img.putdata(newData)
        # Overwrite content
        img.save(image_path, "PNG")
        print(f"Processed: {image_path}")
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

icon_files = [
    "public/premium/icon_shield.png",
    "public/premium/icon_chart.png",
    "public/premium/icon_ingot.png",
    "public/premium/icon_star.png",
    "public/premium/icon_gift.png"
]

print("Starting background removal...")
for icon in icon_files:
    if os.path.exists(icon):
        remove_black_background(icon)
    else:
        print(f"File not found: {icon}")
print("Done.")
