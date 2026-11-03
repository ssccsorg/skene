// The kit a deployment draws one thing of its own with, kept at the frame's own address.
//
// A deployment supplies a brand, a board and a host, and normally draws nothing: every panel, reading and control is the
// frame's. The exception is a form the deployment owns, such as the one that connects its own room, and a form drawn in
// another idiom is a second design system in one window. The kit itself is `@ssccsorg/skene-ui`, and this re-exports the
// pieces a form needs so that a deployment which already names the frame has one address to reach for.
export { Button, buttonVariants } from '@ssccsorg/skene-ui';
export { Separator } from '@ssccsorg/skene-ui';
export { cn } from '@ssccsorg/skene-ui';
export { BAR_INSET, LABEL, ROW, ROW_SHAPE, TITLE } from '@ssccsorg/skene-ui';
