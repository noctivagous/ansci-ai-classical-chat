# Introductory prepositional phrase scout

Foundry `run` with the chat profile and required resources was used to inspect
meaning graphs. These are developer-selected cases, not a held-out evaluation.

| Input | Observed result |
| --- | --- |
| In the morning, the teacher opened the door. | Root open; teacher and introductory phrase absent. |
| The teacher opened the door. | Root open; teacher agent present. |
| After lunch, the dog chased the cat. | Root lunch; dog assigned theme; chased treated as a nominal argument. |
| On the table, the book rested. | Root rest; book and introductory phrase absent. |
| In New York, Michael called Goodwill. | Root call; Michael and introductory phrase absent. |

The earlier introductory-adverb fix does not handle these phrases. In the
main verbal path, subject chunking starts at the beginning of the sentence;
the introductory PP is neither a subject noun chunk nor an adverb sequence.
The separate root error in the lunch example needs investigation earlier in
classification and root selection. A fix must retain the PP's meaning and
avoid treating locative inversion such as “On the mat sat the cat” as a
standard subject-before-verb clause. These observations do not establish how
well the parser handles introductory phrases in general.

Next: develop controls for subject, root, and PP attachment, including
locative inversion and temporal versus spatial phrases, before routing a
bounded introductory-phrase mechanism.
