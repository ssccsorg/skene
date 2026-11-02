// The page's own tokens, turned into something three.js can hold.
//
// The dashboard's colours are declared once, as `oklch()` custom properties in the stylesheet, because
// that is what the DOM and the SVG both want. three.js holds no such colour: `new THREE.Color('oklch(…)'`
// logs "Unknown color model" and leaves the colour at its default, which is white. A board drawn that
// way has white points whatever the token says, which is a picture that disagrees with the legend
// beside it.
//
// So the conversion lives here: the four tokens stay the one source, and the board reads them through
// this. The maths is Björn Ottosson's, the same one the CSS colour specification carries.

/** The oklch components of a token, or null when it is not one. */
function parseOklch(text: string): [number, number, number] | null {
  const match = /^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(?:deg)?\s*(?:\/.*)?\)$/.exec(text.trim());
  if (!match) return null;
  const read = (value: string, scale: number) =>
    value.endsWith('%') ? (Number(value.slice(0, -1)) / 100) * scale : Number(value);
  return [read(match[1], 1), read(match[2], 0.4), Number(match[3])];
}

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

/** One gamma-encoded channel, 0 to 255. */
function channel(linear: number): number {
  const encoded = linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;
  return Math.round(clamp(encoded) * 255);
}

/** oklch to sRGB as `#rrggbb`, or null when the text is not an oklch colour. */
export function oklchToHex(text: string): string | null {
  const parsed = parseOklch(text);
  if (!parsed) return null;
  const [lightness, chroma, hue] = parsed;
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);

  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const red = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const green = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const blue = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const hex = (value: number) => channel(value).toString(16).padStart(2, '0');
  return `#${hex(red)}${hex(green)}${hex(blue)}`;
}

/** A colour three.js can hold: an oklch token resolved, and anything else passed through. */
export function readableColour(text: string, fallback: string): string {
  if (!text) return fallback;
  return oklchToHex(text) ?? text;
}
