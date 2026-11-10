#!/usr/bin/env python3
"""
import-framenet.py — the FrameNet installer + importer (slice 2d, design §5).

This script is the install path for the FrameNet base layer. From a fresh
clone:

    python3 scripts/import-framenet.py

does everything: it downloads the FrameNet release from a public mirror
(NLTK's nltk_data GitHub repository — no Berkeley form, no account),
verifies the zip, parses the frame XML, and writes the bundle the app
loads at runtime. Re-running it is safe and byte-for-byte deterministic.

Source (user direction, 2026-11-08: skip the Berkeley download form):
  framenet_v15.zip — FrameNet Release 1.5, from
  https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/framenet_v15.zip
FrameNet is CC BY (Attribution-only) since Release 1.5 (see design §3.3);
attribution lives in NOTICE. The design (§5.1) names the 1.7 XML format;
1.5 has the same frame/FE/LU/relation structure and is what the mirror
carries — the loader records the edition it actually imported.

What the importer reads (the annotated-sentence corpus — fulltext/ — is
excluded, per §5.1: it illustrates usage rather than defining structure):
  frame/*.xml      one file per frame: definition, frame elements with
                   coreType (Core | Peripheral | Extra-Thematic), lexical
                   units with their lexemes
  frRelation.xml   frame-relation types, the relations between frames,
                   and the FE-to-FE correspondences within each relation

What it writes (the bundle — a LOCAL artifact, gitignored like the raw
download; the repo ships this installer and a small test fixture, not
the bundle):
  data/framenet/manifest.json   {v, source, edition, license, counts, parts}
  data/framenet/part-*.json     chunked record arrays, each part at most
                                PART_BUDGET_CAP bytes (the repo's
                                established pattern — see import-wordnet.py)

Bundle records:
  "frames" part:    [name, fnId, definition,
                     [[feName, core(0|1), feDefinition, feId], ...],
                     [[lemma, pos, luName, luId], ...]]
                    FEs and LUs in source document order; core is 1 only
                    for coreType == "Core". FEs carry their FrameNet ID
                    because FE identity is the ID, not the name — the
                    release itself defines "Duration" twice in
                    Activity_ongoing (IDs 1418 and 13035).
  "relations" part: [typeName, superFrameName, subFrameName,
                     [[superFEName, subFEName], ...]]
                    ALL relation types are recorded (Inheritance, Using,
                    Subframe, Perspective_on, ...). Which types become
                    graph edges is the loader's §5 decision, not the
                    importer's.

Definitions are stored as plain text: the XML's escaped <def-root>
markup is stripped, and a frame element's definition is cut at its
first <ex> example block (the prose is the definition; the examples
illustrate it).

Python standard library only.

Usage:
  python3 scripts/import-framenet.py [--fetch | --no-fetch]
                                     [--zip PATH] [--out-dir DIR]
                                     [--only FrameA,FrameB,...]
  --fetch       download the zip even if a copy is already present
  --no-fetch    never download; fail if the zip is absent
  --only        import only the named frames (relations restricted to
                pairs inside the set) — used to build the checked-in
                test fixture under test/fixtures/framenet/
"""

import json
import os
import re
import sys
import urllib.request
import zipfile
import xml.etree.ElementTree as ET

MIRROR_URL = (
    "https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/"
    "packages/corpora/framenet_v15.zip"
)
ZIP_NAME = "framenet_v15.zip"
ZIP_PREFIX = "framenet_v15/"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
DEFAULT_ZIP = os.path.join(REPO_ROOT, "data", "raw", "framenet", ZIP_NAME)
DEFAULT_OUT = os.path.join(REPO_ROOT, "data", "framenet")

# No part file may exceed the 3.5 MB cap (shared with import-wordnet.py).
PART_BUDGET_CAP = 3_500_000
PART_BUDGET_SAFE = 3_200_000


def lname(tag):
    """XML local name, namespace-agnostic."""
    return tag.rsplit("}", 1)[-1]


def clean_definition(raw, cut_at_ex):
    """FrameNet definitions arrive as escaped markup text
    (<def-root>...<fen>X</fen>...<ex>...</ex></def-root>). Reduce to
    plain prose: optionally cut at the first example block, strip all
    tags, collapse whitespace."""
    if raw is None:
        return ""
    text = raw
    if cut_at_ex:
        idx = text.find("<ex>")
        if idx >= 0:
            text = text[:idx]
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", text).strip()


def fetch_zip(zip_path, force):
    if os.path.exists(zip_path) and not force:
        print(f"fetch: using existing {zip_path}")
        return
    os.makedirs(os.path.dirname(zip_path), exist_ok=True)
    print(f"fetch: downloading {MIRROR_URL}")
    tmp = zip_path + ".tmp"
    urllib.request.urlretrieve(MIRROR_URL, tmp)
    os.replace(tmp, zip_path)
    print(f"fetch: saved {zip_path} ({os.path.getsize(zip_path)} bytes)")


def parse_frames(zf):
    """frame/*.xml -> frame records, sorted by frame name."""
    names = sorted(
        n for n in zf.namelist()
        if n.startswith(ZIP_PREFIX + "frame/") and n.endswith(".xml")
    )
    frames = []
    for member in names:
        root = ET.fromstring(zf.read(member))
        frame_def = ""
        fes = []
        lus = []
        for child in root:
            kind = lname(child.tag)
            if kind == "definition":
                frame_def = clean_definition(child.text, cut_at_ex=False)
            elif kind == "FE":
                fe_def = ""
                for sub in child:
                    if lname(sub.tag) == "definition":
                        fe_def = clean_definition(sub.text, cut_at_ex=True)
                fes.append([
                    child.get("name"),
                    1 if child.get("coreType") == "Core" else 0,
                    fe_def,
                    int(child.get("ID", "0")),
                ])
            elif kind == "lexUnit":
                # The lemma is the lexemes joined in order — the clean
                # surface (the LU name carries qualifiers, e.g.
                # "purchase_((act)).n" for the lexeme "purchase").
                lexemes = [el for el in child if lname(el.tag) == "lexeme"]
                lexemes.sort(key=lambda el: int(el.get("order", "1")))
                if lexemes:
                    lemma = " ".join(el.get("name", "") for el in lexemes)
                else:
                    lemma = re.sub(r"_[(\[].*$", "",
                                   child.get("name", "").rsplit(".", 1)[0])
                lus.append([
                    lemma,
                    child.get("POS", ""),
                    child.get("name", ""),
                    int(child.get("ID", "0")),
                ])
        frames.append([
            root.get("name"),
            int(root.get("ID", "0")),
            frame_def,
            fes,
            lus,
        ])
    frames.sort(key=lambda f: f[0])
    return frames


def parse_relations(zf):
    """frRelation.xml -> relation records, sorted by (type, super, sub)."""
    root = ET.fromstring(zf.read(ZIP_PREFIX + "frRelation.xml"))
    relations = []
    for rtype in root:
        if lname(rtype.tag) != "frameRelationType":
            continue
        type_name = rtype.get("name")
        for rel in rtype:
            if lname(rel.tag) != "frameRelation":
                continue
            fe_pairs = [
                [fe.get("superFEName"), fe.get("subFEName")]
                for fe in rel if lname(fe.tag) == "FERelation"
            ]
            relations.append([
                type_name,
                rel.get("superFrameName"),
                rel.get("subFrameName"),
                fe_pairs,
            ])
    relations.sort(key=lambda r: (r[0], r[1], r[2]))
    return relations


def chunk_records(records, budget):
    """Split records into serialized JSON-array parts of at most `budget`
    bytes (same accumulation scheme as import-wordnet.py)."""
    parts = []
    cur = []
    cur_bytes = 2  # "[]"
    for rec in records:
        blob = json.dumps(rec, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        add = len(blob) + (1 if cur else 0)  # comma separator
        if cur and cur_bytes + add > budget:
            parts.append((len(cur), b"[" + b",".join(cur) + b"]"))
            cur, cur_bytes = [], 2
            add = len(blob)
        cur.append(blob)
        cur_bytes += add
    if cur:
        parts.append((len(cur), b"[" + b",".join(cur) + b"]"))
    return parts


def build_parts(record_groups, budget):
    parts = []
    for kind, records in record_groups:
        for count, blob in chunk_records(records, budget):
            parts.append((kind, count, blob))
    return parts


def main(argv):
    fetch_mode = "auto"
    zip_path = DEFAULT_ZIP
    out_dir = DEFAULT_OUT
    only = None
    i = 0
    while i < len(argv):
        arg = argv[i]
        if arg == "--fetch":
            fetch_mode = "force"
        elif arg == "--no-fetch":
            fetch_mode = "never"
        elif arg == "--zip":
            i += 1
            zip_path = argv[i]
        elif arg == "--out-dir":
            i += 1
            out_dir = argv[i]
        elif arg == "--only":
            i += 1
            only = {s.strip() for s in argv[i].split(",") if s.strip()}
        else:
            print(f"unknown argument: {arg}", file=sys.stderr)
            return 2
        i += 1

    if fetch_mode == "force" or (fetch_mode == "auto" and not os.path.exists(zip_path)):
        fetch_zip(zip_path, force=(fetch_mode == "force"))
    if not os.path.exists(zip_path):
        print(f"error: {zip_path} not found and fetching is disabled", file=sys.stderr)
        return 1

    with zipfile.ZipFile(zip_path) as zf:
        bad = zf.testzip()
        if bad is not None:
            print(f"error: zip is corrupt at {bad}", file=sys.stderr)
            return 1
        frames = parse_frames(zf)
        relations = parse_relations(zf)

    if only is not None:
        frames = [f for f in frames if f[0] in only]
        relations = [r for r in relations if r[1] in only and r[2] in only]

    counts = {
        "frames": len(frames),
        "frameElements": sum(len(f[3]) for f in frames),
        "lexicalUnits": sum(len(f[4]) for f in frames),
        "frameRelations": len(relations),
    }

    groups = [("frames", frames), ("relations", relations)]
    parts = build_parts(groups, PART_BUDGET_CAP)
    if parts and max(len(b) for _k, _c, b in parts) >= 0.95 * PART_BUDGET_CAP:
        parts = build_parts(groups, PART_BUDGET_SAFE)

    os.makedirs(out_dir, exist_ok=True)
    for name in os.listdir(out_dir):
        if name == "manifest.json" or (name.startswith("part-") and name.endswith(".json")):
            os.remove(os.path.join(out_dir, name))
    part_entries = []
    for idx, (kind, count, blob) in enumerate(parts, start=1):
        fname = f"part-{idx:03d}.json"
        with open(os.path.join(out_dir, fname), "wb") as fh:
            fh.write(blob)
        part_entries.append({"file": fname, "kind": kind, "count": count, "bytes": len(blob)})

    manifest = {
        "v": 1,
        "source": "FrameNet (framenet_v15 via the NLTK nltk_data mirror)",
        "edition": "1.5",
        "license": "CC BY 3.0",
        "counts": counts,
        "parts": part_entries,
    }
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    total = sum(p["bytes"] for p in part_entries)
    print(
        "framenet bundle: {out} = {total} bytes in {n} parts + manifest; "
        "frames={frames} frameElements={fes} lexicalUnits={lus} "
        "frameRelations={rels}".format(
            out=out_dir, total=total, n=len(part_entries),
            frames=counts["frames"], fes=counts["frameElements"],
            lus=counts["lexicalUnits"], rels=counts["frameRelations"],
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
