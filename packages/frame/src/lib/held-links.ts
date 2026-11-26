// What a press on a member's held element does, as the place that stands the member decides it.
//
// A held element is an address, not a record: the frame knows a member holds lower elements and that they stand at a
// path, and what that path means is the room's own vocabulary. A directory is a level the tree opens, and a file is a
// thing a reader reads, so the tree's leaf is a row that has to lead somewhere. Where it leads is not the same everywhere:
// a cockpit's file opens in the reader the deployment installs, a record board's row is a record the space holds, and a
// room that keeps files a browser can show opens them at the room's own address.
//
// So a deployment installs one here and the frame draws the press it answers. A place that installs none keeps the tree
// the frame has always drawn: a leaf is read as the address it is, and there is nothing to press.

import type { PartProps } from './kinds';

/** What a held element is, as a press asks it: where it stands, whose it is, and whether it is a level or a leaf. */
export interface HeldElement {
  /** The address the room answered with, which leads with the member it belongs to. */
  address: string;
  /** The member the element is held by, which is the name a reader resolves the address through. */
  member: PartProps['member'];
}

export interface HeldLink {
  /** The name a deployment writes when it installs the link, so two of them in one build are told apart. */
  key: string;
  /** What the press is called where a reader is told what a row does, and what its accessible name says. */
  label: string;
  /**
   * Where the element leads, or null when this build has nowhere to send it.
   *
   * A null is not a failure: a file this deployment does not draw is a row a reader reads, which is what the frame draws
   * for a place that installs no link at all. What a link that answers null must not do is send a reader to an address
   * that shows them nothing.
   */
  to: (element: HeldElement) => string | null;
}

const registered = new Map<string, HeldLink>();

/** Install a link, where the module that knows the place's own vocabulary is written. */
export function registerHeldLink(link: HeldLink): HeldLink {
  registered.set(link.key, link);
  return link;
}

/** Every link this build holds, in the order they were installed. */
export function heldLinks(): HeldLink[] {
  return [...registered.values()];
}

/**
 * Where a held element leads: the first installed link that has somewhere to send it, or null.
 *
 * The links are asked in order because a deployment may install several and a row is one press: the first that answers is
 * the press, and one that answers null is a link whose vocabulary does not reach this element rather than a refusal of
 * the ones after it.
 */
export function linkOf(element: HeldElement): { href: string; label: string } | null {
  for (const link of registered.values()) {
    const href = link.to(element);
    if (href) return { href, label: link.label };
  }
  return null;
}
