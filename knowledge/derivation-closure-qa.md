# Derivation-closure — a question from the discussion

*Recorded 2026-11-22, from the side-chat discussion that produced the
design note in `basic-knowledge-sources.md` and the plan in
`derivation-closure-plan.md`. The owner's question, with the answer as
given.*

---

## How is it that this derivation-closure graph stores less information than a graph or vector DB?

Because it stores the *programme* instead of the *output* — and the two
have very different sizes wherever the world is regular.

### The core move

A stored graph writes down every fact individually:

```
copperBowl  conductsHeat   yes
ironPot     conductsHeat   yes
steelPan    conductsHeat   yes
... one row per artefact, per property, per context — forever
```

A derivation graph writes down the pattern once, plus the
classifications it ranges over:

```
RULE:  madeOf(X, M) ∧ conducts(M, high)  →  conducts(X, high)
DATA:  copperBowl madeOf copper · ironPot madeOf castIron · conducts(copper, high) …
```

That one rule *stands for* every artefact–material pair that will ever
be classified. The facts it produces were never independent pieces of
information — they were **redundant consequences** of the rule plus the
classifications. A graph DB pays storage for the redundancy; a vector
DB pays it too (one vector per item, and the item list still has to
exist). The derivation graph declines to store what it can regenerate.
In the testbed's small numbers: **35 rules + the property/classification
entries answered 54 questions; the stored baseline with 25 facts
answered 23** — and matching the closure's coverage by storage alone
would have needed a stored fact per question, per material, per
context, growing multiplicatively where the rules grow additively.

### The honest accounting — nothing is free

| | Graph / vector DB | Derivation-closure |
| :--- | :--- | :--- |
| Pays in | Storage, up front, for everything | **Compute at query time** (cheap — microseconds per step) and **authoring effort** (the rules must be written) |
| Cost of a new artefact entering the domain | Its full row of behaviour facts | Its classification entries only — its behaviour *follows* |
| Cost of a new rule of the world | Nothing (facts are facts) | One rule — and a whole family of facts appears |

And the boundary of the trick, which the test also demonstrated: **only
the regular part of knowledge compresses this way.** A rule can
generate "metal things conduct" because the world is regular there. It
cannot generate "the capital of Oklahoma is Oklahoma City" — that is
irregular information, present nowhere in any pattern, and it must be
stored or fetched (attested core, oracles). Exceptions are the same:
"birds fly" compresses; *penguins* do not — the exception is genuine
extra information that no rule contains. This is exactly the
missing-axis lesson from the other side: cast iron's heat retention was
not derivable not because the walk was weak, but because the
information *was not in the generators* — a missing rule is a whole
family of facts silently absent, where a stored graph's missing fact is
just one fact missing.

So the precise claim: **a derivation-closure graph stores less because
most everyday knowledge is consequences, and consequences are cheaper
to regenerate than to keep** — the explicit store holds only
vocabulary, classifications, rules, and the irregular residue. What it
gives up for that saving is that everything it "knows" beyond the
residue is only as real as its rules — which is why the pricing, the
receipts, and the witnesses exist.
