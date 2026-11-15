# Demo — parsing sentences with the Five Elements

This directory is the standing demonstration that this repository's
sentence layer parses English and Chinese **by means of the Five
Elements** （五行， Wuxing) — not as decoration on top of a
conventional parser, but as the mechanism itself.

Every word in a parsed sentence carries two addresses: a *syntactic*
element (the job the word does in the sentence — verb = Wood,
adjective = Fire, noun = Earth, function words = Metal, adverb =
Water) and, where the knowledge graph knows the word, a *semantic*
element (its place in the Five-Element ontology of the world). The
two cycles — generating （生， sheng) and controlling （克， ke) — are
the dynamics the parser's checker enforces and the generator walks:
tense must sit on the Metal carrier that controls the Wood verb
(which is why *"She didn't arrived"* is flagged), a Chinese numeral
must generate its classifier in fixed order, negation, mood and
aspect are cycle relations rather than feature lists. Parsing joins
the sentence to the same knowledge graph the rest of the system
reasons over, so a classification learned from a sentence is
knowledge, not annotation.

## What the scoreboard does and does not show

The corpus below is a *fitted* demonstration: every sentence in it was
chosen because it exhibits a mechanism this parser was built to handle,
so a full score here shows the mechanisms work — it is not a general
parser accuracy result. On sentences the parser was never fitted to
(the frozen 80-sentence holdout in `docs/fork/`), the parse success
rate is 85% with the WordNet provider on — a parse *success* rate, not
a correct-meaning rate; exact round-trip regeneration there is ~12%,
which is why the project's current work is a feature-preservation
metric rather than string matching (see Part C of
`docs/fork/repair-programme.md`). Mechanical reproducibility is not
independent validation; the project's judged benchmarks are separate
instruments, and their results will be reported separately when they
exist.

## Run it

From the repo root (Node >= 20):

```sh
npm run fork:demo
```

That builds the project and runs `run.mjs`, which regenerates the
two files below from the corpus. Nothing in them is hand-written.

## The files

| File | What it is |
| --- | --- |
| `sentences.tsv` | The standing corpus: 26 English and Chinese sentences, each chosen to exhibit one mechanism, each carrying the expectation the parser must meet. Changed only by deliberate corpus decisions. |
| `transcript.md` | The full generated record: for every sentence, its two-address classification, its meaning-graph relations, its place in the knowledge net, the checker's verdict, and its round-trip regeneration. |
| `RESULTS.md` | The scoreboard: how many expectations the current parser meets, sentence by sentence, plus a history table that gains a row whenever the scores change — the improvement record, kept in the repo. |
| `run.mjs` | The runner. Real output only; failures are printed, scored, and left standing. |

## How to read the transcript

- **classified** — each word as `lemma:syntactic/semantic(role)`.
  `furious:Fire/Wood` is the two-address scheme in one token: Fire
  because it is an adjective, Wood because anger sits at Wood in
  the ontology.
- **in the net** — the semantic classifications that join the
  sentence to the knowledge graph, with provenance and confidence.
- **checker** — the controlling-cycle checker's verdicts. Two
  corpus sentences are *supposed* to be flagged; a flag there is a
  pass.
- **round-trip** — the sentence regenerated from its own meaning
  graph. *Exact* means the identical string came back;
  *canonicalised* means the same graph in the generator's canonical
  form.

## The standing rules

- The corpus is the contract. Improving the parser means the
  scoreboard moves; weakening an expectation to make it move is
  visible in this directory's history and is not done silently.
- Failures stay in. A sentence the parser cannot yet handle is
  recorded as a failure in `RESULTS.md`, not removed from the
  corpus.
- The exhibit is regenerated, never edited. If `transcript.md` and
  the parser disagree, the parser is what changed — rerun.

The parser itself lives in `src/fork/`; its design and the
evaluation record behind these claims are in `docs/fork/`.
