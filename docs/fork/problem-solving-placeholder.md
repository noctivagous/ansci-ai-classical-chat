# ProblemSolving Unit — placeholder and router (2026-11-18)

The owner's commission, given with the S2–S6 push: a
placeholder for a ProblemSolving Unit inside the Reasoning
Unit, wired so that quantification things — asked for by
the person, or assessed by the AI as needing solving —
are routed to it, the needs attached to the object. Built
in the worktree `~/workspace/ansci-track-social-seq` on
top of the S6 commit; local commit, push on the owner's
word.

## What was built

**The seat.** `reasoning/problem-solving` joins the
system map (83 nodes; `ai:check` passes, layout order 6
among Reasoning's children) with its PLACEHOLDER stating
the design in the owner's terms: a general-purpose
problem-solving unit, not limited to mathematics, whose
repertoire is the standard acronym cycles people use,
each held as a graph. The Reasoning container's
PLACEHOLDER lists the new child.

**The approach graphs.** `src/fork/problem-solving.ts`
registers the repertoire as data: each approach is a
small graph — steps as nodes, sequence edges between
them, and the one cycle edge that closes the loop from
the last step back to the first, because these processes
are cycles and the graph is their honest shape. Two are
registered, the owner's named examples: **OODA**
(Observe, Orient, Decide, Act — rapid decision cycles)
and **PDCA** (Plan, Do, Check, Act — continuous
improvement), each step carrying a gloss written for this
system. A new acronym is a new registry entry, not new
code. No engine traverses an approach graph yet.

**The router.** The same module carries the router the
owner specified — "does this need quant?" generalised to
"does this need problem-solving?" — as one function,
`routeProblemSolving(object, needs, ground)`, which
attaches the needs to the object as a trail annotation
signed by the unit, with the ground the routing stands
on. Two call sites in the turn, one per ground:

- *Assessed by the AI:* at the quantity-ledger site, an
  object carrying quantity content (the mentions the
  QuantificationLanguageUnit read at assessment) is
  routed with the need "quantification".
- *Instructed by the person:* a how-many question is
  routed with the same need, on the instruction ground,
  at the head of the how-many answerer.

The routing is visible three ways: the annotation on the
object, `trace.problemSolving` (needs + ground), and the
unit on the turn's map path whenever the router fired.
The solving itself stays where it already lives — the
quantity ledger answers how-many questions as it did —
because the unit is a placeholder: what is wired is the
recognition and the route, ahead of the unit's engines.

## One suite collision, corrected at its location

The envelope wall test (apples scenario) deep-equals
stripped object cores against a stored baseline. The
router's annotation legitimately changes those cores —
all three apples turns carry quantity content or ask
how-many. The delta was verified surgically before
touching anything: exactly one added trail entry per
object, everything else byte-identical. The baseline was
regenerated (33 added lines, no other change) and the
reason recorded at the test. No exception or exclusion
was taken.

## Gates (delivered runs, this tree)

- Suite: **768 pass, 0 fail** (771 counted; S6's tree's
  764/767 plus the placeholder's four tests).
- Demo **29/29** (27 exact); holdout **80/80 parsed**, 0
  parse regressions; sense sets **A 11/11 · B 5/6**;
  `ai:check` OK (83 nodes).
- The router's transcripts: a quantity statement routed
  on the assessment ground; a how-many question routed on
  the instruction ground (and still answered from the
  ledger: "You have five apples."); a plain statement
  turn unrouted, the unit absent from its path.

## Amendment (2026-11-18, later): the hexagram evaluation

The owner added a further mechanism to the placeholder
the same day: for issues of how to proceed in a general
situation, the unit will evaluate the situation based on
the 64 hexagrams, making use of OntologyCore. The
hexagrams stand in the ontology the Ontology Knowledge
Unit holds (they are content of the system's graph, not a
store of this unit's), so the evaluation reads them
there; the unit keeps no copy of its own. Recorded in the
unit's PLACEHOLDER, in its map summary, and in the header
of `src/fork/problem-solving.ts`. Nothing was wired: no
need kind routes to it yet, and no evaluation runs — the
router's vocabulary gains a how-to-proceed kind when the
mechanism is built, as its own slice.

## Amendment (2026-11-18, later): the six divisions

The owner named the unit's internal divisions — external
problems, abstract (philosophical) problems, internal
problems (error, lack of information, lack of how to do),
internal-system problems, external-system problems, and
the user's problems (which feed back to internal) — as
generic subunits applicable to any dimension of what the
AI encounters: itself, the user, a person in a story
provided, a math problem. Five rulings were put and
accepted as recommended (the owner's "." — accept all
recommendations):

1. The divisions are **seats with movement** — a problem
   carries a current seat and a history, not a single
   classification; the user's → internal feed is one
   standing route.
2. **Abstract is a seat of its own** (problems whose
   matter is ideas), and the hexagram evaluation is its
   instrument — the amendment above now has its precise
   home.
3. The **bearer is recorded per problem** (the system /
   the user / a third party / the matter itself),
   independent of seat — the divisions are relational,
   which is what makes them generic.
4. The **six are the set for now**; a seventh must pass
   the same generality test.
5. The six are **placed as placeholder subunits** on the
   map, the seat/bearer/subject shape recorded in the
   unit's PLACEHOLDER — no wiring.

Placed accordingly: six child nodes under
`reasoning/problem-solving` (map now 89 nodes), each with
its directory and PLACEHOLDER, layout orders 1–6 in the
owner's listing order; the parent PLACEHOLDER records the
settled shape and holds the list. No problem is seated,
moved, or solved by any division yet.

## What this does not do

No problem is solved by the unit: no approach graph is
walked, no need beyond "quantification" is registered,
and an imperative instruction ("work out how many…") is
routed only insofar as it surfaces as a how-many question
or quantity content the current machinery can read — the
router's instruction ground is wired at the one
instruction shape the demonstrator recognises. Extending
the need vocabulary, registering the remaining acronym
cycles, and building the engines that walk an approach
graph against a routed problem are the unit's future
slices, each its own commission.
