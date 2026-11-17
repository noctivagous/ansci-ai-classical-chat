/**
 * quantification.ts — the QuantificationUnit: the system's
 * authority on quantity, living INSIDE the Ontology Knowledge
 * Unit (ai-system/ontology-core/ontology-knowledge-unit/
 * quantification-unit), over the OKU's Numbers slice
 * (owner's placement, 2026-11-17 — the unit moved into the
 * OKU, superseding an earlier System-level seat).
 *
 * The pattern is the EDU/SenseUnit one: the unit is the
 * specialist reader of its OKU slice and keeps NO private
 * number lore. What the tradition files about numbers — the
 * number correspondences — lives in the OKU (today: Suwen
 * ch. 4's number row, banked in the ingested store as
 * INGESTED_ASSERTIONS_CH4_NUMBERS). What this unit holds is
 * machinery: the ledger operations over the Session's quantity
 * state, the construction-implied counts, and the Luoshu.
 *
 * THREE JOBS (owner's direction, 2026-11-17):
 *  1. READ quantities — stated ("I have 5 apples") and implied
 *     ("between" implies TWO bathrooms). The language side of
 *     reading is the QuantificationLanguageUnit's
 *     (quantification-language.ts, in the LPU); this unit names
 *     what a construction implies and what a number files as.
 *  2. TRACK quantities — the ledger lives on the Session
 *     (session.quantities; the state is the conversation's,
 *     not the unit's), changed by events: a purchase, a gift,
 *     a loss. Each change is a new record; the latest record
 *     for a (holder, kind) is the current amount.
 *  3. COMPUTE — answer how-many from the tracked state
 *     (5 − 3 = 2, computed here, not re-derived from the
 *     sentences), and catch impossible ones: a delta larger
 *     than the tracked amount is FLAGGED as an inconsistency
 *     and not applied — never silently negative.
 *
 * THE LUOSHU, BUILT IN (owner, 2026-11-17): the 洛書
 * (Luòshū) 3×3 magic square is this unit's own working
 * apparatus — number↔palace positions, the 15 balance
 * invariant, the palace flight path — DISTINCT from the OKU
 * Numbers slice: filed correspondences live in the OKU; the
 * square is machinery in the unit.
 *
 * LABELLED TENSION, kept, never harmonised: Suwen ch. 4 files
 * Wood's number as 8 (the completion number of the 3/8 pair)
 * for the east; the Luoshu places 3 in the east palace and 8
 * in the north-east. Two attested arrangements of the same
 * numbers, kept as two — numberReading() speaks for the OKU
 * slice, the Luoshu functions for the square, and neither is
 * rewritten in the other's terms.
 */
import type { Session, QuantityRecord, QuantityFlag } from "./session";
import { ingestedFor } from "./ingested";
import { tierOfProvenance } from "./pricing";

/* ------------------------------------------------------------------ */
/* 1. The OKU Numbers slice: what a number files as                    */
/* ------------------------------------------------------------------ */

/** The English name of a number — the ingested store's concept
 *  grain. Names are not lore; the READING (the filed phase) is
 *  what comes from the OKU. */
const NUMBER_NAMES: Record<number, string> = {
  1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
  6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
  11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen", 15: "fifteen",
  16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen", 20: "twenty",
};

export interface NumberReading {
  number: number;
  /** The number's English name — the OKU concept it is filed under. */
  word: string;
  hanzi?: string;
  /** The phase the OKU Numbers slice files for this number. */
  element: string;
  tier?: string;
  source: string;
}

/**
 * A number's filed reading from the OKU Numbers slice: the
 * ingested Suwen ch. 4 number row (eight/Wood, seven/Fire,
 * five/Earth, nine/Metal, six/Water). Numbers the slice does
 * not file (1, 2, 3, 4, 10, …) return undefined — the absence
 * is the record; no phase is invented for them.
 */
export function numberReading(n: number): NumberReading | undefined {
  const word = NUMBER_NAMES[n];
  if (!word) return undefined;
  for (const a of ingestedFor(word)) {
    if (a.aspect === "number" && a.element) {
      return {
        number: n,
        word,
        hanzi: a.hanzi,
        element: a.element,
        tier: tierOfProvenance(a.provenance),
        source: `QuantificationUnit ← OKU Numbers slice (ingested): '${a.concept}' (${a.hanzi}, number), Suwen ch. 4`,
      };
    }
  }
  return undefined;
}

/** The same reading, addressed by the number's English name. */
export function numberReadingForWord(word: string): NumberReading | undefined {
  const n = Object.entries(NUMBER_NAMES).find(([, w]) => w === word.toLowerCase())?.[0];
  return n === undefined ? undefined : numberReading(Number(n));
}

/* ------------------------------------------------------------------ */
/* 2. The ledger: tracking quantities over the Session's state         */
/* ------------------------------------------------------------------ */

/** The current record for a (holder, kind): the LATEST one.
 *  Supersession by appending, never by editing in place. */
export function currentQuantity(session: Session, holder: string, kind: string): QuantityRecord | undefined {
  for (let i = session.quantities.length - 1; i >= 0; i--) {
    const q = session.quantities[i];
    if (q.holder === holder && q.kind === kind) return q;
  }
  return undefined;
}

/** Every (holder, kind)'s current record, latest per pair. */
export function currentQuantities(session: Session): QuantityRecord[] {
  const seen = new Set<string>();
  const out: QuantityRecord[] = [];
  for (let i = session.quantities.length - 1; i >= 0; i--) {
    const q = session.quantities[i];
    const key = `${q.holder}|${q.kind}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(q);
    }
  }
  return out.reverse();
}

/** The most recent kind a holder has any record for — the
 *  how-many reader's fallback when a question names no kind
 *  ("How many do I have left?"). */
export function latestKindFor(session: Session, holder: string): string | undefined {
  for (let i = session.quantities.length - 1; i >= 0; i--) {
    if (session.quantities[i].holder === holder) return session.quantities[i].kind;
  }
  return undefined;
}

function pushRecord(session: Session, rec: Omit<QuantityRecord, "reading"> & { amount: number | null }): QuantityRecord {
  const reading = rec.amount !== null && rec.amount > 0 ? numberReading(rec.amount) : undefined;
  const full: QuantityRecord = {
    ...rec,
    ...(reading ? { reading: { number: reading.number, element: reading.element, source: reading.source } } : {}),
  };
  session.quantities.push(full);
  return full;
}

/** Record a STATED quantity: what a sentence says a holder
 *  holds. Tier "said"; the amount may be null (a bounded
 *  unknown — "some", a bare plural) but never invented. */
export function recordStated(
  session: Session,
  input: { holder: string; kind: string; amount: number | null; unit?: string; quantifier?: string; turn: number; basis: string },
): QuantityRecord {
  return pushRecord(session, { ...input, tier: "said" });
}

export interface DeltaOutcome {
  applied: boolean;
  /** The new current record, when applied. */
  record?: QuantityRecord;
  /** The flag recorded instead, when not applied. */
  flag?: QuantityFlag;
}

function flag(session: Session, f: QuantityFlag): DeltaOutcome {
  session.quantityFlags.push(f);
  return { applied: false, flag: f };
}

/**
 * Apply a signed delta to a holder's tracked amount (a gain:
 * bought, found, received from outside the conversation's
 * tracked stock). The result is a DERIVED record. Against a
 * bounded-unknown amount the arithmetic has no ground, and a
 * delta that would take the amount below zero is an
 * inconsistency: both are flagged, neither is applied.
 */
export function applyDelta(
  session: Session,
  input: { holder: string; kind: string; delta: number; unit?: string; turn: number; basis: string },
): DeltaOutcome {
  const cur = currentQuantity(session, input.holder, input.kind);
  if (cur && cur.amount === null) {
    return flag(session, {
      holder: input.holder, kind: input.kind, turn: input.turn, flag: "unbounded",
      detail: `a delta of ${input.delta} against '${input.kind}' for ${input.holder} cannot be computed: the tracked amount is a bounded unknown (${cur.quantifier ?? "unstated"}), not a number`,
    });
  }
  const next = (cur?.amount ?? 0) + input.delta;
  if (next < 0) {
    return flag(session, {
      holder: input.holder, kind: input.kind, turn: input.turn, flag: "inconsistency",
      detail: `a delta of ${input.delta} against a tracked ${cur?.amount ?? 0} of '${input.kind}' for ${input.holder} would take the amount below zero — flagged, not applied`,
    });
  }
  const record = pushRecord(session, {
    holder: input.holder, kind: input.kind, amount: next,
    ...(input.unit ? { unit: input.unit } : {}),
    tier: "derived", turn: input.turn, basis: input.basis,
  });
  return { applied: true, record };
}

/**
 * Transfer a quantity between two holders (Sally bought 3 of
 * them; I gave him two): the source's amount falls, the
 * destination's rises, both as DERIVED records. The transfer
 * is atomic against the ledger: if the source's tracked
 * amount cannot cover it (or is a bounded unknown), the
 * inconsistency is flagged and NEITHER leg is applied — a
 * half-recorded transfer would corrupt both holders' state.
 */
export function applyTransfer(
  session: Session,
  input: { from: string; to: string; kind: string; amount: number; turn: number; basis: string },
): { applied: boolean; fromRecord?: QuantityRecord; toRecord?: QuantityRecord; flag?: QuantityFlag } {
  const fromCur = currentQuantity(session, input.from, input.kind);
  if (fromCur && fromCur.amount === null) {
    const f: QuantityFlag = {
      holder: input.from, kind: input.kind, turn: input.turn, flag: "unbounded",
      detail: `a transfer of ${input.amount} of '${input.kind}' from ${input.from} cannot be computed: the tracked amount is a bounded unknown (${fromCur.quantifier ?? "unstated"}), not a number — neither leg applied`,
    };
    session.quantityFlags.push(f);
    return { applied: false, flag: f };
  }
  const fromAmount = fromCur?.amount ?? 0;
  if (fromAmount < input.amount) {
    const f: QuantityFlag = {
      holder: input.from, kind: input.kind, turn: input.turn, flag: "inconsistency",
      detail: `a transfer of ${input.amount} of '${input.kind}' from ${input.from} exceeds the tracked amount (${fromAmount}) — flagged, neither leg applied`,
    };
    session.quantityFlags.push(f);
    return { applied: false, flag: f };
  }
  const toCur = currentQuantity(session, input.to, input.kind);
  const fromRecord = pushRecord(session, {
    holder: input.from, kind: input.kind, amount: fromAmount - input.amount,
    tier: "derived", turn: input.turn, basis: input.basis,
  });
  const toRecord = pushRecord(session, {
    holder: input.to, kind: input.kind, amount: (toCur?.amount ?? 0) + input.amount,
    tier: "derived", turn: input.turn, basis: input.basis,
  });
  return { applied: true, fromRecord, toRecord };
}

/* ------------------------------------------------------------------ */
/* 3. Implied counts: what a construction says without a numeral       */
/* ------------------------------------------------------------------ */

export interface ImpliedCount {
  construction: string;
  /** exact: the construction fixes the count. delta: it fixes
   *  a change. atLeast: it fixes a lower bound and leaves the
   *  exact count an unknown — a bound, not a number. */
  kind: "exact" | "delta" | "atLeast";
  value: number;
  note: string;
}

export const IMPLIED_COUNTS: ImpliedCount[] = [
  {
    construction: "between", kind: "exact", value: 2,
    note: "a between relation binds its figure against TWO landmarks — realised in the scene graph as two distinct entities (bathroom-1, bathroom-2), not one plural node (senses-scening.ts)",
  },
  { construction: "both", kind: "exact", value: 2, note: "both = the two of them, no more in view" },
  { construction: "pair", kind: "exact", value: 2, note: "a pair is two, counted as one set" },
  { construction: "another", kind: "delta", value: 1, note: "another = one more than the count in view" },
  {
    construction: "plural", kind: "atLeast", value: 2,
    note: "a bare plural says at least two and no exact count — the exact count stands as a bounded unknown on the ledger (amount null), never as an invented number",
  },
  { construction: "article", kind: "exact", value: 1, note: "a/an before a counted noun says one of the kind" },
];

export function impliedCount(construction: string): ImpliedCount | undefined {
  return IMPLIED_COUNTS.find((c) => c.construction === construction.toLowerCase());
}

/* ------------------------------------------------------------------ */
/* 4. The Luoshu, built in                                             */
/* ------------------------------------------------------------------ */

/**
 * The Luoshu square, as data: the nine palaces with their
 * numbers, in the traditional arrangement — south at the TOP
 * (the traditional orientation: the sovereign faces south),
 * north at the bottom, east to the left, west to the right,
 * 5 at the centre:
 *
 *        south
 *   4 (SE)  9 (S)  2 (SW)
 *   3 (E)   5 (C)  7 (W)
 *   8 (NE)  1 (N)  6 (NW)
 *        north
 *
 * Rows below are listed top (south) to bottom (north);
 * columns left (east side) to right (west side). Every row,
 * column and diagonal sums to 15 — the balance invariant,
 * checkable by lineSums().
 */
export interface LuoshuPalace {
  /** The palace's direction name. */
  palace: string;
  number: number;
  /** 0 = the south row (top), 2 = the north row (bottom). */
  row: number;
  /** 0 = the east side (left), 2 = the west side (right). */
  col: number;
}

export const LUOSHU: LuoshuPalace[] = [
  { palace: "south-east", number: 4, row: 0, col: 0 },
  { palace: "south", number: 9, row: 0, col: 1 },
  { palace: "south-west", number: 2, row: 0, col: 2 },
  { palace: "east", number: 3, row: 1, col: 0 },
  { palace: "centre", number: 5, row: 1, col: 1 },
  { palace: "west", number: 7, row: 1, col: 2 },
  { palace: "north-east", number: 8, row: 2, col: 0 },
  { palace: "north", number: 1, row: 2, col: 1 },
  { palace: "north-west", number: 6, row: 2, col: 2 },
];

/** The number standing in a palace ("south" → 9). */
export function luoshuNumberAt(palace: string): number | undefined {
  return LUOSHU.find((p) => p.palace === palace.toLowerCase())?.number;
}

/** The palace a number stands in (8 → north-east). NOTE the
 *  labelled tension: the OKU's Suwen ch. 4 row files 8 under
 *  Wood/east as a NUMBER correspondence; the Luoshu PLACES 8
 *  in the north-east palace. Both stand, as filed — this
 *  function speaks for the square only. */
export function luoshuPalaceOf(n: number): LuoshuPalace | undefined {
  return LUOSHU.find((p) => p.number === n);
}

/** The square as a 3×3 grid of numbers, south row first. */
export function luoshuGrid(): number[][] {
  const grid: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of LUOSHU) grid[p.row][p.col] = p.number;
  return grid;
}

/** Every line's sum — the balance invariant made checkable:
 *  three rows, three columns, two diagonals, all 15. */
export function luoshuLineSums(): { rows: number[]; columns: number[]; diagonals: number[]; constant: number } {
  const g = luoshuGrid();
  const rows = g.map((r) => r[0] + r[1] + r[2]);
  const columns = [0, 1, 2].map((c) => g[0][c] + g[1][c] + g[2][c]);
  const diagonals = [g[0][0] + g[1][1] + g[2][2], g[0][2] + g[1][1] + g[2][0]];
  return { rows, columns, diagonals, constant: 15 };
}

/**
 * The Luoshu flight path: the standard centre-out trajectory
 * the flying-star tradition walks — from the centre (5) the
 * path steps 6, 7, 8, 9, 1, 2, 3, 4, visiting every palace
 * once and returning to the centre. Returned as the sequence
 * of NUMBERS in visit order.
 */
export const LUOSHU_FLIGHT_PATH: number[] = [5, 6, 7, 8, 9, 1, 2, 3, 4];

export function luoshuFlightPath(): number[] {
  return [...LUOSHU_FLIGHT_PATH];
}

/* ------------------------------------------------------------------ */
/* 5. Quantity mentions: the shape the language bridge produces        */
/* ------------------------------------------------------------------ */

/**
 * A quantity mention: what one sentence's quantity content is,
 * as the QuantificationLanguageUnit (quantification-language.ts)
 * reads it from the parse. The mention is the bridge's product;
 * applying it to the ledger is this unit's work
 * (applyQuantityMentions). Fields mirror the parse's own grain:
 * the verb, the holder the parser gives (its agent, 'you' for
 * the speaker), the counted kind's normalised lemma.
 */
export interface QuantityMention {
  verb: string;
  holder: string;
  recipient?: string;
  /** The stated number, where the sentence numbers the kind. */
  amount?: number;
  /** The numeral as said (retention): "5", "five". */
  numeralWord?: string;
  /** The quantifier, where the sentence quantifies without
   *  numbering ("some", "none", "all", "plural"). */
  quantifier?: string;
  /** The counted kind, singular-normalised. Absent when the
   *  sentence counts a pronoun's stock ("3 of them") — the
   *  kind is then resolved against the ledger at apply time. */
  kind?: string;
  pronounStock?: boolean;
  /** A unit word the sentence carries, as the
   *  UnitsMeasurement Unit names it (units-measurement.ts). */
  unit?: string;
  /** The OKU Numbers reading of the amount, where filed. */
  reading?: NumberReading;
}

/**
 * Apply a turn's quantity mentions to the Session's ledger.
 * The verb semantics wired here are the ones the EN lexicon
 * actually carries (checked against sentence.ts, 2026-11-17):
 *  - have (theme): a STATED quantity for its agent.
 *  - buy (patient): with a counted kind, a gain for the buyer
 *    (stock from outside the conversation); with a pronoun's
 *    stock ("Sally bought 3 of them"), a TRANSFER from the
 *    stock's tracked holder to the buyer.
 *  - give (recipient + theme): a TRANSFER from giver to
 *    recipient.
 * 'take' and 'eat' are NOT in the EN lexicon (they exist only
 * on the Chinese side), so no delta is wired for them — a
 * sentence using them does not survive the sentence layer in
 * English, and no behaviour is claimed for it.
 *
 * Returns a plain-words summary of what was applied, for the
 * turn trace; flags land on session.quantityFlags as they occur.
 */
export function applyQuantityMentions(
  session: Session,
  mentions: QuantityMention[],
  turn: number,
): { applied: string[]; records: QuantityRecord[] } {
  const applied: string[] = [];
  const records: QuantityRecord[] = [];
  const note = (r: QuantityRecord, text: string) => {
    records.push(r);
    applied.push(text);
  };

  for (const m of mentions) {
    if (m.verb === "have" && m.kind) {
      if (m.amount !== undefined) {
        note(
          recordStated(session, {
            holder: m.holder, kind: m.kind, amount: m.amount,
            ...(m.unit ? { unit: m.unit } : {}),
            turn, basis: `stated: '${m.holder}' has ${m.amount} of '${m.kind}' (said)`,
          }),
          `stated ${m.amount} ${m.kind} for ${m.holder}`,
        );
      } else {
        // Quantified without a number: a bounded unknown (or
        // zero, for "none") — recorded as a bound, not a number.
        const amount = m.quantifier === "none" ? 0 : null;
        note(
          recordStated(session, {
            holder: m.holder, kind: m.kind, amount,
            ...(m.quantifier ? { quantifier: m.quantifier } : {}),
            turn,
            basis: `stated with quantifier '${m.quantifier}': the amount stands as ${amount === 0 ? "zero" : "a bounded unknown"}`,
          }),
          `stated ${m.quantifier ?? "an unstated amount of"} ${m.kind} for ${m.holder}`,
        );
      }
      continue;
    }

    if (m.verb === "buy" && m.amount !== undefined) {
      if (m.kind) {
        const out = applyDelta(session, {
          holder: m.holder, kind: m.kind, delta: m.amount, turn,
          basis: `bought: ${m.holder} bought ${m.amount} of '${m.kind}' (derived)`,
        });
        if (out.record) note(out.record, `${m.holder} +${m.amount} ${m.kind} (bought)`);
        else if (out.flag) applied.push(`flagged: ${out.flag.detail}`);
      } else if (m.pronounStock) {
        // "Sally bought 3 of them": the stock is the tracked
        // holder's — the holder (other than the buyer) with a
        // current record for the most plausible kind: prefer a
        // kind another holder tracks; else the buyer's own
        // latest kind; else the latest kind anyone tracks.
        const currents = currentQuantities(session);
        const others = currents.filter((q) => q.holder !== m.holder);
        const kind = others[others.length - 1]?.kind ?? latestKindFor(session, m.holder) ?? currents[currents.length - 1]?.kind;
        if (!kind) {
          applied.push("a purchase of a pronoun's stock, but no tracked kind stands to draw it from — nothing recorded");
          continue;
        }
        const from = currents.find((q) => q.kind === kind && q.holder !== m.holder)?.holder
          ?? currents.find((q) => q.kind === kind)?.holder;
        if (!from || from === m.holder) {
          applied.push(`a purchase of ${m.amount} of '${kind}' by its own tracked holder — no transfer recorded`);
          continue;
        }
        const out = applyTransfer(session, {
          from, to: m.holder, kind, amount: m.amount, turn,
          basis: `bought: ${m.holder} bought ${m.amount} of '${kind}' from ${from}'s tracked stock (derived)`,
        });
        if (out.applied && out.fromRecord && out.toRecord) {
          records.push(out.fromRecord, out.toRecord);
          applied.push(`transfer ${m.amount} ${kind}: ${from} → ${m.holder}`);
        } else if (out.flag) {
          applied.push(`flagged: ${out.flag.detail}`);
        }
      }
      continue;
    }

    if (m.verb === "give" && m.amount !== undefined && m.kind && m.recipient) {
      const out = applyTransfer(session, {
        from: m.holder, to: m.recipient, kind: m.kind, amount: m.amount, turn,
        basis: `gave: ${m.holder} gave ${m.amount} of '${m.kind}' to ${m.recipient} (derived)`,
      });
      if (out.applied && out.fromRecord && out.toRecord) {
        records.push(out.fromRecord, out.toRecord);
        applied.push(`transfer ${m.amount} ${m.kind}: ${m.holder} → ${m.recipient}`);
      } else if (out.flag) {
        applied.push(`flagged: ${out.flag.detail}`);
      }
      continue;
    }
  }
  return { applied, records };
}
