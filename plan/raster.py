import sys, json
sys.path.insert(0, r"D:\claude code\3d\_cache\pylib")
import fitz

PLAN = r"D:\claude code\3d\plan"
doc = fitz.open(PLAN + r"\msplan1.pdf")
print("pages", len(doc))
p = doc[0]
print("rect", p.rect, "rotation", p.rotation)
# full page raster at 150 dpi, rotated so it's upright (rotate 90 CCW)
for dpi in (100, 300):
    pix = p.get_pixmap(dpi=dpi)
    pix.save(PLAN + rf"\page_{dpi}.png")
    print(dpi, pix.width, pix.height)

drawings = p.get_drawings()
print("drawings", len(drawings))
out = []
for d in drawings:
    items = []
    for it in d["items"]:
        op = it[0]
        if op == "l":
            items.append(["l", [it[1].x, it[1].y], [it[2].x, it[2].y]])
        elif op == "re":
            r = it[1]
            items.append(["re", [r.x0, r.y0, r.x1, r.y1]])
        elif op == "c":
            items.append(["c", [it[1].x, it[1].y], [it[2].x, it[2].y], [it[3].x, it[3].y], [it[4].x, it[4].y]])
        elif op == "qu":
            q = it[1]
            items.append(["qu", [[q.ul.x, q.ul.y], [q.ur.x, q.ur.y], [q.lr.x, q.lr.y], [q.ll.x, q.ll.y]]])
    out.append({
        "type": d.get("type"),
        "color": d.get("color"),
        "fill": d.get("fill"),
        "width": d.get("width"),
        "rect": [d["rect"].x0, d["rect"].y0, d["rect"].x1, d["rect"].y1],
        "items": items,
    })
json.dump(out, open(PLAN + r"\drawings.json", "w"))
print("text:", repr(p.get_text()[:200]))
