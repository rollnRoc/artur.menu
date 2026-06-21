import openpyxl
import json
import os

app_dir = "C:\\Users\\Emre\\.gemini\\antigravity\\scratch\\artur_siparis"
db_path = os.path.join(app_dir, "data", "database.json")
images_dir = os.path.join(app_dir, "public", "images", "menü")

# 1. Scan available local image files
local_images = {}
if os.path.exists(images_dir):
    for f in os.listdir(images_dir):
        if os.path.isfile(os.path.join(images_dir, f)):
            base, ext = os.path.splitext(f)
            local_images[base.lower()] = f
print(f"Scanned {len(local_images)} local product images.")

# 2. Read products from Menü.xlsx
menu_items = []
prod_file = "C:\\Users\\Emre\\.gemini\\antigravity\\scratch\\Menü.xlsx"

wb = openpyxl.load_workbook(prod_file, read_only=True)
sheet = wb["menü"]
rows = list(sheet.iter_rows(values_only=True))

headers = [str(h).strip().lower() for h in rows[0]]
cat_idx = headers.index("kategori")
name_idx = headers.index("ürün adı")
price_idx = headers.index("ürün fiyatı")

item_id = 1
for row in rows[1:]:
    if len(row) > max(cat_idx, name_idx, price_idx) and row[name_idx] is not None:
        cat = str(row[cat_idx]).strip()
        name = str(row[name_idx]).strip()
        try:
            price = float(row[price_idx]) if row[price_idx] is not None else 0.0
            if price.is_integer():
                price = int(price)
        except ValueError:
            price = 0
            
        # Match safe image name
        clean_name = "".join([c if c.isalnum() else "_" for c in name])
        clean_key = clean_name.lower()
        
        img_path = ""
        if clean_key in local_images:
            img_path = f"/images/menü/{local_images[clean_key]}"
            
        menu_items.append({
            "id": item_id,
            "category": cat,
            "name": name,
            "price": price,
            "image": img_path,
            "active": True
        })
        item_id += 1

# 3. Save to database.json (preserve existing orders and settings if present)
existing_db = {"orders": [], "settings": {"orderCounter": 0, "lastCounterDate": ""}}
if os.path.exists(db_path):
    try:
        with open(db_path, "r", encoding="utf-8") as f:
            existing_db = json.load(f)
    except Exception as e:
        print("Error reading existing DB, initializing defaults:", e)

database = {
    "menu": menu_items,
    "orders": existing_db.get("orders", []),
    "settings": existing_db.get("settings", {
        "orderCounter": 0,
        "lastCounterDate": ""
    })
}

with open(db_path, "w", encoding="utf-8") as f:
    json.dump(database, f, indent=2, ensure_ascii=False)

print(f"Successfully updated database.json with {len(menu_items)} items linked to local images.")
