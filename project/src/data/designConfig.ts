// Vertical and global design values the PDF cannot provide.
// Every value here is an assumption, documented in reports/DESIGN_ASSUMPTIONS.md.

export const FT = 0.3048;
export const IN = 0.0254;

export const designConfig = {
  // Plan scale fitted by least squares against labelled rooms (PDF points -> metres).
  planScaleMetresPerPoint: 0.0311,

  floorToFloor: 3.15, // structural floor-to-floor
  wallHeight: 2.9, // walls rise to finished main ceiling plane
  ceilingMain: 2.9, // finished false-ceiling height in living spaces
  coveDrop: 0.1, // perimeter cove drop (100 mm)
  coveWidth: 0.42, // width of the perimeter cove band
  ceilingToilet: 2.45,
  ceilingBalcony: 2.9,
  doorHead: 2.1,
  windowSill: 0.9,
  windowHead: 2.1,
  highSill: 1.25, // windows behind bed headboards
  ventSill: 1.6,
  slabThickness: 0.15,
  thresholdHeight: 0.012,
  balconyDrop: 0.02, // balcony finished floor slightly below interior
  railingHeight: 1.05,

  eyeHeight: 1.65,
  playerRadius: 0.25,
  walkSpeed: 1.55,
  sprintSpeed: 3.0,

  // Site: Dhule, Maharashtra. North = top of the upright plan.
  latitude: 20.9,
  longitude: 74.8,
  // Day scene sun: late-morning winter-ish sun from south-east.
  sunAzimuthDeg: 140, // degrees clockwise from north
  sunElevationDeg: 42,

  maxPixelRatio: 1.6,
  shadowMapSize: 2048,
};

export type DesignConfig = typeof designConfig;
