import { createContext, useContext, type ComponentType, type ReactNode } from 'react';
import type { KindWords } from '@ssccsorg/skene-kernel';

/**
 * What the frame is called, and the mark it draws.
 *
 * The frame is one product's surface only by the brand it is handed: the name in the bar, the version beside it, the
 * layers the card under the mark says the surface is over, and the mark itself. Everything else about a deployment is
 * data, so a second product is a brand and a board rather than a second frame.
 */
export interface Brand {
  /** What the bar carries, as it is drawn. */
  title: string;
  /** What the frame is called under the mark, which is what its card is headed. */
  name: string;
  version: string;
  /**
   * What this deployment calls the three kinds of record, which is what its projects inherit.
   *
   * The format's names for its three kinds are the engine's, and a product drawn for a domain names them its own way. A
   * project may say its own over these, because two domains on one board are two vocabularies over one model.
   */
  words?: KindWords;
  /**
   * What the deployment can do, when that is not everything: `read-only` on a board served from a committed run.
   *
   * It is a statement about this deployment rather than about the frame, so it is the brand's to carry and the bar
   * draws it beside the version.
   */
  status?: string;
  /**
   * A line the deployment says about itself, drawn after the status on the same bar.
   *
   * A demonstration that renders records is one reading of them, so it says what it is here rather than leaving a reader
   * to take the screen for the model. The frame draws the words and knows nothing about what they mean.
   */
  note?: string;
  /**
   * What the deployment is, as lines, drawn under the name when the card opens.
   *
   * A view that is not the infrastructure it runs on has to say so where a reader looks before reading the screen. The
   * frame draws the lines and knows nothing about what they mean; a brand that states none has the stack drawn alone.
   */
  about?: string[];
  /** The layers the surface is over, read bottom up. */
  layers: string[];
  /** The mark, drawn where a place puts one beside a name. */
  Mark: ComponentType<{ className?: string }>;
  /**
   * The same mark as one path in `viewBox` units.
   *
   * A reading that draws the mark as geometry rather than as an element needs the path and the box it is in, and
   * taking them from the brand is what keeps the drawing and the favicon one drawing.
   */
  mark: { path: string; viewBox: number };
}

const Context = createContext<Brand | null>(null);

export function BrandProvider({ brand, children }: { brand: Brand; children: ReactNode }) {
  return <Context.Provider value={brand}>{children}</Context.Provider>;
}

/** The brand in force. A frame drawn without one is a frame with no name, which is a mistake rather than a default. */
export function useBrand(): Brand {
  const brand = useContext(Context);
  if (!brand) throw new Error('the frame was drawn without a brand');
  return brand;
}

/** The brand's mark, drawn wherever a place wants one and does not want to know which product it is. */
export function BrandMark({ className }: { className?: string }) {
  const { Mark } = useBrand();
  return <Mark className={className} />;
}
