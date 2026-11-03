import { GLYPHS, glyphOf } from '../lib/world';
import { cn } from '@ssccsorg/skene-ui';

/** One unit's glyph, drawn as SVG rather than typed as a character. */
export function Glyph({
  icon,
  role,
  className,
}: {
  icon?: string | null;
  role?: string | null;
  className?: string;
}) {
  const shapes = glyphOf(icon, role);
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={cn('size-4 shrink-0 fill-none stroke-current [stroke-width:1.3]', className)}
    >
      {shapes.map(([tag, attributes], index) => {
        const Shape = tag as keyof typeof GLYPHS;
        return <Shape key={index} {...attributes} />;
      })}
    </svg>
  );
}
