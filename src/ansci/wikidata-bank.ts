/**
 * wikidata-bank.ts — the banked store for Wikidata retrievals
 * (slice W2; design §3.6, plan docs/ansci/wikidata-adapter-plan.md).
 *
 * WHERE THE FACTS LIVE, AND WHY. W1's translator emits plain
 * association records; this module is where they are BANKED.
 * Two homes, one canonical:
 *
 *  1. THE BANK (this module) is the canonical store, following
 *     ingested.ts's separate-store reasoning: retrieved facts
 *     have a different provenance and epistemic status from the
 *     hand-governed classification table and from the seed's
 *     correspondence graph — they are what a named external
 *     dataset said, banked with its SourceRecord — so they live
 *     behind their own accessors rather than being merged into
 *     classify.ts or the seed. The bank is a process-level
 *     store: it persists across Sessions within a process (a
 *     fresh session answers from it with no fetch), and it does
 *     NOT persist across process restarts — no file backing is
 *     claimed, and none is silently implied.
 *
 *  2. THE SESSION GRAPH is the mirror: banking also writes the
 *     translation into a supplied graph (the session's own) in
 *     the KB's base partition — Concept nodes at layer "base"
 *     carrying the QID, coordinates and the never-anchor flag
 *     in their properties, CAPITAL_OF / LOCATED_IN / PART_OF /
 *     IS_A edges at the retrieved confidence 0.9, and one
 *     source node per subject QID linked by SOURCED_FROM
 *     (plan §W2). The mirror is a representation, not a second
 *     authority: the consumer queries below read the bank.
 *
 * Banking is IDEMPOTENT: associations are keyed by
 * (fromQid, type, toQid, property) and nodes by QID, so
 * re-banking the same translation adds nothing and changes
 * nothing (the counts returned say exactly what was added).
 *
 * Provenance (§§3.5, 4.3): every banked record is retrieved-
 * kind with its SourceRecord (dataset "wikidata", uri = the
 * subject item's QID, baseVersion = fetch date), at confidence
 * 0.9, and every node and association carries
 * neverPropagationAnchor: true — KB nodes never become
 * propagation anchors (§3.6, §6.1), preserved here and in the
 * graph mirror's properties.
 *
 * W3 (place associations): at bank time, a node carrying
 * lat/lon also banks its SITUATION ASSOCIATIONS — hemisphere
 * and latitude band computed by the shared §8.10 primitives in
 * src/situation.ts (one implementation, two callers). Those
 * associations are DERIVED-kind consuming a RETRIEVED step
 * (§3.5 rule 2, steps marked per step on the record). A banked
 * node without coordinates is flagged INCOMPLETE (§3.6):
 * situationForPlace / nightForPlace over it return a located
 * decline naming the missing coordinates, never a canonical
 * substitute. Climate (§8.11) is unmapped in v1 — see the W3
 * report.
 */
import { Graph, slugify } from "../graph";
import {
  computedLightAspect,
  computeSituation,
  dayOfYearUTC,
  hemisphereForLatitude,
  latitudeBandForLatitude,
  type Situation,
} from "../situation";
import type { WikidataAssociation, WikidataNodeRecord, WikidataTranslation } from "./wikidata";

/* ---------------- W3: banked place situation associations ---------------- */

/**
 * One provenance step of a banked situation association (§3.5
 * rule 2: kinds marked per step). The coordinates step is
 * RETRIEVED (a Wikidata statement, P625); the computation step
 * is DERIVED (the system's own §8.10 computation consuming the
 * retrieved step). Neither step is ever rendered as the other
 * kind (§3.5 rule 1).
 */
export interface WikidataSituationStep {
  kind: "retrieved" | "derived";
  detail: string;
}

/**
 * A banked place's situation associations (§3.6's place-
 * association requirement, §8.11): hemisphere and latitude band
 * computed from the banked coordinates at bank time by the
 * shared §8.10 primitives in src/situation.ts — the same
 * functions the live Situation uses (one implementation, two
 * callers). Climate (§8.11) is absent in v1: no mapping-table
 * row covers a climate classification property, so a climate
 * statement is unmapped-and-skip-logged by the translator
 * (see docs/ansci/wikidata-w3-report.md for the reasoning);
 * `climate` is therefore never populated by this slice.
 */
export interface WikidataSituationAssociation {
  qid: string;
  name: string;
  lat: number;
  lon: number;
  hemisphere: "north" | "south" | "equatorial";
  latitudeBand: "polar" | "temperate" | "tropical";
  climate?: string;
  provenanceKind: "derived";
  steps: WikidataSituationStep[];
  /** The retrieved SourceRecord the coordinates came from. */
  source: WikidataNodeRecord["source"];
}

/** The outcome of a situation question over a banked place:
 *  an answer fed by the bank, or a LOCATED decline — an
 *  incomplete (coordinateless) place declines naming the
 *  missing coordinates, never a canonical-profile answer
 *  dressed as the place's own (§3.6, §8.12). */
export type BankedPlaceSituation =
  | {
      kind: "answer";
      place: string;
      qid: string;
      situation: Situation;
      association: WikidataSituationAssociation;
    }
  | { kind: "decline"; place: string; qid?: string; reason: string };

export interface WikidataBankResult {
  addedNodes: number;
  addedAssociations: number;
  /** Records already banked under the same key — the re-bank
   *  changed nothing for these. */
  alreadyBanked: number;
}

const assocKey = (a: WikidataAssociation): string =>
  `${a.fromQid}|${a.type}|${a.toQid}|${a.property}`;

export class WikidataBank {
  private nodesByQid = new Map<string, WikidataNodeRecord>();
  private qidByName = new Map<string, string>();
  private associationsByKey = new Map<string, WikidataAssociation>();
  /** WordNet gloss for the item's name, where the join
   *  proposal's synset candidate supplied one at bank time —
   *  the "where" consumer renders the banked containment at
   *  the gloss's level too. Keyed by QID. */
  private glossByQid = new Map<string, string>();
  /** W3: situation associations by QID, computed at bank time
   *  for nodes carrying coordinates. A banked node with NO
   *  entry here and no coordinates is INCOMPLETE (§3.6). */
  private situationByQid = new Map<string, WikidataSituationAssociation>();

  /** Bank one translation. Idempotent: re-banking the same
   *  translation adds nothing. */
  bankTranslation(translation: WikidataTranslation, glosses?: Map<string, string>): WikidataBankResult {
    let addedNodes = 0;
    let addedAssociations = 0;
    let alreadyBanked = 0;
    for (const node of translation.nodes) {
      if (this.nodesByQid.has(node.qid)) {
        alreadyBanked++;
      } else {
        this.nodesByQid.set(node.qid, node);
        const nameKey = node.name.toLowerCase();
        if (!this.qidByName.has(nameKey)) this.qidByName.set(nameKey, node.qid);
        addedNodes++;
        // W3 (§3.6): a node carrying lat/lon banks its situation
        // associations NOW, computed by the shared §8.10
        // primitives — derived-kind, consuming the retrieved
        // coordinates step (§3.5 rule 2).
        const { lat, lon } = node.properties;
        if (lat !== undefined && lon !== undefined) {
          this.situationByQid.set(node.qid, {
            qid: node.qid,
            name: node.name,
            lat,
            lon,
            hemisphere: hemisphereForLatitude(lat),
            latitudeBand: latitudeBandForLatitude(lat),
            provenanceKind: "derived",
            steps: [
              {
                kind: "retrieved",
                detail: `coordinates ${lat}, ${lon} retrieved from Wikidata (P625) for ${node.qid} — SourceRecord dataset "wikidata", uri ${node.source.uri}, baseVersion ${node.source.baseVersion}, retrievedFrom ${node.source.retrievedFrom}`,
              },
              {
                kind: "derived",
                detail: `hemisphere and latitude band computed from those coordinates by the shared §8.10/§8.11 computation (src/situation.ts hemisphereForLatitude / latitudeBandForLatitude)`,
              },
            ],
            source: node.source,
          });
        }
      }
      const gloss = glosses?.get(node.qid);
      if (gloss && !this.glossByQid.has(node.qid)) this.glossByQid.set(node.qid, gloss);
    }
    for (const assoc of translation.associations) {
      const key = assocKey(assoc);
      if (this.associationsByKey.has(key)) {
        alreadyBanked++;
      } else {
        this.associationsByKey.set(key, assoc);
        addedAssociations++;
      }
    }
    return { addedNodes, addedAssociations, alreadyBanked };
  }

  get nodeCount(): number {
    return this.nodesByQid.size;
  }
  get associationCount(): number {
    return this.associationsByKey.size;
  }

  nodeByName(name: string): WikidataNodeRecord | undefined {
    const qid = this.qidByName.get(name.toLowerCase());
    return qid ? this.nodesByQid.get(qid) : undefined;
  }

  nodeByQid(qid: string): WikidataNodeRecord | undefined {
    return this.nodesByQid.get(qid);
  }

  glossFor(qid: string): string | undefined {
    return this.glossByQid.get(qid);
  }

  associations(): WikidataAssociation[] {
    return [...this.associationsByKey.values()];
  }

  nodes(): WikidataNodeRecord[] {
    return [...this.nodesByQid.values()];
  }

  associationsFrom(name: string, type?: WikidataAssociation["type"]): WikidataAssociation[] {
    const node = this.nodeByName(name);
    if (!node) return [];
    return this.associations().filter(
      (a) => a.fromQid === node.qid && (type === undefined || a.type === type),
    );
  }

  associationsTo(name: string, type?: WikidataAssociation["type"]): WikidataAssociation[] {
    const node = this.nodeByName(name);
    if (!node) return [];
    return this.associations().filter(
      (a) => a.toQid === node.qid && (type === undefined || a.type === type),
    );
  }

  /** The capital of a territory: the CAPITAL_OF association
   *  pointing AT it (P36 inverted at import), or undefined. */
  capitalOf(name: string): WikidataAssociation | undefined {
    return this.associationsTo(name, "CAPITAL_OF")[0];
  }

  /**
   * The LOCATED_IN chain from a place, nearest first: follow
   * LOCATED_IN edges (preferring the administrative P131 at
   * each step for the chain's geography, since P17 country
   * jumps straight to the top), up to `maxDepth` hops, never
   * revisiting a node. Oklahoma → [United States];
   * Oklahoma City → [Oklahoma, United States].
   */
  locatedInChain(name: string, maxDepth = 4): WikidataNodeRecord[] {
    const start = this.nodeByName(name);
    if (!start) return [];
    const chain: WikidataNodeRecord[] = [];
    const seen = new Set<string>([start.qid]);
    let current = start;
    for (let depth = 0; depth < maxDepth; depth++) {
      const out = this.associations().filter((a) => a.fromQid === current.qid && a.type === "LOCATED_IN");
      if (!out.length) break;
      const next = out.find((a) => a.property === "P131") ?? out[0];
      const node = this.nodesByQid.get(next.toQid);
      if (!node || seen.has(node.qid)) break;
      seen.add(node.qid);
      chain.push(node);
      current = node;
    }
    return chain;
  }

  /**
   * The country a place is in: a direct P17 (country)
   * association wins; otherwise the chain is followed and the
   * first node reached THROUGH a P17 edge, else the chain's
   * furthest node, is the answer the banked facts support.
   */
  countryOf(name: string): WikidataNodeRecord | undefined {
    const node = this.nodeByName(name);
    if (!node) return undefined;
    const direct = this.associations().find(
      (a) => a.fromQid === node.qid && a.type === "LOCATED_IN" && a.property === "P17",
    );
    if (direct) return this.nodesByQid.get(direct.toQid);
    // Walk the chain, remembering any P17 landing.
    const seen = new Set<string>([node.qid]);
    let current = node;
    let furthest: WikidataNodeRecord | undefined;
    for (let depth = 0; depth < 4; depth++) {
      const out = this.associations().filter((a) => a.fromQid === current.qid && a.type === "LOCATED_IN");
      if (!out.length) break;
      const p17 = out.find((a) => a.property === "P17");
      const next = p17 ?? out.find((a) => a.property === "P131") ?? out[0];
      const target = this.nodesByQid.get(next.toQid);
      if (!target || seen.has(target.qid)) break;
      if (p17) return target;
      seen.add(target.qid);
      furthest = target;
      current = target;
    }
    return furthest;
  }

  /* ---------------- W3: situation associations ---------------- */

  /** The banked situation association for a place, or undefined
   *  when the place is not banked or is incomplete. */
  situationAssociationFor(name: string): WikidataSituationAssociation | undefined {
    const node = this.nodeByName(name);
    return node ? this.situationByQid.get(node.qid) : undefined;
  }

  /**
   * The §3.6 incomplete flag: a banked node WITHOUT coordinates
   * is incomplete — it can answer capital/containment, but it
   * cannot take part in situation reasoning. Unbanked names are
   * not "incomplete"; they are simply not held (undefined).
   */
  placeCompleteness(name: string): "complete" | "incomplete" | undefined {
    const node = this.nodeByName(name);
    if (!node) return undefined;
    return node.properties.lat !== undefined && node.properties.lon !== undefined
      ? "complete"
      : "incomplete";
  }

  isIncompletePlace(name: string): boolean {
    return this.placeCompleteness(name) === "incomplete";
  }

  /**
   * A situation question over a banked place (the SA-DECEMBER
   * shape: the season/phase at a named place on a date),
   * resolved FROM THE BANK: the banked coordinates feed the
   * SAME code path the live Situation uses — computeSituation
   * (src/situation.ts) — with the location sourced "kb" instead
   * of a configured frame. An incomplete place yields the
   * located decline naming the missing coordinates.
   */
  situationForPlace(name: string, instant: Date, timezone?: string): BankedPlaceSituation {
    const node = this.nodeByName(name);
    if (!node) {
      return { kind: "decline", place: name, reason: `the bank holds no place named '${name}'` };
    }
    const association = this.situationByQid.get(node.qid);
    if (!association) {
      return {
        kind: "decline",
        place: node.name,
        qid: node.qid,
        reason:
          `'${node.name}' is banked from Wikidata (${node.qid}) without coordinates — the banked record is flagged incomplete: ` +
          `it can answer capital and containment questions, but situation reasoning over it cannot proceed until coordinates are held; ` +
          `the missing input is the place's coordinates (Wikidata P625), and no canonical profile is substituted for the place's own`,
      };
    }
    const situation = computeSituation({
      instant,
      ...(timezone ? { timezone } : {}),
      location: { lat: association.lat, lon: association.lon, source: "kb", label: node.name },
    });
    return { kind: "answer", place: node.name, qid: node.qid, situation, association };
  }

  /**
   * SA-TONIGHT in its computed form, over a banked place: the
   * §8.10b night proportion for the place's banked latitude on
   * the date, through the shared computedLightAspect — source
   * "computed", its band the answer's driver. An incomplete
   * place declines located on the missing coordinates (via
   * situationForPlace's flag check).
   */
  nightForPlace(
    name: string,
    instant: Date,
  ):
    | { kind: "answer"; place: string; qid: string; dayOfYear: number; lat: number; yinProportion: number; band: "predominant" | "present" | "faint"; source: "computed"; long: boolean; association: WikidataSituationAssociation }
    | { kind: "decline"; place: string; qid?: string; reason: string } {
    const gate = this.situationForPlace(name, instant);
    if (gate.kind === "decline") return gate;
    const dayOfYear = dayOfYearUTC(instant);
    const light = computedLightAspect(dayOfYear, gate.association.lat);
    return {
      kind: "answer",
      place: gate.place,
      qid: gate.qid,
      dayOfYear,
      lat: gate.association.lat,
      yinProportion: light.yinProportion,
      band: light.band,
      source: light.source,
      long: light.band === "predominant",
      association: gate.association,
    };
  }
}

/** The process-level bank: the store the turn layer reads.
 *  Persists across sessions in this process; not file-backed. */
export const defaultWikidataBank = new WikidataBank();

/* ---------------- the graph mirror (base partition) ---------------- */

export function wikidataGraphNodeId(qid: string): string {
  return `wikidata-${qid.toLowerCase()}`;
}

export function wikidataSourceNodeId(qid: string): string {
  return `wikidata-source-${qid.toLowerCase()}`;
}

/**
 * Mirror a bank's contents into a graph (the session's own),
 * in the KB base partition: one Concept node per banked item
 * (layer "base"; QID, coordinates and neverPropagationAnchor
 * in properties), one source node per subject QID (layer
 * "source"), associations as edges at confidence 0.9 with
 * their provenance in the edge properties, and each subject
 * node linked to its source node by SOURCED_FROM.
 * Idempotent against a graph that already carries the mirror:
 * existing nodes and edges (same from/type/to/property) are
 * left exactly as they stand.
 */
export function mirrorBankIntoGraph(graph: Graph, bank: WikidataBank): { addedNodes: number; addedEdges: number } {
  let addedNodes = 0;
  let addedEdges = 0;
  for (const node of bank.nodes()) {
    const id = wikidataGraphNodeId(node.qid);
    if (!graph.getNode(id)) {
      graph.addNode({
        id,
        name: node.name,
        type: "Concept",
        layer: "base",
        domain: "wikidata",
        summary: `Wikidata item ${node.qid} (retrieved)`,
        properties: {
          wikidataQid: node.qid,
          ...(node.properties.lat !== undefined ? { lat: node.properties.lat } : {}),
          ...(node.properties.lon !== undefined ? { lon: node.properties.lon } : {}),
          // W3: the banked situation associations ride in the
          // mirror — hemisphere/latitude band marked DERIVED
          // (computed from the retrieved coordinates, §3.5 rule
          // 2), and the incomplete flag on coordinateless nodes.
          ...(bank.situationAssociationFor(node.name)
            ? {
                hemisphere: bank.situationAssociationFor(node.name)!.hemisphere,
                latitudeBand: bank.situationAssociationFor(node.name)!.latitudeBand,
                situationProvenance:
                  "derived: hemisphere/latitude band computed by the shared §8.10 computation from the retrieved P625 coordinates",
                situationIncomplete: false,
              }
            : { situationIncomplete: true }),
          neverPropagationAnchor: true,
          provenanceKind: "retrieved",
          sourceDataset: node.source.dataset,
          sourceUri: node.source.uri,
          sourceBaseVersion: node.source.baseVersion,
        },
      });
      addedNodes++;
    }
    const sourceId = wikidataSourceNodeId(node.qid);
    if (!graph.getNode(sourceId)) {
      graph.addNode({
        id: sourceId,
        name: `wikidata:${node.qid}`,
        type: "TextPassage",
        layer: "source",
        sourceTitle: "wikidata",
        properties: {
          dataset: node.source.dataset,
          baseVersion: node.source.baseVersion,
          uri: node.source.uri,
          retrievedFrom: node.source.retrievedFrom,
        },
      });
      addedNodes++;
    }
    const hasSourceEdge = graph
      .outEdges(id, "SOURCED_FROM")
      .some((e) => e.to === sourceId);
    if (!hasSourceEdge) {
      graph.addEdge({ from: id, to: sourceId, type: "SOURCED_FROM" });
      addedEdges++;
    }
  }
  for (const assoc of bank.associations()) {
    const from = wikidataGraphNodeId(assoc.fromQid);
    const to = wikidataGraphNodeId(assoc.toQid);
    if (!graph.getNode(from) || !graph.getNode(to)) continue;
    const exists = graph
      .outEdges(from, assoc.type)
      .some((e) => e.to === to && e.properties?.wikidataProperty === assoc.property);
    if (exists) continue;
    graph.addEdge({
      from,
      to,
      type: assoc.type,
      confidence: assoc.confidence,
      properties: {
        provenanceKind: "retrieved",
        wikidataProperty: assoc.property,
        sourceDataset: assoc.source.dataset,
        sourceUri: assoc.source.uri,
        sourceBaseVersion: assoc.source.baseVersion,
        neverPropagationAnchor: true,
      },
    });
    addedEdges++;
  }
  return { addedNodes, addedEdges };
}

/** Slug helper kept for callers that name graph nodes from
 *  item names (the mirror itself keys by QID). */
export function wikidataNameSlug(name: string): string {
  return slugify(name);
}
