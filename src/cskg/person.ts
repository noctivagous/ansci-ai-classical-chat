/**
 * person.ts — the person model (design §5; E4 Part 3).
 *
 * Long-term memory is a person FILE: one human-readable,
 * human-editable JSON file per person under `data/people/`
 * (gitignored — the person's own data, local-first), selected
 * by `CSKG_CHAT_PERSON=<name>` (`CSKG_CHAT_PEOPLE_DIR` overrides
 * the directory for tests and judgement scripts). Unset →
 * general mode: no file is read, nothing is written, and nothing
 * survives the session.
 *
 * Two tiers (§5):
 *   FACTS — the file's permanent tier: what the person stated
 *     about themselves (or explicitly asked to have remembered),
 *     each with when it was stated. Facts persist until
 *     contradicted: a contradicting statement supersedes the old
 *     fact (marked, never silently deleted — the file is the
 *     person's own record).
 *   CURRENT STATE — transient: feelings, current doings,
 *     present circumstances. Session-scoped (it lives in the
 *     session, memory.ts), superseded by newer state, allowed
 *     to lapse. A habitual marker on a state ("all the time")
 *     is recorded as a standing PATTERN: patterns are written
 *     to the file (that write is acknowledged like any other),
 *     and a pattern seen again in a later session has its
 *     session count incremented — promotion toward last-known.
 *
 * WRITE DISCIPLINE (§5): the file records only what the person
 * states about themselves or asks to remember — never
 * inferences, never other people's data beyond what the person
 * said. Every write is acknowledged in the reply (turn.ts
 * composes the acknowledgement in the role's voice); nothing
 * here writes silently.
 *
 * CAPTURE comes from the statement's own surface, gated on the
 * contents breakdown's speaker evidence where discourse found
 * it — and does NOT depend on the graph having anything to say
 * back: a statement about the speaker is person state first and
 * a graph topic second (§5). The captured state record is also
 * the canonical key from which ATOMIC's person-centred
 * knowledge is consulted (solve.ts's state reaction).
 */
import * as fs from "fs";
import * as path from "path";
import type { PersonStateEntry, SessionState } from "./memory";
import { noteStep, type TurnWorkspace } from "./workspace";

/* ---------------- the file -------------------------------------- */

export type FactKind =
  | "name" | "lives-in" | "from" | "work"
  | "preference" | "dislike" | "has" | "note";

export interface PersonFact {
  /** "self", or the relation/name the person used ("brother") */
  subject: string;
  kind: FactKind;
  /** the object as stated ("soup", "Chicago") */
  object: string;
  /** a sentence formed at capture time, for recall and replies */
  display: string;
  statedAt: string;
  source: "stated" | "asked";
  /** contradicted by a later statement; kept, but no longer active */
  superseded?: boolean;
}

export interface PersonPattern {
  /** the canonical state text ("tired") */
  text: string;
  kind: "feeling" | "doing";
  /** the habitual marker as stated ("all the time") */
  marker: string;
  statedAt: string;
  /** sessions in which this pattern has been stated */
  sessions: number;
}

export interface PersonFileData {
  name: string;
  facts: PersonFact[];
  patterns: PersonPattern[];
}

/** Kinds that hold one value per subject: a new value supersedes. */
const SINGLE_VALUED: ReadonlySet<FactKind> = new Set(["name", "lives-in", "from", "work"]);

export function peopleDir(env: NodeJS.ProcessEnv = process.env): string {
  const override = (env.CSKG_CHAT_PEOPLE_DIR ?? "").trim();
  if (override) return override;
  return path.join(__dirname, "..", "..", "..", "data", "people");
}

/** The configured person's name, or null in general mode. */
export function personNameFromEnv(env: NodeJS.ProcessEnv = process.env): string | null {
  const name = (env.CSKG_CHAT_PERSON ?? "").trim();
  return name ? name : null;
}

function fileFor(name: string, env: NodeJS.ProcessEnv): string {
  const safe = name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  return path.join(peopleDir(env), `${safe}.json`);
}

const storeCache = new Map<string, PersonFileData>();

/**
 * Load the configured person's data (null in general mode). A
 * named person with no file yet starts empty — the file is
 * created by the first write, not by being named.
 */
export function loadPersonData(env: NodeJS.ProcessEnv = process.env): PersonFileData | null {
  const name = personNameFromEnv(env);
  if (!name) return null;
  const file = fileFor(name, env);
  const hit = storeCache.get(file);
  if (hit) return hit;
  let data: PersonFileData = { name, facts: [], patterns: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as PersonFileData;
    if (raw && Array.isArray(raw.facts) && Array.isArray(raw.patterns)) {
      data = { name: raw.name || name, facts: raw.facts, patterns: raw.patterns };
    }
  } catch {
    // no file yet (or unreadable): the empty record stands
  }
  storeCache.set(file, data);
  return data;
}

/** Drop the cached copy (tests point the env at a fresh directory). */
export function clearPersonCache(): void {
  storeCache.clear();
}

function persist(data: PersonFileData, env: NodeJS.ProcessEnv): void {
  const file = fileFor(data.name, env);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

/** The facts still in force (not superseded by a later statement). */
export function activeFacts(data: PersonFileData): PersonFact[] {
  return data.facts.filter((f) => !f.superseded);
}

/**
 * Record a fact under the write discipline: dedupe an identical
 * active fact; supersede a contradicted single-valued one (or
 * the opposite polarity of a preference). Returns the fact when
 * a write happened, null when the record already said this.
 */
export function writeFact(
  data: PersonFileData,
  fact: PersonFact,
  env: NodeJS.ProcessEnv = process.env,
): PersonFact | null {
  const facts = data.facts;
  const same = (f: PersonFact): boolean =>
    f.subject === fact.subject && f.kind === fact.kind &&
    f.object.toLowerCase() === fact.object.toLowerCase();
  if (facts.some((f) => !f.superseded && same(f))) return null;
  for (const f of facts) {
    if (f.superseded || f.subject !== fact.subject) continue;
    const contradiction =
      (SINGLE_VALUED.has(fact.kind) && f.kind === fact.kind) ||
      ((fact.kind === "preference" && f.kind === "dislike") ||
        (fact.kind === "dislike" && f.kind === "preference")) &&
        f.object.toLowerCase() === fact.object.toLowerCase();
    if (contradiction) f.superseded = true;
  }
  facts.push(fact);
  persist(data, env);
  return fact;
}

/** Record (or re-confirm) a standing pattern. Returns it when written. */
export function writePattern(
  data: PersonFileData,
  pattern: PersonPattern,
  env: NodeJS.ProcessEnv = process.env,
): PersonPattern | null {
  const existing = data.patterns.find(
    (p) => p.text === pattern.text && p.kind === pattern.kind,
  );
  if (existing) {
    existing.sessions += 1;
    existing.statedAt = pattern.statedAt;
    persist(data, env);
    return existing;
  }
  data.patterns.push(pattern);
  persist(data, env);
  return pattern;
}

/* ---------------- capture --------------------------------------- */

export interface CaptureResult {
  /** facts persisted to the file this turn (named person only) */
  factsWritten: PersonFact[];
  /** standing patterns persisted this turn (named person only) */
  patternsWritten: PersonPattern[];
  /** the session state entry set for a captured feeling, if any */
  feeling: PersonStateEntry | null;
  /** the canonical doing captured this turn, if any */
  doing: string | null;
  /** a person introduced as new this turn ("my new girlfriend") */
  newPerson: string | null;
}

const HABITUAL_TAILS: { re: RegExp; marker: string }[] = [
  { re: /\s+all the time$/, marker: "all the time" },
  { re: /\s+always$/, marker: "always" },
  { re: /\s+constantly$/, marker: "constantly" },
  { re: /\s+every (day|morning|night|week)$/, marker: "every $1" },
];

function stripTail(text: string): { text: string; marker: string | null } {
  let t = text.replace(/[.!?]+$/, "").trim();
  for (const h of HABITUAL_TAILS) {
    const m = t.match(h.re);
    if (m) {
      return {
        text: t.replace(h.re, "").trim(),
        marker: h.marker.replace("$1", m[1] ?? ""),
      };
    }
  }
  return { text: t, marker: null };
}

function fact(
  subject: string,
  kind: FactKind,
  object: string,
  display: string,
  source: "stated" | "asked",
): PersonFact {
  return { subject, kind, object, display, statedAt: new Date().toISOString(), source };
}

/**
 * The statement's durable facts, by surface pattern. Objects
 * keep the person's own words (case included); the display
 * sentence is formed here, once, from the structured fields.
 * Used for plain statements and for explicit "remember that…"
 * requests alike.
 */
export function factsFromStatement(input: string, source: "stated" | "asked"): PersonFact[] {
  const out: PersonFact[] = [];
  const t = input.trim();
  let m: RegExpMatchArray | null;
  if ((m = t.match(/\bmy name is\s+(.+)$/i))) {
    const name = m[1].replace(/[.!?]+$/, "").trim();
    out.push(fact("self", "name", name, `your name is ${name}`, source));
  }
  if ((m = t.match(/\bi live in\s+(.+)$/i))) {
    const place = m[1].replace(/[.!?]+$/, "").trim();
    out.push(fact("self", "lives-in", place, `you live in ${place}`, source));
  }
  if ((m = t.match(/\bi(?:'m| am) from\s+(.+)$/i))) {
    const place = m[1].replace(/[.!?]+$/, "").trim();
    out.push(fact("self", "from", place, `you're from ${place}`, source));
  }
  if ((m = t.match(/\bi work\s+(at|for)\s+(.+)$/i))) {
    const place = m[2].replace(/[.!?]+$/, "").trim();
    out.push(fact("self", "work", place, `you work ${m[1]} ${place}`, source));
  } else if ((m = t.match(/\bi work as\s+(?:a|an)?\s*(.+)$/i))) {
    const role = m[1].replace(/[.!?]+$/, "").trim();
    out.push(fact("self", "work", role, `you work as ${role}`, source));
  }
  if ((m = t.match(/\bi\s+(?:really\s+)?(like|love|enjoy|prefer)\s+(.+)$/i))) {
    const object = m[2].replace(/[.!?]+$/, "").trim();
    out.push(fact("self", "preference", object, `you ${m[1].toLowerCase()} ${object}`, source));
  }
  if ((m = t.match(/\bi\s+(?:don'?t|do not)\s+(?:really\s+)?like\s+(.+)$/i))) {
    const object = m[1].replace(/[.!?]+$/, "").trim();
    out.push(fact("self", "dislike", object, `you don't like ${object}`, source));
  } else if ((m = t.match(/\bi hate\s+(.+)$/i))) {
    const object = m[1].replace(/[.!?]+$/, "").trim();
    out.push(fact("self", "dislike", object, `you hate ${object}`, source));
  }
  if ((m = t.match(/\bmy\s+(\w+)\s+(likes|loves|enjoys|prefers)\s+(.+)$/i))) {
    const object = m[3].replace(/[.!?]+$/, "").trim();
    out.push(
      fact(m[1].toLowerCase(), "preference", object,
        `your ${m[1].toLowerCase()} ${m[2].toLowerCase()} ${object}`, source),
    );
  }
  if ((m = t.match(/\bi have\s+(?:a|an|the)?\s*(.+)$/i))) {
    const object = m[1].replace(/[.!?]+$/, "").trim();
    if (object && !object.startsWith("to ")) {
      out.push(fact("self", "has", object, `you have ${object}`, source));
    }
  }
  // E5: a named social relation stated outright ("Sarah is my
  // sister") is the situation model's social relation's
  // long-term form — filed here, under the same acknowledged
  // write discipline as every other fact, never silently.
  if ((m = t.match(/\b([a-z]+) is my (sister|brother|mother|father|friend|partner|wife|husband|daughter|son)\b/i))) {
    out.push(
      fact(m[1].toLowerCase(), "note", m[2].toLowerCase(),
        `${m[1]} is your ${m[2].toLowerCase()}`, source),
    );
  }
  return out;
}

/**
 * Capture a statement turn's person data: durable facts and
 * patterns to the file (named person only), feelings and doings
 * to the session's current state (either mode — the session
 * tier is short-term memory, and short-term memory is not the
 * file). Runs before classification (design §2, piece C's set
 * order: person knowledge is consulted FIRST, and capture is
 * what keeps it current). Every capture is noted in the trace.
 */
export function captureStatement(
  ws: TurnWorkspace,
  session: SessionState,
  env: NodeJS.ProcessEnv = process.env,
): CaptureResult {
  const result: CaptureResult = {
    factsWritten: [],
    patternsWritten: [],
    feeling: null,
    doing: null,
    newPerson: null,
  };
  const input = ws.input;
  const lower = input.trim().toLowerCase();
  const data = loadPersonData(env);

  // --- feelings → current state (session tier) ---
  let feelM =
    lower.match(/^i feel\s+(.+)$/) ??
    lower.match(/^i'?m feeling\s+(.+)$/) ??
    lower.match(/^i am feeling\s+(.+)$/);
  if (!feelM) {
    // a bare state adjective: "I'm exhausted", "I am hungry" —
    // one uncapitalised word, not a gerund (doings, below) and
    // not a name ("I'm Sam" — a capitalised word is a name or
    // place, and the fact patterns own those).
    const bare = input.trim().match(/^i(?:'m| am)\s+([a-z][a-z'-]*)\.?$/i);
    if (bare && !/^[A-Z]/.test(bare[1]) && !bare[1].endsWith("ing")) {
      feelM = [bare[0], bare[1].toLowerCase()];
    }
  }
  if (!feelM) {
    // Loop 2 (L2-M): the qualified form — "I'm a bit nervous
    // because I can't swim", "I'm really tired today": an
    // intensifier phrase, then the feeling word, then whatever
    // else the sentence carries. Same guards as the bare form
    // (uncapitalised, not a gerund — those are doings).
    const qualified = input.trim().match(
      /^i(?:'m| am)\s+(?:a bit\s+|a little\s+|really\s+|so\s+|very\s+|quite\s+|rather\s+)([a-z][a-z'-]*)\b/i);
    if (qualified && !/^[A-Z]/.test(qualified[1]) && !qualified[1].endsWith("ing")) {
      feelM = [qualified[0], qualified[1].toLowerCase()];
    }
  }
  if (feelM) {
    const { text, marker } = stripTail(feelM[1].replace(/^so\s+/, ""));
    if (text) {
      const entry: PersonStateEntry = {
        kind: "feeling",
        text,
        canonical: text,
        turn: ws.turn,
        pattern: marker,
      };
      session.personStates = session.personStates.filter((s) => s.kind !== "feeling");
      session.personStates.push(entry);
      result.feeling = entry;
      noteStep(ws, "memory", "remember",
        `person state captured: feeling "${text}" (session tier)` +
        (marker ? `; habitual marker "${marker}"` : ""));
      if (marker && data) {
        const written = writePattern(
          data,
          { text, kind: "feeling", marker, statedAt: new Date().toISOString(), sessions: 1 },
          env,
        );
        if (written) {
          result.patternsWritten.push(written);
          noteStep(ws, "memory", "remember",
            `standing pattern written to the person file: feeling "${text}" (${marker}) — acknowledged in the reply`);
        }
      }
    }
  }

  // --- doings → current state (session tier) ---
  const doM =
    lower.match(/^i'?m\s+(\w+ing\b.*)$/) ??
    lower.match(/^i am\s+(\w+ing\b.*)$/) ??
    lower.match(/^i plan to\s+(.+)$/);
  if (doM) {
    let doing = doM[1].replace(/[.!?]+$/, "").trim();
    if (doing.startsWith("thinking of ")) doing = doing.slice("thinking of ".length);
    if (doing && !result.feeling) {
      const entry: PersonStateEntry = {
        kind: "doing",
        text: doing,
        canonical: doing,
        turn: ws.turn,
        pattern: null,
      };
      session.personStates = session.personStates.filter((s) => s.kind !== "doing");
      session.personStates.push(entry);
      result.doing = doing;
      noteStep(ws, "memory", "remember",
        `person state captured: doing "${doing}" (session tier)`);
    }
  }

  // --- a person introduced as new ---
  const newM = lower.match(
    /\bnew\s+(girlfriend|boyfriend|friend|partner|wife|husband|boss|roommate|colleague|neighbour|neighbor)\b/,
  );
  if (newM) result.newPerson = newM[1];

  // --- durable facts → the file (named person only) ---
  if (data) {
    for (const f of factsFromStatement(input, "stated")) {
      const written = writeFact(data, f, env);
      if (written) {
        result.factsWritten.push(written);
        noteStep(ws, "memory", "remember",
          `person fact written: ${written.display} — acknowledged in the reply`);
      }
    }
  }
  return result;
}

/**
 * An explicit "remember that …" request: the stated content is
 * parsed for facts; anything else is kept as a note, verbatim.
 * Named person → the file. General mode → the caller keeps it
 * as a session note (nothing persists).
 */
export function captureExplicit(
  text: string,
  env: NodeJS.ProcessEnv = process.env,
): { fact: PersonFact | null; note: string | null } {
  const data = loadPersonData(env);
  const facts = factsFromStatement(text, "asked");
  if (!data) return { fact: null, note: text };
  if (facts.length) {
    const written = writeFact(data, facts[0], env);
    return { fact: written ?? facts[0], note: null };
  }
  const noteFact = fact("self", "note", text, text, "asked");
  const written = writeFact(data, noteFact, env);
  return { fact: written ?? noteFact, note: null };
}

/* ---------------- person knowledge, consulted ------------------- */

export interface PersonConnection {
  fact: PersonFact;
  /** how the statement touches the fact: by its object or its subject */
  via: "object" | "subject";
  /** the contents text that matched */
  matchedText: string;
}

/**
 * Person knowledge FIRST (§2, piece C's order): which of the
 * person's recorded facts does this turn's contents touch? A
 * statement about soup connects to "your brother likes soup";
 * a statement about the brother connects to everything recorded
 * about him. Text-level matching over the contents breakdown —
 * the facts are few and the contents are categorised already.
 */
export function personConnections(
  ws: TurnWorkspace,
  data: PersonFileData,
): PersonConnection[] {
  const out: PersonConnection[] = [];
  const contents = ws.breakdown?.contents;
  if (!contents) return out;
  const thingTexts = new Set<string>();
  for (const e of contents.things) thingTexts.add(e.referentText.toLowerCase());
  for (const t of ws.breakdown?.topics ?? []) thingTexts.add(t.text.toLowerCase());
  const peopleTexts = new Set<string>();
  for (const e of contents.people) peopleTexts.add(e.referentText.toLowerCase());
  for (const f of activeFacts(data)) {
    const object = f.object.toLowerCase();
    for (const tt of thingTexts) {
      if (tt === object || tt.endsWith(` ${object}`) || object.endsWith(` ${tt}`)) {
        out.push({ fact: f, via: "object", matchedText: tt });
        break;
      }
    }
    if (f.subject !== "self") {
      for (const pt of peopleTexts) {
        if (pt === f.subject || pt.endsWith(` ${f.subject}`)) {
          out.push({ fact: f, via: "subject", matchedText: pt });
          break;
        }
      }
    }
  }
  return out;
}

/** The person's latest current-state entry of a kind, if any. */
export function latestState(
  session: SessionState,
  kind: PersonStateEntry["kind"],
): PersonStateEntry | null {
  const found = session.personStates.filter((s) => s.kind === kind);
  return found.length ? found[found.length - 1] : null;
}

/** The standing of a person fact (tuple, §5): attribution-grade certainty. */
export function factStanding(f: PersonFact, session: SessionState): {
  certainty: number;
  clarity: number;
  knownnessFelt: number;
} {
  return {
    certainty: f.source === "asked" ? 0.85 : f.subject === "self" ? 0.9 : 0.65,
    clarity: 0.9,
    knownnessFelt: Math.max(0, 1 - 0.12 * Math.max(0, session.turnCount - 1)),
  };
}
