# Security

## Supported versions

The project is pre-1.0. Fixes land on `main`, and a release is cut from it. There are no long-lived
branches to patch.

## Reporting a vulnerability

Write to **lee@ssccs.org** with `skene security` in the subject. Do not open a public issue, and do
not include a working exploit in a pull request.

What to include:

- what the flaw lets an attacker do, and what they need to reach it
- the version or commit you tested
- the smallest reproduction you have
- whether a deployment you know of is exposed

You will get an acknowledgement within three working days. A fix or a mitigation is discussed with
you before it is published, and the advisory names you unless you ask it not to.

## What is in scope

The frame draws a record and asks a host for what it cannot answer itself. Two areas are worth
attention:

- the scenario reader, which parses a file a deployment supplies
- the markdown and media the panels render from a record

## What is out of scope

A deployment's host and its board are that deployment's. A vulnerability in a product built on this
frame is reported to that product, though a fix to the frame that makes it exploitable is ours.
