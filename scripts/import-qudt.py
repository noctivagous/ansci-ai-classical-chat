#!/usr/bin/env python3
"""
import-qudt.py — build-time conversion of the QUDT units vocabulary
into the cross-check artefact (data/qudt/manifest.json +
part-001.json), and the cross-check itself: every unit the
UnitsMeasurement hand table already files is compared against
QUDT's conversion multiplier, and every disagreement is PRINTED
(and written into the manifest) — the hand value is never
overwritten by this script.

Source: QUDT public repository (https://github.com/qudt/qudt-public-repo),
file src/main/rdf/vocab/unit/VOCAB_QUDT-UNITS-ALL.ttl, copied to
data/raw/qudt/ (gitignored raw area).

License: Creative Commons Attribution 4.0 International (CC BY 4.0)
— attribution in the repo NOTICE file and in the manifest.

QUDT's qudt:conversionMultiplier converts to the SI COHERENT base
of the quantity kind (kilogram for mass, metre for length, cubic
metre for volume, square metre for area, pascal for pressure).
The artefact stores each factor re-based to the UnitsMeasurement
table's own base units (gram, metre, litre, square metre, pascal),
alongside the raw QUDT multiplier, so the re-basing is inspectable.

Only the curated subset below is converted: the SI + Imperial
units the UnitsMeasurement table files or plausibly should, plus
the US liquid variants QUDT distinguishes from the Imperial ones.
Traditional Chinese units are NOT in QUDT and are not touched —
they stay hand-authored, as before.

Usage: python3 scripts/import-qudt.py [source-ttl] [out-dir]
Defaults: data/raw/qudt/VOCAB_QUDT-UNITS-ALL.ttl -> data/qudt
"""
import json
import os
import re
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "data/raw/qudt/VOCAB_QUDT-UNITS-ALL.ttl"
OUT = sys.argv[2] if len(sys.argv) > 2 else "data/qudt"

LICENSE = (
    "Creative Commons Attribution 4.0 International (CC BY 4.0). "
    "QUDT — Quantities, Units, Dimensions and Types (qudt.org)."
)

# our id -> (QUDT local name, dimension, scale from QUDT's SI-coherent
# base to our base unit). Mass: kg -> g is x1000. Volume: m^3 -> L is
# x1000. Length m, area m^2, pressure Pa are already our bases.
CURATED = {
    # SI (cross-checks of hand entries)
    "gram": ("GM", "weight", 1000.0),
    "kilogram": ("KiloGM", "weight", 1000.0),
    "millimetre": ("MilliM", "length", 1.0),
    "centimetre": ("CentiM", "length", 1.0),
    "metre": ("M", "length", 1.0),
    "kilometre": ("KiloM", "length", 1.0),
    "millilitre": ("MilliL", "volume", 1000.0),
    "litre": ("L", "volume", 1000.0),
    # Imperial (cross-checks of hand entries)
    "ounce": ("OZ", "weight", 1000.0),
    "pound": ("LB", "weight", 1000.0),
    "stone": ("Stone_UK", "weight", 1000.0),
    "inch": ("IN", "length", 1.0),
    "foot": ("FT", "length", 1.0),
    "yard": ("YD", "length", 1.0),
    "mile": ("MI", "length", 1.0),
    "pint": ("PINT_UK", "volume", 1000.0),
    "gallon": ("GAL_UK", "volume", 1000.0),
    # QUDT-added coverage (US variants distinguished, area, pressure)
    "us-pint": ("PINT_US", "volume", 1000.0),
    "us-gallon": ("GAL_US", "volume", 1000.0),
    "us-quart": ("QT_US", "volume", 1000.0),
    "quart": ("QT_UK", "volume", 1000.0),
    "us-fluid-ounce": ("OZ_VOL_US", "volume", 1000.0),
    "fluid-ounce": ("OZ_VOL_UK", "volume", 1000.0),
    "acre": ("AC", "area", 1.0),
    "pascal": ("PA", "pressure", 1.0),
    "psi": ("PSI", "pressure", 1.0),
    # Temperature scales: multiplier/offset recorded for the
    # cross-check of convertTemperature's arithmetic (K = m*x + o).
    "celsius": ("DEG_C", "temperature", 1.0),
    "fahrenheit": ("DEG_F", "temperature", 1.0),
}

# The hand table's filed factors (src/fork/units-measurement.ts) for
# the units it already files — the cross-check's other side. If the
# hand table changes, change this too; the script's job is to print
# disagreements, and a stale copy here would print false ones.
HAND = {
    "gram": 1.0, "kilogram": 1000.0,
    "millimetre": 0.001, "centimetre": 0.01, "metre": 1.0, "kilometre": 1000.0,
    "millilitre": 0.001, "litre": 1.0,
    "ounce": 28.349523125, "pound": 453.59237, "stone": 6350.29318,
    "inch": 0.0254, "foot": 0.3048, "yard": 0.9144, "mile": 1609.344,
    "pint": 0.56826125, "gallon": 4.54609,
}


def parse_units(ttl):
    units = {}
    for block in re.split(r"\n(?=\S)", ttl):
        m = re.match(r"unit:([A-Za-z0-9_]+)\s", block)
        if not m:
            continue
        mult = re.search(r"qudt:conversionMultiplier ([0-9.E+-]+)", block)
        off = re.search(r"qudt:conversionOffset ([0-9.E+-]+)", block)
        lab = re.search(r'rdfs:label "([^"]+)"@en', block)
        units[m.group(1)] = {
            "multiplier": float(mult.group(1)) if mult else None,
            "offset": float(off.group(1)) if off else None,
            "label": lab.group(1) if lab else None,
        }
    return units


def main():
    with open(SRC) as fh:
        units = parse_units(fh.read())
    records, disagreements, missing = [], [], []
    for our_id, (qudt_name, dimension, scale) in CURATED.items():
        u = units.get(qudt_name)
        if u is None or u["multiplier"] is None:
            missing.append(qudt_name)
            continue
        rec = {
            "id": our_id,
            "qudt": f"unit:{qudt_name}",
            "label": u["label"],
            "dimension": dimension,
            "qudtMultiplier": u["multiplier"],
            "factor": u["multiplier"] * scale,
        }
        if u["offset"] is not None:
            rec["qudtOffset"] = u["offset"]
        records.append(rec)
        hand = HAND.get(our_id)
        if hand is not None and dimension != "temperature":
            if abs(hand - rec["factor"]) > max(1e-9, abs(hand) * 1e-9):
                disagreements.append(
                    {"id": our_id, "hand": hand, "qudt": rec["factor"]}
                )
    os.makedirs(OUT, exist_ok=True)
    part = {"units": records}
    part_path = os.path.join(OUT, "part-001.json")
    with open(part_path, "w") as fh:
        json.dump(part, fh, separators=(",", ":"), sort_keys=True)
    manifest = {
        "v": 1,
        "source": "QUDT units vocabulary (qudt-public-repo), VOCAB_QUDT-UNITS-ALL.ttl",
        "edition": "main (fetched 2026-11-17)",
        "license": LICENSE,
        "counts": {"units": len(records)},
        "crossCheck": {
            "against": "the hand table in src/fork/units-measurement.ts",
            "disagreements": disagreements,
            "missingFromQUDT": missing,
        },
        "parts": [
            {
                "file": "part-001.json",
                "kind": "units",
                "count": len(records),
                "bytes": os.path.getsize(part_path),
            }
        ],
    }
    with open(os.path.join(OUT, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"qudt: {len(records)} units converted; missing: {missing or 'none'}")
    if disagreements:
        print("DISAGREEMENTS with the hand table (hand values kept):")
        for d in disagreements:
            print(f"  {d['id']}: hand {d['hand']} vs QUDT {d['qudt']}")
    else:
        print("cross-check: every shared unit agrees with the hand table")


if __name__ == "__main__":
    main()
