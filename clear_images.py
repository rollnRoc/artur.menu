import json
import os

db_path = "C:\\Users\\Emre\\.gemini\\antigravity\\scratch\\artur_siparis\\data\\database.json"

if os.path.exists(db_path):
    with open(db_path, "r", encoding="utf-8") as f:
        db = json.load(f)
    
    # Clear all product image paths
    for item in db.get("menu", []):
        item["image"] = ""
        
    with open(db_path, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
        
    print("Successfully cleared all product images from database.")
else:
    print("Database not found.")
