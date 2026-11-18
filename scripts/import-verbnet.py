#!/usr/bin/env python3
"""
import-verbnet.py — build-time conversion of VerbNet 3.3 (University
of Colorado) into the compact table the fork parser loads at runtime
(data/verbnet/manifest.json + part-001.json).

Source: verbnet-3.3.tar.gz from the official VerbNet download page
(https://verbs.colorado.edu/verbnet/ — the tarball linked there as
http://verbs.colorado.edu/verb-index/vn/verbnet-3.3.tar.gz),
extracted under data/raw/verbnet/verbnet3.3/ (gitignored raw area).

License: VerbNet 3.0 License (stated on the Colorado downloads page
to apply to all VerbNet 3.X versions) — "Permission to use, copy,
modify and distribute this software and database and its
documentation for any purpose and without fee or royalty is hereby
granted, provided that you agree to comply with the following
copyright notice and statements … and that the same appear on ALL
copies". VerbNet 3.X Copyright 2009 by University of Colorado. The
full notice is reproduced in the repo NOTICE file and in the
manifest this script writes.

What the conversion keeps, per verb lemma:
  - the VerbNet class id(s) the lemma is a member of (subclasses
    included; a subclass with no FRAMES of its own inherits its
    parent class's frames, as VerbNet intends);
  - for each class frame, the ARGUMENT SHAPE the parser can check:
    the post-verbal bare-NP thematic roles in surface order, the
    prepositional arguments (prep word + role), whether the frame
    carries a clausal complement, and whether it is lexicalised
    (a LEX constituent — "take care" — whose NP pattern is not a
    plain argument structure; such frames are recorded but marked
    and excluded from the shape check);
  - the class's thematic-role inventory (with the frames, the
    semantic side of the class record).

What it drops: frame semantics (predicate logic), selectional
restrictions, examples, WordNet sense keys (the parser's own
WordNet extract is its sense layer), and multiword / hyphenated /
underscored member names (the parser's lemmas are single words;
the dropped count is reported, never silent).

Usage: python3 scripts/import-verbnet.py [source-dir] [out-dir]
Defaults: data/raw/verbnet/verbnet3.3 -> data/verbnet
"""
import json
import os
import re
import sys
import xml.etree.ElementTree as ET

SRC = sys.argv[1] if len(sys.argv) > 1 else "data/raw/verbnet/verbnet3.3"
OUT = sys.argv[2] if len(sys.argv) > 2 else "data/verbnet"

LICENSE = (
    "VerbNet 3.0 License (applies to VerbNet 3.X): Permission to use, copy, "
    "modify and distribute this software and database and its documentation "
    "for any purpose and without fee or royalty is hereby granted, provided "
    "that the copyright notice and statements appear on ALL copies. "
    "VerbNet 3.X Copyright 2009 by University of Colorado. All rights reserved."
)


def frame_shape(frame_el):
    """Reduce one <FRAME> to the parser-checkable argument shape."""
    desc = frame_el.find("DESCRIPTION")
    primary = desc.get("primary") if desc is not None else ""
    syntax = frame_el.find("SYNTAX")
    np_roles, pp, clausal, lexical = [], [], False, False
    if syntax is not None:
        seen_verb = False
        pending_prep = None
        for child in syntax:
            tag = child.tag
            if tag == "VERB":
                seen_verb = True
                continue
            if not seen_verb:
                continue
            if tag == "LEX":
                lexical = True
            elif tag == "PREP":
                pending_prep = child.get("value") or ""
            elif tag == "NP":
                role = child.get("value") or ""
                if pending_prep is not None:
                    pp.append([pending_prep, role])
                    pending_prep = None
                else:
                    np_roles.append(role)
            elif tag.startswith("S") or tag in ("ING", "POSSING", "TOBE"):
                clausal = True
            # ADJ / ADV constituents are modifiers, not arguments.
    return {
        "primary": primary,
        "np": np_roles,
        "pp": pp,
        "clausal": clausal,
        "lexical": lexical,
    }


def walk_class(el, parent_frames, classes, verbs, stats):
    """Collect one VNCLASS (and its SUBCLASSES) into classes/verbs."""
    cid = el.get("ID")
    roles = [tr.get("type") for tr in el.findall("./THEMROLES/THEMROLE")]
    frames = [frame_shape(f) for f in el.findall("./FRAMES/FRAME")]
    if not frames:
        frames = parent_frames  # subclass inheriting the parent's frames
    classes[cid] = {"roles": roles, "frames": frames}
    for member in el.findall("./MEMBERS/MEMBER"):
        name = member.get("name") or ""
        if not re.fullmatch(r"[a-z]+", name):
            stats["dropped_members"] += 1
            continue
        rec = verbs.setdefault(name, [])
        if cid not in rec:
            rec.append(cid)
        stats["member_rows"] += 1
    for sub in el.findall("./SUBCLASSES/VNSUBCLASS") + el.findall("./SUBCLASSES/VNCLASS"):
        walk_class(sub, frames, classes, verbs, stats)


def main():
    classes, verbs = {}, {}
    stats = {"dropped_members": 0, "member_rows": 0}
    files = sorted(f for f in os.listdir(SRC) if f.endswith(".xml"))
    for f in files:
        tree = ET.parse(os.path.join(SRC, f))
        walk_class(tree.getroot(), [], classes, verbs, stats)
    os.makedirs(OUT, exist_ok=True)
    part = {"classes": classes, "verbs": verbs}
    part_path = os.path.join(OUT, "part-001.json")
    with open(part_path, "w") as fh:
        json.dump(part, fh, separators=(",", ":"), sort_keys=True)
    manifest = {
        "v": 1,
        "source": "VerbNet 3.3 (University of Colorado), verbnet-3.3.tar.gz from verbs.colorado.edu",
        "edition": "3.3",
        "license": LICENSE,
        "counts": {
            "classes": len(classes),
            "verbs": len(verbs),
            "memberRows": stats["member_rows"],
            "droppedMultiwordMembers": stats["dropped_members"],
        },
        "parts": [
            {
                "file": "part-001.json",
                "kind": "verbs",
                "count": len(verbs),
                "bytes": os.path.getsize(part_path),
            }
        ],
    }
    with open(os.path.join(OUT, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(
        f"verbnet: {len(classes)} classes, {len(verbs)} single-word verbs, "
        f"{stats['member_rows']} member rows, "
        f"{stats['dropped_members']} multiword/hyphenated members dropped"
    )


if __name__ == "__main__":
    main()
