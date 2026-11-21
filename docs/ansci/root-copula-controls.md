# Noun/Verb and Copular Predicate Development Controls

Run the mutable development suite with:

    npm run ansci:root-copula-controls

The cases live in data/ansci/root-copula-controls-dev.json. The runner prints
each sentence's selected root, node lemmas, edges, and failed expectations. It
returns a failing status when a control does not match its expected graph.

## Scope

The suite has paired noun/verb uses of plan and coat, simple and PP-bearing
copular predicates, two adjectival readings of missing, and a transitive
progressive use of missing. These controls target root choice and preservation
of predicate, subject, and nominal modifier relations. They do not claim broad
English coverage.

This is an explicitly mutable development set. It is not sealed, independently
authored, or held out; its score is not evidence of generalization. Keep it
separate from linkage-heldout-v1.json and use the sealed set for routing gates.
The missing sentences are useful regression controls related to (but distinct
from) the sealed F2 key case.

## Current result

The parser passes all 10 controls. The noun/verb pairs resolve according to
clause position. A post-copular -ing form with a WordNet adjective reading is
treated as a predicate when there is no immediately following noun phrase that
could be its direct object; a following noun phrase keeps the verbal reading,
as in “The scout is missing the target.” Subject chunks now retain nominal to
phrases, so “the key to the cabinet” preserves the cabinet node.

The adjectival choice is a bounded default because the current meaning graph
cannot retain competing parses. Some agentless progressives and passives can
also have adjective readings, so this rule does not resolve every such
ambiguity. Add counterexamples before broadening the rule.

The sealed linkage-heldout-v1 run verifies its original seal and scores F2
graph preservation at 3/4, up from the previously recorded 2/4: the key case
now retains the cabinet modifier and adjectival predicate. The coat/root
selection case remains the F2 failure. Other sealed family scores remain
unchanged in this run: F1 5/5, F3 1/4, F4 0/4, F5 1/4. Shadow completeness is
not a goal of this change and its per-case results remain separately reported.
