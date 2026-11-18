# Social Unit S6 — report (2026-11-18)

Slice S6 of the Social Unit design (§11): Interlocutor
persistence across conversations, identity-keyed. Bar
item 9, across conversations. Built in the worktree
`~/workspace/ansci-track-social-seq` (branch
`track/social-unit-seq`, stacked on S5's commit) on the
owner's direct commission, given 2026-11-18 after the
S2–S5 sequence completed — ahead of ruling 5a's
precondition (a deployment with identified returners),
and gated on synthetic returners as the owner directed.
Local commit; push waits for the owner's word.

## What was built

**The store.** `src/fork/interlocutor-store.ts` holds the
durable core and nothing else, keyed by a stated identity:
the name as stated, the number of conversations held
under it, and the topics established with them. Two
implementations — an in-memory store (the gates' store)
and a JSON-file store (the deployment form; the whole
record set as one object, read at construction, rewritten
on each write; an unreadable file starts empty, since
losing the core loses courtesies, never facts a
conversation itself established).

One design point had to be settled in the build, and is
recorded here rather than passed over: within a
conversation the register holds **pointers** to session
objects, never copies (design §5) — and pointers cannot
cross conversations, because the objects they point to
die with the session. The persisted form of "established
with them" is therefore the topics' **renderings** — the
topic lemmas accumulated across conversations. No
statements, no states, and no other session content
cross: what was said in an earlier conversation is not
carried into a later one as if it stood there.

**The one consultation point.** The store is consulted at
exactly one moment: when the interlocutor states their
identity in the present conversation (the self-naming the
reading has recognised since S1). Only then may a record
be read — a hit marks the contact "returning", loads the
prior conversation count and established topics into the
register's new prior-fields, and the naming turn's reply
acknowledges the return ("Welcome back, Sam."). Before
that statement, no recognition is performed: a returning
person's greeting is answered as any greeting is, and
the register stands at first contact. A visitor who
never gives a name writes nothing and is first contact
every time; a different name is a different record, and
no recognition crosses identities. The key is the stated
name normalised (trimmed, case-folded) — the name is the
only identity channel this system has, and two people
stating the same name share a record: the known limit of
the channel, recorded in the store's header rather than
disguised.

**The write.** Once an identity is known, the durable
core is rewritten at the end of every turn — this
conversation counted once (the loaded count plus one),
the established topics as the union of the prior ones and
this conversation's topics so far. Writing per-turn,
rather than at farewell, means a conversation that ends
without a goodbye has still left its core. Sessions
without a store are untouched: every S1–S5 behaviour is
exactly as it was, which the suite's unchanged figures
below show.

**The demonstrator.** `scripts/fork-chat.mjs` now carries
the file store, its path deployment configuration
(`ANSCI_INTERLOCUTOR_STORE`, defaulting to a per-user
file), so the surface the owner runs by hand persists
identities between runs.

## Gates (delivered runs, this tree)

- Suite: **764 pass, 0 fail** (767 counted; S5's tree's
  761/764 plus S6's three tests).
- Demo **29/29** (27 exact); holdout **80/80 parsed**, 0
  parse regressions (the one round-trip regression is the
  known pre-existing provider effect).
- Sense sets **A 11/11 · B 5/6** — unchanged.
- `npm run ai:check` OK (82 nodes).
- Transcripts, through the real turn loop: the synthetic
  returner (first conversation establishes the record;
  second conversation greets unrecognised, names
  themselves, and is welcomed back with the prior picture
  loaded and the count advanced); the anonymous visitor
  (two conversations, nothing written); the second name
  (a different record, no cross-recognition). The same
  arc was also run end-to-end through the chat surface
  itself — two separate `fork:chat` processes sharing one
  store file: the second run greets plainly, then answers
  "I'm Sam." with "Welcome back, Sam.", and the file on
  disk shows the record at two conversations.

Registry: Social Unit 85% → 95%, Interlocutor 30% → 75%;
summaries updated, the unit's PLACEHOLDER records S6, and
every awareness node's percent was diffed against HEAD —
exactly the two intended changes stand. The Social Unit
stands at 95 rather than 100 because the remaining
distance is not another slice: it is the programme's
acceptance run.

## What this does not show

The gates are synthetic, as commissioned: the returner is
the same stated name in a test harness (and in two chat
processes driven for the purpose), not a deployment's
identified returners — ruling 5a's precondition remains
unmet in the world, and this slice does not pretend
otherwise. The identity channel is a self-stated name,
taken on trust: anyone stating "Sam" is loaded Sam's
picture, which is the design's identity-keyed discipline
operating on the weakest channel — a deployment with a
real identity channel would key the same store by it
unchanged. Very short names may not reach the store at
all: "I'm Jo." does not parse as a self-naming (a located
sentence-layer limit, found by probe during the build),
so a two-letter name is never learned, let alone
persisted. And what a later conversation can *do* with
the loaded picture is deliberately narrow in this slice:
the return is acknowledged and the picture stands in the
register; no reply draws on prior topics as if they had
been established in the present conversation, because
they were not. With S6, the design's six slices are all
built. The programme's remaining step is the sealed
probe acceptance run — the holder's, when the owner
commissions it.
