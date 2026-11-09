Has anyone tried to make a chat out of ConceptNet + WordNet + FrameNet?

No one has built a notable **chatbot** that specifically fuses all three — ConceptNet + WordNet + FrameNet — as a conversational system. But the pieces have been brought together in adjacent ways:

- **ConceptNet already absorbs WordNet.** ConceptNet 5 was built to "undo the synset assumption" from WordNet and re-encode it as a hypergraph, so querying ConceptNet already gives you WordNet-style lexical relations (synonymy, hypernymy, meronymy) plus commonsense edges on top. The original 2004 ConceptNet paper also used **FrameNet's** verb synonymsets and class hierarchies to derive `SuperThematicKLine` generalisations, so a sliver of FrameNet is baked in from the start.

- **CSKG (CommonSense Knowledge Graph)** is the closest thing to a unified trio. It integrates ConceptNet, WordNet, FrameNet, plus ATOMIC, Roget, Wikidata, and Visual Genome into a single 2.2M-node / 6M-edge graph with aligned edge types. It's used for commonsense QA, not chat, but it's the natural substrate if you wanted to build one.

- **Framester** is a linked-data hub connecting FrameNet ↔ WordNet ↔ VerbNet ↔ BabelNet ↔ DBpedia, but it doesn't include ConceptNet and isn't a chatbot.

- **Smaller projects** have used ConceptNet + WordNet (without FrameNet) for chatbot-like purposes — e.g., a 2015 Stockholm degree project and a TigerGraph + RASA + ConceptNet5 demo — but none add FrameNet on top.

**In short:** the integration layer already exists in ConceptNet (for WordNet) and in CSKG (for all three), but nobody has built a dedicated *conversational* agent on top of that full stack. The gap is really the dialogue management / response generation layer, not the knowledge integration.

