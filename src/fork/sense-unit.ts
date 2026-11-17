/**
 * sense-unit.ts — the SenseUnit: the system's medium-neutral
 * authority on the human senses, sitting in the OntologyCore
 * (ai-system/ontology-core/sense-unit), beside the EDU.
 *
 * (Filename note: the brief named this file sense.ts, but that
 * name is already the Parser's sense-selection module —
 * src/fork/sense.ts, lpu/parser/sense — imported across the
 * turn loop. The authority lives here as sense-unit.ts rather
 * than overwriting a working module.)
 *
 * A sentence is analysed for ALL the human senses (owner's
 * direction, 2026-11-17), and the senses are found in the
 * Ontology Knowledge Unit. This unit is the specialist authority
 * over that slice of the OKU — the EDU pattern: it names the
 * channels and interprets them; it does not keep a private
 * store. The phase rows it speaks for live in the OKU's
 * classification table (classify.ts) and ingested store
 * (ingested.ts); the framework tables below are held beside
 * them, as edu.ts holds 七情六欲 beside the table.
 *
 * CONTENTS — the join of three provenance-labelled lists
 * (owner's ruling, 2026-11-17, "1a, 2a"), NEVER silently
 * harmonised:
 *
 *  1. CHANNELS from 六根/六塵 (liùgēn/liùchén, "six roots /
 *     six dusts"): eye→form/colour, ear→sound, nose→smell,
 *     tongue→taste, body→touch, mind→mental objects. The spine,
 *     because it is the only classical inventory carrying body
 *     (touch) and mind as channels.
 *  2. DISCRIMINATIONS from Xunzi: Tianlun's five 天官
 *     (tiānguān, "heavenly faculties" — ear, eye, nose, mouth,
 *     body/形; body IS a faculty there, and mouth does taste)
 *     and Rongru's assignments of what each faculty
 *     distinguishes. These are what a language bridge maps
 *     words onto.
 *  3. PHASES from the OKU's Suwen rows: ch. 5's orifices (eyes
 *     Wood, tongue Fire, mouth Earth, nose Metal, ears Water)
 *     and quality rows (colour, sound, voice, flavour; skin in
 *     the tissue row, Metal), and ch. 4's odour row, banked
 *     through the ingestion pipeline (ingested.ts,
 *     INGESTED_ASSERTIONS_CH4).
 *
 * RECORDED TENSIONS, labelled, not resolved:
 *  - Taste is double-filed: the Buddhist root is the tongue
 *    (Fire; Suwen's tongue orifice agrees), Xunzi's faculty is
 *    the mouth (Suwen's mouth orifice: Earth). Both stand.
 *  - Touch has NO channel phase: its values carry phases (cold
 *    → Water, hot → Fire, filed as temperature) and its tissue
 *    (skin) is Metal. No single phase is invented for it.
 *  - Mind's phase is UNSETTLED, as already recorded for the six
 *    desires in edu.ts (SIX_DESIRES' mind row).
 *
 * BOUNDARY with the EDU: this unit owns the CHANNELS; the EDU
 * owns the CRAVINGS of the channels — the six desires are
 * per-root cravings, and edu.ts's desire table references these
 * roots by sense name rather than duplicating the list.
 */
import type { Element } from "./sentence";
import type { SenseChannel } from "./semantic-object";
import { classificationsOf } from "./classify";
import { ingestedFor } from "./ingested";
import { tierOfProvenance } from "./pricing";

export interface SenseOrifice {
  /** The orifice/faculty name in English ("eyes", "tongue", …). */
  name: string;
  hanzi: string;
  element: Element;
  organ: string;
  /** Which list files this orifice: Suwen ch. 5's orifice row,
   *  and (for the mouth) Xunzi's faculty list. */
  source: string;
}

export interface SenseChannelKind {
  channel: SenseChannel;
  /** The root (faculty) and its object (dust), 六根/六塵. */
  root: string;
  rootHanzi: string;
  dust: string;
  dustHanzi: string;
  /** What the channel distinguishes (Xunzi, Rongru) — the value
   *  vocabulary a bridge maps words onto. */
  discriminations: { kind: string; values: string; source: string }[];
  /** The orifice correspondences filed for this channel (Suwen
   *  ch. 5). Taste carries TWO, labelled — the double filing. */
  orifices: SenseOrifice[];
  /** The channel's own phase standing, stated plainly:
   *  "filed" via its orifice, "none" where the tradition files
   *  phases for the channel's VALUES but not the channel
   *  (touch), "unsettled" where the tradition leaves it open
   *  (mind). */
  phaseStanding: "filed" | "none" | "unsettled";
  note?: string;
}

const XUNZI_RONGRU = "Xunzi, Rongru （榮辱）: the faculties' discriminations";
const XUNZI_TIANLUN = "Xunzi, Tianlun （天論）: the five 天官 (heavenly faculties)";
const LIUGEN = "六根/六塵 (the six roots and their dusts)";
const SUWEN5 = "Suwen ch. 5 (OKU): the orifice row";

export const SENSE_CHANNEL_TABLE: SenseChannelKind[] = [
  {
    channel: "sight",
    root: "eye", rootHanzi: "眼", dust: "form/colour", dustHanzi: "色",
    discriminations: [
      { kind: "color", values: "white/black (and the five colours)", source: XUNZI_RONGRU },
      { kind: "appearance", values: "beautiful/ugly", source: XUNZI_RONGRU },
    ],
    orifices: [{ name: "eyes", hanzi: "目", element: "Wood", organ: "liver", source: SUWEN5 }],
    phaseStanding: "filed",
  },
  {
    channel: "hearing",
    root: "ear", rootHanzi: "耳", dust: "sound", dustHanzi: "聲",
    discriminations: [
      { kind: "sound", values: "tones and sounds, clear/muddy", source: XUNZI_RONGRU },
    ],
    orifices: [{ name: "ears", hanzi: "耳", element: "Water", organ: "kidney", source: SUWEN5 }],
    phaseStanding: "filed",
  },
  {
    channel: "smell",
    root: "nose", rootHanzi: "鼻", dust: "fragrance/odour", dustHanzi: "香",
    discriminations: [
      { kind: "odour", values: "fragrant/fetid", source: XUNZI_RONGRU },
    ],
    orifices: [{ name: "nose", hanzi: "鼻", element: "Metal", organ: "lung", source: SUWEN5 }],
    phaseStanding: "filed",
  },
  {
    channel: "taste",
    root: "tongue", rootHanzi: "舌", dust: "flavour", dustHanzi: "味",
    discriminations: [
      { kind: "flavor", values: "sour/salty/sweet/bitter (Xunzi's mouth list); the five flavours add pungent", source: XUNZI_RONGRU },
    ],
    orifices: [
      { name: "tongue", hanzi: "舌", element: "Fire", organ: "heart", source: `${SUWEN5}; the root of ${LIUGEN}` },
      { name: "mouth", hanzi: "口", element: "Earth", organ: "spleen", source: `${SUWEN5}; Xunzi's taste faculty (${XUNZI_TIANLUN})` },
    ],
    phaseStanding: "filed",
    note: "double-filed, labelled: tongue/Fire (the root) and mouth/Earth (Xunzi's faculty) both stand",
  },
  {
    channel: "touch",
    root: "body", rootHanzi: "身", dust: "touch", dustHanzi: "觸",
    discriminations: [
      { kind: "temperature", values: "cold/heat", source: `${XUNZI_RONGRU} (bones, flesh and skin distinguish them)` },
      { kind: "sensation", values: "pain/itching", source: XUNZI_RONGRU },
      { kind: "texture", values: "soft/hard", source: `${LIUGEN}: the touch dust's own values` },
    ],
    orifices: [],
    phaseStanding: "none",
    note:
      "no orifice and no channel phase: touch is the whole body's surface (Xunzi's fifth faculty is 形, the body). " +
      "Its tissue (skin, 皮毛) is Metal in Suwen ch. 5's tissue row, and its temperature values carry phases " +
      "(cold Water, hot Fire) — neither is a phase OF the channel",
  },
  {
    channel: "mind",
    root: "mind", rootHanzi: "意", dust: "mental objects", dustHanzi: "法",
    discriminations: [],
    orifices: [],
    phaseStanding: "unsettled",
    note:
      "the sixth root's object is mental content, not a quality a sentence predicates; the language bridge " +
      "files no mind readings in v1. Its phase stands unsettled, as in the EDU's six desires",
  },
];

export function channelKind(channel: SenseChannel): SenseChannelKind {
  return SENSE_CHANNEL_TABLE.find((c) => c.channel === channel)!;
}

/** The channel a faculty/orifice name belongs to ("eyes" →
 *  sight, "mouth" → taste, "skin" → touch, "mind" → mind).
 *  Names are the roots and orifices of the framework tables,
 *  plus the body's surface words Xunzi's faculty carries. */
const FACULTY_CHANNEL: Record<string, SenseChannel> = {
  eye: "sight", eyes: "sight",
  ear: "hearing", ears: "hearing",
  nose: "smell",
  tongue: "taste", mouth: "taste",
  body: "touch", skin: "touch",
  mind: "mind",
};

export function channelForFaculty(name: string): SenseChannel | undefined {
  return FACULTY_CHANNEL[name.toLowerCase()];
}

/** A word's sense reading, as the SenseUnit names it: the
 *  channel, the discrimination the word falls under, and the
 *  OKU's filed phase/tier where one exists. The word itself is
 *  NOT carried here — the bridge (senses-scening.ts) retains it
 *  as the entry's value. */
export interface SenseReading {
  channel: SenseChannel;
  discrimination: string;
  element?: Element;
  tier?: string;
  confidence?: number;
  source: string;
}

/** OKU classification aspects that ARE sense discriminations,
 *  and the channel each belongs to. Aspects not listed here
 *  (emotion, food, state, …) are not sense readings: a food's
 *  classification is about the food, not about a sense. */
const ASPECT_CHANNEL: Record<string, { channel: SenseChannel; discrimination: string }> = {
  color: { channel: "sight", discrimination: "color" },
  taste: { channel: "taste", discrimination: "flavor" },
  temperature: { channel: "touch", discrimination: "temperature" },
};

/**
 * The discrimination lookup: a value word → its sense reading.
 * Order of authority:
 *  1. The OKU classification table's sense aspects (colour,
 *     taste, temperature rows) — the filed phases.
 *  2. The OKU ingested store's odour row (Suwen ch. 4, banked
 *     2026-11-17) — smell's quality row: rank/scorched/fragrant/
 *     fishy/rotten with their phases.
 *  3. The bridge vocabulary the Senses-Scening Unit maintains
 *     for discriminations the OKU files as KINDS but not as
 *     English value words (BRIDGE_VOCABULARY in
 *     senses-scening.ts) — that mapping is language's, and it
 *     lives in the bridge, not here. This function is steps
 *     1–2: the authority's own answer.
 */
export function senseReadingForWord(lemma: string): SenseReading | undefined {
  const word = lemma.toLowerCase();
  for (const e of classificationsOf(word)) {
    const m = ASPECT_CHANNEL[e.aspect];
    if (m) {
      return {
        channel: m.channel,
        discrimination: m.discrimination,
        element: e.element,
        tier: tierOfProvenance(e.provenance),
        confidence: e.confidence,
        source: `SenseUnit ← OKU classification table: '${e.concept}' (${e.aspect})`,
      };
    }
  }
  for (const a of ingestedFor(word)) {
    if (a.aspect === "odour" && a.element) {
      return {
        channel: "smell",
        discrimination: "odour",
        element: a.element,
        tier: tierOfProvenance(a.provenance),
        source: `SenseUnit ← OKU ingested store: '${a.concept}' (${a.hanzi}, odour), Suwen ch. 4`,
      };
    }
  }
  return undefined;
}

/** A cross-channel implication the SenseUnit files: a stated
 *  value on one channel that implies content on others. The
 *  implications are DERIVED-tier knowledge — Coherence annotates
 *  them on an object's trail; they never become entries in a
 *  senses face (stated vs derived, kept apart). One case is
 *  filed, the design's worked case; the table grows by filing,
 *  not by analogy at runtime. */
export interface CrossChannelImplication {
  channel: SenseChannel;
  implication: string;
  basis: string;
}

const CROSS_CHANNEL: Record<string, CrossChannelImplication[]> = {
  overripe: [
    { channel: "smell", implication: "a strong, sweet-rank odour", basis: "ripeness past its peak is smelled before it is seen to change further" },
    { channel: "taste", implication: "sweetness at its fullest, turning", basis: "the fruit's sugars peak as it overripens (banana is filed Earth/food: 'sweet and soft')" },
    { channel: "touch", implication: "softness — the fruit yields to pressure", basis: "the OKU's own food note for banana: 'sweet and soft'" },
  ],
};

export function crossChannelImplications(value: string): CrossChannelImplication[] {
  return CROSS_CHANNEL[value.toLowerCase()] ?? [];
}

/** Unknown-slot kinds filed for scene entities (the scene
 *  wiring in senses-scening.ts mints these): facts about an
 *  entity of a kind that the conversation standardly has not
 *  supplied when the entity is established. One rule filed —
 *  the owner's specimen; the table grows by filing. */
export const UNKNOWN_SLOT_RULES: { entity: string; slots: string[] }[] = [
  { entity: "airport", slots: ["city"] },
];

export function unknownSlotsFor(entityLemma: string): string[] {
  return UNKNOWN_SLOT_RULES.find((r) => r.entity === entityLemma.toLowerCase())?.slots ?? [];
}
