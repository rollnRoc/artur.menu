import os
from PIL import Image

def update_brand_assets():
    src_logo = r"C:\Users\Emre\.gemini\antigravity\scratch\artur_logo.jpg"
    base_dir = r"C:\Users\Emre\.gemini\antigravity\scratch\artur_siparis"
    
    dest_logo = os.path.join(base_dir, "public", "images", "logo.png")
    dest_fav_public = os.path.join(base_dir, "public", "favicon.ico")
    dest_fav_root = os.path.join(base_dir, "favicon.ico")
    
    if not os.path.exists(src_logo):
        print(f"Error: Source logo file not found at: {src_logo}")
        return False
        
    print(f"Loading source logo from: {src_logo}")
    try:
        # Load source image
        img = Image.open(src_logo)
        
        # Ensure images directory exists
        os.makedirs(os.path.dirname(dest_logo), exist_ok=True)
        
        # Convert and save as PNG logo (512x512 for high resolution)
        logo_img = img.resize((512, 512), Image.Resampling.LANCZOS)
        logo_img.save(dest_logo, format="PNG")
        print(f"Updated Logo saved to: {dest_logo}")
        
        # Generate Favicon (Multi-resolution ICO)
        # Resize to 128x128 first
        fav_base = img.resize((128, 128), Image.Resampling.LANCZOS)
        
        # Save to both target locations
        fav_base.save(dest_fav_public, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
        print(f"Updated Favicon saved to: {dest_fav_public}")
        
        fav_base.save(dest_fav_root, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
        print(f"Updated Favicon saved to: {dest_fav_root}")
        
        return True
    except Exception as e:
        print(f"An error occurred while updating brand assets: {e}")
        return False

if __name__ == "__main__":
    success = update_brand_assets()
    if success:
        print("Brand assets updated successfully.")
    else:
        print("Brand assets update failed.")
