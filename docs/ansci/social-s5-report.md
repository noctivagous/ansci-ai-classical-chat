# Social Unit S5 — report (2026-11-18)

Slice S5 of the Social Unit design (§11): the premise
stance. Bar item 8. Built in the worktree
`~/workspace/ansci-track-social-seq` (branch
`track/social-unit-seq`, stacked on S4's commit) under the
owner's sequence authorization for S2–S5. Local commit;
push waits for the owner's word. With S5, the authorized
sequence S2–S5 is complete; S6 remains deferred under
ruling 5a.

## What was built

**The degree is Coherence's (ruling 4a).** `premiseDegree`
in coherence.ts judges a why-question's presupposed
predication (subject + quality) against what is
established, and returns contradiction or absence — the one
rung of the degree scale this programme consumes (design
§8; tension and the remaining degrees stay with the
coherence note, unbuilt). Contradiction is positive in
both sources:

- **record** — a standing state of the subject, from an
  earlier turn, occupying the asked quality's slot (the
  R5/R7.5 aspect-slot discipline) with a different value,
  or the asked quality itself under negation;
- **graph** — a path runs from the subject to another
  quality of the same aspect, over the same edge family
  the question-answerer itself uses, so what the check
  finds is exactly what the system would answer with on
  the corrected ground.

Anything else is absence — §7c's context-request
territory, not the stance's. An is-question carries no
presupposition and is never stanced.

**The stance, at its two sites.** The record case was
already half-built by R7.5: a why-question whose
presupposition the record contradicts is answered by
stating the standing state, with no causal form built.
S5 completes the pattern there — the reply gains the
third beat, the conversation re-offered on the corrected
ground ("The cat is black. Did you mean why the cat is
black?"), and the stance-repair pending opens. The graph
case replaces a decline: where the path search fails and
the question would have left as "no path runs from winter
to warm in what I know", the premise degree is consulted
first, and on contradiction the reply is the stance in the
design's own form ("Winter is cold, as I have it. Did you
mean why winter is cold?"). The counter-fact is in both
cases the record's or the graph's — the unit contributes
the shape, never the fact.

**The premise never enters the record.** A why-question's
own recording of its presupposed quality is set aside at
the stance site, under T-R7.5's stated discipline. Without
this, the stance's first firing left "winter is warm"
standing as a recorded state, and the next question about
winter was answered from the false premise itself — found
by transcript during the build, and the reason the splice
stands in the code with its grounds.

**Insistence.** The stance-repair pending (held in the
register type since S1) is live. It is read ahead of
recording and question routing, because either can carry
an insisting turn elsewhere: a repeated why-question over
a recorded state routes to the explanation paths, and an
assertion of the premise would supersede the very state
the stance rests on. Both insistence shapes are met the
design's way — the premise re-read as a supposition,
never adopted:

- a repeated why-question is answered under the
  supposition framing ("Supposing winter were warm — I
  have nothing that would make winter warm. As I have it,
  winter is cold.");
- an assertion of the premise is not recorded as a state;
  the reply restates the ground briefly, with no second
  stance and no re-offer.

Either way the disagreement is recorded in the
Conversation register in plain renderings ("winter is
warm" against "winter is cold", with its turn), and the
pending closes. A stance-repair pending that the next
turn neither repairs nor insists on lapses — the repair
window is the turn that follows the stance.

The predication the insistence check reads is taken in
either shape the parser draws it — the copula's
predicated-as/predicate edge, or the verb-rooted reading
where the quality stands as root and the subject as its
agent. That second shape is not hypothetical: within one
process, a dual-category quality's later parses take it
(the sentence layer's recorded probe-poisoning), and the
gate arcs below exercise both.

## Gates (delivered runs, this tree)

- Suite: **761 pass, 0 fail** (764 counted; S4's tree's
  758/761 plus S5's three net social tests). One pin
  corrected in place with its reason recorded: the R7.5
  (g) transcript, whose reply now carries the stance's
  re-offer — the record answer's substance (the standing
  state predicated, no derivation built) is asserted
  unchanged in the same test.
- Demo **29/29** (27 exact); holdout **80/80 parsed**, 0
  parse regressions (the one round-trip regression is the
  known pre-existing provider effect).
- Sense sets **A 11/11 · B 5/6** — unchanged.
- `npm run ai:check` OK (82 nodes).
- Transcripts, through the real turn loop: the graph arc
  (stance → insistence by re-asking → supposition,
  disagreement recorded, winter never recorded as warm);
  the record arc (stance on the record's fact →
  insistence by assertion → non-adoption, the established
  state standing, the insisted one absent); and the
  absence control (an uncontradicted why-question still
  declines as a don't-know, no stance taken).

Registry: Social Unit 70% → 85%, Conversation 55% → 70%;
summaries updated, the unit's PLACEHOLDER records S5, and
every awareness node's percent was diffed against HEAD —
exactly the two intended changes stand.

## What this does not show

The graph source of the degree reaches qualities the
graph itself carries. The season profile's light
qualities (dark/bright) are established by the profile
machinery inside the question-answerer, not by graph
edges, so a premise contradicted only there ("Why is
winter bright?") still declines — a located miss, named
here rather than papered over: the degree's graph branch
would need the profile's poles, which live with the
answerer. The stance is wired for why-questions, the
premise-carrying shape the parser marks as such; other
presupposition carriers (factives, "the" of a
contradicted description) are not detected. And the
insistence reading covers the two shapes named above; a
person who insists in other words ("But winter IS warm,
everyone knows it") is met by the ordinary machinery, not
by the supposition framing. As with S2–S4, the sealed
probe run remains the holder's, commissioned separately —
it is the programme's acceptance run, and nothing in this
slice stands in for it.
