import sys
sys.path.insert(0, r"D:\claude code\3d\_cache\pylib")
import pymupdf
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
PLAN = r"D:\claude code\3d\plan"
doc = pymupdf.open(PLAN + r"\msplan1.pdf")
p = doc[0]
# drawing region in page pts approx x 180..760, y 200..900 ; render that clip at 400dpi
clip = pymupdf.Rect(128, 140, 545, 655)
pix = p.get_pixmap(dpi=400, clip=clip)
pix.save(PLAN + r"\clip400.png")
im = Image.open(PLAN + r"\clip400.png").rotate(90, expand=True)  # PIL rotate is CCW
im.save(PLAN + r"\upright400.png")
W, H = im.size
print(W, H)
im.resize((W // 4, H // 4)).save(PLAN + r"\upright_small.png")
# 3x3 crops with overlap
n = 3
for i in range(n):
    for j in range(n):
        x0 = int(W * i / n - W * 0.04); x1 = int(W * (i + 1) / n + W * 0.04)
        y0 = int(H * j / n - H * 0.04); y1 = int(H * (j + 1) / n + H * 0.04)
        c = im.crop((max(0, x0), max(0, y0), min(W, x1), min(H, y1)))
        c.thumbnail((1400, 1400))
        c.save(PLAN + rf"\crop_r{j}_c{i}.png")
