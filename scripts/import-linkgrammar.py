#!/usr/bin/env python3
"""
import-linkgrammar.py — build-time conversion of the Link Grammar
English dictionary (OpenCog / CMU Link Grammar 5.13.x, dictionary
5.12.4) into the compact table the parser loads at runtime
(data/linkgrammar/manifest.json + part-*.json).

Source: a checkout of the official repository,
https://github.com/opencog/link-grammar, at master
d937b69500839e94a55d1093875f8d4d1eb2fd96 (2026-11-03). The importer
takes the checkout as its source-dir argument (the dictionary is not
redistributed as a tarball by upstream, and this repo does not vendor
the raw checkout); only data/en/4.0.dict and data/en/words/ are read.

License: GNU Lesser General Public License v2.1 or later (LGPL-2.1+).
Copyright (C) 1991-1998 Daniel Sleator and Davy Temperley; (C) 2003
Peter Szolovits and MIT; (C) 2008-2020 Linas Vepstas; (C) 2013 Lian
Ruiting; and the OpenCog contributors. The full attribution is
reproduced in the repo NOTICE file and in the manifest this script
writes.

What the conversion keeps, per word form:
  - the dictionary entry (or entries) the form is filed under,
    reduced from the entry's FULLY EXPANDED disjunct set: the live
    disjunct count (after the default dialect's cost pruning, see
    below), the largest bare-object capacity of any disjunct (the
    number of O+ connectors — the S/O shape the checker reads), the
    cheapest disjunct's cost, and the entry's provenance (its line
    in 4.0.dict and the macro chain its expansion traversed);
  - the form's dictionary subscript(s) (.v, .n, .v-d, .g, ...),
    from which the provider derives the form's word-class evidence.

What the reduction means, stated plainly: the dictionary's entries
expand to ~21.9M live disjuncts in total (median 1,428 per entry,
largest single entry 247,848). Shipping disjuncts verbatim is not
viable and v1's consumers do not read them — they read class
evidence and O-capacity — so, exactly as the VerbNet conversion
reduces frames to argument shapes, this conversion reduces each
entry to the summary its consumers check. The expansion itself is
performed in full; nothing is sampled. The per-entry disjunct
counts are recorded in the shipped records, so the size of what
was reduced away is on the record, not silent.

Dialect and cost discipline (the dictionary's own semantics, from
4.0.dialect and read-dict.c): a bracketed expression [...] carries
disjunct cost 1 unless a number overrides it; a word after a
bracket is a symbolic dialect cost. The DEFAULT dialect sets
headline=99 (disabled: above the dictionary's max-disjunct-cost
of 10), bad-spelling=0, colloquial=0. Expanded disjuncts whose
total cost exceeds 10 are dead in the default dialect and are
dropped here, with their count recorded.

What it drops, with counts in the manifest, never silent:
  - word forms outside AnSci's evaluated vocabulary (the hand
    lexicon's en() forms in src/ansci/sentence.ts, the WordNet
    extract's lemmas, and the extract's surface forms index);
  - idiom / multiword heads (a head containing "_" joins words
    with underscores — "kind_of" — and is not a single word form);
  - the solver, the post-processing knowledge (4.0.knowledge),
    the constituent knowledge, the affix file and the regex file:
    data tables for a parser this slice does not port.

Usage: python3 scripts/import-linkgrammar.py [source-dir] [out-dir]
Defaults: data/raw/linkgrammar/link-grammar -> data/linkgrammar
(the raw checkout lives in the gitignored data/raw/ area, as the
VerbNet tarball does). The WordNet extract and sentence.ts are
read from this repo for the vocabulary restriction.
"""
import json
import os
import re
import sys
from collections import defaultdict

SRC = sys.argv[1] if len(sys.argv) > 1 else "data/raw/linkgrammar/link-grammar"
OUT = sys.argv[2] if len(sys.argv) > 2 else "data/linkgrammar"
WN_DIR = "data/wordnet/extract"
SENTENCE_TS = "src/ansci/sentence.ts"

UPSTREAM = "https://github.com/opencog/link-grammar"
UPSTREAM_COMMIT = "d937b69500839e94a55d1093875f8d4d1eb2fd96"
DICT_VERSION = "5.12.4"
LG_VERSION = "5.13.2"
LICENSE = (
    "GNU Lesser General Public License v2.1 or later (LGPL-2.1+). "
    "Link Grammar copyright (C) 1991-1998 Daniel Sleator and Davy Temperley; "
    "(C) 2003 Peter Szolovits and MIT; (C) 2008-2020 Linas Vepstas; "
    "(C) 2013 Lian Ruiting; and the OpenCog contributors."
)
# The default dialect (data/en/4.0.dialect, [default] section):
# no-headline (headline: 99), bad-spelling: 0, colloquial: 0.
# An undefined component is "very high" per that file.
DIALECT_DEFAULT = {"headline": 99.0, "bad-spelling": 0.0, "colloquial": 0.0}
MAX_DISJUNCT_COST = 10.0  # #define max-disjunct-cost in 4.0.dict
EXPAND_CAP = 2_000_000    # per entry; the largest observed entry is 247,848

# ---------------------------------------------------------------- dict parsing

TOKEN_RE = re.compile(
    r'(?P<ws>\s+)'
    r'|(?P<quoted>"""|"[^"]*")'
    r'|(?P<macro><[^>]*>)'
    r'|(?P<file>/en/words/[^\s:;]+)'
    r'|(?P<sym>[(){}[\]&;:])'
    r'|(?P<num>\d+(?:\.\d+)?)'
    r'|(?P<word>[^\s(){}[\]&;:<>]+)',
    re.X,
)
CONN_RE = re.compile(r"^@?[a-z]*[A-Z][A-Za-z0-9*]*[+-]$")
SUBSCRIPT_RE = re.compile(r"^[A-Za-z#][A-Za-z0-9#-]*$")


def tokenize(text):
    """Tokens with 1-based source lines. Comments (%) are stripped
    outside quotes; #define lines are dropped (their one live use,
    empty-connector ZZZ, survives as the connector tokens ZZZ+/ZZZ-)."""
    lines = []
    for ln in text.split("\n"):
        out, inq = "", False
        for ch in ln:
            if ch == '"':
                inq = not inq
            if ch == "%" and not inq:
                break
            out += ch
        lines.append(out)
    text = "\n".join(lines)
    text = re.sub(r"#define[^\n]*", "", text)
    line_starts = [0]
    for m in re.finditer("\n", text):
        line_starts.append(m.end())

    def line_of(pos):
        import bisect
        return bisect.bisect_right(line_starts, pos)

    toks = []
    for m in TOKEN_RE.finditer(text):
        kind = m.lastgroup
        if kind == "ws":
            continue
        val = m.group()
        if kind == "quoted":
            val = '"' if val == '"""' else val[1:-1]
            kind = "word"
        toks.append((kind, val, line_of(m.start())))
    return toks


class Parser:
    def __init__(self, toks):
        self.toks = toks
        self.i = 0
        self.n = len(toks)

    def peek(self):
        return self.toks[self.i][:2] if self.i < self.n else (None, None)

    def parse_entries(self):
        entries = []
        while self.i < self.n:
            heads = []
            line = self.toks[self.i][2]
            while self.i < self.n and self.peek() != ("sym", ":"):
                heads.append(self.toks[self.i])
                self.i += 1
            if self.i >= self.n:
                break
            self.i += 1
            expr = self.parse_or()
            assert self.peek() == ("sym", ";"), \
                f"expected ; got {self.peek()} after heads {[h[1] for h in heads[:3]]}"
            self.i += 1
            entries.append((heads, expr, line))
        return entries

    def parse_or(self):
        node = self.parse_and()
        parts = [node]
        while self.peek() == ("word", "or"):
            self.i += 1
            parts.append(self.parse_and())
        return ("or", parts) if len(parts) > 1 else node

    def parse_and(self):
        node = self.parse_factor()
        parts = [node]
        while self.peek() == ("sym", "&"):
            self.i += 1
            parts.append(self.parse_factor())
        return ("and", parts) if len(parts) > 1 else node

    def parse_factor(self):
        kind, val = self.peek()
        if kind == "macro":
            self.i += 1
            return ("macro", val[1:-1])
        if (kind, val) == ("sym", "("):
            if self.toks[self.i + 1][:2] == ("sym", ")"):
                self.i += 2
                return ("empty",)
            node = self.parse_or_at(self.i + 1)
            assert self.peek() == ("sym", ")"), f"expected ) got {self.peek()}"
            self.i += 1
            return node
        if (kind, val) == ("sym", "{"):
            node = self.parse_or_at(self.i + 1)
            assert self.peek() == ("sym", "}"), f"expected }} got {self.peek()}"
            self.i += 1
            return ("opt", node)
        if (kind, val) == ("sym", "["):
            self.i += 1
            if self.peek() == ("sym", "]"):
                node = ("empty",)
            else:
                node = self.parse_or()
            assert self.peek() == ("sym", "]"), f"expected ] got {self.peek()}"
            self.i += 1
            cost = 1.0  # a bracket's default disjunct cost (read-dict.c)
            k2, v2 = self.peek()
            if k2 == "num":
                cost = float(v2)
                self.i += 1
            elif k2 == "word" and v2 != "or":
                cost = DIALECT_DEFAULT.get(v2, 99.0)  # symbolic dialect cost
                self.i += 1
            return ("cost", node, cost)
        if kind == "word":
            self.i += 1
            if CONN_RE.match(val):
                return ("conn", val)
            return ("wordref", val)
        raise ValueError(f"unexpected token {(kind, val)} at {self.i}")

    def parse_or_at(self, i):
        self.i = i
        return self.parse_or()


def split_form(token):
    """A dictionary word token -> (base form, subscript or None).
    The subscript follows the first dot when what follows matches
    the dictionary's subscript shape; otherwise the token is whole."""
    if "." in token:
        base, sub = token.split(".", 1)
        if base and SUBSCRIPT_RE.match(sub):
            return base, sub
    return token, None


_FAMILY_CACHE = {}


def connector_family(conn):
    """The link family of a connector: strip @, the sign, any
    lower-case head/dependent prefix, and subscript letters —
    'Os+' -> 'O', '@MVp-' -> 'MV', 'dWV-' -> 'WV'. Cached: the
    dictionary's distinct connectors are few, its disjuncts many."""
    fam = _FAMILY_CACHE.get(conn)
    if fam is None:
        c = conn.lstrip("@").rstrip("+-")
        i = 0
        while i < len(c) and c[i].islower():
            i += 1
        j = i
        while j < len(c) and c[j].isupper():
            j += 1
        fam = c[i:j]
        _FAMILY_CACHE[conn] = fam
    return fam


def connector_capacity(conn):
    """One connector's bare-object capacity: 1 for an O+ link,
    99 for an @O+ multi-connector (unbounded — a capacity check
    against it never fires), 0 otherwise."""
    if connector_family(conn) == "O" and conn.endswith("+"):
        return 99 if conn.startswith("@") else 1
    return 0


# ---------------------------------------------------------------- vocabulary

def evaluated_vocabulary():
    """Hand lexicon forms (the string literals of en(...) calls in
    sentence.ts — lemmas, inflected forms, and incidentally slot and
    preposition words, all of which are parser vocabulary anyway),
    the WordNet extract's lemmas, and its surface-forms index.

    The coverage slice's closed-class supplement is computed in
    main() from the parsed entries and added to this vocabulary
    there (see vocabSupplementBases in the manifest)."""
    vocab = set()
    src = open(SENTENCE_TS).read()
    for m in re.finditer(r"\ben\(", src):
        depth, j = 1, m.end()
        while depth and j < len(src):
            if src[j] == "(":
                depth += 1
            elif src[j] == ")":
                depth -= 1
            j += 1
        for s in re.findall(r'"([^"]+)"', src[m.start():j]):
            vocab.add(s.lower())
    manifest = json.load(open(os.path.join(WN_DIR, "manifest.json")))
    lemmas = surfaces = 0
    for part in manifest["parts"]:
        data = json.load(open(os.path.join(WN_DIR, part["file"])))
        if part["kind"] == "synsets":
            for row in data:
                if isinstance(row, list) and len(row) > 3 and isinstance(row[3], list):
                    for w in row[3]:
                        if isinstance(w, str):
                            vocab.add(w.lower().replace("_", " "))
                            lemmas += 1
        elif part["kind"] == "forms":
            for row in data:
                if isinstance(row, list) and row and isinstance(row[0], str):
                    vocab.add(row[0].lower())
                    surfaces += 1
    # Multiword lemmas (spaces/underscores) cannot be dictionary
    # head forms; they sit in the set harmlessly and never match.
    return vocab, lemmas, surfaces


# ---------------------------------------------------------------- conversion

def main():
    dict_path = os.path.join(SRC, "data/en/4.0.dict")
    words_dir = os.path.join(SRC, "data/en/words")
    toks = tokenize(open(dict_path).read())
    entries = Parser(toks).parse_entries()

    macros = {}
    word_entries = []
    for heads, expr, line in entries:
        is_word_entry = False
        for kind, val, _ln in heads:
            if kind == "macro":
                macros[val[1:-1]] = expr
            else:
                is_word_entry = True
        if is_word_entry:
            word_entries.append((heads, expr, line))

    # Word-form -> its entry expressions (for word references in
    # expressions: [the], [than.e], [rather_than], ...).
    form_exprs = defaultdict(list)
    words_cache = {}

    def words_file_forms(path_token):
        fname = path_token.rsplit("/", 1)[-1]
        if fname in words_cache:
            return words_cache[fname]
        forms = []
        try:
            raw = open(os.path.join(words_dir, fname)).read()
        except OSError:
            words_cache[fname] = None
            return None
        for ln in raw.split("\n"):
            ln = ln.split("%", 1)[0]
            for w in ln.split():
                forms.append(w.strip('"'))
        words_cache[fname] = forms
        return forms

    stats = defaultdict(int)
    for heads, expr, _line in word_entries:
        for kind, val, _ln in heads:
            if kind == "word":
                form_exprs[val].append(expr)
            elif kind == "file":
                forms = words_file_forms(val)
                if forms:
                    for f in forms:
                        form_exprs[f].append(expr)

    sys.setrecursionlimit(1000000)

    # Macro and word-reference expansions are memoised globally:
    # dictionary macros are non-recursive definitions (a cycle is
    # an upstream definition error and raises), so a macro's
    # disjunct set is a pure function of its definition, and the
    # ~1,800 entry expansions share subtrees heavily. Each cache
    # entry also carries the macro set its expansion traversed,
    # for the shipped provenance.
    macro_cache = {}
    wordref_cache = {}
    visiting = set()

    def expand_macro(name):
        if name in macro_cache:
            return macro_cache[name]
        if ("m", name) in visiting:
            raise ValueError(f"macro cycle at {name}")
        visiting.add(("m", name))
        used = {name}
        disjuncts = expand(macros[name], used)
        visiting.discard(("m", name))
        macro_cache[name] = (disjuncts, frozenset(used))
        return macro_cache[name]

    def expand_wordref(name):
        if name in wordref_cache:
            return wordref_cache[name]
        if ("w", name) in visiting:
            raise ValueError(f"word-reference cycle at {name}")
        exprs = form_exprs.get(name)
        if not exprs:
            stats["unknownWordRefs"] += 1
            wordref_cache[name] = ([((), 0.0, 0)], frozenset())
            return wordref_cache[name]
        visiting.add(("w", name))
        used = set()
        out = []
        for e in exprs:
            out.extend(expand(e, used))
        visiting.discard(("w", name))
        wordref_cache[name] = (out, frozenset(used))
        return wordref_cache[name]

    def expand(node, macros_used):
        # Disjuncts are (connectors, cost, object capacity) triples;
        # capacity composes bottom-up (an AND sums its parts'
        # capacities), so the per-entry summary is one final pass
        # and no per-disjunct connector scan is ever needed.
        t = node[0]
        if t == "conn":
            return [((node[1],), 0.0, connector_capacity(node[1]))]
        if t == "empty":
            return [((), 0.0, 0)]
        if t == "macro":
            disjuncts, used = expand_macro(node[1])
            macros_used |= used
            return disjuncts
        if t == "wordref":
            disjuncts, used = expand_wordref(node[1])
            macros_used |= used
            return disjuncts
        if t == "opt":
            return [((), 0.0, 0)] + expand(node[1], macros_used)
        if t == "cost":
            return [(c, cost + node[2], cap) for c, cost, cap in expand(node[1], macros_used)]
        if t == "or":
            out = []
            for p in node[1]:
                out.extend(expand(p, macros_used))
                if len(out) > EXPAND_CAP:
                    raise OverflowError("expansion cap")
            return out
        if t == "and":
            acc = [((), 0.0, 0)]
            for p in node[1]:
                sub = expand(p, macros_used)
                acc = [(a[0] + b[0], a[1] + b[1], min(99, a[2] + b[2])) for a in acc for b in sub]
                if len(acc) > EXPAND_CAP:
                    raise OverflowError("expansion cap")
            return acc
        raise ValueError(t)

    vocab, wn_lemma_rows, wn_surface_rows = evaluated_vocabulary()

    # ---- Coverage-slice supplement: the closed classes ----
    # The WordNet-derived vocabulary excludes the closed classes
    # by construction (WordNet files no 'the'), and the
    # dictionary slice's evidence consumers never needed them;
    # the coverage slice's solver does — no linkage over an
    # ordinary sentence exists while 'the', 'and', 'with', 'of',
    # 'that', 'if' have no entries. The supplement is computed
    # from the dictionary's own parsed heads: a base form is
    # supplemented when some entry files it unsubscripted (bare
    # heads: determiners, prepositions, phrasal heads), under a
    # j-* subscript (the conjunction / complementizer classes),
    # under d / p / c (determiner, pronoun/preposition and
    # conjunction classes) — plus the English modal auxiliaries,
    # which the
    # dictionary files as ordinary verbs (can/could, will/would,
    # shall/should, may/might, must, and the be/do/have
    # auxiliaries), enumerated here as the closed class they
    # are. Supplementing a base admits only that base's forms;
    # subscripted content entries for the same base were already
    # admitted or not on the WordNet gate's own terms.
    MODALS = {
        "am", "is", "are", "was", "were", "be", "been", "being",
        "can", "could", "may", "might", "must", "shall", "should",
        "will", "would", "do", "does", "did", "have", "has", "had",
    }
    closed_bases = set(MODALS)
    for heads, _expr, _line in word_entries:
        for kind, val, _ln in heads:
            if kind != "word":
                continue
            base, sub = split_form(val)
            if sub is None or sub.startswith("j") or sub in ("d", "p", "c", "e"):
                closed_bases.add(base.lower())
    vocab |= closed_bases
    closed_rows = len(closed_bases)

    # ---- Expression trees (the coverage slice's output kind) ----
    # Per shipped entry, the macro-expanded expression tree: macros
    # and word references inlined (memoised, cycle-checked), so the
    # tree contains only connectors, &/or structure, optionals,
    # costs and @ multi-connector marks — the input the coverage
    # slice's lazy disjunct generator (src/ansci/linkage.ts) reads.
    # Trees are measured, not truncated: a tree over TREE_CAP nodes
    # is recorded in the manifest (treesOversized) and ships as
    # null, so the cut is on the record, never silent.
    TREE_CAP = 100_000
    tree_stats = defaultdict(int)
    _macro_tree_cache = {}
    _wordref_tree_cache = {}
    _tree_visiting = set()

    def tree_of(node):
        t = node[0]
        if t == "conn":
            return ["c", node[1]]
        if t == "empty":
            return ["e"]
        if t == "or":
            return ["|", [tree_of(p) for p in node[1]]]
        if t == "and":
            return ["&", [tree_of(p) for p in node[1]]]
        if t == "opt":
            return ["?", tree_of(node[1])]
        if t == "cost":
            return ["$", node[2], tree_of(node[1])]
        if t == "macro":
            name = node[1]
            if name in _macro_tree_cache:
                return _macro_tree_cache[name]
            if ("m", name) in _tree_visiting:
                raise ValueError(f"macro cycle at {name}")
            _tree_visiting.add(("m", name))
            tree = tree_of(macros[name])
            _tree_visiting.discard(("m", name))
            _macro_tree_cache[name] = tree
            return tree
        if t == "wordref":
            name = node[1]
            if name in _wordref_tree_cache:
                return _wordref_tree_cache[name]
            if ("w", name) in _tree_visiting:
                raise ValueError(f"word-reference cycle at {name}")
            exprs = form_exprs.get(name)
            if not exprs:
                _wordref_tree_cache[name] = ["e"]
                return ["e"]
            _tree_visiting.add(("w", name))
            parts = [tree_of(e) for e in exprs]
            _tree_visiting.discard(("w", name))
            tree = parts[0] if len(parts) == 1 else ["|", parts]
            _wordref_tree_cache[name] = tree
            return tree
        raise ValueError(t)

    def tree_size(tree):
        n = 1
        if isinstance(tree, list):
            for part in tree[1:]:
                if isinstance(part, list):
                    if part and isinstance(part[0], list):
                        n += sum(tree_size(p) for p in part)
                    else:
                        n += tree_size(part)
        return n

    # Expand every word entry once; summarise; collect its forms.
    entry_records = []          # shipped entry summaries, index = id
    entry_trees = []            # shipped entries' expression trees (or None)
    form_records = defaultdict(list)  # form key -> [(entry id, subscript)]
    forms_seen = set()
    for heads, expr, line in word_entries:
        # The entry's forms: inline word heads + words-file includes.
        raw_forms = []
        for kind, val, _ln in heads:
            if kind == "word":
                raw_forms.append(val)
            elif kind == "file":
                forms = words_file_forms(val)
                if forms is None:
                    stats["missingWordsFiles"] += 1
                else:
                    raw_forms.extend(forms)
        stats["entryHeads"] += len(raw_forms)
        kept = []
        for token in raw_forms:
            base, sub = split_form(token)
            key = base.lower()
            forms_seen.add(key)
            if "_" in base or " " in base or not base:
                stats["droppedIdiomForms"] += 1
                continue
            if key not in vocab:
                stats["droppedOutsideVocab"] += 1
                continue
            kept.append((key, sub))
        if not kept:
            continue
        macros_used = set()
        try:
            disjuncts = expand(expr, macros_used)
        except OverflowError:
            stats["entriesOverCap"] += 1
            continue
        live = [(c, cost, cap) for c, cost, cap in disjuncts if cost <= MAX_DISJUNCT_COST]
        stats["disjunctsExpanded"] += len(disjuncts)
        stats["disjunctsDroppedByCost"] += len(disjuncts) - len(live)
        if not live:
            stats["formsDroppedByCost"] += len(kept)
            continue
        max_o = max(cap for _c, _cost, cap in live)
        min_cost = min(cost for _c, cost, _cap in live)
        rec = {
            "line": line,
            "macros": sorted(macros_used),
            "disjuncts": len(live),
            "maxO": max_o,
            "minCost": round(min_cost, 4),
        }
        eid = len(entry_records)
        entry_records.append(rec)
        tree = tree_of(expr)
        size = tree_size(tree)
        tree_stats["treeNodesTotal"] += size
        tree_stats["treeNodesMax"] = max(tree_stats["treeNodesMax"], size)
        if size > TREE_CAP:
            tree_stats["treesOversized"] += 1
            entry_trees.append(None)
        else:
            tree_stats["treesShipped"] += 1
            entry_trees.append(tree)
        for key, sub in kept:
            form_records[key].append((eid, sub))

    # Serialise: entry records ride in part-001; forms chunked by size.
    os.makedirs(OUT, exist_ok=True)
    parts = []
    items = sorted(form_records.items())
    chunk, chunk_bytes = {}, 0
    part_no = 0

    def flush(chunk, part_no, with_entries):
        fname = f"part-{part_no:03d}.json"
        data = {"forms": chunk}
        if with_entries:
            data["entries"] = entry_records
        blob = json.dumps(data, separators=(",", ":"), sort_keys=True)
        with open(os.path.join(OUT, fname), "w") as fh:
            fh.write(blob)
        parts.append({
            "file": fname,
            "kind": "forms",
            "count": len(chunk),
            "bytes": len(blob),
        })

    for key, refs in items:
        rec = [[eid, sub] for eid, sub in refs]
        size = len(json.dumps({key: rec}))
        if chunk and chunk_bytes + size > 900_000:
            part_no += 1
            flush(chunk, part_no, with_entries=(part_no == 1))
            chunk, chunk_bytes = {}, 0
        chunk[key] = rec
        chunk_bytes += size
    if chunk or not parts:
        part_no += 1
        flush(chunk, part_no, with_entries=(part_no == 1))

    # The expression trees ride in their own part, aligned by index
    # with the shipped entry records.
    trees_blob = json.dumps({"trees": entry_trees}, separators=(",", ":"), sort_keys=True)
    with open(os.path.join(OUT, "trees-001.json"), "w") as fh:
        fh.write(trees_blob)
    parts.append({
        "file": "trees-001.json",
        "kind": "trees",
        "count": len(entry_trees),
        "bytes": len(trees_blob),
    })

    manifest = {
        "v": 1,
        "source": f"Link Grammar {LG_VERSION} (OpenCog), English dictionary {DICT_VERSION}, "
                  f"from {UPSTREAM} at master {UPSTREAM_COMMIT}",
        "edition": DICT_VERSION,
        "license": LICENSE,
        "obtained": "A local checkout of the upstream repository (data/en/4.0.dict and "
                    "data/en/words/), passed to scripts/import-linkgrammar.py as its "
                    "source-dir argument; the raw checkout is not vendored in this repo.",
        "counts": {
            "dictEntries": len(entries),
            "macros": len(macros),
            "wordEntries": len(word_entries),
            "entryHeads": stats["entryHeads"],
            "formsSeen": len(forms_seen),
            "formsShipped": len(form_records),
            "shippedEntries": len(entry_records),
            "disjunctsExpanded": stats["disjunctsExpanded"],
            "disjunctsLive": stats["disjunctsExpanded"] - stats["disjunctsDroppedByCost"],
            "disjunctsDroppedByCost": stats["disjunctsDroppedByCost"],
            "droppedOutsideVocab": stats["droppedOutsideVocab"],
            "droppedIdiomForms": stats["droppedIdiomForms"],
            "formsDroppedByCost": stats["formsDroppedByCost"],
            "entriesOverCap": stats["entriesOverCap"],
            "missingWordsFiles": stats["missingWordsFiles"],
            "unknownWordRefs": stats["unknownWordRefs"],
            "vocabWordnetLemmaRows": wn_lemma_rows,
            "vocabWordnetSurfaceRows": wn_surface_rows,
            "vocabSupplementBases": closed_rows,
            "treesShipped": tree_stats["treesShipped"],
            "treeNodesTotal": tree_stats["treeNodesTotal"],
            "treeNodesMax": tree_stats["treeNodesMax"],
            "treesOversized": tree_stats["treesOversized"],
        },
        "notConverted": [
            "The Link Grammar solver — ported only as the bounded subset in "
            "src/ansci/linkage.ts (the coverage slice): lazy disjunct generation from "
            "the shipped expression trees plus a bounded counting search. Upstream's "
            "full pruning stage, post-processing and panic modes are not ported; the "
            "trees of entries over the recorded node cap ship as null (treesOversized).",
            "4.0.knowledge (post-processing rules) and 4.0.constituent-knowledge — "
            "solver data, not dictionary data.",
            "4.0.affix and 4.0.regex (morphology splitting and the CAPITALIZED-WORDS / "
            "UNKNOWN-WORD regex classes) — the parser's own token layer owns splitting; "
            "regex-class entries in the dict that name no concrete word form ship nothing.",
            "Idiom / multiword heads (heads joining words with '_') — dropped with "
            "their count in droppedIdiomForms; the parser's lemmas are single words.",
            "Disjuncts whose default-dialect cost exceeds the dictionary's "
            "max-disjunct-cost (10) — dead in the default dialect (the headline "
            "component), dropped with their count in disjunctsDroppedByCost.",
            "Full disjunct sets — reduced per entry to the live-disjunct count, the "
            "maximum O+ (bare-object) capacity, and the minimum disjunct cost; the "
            "expansion was performed in full (disjunctsExpanded) and the reduction "
            "is the shipped record, on the VerbNet frame-shape precedent. The "
            "coverage slice additionally ships each entry's macro-expanded "
            "expression tree (trees-001.json), from which disjuncts are generated "
            "lazily per sentence at runtime; enumerated disjunct sets still do "
            "not ship.",
        ],
        "parts": parts,
    }
    with open(os.path.join(OUT, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(
        f"linkgrammar: {len(macros)} macros, {len(word_entries)} word entries, "
        f"{len(form_records)} forms shipped in {len(entry_records)} entries, "
        f"{stats['disjunctsExpanded']} disjuncts expanded "
        f"({stats['disjunctsDroppedByCost']} dropped by cost), "
        f"{stats['droppedOutsideVocab']} heads dropped outside vocabulary, "
        f"{stats['droppedIdiomForms']} idiom heads dropped"
    )


if __name__ == "__main__":
    main()
