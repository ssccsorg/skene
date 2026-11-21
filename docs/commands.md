# Commands

The frame is a control surface. A person drives it with a hand: press a record, pick a unit, turn the sphere, give
the pane the frame. This is the same surface stated for a program, so that a script, a harness or a model can drive a
cockpit without a pointer.

A command is one JSON object. It names an intent the frame already has a store verb for, and says nothing about pixels,
elements or the size of the window. A script is an ordered list of them.

```json
[
  { "do": "seek", "to": 21 },
  { "do": "select", "unit": "jita-iv" },
  { "do": "zoom", "by": -120 },
  { "do": "turn", "by": [-40, 20] },
  { "do": "split", "mode": "full" }
]
```

## Why an intent and not a coordinate

A recorded pointer path is one window at one size on one deployment. The same press on a 1920 wide screen and on a
phone is a different pair of numbers, and a headless run has no pointer at all. An intent survives all three because
it is the thing the two presses had in common.

That is also why the arguments are the stores' own: `seek` takes the index a record stands at, `split` takes the
arrangement's name, `turn` takes the pixels a hand moved because a drag is a distance and not an angle until the
surface it moved on is known. A command is not a new vocabulary, it is the one the frame is already built on, written
where something other than a control can reach it.

## The set

| `do` | arguments | what it does |
|:---|:---|:---|
| `open` | `project` | make a project the frame's own |
| `read` | `path` | stand the frame at one of its readings |
| `seek` | `to`, or `by` | move the run to a record, or a count of records from it |
| `play` | none | run the records in order from where the run stands |
| `pause` | none | stop the run where it stands |
| `select` | `unit`, `record` | make a unit the picked one |
| `aim` | `yaw`, `pitch` | turn a view to face a direction |
| `turn` | `by` | turn a view by a distance a hand moved |
| `zoom` | `by` | widen or narrow a view's field |
| `split` | `mode` | arrange the pane and the reading beside it |
| `share` | `share` | how much of a split one picture takes |
| `fold` | `what`, `closed` | put a panel or a level away, or bring it back |

Ninety and more commands is a bad sign for a format. This list is the frame's own verbs and it should stay near it: a
command that needs three arguments and a preorder of its own is an instrument with a body, and the right place for it
is a reading, not here.

Facing a unit is not in the table, and the omission is the rule: where a unit stands on the shell is the board's fact as
one reading places it, so the reading offers that verb and the frame offers the bearing it ends in.

## Declared where a caller can read it

`commandsOf()` answers every command with four things: its name, one sentence of what it does, the keys it takes, and
whether it can run now. A caller that has to choose a command reads that answer; so does the hint text of a control
that offers the same verb, which is how the two stay one sentence instead of two.

A command that cannot run says why in the same answer, in the words a person would read: no project, no run, no unit
chosen. A refusal is part of the contract and not an exception, because a driver's next decision depends on it.

This is the shape `registerInstrument` and `registerReading` already have. A command is declared once, at import time,
by the layer that can run it.

## Who owns a command

A verb a store already has lives here, in the frame's own commands, because the frame owns the stores.

A verb that needs the router is registered by the part that owns the router: an address is a view's fact, so `read`
arrives from there and not from a store.

A deployment registers the verbs only its own readings can run. The register is process-wide and keyed by name, so a
deployment that declares `plot` is a deployment whose script may plot.

## One path

The rule that keeps a console from becoming a second implementation: a control calls the command, and the command
calls the store. A control that wrote the store itself would be the same verb twice, and the two drift the first time
one of them gains a guard.

The controls are being moved onto this path rather than the other way round. Until they are, a command and a control
are the same store call, and a test holds them equal.

## What a driver reads back

Each command answers with the frame's state after it: the project, the address, the record the run stands at, the
picked unit, the view's angles and field, and the arrangement. That is the observation half of a loop, and it is why
the answer is the state and not a receipt.

## What this is not

It is not a planner, a scheduler or an agent. It is the surface those things are written against, and keeping it
separate is what lets the same script run under a person, a test and a model without any of them being the
architecture.

The order the stack is built in follows from that: the commands, the console that runs a script and prints what
happened, and only then a driver. A cockpit that can be described, driven and inspected is worth more than one that
can be told what to do, and the second is easier to build on the first.
