/**
 * wikidata-mapping.ts — the Wikidata property → association mapping
 * table, v1 (design §3.6; plan: docs/ansci/wikidata-adapter-plan.md).
 *
 * This is a DATA module on purpose (owner ruling, slice W1): the
 * adapter core (wikidata.ts) contains no entity-type assumptions and
 * no property knowledge of its own — it walks this table. Extending
 * the adapter is adding a row here, never editing translator code.
 *
 * Row meanings:
 *  - direction "forward":  subject —association→ object.
 *  - direction "inverted": object —association→ subject (P36: the
 *    statement lives on the territory and names its capital; the
 *    association runs capital —CAPITAL_OF→ territory, §3.6).
 *  - direction "node-properties": no edge at all; the statement's
 *    value lands in the subject node's properties (P625 coordinates
 *    are a computation input, §3.4's criterion, never an association).
 *
 * Association names:
 *  - CAPITAL_OF, LOCATED_IN are NEW, named by §3.6.
 *  - PART_OF is the graph's existing type (src/graph.ts: meronym
 *    synset —PART_OF→ holonym; src/propagate.ts already carries its
 *    propagation rule).
 *  - IS_A is the graph's existing classification association
 *    (src/graph.ts: synset —IS_A→ hypernym synset; the fork's own
 *    CONCEPT_LINKS in classify.ts and join.ts's extraLinks use the
 *    same name for concept classification). P31/P279 therefore map
 *    to IS_A rather than to any invented parallel taxonomy edge:
 *    instance-of and subclass-of are both "this is a kind of that"
 *    in the graph's one classification vocabulary.
 *
 * Any property with no row here is NOT mapped: the translator logs
 * and counts it in its skip-log (§4.4's pattern), never silently
 * drops it and never force-fits it onto a catch-all edge.
 */

export type WikidataAssociationType = "CAPITAL_OF" | "LOCATED_IN" | "PART_OF" | "IS_A";

export interface WikidataMappingRow {
  /** Wikidata property id, e.g. "P36". */
  property: string;
  /** The property's English label, for logs and reports. */
  propertyLabel: string;
  /** The AnSci association this property becomes; absent for
   *  node-properties rows. */
  association?: WikidataAssociationType;
  direction: "forward" | "inverted" | "node-properties";
  note: string;
}

export const WIKIDATA_MAPPING_V1: WikidataMappingRow[] = [
  {
    property: "P36",
    propertyLabel: "capital",
    association: "CAPITAL_OF",
    direction: "inverted",
    note: "capital —CAPITAL_OF→ territory (§3.6: inverted at import)",
  },
  {
    property: "P17",
    propertyLabel: "country",
    association: "LOCATED_IN",
    direction: "forward",
    note: "world-level containment; distinct from ConceptNet AT_LOCATION (§3.6)",
  },
  {
    property: "P131",
    propertyLabel: "located in the administrative territorial entity",
    association: "LOCATED_IN",
    direction: "forward",
    note: "world-level containment (§3.6)",
  },
  {
    property: "P361",
    propertyLabel: "part of",
    association: "PART_OF",
    direction: "forward",
    note: "existing graph association; world-level parthood (§3.6)",
  },
  {
    property: "P625",
    propertyLabel: "coordinate location",
    direction: "node-properties",
    note: "node properties lat/lon; a computation input, NEVER an edge (§3.4, §3.6)",
  },
  {
    property: "P31",
    propertyLabel: "instance of",
    association: "IS_A",
    direction: "forward",
    note: "the graph's existing classification association (graph.ts IS_A)",
  },
  {
    property: "P279",
    propertyLabel: "subclass of",
    association: "IS_A",
    direction: "forward",
    note: "the graph's existing classification association (graph.ts IS_A)",
  },
];

const BY_PROPERTY = new Map(WIKIDATA_MAPPING_V1.map((r) => [r.property, r]));

/** The mapping row for a property, or undefined when unmapped. */
export function mappingForProperty(property: string): WikidataMappingRow | undefined {
  return BY_PROPERTY.get(property);
}

/**
 * English labels for properties the fixtures and reports name even
 * though v1 does not map them — used only so the skip-log can say
 * what was skipped, never to map anything. A property absent here
 * is logged with no label rather than a guessed one.
 */
export const WIKIDATA_PROPERTY_LABELS: Record<string, string> = {
  P37: "official language",
  P571: "inception",
  P1082: "population",
  P47: "shares border with",
  P41: "flag image",
  P856: "official website",
  P625: "coordinate location",
};
