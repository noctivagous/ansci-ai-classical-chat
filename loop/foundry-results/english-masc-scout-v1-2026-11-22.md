# MASC scout: first evaluation and graph review

The three-case development fixture `loop/foundry-cases/english-masc-scout-v1.json` was evaluated at clean revision `e1e234e`; full evaluation and separate run graphs are recorded alongside this file. The evaluation exited 1: one case passed the three requested checks, two failed an attachment check. These are not semantic-role accuracy scores.

- `110CYL068-s17`: prepare is root, Goodwill is its agent, and people is its theme. The requested attachments pass. Other material in the graph includes questionable `for`/`employment` handling, which these checks do not evaluate; the pass is not a full-meaning verdict.
- `110CYL071-s12`: call is root and Goodwill is a theme, but Michael is absent from the graph. This is an observed missing-participant interpretation; the responsible parser decision remains to be located. `Finally` is represented as a modifier. The original annotation calls Michael A0.
- `ch5-s177`: find is root, scientists is its agent and facts its theme; `we` qualifies scientists. The direct `find -> we` attachment expectation fails although the subject expression is represented indirectly. The matcher has a representation limitation here; it should not be scored as a missing subject without an explicit policy for apposition and phrase heads.

## Roleset-specific comparison design

1. Preserve original corpus, package checksum, filename, sentence ordinal, token IDs, source predicate and roleset, argument heads and spans. Avoid collapsing a multiword argument to its pronoun without preserving the span.
2. Pin the historical frame inventory used by the corpus. The 2010 MASC CoNLL `call.01` example appears to mean calling an organization, while current PropBank 3.4 describes `call.01` as labeling and `call.02` as summoning/phone call. Numbering and sense may have changed. Do not map these by name alone; verify the original frames and version, or mark the case unresolved. Current documentation: https://propbank.github.io/v3.4.0/frames/call .
3. A reviewed versioned mapping must state for each roleset and argument which AnSci relations or graph paths are acceptable, why, and where a mapping is ambiguous. Preserve original labels and provenance; never equate all A0 with agent or all A1 with patient.
4. Match predicate identity and argument spans/head relations with explicit treatment for modifiers, appositions, pronouns, passive voice and repeated lemmas. Record both direct edges and permitted indirect paths. Different graph schemes require human adjudication, not an automatic defect label.
5. Report correct, incorrect, missing, ambiguous and unscorable separately, with denominators and source/mapping versions. Compare independently authored and development partitions separately. Preserve trace and parser outputs for diagnosis.

Next: trace why the initial adverb causes or coincides with the missing Michael subject, using contrasting cases before changing the parser. Separately locate the matching historical PropBank frames before building role scoring.
