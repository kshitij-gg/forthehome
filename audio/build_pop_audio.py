"""Funk-pop soundtrack + cartoon foley for the 60 s POP-ART edit (fully synthesised, licence-free).
120 BPM, F major: Fmaj7 | Dm7 | Gm7 | C7 (one chord per 2 s bar). Slap bass, clav skank, brass stabs,
kalimba, a formant 'vocal chop' hook, four-on-the-floor with claps/cowbell/shaker. Foley follows the
picture: bubble pops, boings, splats, scratches, slide whistles, shutters, coin dings, tile clacks.
Run:  python build_pop_audio.py  ->  pop_mix.wav
"""
import os, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000; T = 60.0; N = int(T * SR); TAU = 2 * np.pi
rng = np.random.default_rng(77)
BEAT = 0.5; BAR = 2.0
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
def table(H, bright, odd=False):
    ph = np.arange(4096) / 4096; w = np.zeros(4096)
    for h in range(1, H + 1):
        if odd and h % 2 == 0: continue
        w += (1 / h) * np.exp(-(h - 1) / bright) * np.sin(TAU * h * ph)
    return w / np.abs(w).max()
SAW_B, SAW_D, SQ = table(36, 12), table(36, 2.0), table(15, 5, True)
def wt(tab, f, n, ph0=0.0):
    ph = ((ph0 + np.cumsum(np.broadcast_to(f, (n,))) / SR) % 1.0) * 4096; i = ph.astype(np.int64); fr = ph - i
    return tab[i] * (1 - fr) + tab[(i + 1) % 4096] * fr

CH = [[53, 57, 60, 64], [50, 53, 57, 60], [55, 58, 62, 65], [48, 52, 55, 58]]  # Fmaj7 Dm7 Gm7 C7
ROOT = [41, 38, 43, 36]
def bar_of(t): return int(t // BAR) % 4

# ---------------------------------------------------------------- instruments
def kick(v=1.0):
    n = int(0.3 * SR); t = tt(n); f = 52 + 120 * np.exp(-t / 0.022)
    y = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.15) + bandnoise(n, 2500, 9000, seed=1) * np.exp(-t / 0.003) * 0.35
    return np.tanh(y * 1.7) * v
def clap(v=1.0):
    n = int(0.3 * SR); t = tt(n); y = np.zeros(n); nz = bandnoise(n, 1000, 7000, seed=2)
    for d in (0, 0.009, 0.019):
        i = int(d * SR); e = np.zeros(n); e[i:] = np.exp(-tt(n - i) / (0.01 if d < 0.015 else 0.09)); y += nz * e
    return y / np.abs(y).max() * v
HATN = np.diff(np.diff(rng.standard_normal(int(0.35 * SR) + 2))); HATN /= np.abs(HATN).max()
def hat(v=1.0, decay=0.03): t = tt(len(HATN)); return HATN * np.exp(-t / decay) * v
def shaker(v=1.0): n = int(0.08 * SR); t = tt(n); return bandnoise(n, 5000, 13000, seed=3) * np.sin(np.pi * t / 0.08) ** 2 * v
def cowbell(v=1.0):
    n = int(0.3 * SR); t = tt(n); y = wt(SQ, 587, n) + wt(SQ, 845, n)
    return y * np.exp(-t / 0.09) * 0.5 * v
def tamb(v=1.0): n = int(0.15 * SR); t = tt(n); return bandnoise(n, 6000, 15000, seed=4) * np.exp(-t / 0.05) * v
def slap(m, dur=0.3, v=1.0, pop=False):
    n = int(dur * SR); t = tt(n); f = mtof(m); I = (6 if pop else 3.2) * np.exp(-t / (0.02 if pop else 0.04))
    y = np.sin(TAU * f * t + I * np.sin(TAU * f * t)) * 0.7 + np.sin(TAU * f * t) * 0.6
    return np.tanh(y * 1.4) * np.clip(t / 0.003, 0, 1) * np.exp(-t / (0.12 if pop else 0.22)) * v
def clav(m, v=1.0):
    n = int(0.22 * SR); t = tt(n); f = mtof(m); I = 2.5 * np.exp(-t / 0.03)
    return np.sin(TAU * f * t + I * np.sin(TAU * 3 * f * t)) * np.exp(-t / 0.07) * v
def brass(notes, dur=0.35, v=1.0):
    n = int(dur * SR); t = tt(n); y = np.zeros((2, n)); env = np.clip(t / 0.015, 0, 1) * np.exp(-t / (dur * 0.5))
    k = np.exp(-t / 0.08)
    for m in notes:
        for d, p in ((-10, -0.5), (0, 0), (10, 0.5)):
            f = mtof(m) * 2 ** (d / 1200); ph = rng.random(); s = wt(SAW_D, f, n, ph) + (wt(SAW_B, f, n, ph) - wt(SAW_D, f, n, ph)) * (0.4 + 0.6 * k)
            a = (p + 1) * np.pi / 4; y[0] += s * np.cos(a); y[1] += s * np.sin(a)
    return y * env / (len(notes) * 3) * 2.4 * v
def kalimba(m, v=1.0):
    n = int(0.8 * SR); t = tt(n); f = mtof(m)
    y = np.sin(TAU * f * t) * np.exp(-t / 0.35) + 0.35 * np.sin(TAU * f * 3.01 * t) * np.exp(-t / 0.06) + 0.2 * bandnoise(n, 2000, 6000, seed=5) * np.exp(-t / 0.004)
    return y * v
FORM = {'a': [(800, 90, 1.0), (1150, 110, 0.6), (2900, 160, 0.25)], 'o': [(500, 80, 1.0), (900, 100, 0.55), (2800, 160, 0.2)], 'e': [(400, 70, 1.0), (2000, 140, 0.5), (2550, 160, 0.3)]}
def vox(m, vowel='a', dur=0.22, v=1.0):
    n = int(dur * SR); t = tt(n); f0 = mtof(m) * (1 + 0.03 * np.exp(-t / 0.03)); ph = np.cumsum(f0) / SR; y = np.zeros(n)
    for h in range(1, 40):
        fh = mtof(m) * h
        if fh > 9000: break
        amp = sum(a * np.exp(-((fh - F) / bw) ** 2) for F, bw, a in FORM[vowel]) + 0.02 / h
        y += amp * np.sin(TAU * h * ph + h)
    vib = 1 + 0.02 * np.sin(TAU * 5.5 * t)
    return y * vib * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.04, 0, 1) / 4 * v
def pad(notes, dur, v=1.0, bright=0.3):
    n = int(dur * SR); t = tt(n); y = np.zeros((2, n)); env = np.clip(t / 0.4, 0, 1) * np.clip((dur - t) / 0.5, 0, 1)
    for m in notes:
        for d, p in ((-14, -0.8), (0, 0), (14, 0.8)):
            f = mtof(m) * 2 ** (d / 1200); ph = rng.random(); s = wt(SAW_D, f, n, ph) * (1 - bright) + wt(SAW_B, f, n, ph) * bright
            a = (p + 1) * np.pi / 4; y[0] += s * np.cos(a); y[1] += s * np.sin(a)
    return y * env / (len(notes) * 3) * v

# ---------------------------------------------------------------- foley
def bubble(f0=900, v=1.0):
    n = int(0.09 * SR); t = tt(n); f = f0 * np.exp(-t / 0.03) + f0 * 0.35
    return np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.035) * v
def boing(f0=220, v=1.0):
    n = int(0.55 * SR); t = tt(n); f = f0 * (1 + 0.35 * np.sin(TAU * 18 * t) * np.exp(-t / 0.15)) * (1 + 0.6 * np.exp(-t / 0.05))
    return np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.22) * v
def splat(v=1.0):
    n = int(0.3 * SR); t = tt(n)
    return (bandnoise(n, 150, 1600) * np.exp(-t / 0.05) + np.sin(TAU * np.cumsum(180 * np.exp(-t / 0.04) + 60) / SR) * np.exp(-t / 0.08) * 0.8) * v
def scratch(v=1.0):
    n = int(0.45 * SR); src = bandnoise(int(0.6 * SR), 300, 3500) * 0.6 + np.sin(TAU * 140 * tt(int(0.6 * SR))) * 0.4
    u = tt(n) / 0.45; speed = np.sin(TAU * 2.2 * u) * 1.6; pos = np.clip(0.1 * SR + np.cumsum(speed), 0, len(src) - 2)
    i = pos.astype(int); fr = pos - i; y = src[i] * (1 - fr) + src[i + 1] * fr
    return y * np.abs(speed) / 1.6 * np.sin(np.pi * u) * v
def whistle(dur, up=True, v=1.0):
    n = int(dur * SR); u = tt(n) / dur; f = 500 * 2 ** ((u if up else 1 - u) * 2.2)
    return (np.sin(TAU * np.cumsum(f * (1 + 0.006 * np.sin(TAU * 6 * tt(n)))) / SR) + 0.08 * bandnoise(n, 2000, 6000)) * np.sin(np.pi * u) ** 0.5 * v
def shutter(v=1.0):
    n = int(0.12 * SR); t = tt(n); y = np.zeros(n)
    for d in (0, 0.045): i = int(d * SR); y[i:] += bandnoise(n - i, 1500, 9000) * np.exp(-tt(n - i) / 0.006)
    return y * v
def ding(m=83, v=1.0):
    n = int(0.6 * SR); t = tt(n); y = np.zeros(n)
    i = int(0.08 * SR); y[:i] += np.sin(TAU * mtof(m) * t[:i]) * 0.8; y[i:] += np.sin(TAU * mtof(m + 5) * t[i:]) * np.exp(-tt(n - i) / 0.18)
    return y * v
def clack(f=900, v=1.0): n = int(0.06 * SR); t = tt(n); return (np.sin(TAU * f * t) + 0.6 * np.sin(TAU * f * 1.48 * t)) * np.exp(-t / 0.018) * v
def zap(v=1.0):
    n = int(0.3 * SR); t = tt(n); f = 300 * 2 ** (4 * t / 0.3)
    return (np.sin(TAU * np.cumsum(f) / SR) * 0.4 + bandnoise(n, 2000, 10000) * 0.3) * np.exp(-t / 0.1) * v
def popper(v=1.0):
    n = int(1.6 * SR); t = tt(n); y = bandnoise(n, 800, 9000) * np.exp(-t / 0.02) * 1.2 + np.sin(TAU * 70 * t) * np.exp(-t / 0.08)
    for _ in range(70):
        i0 = int((rng.random() ** 1.5) * (n - 4000)); m = int(0.04 * SR); tk = tt(m)
        y[i0:i0 + m] += np.sin(TAU * rng.uniform(3000, 9000) * tk) * np.exp(-tk / 0.01) * rng.uniform(0.15, 0.5)
    return y * v
def swish(dur=0.3, up=True, v=1.0):
    n = int(dur * SR); u = tt(n) / dur; y = np.zeros(n); bands = np.geomspace(600, 10000, 5)
    for i in range(4):
        c = i / 3 if up else 1 - i / 3; y += bandnoise(n, bands[i], bands[i + 1]) * np.exp(-((u - (0.25 + 0.5 * c)) / 0.28) ** 2)
    return y * np.sin(np.pi * u) ** 1.3 * v
def riser(dur, v=1.0):
    n = int(dur * SR); u = tt(n) / dur; f = 200 * 15 ** (u ** 1.5); ph = np.cumsum(f) / SR
    return (np.sin(TAU * ph) * 0.4 + bandnoise(n, 1000, 12000) * 0.5 * u) * u ** 2 * v
def crash(v=1.0): n = int(2.0 * SR); return bandnoise(n, 3000, 15000) * np.exp(-tt(n) / 0.6) * v

# ---------------------------------------------------------------- arrangement
kicks = []
def groove(t0, t1, kick_on=True, hats=True, half=False, cow=True, shk=True):
    t = t0
    while t < t1 - 1e-6:
        b = int(round(t / BEAT)) % 4
        if kick_on and (not half or b in (0, 2)): add(DRM, t, kick(0.95)); kicks.append(t)
        if b in (1, 3): add(DRM, t, clap(0.55), pan=0.05, send=0.2)
        if hats: add(DRM, t + BEAT / 2, hat(0.4, 0.09), pan=0.3)
        if shk:
            for s in range(4): add(DRM, t + s * BEAT / 4, shaker(0.5 if s % 2 else 0.3), pan=-0.35)
        if cow and b == 3: add(DRM, t + BEAT * 0.75, cowbell(0.45), pan=0.4, send=0.15)
        if b == 1: add(DRM, t + BEAT * 0.5, tamb(0.35), pan=-0.5)
        t += BEAT
def bass(t0, t1):
    t = t0
    while t < t1 - 1e-6:
        r = ROOT[bar_of(t)]
        for (bt, d, pop, oct_) in ((0, 0.3, False, 0), (0.75, 0.2, False, 0), (1.5, 0.15, True, 12), (2.0, 0.3, False, 0), (2.75, 0.2, False, 7), (3.25, 0.15, True, 12), (3.5, 0.2, False, 0)):
            if t + bt * BEAT < t1: add(MUS, t + bt * BEAT, slap(r + oct_, d, 0.9, pop), gain=0.32)
        t += BAR
def skank(t0, t1, gate=None):
    t = t0
    while t < t1 - 1e-6:
        notes = CH[bar_of(t)]
        for b in range(4):
            for off in (0.5,):
                tt0 = t + (b + off) * BEAT
                if tt0 >= t1: continue
                for m in notes[1:]: add(MUS, tt0, clav(m + 12, 0.5), pan=0.25, gain=0.07, send=0.15)
        t += BAR
def stutter_keys(t0, t1):
    t = t0
    while t < t1 - 1e-6:
        for m in CH[bar_of(t)][1:]: add(MUS, t, clav(m + 12, 0.6), pan=-0.2, gain=0.08, send=0.2)
        t += BEAT / 4
def hook(t0, t1, gain=0.22):
    pat = [(0, 'a', 0), (0.75, 'o', 2), (1.5, 'a', 4), (2.0, 'e', 3), (2.75, 'a', 2), (3.25, 'o', 0)]
    scale = [72, 74, 77, 79, 81]
    t = t0
    while t < t1 - 1e-6:
        for bt, vw, si in pat:
            if t + bt * BEAT < t1: add(MUS, t + bt * BEAT, vox(scale[si] - (2 if bar_of(t) == 3 and si == 4 else 0), vw, 0.24, 1.0), pan=0.1, gain=gain, send=0.45)
        t += BAR
def kalimba_arp(t0, t1, gain=0.12):
    t = t0; i = 0
    while t < t1 - 1e-6:
        notes = CH[bar_of(t)]; m = notes[[0, 2, 1, 3, 2, 1, 3, 2][i % 8]] + 24
        add(MUS, t, kalimba(m, 0.7 + 0.3 * (i % 2 == 0)), pan=0.4 * np.sin(i), gain=gain, send=0.35); t += BEAT / 2; i += 1
def roll(t0, t1, v0=0.2, v1=0.8):
    t = t0
    while t < t1 - 1e-6:
        k = (t - t0) / (t1 - t0); add(DRM, t, clap(v0 + (v1 - v0) * k) * 0.8, pan=rng.uniform(-0.3, 0.3)); t += BEAT / 4 if k < 0.5 else BEAT / 8

def main():
    # --- music ---
    kalimba_arp(0.0, 3.0, 0.13); groove(0.0, 2.0, kick_on=False, cow=False); roll(2.0, 2.95, 0.15, 0.8); add(SFX, 2.0, riser(1.0), gain=0.2, send=0.3)
    groove(3.0, 15.0); bass(3.0, 15.0); skank(3.0, 15.0); hook(9.0, 15.0)
    for t in (3.0, 9.0): add(MUS, t, brass([m + 12 for m in CH[bar_of(t)]], 0.5, 1.0), gain=0.3, send=0.3)
    # kaleido: psychedelic breakdown, then half-time night groove
    for k in range(3): add(MUS, 15.0 + k * BAR, pad([m + 12 for m in CH[bar_of(15 + k * BAR)]], BAR + 0.3, 1.0, 0.25), gain=0.35, send=0.6)
    hook(15.0, 18.0, 0.16); kalimba_arp(15.0, 18.0, 0.1)
    groove(18.0, 21.0, half=True, cow=False); bass(18.0, 21.0); hook(18.0, 21.0, 0.2); roll(20.0, 20.95, 0.1, 0.7)
    groove(21.0, 33.0); bass(21.0, 33.0); skank(21.0, 31.0); stutter_keys(31.0, 33.0)
    for i in range(4): add(MUS, 28.0 + i * 0.75, brass([m + 12 for m in CH[bar_of(28 + i * 0.75)]], 0.35, 1.0), gain=0.3, send=0.3)
    groove(33.0, 45.0); bass(33.0, 45.0); skank(33.0, 45.0); hook(39.0, 45.0, 0.18)
    groove(45.0, 51.0, hats=False, shk=False); bass(45.0, 51.0); skank(45.0, 51.0); hook(45.0, 51.0, 0.16)
    groove(51.0, 57.0); bass(51.0, 56.0); skank(51.0, 56.0); hook(51.0, 56.0, 0.22); roll(56.0, 56.95, 0.15, 0.9); add(SFX, 56.0, riser(1.0), gain=0.22, send=0.3)
    # outro: final chord with vocal 'ahh'
    add(MUS, 57.0, brass([65, 69, 72, 76], 0.7, 1.2), gain=0.4, send=0.5); add(MUS, 57.0, pad([53, 57, 60, 64, 69], 3.0, 1.0, 0.4), gain=0.45, send=0.7)
    add(MUS, 57.0, vox(72, 'a', 1.6, 1.0), gain=0.3, send=0.8); add(MUS, 57.0, slap(41, 0.6, 1.0), gain=0.4)
    # section hits
    for t in (3, 9, 15, 21, 27, 33, 39, 45, 51, 57): add(SFX, t, crash(0.18 if t != 57 else 0.3), send=0.4); add(DRM, t, kick(1.0) * 0.6)
    for t in (15.0, 39.0): add(SFX, t - 0.05, scratch(1.0), gain=0.3, send=0.2)
    # --- foley ---
    add(SFX, 0.0, bubble(700, 1.0), gain=0.35); add(SFX, 0.45, boing(260), gain=0.25, send=0.2); add(SFX, 0.85, boing(330), gain=0.25, send=0.2)
    for i in range(9): add(SFX, 1.3 + i * 0.06, bubble(600 + i * 90, 1.0), pan=(i - 4) / 6, gain=0.22)
    add(SFX, 2.0, popper(1.0), gain=0.35, send=0.4); add(SFX, 2.45, swish(0.55, True), gain=0.3)
    add(SFX, 3.0, boing(300), gain=0.22)
    for i in range(6): add(SFX, 3.4 + i * 0.5, bubble(650 + i * 60), pan=-0.6 + i * 0.24, gain=0.3); add(SFX, 3.6 + i * 0.5, bubble(1200), pan=-0.6 + i * 0.24, gain=0.12)
    for i in range(6): add(SFX, 8.55 + i * 0.04, swish(0.35, i % 2 == 0), pan=-0.8 + i * 0.32, gain=0.16)
    add(SFX, 9.0, boing(250), gain=0.22); add(SFX, 9.15, boing(310), gain=0.22)
    for j in range(6): add(SFX, 9.2 + j * 0.08, clack(1100 + j * 60), pan=-0.7 + j * 0.1, gain=0.25)
    for i in range(6): add(SFX, 9.5 + i * 0.5, splat(1.0), pan=0.3, gain=0.35, send=0.15); add(SFX, 9.55 + i * 0.5, ding(79 + [0, 2, 4, 5, 7, 9][i], 1.0), pan=0.3, gain=0.12, send=0.3)
    add(SFX, 12.2, swish(0.5, True), gain=0.3); add(SFX, 12.8, boing(280), gain=0.22); add(SFX, 13.0, boing(350), gain=0.22); add(SFX, 13.3, ding(84), gain=0.2, send=0.3)
    for i, t in enumerate((15.3, 15.8, 16.3)): add(SFX, t, bubble(500 + i * 150), gain=0.3)
    add(SFX, 18.0, zap(1.0), gain=0.3); add(SFX, 18.0, kick(1.0), gain=0.4)
    for i, t in enumerate((18.0, 18.5, 19.0)): add(SFX, t, boing(240 + i * 60), gain=0.18)
    add(SFX, 21.0, boing(270), gain=0.22)
    for j in range(8): add(SFX, 21.3 + j * 0.08, swish(0.2, False), pan=-0.7 + j * 0.2, gain=0.1); add(SFX, 21.6 + j * 0.08, clack(800 + j * 70), pan=-0.7 + j * 0.2, gain=0.3)
    add(SFX, 22.5, swish(0.5, False), gain=0.25); add(SFX, 22.6, bubble(500), gain=0.3)
    for i in range(8): add(SFX, 23.0 + i * 0.375, splat(0.8), gain=0.3); add(SFX, 23.0 + i * 0.375, clack(1000 + i * 50), pan=-0.6 + i * 0.17, gain=0.25)
    add(SFX, 26.5, swish(0.5, True), gain=0.3)
    add(SFX, 27.0, boing(260), gain=0.22); add(SFX, 27.3, bubble(900), gain=0.25)
    for i in range(4): t = 28.0 + i * 0.75; add(SFX, t, clack(2500, 1.0), gain=0.3); add(SFX, t, zap(1.0), gain=0.25, send=0.2); add(SFX, t + 0.05, boing(300 + i * 40), gain=0.15)
    for i in range(16): add(SFX, 31.0 + i * 0.125, clack(2600 + 200 * (i % 2), 1.0), pan=0.5 if i % 2 else -0.5, gain=0.18)
    add(SFX, 33.0, boing(250), gain=0.2); add(SFX, 33.2, boing(320), gain=0.2); add(SFX, 36.0, boing(220), gain=0.2); add(SFX, 36.2, boing(290), gain=0.2)
    for i in range(8): add(SFX, 33.0 + i * 0.75, bubble(800 + 80 * (i % 4)), gain=0.25)
    n = int(6 * SR); tk = tt(n); w = bandnoise(n, 300, 3000) * (0.6 + 0.4 * np.sin(TAU * tk) ** 2) * np.clip(tk / 0.1, 0, 1) * np.clip((6 - tk) / 0.2, 0, 1)
    add(SFX, 39.0, w, gain=0.1)
    for stage in (0, 1):
        t0 = 45.0 + stage * 3
        add(SFX, t0, bubble(700), gain=0.25); add(SFX, t0 + 0.35, whistle(1.9, True), gain=0.12, send=0.3)
        add(SFX, t0 + 1.2, bubble(1000), gain=0.25); add(SFX, t0 + 2.2, ding(84), gain=0.2, send=0.3)
    add(SFX, 51.0, boing(250), gain=0.22)
    for i in range(9): t = 51.35 + i * 0.5; add(SFX, t - 0.12, swish(0.25, True), pan=0.6 if i % 2 else -0.6, gain=0.15); add(SFX, t + 0.05, shutter(1.0), gain=0.35)
    add(SFX, 56.2, swish(0.7, True), gain=0.3)
    add(SFX, 57.0, popper(1.0), gain=0.4, send=0.4); add(SFX, 57.6, popper(0.7), pan=-0.6, gain=0.25); add(SFX, 57.8, popper(0.7), pan=0.6, gain=0.25)
    for i in range(9): add(SFX, 57.1 + i * 0.05, bubble(700 + i * 100), pan=(i - 4) / 6, gain=0.2)
    add(SFX, 57.7, bubble(600), gain=0.25); add(SFX, 57.95, bubble(800), gain=0.25); add(SFX, 59.3, whistle(0.7, False), gain=0.12)

    # sidechain music on kicks, reverb, master
    sc = np.ones(N); tk = tt(int(0.25 * SR)); shape = 1 - 0.55 * np.exp(-tk / 0.08)
    for kt in kicks:
        i0 = int(kt * SR); n = min(len(shape), N - i0)
        if n > 0: sc[i0:i0 + n] = np.minimum(sc[i0:i0 + n], shape[:n])
    MUS[:] *= sc
    ir_n = int(1.8 * SR); t = tt(ir_n); ir = np.zeros((2, ir_n))
    for ch in range(2):
        for lo, hi, tau in ((80, 600, 0.5), (600, 3500, 0.4), (3500, 14000, 0.22)): ir[ch] += bandnoise(ir_n, lo, hi, seed=60 + ch + int(lo)) * np.exp(-t / tau)
    ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True)); ir *= 0.55
    def conv(x, h): F = 1 << int(np.ceil(np.log2(len(x) + len(h)))); return np.fft.irfft(np.fft.rfft(x, F) * np.fft.rfft(h, F), F)[:len(x)]
    wet = np.vstack([conv(SEND[0], ir[0]), conv(SEND[1], ir[1])])
    mix = MUS * 1.0 + DRM * 0.95 + SFX * 1.0 + wet * 0.45
    for ch in range(2):
        X = np.fft.rfft(mix[ch]); f = np.fft.rfftfreq(N, 1 / SR); mix[ch] = np.fft.irfft(X / np.sqrt(1 + (30 / np.maximum(f, 1e-3)) ** 8), N)
    fo = int(59.3 * SR); mix[:, fo:] *= np.linspace(1, 0, N - fo) ** 1.5
    mix /= np.percentile(np.abs(mix), 99.9) + 1e-9; mix *= 0.8
    B = 240; nb = N // B + 1; pk = np.pad(np.abs(mix).max(axis=0), (0, nb * B - N)).reshape(nb, B).max(axis=1)
    g = np.minimum(1.0, 0.9 / np.maximum(pk, 1e-9)); g = np.minimum(g, np.concatenate([g[1:], [1.0]]))
    rel = np.exp(-B / SR / 0.08); gs = np.empty_like(g); cur = 1.0
    for i in range(nb): cur = g[i] if g[i] < cur else g[i] + (cur - g[i]) * rel; gs[i] = cur
    mix *= np.interp(np.arange(N), np.arange(nb) * B + B / 2, gs)
    pcm = (np.clip(mix, -1, 1) * 32767).astype('<i2').T.copy()
    with wave.open(os.path.join(HERE, 'pop_mix.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('wrote pop_mix.wav')

if __name__ == '__main__':
    main()
