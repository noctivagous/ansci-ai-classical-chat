# RelEx semantic pass / native relations / R2L — mechanism survey

Stage 0 of the RelEx completion slice (2026-11-23). This document
records what upstream RelEx actually does, from its Java sources
and rule data, so the port stages that follow work from the
mechanism and not from memory. No `src/` changes in this stage.

Upstream sources read (opencog/relex, Apache-2.0, cloned
read-only 2026-11-23; opencog/opencog for R2L):

- `src/java/relex/RelationExtractor.java` — pipeline driver
- `src/java/relex/algs/SentenceAlgorithmApplier.java` — pass order
- `src/java/relex/algs/{MorphyAlg,PrepositionLinkAlg,TenseConjoinAlg,WordSequenceCombineAlg,TwoWordCombineTo*Alg}.java`
- `src/java/relex/morphy/{Morphy,MorphyJWNL,MapMorphy,SuffixStemmer}.java`
- `data/relex-tagging.algs` (1646 lines), `data/relex-semantic.algs`
  (4034 lines), `data/relex-stanford.algs` (684 lines, already
  vendored), `data/relex-penn-tagging.algs` (280 lines)
- `opencog/nlp/relex2logic/` in opencog/opencog (Scheme)

## 0. The pipeline, exactly

`RelationExtractor.processSentence()` per parse:

1. LG parse (JNI link-grammar; AnSci: the WASM build).
2. `stripSubscripts(parse)` — for English parses only: splits the
   dictionary subscript off each word (`gave.v-d` → word `gave`,
   feature `subscript` = `.v-d`), sets every word's `POS` to the
   placeholder `"WORD"`, and creates two distinct copies of the
   word string: `orig_str` (display) and `str` (the working copy
   MorphyAlg will rewrite to the lemma).
3. `sentenceAlgorithmApplier.applyAlgs(parse, context)`:
   **tagging file first, then semantic file** (each an ordered
   list of algorithms, applied strictly in file order).
4. If requested: `extractStanford` (the stanford file) — in the
   upstream default CLI flow the stanford pass runs *after* the
   semantic pass, which is exactly the precondition the AnSci
   Stanford port has been missing.
5. If requested: `pennTag` (penn file; not in scope for AnSci).

Each `.algs` file mixes `#TemplateActionAlg` blocks (the rule
engine AnSci already ported: template conditions over feature
paths, actions `=` / `+=` / `<=` / `%`-clear, group appends) with
a handful of **named non-template Java algorithms** interleaved
at fixed positions. A faithful port must implement those too:

| File | #TemplateActionAlg | Non-template algorithms (in file order) |
| :--- | ---: | :--- |
| relex-tagging.algs | 172 | `#MorphyAlg` (line 661), `#WordSequenceCombineAlg` (900), `#TwoWordCombineToLeftAlg` (1094), `#TwoWordCombineToRightAlg` (1107, 1120) |
| relex-semantic.algs | 367 | `#TenseConjoinAlg` (770), `#PrepositionLinkAlg` (3447) |
| relex-stanford.algs | 61 (+4 multiword SF_IDIOM/SF_HOW_MUCH blocks the existing importer counts within its 61 parsed rules — see the existing slice doc) | none |
| relex-penn-tagging.algs | 28 | none |

## 1. (a) The tagging pass — what it sets, in order

File header: "Perform part-of-speech, tense, noun-number, gender
and entity tagging. This tagging must be performed before
relationship extraction is done."

1. **Coarse POS from subscripts** (`SUBSCR_POS_*`, ~30 rules):
   `<subscript>` regex → `<POS>` ∈ {noun, verb, adj, adv,
   conjunction, …}. This is the Morphy category set; POS starts
   as the placeholder `WORD` from stripSubscripts.
2. **Refined POS from links**: later rules override POS using the
   actual link labels (e.g. a word in an S link is the verb).
   POS assignment counts in the file: `<POS> =` ×47,
   `<subscript> =` ×26 (subscript normalisation).
3. **`#MorphyAlg`** (position: after POS is stable, before tense —
   the file says "Apply word lemmas before working on tense, so
   that tense can make use of the root forms"). For each word
   with `str` and a POS: `morph = context.getMorphy().morph(word)`,
   pick the Morphed entry matching POS (noun/verb/adj/adv; for
   `WORD`, the first category whose root differs from the
   surface), set feature `morph` (with `root` and `type`), and
   **rewrite `str` to the root** when it differs. Skips LEFT-WALL,
   bracketed (skipped) words, and `his` (a WordNet bug workaround:
   JWNL lemmatises his→him).
   The Morphy implementation upstream is `MorphyJWNL` — WordNet
   via JWNL: `Dictionary.lookupIndexWord(pos, word)` plus
   exception lists, i.e. **attested-lemma lookup, not stemming**
   (a `SuffixStemmer`/`MapMorphy` fallback exists in the same
   package). AnSci's honest equivalent: its own Open English
   WordNet extract (`src/wordnet.ts`: `synsetsForSurface` =
   exact lemma → closed forms index → regular-inflection stems
   accepted only when attested). Same contract: a root is
   returned only when the dictionary attests it.
4. **Lemma corrections** after Morphy (`MORPHY_FIX_WOULD/HAD/WILL`):
   `'d`/`'ll` contractions get `str` and `morph root` rewritten
   by link context (I-link → will, PP-link → have).
5. **Tense**: subscript-driven `<tense val>` (past for `.v-d`
   etc.) plus chain rules that build `tense` as a linked list
   (`val` + `prev` → previous tense node) across auxiliary chains
   (perfect, passive, imperative, none). `#TenseConjoinAlg` in
   the *semantic* file later flattens that list into
   `tense name` = the vals joined by `_`.
6. **Number/gender/entity flags**: `<num>` (×8), `<gend>`/`<GENDER>`
   (×10), `<PERSON-FLAG>` (×5), `<ENTITY-FLAG>` (×3) and one-off
   flags (MONEY/MEASURE/DATE/LOCATION/ORGANIZATION/ROLE/
   POSSESSIVE/EMOTICON), plus link flags (TENSE-LINK-FLAG ×6,
   DETERMINER_LINK_FLAG, PREP-OBJ-LINK-FLAG, INV-TENSE-LINK-FLAG,
   BLANK-TENSE-FLAG). `<str> =` ×23 overall (lemma and multiword
   rewrites).
7. **Multiword combining**: `#WordSequenceCombineAlg` and the
   `#TwoWordCombine*Alg`s merge fixed phrases into single
   feature nodes mid-file; later tagging rules then see the
   combined node.

Net tagging output per word: `POS`, `subscript`, `str` (= lemma),
`morph{root,type}`, `tense{val,prev}`, `num`, `gend`, entity and
link flags. Of these, the downstream files actually consume:
POS (semantic + penn; one stanford rule), str (everywhere —
it is the lemma the relations print), tense, and the flags.

## 2. (b) The semantic pass — what it sets, in what order

`relex-semantic.algs`, 367 template rules + 2 named algorithms.
Its working vocabulary on each word's `ref` node: `subj`, `obj`,
`iobj`, `expl`, `head-word`, `conj` (groups), `quantity`,
`possessor`, `degree`, `advmod`, temp slots (`comp_temp`,
`comp_var`, `temp_pred`, `temp_q`, …), and finally
`ref links _X` — the native relations (see §3). Section order
in the file (line numbers of section breaks):

1. **Conjunction location** (~38–127): `conj` groups built from
   AJ/MJ/QJ/RJ/SJ/VJ links, left side then right side, multi
   conjunctions flattened.
2. **Predeterminers** (~128–253): `quantity`, and `xpredet`
   stashed on ref for the preposition rules ("All the boys…"
   subject recovery depends on this).
3. **Implicit constituents / possessive qVars** (~254–529).
4. **Head-word percolation + HEAD-FLAG** (~530–904): the core
   the Stanford file waits for.
   - HEAD-FLAG rules (~766–789): a verb with no aux chain, or the
     final verb of an auxiliary chain, gets `<HEAD-FLAG> = T` on
     the word and `<tense first_verb head-word> += <this>` — i.e.
     the sentence's tense node points at its main verb.
   - `head-word` propagation (~791–903): noun phrases percolate
     their head noun up (`<F_L head-word> = <F_R ref>` over
     determiner/adjective/nn links); verb phrases percolate the
     main verb; question words percolate into `head-question-word`.
5. **`#TenseConjoinAlg`** (770, inside the head-word section):
   flattens `tense{val,prev*}` into `tense name`.
6. **HYP / truth-query marking** (~905–1274): wh-words and
   question structure set `<head-word ref HYP> = T` and
   `TRUTH-QUERY-FLAG` on the main verb's ref; `_predadj`
   promotion and comparative scaffolding live here too.
7. **subj/obj promotion to links** (~1205–1316): the explicit
   bridge rules — `<ref links _subj> = <subj>`,
   `<ref links _obj> = <obj>`, `<ref links _iobj> = <iobj>` —
   after per-construction rules have filled `subj`/`obj` on refs
   (S/O/Pa/Os/Oi link patterns, passive inversions, relative
   clauses, conjunction fan-out: "Create a _subj for each
   conjoined subject").
8. **The long middle** (~1317–3446): per-construction relation
   rules — adverbials, amod/nn, quantities and measures, dates,
   comparatives (`_comparative`, `_compdeg`, degree words),
   possessives, appositives, relative modifiers, `to`/`goal`,
   modals, parataxis, `that`-complements.
9. **`#PrepositionLinkAlg`** (3447): a TemplateActionAlg subclass
   whose extra code step takes the rule's bound `modified`,
   `prep`, `prep_obj`, `prep_source` variables and writes
   `modified ref prep-links <prep>` = prep object ref (group
   members each; repeated preps get indexed names prep2, prep3…).
   The surrounding template rules (~3447–3630) then promote
   prep-links into `links _pobj`-style and named-prep relations.
10. **Negation** (~3630–3722): `NEGATIVE-FLAG` is set on
    `<tense first_verb head-word ref>` — i.e. on the main verb's
    ref, found *through* the tense/head-word chain the earlier
    sections built — for `not`/`n't`/`never` patterns, with
    conjunction fan-out (member0 gets the flag when the head is
    a group). This is why negation cannot fire without the
    head-word machinery.
11. Tail sections (~3723–4034): clean-up, leftover promotion and
    view-preparation rules.

Features the **stanford file** tests that only this pass (or
tagging) can supply — counted in relex-stanford.algs:
`head-word` ×25 (+1 `<head-word ref>`), `HEAD-FLAG` ×3,
`NEGATIVE-FLAG` ×1 (SF_NEG: `<NEGATIVE-FLAG> != %` on the verb's
ref → sf-links `_neg`), `subj` ×2, `obj` ×4, `expl` ×2,
`IS-OBJ-FLAG` ×2 (set inside the stanford file itself by
SF_RCMOD_ID), `DONT_SHOW_PREP` ×2 (set by SF_PREP rules
themselves), `pos` ×1 (SF_INFMOD reads lowercase `pos`, a
feature *nothing* in any of the four files ever writes — the
existing port's note stands: it matches nothing upstream
either), `str` ×3, `orig_str` ×2.

The stanford rules that were dead standalone, by signature:
SF_NSUBJ_COP, SF_OBJ_TO_SUBJ, SF_OBJ_TO_NSUBJPASS,
SF_PREDADJ_TO_NSUBJ(+_M0..M3), SF_NSUBJ_TO_CSUBJ, SF_XSUBJ,
SF_NEG, SF_AGENT, SF_OBJ_TO_PARTMOD, SF_ADVCL_*,
SF_CLAUSAL_COMPLEMENT*, SF_INFMOD, SF_PREP_EXPAND_* — these
produce nsubj, nsubjpass, dobj (via obj→subj promotion paths),
csubj, xsubj, neg, agent, partmod, advcl, ccomp, infmod and
prep_* once `subj`/`obj`/`head-word`/`HYP`/`NEGATIVE-FLAG`
exist.

## 3. (c) The native relation set — where it is produced

There is **no separate native-relations rule file and no Java
relation-extraction classes**. The native relations are produced
by the *same* semantic file: rules write
`<F ref links _X> += <other ref>` throughout, and the output
views (`relex/output/OpenCogSchemeRel.java`, `SimpleView`,
`RawView`) walk `ref links` and print `_X(gov, dep)`. The full
inventory of link names written in relex-semantic.algs
(counted 2026-11-23):

Underscore (dependency) relations:
`_subj` `_obj` `_iobj` `_expl` `_predadj` `_advmod` `_amod`
`_nn` `_det` `_poss` `_pobj` `_prepadj` `_rel` `_relmod`
`_appo` `_to` `_goal` `_quantity` `_quantity_mod`
`_quantity_mult` `_comparative` `_compdeg` `_comp` `_compmod`
`_compobj` `_compadvmod` `_compamt` `_compcontadv1`
`_compcontadv2` `_compprep` `_modal` `_parataxis` `_time`
`_date_day` `_date_year` `_measure_time` `_measure_size`
`_measure_per` `_measure_distance` `_arg0` `_arg1` `_rep`
`_repq`, plus preposition-named links written under `links`
directly (the preposition string itself: `in`, `on`, `to`,
`than`, `than1`, `back`, …) and conjunction links (`conj_and`,
`conj_or`, `conj_but`, `conj_either_or`, `conj_neither_nor`,
`conj_prep`), and question-word links (`which`, `who`, `whose`).

So Stage 2's port is: vendor `relex-semantic.algs` verbatim,
run tagging→semantic with the same engine, and add a native
view that walks `ref links` exactly as the stanford view walks
`ref sf-links`. The extraction "code" beyond the engine is the
two named algorithms (TenseConjoin, PrepositionLink) and the
tagging file's four.

## 4. (d) Relex2Logic — where the rules live, input, output

Home: `opencog/opencog`, directory `opencog/nlp/relex2logic/`
(Guile Scheme; applied by the AtomSpace URE forward chainer —
there is no other implementation; the repo's own README states
the pipeline sentence → link-grammar → relex → relex2logic).

- **Rule inventory**: `rules/*.scm` — 60 rule files. Each defines
  one BindLink: a pattern over AtomSpace atoms —
  `(dependency "_subj" $verb $subj)`, `(word-lemma $word $lemma)`,
  `word-in-parse`, optional `AbsentLink` guards — with an
  `ExecutionOutputLink` to a grounded schema in
  `rule-helpers.scm` (1999 lines) that builds the output atoms.
  `rules/rules.scm` is a no-op placeholder; the loader
  (`loader/gen-r2l-en-rulebase.scm`, `relex2logic.scm`) assembles
  the rulebase.
- **Input**: the AtomSpace form of RelEx output — EvaluationLinks
  named by the native relation (`_subj`, `_obj`, `_iobj`,
  `_predadj`, `_poss`, `_det`, `_quantity`, `_comparative`, …)
  over WordInstanceNodes, plus word-lemma links and sentence-type
  markers (declarative / interrogative / imperative /
  truth-query flags RelEx's semantic pass sets as HYP /
  TRUTH-QUERY-FLAG features, surfaced as atoms).
- **Output forms**: predicate-argument logic atoms, e.g. the SVO
  rule (rules/svo.scm + `SVO-rule` in rule-helpers.scm) emits,
  for lemmas/instances (subj, verb, obj): an ImplicationLink
  (verb-instance ⇒ verb lemma as predicate), InheritanceLinks
  (argument instance ⇒ lemma concept), and an EvaluationLink
  (PredicateNode verb-instance, ListLink(argument instances)) —
  with `_$qVar` arguments replaced by a fresh VariableNode (that
  is how questions become logic with a bound variable). Families
  in the inventory: clause shapes (SV, SVO, SVIO1/2, SP, TOBE,
  PREP, passive), modifiers (amod, advmod, nn, det, poss,
  prepadj, compmod), quantity/comparative (quantity, comp),
  conjunction, tense, negation (neg.scm), and the question
  family — interrogative, truthquery, and wh-rules per shape
  (whichsubjQ, whichobjQ, whichpobjQ, whichpredadjQ, where-q,
  when-q, why-q, how-q, howquant-q, howdeg-q, howpredadj1-q,
  copula-ynq, pred-ynq, …).

For AnSci, Stage 3 therefore means: transcribe each BindLink's
*pattern* (dependency names + lemma/instance plumbing + Absent
guards) as data, and each grounded schema's *output shape* into
AnSci's own ParsedSentence/meaning-graph vocabulary (sentence.ts:
MeaningNode/MeaningEdge with the Relation union; a question is
the `query` record, not an assertion with a null filler). The
Atomese itself is not portable and is not the deliverable; the
rule patterns and the predicate-argument shapes are.

## 5. What AnSci already has that the passes need

- Subscripts: `buildStanfordGraph` already splits them off
  (`splitSubscript`) but currently **discards** them
  (`const [base, _sub]`). Tagging needs the subscript kept.
- Lemma: `str` is morphy-lite (be-forms only). The WordNet
  extract's forms index + attested-stem fallback
  (`synsetsForSurface`, `regularInflectionStems` in
  `src/wordnet.ts`) is the MorphyJWNL-equivalent source.
- The engine (`parseRuleFile`/`applyRules`) already implements
  the full template/action semantics and skips unknown `#`
  kinds loudly — the named algorithms are the new engine work:
  MorphyAlg, WordSequenceCombineAlg, TwoWordCombineToLeft/Right,
  TenseConjoinAlg, PrepositionLinkAlg.
- The adapter (`linkgrammar-adapter.ts`) already aligns WASM
  linkage words to AnSci tokens and proposes agent/patient
  candidates — the routing peer for Stage 4.
