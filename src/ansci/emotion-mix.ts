/**
 * emotion-mix.ts — the emotion-mix table (MIX-1 of the
 * emotion-mix programme, 2026-11-19): a banked table, sibling
 * to the classification table (classify.ts), the LEDU's
 * canonical face map (ledu.ts) and the event-register
 * authority (event-register.ts), filing EMOTION MIXES.
 *
 * Why this table exists. The vocabulary pass (V1,
 * 2026-11-19) swept the feeling words no authority filed and
 * withheld two of them as owner questions (GAPS §2,
 * questions 3 and 4): *nostalgic / nostalgia* and
 * *sentimental*. Neither is a word whose category assignment
 * is merely unreliable — each names a feeling that is a
 * COMBINATION, and the owner's doctrine (standing, from the
 * bittersweet record) is that a mix is named by its
 * components and their cycle relations, never averaged and
 * never collapsed to a single element or register: filing
 * either leg of nostalgia alone (grief for the loss,
 * pensiveness for the longing) would misname it. What the
 * words waited on was a filing FORM for combinations. The
 * owner has now ruled the first two entries (2026-11-19,
 * below), and this table is that form.
 *
 * THE FORM. A mix entry names its words, its COMPONENTS as
 * (register, element) pairs — the register the recognition
 * layer's name （七情 and their filed families), the element
 * the correspondence layer's seat for that register （五志） —
 * and its provenance. The components' CYCLE RELATIONS are
 * not stored: they are derived from the elements by the
 * sentence layer's cycle machinery (GENERATES / CONTROLS,
 * sentence.ts) at every serving, exactly as edu-reach.ts
 * walks a seated emotion's phase rather than filing the
 * walk. What is banked is the combination; what the cycles
 * say about it is computed, so a change in the cycle
 * machinery would change the derivation, never leave a
 * stale assertion behind.
 *
 * THE AXES DOCTRINE governs the form as it governs the
 * event-register table: register and degree are separate
 * axes. A mix entry files NO degree — degree is read on the
 * word itself at the register walk (uptake.ts), from the
 * word's own evidence, because a mix has no single register
 * to borrow a degree from. And a mix entry files no single
 * element: the components' elements stand together, and any
 * consumer that needs one element (the classification
 * table's shape, the composition roll-up) is a consumer the
 * mix form does not serve — the word is not entered in
 * classify.ts at all, deliberately, because an entry there
 * asserts one element and would collapse the mix at the
 * data layer.
 *
 * BITTERSWEET STANDS OUTSIDE THIS TABLE. Its two readings
 * stand unreconciled in the record (the owner's first
 * reading — Wood controls the sweet, Earth; the owner's
 * later statement — bitter is Fire, which GENERATES the
 * sweet on the flavour axis) and neither is a ruled filing.
 * It is the doctrine's standing example, not an entry; this
 * table does not touch it, and no consumer of this table
 * derives a filing for it.
 */
import { CONTROLS, GENERATES, type Element } from "./sentence";

/* ------------------------------------------------------------------ */
/* The table                                                           */
/* ------------------------------------------------------------------ */

/** One component of a mix: a register standing in the
 *  combination, with its correspondence-layer element. The
 *  register is the recognition layer's canonical name (or a
 *  filed family's name); the element is that register's
 *  attested seat. */
export interface MixComponent {
  register: string;
  element: Element;
}

export interface EmotionMixEntry {
  /** The mix's name — the head word the entry files under;
   *  the name a mix ground and a mix state carry as their
   *  concept. */
  name: string;
  /** The word forms the entry covers (the name among them):
   *  the noun and its state form, where both are the
   *  feeling's own words. */
  words: string[];
  /** The components standing together — never ordered by
   *  importance (a mix has no head component in its filing;
   *  foregrounding, where a telling has one, is the record's
   *  to show at the register walk, not the table's to
   *  assert). Listed in the owner's ruling order. */
  components: MixComponent[];
  /** The filing's provenance, in the classification table's
   *  manner: whose determination this is, and when. */
  provenance: string;
  /** The filing's ground, in the determination's own terms. */
  note: string;
}

export const EMOTION_MIXES: EmotionMixEntry[] = [
  {
    name: "nostalgia",
    words: ["nostalgia", "nostalgic"],
    components: [
      { register: "pensiveness", element: "Earth" },
      { register: "grief", element: "Metal" },
      { register: "joy", element: "Fire" },
    ],
    provenance: "owner determination (2026-11-19)",
    note:
      "the owner's ruling: nostalgia is a mix of pensiveness, sadness and joy. The components are filed " +
      "under their registers: the owner's 'sadness' is grief's everyday face (the LEDU's canonical face " +
      "files sadness under grief), so the grief register stands as the component, its face named here so " +
      "both provenances stand. The combination's internal structure is the cycles', derived not stored: " +
      "a generating chain Fire→Earth→Metal (joy generates pensiveness, pensiveness generates grief), " +
      "with Fire also controlling Metal (joy controls grief) inside the one feeling.",
  },
  {
    name: "sentimental",
    words: ["sentimental"],
    components: [
      { register: "anger", element: "Wood" },
      { register: "joy", element: "Fire" },
      { register: "pensiveness", element: "Earth" },
      { register: "grief", element: "Metal" },
      { register: "fear", element: "Water" },
    ],
    provenance: "owner determination (2026-11-19)",
    note:
      "the owner's ruling: sentimental is a mix of ALL FIVE elements — the five seated registers " +
      "standing at once. The five are the correspondence layer's five seats; worry is not a sixth " +
      "component, because under the layered mapping worry shares pensiveness' seat (Earth/spleen) and " +
      "the ruling counts elements — Earth stands once, as it stands once in the combination. With all " +
      "five elements among the components, both cycles run fully among them (derived, §mixRelations). " +
      "Fright stands in no component: it is unseated in the correspondence layer, and a mix of elements " +
      "has no seatless component — the ruling names five elements, and fright has none.",
  },
];

/** The mix entry a word files under, if any: the entry's
 *  name or any of its covered word forms. */
export function mixFor(word: string): EmotionMixEntry | undefined {
  const w = word.toLowerCase();
  return EMOTION_MIXES.find((e) => e.name === w || e.words.includes(w));
}

/* ------------------------------------------------------------------ */
/* The derived relations                                               */
/* ------------------------------------------------------------------ */

/** One cycle relation between two components, DERIVED from
 *  their elements by the sentence layer's cycle machinery —
 *  never a stored assertion of the table. */
export interface MixRelation {
  kind: "generating" | "controlling";
  from: MixComponent;
  to: MixComponent;
  /** The walk, in words ("Fire generates Earth"). */
  via: string;
}

const ALL_ELEMENTS: Element[] = ["Wood", "Fire", "Earth", "Metal", "Water"];

/**
 * The relations among an entry's components, derived on
 * consult: for each ordered pair of components standing at
 * different elements, the generating step and the
 * controlling step the cycles place between those elements.
 * Components sharing an element stand in no cycle relation
 * to each other (the cycles run between elements, and a mix
 * may seat two registers at one element — none does yet).
 */
export function mixRelations(entry: EmotionMixEntry): MixRelation[] {
  const relations: MixRelation[] = [];
  for (const from of entry.components) {
    for (const to of entry.components) {
      if (from === to || from.element === to.element) continue;
      if (GENERATES[from.element] === to.element) {
        relations.push({
          kind: "generating",
          from,
          to,
          via: `${from.element} generates ${to.element}`,
        });
      } else if (CONTROLS[from.element] === to.element) {
        relations.push({
          kind: "controlling",
          from,
          to,
          via: `${from.element} controls ${to.element}`,
        });
      }
    }
  }
  return relations;
}

/** Whether the entry's components stand at all five
 *  elements — the sentimental shape, where both cycles run
 *  fully among the components. */
export function coversAllElements(entry: EmotionMixEntry): boolean {
  const present = new Set(entry.components.map((c) => c.element));
  return ALL_ELEMENTS.every((e) => present.has(e));
}

/**
 * The derivation served with a mix filing, in words: the
 * components standing together, and their relations as the
 * cycles derive them. Where the components cover all five
 * elements the relations are the two full cycles and are
 * named as such; otherwise each derived relation is named.
 * This string is the mix's provenance-bearing account — the
 * register walk's authority and the LEDU reading's source
 * both carry it, so any consumer meets the components and
 * their relations, never a summary element.
 */
export function mixDerivation(entry: EmotionMixEntry): string {
  const components = entry.components.map((c) => `${c.register} (${c.element})`).join(" + ");
  if (coversAllElements(entry)) {
    return (
      `${components} standing together — the components stand at all five elements, so both cycles run ` +
      `fully among them (the generating cycle Wood→Fire→Earth→Metal→Water→Wood and the controlling cycle ` +
      `Wood→Earth, Earth→Water, Water→Fire, Fire→Metal, Metal→Wood, each read between the components ` +
      `standing at those elements), derived from the elements by the cycle machinery, not stored`
    );
  }
  const relations = mixRelations(entry)
    .map((r) => `${r.via} (${r.from.register} ${r.kind === "generating" ? "generates" : "controls"} ${r.to.register})`)
    .join("; ");
  return (
    `${components} standing together; their relations, derived from the elements by the cycle ` +
    `machinery, not stored: ${relations}`
  );
}

/** The mix's components as short names for trace records:
 *  "pensiveness (Earth)" and its fellows. */
export function mixComponentNames(entry: EmotionMixEntry): string[] {
  return entry.components.map((c) => `${c.register} (${c.element})`);
}
