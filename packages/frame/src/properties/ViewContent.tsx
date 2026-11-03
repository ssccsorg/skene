// What a member's view draws under its row, which is the kind's own body.
//
// This used to be a table of three bodies, one per kind, and the table is the register now: a kind says what its row
// draws, and the frame draws whatever the kind it was declared as supplied. What is left here is the one answer the frame
// still owes a kind it cannot draw, which is its name rather than a blank space.

import { viewKindOf, type WindowRow } from '../lib/view-kinds';

export type ViewContentProps = WindowRow;

/** The body of one view, which is the registered kind's own. */
export function ViewContent(props: ViewContentProps) {
  const Body = viewKindOf(props.view.kind)?.Row;
  if (Body) return <Body {...props} />;
  const named = props.view.kind === 'unknown' ? props.view.declared : props.view.kind;
  return (
    <p data-region="shows-undrawable" className="text-[11.5px] text-muted-foreground">
      this build does not draw a {named} view
    </p>
  );
}
