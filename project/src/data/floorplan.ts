// =====================================================================
// MACHINE-READABLE SOURCE OF TRUTH — Fourth-floor residence, Dhule
// ---------------------------------------------------------------------
// Coordinate frame (metres): x = east, y = north (upright plan, north up).
// Origin: inside face of the west exterior wall (x = 0) and inside face
// of the kitchen / washing south exterior wall (y = 0).
// Three.js mapping: world X = x, world Z = -y, world Y = up.
// Every rectangle is [x0, y0, x1, y1] with x0 < x1 and y0 < y1.
// Wall axis = the longer side; opening a/b are absolute coordinates along
// that axis. Door "side" = +1 → face at max of the thickness coordinate.
// =====================================================================

export type Rect = [number, number, number, number];

export interface Wall {
  id: string;
  rect: Rect;
  kind: 'ext' | 'int' | 'core' | 'column';
  finish?: 'paint' | 'stone';
  h?: number;
}

export interface Opening {
  id: string;
  wall: string;
  a: number;
  b: number;
  sill: number;
  head: number;
  kind: 'door' | 'window' | 'vent' | 'jaali' | 'louvre' | 'lift' | 'passage';
  room?: string;
}

export interface DoorSpec {
  id: string;
  opening: string;
  type: 'hinged' | 'double-hinged' | 'slide1' | 'slide-bypass' | 'slide-biparting' | 'static';
  side: 1 | -1; // face the leaf/track sits on (or swings toward)
  hingeAt?: 'a' | 'b'; // hinged only
  park?: 1 | -1; // slide1: direction the panel travels to open (+axis / -axis)
  track?: number; // offset of track plane from wall face (m)
  leaf: 'solid-walnut' | 'oak-panel' | 'taupe-panel' | 'fluted-glass' | 'clear-glass' | 'jaali' | 'steel';
  label: string;
  startOpen?: boolean;
}

export interface Room {
  id: string;
  name: string;
  label?: string; // the dimension string written on the drawing
  required?: [number, number]; // [E-W, N-S] clear metres (labelled)
  axisNote?: string;
  rect: Rect;
  open: boolean; // open-plan labelled zone (validated as a zone rectangle)
  enterable: boolean;
  ceiling: number;
  teleportKey?: number;
}

const ft = (f: number, i = 0) => f * 0.3048 + i * 0.0254;

// ---------------------------------------------------------------------
// Key grid lines (derived from labelled dimensions + measured walls)
// ---------------------------------------------------------------------
export const G = {
  T_EXT: 0.15,
  T_INT: 0.115,
  T_THIN: 0.1,
  // x lines
  xToiletE: ft(7, 6), // 2.2860 toilets east inside face
  xCorrW: ft(7, 6) + 0.1, // 2.386
  xMbedE: 2.386 + 0.9668, // 3.3528 = 11'0"
  xPart: 3.3528 + 0.115, // 3.4678
  xRun: 3.3528 + 0.9158, // 4.2686 hall west boundary (storage run face)
  xChbedE: ft(14, 9), // 4.4958
  xHallE: 4.2686 + ft(18, 7), // 9.9328
};

// ---------------------------------------------------------------------
// WALLS (exterior, interior, cores, columns)
// ---------------------------------------------------------------------
export const walls: Wall[] = [
  // ---- exterior envelope ----
  { id: 'E_W', rect: [-0.15, 1.258, 0, 11.7838], kind: 'ext' },
  { id: 'E_N', rect: [-0.15, 11.7838, 14.7532, 11.9338], kind: 'ext' },
  { id: 'E_SMB', rect: [-0.15, 1.143, 3.3528, 1.258], kind: 'ext' },
  { id: 'E_S', rect: [3.3528, -0.15, 9.9328, 0], kind: 'ext' },
  { id: 'E_E', rect: [9.9328, -0.15, 10.0828, 3.8115], kind: 'ext' },
  { id: 'W_BD', rect: [9.9328, 3.8115, 10.0478, 6.4784], kind: 'ext' },
  { id: 'E_DS', rect: [9.9328, 6.4784, 13.1942, 6.5784], kind: 'ext' },
  { id: 'E_DE', rect: [13.0792, 6.5784, 13.1942, 7.8738], kind: 'ext' },
  { id: 'E_OS', rect: [10.5646, 7.8738, 13.7626, 7.9738], kind: 'ext' },
  { id: 'E_OE', rect: [13.6126, 7.9738, 13.7626, 11.7838], kind: 'ext' },

  // ---- interior partitions ----
  { id: 'I_TE', rect: [2.286, 5.2204, 2.386, 8.0112], kind: 'int' },
  { id: 'I_TP', rect: [0, 6.692, 2.286, 6.792], kind: 'int' },
  { id: 'I_MTS', rect: [0, 5.2204, 2.286, 5.3204], kind: 'int' },
  { id: 'I_MBD', rect: [2.386, 5.2204, 3.3528, 5.3204], kind: 'int' },
  { id: 'I_CBS', rect: [0, 8.0112, 3.3528, 8.1262], kind: 'int' },
  { id: 'B1', rect: [3.3528, 7.593, 4.4958, 8.1262], kind: 'int' },
  { id: 'I_PART', rect: [3.3528, 0, 3.4678, 6.70], kind: 'int' },
  { id: 'I_WN', rect: [3.4678, 1.2954, 6.3634, 1.3954], kind: 'int' },
  { id: 'I_KW', rect: [6.3634, 0, 6.4784, 1.75], kind: 'int' }, // extended to the column head: clean kitchen portal pier
  { id: 'I_TV', rect: [4.4958, 7.593, 10.5646, 7.708], kind: 'int' },
  { id: 'I_CRW', rect: [4.4958, 7.708, 4.5958, 11.7838], kind: 'int' },
  { id: 'I_CRN', rect: [4.5958, 9.3082, 6.4484, 9.4978], kind: 'int' },
  { id: 'I_CRE', rect: [6.3484, 7.708, 6.4484, 9.3082], kind: 'int' },
  { id: 'I_LE', rect: [7.9724, 7.708, 8.0874, 10.2598], kind: 'int' },
  { id: 'I_DE', rect: [7.9724, 10.2598, 8.0874, 11.7838], kind: 'int' },
  { id: 'I_PE', rect: [10.4496, 7.708, 10.5646, 11.7838], kind: 'int' },
  { id: 'I_SHR', rect: [11.70, 6.5784, 11.75, 7.8738], kind: 'int' },

  // ---- service cores (sealed) ----
  { id: 'CORE1', rect: [5.9674, 9.4978, 6.4484, 11.7838], kind: 'core' },
  { id: 'CORE2', rect: [6.4484, 9.232, 7.9724, 10.2598], kind: 'core' },

  // ---- RCC columns that project beyond wall lines ----
  { id: 'COL_C', rect: [0.93, 11.58, 1.46, 11.7838], kind: 'column' },
  { id: 'COL_G', rect: [4.06, 11.60, 4.4958, 11.7838], kind: 'column' },
  { id: 'COL_D', rect: [1.10, 8.1262, 1.85, 8.29], kind: 'column' },
  { id: 'COL_F', rect: [3.4678, 3.60, 4.10, 4.0116], kind: 'column' },
  { id: 'COL_J', rect: [6.4784, 0.6, 6.80, 1.75], kind: 'column' }, // closes the gap behind the south counter
  { id: 'COL_I', rect: [7.98, 0, 8.58, 1.15], kind: 'column' }, // drawn column, tied back to the south wall as a stone pier
  { id: 'COL_K', rect: [9.65, 3.6965, 9.9328, 4.0116], kind: 'column' },
  { id: 'COL_M', rect: [10.5646, 7.9738, 10.80, 8.12], kind: 'column' },
  { id: 'COL_SW', rect: [-0.15, 0.95, 0.12, 1.143], kind: 'column' },
];

// ---------------------------------------------------------------------
// OPENINGS
// ---------------------------------------------------------------------
const DH = 2.1;
export const openings: Opening[] = [
  // windows / vents
  { id: 'o_mbed_win', wall: 'E_W', a: 1.95, b: 3.65, sill: 1.25, head: DH, kind: 'window', room: 'mbed' },
  { id: 'o_mt_vent', wall: 'E_W', a: 5.75, b: 6.30, sill: 1.6, head: 2.15, kind: 'vent', room: 'mtoilet' },
  { id: 'o_ct_vent', wall: 'E_W', a: 7.20, b: 7.75, sill: 1.6, head: 2.15, kind: 'vent', room: 'ctoilet' },
  { id: 'o_chbed_winw', wall: 'E_W', a: 9.35, b: 10.95, sill: 1.25, head: DH, kind: 'window', room: 'chbed' },
  { id: 'o_chbed_winn', wall: 'E_N', a: 1.60, b: 3.95, sill: 0.45, head: DH, kind: 'window', room: 'chbed' },
  { id: 'o_office_win', wall: 'E_N', a: 10.95, b: 13.25, sill: 0.75, head: DH, kind: 'window', room: 'office' },
  { id: 'o_wash_jaali', wall: 'E_S', a: 3.95, b: 5.75, sill: 0.85, head: DH, kind: 'jaali', room: 'washing' },
  { id: 'o_kit_win_s', wall: 'E_S', a: 6.82, b: 7.86, sill: 1.05, head: DH, kind: 'window', room: 'kitchen' },
  { id: 'o_kit_win_e', wall: 'E_E', a: 2.55, b: 3.30, sill: 1.1, head: DH, kind: 'window', room: 'kitchen' },
  { id: 'o_deo_win', wall: 'E_DS', a: 12.15, b: 12.80, sill: 1.2, head: 2.0, kind: 'window', room: 'deoghar' },
  { id: 'o_duct_louvre', wall: 'I_DE', a: 10.55, b: 11.45, sill: 0.4, head: 2.3, kind: 'louvre', room: 'duct' },
  { id: 'o_lift', wall: 'I_LE', a: 8.0, b: 8.9, sill: 0, head: DH, kind: 'lift', room: 'lift' },

  // doors
  { id: 'o_main', wall: 'I_TV', a: 9.0, b: 9.95, sill: 0, head: DH, kind: 'door' },
  { id: 'o_mbed_bal', wall: 'E_SMB', a: 0.70, b: 2.55, sill: 0, head: DH, kind: 'door' },
  { id: 'o_hall_bal', wall: 'W_BD', a: 4.55, b: 6.35, sill: 0, head: DH, kind: 'door' },
  { id: 'o_office_bal', wall: 'E_OE', a: 9.43, b: 10.43, sill: 0, head: DH, kind: 'door' },
  { id: 'o_mt', wall: 'I_TE', a: 5.36, b: 6.14, sill: 0, head: DH, kind: 'door' },
  { id: 'o_ct', wall: 'I_TE', a: 7.16, b: 7.94, sill: 0, head: DH, kind: 'door' },
  { id: 'o_mbed', wall: 'I_MBD', a: 2.44, b: 3.30, sill: 0, head: DH, kind: 'door' },
  { id: 'o_chbed', wall: 'I_CBS', a: 2.47, b: 3.30, sill: 0, head: DH, kind: 'door' },
  { id: 'o_chrm', wall: 'I_CRW', a: 8.33, b: 9.13, sill: 0, head: DH, kind: 'door' },
  { id: 'o_cht', wall: 'I_CRN', a: 4.68, b: 5.46, sill: 0, head: DH, kind: 'door' },
  { id: 'o_wash', wall: 'I_WN', a: 4.25, b: 5.55, sill: 0, head: DH, kind: 'door' },
  { id: 'o_office_foyer', wall: 'E_OS', a: 10.85, b: 11.70, sill: 0, head: DH, kind: 'door' },
  { id: 'o_office_pass', wall: 'I_PE', a: 8.15, b: 8.927, sill: 0, head: DH, kind: 'door' },
  { id: 'o_shrine', wall: 'I_SHR', a: 6.60, b: 7.85, sill: 0, head: DH, kind: 'door' },
];

// ---------------------------------------------------------------------
// OPERABLE DOORS
// ---------------------------------------------------------------------
export const doors: DoorSpec[] = [
  { id: 'd_main', opening: 'o_main', type: 'hinged', side: -1, hingeAt: 'a', leaf: 'solid-walnut', label: 'Main entrance', startOpen: true },
  { id: 'd_mbed_bal', opening: 'o_mbed_bal', type: 'slide-bypass', side: -1, leaf: 'clear-glass', label: 'M.Bed balcony door' },
  { id: 'd_hall_bal', opening: 'o_hall_bal', type: 'slide-bypass', side: -1, leaf: 'clear-glass', label: 'Hall balcony door', startOpen: false },
  { id: 'd_office_bal', opening: 'o_office_bal', type: 'slide1', side: -1, park: 1, track: 0.03, leaf: 'clear-glass', label: 'Office balcony door' },
  { id: 'd_mt', opening: 'o_mt', type: 'slide1', side: 1, park: 1, track: 0.025, leaf: 'fluted-glass', label: 'M.Bed toilet' },
  { id: 'd_ct', opening: 'o_ct', type: 'slide1', side: 1, park: -1, track: 0.075, leaf: 'fluted-glass', label: 'Common toilet' },
  { id: 'd_mbed', opening: 'o_mbed', type: 'slide1', side: -1, park: -1, track: 0.03, leaf: 'oak-panel', label: 'Master bedroom' },
  { id: 'd_chbed', opening: 'o_chbed', type: 'slide1', side: 1, park: 1, track: 0.03, leaf: 'oak-panel', label: "Children's bedroom" },
  { id: 'd_chrm', opening: 'o_chrm', type: 'slide1', side: -1, park: 1, track: 0.03, leaf: 'taupe-panel', label: 'Dressing room' },
  { id: 'd_cht', opening: 'o_cht', type: 'slide1', side: -1, park: 1, track: 0.03, leaf: 'fluted-glass', label: "Children's toilet" },
  { id: 'd_wash', opening: 'o_wash', type: 'slide-biparting', side: 1, track: 0.03, leaf: 'fluted-glass', label: 'Washing area' },
  { id: 'd_office_foyer', opening: 'o_office_foyer', type: 'hinged', side: 1, hingeAt: 'a', leaf: 'oak-panel', label: 'Office', startOpen: true },
  { id: 'd_office_pass', opening: 'o_office_pass', type: 'slide1', side: 1, park: 1, track: 0.03, leaf: 'oak-panel', label: 'Office (lobby door)' },
  { id: 'd_shrine', opening: 'o_shrine', type: 'double-hinged', side: 1, leaf: 'jaali', label: 'Deoghar' },
];

// ---------------------------------------------------------------------
// ROOMS / LABELLED ZONES  (required = [E-W, N-S] clear, from the drawing)
// ---------------------------------------------------------------------
export const rooms: Room[] = [
  { id: 'chbed', name: 'CH. BED', label: `14'9" x 12'0"`, required: [ft(14, 9), ft(12, 0)], rect: [0, 8.1262, 4.4958, 11.7838], open: false, enterable: true, ceiling: 2.9, teleportKey: 5 },
  { id: 'chrm', name: 'CH. RM (Dressing)', label: `5'9" x 5'3"`, required: [ft(5, 9), ft(5, 3)], rect: [4.5958, 7.708, 6.3484, 9.3082], open: false, enterable: true, ceiling: 2.75 },
  { id: 'chtoilet', name: 'CH. BED TOILET', label: `7'6" x 4'6"`, required: [ft(4, 6), ft(7, 6)], axisNote: 'drawn taller (N-S) than wide; 7\'6" assigned to N-S to fit linework', rect: [4.5958, 9.4978, 5.9674, 11.7838], open: false, enterable: true, ceiling: 2.45 },
  { id: 'ctoilet', name: 'C. TOILET', label: `7'6" x 4'0"`, required: [ft(7, 6), ft(4, 0)], rect: [0, 6.792, 2.286, 8.0112], open: false, enterable: true, ceiling: 2.45 },
  { id: 'mtoilet', name: 'M. BED TOILET', label: `7'6" x 4'6"`, required: [ft(7, 6), ft(4, 6)], rect: [0, 5.3204, 2.286, 6.692], open: false, enterable: true, ceiling: 2.45 },
  { id: 'mbed', name: 'M. BED', label: `11'0" x 13'0"`, required: [ft(11, 0), ft(13, 0)], rect: [0, 1.258, 3.3528, 5.2204], open: false, enterable: true, ceiling: 2.9, teleportKey: 4 },
  { id: 'mbedbal', name: 'M. BED BALCONY', label: `11'3" x 3'9"`, required: [ft(11, 3), ft(3, 9)], rect: [-0.0762, 0, 3.3528, 1.143], open: false, enterable: true, ceiling: 2.9 },
  { id: 'hall', name: 'HALL', label: `18'7" x 11'9"`, required: [ft(18, 7), ft(11, 9)], rect: [4.2686, 4.0116, 9.9328, 7.593], open: true, enterable: true, ceiling: 2.9, teleportKey: 2 },
  { id: 'dining', name: 'DINING', label: `11'6" x 8'7"`, required: [ft(11, 6), ft(8, 7)], rect: [3.4678, 1.3954, 6.973, 4.0116], open: true, enterable: true, ceiling: 2.9, teleportKey: 3 },
  { id: 'kitchen', name: 'KITCHEN', label: `11'4" x 12'3"`, required: [ft(11, 4), ft(12, 3)], rect: [6.4784, 0, 9.9328, 3.7338], open: true, enterable: true, ceiling: 2.9, teleportKey: 6 },
  { id: 'washing', name: 'WASHING', label: `9'6" x 4'3"`, required: [ft(9, 6), ft(4, 3)], rect: [3.4678, 0, 6.3634, 1.2954], open: false, enterable: true, ceiling: 2.75 },
  { id: 'hallbal', name: 'HALL BALCONY', label: `5'3" x 8'9"`, required: [ft(5, 3), ft(8, 9)], rect: [10.0478, 3.8115, 11.648, 6.4784], open: false, enterable: true, ceiling: 2.9, teleportKey: 9 },
  { id: 'deoghar', name: 'DEOGHAR', label: `8'3" x 4'3"`, required: [ft(8, 3), ft(4, 3)], rect: [10.5646, 6.5784, 13.0792, 7.8738], open: true, enterable: true, ceiling: 2.9, teleportKey: 8 },
  { id: 'office', name: 'OFFICE', label: `10'0" x 12'6"`, required: [ft(10, 0), ft(12, 6)], rect: [10.5646, 7.9738, 13.6126, 11.7838], open: false, enterable: true, ceiling: 2.9, teleportKey: 7 },
  { id: 'officebal', name: 'OFFICE BALCONY', label: `3'3" x 3'9"`, required: [ft(3, 3), ft(3, 9)], axisNote: 'clear zone between built-in planter beds', rect: [13.7626, 9.36, 14.7532, 10.503], open: true, enterable: true, ceiling: 2.9 },
  { id: 'passage', name: 'PASSAGE', label: `7'9" x 4'0"`, required: [ft(7, 9), ft(4, 0)], rect: [8.0874, 7.708, 10.4496, 8.9272], open: true, enterable: true, ceiling: 2.9, teleportKey: 1 },
  { id: 'lift', name: 'LIFT', label: `5'0" x 5'0"`, required: [ft(5, 0), ft(5, 0)], rect: [6.4484, 7.708, 7.9724, 9.232], open: false, enterable: false, ceiling: 2.9 },
  { id: 'duct', name: 'DUCT', label: `5'0" x 5'0"`, required: [ft(5, 0), ft(5, 0)], rect: [6.4484, 10.2598, 7.9724, 11.7838], open: false, enterable: false, ceiling: 2.9 },
  // unlabelled circulation / support spaces
  { id: 'corridor', name: 'CORRIDOR', rect: [2.386, 5.3204, 3.3528, 8.0112], open: true, enterable: true, ceiling: 2.75 },
  { id: 'foyer', name: 'ENTRY FOYER', rect: [9.9328, 6.5784, 10.5646, 7.593], open: true, enterable: true, ceiling: 2.9 },
  { id: 'shrine', name: 'DEOGHAR (SHRINE)', rect: [11.75, 6.5784, 13.0792, 7.8738], open: false, enterable: true, ceiling: 2.9 },
  { id: 'stair', name: 'STAIRCASE', rect: [8.0874, 8.9272, 10.4496, 11.7838], open: true, enterable: false, ceiling: 2.9 },
];

// ---------------------------------------------------------------------
// FLOOR FINISH REGIONS (must not overlap — validated)
// ---------------------------------------------------------------------
export type FloorMat = 'porcelain' | 'oak' | 'bathStone' | 'utility' | 'balcony' | 'marble' | 'lobby' | 'threshold';
export const floors: { id: string; rect: Rect; mat: FloorMat; y?: number; room?: string }[] = [
  { id: 'f_mbed', rect: [0, 1.258, 3.3528, 5.2204], mat: 'oak', room: 'mbed' },
  { id: 'f_chbed', rect: [0, 8.1262, 4.4958, 11.7838], mat: 'oak', room: 'chbed' },
  { id: 'f_chrm', rect: [4.5958, 7.708, 6.3484, 9.3082], mat: 'oak', room: 'chbed' },
  { id: 'f_office', rect: [10.5646, 7.9738, 13.6126, 11.7838], mat: 'oak', room: 'office' },
  { id: 'f_mt', rect: [0, 5.3204, 2.286, 6.692], mat: 'bathStone', y: -0.012, room: 'mtoilet' },
  { id: 'f_ct', rect: [0, 6.792, 2.286, 8.0112], mat: 'bathStone', y: -0.012, room: 'ctoilet' },
  { id: 'f_cht', rect: [4.5958, 9.4978, 5.9674, 11.7838], mat: 'bathStone', y: -0.012, room: 'chtoilet' },
  { id: 'f_corr', rect: [2.386, 5.3204, 3.3528, 8.0112], mat: 'porcelain', room: 'corridor' },
  { id: 'f_link', rect: [3.3528, 6.70, 4.2686, 7.593], mat: 'porcelain', room: 'corridor' },
  { id: 'f_dining', rect: [3.4678, 1.3954, 6.4784, 4.0116], mat: 'porcelain', room: 'dining' },
  { id: 'f_hallW', rect: [3.4678, 4.0116, 4.2686, 6.70], mat: 'porcelain', room: 'hall' },
  { id: 'f_hall', rect: [4.2686, 4.0116, 9.9328, 7.593], mat: 'porcelain', room: 'hall' },
  { id: 'f_kitchen', rect: [6.4784, 0, 9.9328, 4.0116], mat: 'porcelain', room: 'kitchen' },
  { id: 'f_foyer', rect: [9.9328, 6.5784, 10.5646, 7.593], mat: 'porcelain', room: 'entry' },
  { id: 'f_deoW', rect: [10.5646, 6.5784, 11.70, 7.8738], mat: 'porcelain', room: 'entry' },
  { id: 'f_shrine', rect: [11.70, 6.5784, 13.0792, 7.8738], mat: 'marble', room: 'shrine' },
  { id: 'f_wash', rect: [3.4678, 0, 6.3634, 1.2954], mat: 'utility', y: -0.01, room: 'washing' },
  { id: 'f_mbal', rect: [-0.0762, 0, 3.3528, 1.143], mat: 'balcony', y: -0.02, room: 'mbedbal' },
  { id: 'f_hbal', rect: [10.0478, 3.8115, 11.648, 6.4784], mat: 'balcony', y: -0.02, room: 'hallbal' },
  { id: 'f_obal', rect: [13.7626, 7.8738, 14.7532, 11.7838], mat: 'balcony', y: -0.02, room: 'officebal' },
  { id: 'f_pass', rect: [8.0874, 7.708, 10.4496, 8.9272], mat: 'lobby', room: 'passage' },
];

// Glass balustrades at balcony edges
export const railings: { id: string; a: [number, number]; b: [number, number] }[] = [
  { id: 'r_mbal_s', a: [-0.0762, 0], b: [3.3528, 0] },
  { id: 'r_mbal_w', a: [-0.0762, 0], b: [-0.0762, 0.95] },
  { id: 'r_hbal_e', a: [11.648, 3.8115], b: [11.648, 6.4784] },
  { id: 'r_hbal_s', a: [10.0478, 3.8115], b: [11.648, 3.8115] },
  { id: 'r_obal_e', a: [14.7532, 7.8738], b: [14.7532, 11.7838] },
  { id: 'r_obal_s', a: [13.7626, 7.8738], b: [14.7532, 7.8738] },
];

// Staircase (common stair, dog-leg). UP flight west, DN flight east.
export const stair = {
  rect: [8.0874, 8.9272, 10.4496, 11.7838] as Rect,
  flightWidth: 1.106,
  wellWidth: 0.15,
  riser: 3.15 / 18, // 18 risers floor-to-floor
  tread: 0.24,
  risersPerFlight: 9,
  startY: 8.9272, // first riser line (passage edge)
  landingY: 8.9272 + 8 * 0.24, // 10.8472
};

export const spawn = { x: 9.48, y: 8.55, yawDeg: 180 }; // passage, facing the main door (south)

// Plan-overlay labels (P key) — label anchor positions taken from the drawing
export const labelAnchors: Record<string, [number, number]> = {
  chbed: [1.7, 10.4], chrm: [5.45, 8.6], chtoilet: [5.25, 10.6], ctoilet: [1.1, 7.4], mtoilet: [1.1, 6.0],
  mbed: [1.6, 3.2], mbedbal: [1.6, 0.55], hall: [6.9, 6.3], dining: [4.9, 2.7], kitchen: [8.2, 2.1],
  washing: [5.0, 0.65], hallbal: [10.85, 5.2], deoghar: [11.8, 7.2], office: [12.1, 9.9], officebal: [14.25, 9.93],
  passage: [9.2, 8.3], lift: [7.2, 8.45], duct: [7.2, 11.0],
};
