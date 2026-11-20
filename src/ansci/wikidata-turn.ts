/**
 * wikidata-turn.ts — slice W2's turn-layer integration: lookup
 * trigger, banking, and answering from the bank.
 *
 * THE SEAM. processTurn (turn.ts) is synchronous, and every
 * caller in the repo (the chat REPL, the dashboard, the
 * transcript runners) depends on that. A live Wikidata lookup
 * is asynchronous, so the lookup does not live inside
 * processTurn: this module is the ASYNC WRAPPER around it —
 * processTurnWithWikidata runs the ordinary turn first, then
 * acts on where the turn ended:
 *
 *  1. BANK FIRST. If the turn is one of the first-consumer
 *     question shapes (below) and the bank already holds the
 *     answer, the reply is re-answered from the bank with NO
 *     fetch — whatever decline the synchronous turn reached
 *     is replaced, and the trace's wikidata record says
 *     "answered-from-bank" with the retrieved provenance.
 *
 *  2. LOOKUP TRIGGER. Else, if the turn ended in the located
 *     KNOWLEDGE decline for a nameable subject the system
 *     holds nothing on — the "I have nothing on X in what I
 *     know" path (the IMP-2 fallthrough at turn.ts, the
 *     tell/posed-matter decline, or answerPredicateQuestion's
 *     "nothing on X in my notes") — the name is resolved via
 *     wbsearchentities. Resolution means: the first search
 *     hit whose label exactly matches the name (rank is the
 *     search's relevance judgement among exact-label bearers),
 *     AND that item's W1 join proposal unconflicted (status
 *     "proposed", conflict false) — exactly one item, or none. On resolution the item and its
 *     referenced items are fetched, translated, BANKED
 *     (wikidata-bank.ts, mirrored into the session graph),
 *     and the question is re-answered from the bank as this
 *     turn's reply, with the lookup and its provenance
 *     (dataset "wikidata", the QID) in the trace.
 *     The capital shape's first asking reaches a different
 *     located gap — answerPredicateQuestion's unanchored-
 *     definite exit ("What capital?") — because "the capital"
 *     presupposes a referent; that exit is a trigger for the
 *     capital shape too, or the capital consumer could never
 *     bank on a first asking. This extension is recorded in
 *     the W2 report.
 *
 *  3. OFFLINE HONESTY. If resolution or fetch returns
 *     { status: "unavailable" }, the reply is a located
 *     decline of the lookup-unavailable kind — it says the
 *     system could not look the subject up; it does NOT say
 *     the system has nothing on it. Ambiguous resolution
 *     (no exact-label hit, several, or a conflicted join
 *     proposal) and no-hit searches leave the ordinary
 *     located knowledge decline standing, with the ambiguity
 *     noted in the trace's wikidata record.
 *
 * NO MASQUERADE (§3.5). A reply resting on banked Wikidata
 * facts is a plain statement of fact carrying its source —
 * "(From Wikidata, Q….)" — never derivation language: no
 * cycle path, no derivation path, no pricing is recorded for
 * it, and the trace's wikidata record carries the retrieved
 * provenance (dataset + QID) outright.
 *
 * FIRST CONSUMERS (the question shapes answered from the
 * bank): "where is X?", "what is the capital of X?", "what
 * country is X in?". Detection is by the turn's surface shape
 * (the three shapes, stated as patterns below) — these are
 * the shapes the slice commissions, not a general question
 * grammar.
 */
import { processTurn, type TurnResult } from "./turn";
import type { Session } from "./session";
import {
  parseWikidataEntities,
  parseWikidataSearch,
  proposeWikidataJoin,
  translateWikidataItems,
  type WikidataCandidateFinder,
  type WikidataItem,
} from "./wikidata";
import type { WikidataSource } from "./wikidata-client";
import { HttpWikidataSource } from "./wikidata-client";
import { mappingForProperty } from "./wikidata-mapping";
import { defaultWikidataBank, mirrorBankIntoGraph, type WikidataBank } from "./wikidata-bank";

export type WikidataQuestionShape = "where" | "capital" | "country";

export interface WikidataQuestion {
  shape: WikidataQuestionShape;
  /** The subject as the visitor named it (surface casing). */
  subject: string;
}

const cleanSubject = (raw: string): string => raw.trim().replace(/\?+$/, "").trim();

/** The first-consumer question shapes, as surface patterns. */
export function detectWikidataQuestion(text: string): WikidataQuestion | undefined {
  const t = text.trim();
  let m = t.match(/^where is (.+?)\??$/i);
  if (m) return { shape: "where", subject: cleanSubject(m[1]) };
  m = t.match(/^what(?:'s| is) the capital of (.+?)\??$/i);
  if (m) return { shape: "capital", subject: cleanSubject(m[1]) };
  m = t.match(/^what country is (.+?) in\??$/i);
  if (m) return { shape: "country", subject: cleanSubject(m[1]) };
  return undefined;
}

export interface WikidataTurnOptions {
  /** The lookup source (live HTTP by default; tests inject
   *  the fixture source). */
  source?: WikidataSource;
  /** The bank to read and write (the process-level default
   *  bank by default; tests inject a fresh one). */
  bank?: WikidataBank;
  /** Fetch date stamped into SourceRecords (default: today). */
  fetchDate?: string;
  /** Provenance label for the endpoint the batch came through
   *  (default "live"; fixture callers pass "fixture"). */
  retrievedFrom?: string;
  /** The join-proposal candidate finder (W1's injectable;
   *  default is the real WordNet/concept finder). */
  candidateFinder?: WikidataCandidateFinder;
}

/** Answer one first-consumer question from the bank alone —
 *  the plain statement of fact, with its source — or undefined
 *  when the bank holds nothing that answers it. */
export function answerFromBank(
  bank: WikidataBank,
  q: WikidataQuestion,
): { reply: string; qid: string; detail: string } | undefined {
  const node = bank.nodeByName(q.subject);
  if (!node) return undefined;
  const sourceNote = `(From Wikidata, ${node.qid}.)`;
  if (q.shape === "capital") {
    const cap = bank.capitalOf(q.subject);
    if (!cap) return undefined;
    return {
      reply: `${cap.from} is the capital of ${node.name}. ${sourceNote}`,
      qid: node.qid,
      detail: `the bank holds ${cap.from} —CAPITAL_OF→ ${node.name} (Wikidata ${cap.property}, retrieved, confidence ${cap.confidence})`,
    };
  }
  if (q.shape === "country") {
    const country = bank.countryOf(q.subject);
    if (!country) return undefined;
    return {
      reply: `${node.name} is in ${country.name}. ${sourceNote}`,
      qid: node.qid,
      detail: `the bank holds ${node.name} —LOCATED_IN→ ${country.name} (retrieved, confidence 0.9)`,
    };
  }
  // "where": the LOCATED_IN chain, at the level the banked
  // facts support, with the WordNet gloss level beside it
  // where the join supplied one at bank time.
  const chain = bank.locatedInChain(q.subject);
  if (!chain.length) return undefined;
  const gloss = bank.glossFor(node.qid);
  const glossSentence = gloss ? ` WordNet's gloss for it is "${gloss}".` : "";
  return {
    reply: `${node.name} is in ${chain.map((n) => n.name).join(", in ")}.${glossSentence} ${sourceNote}`,
    qid: node.qid,
    detail: `the bank holds the LOCATED_IN chain ${node.name} → ${chain.map((n) => n.name).join(" → ")} (retrieved, confidence 0.9)`,
  };
}

/** Did this turn end in the located knowledge decline — the
 *  "holds nothing on X" family — or, for the capital shape,
 *  in answerPredicateQuestion's unanchored-definite exit? */
function endedInKnowledgeDecline(result: TurnResult, q: WikidataQuestion): boolean {
  const decline = result.trace.declineReason ?? "";
  if (
    /holds nothing on|have nothing on|in my notes/.test(decline) ||
    /I have nothing on/i.test(result.reply)
  ) {
    return true;
  }
  if (q.shape === "capital" && result.trace.unanchoredDefinite) return true;
  return false;
}

type LookupOutcome =
  | { kind: "banked"; qid: string; detail: string }
  | { kind: "unavailable"; reason: string }
  | { kind: "ambiguous"; detail: string }
  | { kind: "no-resolution"; detail: string };

/** Resolve, fetch, translate and bank one subject. The fetch
 *  count this makes is the source's business (search + the
 *  item + its referenced items); banking is idempotent. */
async function lookupAndBank(
  session: Session,
  subject: string,
  opts: Required<Pick<WikidataTurnOptions, "fetchDate" | "retrievedFrom">> & {
    source: WikidataSource;
    bank: WikidataBank;
    candidateFinder?: WikidataCandidateFinder;
  },
): Promise<LookupOutcome> {
  const { source, bank } = opts;
  const search = await source.searchEntities(subject);
  if (search.status === "unavailable") return { kind: "unavailable", reason: search.reason };
  const hits = parseWikidataSearch(search.data);
  const exact = hits.filter((h) => (h.label ?? "").toLowerCase() === subject.toLowerCase());
  if (exact.length === 0) {
    return {
      kind: "no-resolution",
      detail: hits.length
        ? `wbsearchentities returned ${hits.length} hit(s) for "${subject}", none with that exact label (${hits.map((h) => `${h.qid} "${h.label ?? ""}"`).join(", ")}) — no exact resolution`
        : `wbsearchentities returned no hits for "${subject}"`,
    };
  }
  // The resolution candidate is the FIRST exact-label hit in
  // the search's own rank order: wbsearchentities returns
  // near matches by design (the W1 Oklahoma fixture's other
  // hits are a university and a musical), and a name can be
  // borne by several items (a state and a band both labelled
  // "Texas") — rank is the search's relevance judgement, and
  // the join-proposal gate below is what keeps the candidate
  // honest: a candidate whose join is conflicted resolves
  // nothing. The procedure thus yields exactly one item or
  // none, never a silent choice among equals.
  const qid = exact[0].qid;
  const first = await source.getEntities([qid]);
  if (first.status === "unavailable") return { kind: "unavailable", reason: first.reason };
  let items = parseWikidataEntities(first.data);
  const item = items.find((i) => i.qid === qid);
  if (!item) return { kind: "no-resolution", detail: `wbgetentities returned no item for ${qid}` };
  // The translator names association endpoints from the batch,
  // so the referenced items are fetched too — but ONLY the
  // references a MAPPED EDGE names (an unmapped statement's
  // value is skip-logged, never an endpoint, and fetching it
  // buys nothing), and in chunks of at most 50 ids: the Action
  // API refuses larger wbgetentities requests outright (its
  // error shape parses as zero items — the first live run's
  // lesson, 2026-11-19: Q1649's full claim set references
  // ~180 items, the references call silently returned none,
  // and endpoints banked under their raw QIDs).
  const refQids = [
    ...new Set(
      item.claims.flatMap((c) =>
        c.value.kind === "item" && mappingForProperty(c.property)?.association ? [c.value.qid] : [],
      ),
    ),
  ].filter((r) => r !== qid);
  for (let at = 0; at < refQids.length; at += 50) {
    const chunk = refQids.slice(at, at + 50);
    const refs = await source.getEntities(chunk);
    if (refs.status === "unavailable") return { kind: "unavailable", reason: refs.reason };
    const seen = new Set(items.map((i) => i.qid));
    items = [...items, ...parseWikidataEntities(refs.data).filter((i) => !seen.has(i.qid))];
  }
  const fullItem: WikidataItem = items.find((i) => i.qid === qid) ?? item;
  const proposal = proposeWikidataJoin(fullItem, opts.candidateFinder);
  if (proposal.conflict || proposal.status !== "proposed") {
    return {
      kind: "ambiguous",
      detail:
        proposal.conflictReason ??
        `the join proposal for ${qid} has status "${proposal.status}" — no unconflicted join stands, so nothing is banked`,
    };
  }
  const translation = translateWikidataItems(items, {
    fetchDate: opts.fetchDate,
    retrievedFrom: opts.retrievedFrom,
  });
  const glosses = new Map<string, string>();
  for (const cand of proposal.candidates) {
    if (cand.kind === "synset") glosses.set(qid, cand.gloss);
  }
  const banked = bank.bankTranslation(translation, glosses);
  mirrorBankIntoGraph(session.graph, bank);
  return {
    kind: "banked",
    qid,
    detail:
      `resolved "${subject}" to ${qid} (first exact-label hit in search rank, of ${exact.length} exact-label hit(s); join proposal unconflicted), ` +
      `fetched and banked: ${banked.addedNodes} node(s) and ${banked.addedAssociations} association(s) added, ` +
      `${banked.alreadyBanked} already banked; skip-log counted ${translation.skippedTotal} unmapped statement(s)`,
  };
}

function withBankAnswer(result: TurnResult, q: WikidataQuestion, answer: { reply: string; qid: string; detail: string }, action: "answered-from-bank" | "looked-up-and-banked", extraDetail: string): TurnResult {
  const trace = result.trace;
  const priorDecline = trace.declineReason;
  delete trace.declineReason;
  trace.wikidata = {
    action,
    subject: q.subject,
    qid: answer.qid,
    dataset: "wikidata",
    fetched: action === "looked-up-and-banked",
    detail: `${extraDetail} Answer: ${answer.detail}. Provenance: dataset "wikidata", uri ${answer.qid} — retrieved-kind, confidence 0.9, never a propagation anchor; the reply is a plain statement of the retrieved fact, not a derivation.`,
    ...(priorDecline ? { priorDecline } : {}),
  };
  trace.planNote =
    action === "answered-from-bank"
      ? "answered from the banked Wikidata store (slice W2): the bank held the fact, no fetch was made; the synchronous turn's decline is replaced by the banked answer and kept in the wikidata record"
      : "Wikidata lookup (slice W2): the turn ended in the located knowledge decline, the name resolved unconflicted, the item was fetched, translated and banked, and the question re-answered from the bank as this turn's reply";
  trace.wordingNotDerived = true;
  if (trace.mapPath && !trace.mapPath.includes("intake/wikidata")) {
    const at = trace.mapPath.lastIndexOf("verbalizer");
    if (at >= 0) trace.mapPath.splice(at, 0, "intake/wikidata");
    else trace.mapPath.push("intake/wikidata");
  }
  return { reply: answer.reply, trace };
}

/**
 * One conversational turn with the Wikidata lookup wired in
 * (slice W2): the ordinary synchronous turn, then the bank /
 * lookup behaviour described in this module's header. Turns
 * that are not first-consumer shapes, and shapes the bank and
 * the lookup do not resolve, return the ordinary turn's
 * result untouched (save the trace's wikidata record where a
 * lookup was attempted and stood down).
 */
export async function processTurnWithWikidata(
  session: Session,
  text: string,
  options: WikidataTurnOptions = {},
): Promise<TurnResult> {
  const source = options.source ?? new HttpWikidataSource();
  const bank = options.bank ?? defaultWikidataBank;
  const fetchDate = options.fetchDate ?? new Date().toISOString().slice(0, 10);
  const retrievedFrom = options.retrievedFrom ?? "live";
  const q = detectWikidataQuestion(text);
  // Union composition (2026-11-19): while the turn runs, the
  // session carries the consultation this wrapper will make
  // if the turn declines. The entity-answer sites in turn.ts
  // stand down for a consulted subject (wikidataConsulted
  // there): those gloss-level answers were built while this
  // intake stood on hold, and with the intake wired the turn
  // ends in its ordinary located knowledge decline, so the
  // trigger below operates exactly as designed. The
  // consultation is a processing transient — set for this
  // turn's duration, cleared after, never a record.
  let result: TurnResult;
  if (q) {
    session.wikidataConsult = { shape: q.shape, subject: q.subject.toLowerCase() };
    try {
      result = processTurn(session, text);
    } finally {
      delete session.wikidataConsult;
    }
  } else {
    result = processTurn(session, text);
  }
  if (!q) return result;

  // 1. The bank first: a banked fact answers with no fetch.
  const bankedAnswer = answerFromBank(bank, q);
  if (bankedAnswer) {
    mirrorBankIntoGraph(session.graph, bank);
    return withBankAnswer(result, q, bankedAnswer, "answered-from-bank", "No fetch was made.");
  }

  // 2. The lookup trigger: only where the turn ended in the
  // located knowledge decline for this subject.
  if (!endedInKnowledgeDecline(result, q)) return result;

  const outcome = await lookupAndBank(session, q.subject, {
    source,
    bank,
    fetchDate,
    retrievedFrom,
    ...(options.candidateFinder ? { candidateFinder: options.candidateFinder } : {}),
  });
  const trace = result.trace;
  if (outcome.kind === "unavailable") {
    trace.wikidata = {
      action: "lookup-unavailable",
      subject: q.subject,
      fetched: true,
      detail: `the Wikidata lookup was unavailable: ${outcome.reason} — the reply is the located lookup-unavailable decline, not a claim that nothing is held on the subject`,
      ...(trace.declineReason ? { priorDecline: trace.declineReason } : {}),
    };
    trace.declineReason = `the question asks after '${q.subject.toLowerCase()}', and the Wikidata lookup that could have resolved it was unavailable (${outcome.reason}) — the gap is the lookup, located there (§6)`;
    trace.planNote =
      "lookup unavailable (slice W2): the located knowledge decline triggered a Wikidata lookup and the source reported unavailable — the reply states the lookup failure, not an absence of knowledge";
    return {
      reply: `I can't answer that from what I know: I could not look up ${q.subject} — the lookup was unavailable, so I can't say whether anything is held on it.`,
      trace,
    };
  }
  if (outcome.kind === "ambiguous" || outcome.kind === "no-resolution") {
    trace.wikidata = {
      action: outcome.kind === "ambiguous" ? "lookup-ambiguous" : "lookup-no-resolution",
      subject: q.subject,
      fetched: true,
      detail: `${outcome.detail} — nothing was banked and the ordinary located knowledge decline stands`,
      ...(trace.declineReason ? { priorDecline: trace.declineReason } : {}),
    };
    trace.planNote =
      "Wikidata lookup stood down (slice W2): the name did not resolve to exactly one unconflicted item, so nothing was banked; the ordinary located knowledge decline stands, with the ambiguity in the wikidata record";
    return result;
  }
  const answer = answerFromBank(bank, q);
  if (!answer) {
    trace.wikidata = {
      action: "lookup-no-resolution",
      subject: q.subject,
      qid: outcome.qid,
      dataset: "wikidata",
      fetched: true,
      detail: `${outcome.detail} — the item banked, but the bank holds no fact answering this ${q.shape} question; the ordinary decline stands`,
      ...(trace.declineReason ? { priorDecline: trace.declineReason } : {}),
    };
    return result;
  }
  return withBankAnswer(result, q, answer, "looked-up-and-banked", `${outcome.detail}.`);
}
