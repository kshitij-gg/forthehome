# QA Report

The build and validation were run with `npm run build` (validate → Vite build → single-file inline).
Browser checks were done in the Claude desktop browser pane against both the dev server and the production build (`vite preview`).

## 1. Build and runtime
- [x] `node scripts/validate.mjs` passes. The build fails if any labelled room is off by more than 10 mm or any wall overlap is found.
- [x] The production build succeeds as one self-contained `build/index.html` (~1 MB, gzip ~290 kB). Three.js and the texture worker are inlined, and there are no external assets.
- [x] No runtime errors in the production build console.
- [x] Boot time (production): materials 0.46 s, ready about 1.1 s. Textures are synthesised in parallel on a Web Worker pool, with a main-thread fallback and a 15 s timeout guard. Shaders compile asynchronously.
- [x] Frame rate in Explore with AO and bloom at night: about 128 fps on the test machine. An FPS watchdog drops AO below 28 fps.
- [x] Draw calls are reduced by per-material merging: 168 interior and 49 architecture meshes after merging.

## 2. Plan fidelity
- [x] 18 of 18 labelled rooms match within 10 mm (largest error 0.1 mm, hall balcony). See `DIMENSION_REPORT.md`.
- [x] Every enclosed room's boundary is 100% wall or opening (sampled every 5 cm, 3 cm outside each edge). Balcony edges are glass balustrade.
- [x] There are no wall overlaps, no floor-finish overlaps, every opening sits inside its wall, and every door opening is at least 0.76 m clear.
- [x] Column projections are listed as information only: COL_C/D/G (CH. bed), COL_F/J (dining), COL_I/J/K (kitchen), COL_M (office).

## 3. Navigation and collision
- [x] BFS on a 5 cm grid from the entrance, with all doors open, reaches all 19 enterable spaces: CH. bed, dressing, 3 toilets, M. bed and balcony, hall, dining, kitchen, washing, hall balcony, deoghar and shrine, office and balcony, passage, corridor and foyer.
- [x] Walls, joinery, railings, the stair edge, the lift and duct collide. Closed doors block; open sliding doors do not.
- [x] Pinch points found and fixed:
  - hall north (removed a floor lamp and plant from the corridor link);
  - the gap between the sectional and the second sofa (second sofa removed);
  - the main-door leaf blocking the foyer, deoghar and hall (door re-hinged and shifted);
  - the office lobby-door leaf (changed to sliding);
  - planter and plant leaf colliders (leaves no longer collide);
  - the pooja-unit floor mat;
  - the toilet WC footprints (wall-hung, now passable above floor);
  - the hall-balcony chairs.

## 4. Doors
- [x] All 14 operable doors animate both ways (scripted toggle test):
  - main door and office foyer door (hinged);
  - three toilets, M. bed, CH. bed, CH. RM, office balcony and office lobby door (single sliders);
  - M. bed and hall balconies (bypass sliders);
  - washing area (bi-parting slider);
  - deoghar (double jaali doors).
- [x] Doors toggle with the E key (nearest door you are facing) or a mouse click on the leaf. An on-screen prompt shows the nearest door.
- [x] Sliding panels park over solid wall. The two toilet doors on the shared corridor wall run on two separate tracks. Visible top tracks and floor guides are modelled.

## 5. Visual review (per room, day and night)
- Hall: one sectional and one accent chair, rug and nested tables, walnut-slat and stone media wall grazed by two spots, profile lines either side of the fan, cove. ✔
- Dining: oval stone table with six upholstered chairs, brass ring pendant over the table, spot on the art, accent wall. ✔
- Kitchen: L-run with fridge/pantry tower and sink, hob with chimney on the east wall, two south counters either side of the stone pier, breakfast ledge with two stools, fluted-oak portal, finished tall-unit backs facing the living room, two profile lines, under-cabinet strips. The previously unfinished wall stub and free-standing column are resolved. ✔
- Master bed: king bed, fluted timber headboard wall with cove, globe pendants, bench, wall TV panel, sliding wardrobe with mirror panel, sheers. ✔
- Kids' bed: teal/blue accent wall, queen bed, sconces, study desk and chair where drawn, window seat, sliding wardrobe. ✔
- Office: two workstations, linear pendant, 4000 K, 3-seat sofa, bookshelf with spot, acoustic panels, balcony planter beds. ✔
- Toilets: glass wet zones with niches, wall-hung WCs, backlit mirrors, large-format stone. Never colour-lit. ✔
- Deoghar: ivory stone, arch, jaali side panels, brass idols, bells and diyas, concealed 2700 K, spot. Never colour-lit. ✔
- Balconies: anti-skid tile, glass rails, planters, wall lights; lounge chairs on the hall balcony only. ✔
- Fixed during review:
  - snake-plant leaves rendered as white cards (replaced with real blade geometry);
  - wood grain ran the wrong way on doors and fluted panels;
  - the display niche read as a white board;
  - mojibake in UI labels;
  - night over-exposure;
  - marble veining looked artificial (replaced with ridged, domain-warped noise).

## 6. Design Studio
- [x] Day/Night toggle in the nav bar. Day has a time-of-day slider (07:00–18:30) with real solar azimuth and elevation, warm low sun, and an optional "interior lights on" switch.
- [x] Night has 5 moods (Warm White, Amber Lounge, Moonlight Blue, Soft Violet, Colour Accent). There are switches for ceiling profile lights, spotlights, coves and downlights, plus sliders for brightness, colour temperature (2200–5000 K) and exposure. Reset is available.
- [x] There are 6 palettes (Timeless Beige, Sophisticated Blue, Nature Green, Modern Grey, Earthy Brown, Sand & Terracotta). They apply to the whole home or any of 9 room scopes, and to chosen surfaces: walls, feature walls, upholstery, cushions and throws, cabinetry, rugs, curtains.
- [x] Scripted test: applying a palette to two surfaces reports "mixed"; undo restores it.
- [x] There are 8 floor finishes (porcelain, Statuario, travertine, concrete, terrazzo, Nero Marquina, oak, walnut chevron) for 10 scopes. Floors are generated asynchronously with live thumbnails; a scripted apply/revert was tested.
- [x] Design and lighting choices persist in localStorage, with safe fallbacks. The reflection probe is re-captured after every change, so floors and glass reflect the new room.
- [x] Keyboard: N day/night, L moods, C studio, P plan overlay, 1–9 rooms, E doors, WASD/arrows, Shift, scroll to step. The panel swallows its own key events so sliders never move the camera.

## 7. Controls
- [x] Explore: drag to look (no cursor capture), WASD/arrows, Shift sprint, scroll to step, eased acceleration, eye height 1.65 m, radius 0.25 m. A touch joystick plus drag-look is available on mobile.
- [x] Overview: damped orbit with clamped target and polar angle, cut-away at 2.35 m with dark wall caps. Double-click the floor to drop into Explore at that spot.
- [x] Plan overlay (P): a top-down view with every labelled room outlined and its written and measured size (ft-in and m).

## 8. Storage check (C: drive)
- All project files, node_modules, the npm cache (`_cache/npm`, set via project `.npmrc`), the Vite cache (`_cache/vite`), PyMuPDF (`_cache/pylib`), the pip cache, temp files, plan rasters, reports and the build are on `D:\claude code\3d\`.
- I scanned `%LOCALAPPDATA%\npm-cache`, `%APPDATA%\npm`, `%LOCALAPPDATA%\pip`, `ms-playwright` and `~/.cache`: no project files.
- `%LOCALAPPDATA%\Temp\claude\…` holds only the Claude assistant's own session scratch and screenshots (tooling, not project output).
- No user-level `.npmrc` was written.
- Playwright/Chromium was not installed; the built-in browser pane was used instead, so no browser binaries were downloaded.

## Known limitations
- Night lighting is real-time (no baked GI). Interior bounce is approximated with room fill lights plus a live room reflection probe.
- Neighbouring buildings and trees are simple massing context.
- The common stair is modelled for viewing; the player stays on the floor plate.

## 9. Second improvement pass
- **Feature wall:** the blank fluted-oak face of the fridge/pantry tower, facing the living room, is now a styled feature wall. It has a backlit walnut ledge with books, a vase and a brass sculpture, a framed artwork, a brass picture light and a dedicated (softened) gimbal spotlight.
- **Spectate:** Explore now defaults to a free-flying spectator camera. You fly in the look direction, Space/R rises, Q/F descends, Shift goes faster, and the camera is clamped between 0.3 m and 2.78 m and to the site bounds. G (or the Rooms menu) switches to Walk mode, which restores eye height, floor following and collision. Ctrl is deliberately not bound, because Ctrl+W closes the tab. Scripted test: fly forward and up → 2.78 m cap; descend → 0.30 m floor; G → 1.65 m and not inside any obstacle.
- **Real mirrors:** planar reflections on all 5 house mirrors (three vanity mirrors, the dressing-room mirror and the entry mirror). Each renders only while you are in its room and within 6 m, so the extra cost stays local.
- **Styling layer:**
  - Dining: six-place table setting with linen, plates, glasses and brass cutlery, a candles-and-blooms centrepiece.
  - Kitchen: fruit bowl, kettle, knife block, utensils, coffee machine, open walnut shelves.
  - Living room: throw and candles.
  - Desks and office: notebooks, mugs and plants; books and a sculpture on the office coffee table.
  - Toilets: bath mats and a towel stack.
  - Balconies: lanterns.
- **Dining chairs** rebuilt as proper upholstered chairs on oak posts. The earlier curved shells read as floating panels.
- **Plants:** the cone-shaped "fern" pot plants were replaced with broad-leaf plants.
- **Exterior:**
  - Neighbouring blocks have textured facades (windows, frames, balconies, chajjas), parapets and stair headrooms, with warm or cool lit windows at night.
  - A distant city skyline ring, fuller neem-like trees and palms, a textured lawn, roads, and a compound wall with piers.
- **Rooms menu:** jump to any of 17 rooms, choose Spectate or Walk, or start the guided tour. The tour is an A* path over the same collision field (doors opened automatically) with ten narrated stops. Scripted run: 84 s end to end, 0 blocked positions, maximum step 0.053 m per frame.
- **Robustness:** the canvas can no longer collapse to 0×0 after the window is hidden or minimised. The viewport self-heals every frame, and zero-size resize events are ignored.

## 10. Spectate-only Explore
- Walk mode has been removed at the client's request; Explore is always a free spectator camera.
- There is no collision: walls, furniture, doors and ceilings never block. Flight is limited only to a wide site box (x −90…105 m, y −90…100 m) and heights from just above street level to 60 m.
- Speed rises 2.5× once you leave the flat, so you can tour the exterior quickly.
- Scripted test: flew west from the living room straight through the storage run, the partition and the master bedroom, out of the building to x = −2.94 m; then rose to 19.1 m. No errors.

## 11. Level-glide spectate
- Explore moves in straight horizontal lines at eye height (1.65 m above the floor under you); looking up or down never changes height. Vertical keys were removed.
- There is still no collision: walls, furniture and doors never block. Movement is bounded to the site area around the building.
- Scripted test: looking 34° upward and holding W from the living room went straight west through the storage run, partition and master bedroom to x = 0.31 m, with y unchanged (6.00 m) and height steady at 1.64–1.65 m. Space had no effect.

## 12. Volume II: styles, scenes and the mandir
- **Style tab:** 10 one-click house styles. Each sets palettes for every room, floors for every zone and a lighting scene. Verified by applying Art Deco (emerald walls, checker marble, warm night) and then Undo.
- **Palettes and floors:** 16 palettes and 19 floors. A swatch sheet of the new floors was checked visually; the herringbone seam bug was fixed.
- **Lighting:** 12 named scenes (4 day, 8 night).
  - A cove and accent colour wheel (drag), 8 swatches and an Auto option.
  - Verified: Cinema scene; a cyan cove picked live on the wheel.
- **Views:** a VIEWS menu with 12 eye-level and 4 aerial views, using eased fly-to. The dollhouse view was verified.
- **Mandir:** new layered unit with a Vishnu murti, verified through the open jaali doors at eye level.
- **Console:** no errors after reload.
- **2-minute edit (`src/edit120.js`, `window.__edit120.run()`):**
  - 1080p60, 19 sections at 120 BPM.
  - QA covered 62 snapshot frames. These fixes came out of that review:
    - Moved the floor macro camera off the sofa.
    - Callout labels now size to their text.
    - Strengthened the cove effect in the wheel shot.

## 13. Photoreal + performance pass (quality tiers, refinement, neighbourhood)
- **Quality tiers** (`src/render/quality.js`): Low / Medium / High / Ultra chosen automatically from the GPU, memory and cores. Can be overridden with `?q=` or from Studio → Lighting → Render quality. A device that can't hold ~28 fps steps itself down and remembers it.
- **Pipeline** (`src/render/pipeline.js`): HDR → GTAO (scaled per tier) → bloom → filmic grade with dither.
  - **Dynamic resolution:** scales the render resolution while the view is moving.
  - **Refinement when still:** once the camera stops, 16–128 jittered samples (anti-aliasing plus soft sun shadows) accumulate, then rendering stops so an idle view costs no GPU.
  - **Auto-exposure:** GPU eye adaptation, with no readbacks.
  - **Light pooling:** the 28 lights are pooled to the nearest 7–23, depending on tier.
  - **Shadows:** cached; they re-render only when the sun, doors or the cut-away change.
- **Lighting:** sun brightened (2.6×), ambient fill reduced, and spotlights at windows and balcony doors. Area lights were tried and removed because they made shader compiles about 10× slower.
- **Reflections:** a box-projected probe per room zone, with hysteresis so it doesn't flip-flop at doorways.
- **Textures** (procedural, seamless, sized per tier and cached in IndexedDB): wood planks and veneers, marble and porcelain, limewash plaster, fabrics, smudge, brushed metal, lacquer orange-peel, leather and dirt.
  - Cached boot: materials ready in 0.7 s instead of 6–9 s.
- **Fixes:**
  - z-fighting removed at the kitchen counter (sink-carcass back and fluted upstand were coplanar at y = 3.734);
  - new full-height wall between hall and kitchen (fluted oak on the hall side, stone and plaster on the kitchen side);
  - children's room wardrobe removed.
- **Neighbourhood** (`src/architecture/context.js`): modelled on the Wadibhokar Rd street view.
  - About 30 low-rise houses within a 68 m radius, a few draw calls, vertex colours, no extra downloads.
  - Two white mid-rise blocks, tin-sheet site frontage, and a stilt-parking ground floor.
- **Web build:** `npm run build:web` → `web/`, about 323 KB gzip in total, recording and edit tools excluded, `_headers` and `vercel.json` cache rules.
- **Measurements** (production or dev build, RTX 4060 laptop):

  | Tier | Cold boot | Moving | Refined still |
  |---|---|---|---|
  | Low | 3.6 s | 142 fps | 0.16 s |
  | Medium | 8.5 s, before the area-light removal | 92 fps | 0.4 s |

## 14. Desktop + phone versions
- **Desktop:** `build/index.html` is a single self-contained file (about 1.1 MB). Double-click it, no server needed. Auto tier on this laptop: Ultra.
- **Phone:**
  - The same app adapts automatically to the Low tier: 30 fps cap, 1× resolution, short refinement, no mirrors, 1024 shadows and a lighter neighbourhood.
  - Touch controls: left half moves, right half looks.
  - Landscape (16:9) only. In portrait, a rotate prompt appears, and its button goes fullscreen and locks landscape where the browser allows it.
  - The bottom menu fits small screens and the safe areas.
- **Phone over Wi-Fi:** `npm run phone` builds and serves `web/` on the local network (port 5210). Open the printed Network URL on the phone.
- **Studio / video tools:** load only on the dev server and ship in neither build.
