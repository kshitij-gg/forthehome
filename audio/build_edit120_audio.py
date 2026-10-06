"""Soundtrack for the 120 s motion edit (volume II) - original, fully synthesised, cut to edit120.js.
120 BPM in D minor. Same palette as the 60 s edit, plus a shrine breakdown (56-67 s): tanpura with jivari,
temple bells, tabla building into the Diwali drop at 67 s. Night drop at 44 s; final impact at 114 s; bell to black.
Run:  python build_edit120_audio.py  ->  edit120_mix.wav
"""
import os, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000; T = 120.0; N = int(T * SR)
rng = np.random.default_rng(23)
TAU = 2 * np.pi
BPM = 120; BEAT = 60 / BPM; BAR = 4 * BEAT
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def tt(n): return np.arange(n, dtype=np.float64) / SR

MUS = np.zeros((2, N)); DRM = np.zeros((2, N)); SFX = np.zeros((2, N)); SEND = np.zeros((2, N))
def add(buf, start, sig, pan=0.0, gain=1.0, send=0.0):
    i0 = int(round(start * SR))
    if sig.ndim == 1:
        a = (np.clip(pan, -1, 1) + 1) * np.pi / 4; sig = np.vstack([sig * np.cos(a), sig * np.sin(a)]) * np.sqrt(2)
    s0 = max(0, -i0); i0 = max(0, i0); n = min(sig.shape[1] - s0, N - i0)
    if n <= 0: return
    buf[:, i0:i0 + n] += gain * sig[:, s0:s0 + n]
    if send: SEND[:, i0:i0 + n] += send * gain * sig[:, s0:s0 + n]

def bandnoise(n, lo, hi, seed=None):
    r = np.random.default_rng(seed) if seed is not None else rng
    X = np.fft.rfft(r.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR)
    g = np.clip((f - lo * 0.8) / (lo * 0.4 + 1), 0, 1) * np.clip((hi * 1.25 - f) / (hi * 0.5), 0, 1)
    y = np.fft.irfft(X * g, n); return y / (np.abs(y).max() + 1e-9)
def table(H, bright, kind='saw'):
    ph = np.arange(4096) / 4096; w = np.zeros(4096)
    for h in range(1, H + 1):
        if kind == 'sq' and h % 2 == 0: continue
        w += (1 / h) * np.exp(-(h - 1) / bright) * np.sin(TAU * h * ph)
    return w / np.abs(w).max()
SAW_B, SAW_D, SQ = table(40, 14), table(40, 2.2), table(9, 3, 'sq')
def wt(tab, f, n, ph0=0.0):
    ph = ((ph0 + f * tt(n)) % 1.0) * 4096; i = ph.astype(np.int64); fr = ph - i
    return tab[i] * (1 - fr) + tab[(i + 1) % 4096] * fr

# ---------------------------------------------------------------- harmony
CH = {'Dm': [50, 57, 62, 65, 69], 'Bb': [46, 53, 58, 62, 65], 'F': [41, 53, 57, 60, 65], 'C': [48, 55, 60, 64, 67]}
PROG = ['Dm', 'Bb', 'F', 'C']
def chord_at(t): return CH[PROG[int(t // BAR) % 4]]

# ---------------------------------------------------------------- instruments
def kick(v=1.0):
    n = int(0.42 * SR); t = tt(n); f = 46 + 130 * np.exp(-t / 0.028)
    y = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.2) + 0.25 * np.sin(TAU * np.cumsum(f * 2) / SR) * np.exp(-t / 0.02)
    click = bandnoise(n, 2000, 9000, seed=1) * np.exp(-t / 0.004) * 0.3
    return np.tanh((y + click) * 1.6) * v
def clap(v=1.0):
    n = int(0.35 * SR); t = tt(n); y = np.zeros(n); nz = bandnoise(n, 900, 6000, seed=2)
    for d in (0, 0.011, 0.023):
        i = int(d * SR); e = np.zeros(n); e[i:] = np.exp(-tt(n - i) / (0.012 if d < 0.02 else 0.12)); y += nz * e
    return y / np.abs(y).max() * v
HATN = np.diff(np.diff(rng.standard_normal(int(0.4 * SR) + 2)))
HATN /= np.abs(HATN).max()
def hat(v=1.0, decay=0.035): t = tt(len(HATN)); return HATN * np.exp(-t / decay) * v
def snare(v=1.0):
    n = int(0.25 * SR); t = tt(n)
    return (bandnoise(n, 1500, 9000, seed=5) * np.exp(-t / 0.07) + 0.6 * np.sin(TAU * 190 * t) * np.exp(-t / 0.05)) * v
def boom(v=1.0, dur=2.5, f0=34):
    n = int(dur * SR); t = tt(n); f = f0 + 90 * np.exp(-t / 0.06)
    y = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / (dur / 3)) + bandnoise(n, 60, 900) * np.exp(-t / 0.3) * 0.5
    return np.tanh(y * 1.4) * v
def whoosh(dur, lo, hi, up=True, seed=None):
    n = int(dur * SR); u = tt(n) / dur; y = np.zeros(n); bands = np.geomspace(lo, hi, 5)
    for i in range(4):
        c = i / 3 if up else 1 - i / 3
        y += bandnoise(n, bands[i], bands[i + 1], seed=None if seed is None else seed + i) * np.exp(-((u - (0.25 + 0.5 * c)) / 0.28) ** 2)
    return y * np.sin(np.pi * np.clip(u, 0, 1)) ** 1.3
def sparkle_burst(dur):
    n = int(dur * SR); y = np.zeros(n)
    for _ in range(60):
        i0 = int((rng.random() ** 2) * (n - 3000)); m = int(0.05 * SR); t = tt(m)
        y[i0:i0 + m] += np.sin(TAU * rng.uniform(2500, 8000) * t) * np.exp(-t / rng.uniform(0.01, 0.03)) * rng.uniform(0.3, 1.0)
    return y
def riser(dur, f0=200, f1=2400, noise=0.6):
    n = int(dur * SR); u = tt(n) / dur; f = f0 * (f1 / f0) ** (u ** 1.6)
    y = wt(SAW_B, 1, n) * 0  # placeholder for shape
    ph = np.cumsum(f) / SR; y = np.sin(TAU * ph) * 0.4 + np.sin(TAU * ph * 1.5) * 0.2
    y += bandnoise(n, 800, 12000) * noise * u
    return y * u ** 2
def stab(notes, dur, bright=1.0, v=1.0):
    n = int(dur * SR); t = tt(n); y = np.zeros((2, n))
    for m in notes:
        for d, p in ((-12, -0.8), (-4, -0.3), (4, 0.3), (12, 0.8)):
            s = wt(SAW_B if bright > 0.5 else SAW_D, mtof(m + 12) * 2 ** (d / 1200), n, rng.random())
            a = (p + 1) * np.pi / 4; y[0] += s * np.cos(a); y[1] += s * np.sin(a)
    env = (1 - np.exp(-t / 0.004)) * np.exp(-t / (dur * 0.35))
    return y * env / (len(notes) * 4) * v * 2.2
def pluck(m, dur=0.35, v=1.0):
    n = int(dur * SR); t = tt(n); I = 3 * np.exp(-t / 0.05)
    return np.sin(TAU * mtof(m) * t + I * np.sin(TAU * mtof(m) * 2 * t)) * np.exp(-t / 0.12) * v

# ---------------------------------------------------------------- arrangement
def supersaws(t0, t1, bright_fn=None, gate=None):
    """sustained supersaw chords bar by bar between t0 and t1 (sidechained later)"""
    t = t0
    while t < t1 - 1e-6:
        bar_end = min(t1, (np.floor(t / BAR) + 1) * BAR); dur = bar_end - t; n = int(dur * SR)
        notes = chord_at(t)[1:]; y = np.zeros((2, n)); u0 = t
        for m in notes:
            for d, p in ((-18, -0.9), (-9, -0.45), (0, 0), (9, 0.45), (18, 0.9)):
                f = mtof(m) * 2 ** (d / 1200); ph = rng.random()
                b = wt(SAW_B, f, n, ph); dk = wt(SAW_D, f, n, ph)
                k = bright_fn(u0 + tt(n)) if bright_fn else 1.0
                s = dk + (b - dk) * k; a = (p + 1) * np.pi / 4; y[0] += s * np.cos(a); y[1] += s * np.sin(a)
        e = np.clip(tt(n) / 0.01, 0, 1) * np.clip((dur - tt(n)) / 0.02, 0, 1)
        if gate is not None: e = e * gate(u0 + tt(n))
        add(MUS, t, y * e / 20 * 0.55, send=0.35)
        t = bar_end
def bassline(t0, t1, pattern='8ths'):
    t = t0
    while t < t1 - 1e-6:
        root = chord_at(t)[0]; root = root - 12 if root > 40 else root
        step = BEAT / 2 if pattern == '8ths' else BEAT
        n = int(step * 0.92 * SR); tk = tt(n)
        y = wt(SQ, mtof(root), n) * 0.6 + np.sin(TAU * mtof(root - 12) * tk) * 0.8
        y *= np.clip(tk / 0.004, 0, 1) * np.exp(-tk / 0.22) * np.clip((n / SR - tk) / 0.01, 0, 1)
        add(MUS, t, y * 0.2)
        t += step
def groove(t0, t1, claps=True, hats=True, kicks=True, ghost=False):
    t = np.ceil(t0 / BEAT - 1e-6) * BEAT; kt = []
    while t < t1 - 1e-6:
        b = int(round(t / BEAT)) % 4
        if kicks: add(DRM, t, kick(0.95)); kt.append(t)
        if claps and b in (1, 3): add(DRM, t, clap(0.55), pan=0.05, send=0.25)
        if hats: add(DRM, t + BEAT / 2, hat(0.35, 0.06), pan=0.25); add(DRM, t + BEAT / 4, hat(0.14), pan=-0.2); add(DRM, t + 3 * BEAT / 4, hat(0.14), pan=-0.2)
        if ghost and b == 3: add(DRM, t + BEAT * 0.75, snare(0.25), pan=-0.1)
        t += BEAT
    return kt
def roll(t0, t1, v0=0.2, v1=0.8):
    t = t0; i = 0
    while t < t1 - 1e-6:
        k = (t - t0) / (t1 - t0); step = BEAT / 4 if k < 0.5 else BEAT / 8
        add(DRM, t, snare(v0 + (v1 - v0) * k), pan=rng.uniform(-0.2, 0.2), send=0.2); t += step; i += 1


# ---------------------------------------------------------------- shrine instruments
def tanpura(m, dur=3.2, v=1.0, seed=0):
    """plucked drone string with a jivari buzz: a resonance that sweeps up the harmonic series as the note rings"""
    n = int(dur * SR); t = tt(n); f0 = mtof(m); y = np.zeros(n); r = np.random.default_rng(seed)
    c = 3 + 16 * (1 - np.exp(-t / 0.9))
    for h in range(1, 34):
        if f0 * h > 14000: break
        a = h ** -0.85 * (0.35 + 1.6 * np.exp(-((h - c) / 2.6) ** 2))
        y += a * np.sin(TAU * f0 * h * (1 + 0.0004 * h) * t + r.random() * TAU)
    env = (1 - np.exp(-t / 0.006)) * np.exp(-t / 1.7) * np.clip((dur - t) / 0.25, 0, 1)
    return y * env / 6 * v
def bell(f0, dur=4.0, v=1.0, seed=0):
    """temple bell: inharmonic partials with their own decays, slight beating"""
    n = int(dur * SR); t = tt(n); y = np.zeros(n); r = np.random.default_rng(seed)
    for ratio, amp, dec in ((0.5, 0.5, 2.6), (1.0, 1.0, 2.0), (1.183, 0.6, 1.4), (1.506, 0.55, 1.1), (2.0, 0.45, 0.9), (2.514, 0.35, 0.6), (2.662, 0.3, 0.5), (3.011, 0.25, 0.4), (4.166, 0.18, 0.25), (5.43, 0.1, 0.15)):
        f = f0 * ratio
        y += amp * np.sin(TAU * f * t + r.random() * TAU) * (1 + 0.25 * np.sin(TAU * 1.7 * ratio * t)) * np.exp(-t / dec)
    strike = bandnoise(n, 2000, 12000, seed=seed + 7) * np.exp(-t / 0.004) * 0.4
    return (y / 3 + strike) * np.clip(t / 0.0015, 0, 1) * v
def tabla(kind='na', v=1.0):
    n = int(0.5 * SR); t = tt(n)
    if kind == 'dha':  # bayan bend + dayan ring
        f = 85 + 60 * np.exp(-t / 0.06)
        y = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.25) + 0.5 * np.sin(TAU * 520 * t) * np.exp(-t / 0.12)
    elif kind == 'tin':
        y = np.sin(TAU * 610 * t) * np.exp(-t / 0.05) * 0.8
    else:  # na: bright ring
        y = (np.sin(TAU * 520 * t) + 0.5 * np.sin(TAU * 1310 * t) + 0.3 * np.sin(TAU * 2080 * t)) * np.exp(-t / 0.09)
    y += bandnoise(n, 1500, 8000, seed=11) * np.exp(-t / 0.006) * 0.4
    return y * v * 0.6
def shrine_pad(t0, t1, v=1.0, bright=0.25):
    n = int((t1 - t0) * SR); t = tt(n); y = np.zeros((2, n))
    for m in (50, 57, 62, 64, 69):
        for d, p in ((-7, -0.7), (0, 0), (7, 0.7)):
            s = wt(SAW_D, mtof(m) * 2 ** (d / 1200), n, rng.random()) * (1 - bright) + wt(SAW_B, mtof(m) * 2 ** (d / 1200), n, rng.random()) * bright
            a = (p + 1) * np.pi / 4; y[0] += s * np.cos(a); y[1] += s * np.sin(a)
    e = np.clip(t / 1.2, 0, 1) * np.clip((t1 - t0 - t) / 1.0, 0, 1)
    add(MUS, t0, y * e / 15 * 0.5 * v, send=0.6)

def main():
    kicks = []
    def impact(t, v=0.5, crash=True):
        add(SFX, t, boom(0.9, 2.0), gain=v, send=0.3)
        if crash: add(SFX, t, bandnoise(int(2.2 * SR), 3000, 15000) * np.exp(-tt(int(2.2 * SR)) / 0.7), gain=0.15, send=0.5)
    def suck(z):
        m = int(0.3 * SR); add(SFX, z - 0.3, whoosh(0.3, 500, 12000, up=True) * np.linspace(0, 1, m) ** 2, gain=0.32, send=0.2)
    def wind(t0, dur):
        n = int(dur * SR); tk = tt(n); u = tk / dur
        sp = 0.75 + 0.3 * np.cos(TAU * dur * 2 * u) ** 2 + 0.35 * np.sin(np.pi * u)
        w = bandnoise(n, 250, 2500) * 0.7 + bandnoise(n, 2500, 9000) * 0.3
        add(SFX, t0, np.vstack([w * sp, np.roll(w, 300) * sp]) * np.clip(tk / 0.08, 0, 1) * np.clip((dur - tk) / 0.15, 0, 1), gain=0.16, send=0.15)
    def stabs(times, offs, bright=1.0, v=0.4):
        for i, t in enumerate(times):
            add(SFX, t, stab([chord_at(t)[2] + offs[i % len(offs)], chord_at(t)[3]], 0.45, bright, 0.9), gain=v, send=0.4)
            m = int(0.25 * SR); add(SFX, t, bandnoise(m, 4000, 14000) * np.exp(-tt(m) / 0.05), gain=0.07, pan=0.5)
    def knocks(times):
        for i, t in enumerate(times):
            m = int(0.22 * SR); tk = tt(m)
            add(SFX, t, np.sin(TAU * (90 + 8 * (i % 12)) * tk) * np.exp(-tk / 0.07), gain=0.45)
            add(SFX, t, bandnoise(m, 1500, 7000) * np.exp(-tk / 0.012), pan=0.4 if i % 2 else -0.4, gain=0.16)
    def swishes(t0, n, step):
        for i in range(n): add(SFX, t0 + i * step, whoosh(0.3, 600, 9000, up=i % 2 == 0), pan=-0.8 + i * (1.6 / max(1, n - 1)), gain=0.16)
    def tanpura_cycle(t0, t1, v=0.5):
        seq = [(57, -0.3), (62, 0.2), (62, 0.35), (50, -0.1)]; t = t0; i = 0
        while t < t1 - 0.3:
            m, p = seq[i % 4]; add(MUS, t, tanpura(m, min(3.2, t1 - t + 0.5), v, seed=i), pan=p, send=0.45); t += 0.75; i += 1

    # INTRO 0–4: drone, letter slams, second title phrase, riser into the plan
    n = int(3.92 * SR); tk = tt(n); dr = (np.sin(TAU * mtof(38) * tk) * 0.6 + wt(SAW_D, mtof(50), n) * 0.25) * np.clip(tk / 0.6, 0, 1)
    add(MUS, 0.0, dr * 0.25, send=0.3); add(SFX, 0.1, riser(2.3, 150, 3000, 0.7), gain=0.2, send=0.4)
    add(SFX, 0.0, bell(587.3, 4.0, 0.5, seed=3), gain=0.12, pan=0.3, send=0.6)
    for i in range(9):
        lt = 0.4 + i * 0.17; m = int(0.35 * SR); t = tt(m); thud = np.sin(TAU * np.cumsum(60 + 120 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.12)
        add(SFX, lt, thud, gain=0.35); add(SFX, lt, bandnoise(m, 2000, 10000) * np.exp(-t / 0.01), pan=(i - 4) / 5, gain=0.12)
        add(SFX, lt, pluck(62 + [0, 3, 7, 10, 12, 15, 17, 19, 24][i], 0.4, 0.5), pan=(i - 4) / 5, gain=0.1, send=0.5)
    for i in range(6): add(SFX, 2.55 + i * 0.25, pluck(74 + [0, 3, 7, 5, 10, 12][i], 0.3, 0.5), pan=(i - 2.5) / 3, gain=0.09, send=0.6)
    add(SFX, 2.55, whoosh(0.5, 300, 8000, up=True), gain=0.2, send=0.3)
    add(SFX, 3.0, riser(1.0, 200, 5000, 0.8), gain=0.22, send=0.3); roll(3.0, 3.95, 0.12, 0.8)
    # PLAN 4–10: half-time bed, restyle at 7.5 then a hit on every beat, riser into the first flight
    supersaws(4.0, 10.0, bright_fn=lambda t: 0.25 + 0.75 * np.clip((t - 4) / 6, 0, 1))
    for t in np.arange(4.0, 9.0, 1.0): add(DRM, t, kick(0.8)); kicks.append(t)
    for t in np.arange(5.0, 9.0, 2.0): add(DRM, t, clap(0.4), send=0.4)
    add(SFX, 7.5, boom(1.0, 2.5, 30), gain=0.5, send=0.4); add(SFX, 7.5, stab(CH['F'][1:] + [72], 1.0, 1.0, 1.1), gain=0.42, send=0.8)
    add(SFX, 7.5, sparkle_burst(1.5), gain=0.14, send=0.6); stabs([8.0, 8.5, 9.0], [3, 5, 7], v=0.3)
    add(SFX, 8.9, riser(1.1, 200, 5000, 0.8), gain=0.24, send=0.3); roll(9.0, 9.95, 0.15, 0.85)

    # MAIN GROOVE blocks (gaps: light breakdown 42–44, mandir 56–67, finale build 112.5–114)
    blocks = ((10, 42), (44, 56), (67.5, 84), (84, 90), (90, 104), (104, 112.5))
    for a_, b_ in blocks:
        kicks += groove(a_, b_, ghost=True, hats=not (84 <= a_ < 90))
        supersaws(a_, b_, gate=(lambda t: np.where((t >= 48) & (t < 50.5), 0.55 + 0.45 * (np.floor((t - 48) / (BEAT / 4)) % 2 == 0), 1.0)) if a_ == 44 else None)
        bassline(a_, b_)
    for t in (4, 10, 14, 24, 28, 36, 42, 70, 76, 80, 84, 90, 94, 100, 106): impact(t, 0.45)
    for z in (4, 10, 14, 24, 28, 36, 42, 44, 56, 67, 70, 76, 80, 84, 90, 94, 100, 106, 114): suck(z)
    for a_ in (10, 24, 52, 90): wind(a_, 4)
    # STYLES 14–24: a stab per style flip, grid build, the "ten styles" hit
    stabs([15.0 + i * 0.5 for i in range(9)], [0, 2, 3, 5, 7, 10, 7, 5, 12])
    swishes(19.5, 6, 0.06); add(SFX, 19.5, whoosh(0.6, 300, 8000, up=True), gain=0.2, send=0.3)
    roll(21.3, 22.45, 0.1, 0.7); add(SFX, 22.5, stab(CH['F'][1:] + [72], 0.9, 1, 1), gain=0.38, send=0.6); add(SFX, 22.5, boom(0.7, 1.5, 34), gain=0.35, send=0.3)
    # COLOUR 28–36: plucked palette cascade + carousel swishes
    for i in range(10): t = 28.5 + i * 0.5; add(SFX, t, pluck(chord_at(t)[2] + 12 + [0, 3, 7, 10, 12, 7, 3, 10, 14, 12][i], 0.5, 0.8), pan=(i % 2) * 0.6 - 0.3, gain=0.16, send=0.6)
    stabs([29.0, 31.0, 33.0], [0, 5, 7], bright=0.6, v=0.25)
    swishes(33.5, 6, 0.08); add(SFX, 35.8, whoosh(0.5, 400, 8000, up=False), gain=0.2)
    # FLOOR 36–42: a knock per tile, slice slams
    knocks([36.5 + i * 0.25 for i in range(12)]); swishes(39.5, 4, 0.08)
    add(SFX, 40.2, whoosh(0.4, 400, 9000, up=True), pan=-0.6, gain=0.22); add(SFX, 41.0, whoosh(0.4, 400, 9000, up=False), pan=0.6, gain=0.22)
    # LIGHT 42–52: breakdown + sun lapse, night drop at 44, scene stabs, colour-wheel sweep, kelvin laser
    supersaws(42.0, 43.95, bright_fn=lambda t: np.clip((t - 42) / 1.95, 0, 1) ** 2)
    add(SFX, 42.0, riser(2.0, 120, 5000, 0.9), gain=0.24, send=0.4); roll(43.0, 43.95, 0.15, 0.9)
    add(SFX, 44.0, boom(1.0, 3.0, 30), gain=0.6, send=0.3); add(SFX, 44.0, bandnoise(int(3 * SR), 3000, 15000) * np.exp(-tt(int(3 * SR)) / 1.0), gain=0.2, send=0.5)
    for i in range(8):
        t = 44.0 + i * 0.5
        add(SFX, t, stab([chord_at(t)[2] + [0, 3, 5, 7, 10, 7, 5, 12][i], chord_at(t)[4]], 0.45, [0.2, 1, 0.6, 1, 0.4, 0.2, 0.8, 1][i], 1.0), gain=0.36, send=0.5)
        m = int(0.2 * SR); tk = tt(m); add(SFX, t, np.sin(TAU * np.cumsum(70 + 80 * np.exp(-tk / 0.02)) / SR) * np.exp(-tk / 0.08), gain=0.26)
    n = int(2.5 * SR); u = tt(n) / 2.5; f = 260 * 2 ** (2.5 * u)  # hue sweep: rising glassy tone
    add(SFX, 48.0, (np.sin(TAU * np.cumsum(f) / SR) * 0.4 + np.sin(TAU * np.cumsum(f * 1.5) / SR) * 0.25 + np.sin(TAU * np.cumsum(f * 2.01) / SR) * 0.15) * np.sin(np.pi * u) ** 0.7, gain=0.11, send=0.6)
    n = int(1.5 * SR); u = tt(n) / 1.5; f = 300 * 2 ** (3 * np.sin(np.pi * u))
    add(SFX, 50.5, (np.sin(TAU * np.cumsum(f) / SR) * 0.5 + np.sin(TAU * np.cumsum(f * 1.5) / SR) * 0.3) * np.sin(np.pi * u), gain=0.12, send=0.4)
    stabs([52 + i * 0.5 for i in range(8)], [0, 3, 7, 5, 10, 7, 3, 12], bright=0.6, v=0.22)  # night-scene flight
    roll(55.0, 55.95, 0.1, 0.6)

    # MANDIR 56–67: the breakdown. tanpura, shrine pad, bells, tabla building to the Diwali drop at 67
    add(SFX, 56.0, boom(0.8, 3.0, 28), gain=0.4, send=0.5)
    add(SFX, 56.0, bell(293.7, 6.0, 1.0, seed=21), gain=0.34, pan=-0.15, send=0.7)
    tanpura_cycle(56.0, 70.0, 0.55)
    shrine_pad(56.0, 67.6, 1.0, 0.15)
    add(SFX, 59.0, bell(587.3, 4.0, 0.8, seed=22), gain=0.2, pan=0.3, send=0.7)
    for i, t in enumerate((61.0, 61.75, 62.5, 63.25)):  # iconography close-ups
        add(SFX, t, bell([880.0, 783.99, 1046.5, 698.46][i], 2.0, 0.6, seed=30 + i), gain=0.12, pan=[-0.5, 0.5, -0.2, 0.3][i], send=0.7)
        add(SFX, t - 0.12, whoosh(0.25, 800, 9000, up=True), gain=0.1, pan=[-0.5, 0.5, -0.2, 0.3][i])
    for i, t in enumerate((64.0, 64.667, 65.333)): add(SFX, t - 0.1, whoosh(0.22, 700, 8000, up=i % 2 == 0), gain=0.1)
    for j in range(6): add(SFX, 65.333 + j * 0.11, bell(1174.7, 1.2, 0.7 - j * 0.08, seed=40 + j), gain=0.1, pan=0.4, send=0.6)  # hand-bell ring on the bells shot
    # tabla from the crane-up: sparse, then 8ths, then a tihai into 67
    tb = [(59.0, 'dha'), (59.75, 'na'), (60.0, 'dha'), (60.5, 'tin'), (60.75, 'na')]
    for b in range(61 * 4, 66 * 4):
        t = b / 4.0; k = b % 8
        tb.append((t, 'dha' if k in (0, 5) else 'na' if k in (2, 3, 6) else 'tin'))
    for t in (66.0, 66.125, 66.25, 66.375, 66.5, 66.625, 66.75, 66.875): tb.append((t, 'na' if t < 66.75 else 'dha'))
    for t, kd in tb:
        vv = 0.5 + 0.5 * np.clip((t - 59) / 7.5, 0, 1)
        add(DRM, t, tabla(kd, vv), pan=-0.15 if kd == 'dha' else 0.2, send=0.25)
    add(SFX, 65.6, riser(1.4, 200, 6000, 0.7), gain=0.2, send=0.4)
    # DIWALI 67: drop back in (the groove resumes at 67.5)
    add(SFX, 67.0, boom(1.0, 3.0, 30), gain=0.55, send=0.4); add(SFX, 67.0, bell(293.7, 5.0, 1.0, seed=50), gain=0.3, send=0.7)
    add(SFX, 67.0, stab(CH['Dm'][1:] + [74], 1.4, 1.0, 1.1), gain=0.38, send=0.8); add(SFX, 67.0, sparkle_burst(2.0), gain=0.16, send=0.6)
    add(DRM, 67.0, kick(1.0)); kicks.append(67.0)
    for t in (68.0, 69.0): add(SFX, t, bell(587.3, 2.5, 0.7, seed=int(t)), gain=0.13, pan=0.35, send=0.6)
    # BEFORE / AFTER 70–76 (phase change at 73), AERIAL 76–80, BEDROOMS 80–84
    add(SFX, 72.0, riser(1.0, 300, 4000), gain=0.18, send=0.3); impact(73.0, 0.4)
    stabs([76.5 + i * 0.5 for i in range(7)], [0, 3, 5, 7, 10, 7, 12], v=0.32)
    stabs([80.5, 81.0, 81.5], [0, 5, 3]); knocks([82.5, 83.0, 83.5]); add(SFX, 82.0, whoosh(0.5, 300, 6000, up=True), gain=0.2)
    # NIGHT GRID 84–90: hats out, wheel shimmer, zoom at 88.3
    n = int(4.5 * SR); tk = tt(n)
    add(SFX, 84.0, sum(np.sin(TAU * mtof(74 + d) * tk + i) for i, d in enumerate((0, 7, 12, 15, 19))) * np.exp(-((tk - 2.2) / 1.6) ** 2) * (0.6 + 0.4 * np.sin(TAU * 6 * tk)), gain=0.035, send=0.8)
    add(SFX, 87.3, riser(1.0, 300, 5000), gain=0.18, send=0.3); add(SFX, 88.3, whoosh(0.5, 400, 9000, up=True), gain=0.22)
    add(SFX, 88.6, bell(587.3, 2.5, 0.7, seed=60), gain=0.12, send=0.6)
    # FLIGHT D 90–94 to the mandir (bells on each bar), ROOMS 94–100
    for t in (90, 92): add(SFX, t, bell(587.3, 2.0, 0.6, seed=70 + t), gain=0.1, pan=0.4, send=0.6)
    stabs([90 + i * 0.5 for i in range(8)], [0, 3, 7, 5, 10, 7, 3, 12], bright=0.6, v=0.2)
    for t in (95.5, 97.5, 99.5): add(SFX, t, whoosh(0.5, 300, 8000, up=False), gain=0.18)
    # MACRO 100–106: a slam per material, roll + riser into the finale
    for i in range(6): t = 100 + i; add(SFX, t + 0.0, whoosh(0.3, 500, 9000, up=i % 2 == 0), gain=0.2, pan=0.6 if i % 2 else -0.6); add(SFX, t, pluck(chord_at(t)[2] + 12, 0.6, 0.8), gain=0.12, send=0.6)
    roll(104.5, 105.95, 0.12, 0.9); add(SFX, 104.6, riser(1.4, 250, 6000), gain=0.22, send=0.3)
    # FINALE 106–114
    for c in [106.25 + i * 0.25 for i in range(15)]: add(SFX, c - 0.06, whoosh(0.2, 600, 9000, up=True), pan=rng.uniform(-0.6, 0.6), gain=0.18)
    add(SFX, 108.0, stab(CH['F'][1:] + [72], 0.6, 1, 1), gain=0.3, send=0.5)
    add(SFX, 110.0, boom(0.8, 2.0, 32), gain=0.4, send=0.4)
    supersaws(112.5, 113.95, bright_fn=lambda t: np.clip((t - 112.5) / 1.45, 0, 1))
    roll(112.5, 113.95, 0.15, 0.95); add(SFX, 112.5, riser(1.45, 250, 6000), gain=0.22, send=0.3); add(SFX, 113.42, whoosh(0.6, 300, 10000, up=True), gain=0.35, send=0.3)
    # END 114–120: final impact, counters tick, temple bell to black
    add(SFX, 114.0, boom(1.2, 2.5, 28), gain=0.7, send=0.4); add(SFX, 114.0, stab(CH['Dm'][1:] + [74], 2.4, 1.0, 1.2), gain=0.45, send=0.9)
    add(SFX, 114.0, bandnoise(int(2 * SR), 2500, 15000) * np.exp(-tt(int(2 * SR)) / 0.7), gain=0.22, send=0.6)
    shrine_pad(114.0, 120.0, 0.8, 0.3); tanpura_cycle(115.0, 120.0, 0.4)
    for j in range(6): add(SFX, 115.1 + j * 0.12, pluck(74 + [0, 3, 7, 10, 12, 15][j], 0.5, 0.6), pan=(j - 2.5) / 3, gain=0.12, send=0.6)
    add(SFX, 117.0, bell(293.7, 3.0, 0.9, seed=90), gain=0.25, send=0.8)
    for i in range(4): add(SFX, 118.6 + i * 0.12, bandnoise(int(0.06 * SR), 1500, 9000) * np.exp(-tt(int(0.06 * SR)) / 0.01), pan=rng.uniform(-0.7, 0.7), gain=0.1)

    # sidechain the music bus on every kick
    sc = np.ones(N); tk = tt(int(0.3 * SR)); shape = 1 - 0.65 * np.exp(-tk / 0.09)
    for kt in kicks:
        i0 = int(kt * SR); n = min(len(shape), N - i0)
        if n > 0: sc[i0:i0 + n] = np.minimum(sc[i0:i0 + n], shape[:n])
    MUS[:] *= sc
    # reverb
    ir_n = int(2.4 * SR); t = tt(ir_n); ir = np.zeros((2, ir_n))
    for ch in range(2):
        for lo, hi, tau in ((60, 500, 0.8), (500, 3000, 0.6), (3000, 14000, 0.3)): ir[ch] += bandnoise(ir_n, lo, hi, seed=40 + ch + int(lo)) * np.exp(-t / tau)
    ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True)); ir *= 0.6
    def conv(x, h):
        F = 1 << int(np.ceil(np.log2(len(x) + len(h)))); return np.fft.irfft(np.fft.rfft(x, F) * np.fft.rfft(h, F), F)[:len(x)]
    wet = np.vstack([conv(SEND[0], ir[0]), conv(SEND[1], ir[1])])
    mix = MUS * 0.9 + DRM * 1.0 + SFX * 1.0 + wet * 0.5
    for ch in range(2):
        X = np.fft.rfft(mix[ch]); f = np.fft.rfftfreq(N, 1 / SR); mix[ch] = np.fft.irfft(X / np.sqrt(1 + (28 / np.maximum(f, 1e-3)) ** 8), N)
    fo = int(119.0 * SR); mix[:, fo:] *= np.linspace(1, 0, N - fo) ** 1.5
    mix /= np.percentile(np.abs(mix), 99.9) + 1e-9; mix *= 0.8
    B = 240; nb = N // B + 1; pk = np.pad(np.abs(mix).max(axis=0), (0, nb * B - N)).reshape(nb, B).max(axis=1)
    g = np.minimum(1.0, 0.9 / np.maximum(pk, 1e-9)); g = np.minimum(g, np.concatenate([g[1:], [1.0]]))
    rel = np.exp(-B / SR / 0.08); gs = np.empty_like(g); cur = 1.0
    for i in range(nb): cur = g[i] if g[i] < cur else g[i] + (cur - g[i]) * rel; gs[i] = cur
    mix *= np.interp(np.arange(N), np.arange(nb) * B + B / 2, gs)
    pcm = (np.clip(mix, -1, 1) * 32767).astype('<i2').T.copy()
    with wave.open(os.path.join(HERE, 'edit120_mix.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('wrote edit120_mix.wav')

if __name__ == '__main__':
    main()
