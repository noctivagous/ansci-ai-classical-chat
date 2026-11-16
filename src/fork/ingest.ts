/**
 * ingest.ts — the ingestion pipeline (Slice 3, 2026-11-16).
 *
 * Six stages, from the project's 2026-11-08 design: acquire →
 * segment → read → propose → review → apply. Correspondence
 * knowledge enters the graph from cited classical text, not by
 * hand. This module is the machinery; the first real run (Suwen
 * ch. 5) is driven by scripts/fork-ingest-suwen5.mjs and its
 * banked output lives in src/fork/ingested.ts.
 *
 * THE THREE HARD RULES, AND WHERE EACH IS ENFORCED:
 *
 * 1. NO CITATION, NO INSERTION. Every proposal carries a
 *    citation (text, chapter, exact quoted passage). review()
 *    refuses a proposal whose citation is incomplete or whose
 *    quote does not occur in the acquired chapter text; apply()
 *    re-checks citation completeness itself, so even a forged
 *    "pass" review outcome cannot insert a citation-less
 *    proposal. Both refusals are pinned by tests.
 *
 * 2. VARIANT SCHEMES COEXIST. Assertions are source-scoped
 *    (text + chapter + scheme). A proposal that disagrees with
 *    an existing record from a DIFFERENT chapter is banked
 *    alongside it, marked "variant" — never merged, averaged,
 *    or overwritten. A disagreement within the SAME chapter and
 *    scheme is a different animal: one scheme contradicting
 *    itself is refused at review and sent to the queue, because
 *    banking both under one scheme label would falsify the
 *    scope. (A genuine intra-chapter textual variant would be
 *    banked under two scheme labels naming the readings — a
 *    deliberate act, not a pipeline default.)
 *
 * 3. THE APPLY TARGET IS ITS OWN STORE. apply() writes only to
 *    an IngestedAssertion[] (persisted in ingested.ts). Nothing
 *    here touches classify.ts, and neither lookupClassification
 *    nor the parser reads the ingested store in this slice:
 *    ingestion banks source-scoped assertions for later governed
 *    promotion, exactly as the H7 derived store (flavor-bridge.ts)
 *    was banked without consumers.
 *
 * REVIEW HONESTY. review() is deterministic and mechanical: it
 * verifies form (citation, scheme fields) and verbatim presence
 * of the quote, and it scans for duplicates and variants. It
 * does not judge whether the reader's gloss is right. Records
 * that pass are marked machine-reviewed, and each banked record
 * additionally carries a per-assertion review note (the basis:
 * the quoted passage, checked against the chapter) written at
 * propose time and carried through apply().
 */
import type { Element } from "./sentence";
import type { ClassificationEntry } from "./classify";

/* ---------------- Stage 1: acquire ---------------- */

export interface SourceText {
  /** The work, e.g. "黃帝內經 · 素問 (Huángdì Nèijīng, Sùwèn)". */
  text: string;
  /** The chapter, e.g. "陰陽應象大論第五 (… ch. 5)". */
  chapter: string;
  /** Edition statement for the acquired copy. */
  edition: string;
  sourceUrl: string;
  /** ISO date of acquisition. */
  retrieved: string;
  /** sha256 of the acquired chapter body (UTF-8). */
  sha256: string;
}

export interface AcquiredChapter {
  source: SourceText;
  /** The chapter body as plain text, paragraphs separated by \n. */
  body: string;
}

export interface AcquisitionInput {
  /** Raw HTML of the source page carrying the chapter. */
  pageHtml: string;
  /** Heading string that opens the chapter in the page text. */
  chapterHeading: string;
  /** Heading string of the following chapter (exclusive end). */
  nextChapterHeading: string;
  source: SourceText;
}

/** Strip HTML to plain text: block boundaries become newlines. */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h\d|li|div|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\[编辑\]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \n]+/g, "\n")
    .trim();
}

/**
 * Acquire: extract one chapter's body from a fetched source page
 * and record it with its source edition. Throws when either
 * heading is absent — an acquisition that cannot find its
 * chapter has failed, and the pipeline stops rather than
 * ingesting the wrong text.
 */
export function acquireChapter(input: AcquisitionInput): AcquiredChapter {
  const text = htmlToText(input.pageHtml);
  // A source page may name the chapter more than once (navigation
  // furniture lists chapter titles contiguously). The chapter
  // itself is the longest span from a chapter heading to the
  // next chapter's heading; furniture spans are a few characters.
  let best = "";
  let from = 0;
  for (;;) {
    const start = text.indexOf(input.chapterHeading, from);
    if (start < 0) break;
    const bodyStart = start + input.chapterHeading.length;
    const end = text.indexOf(input.nextChapterHeading, bodyStart);
    if (end >= 0) {
      const span = text.slice(bodyStart, end).trim();
      if (span.length > best.length) best = span;
    }
    from = bodyStart;
  }
  if (best.length < 100) {
    throw new Error(
      `acquire: no plausible chapter body between "${input.chapterHeading}" and ` +
      `"${input.nextChapterHeading}" (longest span ${best.length} chars)`,
    );
  }
  return { source: input.source, body: best };
}

/* ---------------- Stage 2: segment ---------------- */

export interface Passage {
  id: string;
  index: number;
  text: string;
}

/** Segment: split the chapter body into citable passages
 *  (paragraphs). Every passage keeps its verbatim text; quotes
 *  in citations are substrings of passages. */
export function segmentChapter(chapter: AcquiredChapter): Passage[] {
  return chapter.body
    .split(/\n+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((text, i) => ({ id: `p${i + 1}`, index: i, text }));
}

/* ---------------- Stages 3+4: read + propose ---------------- */

export interface Citation {
  text: string;
  chapter: string;
  /** The exact quoted passage the assertion rests on. */
  quote: string;
}

export type ValueKind = "element" | "yin-yang" | "term";

export interface Proposal {
  /** English gloss slug of the item classified, e.g. "eyes". */
  concept: string;
  /** The item as written in the source, e.g. "目". */
  hanzi: string;
  /** The correspondence row / aspect, e.g. "orifice". */
  aspect: string;
  /** The value the source's scheme assigns: an element name for
   *  valueKind "element", "Yin"/"Yang" for "yin-yang", or a term
   *  gloss for "term". */
  value: string;
  valueKind: ValueKind;
  /** Present iff valueKind === "element". */
  element?: Element;
  /** The scheme the assertion belongs to, e.g.
   *  "five-direction correspondence table". */
  scheme: string;
  /** The system within the scheme, e.g. "east". */
  system?: string;
  citation: Citation;
  /** How the read stage derived this from the passage, and the
   *  basis on which it is offered for banking. Carried into the
   *  banked record's review note. */
  readerNote: string;
}

export interface NotProposed {
  passageId: string;
  text: string;
  reason: string;
}

export interface ReadResult {
  proposals: Proposal[];
  notProposed: NotProposed[];
}

/* The Suwen ch. 5 reader. The chapter's five directional blocks
 * are strictly parallel: a generation chain (東方生風，風生木，…)
 * followed by a correspondence table sentence of 在X為Y clauses
 * (神在天為風，在地為木，在體為筋，在藏為肝，在色為蒼，在音為角，
 * 在聲為呼，在變動為握，在竅為目，在味為酸，在志為怒). The reader
 * parses those clauses mechanically; the only hand-supplied
 * knowledge is the scheme's own vocabulary (row labels, glosses,
 * phase names) — the same vocabulary any reader of the chapter
 * brings. Two further statement families are read by pattern:
 * the yin-yang assignment (水為陰，火為陽) and the 通於
 * qi-correspondences (天氣通於肺，…). */

const ROW_ASPECT: Record<string, string> = {
  "天": "climate",
  "地": "direction",
  "體": "tissue",
  "藏": "organ",
  "色": "color",
  "音": "sound",
  "聲": "voice",
  "變動": "change",
  "竅": "orifice",
  "味": "flavor",
  "志": "emotion",
};
const ROW_LABELS = Object.keys(ROW_ASPECT).sort((a, b) => b.length - a.length);

const PHASE_OF: Record<string, Element> = {
  "木": "Wood", "火": "Fire", "土": "Earth", "金": "Metal", "水": "Water",
};

const DIRECTION_OF: Record<string, string> = {
  "東方": "east", "南方": "south", "中央": "centre", "西方": "west", "北方": "north",
};

/** Glosses for the chapter's table vocabulary. 憂 is glossed by
 *  row, deliberately: in the south's 在變動 row it is the older
 *  sense (halting, trembling speech); in the west's 在志 row it
 *  is sorrow. The WP1 survey records both as written and warns
 *  against merging them; the reader keeps them apart. */
const GLOSS: Record<string, string> = {
  "風": "wind", "熱": "heat", "濕": "damp", "燥": "dryness", "寒": "cold",
  "筋": "sinews", "脈": "vessels", "肉": "flesh", "皮毛": "skin-and-hair", "骨": "bones",
  "肝": "liver", "心": "heart", "脾": "spleen", "肺": "lungs", "腎": "kidneys",
  "蒼": "azure", "赤": "red", "黃": "yellow", "白": "white", "黑": "black",
  "角": "jue", "徵": "zhi", "宮": "gong", "商": "shang", "羽": "yu",
  "呼": "shouting", "笑": "laughing", "歌": "singing", "哭": "weeping", "呻": "groaning",
  "握": "grasping", "噦": "retching", "欬": "coughing", "慄": "shivering",
  "目": "eyes", "舌": "tongue", "口": "mouth", "鼻": "nose", "耳": "ears",
  "酸": "sour", "苦": "bitter", "甘": "sweet", "辛": "pungent", "鹹": "salty",
  "怒": "anger", "喜": "joy", "思": "pensiveness", "恐": "fear",
};
const GLOSS_BY_ROW: Record<string, Record<string, string>> = {
  change: { "憂": "trembling-speech" },
  emotion: { "憂": "sorrow" },
};

const QI_GLOSS: Record<string, string> = {
  "天氣": "heaven-qi", "地氣": "earth-qi", "風氣": "wind-qi",
  "雷氣": "thunder-qi", "谷氣": "grain-qi", "雨氣": "rain-qi",
};
const ORGAN_GLOSS: Record<string, string> = {
  "肺": "lungs", "嗌": "throat", "肝": "liver", "心": "heart", "脾": "spleen", "腎": "kidneys",
};

function sentencesOf(passage: string): string[] {
  return passage.split("。").map((s) => s.trim()).filter((s) => s.length > 0);
}

function readDirectionalBlock(passage: Passage, source: SourceText): ReadResult {
  const proposals: Proposal[] = [];
  const notProposed: NotProposed[] = [];
  const m = passage.text.match(/(東方|南方|中央|西方|北方)生/);
  if (!m) return { proposals, notProposed };
  const system = DIRECTION_OF[m[1]];
  const sentences = sentencesOf(passage.text);

  // Parse the 在X為Y clauses of a sentence. The east block's
  // preamble (其在天為玄，在人為道，在地為化) also carries two
  // such clauses, so the table sentence is identified as the
  // sentence with the most row clauses — the full parallel
  // table — not the first sentence containing 在天為.
  const parseClauses = (sentence: string): { row: string; valueHanzi: string }[] => {
    const out: { row: string; valueHanzi: string }[] = [];
    for (const raw of sentence.split(/[，；]/)) {
      const clause = raw.replace(/^[其神]/, "");
      for (const label of ROW_LABELS) {
        if (clause.startsWith(`在${label}為`)) {
          out.push({ row: label, valueHanzi: clause.slice(`在${label}為`.length) });
          break;
        }
      }
    }
    return out;
  };
  let tableSentence: string | undefined;
  let clauses: { row: string; valueHanzi: string }[] = [];
  for (const s of sentences) {
    const parsed = parseClauses(s);
    if (parsed.length > clauses.length) {
      tableSentence = s;
      clauses = parsed;
    }
  }
  const phaseClause = clauses.find((c) => c.row === "地");
  if (!tableSentence || !phaseClause || !(phaseClause.valueHanzi in PHASE_OF)) return { proposals, notProposed };
  const element = PHASE_OF[phaseClause.valueHanzi];

  for (const c of clauses) {
    const aspect = ROW_ASPECT[c.row];
    let concept: string;
    let hanzi = c.valueHanzi;
    if (c.row === "地") {
      concept = system; // the direction itself, classified by its phase
      hanzi = m[1];
    } else {
      concept = GLOSS_BY_ROW[aspect]?.[c.valueHanzi] ?? GLOSS[c.valueHanzi] ?? "";
    }
    if (!concept) continue;
    proposals.push({
      concept,
      hanzi,
      aspect,
      value: element,
      valueKind: "element",
      element,
      scheme: "five-direction correspondence table",
      system,
      citation: { text: source.text, chapter: source.chapter, quote: tableSentence + "。" },
      readerNote:
        `The ${system} block's parallel table states 在${c.row}為${c.valueHanzi}; ` +
        `the block's phase is ${element} (在地為${phaseClause.valueHanzi}), so the chapter's ` +
        `scheme classifies ${concept} (${hanzi}) as ${element} under ${aspect}.`,
    });
  }

  // The block's remaining sentences are not (concept, aspect) →
  // value assertions: the generation chain (X生Y), the
  // harm/overcome lines (X傷Y, X勝Y), and the east block's
  // cosmological preamble (其在天為玄…). They are read,
  // recognised, and deliberately not proposed in this store's
  // shape. The 勝 lines matter: 悲勝怒 must not be read as
  // assigning 悲 a phase — this chapter's 在志 row leaves 悲
  // unassigned (it appears only in the collective line, below).
  for (const s of sentences) {
    if (s === tableSentence) continue;
    notProposed.push({
      passageId: passage.id,
      text: s + "。",
      reason:
        "Statement of another shape (generation chain, 傷/勝 harm-and-overcome line, or " +
        "cosmological preamble), not a (concept, aspect) → value correspondence; " +
        "outside this store's assertion shape.",
    });
  }
  return { proposals, notProposed };
}

function readYinYang(passage: Passage, source: SourceText): Proposal[] {
  const proposals: Proposal[] = [];
  if (!passage.text.includes("水為陰，火為陽")) return proposals;
  const quote = "水為陰，火為陽";
  for (const [hanzi, concept, value] of [["水", "water", "Yin"], ["火", "fire", "Yang"]] as const) {
    proposals.push({
      concept,
      hanzi,
      aspect: "yin-yang",
      value,
      valueKind: "yin-yang",
      scheme: "yin-yang assignment",
      citation: { text: source.text, chapter: source.chapter, quote },
      readerNote: `The chapter states ${quote} — ${concept} (${hanzi}) is assigned ${value} in so many words.`,
    });
  }
  return proposals;
}

function readTongYu(passage: Passage, source: SourceText): Proposal[] {
  const proposals: Proposal[] = [];
  const sentence = sentencesOf(passage.text).find((s) => s.includes("通於"));
  if (!sentence) return proposals;
  const re = /(天氣|地氣|風氣|雷氣|谷氣|雨氣)通於(肺|嗌|肝|心|脾|腎)/g;
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(sentence)) !== null) {
    proposals.push({
      concept: QI_GLOSS[mm[1]],
      hanzi: mm[1],
      aspect: "corresponds-organ",
      value: ORGAN_GLOSS[mm[2]],
      valueKind: "term",
      scheme: "qi correspondence (通於)",
      citation: { text: source.text, chapter: source.chapter, quote: sentence + "。" },
      readerNote:
        `The chapter states ${mm[1]}通於${mm[2]} — ${QI_GLOSS[mm[1]]} corresponds to the ` +
        `${ORGAN_GLOSS[mm[2]]}. A term-valued correspondence, not a phase assignment.`,
    });
  }
  return proposals;
}

/**
 * Read + propose: extract candidate assertions from the
 * segmented chapter. The reader is mechanical over the
 * chapter's parallel structures; statements it recognises but
 * cannot honestly cast as (concept, aspect) → value assertions
 * are returned as notProposed, for the report's review queue.
 */
export function readPassages(passages: Passage[], source: SourceText): ReadResult {
  const proposals: Proposal[] = [];
  const notProposed: NotProposed[] = [];
  for (const p of passages) {
    const block = readDirectionalBlock(p, source);
    proposals.push(...block.proposals);
    notProposed.push(...block.notProposed);
    proposals.push(...readYinYang(p, source));
    proposals.push(...readTongYu(p, source));
    if (p.text.includes("人有五藏") && p.text.includes("以生喜怒悲憂恐")) {
      notProposed.push({
        passageId: p.id,
        text: "人有五藏，化五氣，以生喜怒悲憂恐。",
        reason:
          "Collective statement: the five emotions are named as a set (喜怒悲憂恐) with no " +
          "per-direction assignment. This is also the only line in the chapter where 悲 " +
          "appears; proposing a phase for it would import a later scheme. Queued, not banked.",
      });
    }
  }
  return { proposals, notProposed };
}

/* ---------------- Stage 5: review ---------------- */

export type Relation = "new" | "corroborates" | "variant" | "duplicate" | "conflict";

export interface ReviewCheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

export interface ReviewOutcome {
  verdict: "pass" | "refuse";
  checks: ReviewCheckResult[];
  relation: Relation;
  relationDetail: string;
  reviewer: string;
}

export const REVIEWER_ID = "ingest.review (deterministic)";

/** Aspect families in classify.ts comparable to an ingested
 *  aspect, for the corroboration/variant scan. An ingested
 *  "orifice" assertion speaks to the curated table's "body"
 *  entries (the liver opens into the eyes, etc.). */
const ASPECT_KIN: Record<string, string[]> = {
  direction: ["direction"],
  color: ["color"],
  flavor: ["taste"],
  organ: ["organ"],
  emotion: ["emotion"],
  tissue: ["body"],
  orifice: ["body"],
  climate: ["weather", "temperature", "trigram"],
  change: ["state"],
  sound: [],
  voice: [],
};

function citationComplete(c: Citation): boolean {
  return Boolean(c.text?.trim() && c.chapter?.trim() && c.quote?.trim());
}

function quoteInBody(quote: string, body: string): boolean {
  const squash = (s: string) => s.replace(/\s+/g, "");
  return squash(body).includes(squash(quote));
}

/**
 * Review: deterministic checks over a proposal, the acquired
 * chapter body, and the existing stores (the ingested store so
 * far + the curated classification table). Form and verbatim
 * presence are verified mechanically; the reader's gloss is not
 * judged here — that limit is stated on every outcome.
 */
export function reviewProposal(
  proposal: Proposal,
  chapterBody: string,
  existing: { store: IngestedAssertion[]; classifications: ClassificationEntry[] },
): ReviewOutcome {
  const checks: ReviewCheckResult[] = [];

  const citOk = citationComplete(proposal.citation);
  checks.push({
    name: "citation-complete",
    ok: citOk,
    detail: citOk
      ? `citation names text (${proposal.citation.text}), chapter (${proposal.citation.chapter}) and a quoted passage`
      : "citation is incomplete — no citation, no insertion",
  });

  const quoteOk = citOk && quoteInBody(proposal.citation.quote, chapterBody);
  checks.push({
    name: "quote-verified",
    ok: quoteOk,
    detail: quoteOk
      ? "the quoted passage occurs verbatim in the acquired chapter text (whitespace-insensitive)"
      : "the quoted passage does not occur in the acquired chapter text",
  });

  const schemeOk =
    Boolean(proposal.scheme?.trim() && proposal.aspect?.trim() && proposal.concept?.trim() && proposal.hanzi?.trim()) &&
    (proposal.valueKind !== "element" || (proposal.element !== undefined && proposal.value === proposal.element));
  checks.push({
    name: "scheme-complete",
    ok: schemeOk,
    detail: schemeOk
      ? `scheme "${proposal.scheme}" with concept, hanzi, aspect and a well-formed value`
      : "scheme fields incomplete or value/element mismatch",
  });

  // Duplicate + conflict scan against the ingested store.
  let relation: Relation = "new";
  let relationDetail = "no existing record for this (concept, aspect) in the ingested store or the curated table";
  const sameSlotStore = existing.store.filter(
    (a) => a.concept === proposal.concept && a.aspect === proposal.aspect,
  );
  const sameScope = sameSlotStore.find(
    (a) => a.citation.text === proposal.citation.text && a.citation.chapter === proposal.citation.chapter && a.scheme === proposal.scheme,
  );
  if (sameScope) {
    if (sameScope.value === proposal.value) {
      relation = "duplicate";
      relationDetail = `already banked as ${sameScope.id} from the same text, chapter and scheme with the same value`;
    } else {
      relation = "conflict";
      relationDetail =
        `the same text, chapter and scheme already bank ${sameScope.id} with value ${sameScope.value} ` +
        `for this (concept, aspect); one scheme contradicting itself is refused, not banked twice`;
    }
  } else {
    const variantInStore = sameSlotStore.find((a) => a.value !== proposal.value);
    if (variantInStore) {
      relation = "variant";
      relationDetail =
        `differs from ${variantInStore.id} (${variantInStore.citation.chapter}: ${variantInStore.value}) — ` +
        `variant schemes coexist; both stand, source-scoped`;
    } else if (proposal.valueKind === "element" && proposal.element) {
      const sameConcept = existing.classifications.filter((e) => e.concept === proposal.concept);
      const kin = ASPECT_KIN[proposal.aspect] ?? [proposal.aspect];
      const kinEntries = sameConcept.filter((e) => kin.includes(e.aspect) || kin.includes(e.aspectKey));
      const differing = kinEntries.filter((e) => e.element !== proposal.element);
      if (differing.length > 0) {
        relation = "variant";
        relationDetail =
          `differs from the curated table (${differing.map((e) => `${e.concept}/${e.aspect} → ${e.element}`).join("; ")}) — ` +
          `the ingested record stands source-scoped alongside it`;
      } else if (sameConcept.some((e) => e.element === proposal.element)) {
        const hit = sameConcept.find((e) => e.element === proposal.element)!;
        relationDetail =
          `no ingested record yet for this (concept, aspect); corroborates the curated table ` +
          `(${hit.concept}/${hit.aspect} → ${hit.element}, ${hit.provenance})`;
        relation = "corroborates";
      }
    }
  }
  checks.push({
    name: "duplicate-variant-scan",
    ok: relation !== "duplicate" && relation !== "conflict",
    detail: relationDetail,
  });

  const verdict = checks.every((c) => c.ok) ? "pass" : "refuse";
  return { verdict, checks, relation, relationDetail, reviewer: REVIEWER_ID };
}

/* ---------------- Stage 6: apply ---------------- */

export interface IngestedAssertion {
  id: string;
  concept: string;
  hanzi: string;
  aspect: string;
  value: string;
  valueKind: ValueKind;
  element?: Element;
  scheme: string;
  system?: string;
  citation: Citation & { edition: string; sourceUrl: string };
  provenance: "ingested";
  review: {
    reviewer: string;
    /** Per-assertion review note: the basis — the quoted
     *  passage, checked against the chapter. */
    basis: string;
    checks: string[];
    relation: Relation;
    relationDetail: string;
    date: string;
  };
  status: "banked";
}

/**
 * Apply: write a reviewed proposal into the ingested store.
 * Refuses — by throwing — when the review verdict is not
 * "pass", and independently re-checks citation completeness:
 * hard rule 1 is enforced here, at the point of insertion, not
 * only upstream. Duplicate and conflict outcomes carry verdict
 * "refuse", so re-applying a banked proposal is refused too:
 * the store is append-only and idempotent under re-runs.
 */
export function applyProposal(
  store: IngestedAssertion[],
  proposal: Proposal,
  outcome: ReviewOutcome,
  source: SourceText,
  date: string,
  idPrefix: string,
): IngestedAssertion {
  if (!citationComplete(proposal.citation)) {
    throw new Error("apply refused: citation incomplete — no citation, no insertion");
  }
  if (outcome.verdict !== "pass") {
    const failed = outcome.checks.filter((c) => !c.ok).map((c) => c.name).join(", ");
    throw new Error(`apply refused: review verdict is "refuse" (failed: ${failed}; relation: ${outcome.relation})`);
  }
  const record: IngestedAssertion = {
    id: `${idPrefix}-${String(store.length + 1).padStart(3, "0")}`,
    concept: proposal.concept,
    hanzi: proposal.hanzi,
    aspect: proposal.aspect,
    value: proposal.value,
    valueKind: proposal.valueKind,
    ...(proposal.element ? { element: proposal.element } : {}),
    scheme: proposal.scheme,
    ...(proposal.system ? { system: proposal.system } : {}),
    citation: {
      ...proposal.citation,
      edition: source.edition,
      sourceUrl: source.sourceUrl,
    },
    provenance: "ingested",
    review: {
      reviewer: outcome.reviewer,
      basis:
        `Machine review (${outcome.reviewer}): citation complete; quote verified verbatim against the ` +
        `acquired text of ${source.chapter}; scheme fields complete; duplicate/variant scan: ${outcome.relation} — ` +
        `${outcome.relationDetail}. Reader basis: ${proposal.readerNote}`,
      checks: outcome.checks.map((c) => c.name),
      relation: outcome.relation,
      relationDetail: outcome.relationDetail,
      date,
    },
    status: "banked",
  };
  store.push(record);
  return record;
}

/* ---------------- The pipeline, end to end ---------------- */

export interface PipelineRun {
  chapter: AcquiredChapter;
  passages: Passage[];
  proposals: Proposal[];
  notProposed: NotProposed[];
  outcomes: { proposal: Proposal; outcome: ReviewOutcome }[];
  applied: IngestedAssertion[];
  refused: { proposal: Proposal; outcome: ReviewOutcome }[];
}

/**
 * Run acquire's output through segment → read → propose →
 * review → apply against an existing store (which apply()
 * extends in place) and the curated table (read-only scan
 * basis). Re-running the same chapter against the resulting
 * store applies nothing twice: every proposal comes back
 * "duplicate" and is refused.
 */
export function runPipeline(
  chapter: AcquiredChapter,
  existingStore: IngestedAssertion[],
  classifications: ClassificationEntry[],
  opts: { date: string; idPrefix: string },
): PipelineRun {
  const passages = segmentChapter(chapter);
  const { proposals, notProposed } = readPassages(passages, chapter.source);
  const outcomes: PipelineRun["outcomes"] = [];
  const applied: IngestedAssertion[] = [];
  const refused: PipelineRun["refused"] = [];
  for (const proposal of proposals) {
    const outcome = reviewProposal(proposal, chapter.body, { store: existingStore, classifications });
    outcomes.push({ proposal, outcome });
    if (outcome.verdict === "pass") {
      applied.push(applyProposal(existingStore, proposal, outcome, chapter.source, opts.date, opts.idPrefix));
    } else {
      refused.push({ proposal, outcome });
    }
  }
  return { chapter, passages, proposals, notProposed, outcomes, applied, refused };
}
