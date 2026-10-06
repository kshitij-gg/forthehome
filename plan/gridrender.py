import json
from PIL import Image, ImageDraw, ImageFont
PLAN = r"D:\claude code\3d\plan"
D = json.load(open(PLAN + r"\drawings.json"))
S = 6.0
X0, X1, N0, N1 = 140, 650, 130, 540
W, H = int((X1 - X0) * S), int((N1 - N0) * S)
im = Image.new("RGB", (W, H), "white")
dr = ImageDraw.Draw(im)
def P(p):
    X, N = p[1], p[0]
    return ((X - X0) * S, (N1 - N) * S)
# grid
for x in range(X0, X1 + 1, 10):
    c = (255, 180, 180) if x % 50 == 0 else (235, 235, 255)
    dr.line([((x - X0) * S, 0), ((x - X0) * S, H)], fill=c, width=1)
for n in range(N0, N1 + 1, 10):
    c = (255, 180, 180) if n % 50 == 0 else (235, 235, 255)
    dr.line([(0, (N1 - n) * S), (W, (N1 - n) * S)], fill=c, width=1)
try:
    f = ImageFont.truetype("arial.ttf", 18)
except Exception:
    f = None
for x in range(X0, X1 + 1, 10):
    for n in range(N0, N1 + 1, 50):
        dr.text(((x - X0) * S + 2, (N1 - n) * S + 2), str(x), fill=(200, 0, 0), font=f)
for n in range(N0, N1 + 1, 10):
    for x in range(X0, X1 + 1, 50):
        dr.text(((x - X0) * S + 2, (N1 - n) * S - 20), str(n), fill=(0, 0, 200), font=f)

def col(c):
    return tuple(int(v * 255) for v in c)
for d in D:
    fill = d["fill"]; stroke = d["color"]
    for it in d["items"]:
        if it[0] == "l":
            pts = [P(it[1]), P(it[2])]
        elif it[0] == "re":
            r = it[1]; pts = [P([r[0], r[1]]), P([r[2], r[1]]), P([r[2], r[3]]), P([r[0], r[3]]), P([r[0], r[1]])]
        elif it[0] == "qu":
            pts = [P(q) for q in it[1]] + [P(it[1][0])]
        elif it[0] == "c":
            pts = [P(it[1]), P(it[4])]
        if d["type"] == "f" and fill:
            if len(pts) >= 3:
                dr.polygon(pts, fill=col(fill))
        else:
            c = col(stroke) if stroke else (0, 0, 0)
            dr.line(pts, fill=c, width=1)
# polygons for f items composed of lines: draw as polygon from sequence
for d in D:
    if d["type"] in ("f", "fs") and d["fill"] and d["items"] and all(i[0] == "l" for i in d["items"]):
        pts = [P(d["items"][0][1])] + [P(i[2]) for i in d["items"]]
        if len(pts) >= 3:
            dr.polygon(pts, fill=col(d["fill"]))
im.save(PLAN + r"\grid_full.png")
# tiles
tw, th = 1500, 1200
k = 0
for ty in range(0, H, th - 200):
    for tx in range(0, W, tw - 200):
        im.crop((tx, ty, min(W, tx + tw), min(H, ty + th))).save(PLAN + rf"\grid_{ty//1000}_{tx//1000}.png")
print(W, H)
