import json
PLAN = r"D:\claude code\3d\plan"
D = json.load(open(PLAN + r"\drawings.json"))
def U(p):  # upright: X east = page_y, N north = page_x
    return (p[1], p[0])
def bbox_items(items):
    xs, ys = [], []
    for it in items:
        pts = []
        if it[0] == "l": pts = [it[1], it[2]]
        elif it[0] == "re": pts = [[it[1][0], it[1][1]], [it[1][2], it[1][3]]]
        elif it[0] == "c": pts = it[1:]
        elif it[0] == "qu": pts = it[1]
        for p in pts:
            X, N = U(p); xs.append(X); ys.append(N)
    return min(xs), min(ys), max(xs), max(ys)

grays = []
for d in D:
    if d["type"] == "f" and d["fill"] and abs(d["fill"][0] - 0.5) < 0.01:
        x0, n0, x1, n1 = bbox_items(d["items"])
        grays.append((round(x0, 2), round(n0, 2), round(x1, 2), round(n1, 2), len(d["items"]), [i[0] for i in d["items"]][:6]))
grays.sort()
print(len(grays))
for g in grays: print(g)
