import os, sys
root = r"D:\claude code\3d\project"
fixed = []
def enc(s):
    out = bytearray()
    for ch in s:
        o = ord(ch)
        if o < 128:
            out.append(o)
        else:
            try:
                out += ch.encode('cp1252')
            except UnicodeEncodeError:
                if 0x80 <= o <= 0x9F:
                    out.append(o)
                else:
                    raise
    return bytes(out)
for d in ["src", "scripts", "."]:
    base = os.path.join(root, d)
    for dp, dn, fn in os.walk(base):
        if "node_modules" in dp or (d == "." and dp != base):
            continue
        for f in fn:
            if not f.endswith((".js", ".ts", ".css", ".html", ".mjs")):
                continue
            p = os.path.join(dp, f)
            t = open(p, encoding="utf-8").read()
            if all(ord(c) < 128 for c in t):
                continue
            try:
                n = enc(t).decode("utf-8")
            except Exception:
                continue
            if n != t:
                open(p, "w", encoding="utf-8", newline="").write(n)
                fixed.append(p)
print("\n".join(fixed) or "none")
