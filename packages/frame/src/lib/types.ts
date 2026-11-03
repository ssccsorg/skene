// The shapes the dashboard is made of.
//
// The operator's sketch names a record as a kind with a value (`{ kind: 'fact', key, value }`). The
// engine's record carries no value: a fact is an origin, a payload size and a time, and the payload
// belongs to the device. A value here would be a number the record does not hold, so the shape below
// is the engine's and the four kinds the format names.

/**
 * The atoms a kind of participant is assembled from, in the order a member's own reading draws them.
 *
 * This is the frame's whole vocabulary about a participant, and it is one list because the question a panel asks about a
 * member and the parts of it that are drawn are the same atoms: the type below and the record of answers are both
 * derived from it, so an atom added here is one the compiler asks about everywhere it matters.
 *
 * The five do not ask one kind of question. Three are the directions a signal crosses a boundary in: `reads` is pulled
 * from the member by whoever observes it, `emits` is pushed out by the member to no named recipient, and `writes` is
 * addressed to it. `holds` is the shape of the space the member's own lower elements are laid out in, and `person` is a
 * category. They stand in one list because a project assembles all of them the same way; which kind each is decides what
 * answers it, an observer for a direction, the room that holds the elements for the shape, and the place for the
 * category.
 */
export const ATOM_KEYS = ['reads', 'writes', 'emits', 'shows', 'holds', 'person'] as const;

/** One of them, which is what a project's `kinds` map spells. */
export type Property = (typeof ATOM_KEYS)[number];

/**
 * What a participant is, as the questions a panel has to ask about it.
 *
 * It is the set of atoms the project assembled for the participant's kind, so a panel asks what a member may do rather
 * than what it is called. The frame answers for a name no project assembled.
 */
export type Properties = Record<Property, boolean>;

/** The three kinds the format gives a record. */
export type Kind = 'fact' | 'intent' | 'hint';

/** A claim is not a record: it is a step a declaration takes, and the stream says so. */
export type NodeKind = Kind | 'claim';

export type SceneKey = 'record' | 'notice' | 'declare' | 'act' | 'resume';

/** One entry of a volume, as the format gives it and as a reader derives it. */
export interface Entry {
  kind: NodeKind;
  at: number;
  origin?: string;
  bytes?: number;
  /** The position of a plain reading in a run, which is what makes one row different from the next. */
  cycle?: number;
  /** The name a `fact`, `hint` or `intent` step wrote under, which is its address. */
  label?: string;
  content?: string;
  from?: Entry | null;
  fromLabel?: string;
  description?: string;
  worker?: string;
  claim?: Entry | null;
  produced?: Entry | null;
  producedBy?: Entry | null;
}

export interface Check {
  at: number;
  expected: number | null;
  derived: number;
}

export interface Actor {
  id: string;
  role: 'writes' | 'acts';
  records: number;
}

export interface Chain {
  label?: string;
  from?: Entry | null;
  worker: string | null;
  claim: Entry | null;
  produced: Entry | null;
  description?: string;
  at: number;
}

export interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

/** What a view is doing, as the panel draws it. */
export type ViewStatus = 'live' | 'recording' | 'replaying' | 'stopped' | 'unknown';

/**
 * The fields every view carries, whichever content it is.
 *
 * A view is one thing whatever it shows: it is named, it covers a patch of the graticule, and it may be doing
 * something. What differs is the content, and the content is what `properties/ViewContent.tsx` holds a renderer for.
 */
interface ViewShape {
  /** The name the window is a window of, which is the camera's own and not the unit's. */
  id: string;
  /** When the view stands in the run, in the record's own seconds. Absent means the whole run. */
  from?: number;
  to?: number;
  /** How many graticule cells the window covers by default, across and down. */
  cells: [number, number];
  /** What the view is doing, read through `statusOf`. Absent means live. */
  status?: ViewStatus;
}

/** Footage: bytes the frame's own origin serves, drawn as a picture. */
export interface MediaView extends ViewShape {
  kind: 'media';
  /** Where the bytes are, which the frame's own origin serves. */
  src: string;
  /** Whether the source is footage or a still, when the place declares it. Absent is read from the source's name. */
  medium?: 'video' | 'image';
  /**
   * How the picture is projected, when the place declares it.
   *
   * `flat` is a camera's own frame. `spatial` is footage a device presents as directions around the viewer, which a
   * surface renderer may put on the shell directly instead of into a slot. The field is declared now so a spatial camera
   * does not have to be added as a new view kind later.
   */
  projection?: 'flat' | 'spatial';
}

/**
 * Which entities a view presents.
 *
 * `self` is the entity that carries the view, which is what a camera and a member's own place are. `place` is every
 * entity the place stands: one map may show many units, so a view is not one window per entity. The distinction is the
 * view's own and not the window's, because a window is where a picture stands and a scope is what the picture is of.
 */
export type ViewScope = 'self' | 'place';

/**
 * A place on the earth, drawn from the geography the place declares.
 *
 * It carries no source because it shows the unit's own position and path, which the space already reads: the tiles a
 * map is drawn over belong to the renderer and not to the place.
 *
 * `scope` is what makes a map a one-to-many view. Absent means the carrier, which is what a member's own location is;
 * `place` means every unit the place stands, which is the array map a drone carries for the whole site.
 */
export interface MapView extends ViewShape {
  kind: 'map';
  scope?: ViewScope;
}

/**
 * A view whose kind this build has no renderer for.
 *
 * It keeps the name the place wrote, so a newer place is named as undrawable rather than dropped or misread as the
 * one kind this build happens to know.
 */
export interface UnknownView extends ViewShape {
  kind: 'unknown';
  /** The kind the place wrote, which is what names the view where it is drawn. */
  declared: string;
  src?: string;
}

/** Any view a place may declare, once this build has read its kind. */
export type UnitView = MediaView | MapView | UnknownView;

/**
 * A view as a place writes it, before this build has read it.
 *
 * The kind is free-form on purpose. A place older than the field writes none, and a place newer than this build writes
 * one it has never heard of; both are read rather than refused. `readView` is the one place a declaration becomes a
 * `UnitView`.
 */
export interface DeclaredView {
  id: string;
  /** Absent means media, which is what a place wrote before a view had a kind. */
  kind?: string;
  /** Where the bytes are. Media needs one; a kind drawn from the place's own reading does not. */
  src?: string;
  /** Whether media is footage or a still, when a place wants to say rather than let the source's name say it. */
  medium?: string;
  /** How media is projected: a flat frame, or directions around the viewer. */
  projection?: string;
  /**
   * Which entities the view presents, when its kind can present more than its carrier.
   *
   * Absent means the carrier. A kind the build does not know keeps the value unread, so a newer place is not misread.
   */
  scope?: string;
  cells: [number, number];
  /** Absent means live; a state this build does not know is `unknown`. */
  status?: string;
  /**
   * When the view stands in the run, in the record's own seconds.
   *
   * A view is a camera, and a camera that shows a scene shows it at that scene's time: a lift's camera is in the air
   * from the launch, and a robot's is on the ground while it scans. Absent means the view stands for the whole run, which
   * is what every camera written before a scene could be timed does.
   */
  from?: number;
  to?: number;
}

/** A view as the space holds it, with the unit that carries it. */
export type CarriedView = UnitView & { origin: string };

/** The view the shell draws as a patch: footage, carried by the unit that declares it. */
export type Camera = Extract<CarriedView, { kind: 'media' }>;

/**
 * The common attributes a unit reports about itself.
 *
 * They are the entity's own and not the space's: a machine runs on a charge, a person does not, and the cockpit draws
 * whichever a place declares without knowing which kind asked for it. This is the whole of the abstraction: a shape
 * here, a renderer in `components/Battery`, and the value in the project.
 */
export interface UnitAttributes {
  /** The charge it is running on, from nought to one. A place may write 87 for eighty-seven percent. */
  battery?: number;
}

export interface UnitPlace {
  icon?: string;
  /**
   * What the place says this unit is drawn as, when it is drawn as a body rather than as a point.
   *
   * The interface carries a small set of bodies and the project names the one that stands for its own device, so a mark
   * is a shape only where the space says which shape it is. The name is the project's and not the kind's: two devices can
   * share a kind and be different machines. A unit that names none is a point, which is the reading for everything the
   * space holds that is not a device it has a body for.
   */
  model?: string;
  /** What a person in the space is to it: an administrator, or a member of the team. */
  role?: 'admin' | 'member';
  /**
   * What the place declares the unit can be asked to do: the abilities it states of the member.
   *
   * It is the place's own record and not the interface the member is actually asked through, which is the member's own
   * answer (`Room.asks`) and is what the frame draws (`lib/interface`). A name here that the room answers nothing for is a
   * member this deployment has no interface for, drawn with nothing rather than with a control whose press is refused.
   */
  abilities?: string[];
  /**
   * The common attributes this unit reports about itself, when the place declares them.
   *
   * An attribute is about the entity and not about the space: a device runs on a battery or it does not, and the
   * cockpit has no opinion about which. The place declares the value and this build owns the shape (`UnitAttributes`),
   * so a second kind of unit that carries a charge is the same declaration and no new code.
   */
  attributes?: UnitAttributes;
  /**
   * Where the lower elements of this unit are, when its kind holds any and they are not at its own name.
   *
   * A folder in a project of folders is the path the room lists, so the name a pilot reads and the path the room is
   * asked about are two facts: a unit named for a repository stands over the directory that repository is in. Absent
   * means the unit's own name, which is what a place of plain folders needs and all of it. The name carries `At`
   * because the atom of the same name says only whether a member holds anything at all.
   */
  holdsAt?: string;
  /**
   * What a unit carries to be watched, by the name each window is a window of.
   *
   * A view has no unit of its own to be declared by: it is a thing a unit carries, and the place is what knows which
   * unit. One unit may carry two, which is why each entry is named rather than the unit standing for one. A view is
   * also what an entity shows of itself: the same content drawn where the unit's own attributes are read, which is a
   * property of the entity rather than something it holds.
   */
  views?: DeclaredView[];
  /**
   * Where the unit faces, in degrees counter-clockwise from east, which is what an order turns.
   *
   * Absent is east, the absolute frame a place with no declared heading starts in. A drive reads this and writes the
   * heading back, so a turn is a fact about the unit rather than a scene that was drawn a certain way.
   */
  heading?: number;
  /**
   * Where the unit is on the earth, when the place's own projection is not where it is.
   *
   * A ground unit is projected from its place coordinates, which is what makes the place a coordinate system of its own.
   * An orbital unit has a sub-point that is not the place's ground: its mark on the board is where the interface puts it,
   * and its earth position is where it passes above. The pair is longitude and latitude, like every other geo value here.
   */
  geo?: [number, number];
  /**
   * How far above the ground the unit holds, in metres.
   *
   * It is the height the space does not otherwise carry: the shell is a direction from the pilot, so a unit on it stands
   * at one radius whatever it is. An altitude lifts the mark off that radius, which is what lets a satellite be drawn above
   * the ground it watches. A unit that declares none stands on the ground, and an orbital unit that declares none stands at
   * the board's near orbit.
   */
  alt?: number;
  at: Partial<Record<SceneKey, [number, number]>>;
}

/**
 * The store: the one place in the space that is not a participant.
 *
 * It stands at the middle of the place's own patch, and that is derived rather than declared: a cell's nucleus is at the
 * centre of the cell, so the one point every unit publishes to is the point the field is about rather than a position
 * inside it. What a place declares about it is what it is called, and a place that declares nothing has no composition
 * to read.
 */
export interface Store {
  label?: string;
}

export interface Place {
  view: [number, number, number, number];
  /**
   * The geography the place's own view covers, when the place has one: west, south, east and north.
   *
   * A place is a coordinate system of its own, and a map needs to know where that system lies on the earth. The box is
   * declared rather than derived, because a yard, a field and a search area are three different distances and only the
   * project knows which one it is.
   */
  geo?: { bounds: [number, number, number, number] };
  /**
   * Where the place sits on the shell, as the bearing of the middle of its own patch: an azimuth and an
   * elevation in degrees. A place that names none stands straight ahead, which is where the pilot opens
   * their eyes.
   */
  sector?: [number, number];
  store?: Store;
  areas?: Area[];
  units?: Record<string, UnitPlace>;
}

export type Clock = Partial<Record<SceneKey, string>>;

/**
 * A condition over a run, as an objective's completion is written.
 *
 * The run is the record the project already holds, so a condition names what the record wrote rather than a second model
 * of the work: a fact or a hint by its label, a declaration by its name, a count of records of one kind, or the run's own
 * clock. `all`, `any` and `not` join them, which is what makes a sub-mission's condition compound. The condition is a
 * predicate about the run at a moment, and `campaignAt` evaluates it at the deadline or at the cursor.
 *
 * The vocabulary is closed on purpose. A condition added later is a member here and an arm in the evaluator, and a
 * condition this build does not know is refused by the contract rather than read as one that is never met.
 */
export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { fact: string }
  | { hint: string }
  | { intent: string }
  | { count: { kind: Kind; atLeast: number } }
  | { time: number };

/** One sub-mission: a condition that finishes it, and the window it has to finish in. */
export interface Objective {
  id: string;
  title: string;
  when: Condition;
  /** Seconds after the campaign starts by which `when` has to hold. Absent means no deadline. */
  within?: number;
  /** Whether the campaign can end with this objective missed. */
  optional?: boolean;
}

/**
 * One campaign: a run between a start and an end, with the sub-missions that make it up.
 *
 * A campaign is data of the project rather than a kind of project, because the record, the place, the members and the
 * resources are the same whether the run is read as a story or as a mission. The start and the end are conditions, so a
 * campaign begins when the run says it did and not at a scene boundary, and `objectives` is what the HUD reads.
 */
export interface Campaign {
  id: string;
  title: string;
  /**
   * The run this campaign is read over, when it is not the project's own.
   *
   * A project holds as many runs as its campaigns name, and the record it declares is the one the board opens. A
   * campaign that names none is read over that one, which is what every campaign declared before the field existed
   * did. Composition, where one campaign reads several runs, is a later shape of this field and not a second one.
   */
  record?: string;
  start: Condition;
  end: Condition;
  objectives?: Objective[];
}

/** A project's own state, as its own bundle declares it. */
export type ProjectStatus = 'running' | 'idle' | 'offline';

/**
 * Which channel speaks for a project's room, by the name the project declares.
 *
 * The app holds no list of them. The register in `lib/channel.ts` is the list, and it refuses a name it has no
 * implementation for, so a channel is a new implementation and a line there rather than a member of a union here
 * that every branch elsewhere has to be told about.
 */
export type Channel = string;

/**
 * Which of the frame's panels a project opens with.
 *
 * By the frame's own panel names, as a map rather than as a shape with a field a panel, because the panels are the
 * frame's and a bundle is not the place to state them twice. `lib/panels.ts` holds the register an arrangement is read
 * against, a panel the project says nothing about takes that panel's own answer, and a name the frame has no panel for
 * is dropped: a bundle that declares one is a declaration about another frame, and refusing the project over it would
 * tie a bundle to one build of the app.
 */
export type Layout = Record<string, boolean>;

/**
 * How a project wants the board read.
 *
 * A pack is a set of readings registered together (`lib/readings.ts`), so a domain the frame was written before arrives
 * as one name rather than as an edit to the frame's own list. The frame's own readings are the `native` pack, which
 * every project stands, so a native view is a packed view and not a privileged one.
 *
 * `on` is the explicit form: a project that names the readings it stands gets exactly those. A project that names none
 * takes the rule the frame already had, where a reading that declares itself `asked` stands only where the project's
 * own `layout` says yes.
 */
export interface Views {
  /** The packs this project brings beside the frame's own. One name, or a list. */
  pack?: string | string[];
  /** The reading it opens on, by key. */
  main?: string;
  /** The readings it stands, by key, when it wants to name them itself. */
  on?: string[];
}

/** A project's bundle: the record it runs, the clock of its own story and the place it stands on. */
/** A node of the tree a mock entity source declares. A node with `holds` is a folder, even when it is empty. */
export interface SourceNode {
  name: string;
  holds?: SourceNode[];
}

/**
 * One member's own entity source, as the project declares it.
 *
 * A member's elements are read from a source rather than from a rule about the member's kind. `mock` reads the tree the
 * bundle carries, `folder` reads the path the source names through the room, and a project that declares no source keeps
 * the room's own answer.
 */
export interface SourceSpec {
  member: string;
  /**
   * Where the member's elements come from. A bridge is the same answer for a robot reached over its own connection: the
   * frame asks one level, and the adapter is the whole of the difference between a simulated member and a physical one.
   */
  kind: 'mock' | 'folder' | 'room' | 'bridge';
  /** Where a folder source stands, in the room's own terms. */
  at?: string;
  /** The tree a mock source answers with. */
  tree?: SourceNode[];
}

export interface Bundle {
  id: string;
  title: string;
  note?: string;
  text?: string;
  /**
   * Every run the project holds, by path, as the window read them.
   *
   * `text` is the run the board is walking, and this is all of them: a project's own record and each run its campaigns
   * name. A campaign over another run is read from here, and switching runs is a read of this map rather than a second
   * fetch. The record a project declares is the run it opens.
   */
  texts?: Record<string, string>;
  record: string;
  /** Absent means the sim, so a project written before the field existed still reads. */
  channel?: Channel;
  /** Absent means wherever the frame comes up, which is what every project before the kind declared. */
  layout?: Layout;
  /** Absent means the frame's own pack and its own order, which is what every project before the kind declared. */
  views?: Views;
  /**
   * What this project's deployment can do beside drawing its run.
   *
   * A capability is the deployment's own statement and the frame holds no list of what a project might be able to do, so a
   * name here is read by whatever asks for it and an absent name is a feature the project does not have. It is a list
   * rather than a field per capability because a capability the frame learns later must not change this shape.
   */
  abilities: string[];
  status?: ProjectStatus;
  clock: Clock;
  place: Place;
  /**
   * The kinds this project assembles, by the name its place gives each one, as the atoms they are made of.
   *
   * It is the project's own declaration and not the frame's: a domain the frame was written before is a map of names to
   * atoms here, and a name the project leaves out takes the frame's own reading.
   */
  kinds?: Record<string, Property[]>;
  /** The entity sources the project declares, by member. A member with no entry is read from the room. */
  sources?: SourceSpec[];
  /** The campaigns the project declares. A project with none is read as a space rather than as a mission. */
  campaigns?: Campaign[];
  resources: string[];
}

export interface Scene {
  key: SceneKey;
  title: string;
  note: string;
  clock: string;
  from: number;
  to: number;
  events: Entry[];
}

/** A record as the board draws it: a place to stand, and a height that is its order. */
export interface Point {
  event: Entry;
  kind: NodeKind;
  at: [number, number, number];
  last: boolean;
  fresh: boolean;
}

export interface Standing {
  id: string;
  icon: string | null;
  /** The body the place says this unit is, or nothing when the unit is a point. */
  model: string | null;
  role: Actor['role'] | null;
  /** What the place says a person in the space is, when it says. */
  title: 'admin' | 'member' | null;
  /**
   * What the unit is, asked of the kind it says it is rather than tested by its name: what it reads, whether work can
   * be given to it, whether it records on its own, what it holds, and whether it is named with the space.
   */
  properties: Properties;
  /** What the place declares the unit can be asked to do, which is the place's record and not the room's answer. */
  abilities: string[];
  /** Where the unit's lower elements are, which is its own name unless the place points them elsewhere. */
  holdsAt: string;
  /** Where the unit stands in the interface: a layout inside the place's patch, not a ground coordinate. */
  at: [number, number, number];
  from: [number, number, number];
  /**
   * Whether the unit is above the ground rather than on it.
   *
   * A place gives an orbital unit a sub-point, and that declaration is one difference: the board still stands the unit
   * where the interface puts it, and the map stands it where the sub-point says. A declared altitude is the other: the
   * board lifts the mark above the shell by it and joins the mark to the ground it watches, so a satellite is not drawn as
   * a thing standing beside the machines. A ground unit that declares an altitude is above its own ground and has no
   * sub-point of its own to watch.
   */
  orbital: boolean;
  /** How far above the ground the place stands the unit, in metres, or null when it declares none. */
  altitude: number | null;
  /** The ground an orbital unit watches, in the place's own scene coordinates, or null for a ground unit. */
  watch: [number, number, number] | null;
  /** Where the record has put the unit, in the place's own coordinates, which is what the map draws. */
  ground: [number, number];
  /**
   * Everywhere the place has stood this unit from the first scene to now, which is what its movement is
   * drawn from: the last step is its recent vector and the whole run of them is its path.
   */
  path: [number, number, number][];
  moved: boolean;
  /** How many records of the run so far stand at this unit, which is the height of its mark. */
  written: number;
}

export interface World {
  aspect: number;
  /** The bearing of the place's own patch on the shell, in radians. */
  sector: [number, number];
  index: number;
  here: SceneKey;
  before: SceneKey;
  records: Point[];
  /** Every camera the place declares, each one with the unit that carries it. */
  cameras: Camera[];
  /**
   * Every view the place declares, each one with the unit that carries it.
   *
   * The shell's windows are resolved from this list rather than from the cameras alone, because a window is the view and
   * not the medium: a map carried by a drone is the same window model as the drone's footage, and the two may be open at
   * once. The list is the place's own declaration, so a project with no views carries none.
   */
  views: CarriedView[];
  /** Every unit the place declares. */
  standing: Standing[];
  /**
   * The units the space actually holds: the devices the place declares, and the people only once they
   * have intervened. A person named in the space is not a thing in the space, so they stand on the board
   * when they have taken work or written a record rather than whenever the place lists them.
   */
  present: Standing[];
  areas: { label: string; corners: [number, number, number][]; labelAt: [number, number, number] }[];
  store: [number, number, number] | null;
  storeLabel: string | null;
  claimedBy: string | null;
  /**
   * How many entries of the run the space stands on, which is the count every panel repeats.
   *
   * It is what has arrived up to the cursor and not what the file declares, because the file is only half of a run whose
   * room answers turns: a count read from the file would be the one number on screen that the feed, the account and the
   * rail all disagree with. A claim is one of these entries, because the volume holds it and the record lists draw it.
   */
  entries: number;
}
