"""Create a full-resolution Windows ICO from the tracked TrummCards logo."""
from pathlib import Path
import struct
from PIL import Image, ImageOps

root = Path(__file__).resolve().parent.parent
source = root / "assets" / "trummcards-logo.webp"
output = root / "assets" / "trummcards.ico"
image = Image.open(source).convert("RGBA")
image = ImageOps.contain(image, (256, 256), Image.Resampling.LANCZOS)
canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
canvas.alpha_composite(image, ((256 - image.width) // 2, (256 - image.height) // 2))
canvas.save(
    output, format="ICO",
    sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
)
data = output.read_bytes()
count = struct.unpack_from("<H", data, 4)[0]
dimensions = [(data[6 + i*16] or 256, data[7 + i*16] or 256) for i in range(count)]
if (256, 256) not in dimensions:
    raise RuntimeError(f"Icon 256x256 fehlt: {dimensions}")
print(f"Windows-Icon {output.name}: {len(data)} Bytes; Größen: {dimensions}")
