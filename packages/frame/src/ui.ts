// The frame's own kit, for a deployment that has to draw one thing of its own.
//
// A deployment supplies a brand, a board and a host, and normally draws nothing: every panel, reading and control is
// the frame's. The exception is a form the deployment owns, such as the one that connects its own room, and a form
// drawn in another idiom is a second design system in one window. These are the pieces it needs to match, and they
// are exported so that matching is a use rather than a copy.

export { Button, buttonVariants } from './components/ui/button';
export { Separator } from './components/ui/separator';
export { cn } from './lib/utils';
export { BAR_INSET, LABEL, ROW, ROW_SHAPE, TITLE } from './lib/chrome';
