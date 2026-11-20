# Open Unknowns

- **Schematic address:** `session-and-situation/open-unknowns`
- **Type:** Register
- **State:** partial — **50% completed to goal** (set by us, assessed by the project, not measured or computed). Built 2026-11-17: the Session lists its currently-open unknowns across scenes (`listOpenUnknowns` in `src/ansci/session.ts`), and the scene wiring mints and fills slots. The register of slot *kinds* is one filed rule so far (airport → city, the owner's specimen), plus the spatial faculty's `exact-location` slots, minted for every default-placed scene entity (its coarse placement is a region; the exact position stays unknown); the mechanism is general, the rule table is meant to grow by filing, not by guessing.

## What this register is

The owner's ruling (2026-11-17, decision 1a): **unknown slots live on
the scene graph itself**, in Session's scene storage — facts about an
established scene entity that the conversation has not supplied (the
airport's city) are explicit typed slots on that entity's scene
record, persistent until a later object fills them. This register is
Session & Situation's **view across scenes**: which unknowns are
currently open, anywhere in the conversation.

One source of truth: the slots are state of the scene graphs
(`session.scenes[].unknowns`). This register holds **no second
store** — in code it is a derived listing over the scenes, so the
register can never disagree with the scenes it reports.

## Who reads it

- **Awareness's Open gaps** (`awareness/current-activity/open-gaps`)
  **reads from this register**: what the situation is currently
  missing includes the scene unknowns standing open. That is a read
  relationship, recorded here and in the Current Activity
  placeholder — Open gaps does not own the slots, and no Awareness
  machinery for them is built in this arc.
- Coherence and the Planner are future readers, with their own
  slices: an open unknown is a located gap, priced like other gaps.

## Explicitly not

- Not a standalone unknowns unit — there is none.
- Not owned by Awareness's Open gaps — it reads; the scenes own.

## Where the working code lives today

`src/ansci/session.ts` (the scene storage and `listOpenUnknowns`);
slots are minted and filled by the Senses-Scening wiring
(`src/ansci/senses-scening.ts`) as fragments are placed into the
running scene.
