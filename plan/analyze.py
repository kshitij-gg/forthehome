import json, collections
PLAN = r"D:\claude code\3d\plan"
D = json.load(open(PLAN + r"\drawings.json"))
# upright coords: X = page_y, N = page_x
def U(p):
    return (round(p[1], 2), round(p[0], 2))

cnt = collections.Counter()
for d in D:
    key = (d["type"], tuple(round(c, 2) for c in d["color"]) if d["color"] else None,
           tuple(round(c, 2) for c in d["fill"]) if d["fill"] else None, round(d["width"] or 0, 2))
    cnt[key] += 1
for k, v in cnt.most_common(60):
    print(v, k)
