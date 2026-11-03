// The shapes a member is drawn as.
//
// A glyph is what the space says a member looks like, in the space's own ink: a folder, a machine, a person. It is the
// board's vocabulary rather than the run's, so it lives beside the projection that places it.
const AIRFRAME: [string, Record<string, number | string>][] = [
  ['path', { d: 'M3.4 4.4h2.2L8 8l2.4-3.6h2.2' }],
  ['path', { d: 'M8 8v4.4M6.2 12.8h3.6' }],
  ['circle', { cx: 2.7, cy: 4, r: 1.7 }],
  ['circle', { cx: 13.3, cy: 4, r: 1.7 }],
];

/** A wheel with the body it carries, which is what tells a rover from a crawler from a hauler. */
const WHEEL: [string, Record<string, number | string>][] = [
  ['circle', { cx: 8, cy: 8, r: 5.2 }],
  ['circle', { cx: 8, cy: 8, r: 1.3 }],
  ['path', { d: 'M8 2.8v2.5M8 10.7v2.5M2.8 8h2.5M10.7 8h2.5' }],
];

export const GLYPHS: Record<string, [string, Record<string, number | string>][]> = {
  workspace: [
    ['path', { d: 'M2.2 5.4c0-.7.5-1.2 1.2-1.2h3l1.5 1.7h5.7c.7 0 1.2.5 1.2 1.2v6c0 .7-.5 1.2-1.2 1.2H3.4c-.7 0-1.2-.5-1.2-1.2z' }],
    ['path', { d: 'M2.2 8.3h11.6' }],
  ],
  machine: [
    ['circle', { cx: 8, cy: 8, r: 3.4 }],
    [
      'path',
      {
        d: 'M8 1.6v2.3M8 12.1v2.3M1.6 8h2.3M12.1 8h2.3M3.5 3.5l1.6 1.6M10.9 10.9l1.6 1.6M12.5 3.5l-1.6 1.6M5.1 10.9l-1.6 1.6',
      },
    ],
  ],
  arm: [
    ['path', { d: 'M2.8 13.4h4.6M5.1 13.4V8.6l3.4-2.6' }],
    ['rect', { x: 8.6, y: 2.6, width: 4.8, height: 4.8, rx: 1.3 }],
  ],
  // A hexapod: six legs off one body, and the head standing clear of it. The legs are drawn as the two joints they
  // are, because what a walker is recognised by is the count of them rather than the shape of any one.
  spider: [
    ['ellipse', { cx: 8, cy: 9.2, rx: 3.3, ry: 2.3 }],
    ['circle', { cx: 8, cy: 4.4, r: 1.5 }],
    ['path', { d: 'M4.9 8.2 2.4 6.1M4.7 9.4H1.4M4.9 10.6 2.4 12.7M11.1 8.2 13.6 6.1M11.3 9.4h3.3M11.1 10.6 13.6 12.7' }],
  ],
  sensor: [
    ['rect', { x: 3.2, y: 3.2, width: 9.6, height: 9.6, rx: 2.4 }],
    ['circle', { cx: 8, cy: 8, r: 2.1 }],
  ],
  wheel: WHEEL,
  rover: [...WHEEL, ['rect', { x: 5.2, y: 3.4, width: 5.6, height: 2.4, rx: 0.8 }]],
  crawler: [...WHEEL, ['path', { d: 'M4 3.2h8M4 4.8h8' }]],
  hauler: [...WHEEL, ['rect', { x: 4.4, y: 3, width: 7.2, height: 3.2, rx: 0.6 }]],
  drone: AIRFRAME,
  scout: [...AIRFRAME, ['circle', { cx: 8, cy: 10.8, r: 1.1 }]],
  thermal: [...AIRFRAME, ['circle', { cx: 8, cy: 10.6, r: 1.7 }], ['path', { d: 'M8 9.6v2' }]],
  relay: [...AIRFRAME, ['path', { d: 'M5.8 2.6a3 3 0 0 1 4.4 0' }], ['path', { d: 'M4.2 1.2a5.4 5.4 0 0 1 7.6 0' }]],
  survey: [...AIRFRAME, ['path', { d: 'M5.4 10.2h5.2M5.4 12h5.2' }]],
  photo: [...AIRFRAME, ['rect', { x: 6.2, y: 9.4, width: 3.6, height: 2.6, rx: 0.6 }], ['circle', { cx: 8, cy: 10.7, r: 0.8 }]],
  boat: [
    ['path', { d: 'M2.4 8.6h11.2l-1.4 4H3.8z' }],
    ['path', { d: 'M5.5 8.6V5.2h5v3.4M8 5.2V2.5' }],
    ['path', { d: 'M1.6 14.2c1 .6 2 .6 3 0s2-.6 3 0 2 .6 3 0 2-.6 3 0' }],
  ],
  auv: [
    ['ellipse', { cx: 8, cy: 8.4, rx: 5, ry: 2.4 }],
    ['path', { d: 'M6 6V3.4h3.2V6' }],
    ['path', { d: 'M3 10.8h10' }],
  ],
  person: [
    ['circle', { cx: 8, cy: 5.2, r: 2.4 }],
    ['path', { d: 'M3.5 13.6c0-2.7 2-4.3 4.5-4.3s4.5 1.6 4.5 4.3' }],
  ],
  belt: [
    ['circle', { cx: 4, cy: 11, r: 2.1 }],
    ['circle', { cx: 12, cy: 11, r: 2.1 }],
    ['path', { d: 'M4 8.9h8M5.6 8.9V6.3h4.8v2.6' }],
  ],
  camera: [
    ['rect', { x: 2, y: 4.6, width: 12, height: 8, rx: 1.6 }],
    ['circle', { cx: 8, cy: 8.6, r: 2.4 }],
    ['path', { d: 'M6 4.6l1-2.2h2l1 2.2' }],
  ],
  console: [
    ['rect', { x: 2.2, y: 3, width: 11.6, height: 8, rx: 1.4 }],
    ['path', { d: 'M8 11v2.2M5.4 13.2h5.2M4.6 5.6h6.8M4.6 8.2h4' }],
  ],
  history: [
    ['ellipse', { cx: 8, cy: 4.4, rx: 4.6, ry: 1.9 }],
    ['path', { d: 'M3.4 4.4v7.2c0 1 2.1 1.9 4.6 1.9s4.6-.9 4.6-1.9V4.4' }],
    ['path', { d: 'M3.4 8c0 1 2.1 1.9 4.6 1.9s4.6-.9 4.6-1.9' }],
  ],
  pump: [
    ['circle', { cx: 7, cy: 9.4, r: 3.4 }],
    ['path', { d: 'M7 9.4l1.9-2.2M10.4 9.4h3.2M3.6 9.4H1.2M7 3.4v2.6' }],
  ],
  station: [
    ['path', { d: 'M8 13.6V6.4M4.6 13.6h6.8' }],
    ['path', { d: 'M4.4 6.2a5 5 0 0 1 7.2 0' }],
    ['circle', { cx: 8, cy: 5, r: 1.3 }],
  ],
  // A body with two panels and the antenna it downlinks on: the one shape that says a unit is above the ground rather
  // than on it.
  satellite: [
    ['rect', { x: 6.4, y: 6.2, width: 3.2, height: 3.6, rx: 0.8 }],
    ['path', { d: 'M8 6.2V3.4M8 9.8v2.8' }],
    ['rect', { x: 1.6, y: 6.8, width: 2.8, height: 2.4, rx: 0.4 }],
    ['rect', { x: 11.6, y: 6.8, width: 2.8, height: 2.4, rx: 0.4 }],
    ['path', { d: 'M4.4 8h2M9.6 8h2' }],
  ],
  store: [
    ['ellipse', { cx: 8, cy: 4, rx: 5, ry: 1.9 }],
    ['path', { d: 'M3 4v8c0 1 2.2 1.9 5 1.9s5-.9 5-1.9V4' }],
    ['path', { d: 'M3 8c0 1 2.2 1.9 5 1.9s5-.9 5-1.9' }],
  ],
};

/**
 * The glyph for a unit: the shape the place named, and what the record makes of the entity otherwise.
 *
 * It is the frame's own font and not a statement about a kind, so a project composes a kind in its bundle and picks
 * the drawing here by the same name. A name the font has never drawn falls back to the direction the record puts the
 * unit in, which is the one reading available when the place says nothing.
 */

/**
 * The shapes a member is drawn as, from what the place says it is.
 *
 * A place that names no shape still stands for something, so the role decides: a machine that acts is an arm and one that
 * reports is a sensor.
 */
export function glyphOf(icon: string | null | undefined, role: string | null | undefined) {
  return GLYPHS[icon ?? ''] ?? GLYPHS[role === 'acts' ? 'arm' : 'sensor'];
}
