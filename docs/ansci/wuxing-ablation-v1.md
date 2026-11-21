# Wuxing sense ablation: exploratory sample

2026-11-20. Ten new examples were authored by the assistant after inspecting
the existing implementation and earlier challenges, then written to
`data/ansci/wuxing-ablation-v1.json` before execution (SHA-256
`99213208eb5f21c3338798118029607e7b4486508a8b2ecb72297ce526e2272b`).
This is not independently authored or independently adjudicated, and is not
a representative conversational sample. The intended readings are plain
English descriptions, not independently verified element labels. Therefore
we cannot calculate sense accuracy from an element match.

Run `npm run build --silent` followed by `node scripts/ansci-wuxing-ablation.cjs`.
Raw output is `docs/ansci/wuxing-ablation-v1-results.jsonl`. Each mode runs in
a fresh process with the same ordered corpus. The instrument replaces the
loaded, compiled sense module in memory only; source and compiled files are
not edited. Variants: off; full; same-element support plus Lesk; Lesk only;
cycle support without Lesk; and same-element support without Lesk. `lesk`
uses the existing Lesk eligibility and confidence-band gates, with all
support scores zero. `same` retains Lesk at ties. `cycle_no_lesk` includes
same-element support as well as cycle support. These are research variants,
not production switches.

All six variants parsed 10/10 inputs, matched the same 17/20 manually
specified role assertions, and returned identical target element values:
Wood, Wood, absent, absent, Fire, Fire, Water, Water, absent, absent. The
assertions are provisional and inspect only named edges; they are not a
complete graph accuracy measure, and roles such as patient versus theme
need independent review. The instrumentation does not measure full node
element differences, nor can this sample separate the cycle contribution:
there were no changes in the inspected target elements. Two cases contain
the same target element for different intended readings, illustrating why
element labels alone cannot demonstrate sense accuracy. No cycle path was
reported in these ten turn traces.

As an instrumentation control, the previously used development example
`His passion became rage.` returned Fire with the pass off and Wood in
all five enabled variants, including same-element-only without Lesk and
Lesk-only. The switch can expose a known effect; this particular case does
not demonstrate an added contribution from cycle adjacency.

Separate reachability probe on a fresh session: `I cannot sleep.` produced
`Water→Wood (generating)` and `I am worried.` next produced
`Earth→Water (controlling)`. This confirms live steering on these inputs,
not improved quality or a causal comparison with steering disabled. The
role checker `assessMissingRoles` is called from `turn.ts`; `checkSentence`
and `assessValency` have no source caller. The sense ablation does not
disable cycle-based steering, and no conclusion about steering quality is
supported. A separate controlled steering ablation and human reply ratings
remain needed.

The existing sense challenge remains positive on its small builder-authored
sets, but this new probe did not reproduce a target change. It is not evidence
that cycles never help: coverage, candidate availability and example choice
all affect whether the pass can act. A useful next study needs independently
authored contextual readings, explicit sense identifiers, balanced cases
where eligible candidates exist and do not exist, and a frozen scoring rubric.
