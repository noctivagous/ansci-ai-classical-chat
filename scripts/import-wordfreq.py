#!/usr/bin/env python3
"""
import-wordfreq.py — build-time extraction of the English word
frequency table (data/wordfreq/manifest.json + part-001.json)
from the `wordfreq` Python package (Robyn Speer).

Source: the wordfreq package's bundled English ("best") word
list — multi-source frequency estimates (Google Books Ngrams,
Wikipedia, OpenSubtitles, Leeds Internet Corpus, SUBTLEX lists,
Twitter) combined by the Exquisite Corpus project. The package
is a build-time dependency only; nothing at runtime imports it.

    pip install wordfreq==3.1.1
    python3 scripts/import-wordfreq.py [out-dir]

License (verified 2026-11-17 from the package's own PyPI page
and its included license texts): the wordfreq CODE is MIT /
Apache-2.0 depending on version; the DATA files may be
redistributed under the Creative Commons Attribution-ShareAlike
4.0 International License (CC BY-SA 4.0) —
https://creativecommons.org/licenses/by-sa/4.0/. The table this
script writes is wordfreq data, so the artefact is CC BY-SA 4.0:
attribution in the repo NOTICE file and in the manifest,
including the SUBTLEX credit the package's license asks for
(SUBTLEX word lists by Marc Brysbaert et al.).

Trim: English only, words at or above a Zipf frequency floor of
2.0 (Zipf = log10 of occurrences per billion words, so 2.0 is
roughly one occurrence per hundred million). Measured at
extraction time (wordfreq 3.1.1, 319,938 words in the full
English "best" list): floor 3.5 → 15,089 words / 252,087 bytes;
3.0 → 29,151 / 492,884; 2.5 → 53,354 / 909,197; 2.0 → 95,641 /
1,633,769. The 2.0 floor is the one filed: it keeps genuinely
rare REAL words attested (e.g. "abattoir", Zipf 2.5) — the
table's consumer (the NormalcyUnit, src/fork/normalcy-unit.ts)
reads attestation as knowledge about a word, and a floor that
dropped real rare words would misfile them as unattested.

Each record is [word, zipf] with zipf rounded to two decimals —
the precision the source itself reports.
"""
import importlib.metadata
import json
import os
import sys

OUT = sys.argv[1] if len(sys.argv) > 1 else "data/wordfreq"
FLOOR = 2.0

LICENSE = (
    "Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0) "
    "for the data (the wordfreq package's data files); attribution to Robyn Speer "
    "and the wordfreq contributors, and to the SUBTLEX word lists (Marc Brysbaert "
    "et al.), as the package's license requires."
)


def main():
    try:
        from wordfreq import top_n_list, zipf_frequency
    except ImportError:
        sys.exit(
            "the wordfreq package is not installed for this python; "
            "install it first: pip install wordfreq==3.1.1"
        )
    version = importlib.metadata.version("wordfreq")
    words = top_n_list("en", 1_000_000, wordlist="best")
    kept = []
    for w in words:
        z = zipf_frequency(w, "en")
        if z >= FLOOR:
            kept.append([w, round(z, 2)])
    kept.sort(key=lambda r: r[0])
    os.makedirs(OUT, exist_ok=True)
    part = {"words": kept}
    part_path = os.path.join(OUT, "part-001.json")
    with open(part_path, "w") as fh:
        json.dump(part, fh, separators=(",", ":"), sort_keys=True)
    manifest = {
        "v": 1,
        "source": "wordfreq (Robyn Speer): the English 'best' word list of the wordfreq Python package",
        "edition": f"wordfreq {version}",
        "license": LICENSE,
        "counts": {"words": len(kept), "fullListWords": len(words)},
        "trim": {
            "language": "en",
            "wordlist": "best",
            "zipfFloor": FLOOR,
            "note": "Zipf = log10 occurrences per billion words. Floors measured at extraction: "
                    "3.5 -> 15,089 words; 3.0 -> 29,151; 2.5 -> 53,354; 2.0 -> 95,641 (filed).",
        },
        "parts": [
            {
                "file": "part-001.json",
                "kind": "words",
                "count": len(kept),
                "bytes": os.path.getsize(part_path),
            }
        ],
    }
    with open(os.path.join(OUT, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"wordfreq: {len(kept)} English words at zipf >= {FLOOR} (of {len(words)} in the full list)")


if __name__ == "__main__":
    main()
