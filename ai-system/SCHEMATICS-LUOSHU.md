# Schematics — the Luoshu organisation of the root map

*Settled by the owner, 2026-11-20. This file is the record of the root
schematic's organising principle: which palace of the Luoshu (洛書) 3×3
each top-level unit belongs to, and the layout rules that follow. The
re-layout of the root page (`demo/dashboard/root/index.html`) is a
drawing slice that implements this record; until it is built, the page
keeps its previous arrangement and this file is the standing design.*

## The principle

The map is organised as the Luoshu nine palaces. The grid lines of the
3×3 are **drawn as the scaffold** — the scaffold is the organising
principle of the schematics map, not a decoration laid over it. A unit
that does not fit its cell is a visible problem: either the placement
is wrong or the unit is misclassified.

The knowledge core sits at the centre (5) because it grounds the
system: every other unit consults it. In the full sense the core is
two top-level masses together — the OntologyCore (the correspondence
graph, classification, the OKU units) and Knowledge (the lexicon and
the variant graph).

Orientation is the traditional one: south at the top
（戴九履一，左三右七，二四為肩，六八為足，五居中央）.

## The palaces

Units are cited by their registry id (their directory path under
`ai-system/`).

| Palace | Quarter | Holds (registry ids) | Correspondence and reason |
|---|---|---|---|
| 9 | South — the head | `verbalizer`, `surfaces` | Fire / Li — illumination, outward manifestation: where the system shines out, expression and the surfaces it is seen on. |
| 1 | North — the foot | `session-and-situation` | Water / Kan — depth, what is held below: the session record everything stands on. |
| 3 | East | `lpu` | Wood / Zhen — thunder, arousal, the beginning of motion: where an utterance first strikes and is taken apart. |
| 7 | West | `coherence` | Metal / Dui — the discriminating cut: assessment, pricing, separating what holds from what does not. |
| 4 | Southeast | `intake`, `retrieval-harborer` | Wind / Xun — penetration: the doorway where outside material enters and is harbored. |
| 2 | Southwest | `awareness` | Earth / Kun — pure receptivity: self, other, and situation received before anything acts. |
| 6 | Northwest | `reasoning` | Heaven / Qian — the creative, directing authority: derivation, the Planner, problem-solving. |
| 8 | Northeast | `functions`, `error-failure` | Mountain / Gen — stillness, storage, stopping: functions held in store until called, and the place where walks stop and are accounted. |

Outside the square:

- `person`, `clock`, `weather` — externals, not system: they orbit the
  square as its conditions.
- `configuration` — a strip along the square's edge: the frame of the
  palace, not a room in it.
- `unplaced` — the margin: by definition what has no place yet.

## The layout rules

1. **Scaffold.** The 3×3 grid lines are drawn; every frame's position
   is assigned by the scaffold.
2. **Maximum size correspondence.** The grid is table-like, not a
   geometric square: each column is as wide as its widest region, each
   row as tall as its tallest. A large centre inflates only the middle
   row and the middle column; the corners are sized by their own row
   and column. (The equal-cell square was considered and set aside: it
   would size the whole map to its largest region nine times over.
   The Luoshu's meaning is in the arrangement, not in congruent
   areas.)
3. **Growth from the centre — the layout magnet.** The layout grows
   from the centre cell outward. Each ring cell anchors its modules at
   the edge or corner facing the centre; slack collects at the outer
   rim, never between a module and the centre. The map reads dense at
   the heart, opening outward — the way the system behaves, since the
   modules nearest the centre are those in constant consultation with
   it.
4. **Ordering inside shared cells follows the magnet.** The module
   that consults the core most sits nearest it:
   - Palace 9: `verbalizer` against the centre, `surfaces` at the skin.
   - Palace 4: `intake` against the centre, `retrieval-harborer` behind it.
   - Palace 8: `functions` against the centre, `error-failure` at the rim.

## What the arrangement claims

- Every palace touches the centre — true of the system: no unit works
  without consulting the knowledge core.
- The turn reads as a circuit of the ring: in at 4 (intake), struck
  at 3 (lpu), received at 2 (awareness), held against the record at
  1 (session), directed at 6 (reasoning), cut at 7 (coherence), out
  at 9 (verbalizer, surfaces) — with 5 consulted throughout and 8 the
  storehouse and stopping-place off the main circuit.
- Adjacencies are checkable claims: reasoning (6) sits between
  session (1) and coherence (7), its real neighbours in the pipeline.
  An adjacency on the square that is not true in the cords is a
  finding, not a decoration.

## Placement checks (for the re-layout slice)

- In each ring cell, the drawn gap is on the outer side only — a cell
  with slack against the centre is a placement error.
- The registry and layout data do not change; this record governs the
  drawn page's geometry (frame positions and sizes) only.
