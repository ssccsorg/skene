import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultRoom } from '../lib/channel';
import { runsOf } from '../lib/campaign';
import { bundleOf, type BoardDocument, type ProjectDocument } from '../lib/project';
import { slugOf, validateProject, type ProjectIssue } from '../lib/contract';
import { heldSource, type RunSource } from '../lib/source';
import { volumeSource } from '../lib/records-source';
import { deviceViews, host } from '../lib/host';
import { buildModel, type Model } from '../lib/world';
import { titleOf } from '../lib/scenario';
import type { Bundle, Place, SourceSpec } from '../lib/types';

// The board: the projects a record model holds, the texts their records are read from, and the model
// of the one that is open. A project is its bundle, so opening one is a read and not a lookup, and
// nothing here holds a list of names to keep in step with anything.
//
// Nothing here edits a space. What the place declares is the space's own and stays as it was read, and a
// change a pilot makes is a continuation of the run rather than a rewrite of the declaration, so it lives
// in the edits store and is applied to the world the board draws.
//
// Which project the frame reads, and which ones stand open beside it, travel between visits and the runs do not. A
// window that came back to the board's first project every time threw away the one thing the pilot had chosen: a
// cockpit that opens where it was left is the same idea as the frame's own arrangement, which is kept for the same
// reason. What is not kept is the run: a cursor and a pick name a moment in a run, and a reload has no moment to put
// them back in.

/**
 * The board as the window's own build holds it, which is what a room that answers none leaves.
 *
 * The demonstration's projects are a file beside the app, so a window whose room does not answer for the board still
 * draws the spaces it was built with. What such a window loses is the run, and the run is the room's.
 */
async function boardFile(base: string): Promise<BoardDocument> {
  const answer = await fetch(`${base}projects.json`);
  if (!answer.ok) throw new Error(`the board did not load (${answer.status})`);
  return (await answer.json()) as BoardDocument;
}

/**
 * The addresses this host's devices give: the shell's answer first, and the dev server's when there is
 * no shell.
 *
 * A device's picture is read by this host's camera server, which holds the token, so the address the
 * window is handed names this host and not the device. A window a launcher started is given the map the
 * camera server wrote, so a bundle reaches a camera as a window from the launcher does. A window with no
 * launcher reads the dev server's own copy of the map, and a build or a host with no devices answers
 * nothing either way.
 */
async function localSources(base: string): Promise<Record<string, string>> {
  const held = await deviceViews();
  if (Object.keys(held).length) return held;
  try {
    const answer = await fetch(`${base}devices.local.json`, { cache: 'no-store' });
    if (!answer.ok) return {};
    return (await answer.json()) as Record<string, string>;
  } catch {
    return {};
  }
}

/** A local answer replaces the address of any declared view by id, wherever the document holds it. */
function applyLocalSources(node: unknown, sources: Record<string, string>): void {
  if (Array.isArray(node)) {
    for (const each of node) applyLocalSources(each, sources);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const record = node as Record<string, unknown>;
  if (typeof record.id === 'string' && typeof record.src === 'string' && sources[record.id]) {
    record.src = sources[record.id];
  }
  for (const value of Object.values(record)) applyLocalSources(value, sources);
}

/** One project's record as the window's own build holds it, for the same roomless case. */
async function recordFile(base: string, path: string): Promise<string> {
  const answer = await fetch(`${base}${path}`);
  if (!answer.ok) throw new Error(`${path} did not load (${answer.status})`);
  return answer.text();
}

/** A project added in the frame: its own record text, the source its workspace stands on, and where it stands. */
export interface NewProject {
  id: string;
  title?: string;
  text: string;
  source?: SourceSpec;
  place?: Place;
  /** Any other resources the caller already holds, such as the kinds and the machine vocabulary. */
  resources?: { kind: string; at: unknown }[];
}

/** Where a project added from a record text stands: one workspace at the middle, and no geography to invent. */
const ADDED_PLACE: Place = {
  view: [0, 0, 520, 176],
  sector: [0, 0],
  units: { workspace: { icon: 'workspace', at: { record: [260, 88] } } },
};

export type AddResult = { ok: true } | { ok: false; issues: ProjectIssue[] };

interface ScenarioState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  projects: Bundle[];
  /** Every project's reading, built once: several stand open at a time and the space draws them together. */
  models: Record<string, Model>;
  /** The projects standing open, which is the pilot's own arrangement of the space and not the space's. */
  opened: string[];
  /** The one the frame reads: the rail, the transport and the panels are its reading and not any other's. */
  projectId: string | null;
  model: Model | null;
  load: (base?: string, wanted?: string | null) => Promise<void>;
  /** Open a project and read it, which is what the list, the address and a command do. */
  open: (id: string) => void;
  /**
   * Add a project from a record text the frame was handed, with the source its workspace declares.
   *
   * The declaration is proved before anything is read, so a project the frame cannot draw is refused where it was
   * written rather than added as a space that says nothing.
   */
  add: (input: NewProject) => AddResult;
  /** Open it when it is closed and close it when it is open, which is what the space's own press does. */
  toggle: (id: string) => void;
}

/** Every project's reading, by id. A bundle whose record did not load has no reading and is left out. */
function modelsOf(projects: Bundle[]): Record<string, Model> {
  const models: Record<string, Model> = {};
  for (const project of projects) {
    if (project.text) models[project.id] = buildModel(project.text, project);
  }
  return models;
}

/**
 * The project the frame reads, once the board is in hand: the address, then the pilot's own last one, then the first.
 *
 * The order is what makes a window open where it was left and a link into the cockpit land where it says. The address is
 * asked first because a frame in an address is a frame somebody named, and a named project the board does not hold falls
 * to the pilot's own rather than to nothing at all: a link to a project this deployment does not carry is a link from
 * another deployment, and the board's own answer is better than an empty frame.
 */
export function wantedProject(
  models: Record<string, Model>,
  address: string | null,
  remembered: string | null,
): string | null {
  if (address && models[address]) return address;
  if (remembered && models[remembered]) return remembered;
  return Object.keys(models)[0] ?? null;
}

/** The projects that stand open, with the ones this board no longer holds dropped and the open one among them. */
export function openedFrom(opened: string[], models: Record<string, Model>, here: string | null): string[] {
  const held = opened.filter((id) => models[id]);
  if (here && !held.includes(here)) return [...held, here];
  return held;
}

export const useScenario = create<ScenarioState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      error: null,
      projects: [],
      models: {},
      opened: [],
      projectId: null,
      model: null,

      load: async (base = './', wanted = null) => {
        set({ status: 'loading', error: null });
        try {
          // The board and the records are the room's answer where it has one, and the window's own build where it has not.
          // The demonstration's projects are a file and its records are the engine's texts, so the sim holds both and
          // serves them; a deployment whose projects are the folders on a host answers the same two from its own tree.
          //
          // A room that is not there leaves the record the window shipped with, which is what a bundle is: it draws the
          // record it carries and the stack it is over is the one given to it in the frame's own settings. The two are
          // not told apart here, because a window cannot tell a room that refused from a room that is not running: what
          // says which it is is the frame's own link state, which is drawn from the room's subscription.
          const room = defaultRoom(host().prove ?? (async () => {}));
          const document = (await room.board?.().catch(() => null)) ?? (await boardFile(base));
          // Whichever board answered, the addresses this host's devices give are applied here: a
          // room declares the view and cannot know the token this host holds, so a board from the
          // room would otherwise carry an address that answers 401.
          applyLocalSources(document, await localSources(base));

          // Every project's record is read, not only the open one's: the rail names the projects, and a
          // project's name is the one its own record carries, so a list of names is a list of reads.
          const projects: Bundle[] = [];
          for (const entry of document.projects) {
            const bundle = bundleOf(entry, document.projects);
            // A project holds the run it opens and every run its campaigns name, and every one of them is read here:
            // the rail names the project by its opening run, and a campaign read over another run needs that run in
            // hand. The room serves one run per project, which is the one the board walks; the rest are the window's
            // own build until a deployment answers for them too.
            const texts: Record<string, string> = {};
            for (const path of runsOf(bundle.record, bundle.campaigns)) {
              const served =
                path === bundle.record && room.record
                  ? await room.record(bundle.id).catch(() => null)
                  : null;
              texts[path] = served ?? (await recordFile(base, path));
            }
            bundle.texts = texts;
            bundle.text = texts[bundle.record];
            bundle.title = titleOf(bundle.text) || bundle.id;
            bundle.note = document.note ?? '';
            projects.push(bundle);
          }

          // The address may name the project, so a screenshot of another one is reproducible; where it names none, the
          // frame comes back to the project the pilot last read rather than to whatever the file happens to list first.
          const models = modelsOf(projects);
          const here = wantedProject(models, wanted, get().projectId);
          set({
            status: 'ready',
            projects,
            models,
            opened: openedFrom(get().opened, models, here),
            projectId: here,
            model: here ? models[here] : null,
          });
        } catch (error) {
          set({ status: 'error', error: error instanceof Error ? error.message : String(error) });
        }
      },

      open: (id) => {
        const { models, opened } = get();
        if (!models[id]) return;
        set({ opened: opened.includes(id) ? opened : [...opened, id], projectId: id, model: models[id] });
      },

      add: (input) => {
        const id = slugOf(input.id);
        if (!id) return { ok: false, issues: [{ path: 'id', message: 'is a name the frame can key a project by' }] };
        if (!input.text.trim()) {
          return { ok: false, issues: [{ path: 'record', message: 'is the run the project carries' }] };
        }
        const { projects, opened } = get();
        if (projects.some((project) => project.id === id)) {
          return { ok: false, issues: [{ path: 'id', message: 'is already the name of a project the frame holds' }] };
        }
        const carried = (input.resources ?? []).filter(
          (resource) => !['record', 'place', 'status'].includes(resource.kind),
        );
        // A submission carries its own sources beside its kinds; the form's one source is the fallback for a project
        // written by hand, and a declaration that names its own is not given a second list.
        const declared = carried.some((resource) => resource.kind === 'sources');
        const document: ProjectDocument = {
          format: 'project/1',
          id,
          resources: [
            ...carried,
            { kind: 'record', at: 'inline' },
            { kind: 'place', at: input.place ?? ADDED_PLACE },
            ...(declared ? [] : [{ kind: 'sources', at: input.source ? [input.source] : [] }]),
            { kind: 'status', at: 'idle' },
          ],
        };
        const proof = validateProject(document, projects.map((project) => project.id));
        if (!proof.ok) return { ok: false, issues: proof.issues };
        let bundle: Bundle;
        try {
          bundle = bundleOf(proof.document, []);
        } catch (error) {
          return {
            ok: false,
            issues: [{ path: 'resources', message: error instanceof Error ? error.message : String(error) }],
          };
        }
        bundle.text = input.text;
        bundle.texts = { [bundle.record]: input.text };
        bundle.title = input.title?.trim() || input.id.trim() || id;
        const model = buildModel(input.text, bundle);
        set({
          projects: [...projects, bundle],
          models: { ...get().models, [id]: model },
          opened: [...opened, id],
          projectId: id,
          model,
        });
        return { ok: true };
      },

      toggle: (id) => {
        const { models, opened, projectId } = get();
        if (!models[id]) return;
        if (!opened.includes(id)) {
          set({ opened: [...opened, id], projectId: id, model: models[id] });
          return;
        }
        const rest = opened.filter((each) => each !== id);
        // The frame keeps reading what it was reading until that project is the one being closed. Then it reads
        // the one opened most recently and still standing, and reads none when nothing is open: a space with no
        // project open has no run to walk, which is a state the frame can be in without lying about it.
        const focus = projectId === id ? (rest[rest.length - 1] ?? null) : projectId;
        set({ opened: rest, projectId: focus, model: focus ? models[focus] : null });
      },
    }),
    {
      name: 'exaspec.projects',
      // Only what the pilot chose: the bundles are read from the board on every load, and a stored copy of a run would be
      // a copy that goes stale against the file the engine wrote, which is the one thing the board is not.
      partialize: (state) => ({ projectId: state.projectId, opened: state.opened }),
    },
  ),
);

/**
 * The run source this host reads, which is the demonstration's own parse standing in for a volume.
 *
 * The parse is what the app already holds, so this reads nothing twice: it answers the window contract from the run
 * that is here. A deployment replaces it with a source that reads its own record store, and nothing above it changes,
 * which is what the seam is for. It is built here because this is the module that holds the runs.
 */
/**
 * The run's source: the volume the dev server was given, or the board's own parse when there is none.
 *
 * The volume is the deployment's answer and the parse is the window's own build, which is the same division the
 * board and the record already follow: a host that has a store reads it, and a window that has none draws what it
 * shipped with.
 */
const volume = Boolean(import.meta.env.VITE_RECORDS);
export const source: RunSource = volume
  ? volumeSource
  : heldSource((project) => useScenario.getState().models[project]?.events);
