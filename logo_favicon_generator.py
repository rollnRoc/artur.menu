import os
from PIL import Image, ImageDraw, ImageFont

# Set up paths
public_dir = r"C:\Users\Emre\..gemini\antigravity\scratch\artur_siparis\public"
# Resolve parent and check absolute paths
base_dir = r"C:\Users\Emre\.gemini\antigravity\scratch\artur_siparis"
public_dir = os.path.join(base_dir, "public")
images_dir = os.path.join(public_dir, "images")

os.makedirs(images_dir, exist_ok=True)

# Color Scheme
BG_COLOR = (11, 15, 25)      # #0b0f19
GOLD_COLOR = (251, 191, 36)   # #fbbf24
WHITE_COLOR = (243, 244, 246) # #f3f4f6
ACCENT_DARK = (245, 158, 11)  # #f59e0b

def draw_4point_star(draw, cx, cy, r_out, r_in, fill_color):
    """Draws a sharp 4-pointed star (✦) at (cx, cy)"""
    points = [
        (cx, cy - r_out),                      # Top
        (cx + r_in, cy - r_in),
        (cx + r_out, cy),                      # Right
        (cx + r_in, cy + r_in),
        (cx, cy + r_out),                      # Bottom
        (cx - r_in, cy + r_in),
        (cx - r_out, cy),                      # Left
        (cx - r_in, cy - r_in),
    ]
    draw.polygon(points, fill=fill_color)

# ----------------------------------------------------------------------
# 1. GENERATE LOGO (512x512)
# ----------------------------------------------------------------------
logo_size = 512
logo_img = Image.new("RGBA", (logo_size, logo_size), color=BG_COLOR)
draw = ImageDraw.Draw(logo_img)

# Draw gold gradient-like ring
# We draw an outer circle and inner circle to create a clean ring
ring_margin = 40
ring_thickness = 12
draw.arc(
    [ring_margin, ring_margin, logo_size - ring_margin, logo_size - ring_margin],
    start=0,
    end=360,
    fill=GOLD_COLOR,
    width=ring_thickness
)

# Draw thin white decorative inner ring
draw.arc(
    [ring_margin + 20, ring_margin + 20, logo_size - ring_margin - 20, logo_size - ring_margin - 20],
    start=0,
    end=360,
    fill=(156, 163, 175), # #9ca3af (text-muted)
    width=2
)

# Draw central 4-pointed star (✦)
draw_4point_star(draw, cx=logo_size // 2, cy=logo_size // 2 - 30, r_out=100, r_in=25, fill_color=GOLD_COLOR)

# Load font
font_path = r"C:\Windows\Fonts\arialbd.ttf" # Arial Bold
font_found = os.path.exists(font_path)

# Draw Brand Name Typography
if font_found:
    try:
        font_main = ImageFont.truetype(font_path, 36)
        font_sub = ImageFont.truetype(font_path, 18)
        
        # Text "MERKEZ CAFE"
        text_main = "MERKEZ CAFE"
        w_main = draw.textlength(text_main, font=font_main)
        draw.text(((logo_size - w_main) / 2, logo_size // 2 + 100), text_main, fill=WHITE_COLOR, font=font_main)
        
        # Text "ARTUR"
        text_sub = "A R T U R"
        w_sub = draw.textlength(text_sub, font=font_sub)
        draw.text(((logo_size - w_sub) / 2, logo_size // 2 + 150), text_sub, fill=GOLD_COLOR, font=font_sub)
    except Exception as e:
        print(f"Error drawing text with font: {e}")
        font_found = False

if not font_found:
    # Fallback default font
    font = ImageFont.load_default()
    draw.text((logo_size // 2 - 50, logo_size // 2 + 100), "MERKEZ CAFE", fill=WHITE_COLOR, font=font)
    draw.text((logo_size // 2 - 20, logo_size // 2 + 130), "ARTUR", fill=GOLD_COLOR, font=font)

# Save Logo
logo_path = os.path.join(images_dir, "logo.png")
logo_img.save(logo_path, format="PNG")
print(f"Saved Logo: {logo_path}")

# ----------------------------------------------------------------------
# 2. GENERATE FAVICON (Multi-resolution ICO)
# ----------------------------------------------------------------------
# We create a 128x128 image and scale down for multiple sizes in ICO
fav_size = 128
fav_img = Image.new("RGBA", (fav_size, fav_size), color=BG_COLOR)
draw_fav = ImageDraw.Draw(fav_img)

# Draw circle background
draw_fav.ellipse([10, 10, fav_size - 10, fav_size - 10], outline=GOLD_COLOR, width=6)

# Draw star (✦) at the center
draw_4point_star(draw_fav, cx=fav_size // 2, cy=fav_size // 2, r_out=35, r_in=9, fill_color=GOLD_COLOR)

# Save ICO to public/favicon.ico and the root of the project
favicon_paths = [
    os.path.join(public_dir, "favicon.ico"),
    os.path.join(base_dir, "favicon.ico")
]

for p in favicon_paths:
    fav_img.save(p, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print(f"Saved Favicon: {p}")
