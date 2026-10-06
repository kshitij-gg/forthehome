"""Procedural soundtrack for the Design Studio showcase (fully synthesised, no samples, licence-free).

Score: 80 BPM ambient-house in D major. Bar grid is offset so the night section drops exactly on the
night switch (79.80 s). Day: Dmaj9-Bm9-Gmaj9-Asus2 with Rhodes arpeggios, soft kick/hats/shaker.
Night: Bm9-Gmaj7#11-Em9-F#m7, darker pads, bell motif, half-time groove. Outro resolves to Dmaj9.
SFX follow the cue sheet exported from the recorder: panel whooshes, cursor clicks, shimmer risers on
the light trail, landing blooms, paint/floor/light spreads, slider detents, doors, titles, intro/outro.
Run:  python build_audio.py   ->  showcase_mix.wav (48 kHz stereo, 16-bit)
"""
import json, os, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
cues = json.load(open(os.path.join(HERE, 'cues.json')))
T = cues['total']
N = int((T + 0.05) * SR)
rng = np.random.default_rng(11)
TAU = 2 * np.pi

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def tt(n): return np.arange(n, dtype=np.float64) / SR

MUS = np.zeros((2, N)); SFX = np.zeros((2, N)); SEND = np.zeros((2, N))

def add(buf, start, sig, pan=0.0, gain=1.0, send=0.0):
    """mix mono/stereo sig at time `start` (s) with equal-power pan; optional reverb send"""
    i0 = int(round(start * SR))
    if sig.ndim == 1:
        a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
        sig = np.vstack([sig * np.cos(a), sig * np.sin(a)]) * np.sqrt(2)
    s0 = max(0, -i0); i0 = max(0, i0); n = min(sig.shape[1] - s0, N - i0)
    if n <= 0: return
    buf[:, i0:i0 + n] += gain * sig[:, s0:s0 + n]
    if send: SEND[:, i0:i0 + n] += send * gain * sig[:, s0:s0 + n]

def bandnoise(n, lo, hi, seed=None):
    r = np.random.default_rng(seed) if seed is not None else rng
    X = np.fft.rfft(r.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR)
    lo_e = np.clip((f - lo * 0.8) / (lo * 0.4 + 1), 0, 1); hi_e = np.clip((hi * 1.25 - f) / (hi * 0.5), 0, 1)
    y = np.fft.irfft(X * lo_e * hi_e, n)
    return y / (np.abs(y).max() + 1e-9)

# ---------------------------------------------------------------- oscillators
def table(H, bright):
    ph = np.arange(4096) / 4096; w = np.zeros(4096)
    for h in range(1, H + 1): w += (1 / h) * np.exp(-(h - 1) / bright) * np.sin(TAU * h * ph)
    return w / np.abs(w).max()
TAB_DAY, TAB_NIGHT, TAB_BASS = table(16, 3.2), table(12, 1.7), table(4, 0.8)

def wt(tab, f, n, ph0=0.0, vib=0.0):
    ph = ph0 + f * tt(n)
    if vib: ph += vib * np.sin(TAU * 0.23 * tt(n) + rng.random() * 6) / TAU
    ph = (ph % 1.0) * 4096; i = ph.astype(np.int64); fr = ph - i
    return tab[i] * (1 - fr) + tab[(i + 1) % 4096] * fr

def ep(f, dur, vel):  # FM electric piano
    n = int(dur * SR); t = tt(n)
    I = (0.6 + 1.6 * vel) * np.exp(-t / 0.32)
    y = np.sin(TAU * f * t + I * np.sin(TAU * f * t)) + 0.22 * np.sin(TAU * 2 * f * t) * np.exp(-t / 0.18)
    return y * (1 - np.exp(-t / 0.003)) * np.exp(-t / 1.1) * vel

def bell(f, dur, vel, ratio=3.5, I0=2.4, decay=None):
    n = int(dur * SR); t = tt(n)
    I = I0 * np.exp(-t / 0.5)
    y = np.sin(TAU * f * t + I * np.sin(TAU * f * ratio * t)) + 0.3 * np.sin(TAU * 2.01 * f * t) * np.exp(-t / 0.4)
    return y * (1 - np.exp(-t / 0.002)) * np.exp(-t / (decay or dur / 3)) * vel

def env_ar(n, a, r, hold=None):
    t = tt(n); e = np.clip(t / max(a, 1e-4), 0, 1); e = e * e * (3 - 2 * e)
    if hold is not None: e *= np.clip(1 - (t - hold) / r, 0, 1) ** 1.5
    return e

# ---------------------------------------------------------------- harmony & form
OFF, BAR, BEAT = 1.8, 3.0, 0.75
C = {
    'Dmaj9': [50, 57, 61, 64, 66], 'Bm9': [47, 54, 57, 61, 62], 'Gmaj9': [43, 50, 54, 57, 59], 'Asus2': [45, 52, 57, 59, 64],
    'Gmaj7#11': [43, 50, 54, 59, 61], 'Em9': [40, 47, 50, 54, 55], 'F#m7': [42, 49, 52, 57, 61],
}
DAY = ['Dmaj9', 'Bm9', 'Gmaj9', 'Asus2']; NIGHT = ['Bm9', 'Gmaj7#11', 'Em9', 'F#m7']
NBARS = int((T - OFF) / BAR) + 1
def section(k):
    if k < 2: return 'intro'
    if k < 26: return 'day'
    if k < 54: return 'night'
    if k < 60: return 'wind'
    return 'outro'
def chord_of(k):
    s = section(k)
    if s in ('intro', 'day'): return DAY[k % 4] if k >= 0 else 'Dmaj9'
    if s == 'night': return NIGHT[(k - 26) % 4]
    if s == 'wind': return ['Gmaj9', 'Gmaj9', 'Asus2', 'Asus2', 'Bm9', 'Asus2'][k - 54]
    return 'Dmaj9'
def chord_at(t): return C[chord_of(int(np.floor((t - OFF) / BAR)) if t >= OFF else -1)]
def bar_t(k): return OFF + k * BAR

# ---------------------------------------------------------------- music
def pads():
    regions = []; k = -1
    while k < NBARS:  # merge repeated chords into one region
        name = chord_of(k); k2 = k + 1
        while k2 < NBARS and chord_of(k2) == name and section(k2) == section(k): k2 += 1
        t0 = 0.0 if k < 0 else bar_t(k); t1 = min(T, bar_t(k2)); regions.append((t0, t1, name, section(max(k, 0)))); k = k2
    for (t0, t1, name, sec) in regions:
        night = sec == 'night'; tab = TAB_NIGHT if night else TAB_DAY
        rel = 2.2; n = int((t1 - t0 + rel) * SR); notes = C[name]
        lvl = {'intro': 0.9, 'day': 0.75, 'night': 0.95, 'wind': 0.85, 'outro': 1.0}[sec]
        e = env_ar(n, 1.6 if t0 > 0 else 2.5, rel, hold=t1 - t0)
        if t1 >= T - 0.01: e *= np.clip((T - t0 - tt(n)) / 2.8, 0, 1)  # fade with the picture
        out = np.zeros((2, n))
        for vi, m in enumerate(notes):
            for d, p in ((-7, -0.7), (0, 0.0), (7, 0.7)):
                f = mtof(m + 12 * (vi == 0 and m < 45)) * 2 ** (d / 1200)
                y = wt(tab, f, n, rng.random(), vib=0.004) * e * (0.28 if vi == 0 else 0.33)
                a = (p + 1) * np.pi / 4; out[0] += y * np.cos(a); out[1] += y * np.sin(a)
        add(MUS, t0, out * 0.11 * lvl, send=0.55)

def bass():
    for k in range(2, NBARS):
        s = section(k)
        if s in ('intro', 'outro'): continue
        root = C[chord_of(k)][0]; root = root - 12 if root > 45 else root
        f = mtof(root); t0 = bar_t(k)
        hits = [(0, 1.45, 1.0), (2.5 * BEAT, 0.6, 0.7)] if s == 'day' else [(0, 2.9, 0.9)] if s == 'night' else [(0, 2.6, 0.7)]
        for (dt, d, v) in hits:
            n = int((d + 0.15) * SR); e = env_ar(n, 0.012 if s == 'day' else 0.08, 0.12, hold=d)
            y = wt(TAB_BASS, f, n) * e * v
            add(MUS, t0 + dt, y * (0.17 if s == 'day' else 0.12), send=0.05)

def keys():
    for k in range(2, NBARS):
        s = section(k); notes = sorted(C[chord_of(k)])[1:]; up = [m + 12 for m in notes] + [notes[0] + 24]
        t0 = bar_t(k)
        if s in ('intro', 'day', 'wind'):
            pat = [0, 2, 4, 3, 1, 3, 4, 2] if k % 2 == 0 else [0, 3, 2, 4, 1, 4, 3, 2]
            steps = range(8) if (s == 'day' and k >= 4) or s == 'wind' else range(0, 8, 2)
            for i in steps:
                m = up[pat[i] % len(up)]; vel = (0.55 if i % 2 == 0 else 0.4) * (0.8 + 0.4 * rng.random())
                y = ep(mtof(m), 1.6, vel); pan = -0.35 + 0.7 * (pat[i] / 4)
                add(MUS, t0 + i * BEAT / 2 + rng.normal(0, 0.004), y * 0.095, pan=pan, send=0.4)
        elif s == 'night':
            for (b, idx, v) in ((0, 3, 0.7), (1.5, 1, 0.5), (2.5, 2, 0.55), (3.25, 4, 0.35)):
                m = up[idx % len(up)] + 12
                add(MUS, t0 + b * BEAT, bell(mtof(m), 2.6, v, ratio=2.0, I0=1.2, decay=0.9) * 0.05, pan=rng.uniform(-0.5, 0.5), send=0.7)
                add(MUS, t0 + b * BEAT, ep(mtof(m - 12), 1.6, v * 0.6) * 0.05, pan=0.0, send=0.4)
        else:  # outro: sparse sustained notes
            for (b, idx) in ((0, 3), (2, 1)):
                add(MUS, t0 + b * BEAT, bell(mtof(up[idx] + 12), 4.0, 0.5, ratio=2.0, I0=1.0, decay=1.6) * 0.05, pan=0.2 - 0.4 * idx / 4, send=0.8)

def kick(v):
    n = int(0.45 * SR); t = tt(n); f = 44 + 75 * np.exp(-t / 0.035)
    ph = TAU * np.cumsum(f) / SR; return np.sin(ph) * np.exp(-t / 0.22) * (1 - np.exp(-t / 0.001)) * v
HATN = np.diff(np.diff(rng.standard_normal(int(0.12 * SR) + 2)))
def hat(v, decay=0.028):
    t = tt(len(HATN)); return HATN / np.abs(HATN).max() * np.exp(-t / decay) * v
SHK = bandnoise(int(0.09 * SR), 5000, 12000, seed=3)
def shaker(v): t = tt(len(SHK)); return SHK * np.sin(np.pi * np.clip(t / 0.09, 0, 1)) ** 2 * v
def rim(v):
    n = int(0.08 * SR); t = tt(n); return (np.sin(TAU * 1700 * t) * 0.6 + bandnoise(n, 1500, 5000, seed=4) * 0.6) * np.exp(-t / 0.012) * v

def drums():
    for k in range(4, 58):
        s = section(k); t0 = bar_t(k)
        if s == 'day' or (s == 'wind' and k < 57):
            for b in (0, 2): add(MUS, t0 + b * BEAT, kick(0.9 if b == 0 else 0.75) * 0.38)
            for b in range(4): add(MUS, t0 + (b + 0.5) * BEAT, hat(0.5 + 0.2 * (b % 2)) * 0.05, pan=0.25)
            if k >= 8 and s == 'day':
                for i in range(16):
                    acc = 1.0 if i % 4 == 2 else 0.55
                    add(MUS, t0 + i * BEAT / 4 + rng.normal(0, 0.003), shaker(acc) * 0.012, pan=-0.3)
            if k % 2 == 1: add(MUS, t0 + 3 * BEAT, rim(0.6) * 0.06, pan=-0.15, send=0.3)
        elif s == 'night':
            add(MUS, t0, kick(0.85) * 0.34); add(MUS, t0 + 2.5 * BEAT, kick(0.6) * 0.3)
            for b in (1, 3): add(MUS, t0 + b * BEAT, rim(0.7) * 0.07, pan=-0.2, send=0.45)
            for b in (0.5, 1.5, 2.5, 3.5): add(MUS, t0 + b * BEAT, hat(0.45, 0.05) * 0.04, pan=0.3)
    # gentle cymbal swells into section changes
    for (k, v) in ((4, 0.7), (26, 1.0), (54, 0.6)):
        n = int(2.2 * SR); y = bandnoise(n, 3000, 14000) * (np.linspace(0, 1, n) ** 3)
        add(MUS, bar_t(k) - 2.2, y * 0.06 * v, send=0.4)

# ---------------------------------------------------------------- sound effects
def whoosh(dur, lo, hi, up=True, seed=None):
    n = int(dur * SR); t = tt(n) / dur; y = np.zeros(n)
    bands = np.geomspace(lo, hi, 5)
    for i in range(4):
        c = i / 3 if up else 1 - i / 3
        y += bandnoise(n, bands[i], bands[i + 1], seed=None if seed is None else seed + i) * np.exp(-((t - (0.25 + 0.5 * c)) / 0.28) ** 2)
    return y * np.sin(np.pi * np.clip(t, 0, 1)) ** 1.5

def click(v=1.0):
    n = int(0.05 * SR); t = tt(n)
    y = np.sin(TAU * 3100 * t) * np.exp(-t / 0.004) + 0.7 * np.sin(TAU * 1150 * t) * np.exp(-t / 0.012) + 0.25 * bandnoise(n, 2000, 9000, seed=8) * np.exp(-t / 0.003)
    return y * v

def sparkles(dur, count, density_end=True, lo=2600, hi=7500):
    n = int(dur * SR); y = np.zeros(n)
    for _ in range(count):
        u = rng.random() ** (0.5 if density_end else 2.0); i0 = int(u * (n - 2400))
        m = int(0.05 * SR); t = tt(m); f = rng.uniform(lo, hi)
        y[i0:i0 + m] += np.sin(TAU * f * t) * np.exp(-t / rng.uniform(0.01, 0.03)) * rng.uniform(0.4, 1.0)
    return y

def riser(t0, t1, pan0, pan1, chord):
    d = t1 - t0; n = int(d * SR); t = tt(n); u = t / d
    y = np.zeros(n)
    for m in chord[-3:]:
        f = mtof(m + 24) * 2 ** (-(1 - u) ** 2 * 1.0)  # glides up an octave into the landing
        y += np.sin(TAU * np.cumsum(f) / SR) * 0.3
    y = y * u ** 1.6 + sparkles(d, 22) * 0.5 * u + bandnoise(n, 3000, 11000) * 0.12 * u ** 2
    p = pan0 + (pan1 - pan0) * u * u * (3 - 2 * u)  # pan travels with the trail
    a = (np.clip(p, -1, 1) + 1) * np.pi / 4
    st = np.vstack([y * np.cos(a), y * np.sin(a)]) * np.sqrt(2)
    add(SFX, t0, st, gain=0.16, send=0.5)

def landing(ta, pan, chord, big=False):
    n = int(0.7 * SR); t = tt(n); f = 40 + 60 * np.exp(-t / 0.05)
    thump = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / (0.32 if big else 0.2))
    add(SFX, ta, thump, pan=0, gain=0.42 if big else 0.28)
    top = sorted(chord)[-1]
    for i, m in enumerate((top + 12, top + 19)):
        add(SFX, ta + i * 0.018, bell(mtof(m), 3.0, 0.6 - 0.2 * i, ratio=3.5, I0=2.0, decay=0.8), pan=pan * 0.7, gain=0.10, send=0.8)
    add(SFX, ta, bandnoise(int(0.3 * SR), 300, 4000) * np.exp(-tt(int(0.3 * SR)) / 0.06), pan=pan * 0.7, gain=0.08, send=0.4)

def spread(ta, dur, pan, kind, chord, idx):
    n = int((dur + 0.6) * SR); t = tt(n); u = np.clip(t / dur, 0, 1)
    env = np.clip(t / 0.15, 0, 1) * (1 - u) ** 1.2 + 0.0
    if kind == 'palette':  # paint wash: band moves up as the front travels, chord swell, sparkles on the rim
        y = np.zeros(n); bands = [(350, 900), (900, 2200), (2200, 5000), (5000, 9000)]
        for i, (lo, hi) in enumerate(bands): y += bandnoise(n, lo, hi) * np.exp(-((u - i / 3) / 0.35) ** 2)
        y = y * env * 0.11 + sparkles(dur + 0.6, 40, False) * env * 0.09
        sw = sum(wt(TAB_DAY, mtof(m + 12), n, rng.random()) for m in chord[1:4]) / 3 * np.sin(np.pi * u) ** 2 * 0.05
        add(SFX, ta, y + sw, pan=pan * 0.6, send=0.55)
    elif kind == 'floor':  # stone/wood sweep: lower, grainier, with a soft low chord
        y = bandnoise(n, 120, 1600) * env * 0.12 + bandnoise(n, 1600, 5000) * env * u * 0.05 + sparkles(dur + 0.6, 25, False, 1500, 4000) * env * 0.06
        sw = sum(wt(TAB_NIGHT, mtof(m), n, rng.random()) for m in chord[:3]) / 3 * np.sin(np.pi * u) ** 2 * 0.06
        add(SFX, ta, y + sw, pan=pan * 0.5, send=0.5)
    elif kind == 'slider':  # detent ticks + a tonal glide in the direction of travel
        direction = [1, 1, -1, 1, -1][idx]
        rate = 15; m_ = int(0.02 * SR); tk = tt(m_)
        for j in range(int(dur * rate)):
            f = 2100 + 500 * rng.random(); y = np.sin(TAU * f * tk) * np.exp(-tk / 0.003)
            add(SFX, ta + j / rate + rng.normal(0, 0.004), y, pan=pan * 0.6, gain=0.035)
        base = mtof(chord[-1] + 12); f = base * 2 ** (direction * 0.5 * u * u * (3 - 2 * u))
        g = np.sin(TAU * np.cumsum(f) / SR) * np.sin(np.pi * u) * 0.04
        add(SFX, ta, g, pan=pan * 0.6, send=0.5)
    else:  # light switches: power swell (or power-down), shimmering chord, reveal air
        down = kind == 'layers' and idx == 0
        sw = np.zeros(n)
        for i, m in enumerate(chord[1:5]):
            sw += wt(TAB_DAY, mtof(m + 12), n, rng.random()) * (1 - u if down else np.sin(np.pi * np.clip(u * 1.2, 0, 1)) ** 2) * 0.25
        air = whoosh(dur + 0.6, 400, 9000, up=not down)
        add(SFX, ta, sw * 0.12 + air * 0.07, pan=pan * 0.4, send=0.7)

def door_sound(t0, i):
    d = 1.1; n = int(d * SR); u = tt(n) / d
    y = bandnoise(n, 180, 1400) * np.sin(np.pi * np.clip(u * 1.1, 0, 1)) ** 1.2 * 0.5
    y += bandnoise(n, 1400, 4000) * np.sin(np.pi * np.clip(u * 1.1, 0, 1)) ** 3 * 0.12
    m = int(0.25 * SR); tk = tt(m); stop = np.sin(TAU * 95 * tk) * np.exp(-tk / 0.05) * 0.6
    add(SFX, t0, y, pan=[0.3, -0.2, 0.1, 0.4, -0.3, -0.2][i % 6], gain=0.11, send=0.35)
    add(SFX, t0 + d * 0.9, stop, gain=0.1, send=0.2)

def build_sfx():
    ev = cues['events']; slider_i = 0; layer_i = 0
    for i, (t, ta, end, kind, x) in enumerate(ev):
        prev_end = ev[i - 1][2] if i else -9
        nxt_t = ev[i + 1][0] if i + 1 < len(ev) else 1e9
        ch = chord_at(ta)
        if t >= prev_end + 0.85: add(SFX, t, whoosh(0.5, 1200, 9000, up=True), pan=0.62, gain=0.07, send=0.25)
        add(SFX, t + 1.0, click(), pan=0.62, gain=0.18, send=0.15)
        riser(t + 1.02, ta, 0.6, x, ch)
        landing(ta, x, ch, big=kind == 'mode')
        if kind == 'slider': spread(ta, end - ta, x, kind, ch, slider_i); slider_i += 1
        elif kind == 'layers': spread(ta, end - ta, x, kind, ch, layer_i); layer_i += 1
        else: spread(ta, end - ta, x, kind, ch, 0)
        if nxt_t > end + 0.85: add(SFX, end + 0.35, whoosh(0.5, 800, 6000, up=False), pan=0.62, gain=0.045, send=0.25)
        if kind == 'mode':  # the night drop: deep boom + long tail
            n = int(3.0 * SR); tk = tt(n); boom = np.sin(TAU * np.cumsum(32 + 30 * np.exp(-tk / 0.3)) / SR) * np.exp(-tk / 1.1)
            add(SFX, ta, boom, gain=0.2, send=0.3)
    for i, d in enumerate(cues['doors']): door_sound(d, i)
    for t0 in cues['titles']:
        top = sorted(chord_at(t0 + 0.3))[-2]
        add(SFX, t0 + 0.25, bell(mtof(top + 24), 2.5, 0.45, ratio=2.0, I0=0.8, decay=0.7), pan=-0.55, gain=0.07, send=0.85)
        add(SFX, t0 + 0.1, whoosh(0.7, 2500, 12000, up=True), pan=-0.55, gain=0.03, send=0.4)
    # intro: reverse swell into the title, then a soft cinematic hit with a chord shimmer
    n = int(1.0 * SR); sw = bandnoise(n, 400, 10000) * np.linspace(0, 1, n) ** 3
    add(SFX, 0.0, sw, gain=0.1, send=0.6)
    n = int(4.0 * SR); tk = tt(n); hit = np.sin(TAU * np.cumsum(36 + 40 * np.exp(-tk / 0.12)) / SR) * np.exp(-tk / 1.3)
    add(SFX, 0.95, hit, gain=0.28, send=0.3)
    for i, m in enumerate((74, 78, 81, 85)): add(SFX, 0.95 + i * 0.07, bell(mtof(m), 4.0, 0.5, ratio=2.0, I0=1.0, decay=1.2), pan=-0.4 + 0.27 * i, gain=0.09, send=0.9)
    add(SFX, 3.0, whoosh(0.9, 800, 8000, up=False), gain=0.05, send=0.5)
    # finale: scheme card swell + a soft tick for every row, then a closing low bloom
    fin = T - 6.2
    add(SFX, fin, whoosh(1.0, 600, 9000, up=True), pan=-0.5, gain=0.06, send=0.5)
    for i in range(6):
        add(SFX, fin + 0.35 + i * 0.14, bell(mtof([74, 76, 78, 81, 83, 86][i]), 2.5, 0.4, ratio=2.0, I0=0.8, decay=0.6), pan=-0.6, gain=0.06, send=0.7)
    n = int(3.0 * SR); tk = tt(n); add(SFX, T - 1.6, np.sin(TAU * 49 * tk) * np.sin(np.pi * np.clip(tk / 3.0, 0, 1)) * 0.5, gain=0.2, send=0.4)

# ---------------------------------------------------------------- reverb (stereo convolution, OLA)
def make_ir(sec=3.4):
    n = int(sec * SR); t = tt(n); ir = np.zeros((2, n))
    for ch in range(2):
        for (lo, hi, tau) in ((40, 350, 1.15), (350, 1800, 0.95), (1800, 6000, 0.62), (6000, 16000, 0.32)):
            ir[ch] += bandnoise(n, lo, hi, seed=100 + ch * 10 + int(lo)) * np.exp(-t / tau)
        ir[ch][:int(0.018 * SR)] = 0
    return ir / np.sqrt((ir ** 2).sum(axis=1, keepdims=True)) * 0.6

def convolve(x, h):
    B = 1 << 17; L = len(h); F = 1 << int(np.ceil(np.log2(B + L - 1))); H = np.fft.rfft(h, F)
    y = np.zeros(len(x) + L)
    for i in range(0, len(x), B):
        seg = np.fft.irfft(np.fft.rfft(x[i:i + B], F) * H, F)[:min(B, len(x) - i) + L - 1]
        y[i:i + len(seg)] += seg
    return y[:len(x)]

def eq(x, hp=30.0, shelf_hz=150.0, shelf_db=0.0, lp=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    g = 1 / np.sqrt(1 + (hp / np.maximum(f, 1e-3)) ** 8)            # 4th-order-ish high-pass
    g *= 10 ** (shelf_db / 20 * (1 / (1 + (f / shelf_hz) ** 2)))       # low shelf
    if lp: g *= 1 / np.sqrt(1 + (f / lp) ** 4)
    return np.fft.irfft(X * g, len(x))

def main():
    pads(); bass(); keys(); drums(); build_sfx()
    # duck the music a little under each landing so the effects read clearly
    duck = np.ones(N); tk = tt(int(1.6 * SR))
    shape = 1 - 0.38 * np.clip(tk / 0.06, 0, 1) * np.exp(-np.maximum(tk - 0.06, 0) / 0.6)
    for (_, ta, *_r) in cues['events']:
        i0 = int(ta * SR); n = min(len(shape), N - i0); duck[i0:i0 + n] = np.minimum(duck[i0:i0 + n], shape[:n])
    MUS[:] *= duck
    for ch in range(2):
        MUS[ch] = eq(MUS[ch], hp=32, shelf_hz=140, shelf_db=-5, lp=15000)
        SFX[ch] = eq(SFX[ch], hp=28, lp=17000)
    ir = make_ir()
    wet = np.vstack([convolve(SEND[0], ir[0]), convolve(SEND[1], ir[1])])
    mix = MUS * 1.0 + SFX * 1.0 + wet * 0.55
    # master fade-in/out with the picture, gentle bus compression via soft clip, then -1 dBFS peak
    fade = np.ones(N); fi = int(0.05 * SR); fade[:fi] = np.linspace(0, 1, fi)
    fo0 = int((T - 1.45) * SR); fade[fo0:] = np.linspace(1, 0, N - fo0) ** 1.4
    mix *= fade
    # level so the body of the mix sits high, then a 5 ms look-ahead peak limiter catches the transients
    mix /= np.percentile(np.abs(mix), 99.95) + 1e-9
    mix *= 0.78
    B = 240; nb = N // B + 1; pad = np.pad(np.abs(mix).max(axis=0), (0, nb * B - N))
    pk = pad.reshape(nb, B).max(axis=1); thr = 0.89
    g = np.minimum(1.0, thr / np.maximum(pk, 1e-9))
    g = np.minimum(g, np.concatenate([g[1:], [1.0]]))           # look ahead one block
    rel = np.exp(-B / SR / 0.12); gs = np.empty_like(g); cur = 1.0
    for i in range(nb):                                          # instant attack, 120 ms release
        cur = g[i] if g[i] < cur else g[i] + (cur - g[i]) * rel; gs[i] = cur
    gain = np.interp(np.arange(N), np.arange(nb) * B + B / 2, gs)
    mix *= gain
    rms = np.sqrt((mix ** 2).mean()); print('rms dBFS %.1f' % (20 * np.log10(rms)))
    mix *= 10 ** (-1 / 20) / np.abs(mix).max()
    pcm = (np.clip(mix, -1, 1) * 32767).astype('<i2').T.copy()
    with wave.open(os.path.join(HERE, 'showcase_mix.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('wrote showcase_mix.wav', N / SR, 's')

if __name__ == '__main__':
    main()
