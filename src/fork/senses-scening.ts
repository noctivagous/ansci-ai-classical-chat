/**
 * senses-scening.ts — the Senses-Scening Unit (lpu/senses-scening-unit):
 * language's production of the senses/scene part of a semantic
 * object, over the SenseUnit's authority (sense-unit.ts).
 *
 * THE SCENE IS MULTI-SENSORY (owner's revision, 2026-11-17): a
 * description of a nature scene has sight, sound, smell, etc.
 * bound into ONE scene — the entities described, their sensory
 * qualities across whichever channels are present, and the
 * spatial arrangement where the sentence gives one. (This
 * supersedes the earlier vision-only "Imaging-Scening" framing.)
 *
 * THE SCENE GRAPH IS PERSISTENT (owner's design addition,
 * 2026-11-17): scenes live in the Session (session.scenes) and
 * persist across the conversation. Before producing a fragment
 * this unit consults the running scene; a fragment is placed
 * INTO it — entities referenced, not re-minted — and the
 * object's senses face references the running scene's id and
 * records what this turn adds/extends. A turn with no
 * established scene starts one when it carries scene content.
 *
 * THE DESIGN CALL on what counts as a scene (made here, pinned
 * in test/fork-senses.test.ts): a scene is recorded whenever a
 * fragment carries scene content — any channel entry, or a
 * spatial arrangement / location predication over described
 * entities. A single quality statement ("The soup is salty") is
 * a minimal scene (one entity, one taste quality); a turn with
 * no sensory or scene content ("Hello", "What time is it?")
 * records every channel none and no scene.
 *
 * SPATIAL FACULTIES (owner's design note, 2026-11-17): the unit
 * PLACES things that enter a scene without a stated location.
 * Three tiers of spatial fact, kept distinct in the scene graph:
 * SAID (the sentence states it), PLACED-BY-SCENE (the fragment's
 * located entities are contained in the running scene's
 * container), DEFAULT-PLACED (the faculty's own coarse placement
 * — in-or-near the container — for an entity with no stated or
 * placed location). Placements are qualitative and coarse — a
 * region, never coordinates or invented specifics; the exact
 * position stays an UNKNOWN slot on the entity. Placements are
 * defeasible: a later, stronger-tier relation for the same
 * figure supersedes a placed one (supersededTurn, never an edit
 * in place).
 *
 * UNKNOWN SLOTS (owner's ruling, 2026-11-17): slots live ON the
 * scene graph in Session storage; Session & Situation's
 * open-unknowns register is a derived view (listOpenUnknowns in
 * session.ts) — one source of truth.
 *
 * QUANTIFICATION (owner's note, 2026-11-17): the
 * QuantificationUnit was named during this arc, and its one
 * immediate scene consequence was implemented here: a
 * "between" relation's landmark is TWO distinct entities
 * (bathroom-1, bathroom-2), not a single plural node. The
 * family itself was placed and built later the same day —
 * see quantification.ts (the authority, inside the OKU),
 * units-measurement.ts and quantification-language.ts.
 *
 * STATED VS DERIVED: only what the sentence says enters the
 * face. Implied channels/values (overripe → smell/sweetness/
 * softness) are Coherence's derived-tier trail annotations,
 * filed in the SenseUnit (crossChannelImplications) — never
 * entries here.
 */
import type { ParsedSentence, MeaningNode } from "./sentence";
import type { Session, SceneGraph } from "./session";
import { currentScene, holderOf } from "./session";
import {
  SENSE_CHANNELS,
  type SenseChannel,
  type SenseEntry,
  type SceneFace,
  type SceneRelationRecord,
  type SensesFace,
} from "./semantic-object";
import { senseReadingForWord, unknownSlotsFor } from "./sense-unit";

/**
 * The bridge vocabulary: words for discriminations the SenseUnit
 * files as KINDS (Xunzi's lists) but the OKU does not file as
 * English value words. This mapping is language's, so it lives
 * here, in the bridge — parallel to the LEDU's CANONICAL_FACE
 * bridge. No phase is claimed for these readings: the OKU files
 * none for them, and none is invented.
 */
const BRIDGE_VOCABULARY: Record<string, { channel: SenseChannel; discrimination: string; basis: string }> = {
  // sight — appearance and visible state (Xunzi: beautiful/ugly)
  overripe: { channel: "sight", discrimination: "appearance", basis: "ripeness is read off the fruit's visible state" },
  beautiful: { channel: "sight", discrimination: "appearance", basis: "Xunzi, Rongru: the eye distinguishes beautiful/ugly" },
  ugly: { channel: "sight", discrimination: "appearance", basis: "Xunzi, Rongru: the eye distinguishes beautiful/ugly" },
  // hearing — sound events and qualities (Xunzi: tones clear/muddy)
  sing: { channel: "hearing", discrimination: "sound", basis: "a sound event; the ear's dust is sound" },
  sang: { channel: "hearing", discrimination: "sound", basis: "a sound event; the ear's dust is sound" },
  song: { channel: "hearing", discrimination: "sound", basis: "the ear's dust is sound" },
  sound: { channel: "hearing", discrimination: "sound", basis: "the ear's dust, named" },
  music: { channel: "hearing", discrimination: "sound", basis: "tones, the ear's discrimination" },
  loud: { channel: "hearing", discrimination: "sound", basis: "a sound's volume; tones clear/muddy is the filed kind" },
  loudly: { channel: "hearing", discrimination: "sound", basis: "a sound's volume; tones clear/muddy is the filed kind" },
  noise: { channel: "hearing", discrimination: "sound", basis: "the ear's dust is sound" },
  // smell — the faculty act and Xunzi's fetid pole (fragrant
  // itself is filed in the OKU's odour row and resolves there)
  smell: { channel: "smell", discrimination: "odour", basis: "the nose's act / an emitted odour" },
  smells: { channel: "smell", discrimination: "odour", basis: "the nose's act / an emitted odour" },
  scent: { channel: "smell", discrimination: "odour", basis: "an odour, the nose's dust" },
  fetid: { channel: "smell", discrimination: "odour", basis: "Xunzi, Rongru: the nose distinguishes fragrant/fetid" },
  // touch — texture and sensation kinds (temperature words are
  // filed in the OKU and resolve through the authority)
  soft: { channel: "touch", discrimination: "texture", basis: "the touch dust's own values" },
  hard: { channel: "touch", discrimination: "texture", basis: "the touch dust's own values" },
  rough: { channel: "touch", discrimination: "texture", basis: "the touch dust's own values" },
  smooth: { channel: "touch", discrimination: "texture", basis: "the touch dust's own values" },
  itching: { channel: "touch", discrimination: "sensation", basis: "Xunzi, Rongru: skin distinguishes pain/itching" },
};

/** One node's sense entry, if the sentence's use of it is a
 *  sensory statement: the SenseUnit's reading first (the OKU's
 *  filed rows), then the bridge vocabulary. The value is the
 *  word as said (retention); classification rides alongside. */
export function senseEntryForNode(node: MeaningNode): SenseEntry | undefined {
  const lemma = node.lemma.toLowerCase();
  const auth = senseReadingForWord(lemma);
  if (auth) {
    return {
      nodeId: node.id,
      value: node.lemma,
      discrimination: auth.discrimination,
      element: auth.element,
      tier: auth.tier,
      source: auth.source,
    };
  }
  const b = BRIDGE_VOCABULARY[lemma];
  if (b) {
    return {
      nodeId: node.id,
      value: node.lemma,
      discrimination: b.discrimination,
      source: `Senses-Scening bridge vocabulary: ${b.basis} (no phase filed in the OKU)`,
    };
  }
  return undefined;
}

/** Function words that parse as thing-nodes but describe no
 *  entity (conjunctions, preposition husks, the between-node). */
const FUNCTION_LEMMAS = new Set(["and", "or", "over", "for", "between", "of", "a", "an", "the"]);

export interface SceneFragment {
  entries: SenseEntry[];
  /** Described-entity nodes (things and the person), in order. */
  entityNodes: MeaningNode[];
  /** Spatial relations the fragment STATES (tier "said"). */
  arrangements: SceneRelationRecord[];
}

function nodeById(parsed: ParsedSentence, id: string): MeaningNode | undefined {
  return parsed.meaning.nodes.find((n) => n.id === id);
}

/** The scene-entity lemma for a node: pronouns resolve to their
 *  discourse holder ("i" → "you"), as the graph records them. */
export function entityLemma(node: MeaningNode): string {
  const h = holderOf(node.lemma);
  return (h ?? node.lemma).toLowerCase();
}

export function isPersonNode(node: MeaningNode): boolean {
  return entityLemma(node) === "you";
}

/** The two landmarks of a "between" relation (the
 *  QuantificationUnit's one immediate scene consequence). */
export function betweenLandmarks(groundLemma: string): [string, string] {
  return [`${groundLemma}-1`, `${groundLemma}-2`];
}

/**
 * Compute a parsed sentence's scene fragment: its sense entries,
 * its described entities, and the spatial relations it states.
 * Pure — reads the parse only; the session is consulted by
 * buildSensesFace / applySceneUpdate.
 */
export function computeFragment(parsed: ParsedSentence): SceneFragment {
  const entries: SenseEntry[] = [];
  for (const n of parsed.meaning.nodes) {
    const e = senseEntryForNode(n);
    if (e) entries.push(e);
  }
  const entryIds = new Set(entries.map((e) => e.nodeId));
  const entityNodes = parsed.meaning.nodes.filter(
    (n) =>
      n.syntacticElement === "Earth" &&
      !n.questionWord &&
      !FUNCTION_LEMMAS.has(n.lemma.toLowerCase()) &&
      !entryIds.has(n.id),
  );
  const entityIds = new Set(entityNodes.map((n) => n.id));

  const root = nodeById(parsed, parsed.meaning.rootId);
  const arrangements: SceneRelationRecord[] = [];
  const seen = new Set<string>();
  const addArrangement = (a: SceneRelationRecord) => {
    const key = `${a.figure}|${a.relation}|${a.ground}`;
    if (!seen.has(key)) {
      seen.add(key);
      arrangements.push(a);
    }
  };
  const agentOf = (verbId: string): MeaningNode | undefined => {
    const e = parsed.meaning.edges.find((x) => x.from === verbId && x.relation === "agent");
    return e ? nodeById(parsed, e.to) : undefined;
  };

  for (const edge of parsed.meaning.edges) {
    const from = nodeById(parsed, edge.from);
    const to = nodeById(parsed, edge.to);
    if (!from || !to) continue;
    if (edge.relation === "location" && entityIds.has(to.id)) {
      // The located figure: the verb's agent, or the edge's own
      // source when the source is itself an entity ("I … at the
      // airport", copula subjects).
      const figure = edge.from === parsed.meaning.rootId && root?.role === "verb" ? agentOf(edge.from) : from;
      if (figure && entityIds.has(figure.id)) {
        const label =
          root?.role === "verb" && edge.from === parsed.meaning.rootId
            ? `${root.form ?? root.lemma}${to.prep ? `-${to.prep}` : ""}`
            : (to.prep ?? "at");
        addArrangement({
          figure: entityLemma(figure), figureNodeId: figure.id,
          relation: label,
          ground: entityLemma(to), groundNodeId: to.id,
          tier: "said",
        });
      }
    }
    if (edge.relation === "goal" && entityIds.has(to.id)) {
      const figure = agentOf(edge.from) ?? from;
      if (entityIds.has(figure.id)) {
        addArrangement({
          figure: entityLemma(figure), figureNodeId: figure.id,
          relation: `${from.form ?? from.lemma}-${to.prep ?? "to"}`,
          ground: entityLemma(to), groundNodeId: to.id,
          tier: "said",
        });
      }
    }
  }

  // "between": the parser leaves the between-node and the
  // landmark as loose nodes; the figure is the fragment's located
  // entity (a goal/location ground), the landmark the other
  // described thing.
  const betweenNode = parsed.meaning.nodes.find((n) => n.lemma.toLowerCase() === "between");
  if (betweenNode) {
    const located = arrangements.find((a) => a.relation.endsWith("-to") || a.relation.includes("-"))?.ground;
    const figureLemma = located ?? arrangements[0]?.ground;
    const landmark = entityNodes.find(
      (n) => !isPersonNode(n) && entityLemma(n) !== figureLemma && entityLemma(n) !== "between",
    );
    if (figureLemma && landmark) {
      addArrangement({
        figure: figureLemma,
        relation: "between",
        ground: entityLemma(landmark), groundNodeId: landmark.id,
        tier: "said",
      });
    }
  }

  return { entries, entityNodes, arrangements };
}

function emptyChannels(): Record<SenseChannel, SenseEntry[] | null> {
  const out = {} as Record<SenseChannel, SenseEntry[] | null>;
  for (const c of SENSE_CHANNELS) out[c] = null;
  return out;
}

function channelsOf(entries: SenseEntry[]): Record<SenseChannel, SenseEntry[] | null> {
  const out = emptyChannels();
  for (const e of entries) {
    // The entry's channel is re-derived from its node value via
    // the same lookup chain, so the face and the authority can
    // never disagree about which channel an entry sits on.
    const auth = senseReadingForWord(e.value);
    const channel = auth?.channel ?? BRIDGE_VOCABULARY[e.value.toLowerCase()]?.channel;
    if (channel) (out[channel] ??= []).push(e);
  }
  return out;
}

/**
 * Build a semantic object's senses face from a parse.
 * - mode "describe" (person objects, at assessment): the face
 *   references the Session's running scene — establishing one if
 *   none stands and the fragment carries scene content — and
 *   records this turn's arrangements, placements and unknown
 *   slot changes. The scene graph itself is updated separately
 *   by applySceneUpdate, after the object is recorded (the
 *   assessment reads the session before recording, as it does
 *   for the object stream).
 * - mode "reference" (reply objects): the face never mutates
 *   anything; its scene, when the reply graph carries scene
 *   content and a scene stands, is a reference to it.
 */
export function buildSensesFace(
  parsed: ParsedSentence,
  session: Session | undefined,
  mode: "describe" | "reference",
): SensesFace {
  const frag = computeFragment(parsed);
  const channels = channelsOf(frag.entries);
  const hasEntries = frag.entries.length > 0;
  const hasSceneContent = hasEntries || frag.arrangements.length > 0;
  if (!hasSceneContent) return { channels };

  const running = session ? currentScene(session) : undefined;

  if (mode === "reference") {
    if (!running) return { channels };
    return {
      channels,
      scene: {
        id: running.id,
        role: "references",
        entities: frag.entityNodes.map((n) => n.id),
        arrangements: frag.arrangements,
        placed: [],
        unknownsOpened: [],
        unknownsFilled: [],
      },
    };
  }

  const role: SceneFace["role"] = running ? "extends" : "establishes";
  const sceneId = running ? running.id : `scene-${(session?.scenes.length ?? 0) + 1}`;
  const container = running?.container ?? frag.arrangements.find((a) => a.ground && a.relation !== "between")?.ground;
  const placed: SceneRelationRecord[] = [];
  const unknownsOpened: { of: string; kind: string }[] = [];
  const unknownsFilled: { of: string; kind: string; value: string }[] = [];

  if (running) {
    const standing = new Set(running.entities.map((e) => e.lemma));
    const locatedFigures = new Set(
      frag.arrangements
        .filter((a) => a.tier === "said" && a.relation !== "between" && a.figure !== container)
        .map((a) => a.ground),
    );
    const betweenGrounds = new Set(
      frag.arrangements.filter((a) => a.relation === "between").map((a) => a.ground),
    );
    const arrangedLemmas = new Set(frag.arrangements.flatMap((a) => [a.figure, a.ground]));
    for (const n of frag.entityNodes) {
      const lemma = entityLemma(n);
      if (isPersonNode(n) || lemma === running.container || standing.has(lemma)) continue;
      if (container && locatedFigures.has(lemma)) {
        // Containment assignment: the fragment's located entity
        // is placed into the running scene's container.
        placed.push({
          figure: lemma, figureNodeId: n.id, relation: "in", ground: container,
          tier: "placed-by-scene", basis: "placed-by-scene: the fragment was placed into the running scene",
        });
      } else if (container && betweenGrounds.has(lemma)) {
        // A between landmark: TWO distinct entities, each
        // default-placed (proximity default) — the landmark has
        // a stated relation but no location in the scene.
        for (const lm of betweenLandmarks(lemma)) {
          placed.push({
            figure: lm, relation: "in-or-near", ground: container,
            tier: "default-placed", basis: "spatial faculty default placement: no stated location; coarse region only",
          });
          unknownsOpened.push({ of: lm, kind: "exact-location" });
        }
      } else if (container && !arrangedLemmas.has(lemma)) {
        // Proximity default for a merely-mentioned entity: one
        // with no stated spatial relation at all. (An entity
        // standing in a said arrangement — Chicago, as the
        // ground the airport is in — already has its spatial
        // fact; the faculty does not also place it.)
        placed.push({
          figure: lemma, figureNodeId: n.id, relation: "in-or-near", ground: container,
          tier: "default-placed", basis: "spatial faculty default placement: no stated location; coarse region only",
        });
        unknownsOpened.push({ of: lemma, kind: "exact-location" });
      }
    }
    // Filed unknown-slot rules for entities this turn brings in
    // (and for the container itself when newly referenced).
    for (const n of frag.entityNodes) {
      const lemma = entityLemma(n);
      if (standing.has(lemma)) continue;
      for (const kind of unknownSlotsFor(lemma)) {
        if (!running.unknowns.some((u) => u.of === lemma && u.kind === kind)) {
          unknownsOpened.push({ of: lemma, kind });
        }
      }
    }
    // Unknown fills: an open slot whose entity this fragment
    // locates with "in" ("The airport is in Chicago").
    for (const slot of running.unknowns) {
      if (slot.status !== "open") continue;
      const mentioned = frag.entityNodes.some((n) => entityLemma(n) === slot.of);
      if (!mentioned) continue;
      const filler = parsed.meaning.nodes.find(
        (nd) => nd.prep === "in" && entityLemma(nd) !== slot.of && nd.syntacticElement === "Earth",
      );
      if (filler) unknownsFilled.push({ of: slot.of, kind: slot.kind, value: entityLemma(filler) });
    }
  } else {
    // Establishing: filed unknown-slot rules open on the new
    // scene's entities (the airport's city).
    for (const n of frag.entityNodes) {
      for (const kind of unknownSlotsFor(entityLemma(n))) {
        unknownsOpened.push({ of: entityLemma(n), kind });
      }
    }
  }

  return {
    channels,
    scene: {
      id: sceneId,
      role,
      entities: frag.entityNodes.map((n) => n.id),
      arrangements: frag.arrangements,
      placed,
      unknownsOpened,
      unknownsFilled,
    },
  };
}

const TIER_RANK: Record<SceneRelationRecord["tier"], number> = {
  "said": 3,
  "placed-by-scene": 2,
  "default-placed": 1,
};

/** Does a standing relation's figure match a fragment figure,
 *  counting a between-landmark pair (bathroom-1/-2) as their
 *  plural's figure? */
function figureMatches(standingFigure: string, figure: string): boolean {
  return standingFigure === figure || standingFigure === `${figure}-1` || standingFigure === `${figure}-2`;
}

/**
 * Apply a described fragment to the Session's scene storage:
 * establish or extend the running scene graph from the object's
 * senses face. Called by the turn loop after the object is
 * recorded (assessment computed the face against the scene as it
 * stood before this turn).
 */
export function applySceneUpdate(session: Session, parsed: ParsedSentence, face: SensesFace, turn: number): void {
  const sf = face.scene;
  if (!sf || sf.role === "references") return;
  const frag = computeFragment(parsed);

  let scene: SceneGraph | undefined = currentScene(session);
  if (sf.role === "establishes" || !scene) {
    scene = { id: sf.id, establishedTurn: turn, entities: [], relations: [], unknowns: [], events: [] };
    session.scenes.push(scene);
  }
  if (!scene.container) {
    const loc = sf.arrangements.find((a) => a.relation !== "between" && a.ground !== entityLemma(frag.entityNodes[0] ?? { lemma: "" } as MeaningNode));
    const first = sf.arrangements.find((a) => a.relation !== "between");
    scene.container = (loc ?? first)?.ground;
  }

  // Entities: referenced, not re-minted. A between landmark is
  // registered as its two distinct entities; a later plural
  // mention touches both.
  const betweenGrounds = new Set(sf.arrangements.filter((a) => a.relation === "between").map((a) => a.ground));
  const registerEntity = (lemma: string, kind: "person" | "thing") => {
    const pair = scene!.entities.filter((e) => e.lemma === `${lemma}-1` || e.lemma === `${lemma}-2`);
    if (pair.length === 2 && !scene!.entities.some((e) => e.lemma === lemma)) {
      for (const e of pair) e.lastTurn = turn;
      return pair;
    }
    let rec = scene!.entities.find((e) => e.lemma === lemma);
    if (!rec) {
      rec = { lemma, kind, firstTurn: turn, lastTurn: turn, qualities: [] };
      scene!.entities.push(rec);
    } else {
      rec.lastTurn = turn;
    }
    return [rec];
  };
  for (const n of frag.entityNodes) {
    const lemma = entityLemma(n);
    const kind = isPersonNode(n) ? "person" : "thing";
    if (betweenGrounds.has(lemma)) {
      for (const lm of betweenLandmarks(lemma)) registerEntity(lm, "thing");
    } else {
      registerEntity(lemma, kind);
    }
  }

  // Qualities: entries attach to the entity they qualify (a
  // qualifies edge), predicate of (a predicate edge's subject),
  // or — for a verb's own entry (sang) — the verb's agent.
  const attachTarget = (entryNodeId: string): string | undefined => {
    const q = parsed.meaning.edges.find((e) => e.from === entryNodeId && e.relation === "qualifies");
    if (q) {
      const t = nodeById(parsed, q.to);
      if (t) return entityLemma(t);
    }
    const p = parsed.meaning.edges.find((e) => e.to === entryNodeId && e.relation === "predicate");
    if (p) {
      const s = nodeById(parsed, p.from);
      if (s) return entityLemma(s);
    }
    const th = parsed.meaning.edges.find((e) => e.to === entryNodeId && e.relation === "theme");
    if (th) {
      // A quality carried as a verb's theme describes the
      // verb's patient ("sang over the green hills" — green
      // describes the hills).
      const pat = parsed.meaning.edges.find((e) => e.from === th.from && e.relation === "patient");
      const pn = pat ? nodeById(parsed, pat.to) : undefined;
      if (pn) return entityLemma(pn);
    }
    const node = nodeById(parsed, entryNodeId);
    if (node?.role === "verb") {
      const a = parsed.meaning.edges.find((e) => e.from === entryNodeId && e.relation === "agent");
      const ag = a ? nodeById(parsed, a.to) : undefined;
      if (ag) return entityLemma(ag);
    }
    return undefined;
  };
  for (const e of frag.entries) {
    const target = attachTarget(e.nodeId);
    if (!target) continue;
    const auth = senseReadingForWord(e.value);
    const channel = auth?.channel ?? BRIDGE_VOCABULARY[e.value.toLowerCase()]?.channel;
    if (!channel) continue;
    for (const rec of scene.entities.filter((x) => x.lemma === target)) {
      if (!rec.qualities.some((x) => x.channel === channel && x.value === e.value && x.turn === turn)) {
        rec.qualities.push({ channel, value: e.value, turn });
      }
    }
  }

  // Relations: said first, then placed — each new relation
  // supersedes weaker-tier standing relations for its figure.
  const addRelation = (r: SceneRelationRecord) => {
    for (const s of scene!.relations) {
      if (!s.supersededTurn && figureMatches(s.figure, r.figure) && TIER_RANK[s.tier] < TIER_RANK[r.tier]) {
        s.supersededTurn = turn;
      }
    }
    if (r.relation === "between") {
      for (const lm of betweenLandmarks(r.ground)) {
        scene!.relations.push({ figure: r.figure, relation: "between", ground: lm, tier: r.tier, basis: r.basis, turn });
      }
      return;
    }
    scene!.relations.push({ figure: r.figure, relation: r.relation, ground: r.ground, tier: r.tier, basis: r.basis, turn });
  };
  for (const a of sf.arrangements) addRelation(a);
  for (const p of sf.placed) addRelation(p);

  // Unknown slots: open and fill, on the graph.
  for (const o of sf.unknownsOpened) {
    if (!scene.unknowns.some((u) => u.of === o.of && u.kind === o.kind)) {
      scene.unknowns.push({ of: o.of, kind: o.kind, status: "open", openedTurn: turn });
    }
  }
  for (const f of sf.unknownsFilled) {
    const slot = scene.unknowns.find((u) => u.of === f.of && u.kind === f.kind && u.status === "open");
    if (slot) {
      slot.status = "filled";
      slot.filledTurn = turn;
      slot.value = f.value;
    }
  }

  // The event sequence: the fragment's root verb and its agent,
  // in turn order — the specimen's "and then" is this ordering.
  const root = nodeById(parsed, parsed.meaning.rootId);
  if (root?.role === "verb") {
    const a = parsed.meaning.edges.find((e) => e.from === root.id && e.relation === "agent");
    const ag = a ? nodeById(parsed, a.to) : undefined;
    scene.events.push({ turn, verb: root.lemma, agent: ag ? entityLemma(ag) : undefined });
  }
}
