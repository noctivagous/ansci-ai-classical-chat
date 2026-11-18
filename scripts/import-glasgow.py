#!/usr/bin/env python3
"""
import-glasgow.py — build-time conversion of the Glasgow Norms
into the shipped artefact (data/glasgow/manifest.json +
part-001.json). The WHOLE published table is converted: all
5,553 words, all nine dimensions, each with its mean, standard
deviation and number of ratings as published. Nothing is
trimmed and no value is recomputed.

Source: Scott, Keitel, Becirspahic, Yao & Sereno (2019), "The
Glasgow Norms: Ratings of 5,500 words on nine scales",
Behavior Research Methods 51:1258–1270,
https://doi.org/10.3758/s13428-018-1099-3 — the article's
supplementary data file (ESM 2, CSV), fetched from the
publisher's distribution (Springer static content; the same
file is hosted by PubMed Central as PMC6538586 supplementary
material) into data/raw/glasgow/GlasgowNorms.csv (gitignored
raw area).

License (verified 2026-11-17 from the article itself, PMC
6538586): the article is Open Access, distributed under the
Creative Commons Attribution 4.0 International License
(CC BY 4.0) — "permits unrestricted use, distribution, and
reproduction in any medium, provided you give appropriate
credit" — and the norms are its supplementary material.
Attribution in the repo NOTICE file and in the manifest.

The nine dimensions, with their published scales:
  arousal, valence, dominance — 9-point scales (the emotion
    dimensions: activation; positive↔negative worth; control);
  concreteness, imageability, familiarity, age of acquisition,
    semantic size, gender association — 7-point scales.
Age of acquisition's points are 2-year bands (1 = 0–2 years …
7 = 13+ years). Gender association runs 1 = strongly
feminine-associated to 7 = strongly masculine-associated
(verified against the data's own anchor words: mother 1.09,
queen 1.31; king 6.81, father 6.79; table 4.00).

Words the study presented with disambiguating information
(e.g. "toast (bread)") are filed under their full published
string, lowercased, beside the bare word's own row where the
study also rated it alone.

Usage: python3 scripts/import-glasgow.py [source-csv] [out-dir]
Defaults: data/raw/glasgow/GlasgowNorms.csv -> data/glasgow
"""
import csv
import json
import os
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "data/raw/glasgow/GlasgowNorms.csv"
OUT = sys.argv[2] if len(sys.argv) > 2 else "data/glasgow"

LICENSE = (
    "Creative Commons Attribution 4.0 International (CC BY 4.0). "
    "Scott, Keitel, Becirspahic, Yao & Sereno (2019), The Glasgow Norms, "
    "Behavior Research Methods 51:1258-1270, doi:10.3758/s13428-018-1099-3."
)

# CSV column blocks, in file order, after Words and Length:
# each dimension contributes M, SD, N.
DIMS = [
    ("arousal", "AROU", 9),
    ("valence", "VAL", 9),
    ("dominance", "DOM", 9),
    ("concreteness", "CNC", 7),
    ("imageability", "IMAG", 7),
    ("familiarity", "FAM", 7),
    ("aoa", "AOA", 7),
    ("size", "SIZE", 7),
    ("gender", "GEND", 7),
]


def main():
    with open(SRC, newline="", encoding="utf-8-sig") as fh:
        rows = [r for r in csv.reader(fh) if any(c.strip() for c in r)]
    header, subheader, data = rows[0], rows[1], rows[2:]
    # Verify the file's own structure before trusting it: the
    # dimension blocks must stand where the paper says they do.
    expect = ["Words", "Length"] + [code for _, code, _ in DIMS for _ in range(1)]
    got = [header[0], header[1]] + [header[2 + 3 * i] for i in range(len(DIMS))]
    want = ["Words", "Length"] + [code for _, code, _ in DIMS]
    if got != want:
        sys.exit(f"unexpected header blocks: {got} (wanted {want})")
    if [c.strip() for c in subheader[2:5]] != ["M", "SD", "N"]:
        sys.exit(f"unexpected subheader: {subheader[:8]}")

    entries = []
    for r in data:
        word = r[0].strip().lower()
        entry = {"word": word, "length": int(r[1])}
        for i, (name, _code, _scale) in enumerate(DIMS):
            base = 2 + 3 * i
            entry[name] = [float(r[base]), float(r[base + 1]), int(r[base + 2])]
        entries.append(entry)
    entries.sort(key=lambda e: e["word"])

    os.makedirs(OUT, exist_ok=True)
    part = {"entries": entries}
    part_path = os.path.join(OUT, "part-001.json")
    with open(part_path, "w") as fh:
        json.dump(part, fh, separators=(",", ":"), sort_keys=True)
    manifest = {
        "v": 1,
        "source": "The Glasgow Norms (Scott et al. 2019), supplementary data file ESM 2 (CSV)",
        "edition": "Behavior Research Methods 51:1258-1270; doi:10.3758/s13428-018-1099-3; PMC6538586",
        "license": LICENSE,
        "counts": {"words": len(entries)},
        "dimensions": {
            name: {"code": code, "scale": scale, "columns": "[mean, sd, n]"}
            for name, code, scale in DIMS
        },
        "notes": [
            "Age of acquisition points are 2-year bands: 1 = 0-2 years ... 7 = 13+ years.",
            "Gender association: 1 = strongly feminine-associated, 7 = strongly masculine-associated.",
            "Disambiguated presentations (e.g. 'toast (bread)') are filed under their full published string, lowercased.",
        ],
        "parts": [
            {
                "file": "part-001.json",
                "kind": "entries",
                "count": len(entries),
                "bytes": os.path.getsize(part_path),
            }
        ],
    }
    with open(os.path.join(OUT, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"glasgow: {len(entries)} words x {len(DIMS)} dimensions converted (whole table)")


if __name__ == "__main__":
    main()
