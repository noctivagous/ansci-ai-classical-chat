# WP4 aspect spec — the feature bundle and the dispatcher (stage 2)

Status: buildable specification, drafted by Kavi 2026-11-15 for depth
programme stage 2 (Part C.2), implementing the v5 aspect design
review. The outside-AI review of this spec has not happened (the
standing arrangement is Kavi drafts, the AI reviews); the build below
follows this draft, and the review remains owed.

## 1. The bundle

The parser's aspect state stops being a single label
(`"perfect" | "progressive"`) and becomes a feature bundle —
`NodeStates.aspect?: AspectBundle` — because the five patterns of
the v2 design are **not exclusive states** but named configurations
over compositional features (v5 review):

```ts
interface AspectBundle {
  bounded?: boolean;      // event viewed as a whole (perfective viewpoint)
  ongoing?: boolean;      // event viewed from inside (progressive/durative)
  perfect?: boolean;      // event anterior to reference time, result relevant
  experiential?: boolean; // event experienced at least once (过)
  habitual?: boolean;     // event as a recurring pattern
  inchoative?: boolean;   // event viewed at its onset
  resultative?: boolean;  // event viewed through its result state
}
```

Named configurations: perfective = {bounded}; progressive =
{ongoing}; perfect = {perfect}; experiential = {perfect,
experiential}; habitual = {habitual}; inchoative = {inchoative};
resultative = {bounded, resultative} (the result content itself
rides the existing `result` edge — the bundle marks the viewpoint).

## 2. Construction families (the dispatcher)

Parse-side recognition and generate-side realisation are one
contract per family; a family the dispatcher does not recognise is
an **abstention**, never a guess.

English:
- be + V-ing → {ongoing}; generation: agreeing be-form + -ing form.
- have/has/had + participle → {perfect}; + been + V-ing →
  {perfect, ongoing} ("has been baking").
- simple past (no perfect/ongoing marking) → {bounded}; generation
  is the simple form, so bounded alone is surface-neutral.
- simple present → no bundle (aspectually unmarked in this system).
- ABSTENTIONS (v1): "used to" habitual, "begin/start to" inchoative,
  perfect passives ("has been baked"). The bundle can carry
  habitual/inchoative; no EN construction yet produces them.

Chinese:
- V + 了 → {bounded}; V + 着 → {ongoing}; V + 过 → {perfect,
  experiential}. Generation re-emits exactly the particle the
  bundle's features select (了/着/过), per verb in a serial chain.
- Habitual via adverbs (常/经常): ABSTAINED in v1 — the probe item
  parses but no bundle is produced; the adverb layer does not yet
  feed the bundle.
- Positional rule: 过/着 are aspect particles when they immediately
  follow a verb; standalone 过 as a main verb is outside this
  family's coverage (recorded casualty, none in the corpora).

## 3. Vendler compatibility layer (v1)

Lexical aspect constrains viewpoint aspect. v1 implements the one
rule with a defensible evidence base and abstains elsewhere:

- A curated stative set (know, believe, love, hate, want, need,
  seem, own, contain, belong, resemble, exist, matter, consist):
  {ongoing} over a stative lemma is an `aspect-compatibility`
  violation (Metal→Wood: an imposed form the content cannot bear).
- Any verb outside the set: the layer abstains — no verdict.
  Frame-family-based Vendler classification is future work, gated
  on the same evidence discipline as everything else here.

## 4. Irregular-form selection (the dispatcher's morphology leg)

Derived verbs stop regularising blindly. The WordNet extract's
forms index (non-identity inflections only) is inverted per lemma
and the candidates are filtered **by form class** — necessarily:
the index itself contains regularised forms of strong verbs
("beginned", "forgetted" are attested surfaces in it), and its
doubling rules differ from the local regularisers, so membership
proves nothing and equality filtering fails. A strong past or
participle never ends in -ed or -ing and is never the third-person
form, so those classes are excluded wholesale. Selection among the
survivors: a candidate that is another candidate + -en (sunken
over sunk) is dropped as the derived form; the u-form of an a/u
ablaut pair (sang/sung, began/begun) is the participle; else an
-en/-n candidate is; the past takes the remaining candidate. A
verb with no surviving candidates keeps the regular forms. Known
error modes, recorded: identity-past verbs (cut, hit) and identity
participles (become) are invisible to the index — the form equals
the lemma, so no non-identity surface exists to find — and keep
the (wrong) regular or default form until another source speaks.
The ratified dispatcher bar is ≥98% irregular-form selection,
measured on the stage-2 forms list.

## 5. Stage-2 acceptance (from Part C.2 + the ratified policy)

- Aspect-feature preservation ≥95% on aspect-bearing round trips
  (features.ts aspect family, sentences whose original parse carries
  any bundle feature).
- Overall feature preservation ≥90% after this stage (holdout).
- Irregular-form selection ≥98% on the forms list.
- Bundle accuracy on the aspect challenge set (exact feature-set
  match), reported per construction family; probe-class items are
  reported descriptively, never counted.
- Non-regression: holdout parse rate ≥85%; demo expectations all
  met; valency challenge metrics do not fall.
