#!/usr/bin/env python3
"""annotate-spacy.py — the optional parser sidecar (piece B input, never a speaker).

Reads turn text, writes one AnnotatorDoc JSON per turn — tokens with
UPOS/fine-grained tag, lemma, dependency label + head, char offsets and
entity label; sentence spans; entities; noun chunks. The TypeScript side
(src/cskg/annotator.ts) owns the schema; this script only produces it.

The graph job stays the graph's: this output proposes structure
(which spans are verbs, greetings, names, noun phrases). Binding a span
to a CSKG node, and everything the reply says, remain graph-side.

Usage:
  one-shot:  python3 scripts/annotate-spacy.py "hey, make coffee"
  daemon:    python3 scripts/annotate-spacy.py --stdin   (JSON-lines:
               in:  {"id": 1, "text": "hey, make coffee"}
               out: {"id": 1, "ok": true, "doc": {...}}
               out: {"id": 1, "ok": false, "error": "..."})

Model: ANSCI_SPACY_MODEL (default en_core_web_sm). Needs spaCy +
a model in the project environment:

  source .venv/bin/activate
  pip install spacy
  python -m spacy download en_core_web_sm
"""

import json
import os
import sys

MODEL = os.environ.get("ANSCI_SPACY_MODEL", "en_core_web_sm")


def doc_to_json(nlp, text):
    doc = nlp(text)
    tokens = []
    for i, t in enumerate(doc):
        tokens.append(
            {
                "i": i,
                "text": t.text,
                "lemma": t.lemma_,
                "pos": t.pos_,
                "tag": t.tag_,
                "dep": t.dep_,
                "head": t.head.i,
                "start": t.idx,
                "end": t.idx + len(t.text),
                "ent": t.ent_type_,
            }
        )
    entities = [
        {
            "text": e.text,
            "label": e.label_,
            "start": e.start_char,
            "end": e.end_char,
        }
        for e in doc.ents
    ]
    chunks = [
        {"start": c.start_char, "end": c.end_char} for c in doc.noun_chunks
    ]
    sents = [
        {"start": s.start_char, "end": s.end_char} for s in doc.sents
    ]
    return {
        "text": text,
        "tokens": tokens,
        "entities": entities,
        "chunks": chunks,
        "sents": sents,
    }


def main(argv):
    try:
        import spacy
    except ImportError:
        print("annotate-spacy: spaCy is not installed in this environment.", file=sys.stderr)
        print("annotate-spacy: source .venv/bin/activate && pip install spacy", file=sys.stderr)
        return 2
    try:
        nlp = spacy.load(MODEL)
    except OSError:
        print(f"annotate-spacy: model {MODEL!r} is not installed.", file=sys.stderr)
        print(f"annotate-spacy: python -m spacy download {MODEL}", file=sys.stderr)
        return 2

    if len(argv) == 2 and argv[1] == "--stdin":
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                req = json.loads(line)
                doc = doc_to_json(nlp, req["text"])
                sys.stdout.write(json.dumps({"id": req.get("id"), "ok": True, "doc": doc}) + "\n")
            except Exception as e:  # malformed request: report, keep serving
                try:
                    req_id = json.loads(line).get("id")
                except Exception:
                    req_id = None
                sys.stdout.write(json.dumps({"id": req_id, "ok": False, "error": str(e)}) + "\n")
            sys.stdout.flush()
        return 0

    if len(argv) == 2:
        sys.stdout.write(json.dumps(doc_to_json(nlp, argv[1])) + "\n")
        return 0

    print(__doc__, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
