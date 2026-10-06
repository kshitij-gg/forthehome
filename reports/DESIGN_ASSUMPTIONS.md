# Design Assumptions

Only items that could not be established from the PDF, its labels or the written brief are listed here.
Everything else is taken from `plan/msplan1.pdf` and encoded in `project/src/data/floorplan.ts`.

## Reading the drawing

| Topic | Assumption | Why |
|---|---|---|
| Orientation | The sheet is rotated 90°; it was read rotated 90° counter-clockwise. "North : –" with its arrow points to the top of the upright plan → top = north, right = east. | Title block note + north arrow. |
| Site | Dhule, Maharashtra, ≈ 20.9° N, 74.8° E. Day mode uses a mid-February solar path (declination −12.5°), time adjustable 07:00–18:30. | Brief; date chosen for a low, interior-reaching winter sun. |
| Scale | No scale was supplied. A least-squares fit of the vector linework against labelled rooms gives **0.0311 m per PDF point** (lift 5'0" = 49 pt, C. toilet 7'6" = 74 pt, M. bed 11'0" = 107 pt, office 12'6" = 122.4 pt). | Brief: fit by least squares when the scale is missing. |
| Label axis | Labels are written E-W × N-S (first figure = horizontal in the upright view) — true for 16 of 18 labelled rooms. | Consistent with the linework. |
| CH. BED toilet | Labelled 7'6" × 4'6" but drawn taller than wide; built 4'6" (E-W) × 7'6" (N-S). | The linework wins on orientation; the label wins on size. |
| Office balcony | Labelled 3'3" × 3'9" but drawn along the full 12'6" office wall. The 3'3" × 3'9" clear zone sits in front of the sliding door, with built-in planter beds filling the rest of the strip. | Honours the label without deleting the drawn balcony. |
| Deoghar | The 8'3" × 4'3" label covers the whole strip east of the main door. The shrine (behind double jaali doors) is its eastern 1.33 m; the western part is the entry/approach with the shoe console. | Matches the drawn jaali line and the label length. |
| Hall, dining, kitchen | Open-plan zones are checked as labelled rectangles. Hall: between the storage-run face and the balcony door wall, from the dining line to the TV wall. Dining: from the M.Bed partition to the face of the tall pantry. Kitchen: from its west wall to its east wall. | Brief: validate open zones against a labelled-zone rectangle. |
| Duct | Built as a sealed 5'0" × 5'0" shaft against the north wall. The remaining space between lift and duct is a solid service core. | Label wins; it's non-enterable anyway. |
| Wall thickness | Measured from the linework: exterior 150 mm, interior 100–115 mm, CH.RM/toilet plumbing wall 190 mm. | Measured, not assumed. |

## Vertical values (not on the drawing) — `project/src/data/designConfig.ts`

Floor to floor 3.15 m · finished ceiling 2.90 m with a 100 mm perimeter cove drop (420 mm band) · toilet ceilings 2.45 m · doors 2.10 m · window sill 0.90 m (1.25 m behind bed headboards, 0.45 m at the CH. BED window seat) · ventilators 1.6–2.15 m · railings 1.05 m · eye height 1.65 m · player radius 0.25 m.

## Deliberate deviations and substitutions

| Item | Decision |
|---|---|
| Main entrance | Single solid walnut hinged leaf, 0.95 m clear, swinging into the flat from the west jamb. The opening sits about 0.36 m west of the drawn position (x 9.00–9.95 m instead of ≈ 9.36–10.35 m). With the drawn position, the open leaf left under 0.5 m of passage to either the hall or the deoghar. No swing is drawn on the plan. |
| Office lobby door | A sliding oak panel, not hinged. A hinged leaf swinging into the office blocked the route past the sofa when both office doors were open. |
| Office foyer door | Hinged (not on the brief's sliding-door list); it opens against the office's south-west corner. |
| Sliding doors | Every door on the brief's list is sliding: all three toilets, M. bed, CH. bed, CH. RM, the washing area (bi-parting), every wardrobe, and all three balcony doors. The two toilet doors share a wall, so their panels run on two parallel tracks. No pocket or hinged substitutions were needed. |
| Kitchen column | The drawn free-standing column (south-centre) is tied back to the south wall as a stone-clad pier, with a floating walnut breakfast ledge and two counter stools. The south window was shifted to x 6.82–7.86 m so the pier does not cover it. |
| Kitchen west wall | The kitchen/washing wall is extended to meet the column head (y 1.75 m), and the column now reaches the counter. Together they form one fluted-oak "kitchen portal" pier instead of a wall stub with a gap behind the counter. |
| Living room | Reduced to one L-sectional (3-seat + chaise) and a single accent chair, with a side table and floor lamp, for clear circulation. The drawn two-seater was removed at the client's request. |
| UI | The brief asked for exactly two persistent buttons. The client later asked for day/night and design controls, so the bar now holds EXPLORE · OVERVIEW · DAY/NIGHT · DESIGN. The Design Studio panel holds every other control. |
| Colour lighting | Colour is limited to concealed coves and two accent strips (media wall, M. bed headboard), as briefed. The deoghar, toilets and kitchen always stay white. |
| Pointer lock | Explore uses click-and-drag to look (no cursor capture), so the Design Studio and door clicks work naturally. |

## Materials and assets

All textures are procedural, generated in code at runtime by a Web Worker pool (`src/materials/textures.js`, `texWorker.js`, `texPool.js`). No external images, HDRIs, fonts or models are used, so there are no third-party licences. Three.js 0.169.0 (MIT) and Vite 5.4.10 (MIT) are the only dependencies.
