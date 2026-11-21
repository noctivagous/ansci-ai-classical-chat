# Link Grammar F2 root investigation

2026-11-21; checkout `62facc8`. Investigation, not a repair or a new
held-out evaluation. The two original F2 failures were observed previously;
the controls below are exploratory and were chosen after seeing them.

`A tall woman in a red coat entered.` currently roots on `coat`, with
`entered` as its theme. `The woman entered.` roots correctly on `enter`.
In `parse.ts`, `enItems` classifies hand lexicon entries immediately, and
`parseEnBody` selects the first item already classified as a verb before
the WordNet fallback scans after the subject chunk. Its existing capture
recovery only handles a verb-classified noun preceded exclusively by
determiners; a noun inside a prepositional phrase following a subject falls
outside that condition. This identifies the selection seam, not a complete
repair: changing precedence can alter genuine verb and noun ambiguity.

`The key to the cabinet is missing.` roots on `miss` and loses `cabinet`.
`The book on the table is blue.` retains `book`-`modifier`-`table`, but
chooses `predicated-as` for blue. Therefore the failure is not simply all
copulas dropping all PPs. Inspect the competition between the `missing`
verb/participle reading and the copular predicate branch before changing it.
Further controls: `The bird in the cage sings.` preserves the modifier;
`A man with a black watch arrived.` selects `arrive` but drops `watch`.

The shadow is computed after `parseEnBody`, and F1 routing may additionally
invoke `safeSolveLinkage` within the main branch. The recorded run reports
substantial suite cost, so a future runtime change must account for both
call sites, preserve explicit disabled/declined/budget outcomes and verify
F1 routing behavior. Moving a synchronous solver off the turn path requires
an asynchronous interface or a separate diagnostics pass; it changes when
traces become available. No performance improvement is asserted here.

Follow-up (2026-11-21): mutable noun/verb and copula controls were added in
root-copula-controls.md and root-copula-controls-dev.json. The controls exposed
and verified two narrow changes: preserve nominal "to" PPs inside subjects,
and prefer an available adjective reading for post-copular -ing forms when no
direct-object NP follows. The controls pass 10/10. The sealed F2 graph score
increased from 2/4 to 3/4; the coat/root-selection failure remains. The
adjective default is not a complete disambiguator for agentless passives and
progressives, and the development controls are not held-out evidence.

Next: investigate root selection in the coat case with a separate control
family and measure its parser-wide effects before attempting routing.
