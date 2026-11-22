# English evaluation dataset scout — 2026-11-22

- UD English EWT r2.18: real web English with dependency and morphology annotations, test/dev/train splits; annotations CC BY-SA 4.0, underlying text has separate original rights. https://github.com/UniversalDependencies/UD_English-EWT/tree/r2.18 . Not semantic role gold: subject/object do not universally mean agent/patient.
- BLiMP: generated grammatical/ungrammatical minimal pairs, CC BY; 67 categories. https://github.com/alexwarstadt/blimp . Foundry currently scores graph properties, not grammatical acceptability or pairwise preference; adding such cases as if it did would be misleading.
- PropBank: predicate/argument annotations and frames, CC BY-SA 4.0; release annotations are pointers and do not supply underlying source texts. https://github.com/propbank/propbank-release . Align source corpus, versions and rights; map each roleset's ARG labels with its frames, not by a universal ARG0=agent rule.
- FrameNet: annotated examples and frame-specific roles, already relevant to AnSci's provider. https://berkeleyfn.framenetbr.ufjf.br/framenet_data . Verify the license and underlying text terms of the specific release before copying; current AnSci bundle is 1.5 while current downloadable release is 1.7.
- UD English GUM: multi-genre text, CC BY-NC-SA 4.0, including a noncommercial restriction. https://universaldependencies.org/treebanks/en_gum/ . Consider for research where those terms are appropriate.

## Selected cases

`loop/foundry-cases/english-ewt-scout-v1.json` selects three EWT test-split sentences, with their exact source sentence IDs and original casing. The source is pinned to release r2.18. Root lemma and past tense come from its annotations; interrogative mood is a Foundry-facing interpretation of the question, not the UD verb's Mood=Ind field. These checks test only a small overlap with UD and are not semantic role gold or grammar-acceptability judgments. Sentences were selected after inspection, so the set is development data, not a sealed held-out benchmark. The EWT annotations are attributed above and licensed CC BY-SA 4.0; original text rights are noted separately in the upstream README. Before broader redistribution, review the terms for the particular underlying texts and retain the source license and attribution.

No results are claimed here. Run `npm run foundry --silent -- evaluate --suite loop/foundry-cases/english-ewt-scout-v1.json --json` to obtain them; a failure needs trace and expectation review before changing the parser.

## First run

The normal Foundry evaluation ran on clean revision `8efd3ca` and exited 0: all three case verdicts passed, with seven explicit root/tense/mood checks passed. Raw report: `english-ewt-scout-v1-2026-11-22.json`. The cases are selected and too few to measure general accuracy; these checks do not test semantic roles or answer quality.

## Semantic role source to investigate next

MASC offers an 88K-word PropBank annotation download, including original Penn Treebank annotations, and separately provides its texts: https://anc.org/data/masc/downloads/data-download/ . Its corpus page describes PropBank annotation on a subset of OANC text: https://anc.org/data/masc/corpus/ . It is a promising place to align text and role annotations, but the exact package's text and annotation licenses, version, and alignment have not yet been verified. Do not treat the download's availability as proof of redistribution rights or map ARG labels to generic roles without its frames. Investigate those details before importing cases.
