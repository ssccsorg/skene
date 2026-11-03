// The space's own geometry: where a thing stands, how it projects, and what it is drawn as.
//
// A payload presented spatially is presented in these terms. The board holds no run and no store: it answers a bearing,
// a point on the shell, a fitted frame, the patch a window covers, and the glyph a member is drawn by, so the cockpit,
// the two kind packages and the frame's own readings all place things the same way.
export * from './board';
export * from './board-geometry';
export * from './views';
export * from './map';
export * from './glyphs';
