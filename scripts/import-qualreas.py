#!/usr/bin/env python3
"""
import-qualreas.py — build-time conversion of the qualreas relation
algebras into the data artefact the fork's qualitative-reasoning
engine loads (data/qualreas/manifest.json + part-001.json).

Source: qualreas (Alfred J. Reich), https://github.com/alreich/qualreas
— the algebra JSON files under its data/algebras/ directory, copied
to data/raw/qualreas/algebras/ (gitignored raw area). Three algebras
are converted:
  - RCC8_Algebra.json          -> "rcc8"  (region connection calculus)
  - Linear_Interval_Algebra.json -> "allen" (Allen's interval algebra,
    the 13 base relations)
  - Linear_Point_Algebra.json  -> "point" (the point algebra <, =, >)

License: MIT — Copyright (c) 2019 Alfred J. Reich; the full text is
reproduced in the repo NOTICE file and in the manifest this script
writes. Only the algebra DATA (relation inventories, converses and
composition tables) is taken; the path-consistency engine in
src/fork/qualreas.ts is our own TypeScript written from the
classical algorithm, crediting qualreas for data and design.

Conversion: qualreas encodes a composition result as a "|"-joined
string of base relations; the artefact stores it as a JSON array.
Relation metadata kept: display name and converse. The identity
relation of each algebra is recorded (EQ / E / =) — path
consistency requires every entity to bear it to itself.

Usage: python3 scripts/import-qualreas.py [source-dir] [out-dir]
Defaults: data/raw/qualreas/algebras -> data/qualreas
"""
import json
import os
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "data/raw/qualreas/algebras"
OUT = sys.argv[2] if len(sys.argv) > 2 else "data/qualreas"

ALGEBRAS = {
    "rcc8": ("RCC8_Algebra.json", "EQ"),
    "allen": ("Linear_Interval_Algebra.json", "E"),
    "point": ("Linear_Point_Algebra.json", "="),
}

LICENSE = (
    "MIT License. Copyright (c) 2019 Alfred J. Reich. Permission is hereby "
    "granted, free of charge, to any person obtaining a copy of this "
    "software and associated documentation files (the \"Software\"), to "
    "deal in the Software without restriction, including the rights to "
    "use, copy, modify, merge, publish, distribute, sublicense, and/or "
    "sell copies of the Software, subject to the condition that the above "
    "copyright notice and this permission notice be included in all "
    "copies or substantial portions of the Software."
)


def convert(fname, identity):
    with open(os.path.join(SRC, fname)) as fh:
        raw = json.load(fh)
    relations = {}
    for rel, meta in raw["Relations"].items():
        relations[rel] = {"name": meta["Name"], "converse": meta["Converse"]}
    composition = {}
    for r1, row in raw["TransTable"].items():
        composition[r1] = {r2: cell.split("|") for r2, cell in row.items()}
    return {
        "name": raw["Name"],
        "description": raw["Description"],
        "identity": identity,
        "relations": relations,
        "composition": composition,
    }


def main():
    algebras = {key: convert(fname, ident) for key, (fname, ident) in ALGEBRAS.items()}
    os.makedirs(OUT, exist_ok=True)
    part = {"algebras": algebras}
    part_path = os.path.join(OUT, "part-001.json")
    with open(part_path, "w") as fh:
        json.dump(part, fh, separators=(",", ":"), sort_keys=True)
    manifest = {
        "v": 1,
        "source": "qualreas (Alfred J. Reich), https://github.com/alreich/qualreas — data/algebras JSON",
        "edition": "master (fetched 2026-11-17)",
        "license": LICENSE,
        "counts": {key: len(a["relations"]) for key, a in algebras.items()},
        "parts": [
            {
                "file": "part-001.json",
                "kind": "algebras",
                "count": len(algebras),
                "bytes": os.path.getsize(part_path),
            }
        ],
    }
    with open(os.path.join(OUT, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(
        "qualreas: "
        + ", ".join(f"{k} {len(a['relations'])} relations" for k, a in algebras.items())
    )


if __name__ == "__main__":
    main()
