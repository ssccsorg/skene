// Which readings stand for a project, as one rule.
//
// It is separated from the register that holds them because the rule is answerable without a store, a hook or a
// component: a caller hands the readings it has and the declaration the project made, and gets back the ones that
// stand. `lib/readings.ts` holds the React side and imports this, and a test can ask the rule on its own.

import type { Layout, Views } from '@ssccsorg/skene-kernel';
import type { Reading } from './readings';

/** The pack every project stands, which is where the frame's own readings are registered. */
export const NATIVE = 'native';

/**
 * A set of readings a domain brings, installed under one name.
 *
 * It exists so that a domain arrives as one declaration rather than as an edit to the frame's own list: a project names
 * the pack, and the readings that pack registered stand for it. The frame's own readings are the `native` pack, so a
 * native view is a packed view and nothing in the frame is privileged by being built in.
 */
export interface Pack {
  id: string;
  readings: Reading[];
}

/**
 * What a project asks of the register: the packs it brings, the readings it stands, and the arrangement it gave its
 * panels.
 *
 * `layout` is here beside `views` because one map has served both questions until now: a reading that declares itself
 * `asked` is asked for by a key in the project's layout, and a project written before `views` existed still says so
 * that way.
 */
export interface Want {
  layout?: Layout;
  views?: Views;
}

/**
 * The readings that stand for a project.
 *
 * One filter, in the order the questions come. A project that names the readings it stands gets exactly those. A
 * reading whose pack the project did not bring is out. A layout entry for a reading, true or false, is the project
 * putting it in or out. A reading from another pack stands because it was brought, and the frame's own stands unless it
 * asks to be asked for.
 */
export function standing(readings: Reading[], want: Want = {}): Reading[] {
  const named = want.views?.pack;
  const packs = new Set<string>([NATIVE, ...(Array.isArray(named) ? named : named ? [named] : [])]);
  const on = want.views?.on ? new Set(want.views.on) : null;
  const layout = want.layout;
  return readings.filter((reading) => {
    if (on) return on.has(reading.key);
    const pack = reading.pack ?? NATIVE;
    if (!packs.has(pack)) return false;
    const declared = layout?.[reading.key];
    if (typeof declared === 'boolean') return declared;
    if (pack !== NATIVE) return true;
    return !reading.asked;
  });
}
