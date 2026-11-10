/**
 * everydaysense.ts — EverydaySense, the common-sense module
 * (design §5; the user's chosen name — plain, descriptive, and
 * impossible to confuse with CSKG).
 *
 * EverydaySense holds the engine's standing judgements of
 * ORDINARINESS: which reading of a word is the default one,
 * which attested facts are typical of a thing and which are
 * exotic. Discipline (the design's, kept here): it stores NO
 * world facts — it can never become a shadow knowledge base.
 * Its judgements are DERIVED from the graph's own statistics,
 * plus a small, visible set of curated defaults (below) for
 * cases where the measured statistics mislead; consumers are
 * the AmbiguityResolver (resolver.ts), the Definitions sense
 * choice (definitions.ts, for its default when context is
 * silent), and solve's ranking floor (the typicality measure).
 *
 * The derivations, all over CSKG's own structure:
 *
 *   FILING CLUSTERS. A merged node's senses live in its IsA
 *   filing: each 1-hop IsA target belongs to a sense's world.
 *   Targets whose worlds meet (one parents another, or they
 *   share a parent) form one cluster; a cluster's MASS is the
 *   summed dataset support of its filing edges, and its SHARE
 *   is that mass over the whole filing. "Cold" files under
 *   temperature (one edge) and under respiratory disease /
 *   communicable disease / disease (one illness world filed
 *   at two depths): the illness cluster outweighs the
 *   temperature cluster in cold's own filings — the graph's
 *   centre of mass IS a typicality judgement, and it is the
 *   resolver's everyday default.
 *
 *   TYPICALITY of a fact about a subject: the specificity-
 *   weighted neighbourhood affinity between the fact's other
 *   endpoint and the subject — a use that lives in the
 *   subject's world is typical of it; an exotic one shares
 *   only hubs. This measure was born in solve (E3) as the
 *   within-node fit; the E3 note flagged it as "a local
 *   precursor of EverydaySense typicality", and E4 moves it
 *   here, to its designed home. The numbers do not change.
 *
 *   CONTEXT TAGS. The node's /r/HasContext tags are the graph's
 *   own statement of where a reading lives (brother → religion,
 *   roman catholic); they ride along in EverydaySense's reports
 *   as evidence, not as a separate channel.
 */
import type { CskgGraph } from "./loader";
import type { Standing } from "./standing";

/* ---------------- typicality: neighbourhood affinity ------------
 *
 * Moved from solve.ts (E3), numerically unchanged: specificity-
 * weighted overlap of two nodes' neighbourhoods — a shared
 * neighbour counts 3 when it is specific (degree ≤ 120), 1 when
 * mid-frequency (≤ 600), 0 when it is a hub (a hub neighbour is
 * shared with everything and says nothing). The two nodes
 * themselves never count.
 */

const hoodCache = new WeakMap<CskgGraph, Map<number, Set<number>>>();

export function neighbourhoodOf(g: CskgGraph, id: number, cap = 800): Set<number> {
  let per = hoodCache.get(g);
  if (!per) {
    per = new Map();
    hoodCache.set(g, per);
  }
  let hood = per.get(id);
  if (hood) return hood;
  hood = new Set<number>();
  for (const e of g.outEdges(id)) {
    hood.add(e.to);
    if (hood.size >= cap) break;
  }
  if (hood.size < cap) {
    for (const e of g.inEdgesFor(id)) {
      hood.add(e.from);
      if (hood.size >= cap) break;
    }
  }
  per.set(id, hood);
  return hood;
}

function idfWeight(degree: number): number {
  return degree <= 120 ? 3 : degree <= 600 ? 1 : 0;
}

/** Specificity-weighted neighbourhood overlap of two nodes. */
export function affinityBetween(g: CskgGraph, a: number, b: number): number {
  if (a === b) return 0;
  const ha = neighbourhoodOf(g, a);
  const hb = neighbourhoodOf(g, b);
  const [small, big] = ha.size <= hb.size ? [ha, hb] : [hb, ha];
  let fit = 0;
  for (const x of small) {
    if (x === a || x === b) continue;
    if (big.has(x)) fit += idfWeight(g.degree(x));
  }
  return fit;
}

/**
 * Typicality of `target` as a fact about `subject`, on the same
 * scale as affinityBetween: 0 is exotic (no shared world but
 * hubs), higher is more ordinary. Solve's ranking floor reads
 * it as "affinity"; the name here is what the judgement IS.
 */
export function typicalityOf(g: CskgGraph, subjectId: number, targetId: number): number {
  return affinityBetween(g, subjectId, targetId);
}

/* ---------------- filing clusters ------------------------------- */

export interface FilingTarget {
  id: number;
  text: string;
  support: number;
}

export interface FilingCluster {
  /** the grouping parent: an IsA target of the filing targets */
  anchorId: number;
  anchorText: string;
  /** the term's 1-hop IsA targets filed under this anchor */
  targets: FilingTarget[];
  /** summed dataset support of those filing edges */
  mass: number;
  /** mass over the whole filing's mass */
  share: number;
}

/**
 * Group a term's 1-hop IsA filing into sense clusters. Two
 * filing targets belong to one cluster when their worlds meet:
 * one is the other's IsA parent, or they share an IsA parent.
 * (Grouping by parent alone fragments real senses: cold files
 * under respiratory disease, communicable disease AND disease —
 * one illness world filed at two depths — while temperature
 * stands alone. The component rule keeps the sense whole.) A
 * cluster's anchor is the member that parents the most other
 * members — the sense's own name inside the filing — or, for a
 * sibling-only cluster, the shared parent. Deterministic:
 * clusters sort by mass, then anchor text; targets by support,
 * then text.
 */
export function filingClusters(g: CskgGraph, termId: number): FilingCluster[] {
  const filing = g.outEdges(termId, "/r/IsA");
  const total = filing.reduce((s, e) => s + e.support, 0);
  if (!filing.length || total === 0) return [];
  const targets: FilingTarget[] = filing.map((e) => ({
    id: e.to,
    text: g.terms[e.to],
    support: e.support,
  }));
  const parentsOf = new Map<number, number[]>();
  for (const t of targets) {
    parentsOf.set(t.id, g.outEdges(t.id, "/r/IsA").map((e) => e.to));
  }
  // union-find over the filing targets
  const parent = new Map<number, number>(targets.map((t) => [t.id, t.id]));
  const find = (x: number): number => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    return r;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };
  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      const a = targets[i];
      const b = targets[j];
      const pa = parentsOf.get(a.id)!;
      const pb = parentsOf.get(b.id)!;
      if (
        pa.includes(b.id) ||
        pb.includes(a.id) ||
        pa.some((p) => pb.includes(p))
      ) {
        union(a.id, b.id);
      }
    }
  }
  const groups = new Map<number, FilingTarget[]>();
  for (const t of targets) {
    const root = find(t.id);
    const arr = groups.get(root);
    if (arr) arr.push(t);
    else groups.set(root, [t]);
  }
  const clusters: FilingCluster[] = [...groups.values()].map((members) => {
    // anchor: the member parenting the most fellow members;
    // else the strongest shared parent; else the top member.
    let anchorId = -1;
    let bestCount = 0;
    for (const m of members) {
      const count = members.filter(
        (o) => o.id !== m.id && parentsOf.get(o.id)!.includes(m.id),
      ).length;
      if (count > bestCount) {
        bestCount = count;
        anchorId = m.id;
      }
    }
    if (anchorId < 0) {
      const shared = new Map<number, number>();
      for (const m of members) {
        for (const p of parentsOf.get(m.id)!) {
          shared.set(p, (shared.get(p) ?? 0) + 1);
        }
      }
      const topShared = [...shared.entries()].sort(
        (a, b) => b[1] - a[1] || g.terms[a[0]].localeCompare(g.terms[b[0]]),
      )[0];
      anchorId = topShared ? topShared[0] : members[0].id;
    }
    const mass = members.reduce((s, t) => s + t.support, 0);
    return {
      anchorId,
      anchorText: g.terms[anchorId],
      targets: members.sort(
        (a, b) => b.support - a.support || a.text.localeCompare(b.text),
      ),
      mass,
      share: mass / total,
    };
  });
  clusters.sort((a, b) => b.mass - a.mass || a.anchorText.localeCompare(b.anchorText));
  return clusters;
}

/**
 * The dominant filing cluster: the largest, when it carries at
 * least `minShare` of the filing AND leads the runner-up by at
 * least `minLead`. Null when the filing has no centre of mass —
 * a genuinely balanced term has no everyday default, and the
 * resolver (not this module) decides what happens then.
 */
export function dominantCluster(
  g: CskgGraph,
  termId: number,
  minShare = 0.4,
  minLead = 0.12,
): FilingCluster | null {
  const clusters = filingClusters(g, termId);
  if (!clusters.length) return null;
  const top = clusters[0];
  const second = clusters[1];
  if (top.share < minShare) return null;
  if (second && top.share - second.share < minLead) return null;
  return top;
}

/** Graph ids a cluster's evidence covers: its targets and its anchor. */
export function clusterEvidenceIds(cluster: FilingCluster): Set<number> {
  const out = new Set<number>([cluster.anchorId]);
  for (const t of cluster.targets) out.add(t.id);
  return out;
}

/* ---------------- curated defaults ------------------------------
 *
 * The visible curated set: everyday defaults the MEASURED graph
 * statistics get wrong, entered by hand with the measurement
 * that forced the entry. This list is deliberately short — an
 * entry is an admission that derivation failed somewhere, and
 * each names its evidence so a later slice can retire it when
 * the statistics improve. Derivation first, curation last.
 */

export interface CuratedDefault {
  term: string;
  /** the anchor text of the cluster that is the everyday default */
  reading: string;
  /** the measurement that forced the entry */
  note: string;
}

export const CURATED_DEFAULTS: CuratedDefault[] = [
  // (populated only by measurement; see defaultReading's report)
];

/* ---------------- the default reading --------------------------- */

export interface DefaultReading {
  term: string;
  /** all filing clusters, largest first */
  clusters: FilingCluster[];
  /** the everyday default cluster, or null when there is none */
  default: FilingCluster | null;
  /** how the default was arrived at */
  basis: "filing mass" | "curated" | "none";
  /** the default's standing: derived judgements carry their axes */
  standing: Standing;
  /** the term's HasContext tags — the graph's own register marks */
  contexts: string[];
}

/**
 * EverydaySense's headline judgement: the default reading of a
 * term, from its filing's centre of mass (or the curated set).
 * The standing is honest about what kind of judgement this is:
 * certainty rides the dominant share (a 3:1 filing is a held
 * judgement, not knowledge), clarity rides the lead over the
 * runner-up, knownnessFelt is 0 — a standing judgement is not
 * something this conversation has established.
 */
export function defaultReading(g: CskgGraph, termText: string): DefaultReading | null {
  const id = g.id(termText);
  if (id === undefined) return null;
  const clusters = filingClusters(g, id);
  const contexts = g.contextsOf(id).slice(0, 8);
  const curated = CURATED_DEFAULTS.find((c) => c.term === termText);
  let def: FilingCluster | null = null;
  let basis: DefaultReading["basis"] = "none";
  if (curated) {
    def = clusters.find((c) => c.anchorText === curated.reading) ?? null;
    if (def) basis = "curated";
  }
  if (!def) {
    def = dominantCluster(g, id);
    if (def) basis = "filing mass";
  }
  const second = clusters.find((c) => c !== def);
  const standing: Standing = def
    ? {
        certainty: 0.35 + 0.5 * def.share,
        clarity: Math.min(0.95, 0.4 + (def.share - (second?.share ?? 0))),
        knownnessFelt: 0,
      }
    : { certainty: 0, clarity: 0.25, knownnessFelt: 0 };
  return { term: termText, clusters, default: def, basis, standing, contexts };
}

/** One trace line for a default-reading judgement. */
export function defaultReadingTrace(r: DefaultReading): string {
  const clusters = r.clusters
    .map((c) => `${c.anchorText} ${c.mass} (${c.share.toFixed(2)})`)
    .join(" · ");
  return (
    `everydaysense: "${r.term}" filing clusters [${clusters || "none"}]; ` +
    (r.default
      ? `default: ${r.default.anchorText} by ${r.basis} (share ${r.default.share.toFixed(2)})`
      : "no everyday default") +
    (r.contexts.length ? `; contexts: ${r.contexts.join(", ")}` : "")
  );
}
