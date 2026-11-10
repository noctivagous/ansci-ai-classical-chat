#!/usr/bin/env python3
"""
import-wordnet.py — build the chunked WordNet extract from Open English WordNet.

Source: Open English WordNet (OEWN), WNDB format, CC BY 4.0.
  Default edition: 2024, https://en-word.net/static/english-wordnet-2024.zip
  Override with ANSCI_WN_URL / ANSCI_WN_EDITION env vars.

Steps:
  1. Download the WNDB zip into data/raw/ (gitignored) and unpack it there.
  2. Parse data.{noun,verb,adj,adv} (classic WordNet database format).
  3. Emit the extract CHUNKED under data/wordnet/extract/: a manifest.json
     plus part-*.json files, each part a JSON array of records serialized
     to at most PART_BUDGET_CAP bytes. (The previous single-file extract
     was 13.2 MB and exceeded the GitHub snapshot-push transport limit —
     a push attempt failed with HTTP 413 — so no part may approach it.)

Extract format v3 (chunked):
  manifest.json:
    {
      "v": 3, "source": "Open English WordNet 2024 (WNDB format)",
      "edition": "2024", "license": "CC BY 4.0", "trimmed": [...],
      "counts": {"synsets": <n>, "relations": <total relation records>},
      "parts": [{"file": "part-001.json", "kind": "synsets"|"relations",
                 "count": <records in part>, "bytes": <serialized size>},
                ...]            // stable order: synset parts, then relation parts
    }
  Synset parts are JSON arrays of synset records in global index order
  (blocks concatenated in n, v, a order, offset-ascending within a block):
      [offset, pos, gloss, [lemma, ...]]
  Relation parts are JSON arrays of relation records, grouped by kind in
  the fixed order hypernym, part, antonym, similar, entails, causes,
  instance; indices are global synset numbers:
      ["hypernym", from, to]        ["instance", from, to]
      ["part", part, whole, "p"|"s"|"m"]              // meronym, subtype kept
      ["antonym", from, to, fromLemmaIdx, toLemmaIdx] // lexical
      ["similar", from, to]         ["entails", from, to]
      ["causes", from, to]
  Chunk boundaries are a pure function of the data: records accumulate
  into a part until adding the next record's serialized bytes would
  exceed the byte budget, so re-running the importer reproduces
  byte-identical parts.
  Form parts (slice 2b, design §7.3) are JSON arrays of [surface, lemma, pos]
  records — the closed morphology index the router resolves inflected
  words through. It is built from two attested sources only: the WNDB
  exception files (noun.exc / verb.exc / adj.exc) and WordNet's Morphy
  detachment rules applied in reverse to the attested lemma inventory.
  Only non-identity forms whose base lemma + POS is itself attested in
  the extract are emitted, so the index stays closed and reviewable; a
  form maps to lemma + POS candidates, never directly to a synset.
A synset's stable id is derived: "wn-" + pos + zero-padded offset (8 digits).
Glosses keep the definition text; quoted usage examples after the definition
are dropped (they are the bulk of the gloss bytes and add no relations).
Hyponym/holonym pointers are the reverse of hypernym/meronym pointers already
present on the other side, so each fact is stored once.

Trimming applied to fit the repo's size budget (all reported, nothing silent):
adverb synsets are omitted (the extract is noun/verb/adjective), and
derivationally-related edges are omitted. Core relations (hypernym, meronym,
antonym, similar-to, entailment, causes) and every kept synset's full
definition survive untouched.
"""
import json
import os
import re
import sys
import urllib.request
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EDITION = os.environ.get("ANSCI_WN_EDITION", "2024")
URL = os.environ.get(
    "ANSCI_WN_URL", f"https://en-word.net/static/english-wordnet-{EDITION}.zip"
)
RAW_DIR = os.path.join(ROOT, "data", "raw")
OUT_DIR = os.path.join(ROOT, "data", "wordnet", "extract")
# No part file may exceed the 3.5 MB cap. Record accumulation fills parts
# to within a few records of the budget, so if any part lands within 5% of
# the cap the whole chunking is redone at the safer 3.2 MB budget.
PART_BUDGET_CAP = 3_500_000
PART_BUDGET_SAFE = 3_200_000

POS_FILES = {"n": "data.noun", "v": "data.verb", "a": "data.adj", "r": "data.adv"}


def download_and_unpack() -> str:
    os.makedirs(RAW_DIR, exist_ok=True)
    zip_path = os.path.join(RAW_DIR, f"english-wordnet-{EDITION}.zip")
    if not os.path.exists(zip_path):
        print(f"downloading {URL} -> {zip_path}", file=sys.stderr)
        req = urllib.request.Request(URL, headers={"User-Agent": "ansci-importer"})
        with urllib.request.urlopen(req) as resp, open(zip_path, "wb") as fh:
            fh.write(resp.read())
    unpack_dir = os.path.join(RAW_DIR, f"oewn-{EDITION}")
    if not os.path.exists(os.path.join(unpack_dir, "data.noun")):
        print(f"unpacking -> {unpack_dir}", file=sys.stderr)
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(unpack_dir)
    # WNDB files may sit in a nested folder inside the zip.
    for dirpath, _dirnames, filenames in os.walk(unpack_dir):
        if "data.noun" in filenames:
            return dirpath
    raise SystemExit("data.noun not found in the downloaded zip")


def definition_only(gloss: str) -> str:
    """Keep the definition; drop quoted example sentences that follow it."""
    idx = gloss.find('; "')
    if idx != -1:
        gloss = gloss[:idx]
    return gloss.strip()


def parse_wndb(wndb_dir: str):
    synsets = []  # [offset, pos, gloss, [lemmas]]
    index_of = {}  # (pos, offset) -> synset index
    raw_relations = []  # (kind, fromKey, toKey, extra)

    for pos, fname in POS_FILES.items():
        path = os.path.join(wndb_dir, fname)
        with open(path, encoding="utf-8", errors="replace") as fh:
            for line in fh:
                if line.startswith(" ") or "|" not in line:
                    continue  # licence header lines start with a space
                left, gloss = line.split("|", 1)
                toks = left.split()
                offset = int(toks[0])
                ss_type = toks[2]
                real_pos = "a" if ss_type in ("a", "s") else pos  # adjective satellite -> a
                w_cnt = int(toks[3], 16)
                lemmas = []
                p = 4
                for _ in range(w_cnt):
                    lemmas.append(toks[p].replace("_", " "))
                    p += 2  # skip lex_id token
                key = (real_pos, offset)
                if key not in index_of:
                    index_of[key] = len(synsets)
                    synsets.append([offset, real_pos, definition_only(gloss), lemmas])
                p_cnt = int(toks[p])
                p += 1
                for _ in range(p_cnt):
                    symbol, t_off, t_pos, src_tgt = (
                        toks[p],
                        int(toks[p + 1]),
                        toks[p + 2],
                        toks[p + 3],
                    )
                    p += 4
                    t_pos_norm = "a" if t_pos in ("a", "s") else t_pos
                    src_lemma = int(src_tgt[:2], 16)  # 1-based lemma no., 0 = synset-level
                    tgt_lemma = int(src_tgt[2:], 16)
                    frm = (real_pos, offset)
                    to = (t_pos_norm, t_off)
                    if symbol == "@":
                        raw_relations.append(("hypernym", frm, to, None))
                    elif symbol == "@i":
                        raw_relations.append(("hypernym", frm, to, "i"))
                    elif symbol in ("%p", "%s", "%m"):
                        raw_relations.append(("part", frm, to, symbol[1]))
                    elif symbol == "!":
                        raw_relations.append(
                            ("antonym", frm, to, (src_lemma - 1, tgt_lemma - 1))
                        )
                    elif symbol == "&":
                        raw_relations.append(("similar", frm, to, None))
                    elif symbol == "+":
                        raw_relations.append(
                            ("derived", frm, to, (src_lemma - 1, tgt_lemma - 1))
                        )
                    elif symbol == "*":
                        raw_relations.append(("entails", frm, to, None))
                    elif symbol == ">":
                        raw_relations.append(("causes", frm, to, None))
                    # "~"/"#x" are the same facts from the other side; "=",
                    # domains, verb groups etc. are out of scope for the extract.
    relations = {k: [] for k in ("hypernym", "part", "antonym", "similar", "derived", "entails", "causes")}
    seen = set()
    skipped_missing = 0
    for kind, frm, to, extra in raw_relations:
        if frm not in index_of or to not in index_of:
            skipped_missing += 1
            continue
        f, t = index_of[frm], index_of[to]
        if kind in ("antonym", "derived"):
            entry = (kind, f, t, extra[0], extra[1])
            out = [f, t, extra[0], extra[1]]
        elif kind == "part":
            entry = (kind, f, t, extra)
            out = [f, t, extra]
        elif kind == "hypernym" and extra:
            entry = (kind, f, t, extra)
            out = [f, t, extra]
        else:
            entry = (kind, f, t)
            out = [f, t]
        if entry in seen:
            continue
        seen.add(entry)
        relations[kind].append(out)
    return synsets, relations, skipped_missing


def build_extract(synsets, relations):
    """Apply the trims and compact encoding. Returns (extract, stats)."""
    # Trim 1: adverb synsets out (noun/verb/adjective kept in full).
    keep = [i for i, s in enumerate(synsets) if s[1] != "r"]
    remap = {old: new for new, old in enumerate(keep)}
    kept = [synsets[i] for i in keep]

    def remapped(rows):
        return [
            [remap[r[0]], remap[r[1]], *r[2:]]
            for r in rows
            if r[0] in remap and r[1] in remap
        ]

    rel = {k: remapped(v) for k, v in relations.items()}
    derived_dropped = len(relations.get("derived", []))
    # Trim 2: derivationally-related edges out (parsed, counted, not stored).
    rel.pop("derived", None)
    # Instance hypernyms get their own kind so "hypernym" is a uniform stride.
    instance = [[r[0], r[1]] for r in rel["hypernym"] if len(r) > 2]
    rel["hypernym"] = [[r[0], r[1]] for r in rel["hypernym"] if len(r) <= 2]
    rel["instance"] = instance

    # Pos-grouped blocks with delta-encoded offsets; global synset index is
    # the concatenation of blocks in n, v, a order (the order of `kept` after
    # sorting each block by offset — relations were remapped against the
    # pre-sort order, so sort blocks and relations consistently below).
    order = sorted(range(len(kept)), key=lambda i: ("nva".index(kept[i][1]), kept[i][0]))
    final_index = {old: new for new, old in enumerate(order)}
    blocks = {}
    for pos in ("n", "v", "a"):
        rows = []
        prev = 0
        for old in order:
            s = kept[old]
            if s[1] != pos:
                continue
            if not rows:
                blocks[pos] = {"start": s[0], "rows": rows}
                prev = s[0]
                rows.append([0, s[2], s[3]])
            else:
                rows.append([s[0] - prev, s[2], s[3]])
                prev = s[0]
    flat = {}
    for kind, rows in rel.items():
        out = []
        for r in rows:
            out.extend([final_index[r[0]], final_index[r[1]], *r[2:]])
        flat[kind] = out
    extract = {
        "v": 3,
        "source": "Open English WordNet 2024 (WNDB format)",
        "edition": EDITION,
        "license": "CC BY 4.0",
        "trimmed": [
            "adverb synsets omitted (noun/verb/adjective kept in full)",
            "derivationally-related edges omitted",
            "gloss usage examples omitted (definitions kept in full)",
        ],
        "blocks": blocks,
        "relations": flat,
    }
    stats = {
        "synsets": len(kept),
        "relations": {k: len(v) // (3 if k == "part" else 4 if k == "antonym" else 2) for k, v in flat.items()},
        "derived_dropped": derived_dropped,
    }
    return extract, stats


EXC_FILES = {"n": "noun.exc", "v": "verb.exc", "a": "adj.exc"}


def parse_exc(wndb_dir: str):
    """WNDB exception files: 'surface lemma' pairs of irregular forms."""
    pairs = []  # (surface, lemma, pos)
    for pos, fname in EXC_FILES.items():
        path = os.path.join(wndb_dir, fname)
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8", errors="replace") as fh:
            for line in fh:
                toks = line.split()
                if len(toks) != 2:
                    continue
                surface, lemma = (t.replace("_", " ") for t in toks)
                pairs.append((surface, lemma, pos))
    return pairs


def _cvc(word: str) -> bool:
    """Ends consonant + single vowel + single consonant (not w/x/y):
    the shape whose final consonant doubles before -ed/-ing/-er/-est."""
    return re.search(r"[^aeiou][aeiou][^aeiouwxy]$", word) is not None


def _noun_forms(lemma: str):
    if lemma.endswith("man"):
        return {lemma[:-3] + "men"}
    if re.search(r"[^aeiou]y$", lemma):
        return {lemma[:-1] + "ies"}
    if re.search(r"(s|x|z|ch|sh)$", lemma):
        return {lemma + "es"}
    return {lemma + "s"}


def _verb_forms(lemma: str):
    forms = set()
    # third person singular
    if re.search(r"(s|x|z|ch|sh|o)$", lemma):
        forms.add(lemma + "es")
    elif re.search(r"[^aeiou]y$", lemma):
        forms.add(lemma[:-1] + "ies")
    else:
        forms.add(lemma + "s")
    # -ed (past / past participle)
    if lemma.endswith("e"):
        forms.add(lemma + "d")
    elif re.search(r"[^aeiou]y$", lemma):
        forms.add(lemma[:-1] + "ied")
    elif _cvc(lemma):
        forms.add(lemma + lemma[-1] + "ed")
    else:
        forms.add(lemma + "ed")
    # -ing
    if lemma.endswith("ie"):
        forms.add(lemma[:-2] + "ying")
    elif lemma.endswith("e") and not lemma.endswith(("ee", "ye", "oe")):
        forms.add(lemma[:-1] + "ing")
    elif _cvc(lemma):
        forms.add(lemma + lemma[-1] + "ing")
    else:
        forms.add(lemma + "ing")
    return forms


def _adj_forms(lemma: str):
    if re.search(r"[^aeiou]y$", lemma):
        return {lemma[:-1] + "ier", lemma[:-1] + "iest"}
    if lemma.endswith("e"):
        return {lemma + "r", lemma + "st"}
    if _cvc(lemma):
        return {lemma + lemma[-1] + "er", lemma + lemma[-1] + "est"}
    return {lemma + "er", lemma + "est"}


_FORM_GENERATORS = {"n": _noun_forms, "v": _verb_forms, "a": _adj_forms}


def build_forms_index(synset_records, exc_pairs):
    """The closed surface-form index (design §7.3): records of
    [surface, lemma, pos], sorted, non-identity forms only, every base
    lemma + POS attested in the extract."""
    attested = set()  # (lemma, pos)
    for _offset, pos, _gloss, lemmas in synset_records:
        for lemma in lemmas:
            attested.add((lemma.lower(), pos))
    forms = set()  # (surface, lemma, pos)
    for surface, lemma, pos in exc_pairs:
        if surface != lemma and (lemma.lower(), pos) in attested:
            forms.add((surface, lemma.lower(), pos))
    for lemma, pos in sorted(attested):
        if " " in lemma:
            continue  # inflecting inside a multiword phrase is not claimed (§7.3)
        for surface in _FORM_GENERATORS[pos](lemma):
            if surface != lemma:
                forms.add((surface, lemma, pos))
    return [[surface, lemma, pos] for surface, lemma, pos in sorted(forms)]


def extract_records(extract):
    """Flatten the compact extract into chunkable record arrays.

    Synset records decode the pos blocks (delta offsets made absolute) in
    global index order: [offset, pos, gloss, [lemma, ...]]. Relation
    records regroup the flat arrays by kind, in the flat arrays' own kind
    order: [kind, *tuple] where the tuple is exactly the stride-`STRIDES`
    slice the loader used to read from the flat array.
    """
    synset_records = []
    for pos in ("n", "v", "a"):
        block = extract["blocks"].get(pos)
        if not block:
            continue
        offset = block["start"]
        for delta, gloss, lemmas in block["rows"]:
            offset += delta
            synset_records.append([offset, pos, gloss, lemmas])
    relation_records = []
    for kind, flat in extract["relations"].items():
        stride = 3 if kind == "part" else 4 if kind == "antonym" else 2
        for i in range(0, len(flat), stride):
            relation_records.append([kind, *flat[i : i + stride]])
    return synset_records, relation_records


def chunk_records(records, budget):
    """Split records into serialized JSON-array parts of at most `budget`
    bytes each. Pure function of the records: accumulate until adding the
    next record's serialized bytes (plus its separating comma) would
    exceed the budget. Returns [(record_count, serialized_bytes), ...]."""
    parts = []
    cur = []
    cur_size = 2  # the surrounding [ ]
    for rec in records:
        blob = json.dumps(rec, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        add = len(blob) + (1 if cur else 0)
        if cur and cur_size + add > budget:
            parts.append((len(cur), b"[" + b",".join(cur) + b"]"))
            cur, cur_size, add = [], 2, len(blob)
        cur.append(blob)
        cur_size += add
    if cur:
        parts.append((len(cur), b"[" + b",".join(cur) + b"]"))
    return parts


def build_parts(record_groups, budget):
    """Chunk every record array at `budget`; returns [(kind, count, bytes)]."""
    out = []
    for kind, records in record_groups:
        for count, blob in chunk_records(records, budget):
            out.append((kind, count, blob))
    return out


def write_extract(extract, stats, exc_pairs) -> None:
    synset_records, relation_records = extract_records(extract)
    form_records = build_forms_index(synset_records, exc_pairs)
    groups = (
        ("synsets", synset_records),
        ("relations", relation_records),
        ("forms", form_records),
    )
    parts = build_parts(groups, PART_BUDGET_CAP)
    if parts and max(len(b) for _k, _c, b in parts) >= 0.95 * PART_BUDGET_CAP:
        # Accumulation fills parts to near the budget; keep a real margin
        # under the transport cap instead of landing within 5% of it.
        parts = build_parts(groups, PART_BUDGET_SAFE)
    os.makedirs(OUT_DIR, exist_ok=True)
    # Remove stale parts/manifest from any previous run so the directory
    # holds exactly this run's output.
    for name in os.listdir(OUT_DIR):
        if name == "manifest.json" or (name.startswith("part-") and name.endswith(".json")):
            os.remove(os.path.join(OUT_DIR, name))
    part_entries = []
    for i, (kind, count, blob) in enumerate(parts, start=1):
        fname = f"part-{i:03d}.json"
        with open(os.path.join(OUT_DIR, fname), "wb") as fh:
            fh.write(blob)
        part_entries.append(
            {"file": fname, "kind": kind, "count": count, "bytes": len(blob)}
        )
    manifest = {
        "v": extract["v"],
        "source": extract["source"],
        "edition": extract["edition"],
        "license": extract["license"],
        "trimmed": extract["trimmed"],
        "counts": {
            "synsets": stats["synsets"],
            "relations": sum(stats["relations"].values()),
            "forms": len(form_records),
        },
        "parts": part_entries,
    }
    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    total = sum(p["bytes"] for p in part_entries) + os.path.getsize(
        os.path.join(OUT_DIR, "manifest.json")
    )
    for p in part_entries:
        print(f"  {p['file']}: {p['kind']}, {p['count']} records, {p['bytes']} bytes")
    print(f"extract: {OUT_DIR} = {total} bytes ({total / 1e6:.2f} MB) in {len(part_entries)} parts + manifest")


def main() -> None:
    wndb_dir = download_and_unpack()
    synsets, relations, skipped = parse_wndb(wndb_dir)
    exc_pairs = parse_exc(wndb_dir)
    extract, stats = build_extract(synsets, relations)
    print(f"synsets: {stats['synsets']}")
    print(f"relations: {stats['relations']} (total {sum(stats['relations'].values())})")
    print(f"derivationally-related edges parsed but trimmed: {stats['derived_dropped']}")
    print(f"pointers to missing synsets skipped: {skipped}")
    print(f"exception-file pairs parsed: {len(exc_pairs)}")
    write_extract(extract, stats, exc_pairs)
    # Status, in the same shape as the FrameNet importer's: the
    # extract is deterministic (chunk boundaries are a pure
    # function of the data), so re-running this importer is
    # idempotent — it reproduces the same bytes — and after any
    # successful run the extract is simply present. install.mjs
    # verifies the shipped copy by this manifest and reports the
    # same word.
    print(
        "wordnet extract status: present "
        f"({stats['synsets']} synsets, {sum(stats['relations'].values())} relations)"
    )


if __name__ == "__main__":
    main()
