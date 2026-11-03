# Contributing

Skene is the frame a record is drawn in: a deployment supplies a brand, a board and a pack, and the
frame supplies the address, the record model, the panels, the transport and the readings. A change is
welcome when it makes that frame better for every deployment, and it belongs somewhere else when it
serves one.

## Before you write code

The frame has two seams and two rules.

| Seam | Where | What it is for |
|:---|:---|:---|
| a reading's pack | `src/lib/packs.ts` | a domain brings its views under one name |
| the host | `src/lib/host.ts` | a deployment brings its shell, its rooms and its connection form |

The rules follow from them. A domain's data, names and constants belong to that domain's board and
pack, never to the frame. A deployment's transport, commands and endpoints belong to its host, never
to the frame. A change that puts either back is the change this structure exists to prevent.

## Building and testing

```bash
npm install
npm test --workspace @ssccsorg/skene-frame                    # the frame's suites
npm test --workspace @ssccsorg/skene-frame -- --coverage      # with the coverage gate
npm run typecheck                                          # both workspaces
npm run dev                                                # the example on :5290
```

The coverage gate is set where the tests reach, per directory. Raising it is welcome; lowering it is
a decision that needs a reason in the pull request, because the number is the only thing holding the
line.

## What a change carries

A fix comes with a test that fails before it. A new reading comes with a pack in the example or a
suite that installs one, because a seam nobody exercises is a seam that quietly stops working. A
behaviour change says in the pull request what a deployment will notice.

Comments explain why. The frame's own comments are long where the reasoning is subtle and absent
where the code says it; match that rather than the other way round.

## Commits

`{category}: {message}`, in the imperative, lower case after the colon. One subject per commit.

## Conduct and security

[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) applies to every space this project uses. Report a
vulnerability privately, as [SECURITY.md](SECURITY.md) says, and not in an issue.
