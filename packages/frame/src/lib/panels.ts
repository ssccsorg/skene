import { useMemo, useSyncExternalStore, type ComponentType } from 'react';
import { useSelection } from '../stores/selection';
import { useAbilities } from './capabilities';
import type { Layout } from './types';

/**
 * The frame's panels, each one declaring itself.
 *
 * A panel says where its box stands, what it is called, how its control is drawn, whether the frame comes up with it
 * out, and what it draws. That is because five places speak about the whole set: the arrangement the frame comes up with,
 * the arrangement a project declares, the press that puts every panel away, the bar's own controls, and the frame that
 * draws the boxes. Each of them listed every panel again, so a panel added later was an edit in each of the five. Here it
 * is one entry, and a place that speaks about panels reads the register.
 *
 * What a panel does not say is what it is called in the store. The store holds one map of answers keyed by these names,
 * so a panel's own name is the only name there is and there is no second spelling to keep in step.
 *
 * The distinction the register keeps that the panels do not share is the two questions a place can ask: which of the
 * bar's rows its control is named in, and where its box stands. They came apart when the console and the plan moved out
 * of the middle column, because the box a panel stands in and the row that names it are two facts and one of them is
 * about the bar.
 */

/** Where a panel's box stands in the frame. */
export type PanelAt = 'left' | 'right' | 'bottom';

/** Which of the bar's two rows a panel's control is named in. */
export type PanelSide = 'left' | 'right';

/** A panel as a module declares it. */
export interface PanelUnit {
  /** Its name, which is what the store's arrangement is keyed by and what the bar's control is keyed by. */
  key: string;
  at: PanelAt;
  /** Where it stands among the panels of its own place. */
  order: number;
  side: PanelSide;
  /** What it is called, in one word, wherever the frame names it. */
  label: string;
  /** What it is for, in the words its control carries when it is away. */
  title: string;
  /** Whether the frame comes up with it out, when neither the pilot nor a project has said. */
  starts: boolean;
  /**
   * The capability a project has to hold for this panel to stand.
   *
   * Absent means the panel is the frame's own drawing of a run and stands for every project. Present means the panel is a
   * surface a deployment has to have shipped, so it is drawn where that project's bundle says the deployment has it.
   */
  needs?: string;
  /**
   * What the bar's press for this panel does.
   *
   * A panel is drawn and put away, which is the default. A panel that stands for a whole edge of the frame is that
   * edge's handle instead: its press folds what is under its own header, because the header is the line that stays when
   * the rest is away and a panel put away entirely would leave nothing to press. The panel itself stays out, so the
   * press is the edge's and not the panel's.
   */
  fold?: 'panel' | 'edge';
  Icon: ComponentType;
  /**
   * What the panel draws when it is out.
   *
   * It draws its own box, its own header and its own edge, because a column and a row are not one shape and a frame that
   * built them from a declaration would be a frame that knew which of the two each panel is. What it does not draw is
   * being away: the frame draws nothing for a panel that is away, so a panel has no closed form and no strip.
   */
  View: ComponentType;
}

const registered = new Map<string, PanelUnit>();
const listeners = new Set<() => void>();
let revision = 0;

/** Put a panel in the register, where the module that draws it is written. */
export function registerPanel(panel: PanelUnit): void {
  registered.set(panel.key, panel);
  revision += 1;
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The panels that stand for a project, in the order they stand where they stand. */
function inOrder(panels: PanelUnit[]): PanelUnit[] {
  return [...panels].sort(
    (left, right) => left.at.localeCompare(right.at) || left.order - right.order || left.key.localeCompare(right.key),
  );
}

/**
 * The panels a project stands: every one whose capability the project holds.
 *
 * A panel that names none stands always, which is every panel that was written before the field. A panel that names one is
 * a surface the deployment may not have shipped, so it is drawn where that project says it did and nowhere else: a control
 * that opened it would be a control into nothing.
 */
export function standingPanels(panels: PanelUnit[], abilities: string[]): PanelUnit[] {
  const held = new Set(abilities);
  return panels.filter((panel) => !panel.needs || held.has(panel.needs));
}

/** A panel with the frame's answer about it, which is what a control or a box is handed. */
export interface Standing {
  unit: PanelUnit;
  open: boolean;
  toggle: () => void;
}

/**
 * What the frame asks the register: every panel, with whether it is out.
 *
 * It subscribes to the register rather than reading it once, because a panel's module is registered when it is first
 * imported and the frame may draw before that: the counter is what makes the second draw happen.
 *
 * A panel the store has never been told about answers for itself, which is what a panel declared after the frame came up
 * gets: it stands where it says it starts, until the pilot says otherwise. It is also what keeps the store from having to
 * enumerate the panels to seed itself, which is the list this register exists to be.
 */
export function usePanels(): Standing[] {
  const stamp = useSyncExternalStore(
    subscribe,
    () => revision,
    () => revision,
  );
  const said = useSelection((state) => state.open);
  const setOpen = useSelection((state) => state.setOpen);
  const abilities = useAbilities();
  return useMemo(
    () =>
      inOrder(standingPanels([...registered.values()], abilities)).map((unit) => {
        const open = said[unit.key] ?? unit.starts;
        return { unit, open, toggle: () => setOpen(unit.key, !open) };
      }),
    [stamp, said, setOpen, abilities],
  );
}

/**
 * The one panel a frame with room for one draws: the one brought forward, while it is out.
 *
 * It is a question about the arrangement and not about a place, which is why it is here and not in the overlay that
 * asks it: a panel has no place of its own when there is only room for one, and what decides between two that are out is
 * which of them the pilot asked for rather than where the frame would have stood them.
 *
 * Nothing brought forward is nothing drawn, and that is the answer rather than a gap in it: at a width with room for
 * one, a panel that is out is not on screen, so the control that stands for it is the frame's whole account of it and
 * the overlay is only ever the one that was asked for. A fallback here would draw a panel nobody pressed, which is how
 * a frame comes up with its transport over a space that was meant to have the frame.
 */
export function frontPanel(panels: Standing[], front: string | null): Standing | null {
  if (!front) return null;
  return panels.find((panel) => panel.unit.key === front && panel.open) ?? null;
}

/** The panels that stand at one place in the frame, in the order they stand there. */
export function usePanesAt(at: PanelAt): PanelUnit[] {
  const panels = usePanels();
  return useMemo(
    () => panels.filter((panel) => panel.unit.at === at && panel.open).map((panel) => panel.unit),
    [panels, at],
  );
}

/**
 * Every panel as the register has it, asked without subscribing.
 *
 * What the frame draws is `usePanels`, which subscribes so that a panel declared after the first draw is drawn. Resolving
 * a project's own arrangement is a different question and is asked once, when the project opens: a subscription there
 * would put the panels in an effect's dependencies, and the effect writes the arrangement the panels are read from, so
 * every render would apply the declaration again and the frame would never settle. It is the register's own answer and
 * not a value that changes with a render, which is why it is asked here rather than through the hook.
 */
export function declaredPanels(): PanelUnit[] {
  return inOrder([...registered.values()]);
}

/** The arrangement the frame is standing in, which is what a press that puts every panel away has to undo to. */
export function useArrangement(): Record<string, boolean> {
  const panels = usePanels();
  return useMemo(
    () => Object.fromEntries(panels.map((panel) => [panel.unit.key, panel.open])),
    [panels],
  );
}

/**
 * What a project declares of the frame's arrangement, and only that.
 *
 * It is what the project said and not a whole arrangement, because the frame's arrangement is the pilot's: a project
 * states where the frame starts for it, and a panel it says nothing about keeps the place the pilot left it in. That is
 * what makes the console a thing a pilot opens once rather than once a project.
 *
 * A name the frame has no panel for is dropped rather than refused: `layout` is a map and a bundle that declares one is
 * a declaration about another frame, so refusing the project over it would tie a bundle to one build of the app.
 */
export function declaredIn(layout: Layout, panels: PanelUnit[]): Record<string, boolean> {
  const known = new Set(panels.map((panel) => panel.key));
  return Object.fromEntries(
    Object.entries(layout).filter(([key, open]) => known.has(key) && typeof open === 'boolean'),
  );
}
