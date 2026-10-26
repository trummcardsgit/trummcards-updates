"""Build the Windows Cloud TEST icon from the original TrummCards logo.

Only affects cloud/desktop-test/assets/cloud-test.ico. Never changes the production Windows app.
Requires Pillow: python -m pip install pillow
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src" / "logo.webp"
TARGET = ROOT / "assets" / "cloud-test.ico"
if not SOURCE.is_file():
    raise FileNotFoundError(f"TrummCards logo missing: {SOURCE}")
logo = Image.open(SOURCE).convert("RGBA")
logo = logo.resize((512, 512), Image.Resampling.LANCZOS)
TARGET.parent.mkdir(parents=True, exist_ok=True)
logo.save(
    TARGET,
    format="ICO",
    sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)
print(f"Cloud TEST icon generated from original logo: {TARGET} ({TARGET.stat().st_size} bytes)")
