# Milestone 1 — the target conversation level

**Status: TARGET, not a recording.** This document fixes the level of
conversation AnSci is committed to reach at the ConceptNet stage. The
transcript below is *projected* — written to specification, not captured
from the running system. Milestone 1 is reached when the real system,
evaluated against suites like this one, converses at this level.

**What "the ConceptNet stage" means.** Slices 2b–2e of the design doc
(`docs/design-base-nets-and-chat.md`) are built: the router (§7), thought
and memory (§8), the translation layer in its template form (§9),
propagation and the ontology-as-engine (§6), FrameNet (§5), and ConceptNet
as the everyday-commonsense base (§4). The ontology (yin/yang, Wuxing)
drives the responses as a hidden root: it is the reason the answers are
what they are, and it does not appear on the surface. The Situation
(§§8.9–8.13) is live: in this transcript the system is in Chicago, on a
rainy November morning.

**What is deliberately not in Milestone 1.** The knowledge base (slice
2f) is not built yet, so facts with numbers are hedged or declined. The
Neijing ingestion (slice 2g) has not run, so the framework's claims are
still our assertions rather than citations. The LLM renderer (slice 3)
has not replaced the template renderer, so the sentences carry the
content in slightly more formal dress than the end product will.

---

## The transcript

**You:** morning. bananas on the counter have gone completely brown, bin them?

**AnSci:** Not necessarily — brown bananas are too soft and sweet for
eating as they are, but that's exactly the stage used for banana bread
or smoothies. If they smell fermented rather than just sweet, then yes,
bin them.

> *ConceptNet supplies what WordNet never could: bananas are eaten,
> used for baking, found in kitchens, ripen and soften. The smell test
> is a Causes/property chain rendered as kitchen advice.*

**You:** it's raining again. third day.

**AnSci:** Then it's a proper wet spell rather than a passing shower.
If you're heading out: coat rather than just an umbrella in this —
rain that's settled in for days usually comes with wind, and umbrellas
lose that fight.

> *Situation (November, Chicago, morning) + the precipitation anchor +
> ConceptNet's umbrella–rain–wind associations. The ontology quietly
> agrees with the advice — damp and cold together call for covering,
> not just shielding — without saying so.*

**You:** why do I always get a headache when the weather turns like this?

**AnSci:** You're not alone in it — long grey, damp stretches are a
common trigger: light drops, sleep gets shallower, people stay indoors
in stale air and drink less water than they think. Any one of those
can do it; together they stack. If it's one-sided or comes with vision
changes, that's a different matter and worth a doctor, not a chat.

> *Causes edges from ConceptNet, the seasonal pattern from the engine —
> and a safety hedge the renderer is licensed to make as a speech act,
> not an invented claim.*

**You:** I'm buying a winter coat today, what should I look for?

**AnSci:** Where you are, buy for wind first and warmth second: a shell
that stops wind, insulation that still works when it's damp, and a
hood — most people lose more comfort to wind and wet than to cold air
itself. It should close properly at the neck and wrists; that's where
the heat gets out.

> *FrameNet's commerce frame quietly structures this (buyer, goods,
> money, purpose) and the Situation aims it — Chicago in November, not
> generic coat advice. The priority order is the framework's reading of
> winter rendered as shopping sense.*

**You:** my wife keeps making ginger tea when it's cold, swears it warms you up

**AnSci:** She's in good company — ginger is one of the classic warming
foods, used for exactly that for a very long time. Fresh ginger in hot
water will make most people feel warmer whether or not it changes much
underneath; in cold, damp weather it's a sensible ritual either way.

> *ConceptNet knows ginger is used in tea and cooking; the "warming
> food" classification is the ontology's — surfaced as tradition
> ("one of the classic warming foods") rather than doctrine, per
> plain mode.*

**You:** are penguins found in the north pole?

**AnSci:** No — penguins are southern-hemisphere birds, mostly around
Antarctica. The north has bears and foxes; the penguins are at the
other end of the world.

> *A place-association question ConceptNet handles well — and a quiet
> test of the December rule's family: hemispheres are real in this
> system, not trivia.*

**You:** what's the population of Chicago?

**AnSci:** That's the kind of figure I don't hold reliably yet — I
know the city's situation and character better than its statistics.
Around two and a half to three million in the city itself is the right
ballpark, but treat that as an estimate, not a fact I can stand
behind.

> *The pre-2f boundary, visible on purpose: no knowledge base yet, so
> numbers come hedged or not at all. After 2f this is a retrieved
> association with a source; before it, honesty.*

---

## Calibration notes

- **What this stage adds over the WordNet stage:** the world gets
  bigger — objects have uses, places have inhabitants, weather has
  consequences, shopping has structure — while the ontology's share of
  the answers stays roughly the same size, better hidden inside more
  competent company.
- **Noise is expected and priced in.** ConceptNet's edges are noisier
  than WordNet's, so the renderer's hedge bands fire more often
  ("usually", "commonly", "most people"). That softness is the
  confidence machinery absorbing a messier source; it is supposed to
  look like that (§9.4).
- **The two named absences** (facts with numbers until 2f; sourced
  classical claims until 2g) are part of the milestone definition, not
  oversights. A transcript that hides them would be a worse target.
- **Acceptance:** Milestone 1 is met when scripted evaluation
  conversations at this level pass the design doc's suites — the Router
  Probe Suite (§7.9), the thought/memory cases (§8.8, §8.14), the
  renderer cases (§9.7) — with the surface scan showing zero framework
  terms in plain mode while the paired debug run shows the answers
  were ontology-derived.
