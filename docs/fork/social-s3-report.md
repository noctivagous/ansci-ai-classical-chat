# Social Unit S3 — report (2026-11-18)

Slice S3 of the Social Unit design (§11): self-facts as data in
Awareness Self's Tables; self-queries answered from record via
the unit. Bar item 2. Built in the worktree
`~/workspace/ansci-track-social-seq` (branch
`track/social-unit-seq`, stacked on S2's commit) under the
owner's sequence authorization for S2–S5, whose S3 rider named
this slice's second half: the modal-parse fix, carried here as
located scope. Local commit; push waits for the owner's word.

## What was built

**The Self tables (identity.ts, capabilities.ts).** Awareness
Self's two placeholder tables now exist as data modules in
`src/fork/`, in the map's own convention (file: null,
currentCode pointing at the module). Identity holds the name
("AnSci") and the kind line; Capabilities & limits holds two
lists of plain first-person sentences, the limits as candid as
the capabilities. The contents are the design §9 draft's
facts, in the first person the system speaks with. The design
reserves the final text of visitor-facing claims about the
system to the owner; the tables are where that text lives —
configuration data, not code — and the report flags the
standing text as the draft's, awaiting his wording whenever he
cares to settle it.

**The unit as the record's reader (social.ts).**
`requestIdentity()` and `requestCapabilities()` are the unit's
requests to the Self tables (design §9, ruling 2a): the facts
are handed to the Planner from the one source, and the unit
holds no copy, so the self it presents cannot drift from the
self the rest of Awareness reads.

**The answers (turn.ts, plan.ts).** A self-query object is now
answered from record instead of declining:

- *Identity* ("Who are you?", "What are you?"): the Planner
  predicates the table's name of the system as a reply object
  (`planSelfIdentity` — the bare predication construction; the
  Verbalizer generates "I am AnSci."), and the Identity
  table's kindLine rides beside it as the record's own
  sentence.
- *Capability* ("What can you do?"): the Capabilities & limits
  table presented as stored — its capabilities, then its
  first limit, the material one. The list is the answer, so
  this branch composes from the table and authors no reply
  object (reply.ts's stated boundary: objects exist where the
  Planner composes from a graph).

Either way, the authoring discharges the unit's self-answer
demand — the obligation S1 raised and S2 left standing is now
closed in the same turn. Before S3 both shapes fell into the
question path and declined ("I have nothing on you in my
notes…"): the system could not say who it was.

**The modal-parse fix (parse.ts) — the rider.** "What can you
do?" failed with "no verb found": EN_AUX classifies every
do-form as an auxiliary, so the lexical verb in "What can you
do?" (and "What do you do?", "You can do it.") was invisible
to the verb scan. The fix is a pass inside the existing
WordNet fallback: a do-form the clause did not take as its
auxiliary, sitting in verb position after the subject chunk,
is re-read as the clause's lexical verb. Position plus the
already-taken auxiliary are the evidence, in the parser's own
idiom; do-support questions with a real verb never reach the
pass, and the inverted auxiliary itself is never re-read.
The resulting parse is the full shape — root "do", agent
"you", questioned patient "what", aux "can" — and it
round-trips exactly.

**Recognition (assess.ts).** The capability self-query is
recognised from that shape: interrogative, verb root "do",
agent "you", the clause carrying modal "can", the questioned
slot "what". The modal is required — "What do you do?" asks
after an occupation, not a capability, and stays an ordinary
question (a test pins the distinction). It parses now, where
before it failed outright; its decline comes from the general
question path, whose wording for do-questions ("nothing you
have told me says what was did") is that path's own existing
behaviour, exposed — not created — by the parse fix, and not
this slice's surface to repair.

## Gates (delivered runs, this tree)

- Suite: **751 pass, 0 fail** (754 counted; S2's tree's 748/751
  plus S3's three new social tests). The parse fix broke
  nothing anywhere in the suite.
- Demo **29/29** (27 exact); holdout **80/80 parsed**, 0 parse
  regressions (the one round-trip regression is the known
  pre-existing provider effect).
- Sense sets **A 11/11 · B 5/6** — unchanged.
- `npm run ai:check` OK (82 nodes).
- Transcripts (the slice's gate shape): "Who are you?" and
  "What can you do?" answered from record at the opening and
  mid-conversation, in the test file, through the real turn
  loop; the self-answer obligation discharges in both.

Registry: Identity 0% → 75% and Capabilities & limits 0% → 75%
(both now built tables, state placeholder → partial), Self
15% → 25%, Social Unit 40% → 55%; summaries updated and both
PLACEHOLDER files (self, social-unit) record S3. Every
awareness node's percent was diffed against HEAD after the
edits — exactly the four intended changes stand.

## What this does not show

The tables' text is the design's draft content, not the
owner's settled wording — the mechanism is proven, the claims
are his to reword in the tables whenever he chooses, and no
gate here judges the wording. The capability answer's shape
(capabilities, then the first limit only) is a presentation
choice made in this slice, recorded here; presenting all
three limits would be a one-line change if he prefers it.
"What can you do?" is the one capability phrasing recognised;
nearby phrasings ("What else can you do?", "Can you do
anything else?") are not drawn, and the recognition will not
fire for them — a located narrowness, accepted for this slice
rather than generalised without evidence. As with S2, the
sealed probe run remains the holder's, at the end of the
sequence.
