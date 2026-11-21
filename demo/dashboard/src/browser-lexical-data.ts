import {
  installWordnetExtract,
  wordnetAvailable,
} from "../../../src/ansci/wordnet-lex";
import {
  frameNetAvailable,
  setFrameNetEnabled,
} from "../../../src/ansci/framenet-lex";
import {
  installDefaultFrameNetBundle,
  type FrameNetBundle,
} from "../../../src/framenet";
import {
  synsetId,
  type FormCandidate,
  type SynsetRecord,
  type WordNetExtract,
} from "../../../src/wordnet";

interface DataPart {
  file: string;
  kind: string;
  count: number;
}

interface WordNetManifest {
  source: string;
  edition: string;
  license: string;
  counts: { synsets: number; relations: number; forms: number };
  parts: DataPart[];
}

interface FrameNetManifest {
  source: string;
  edition: string;
  license: string;
  counts: FrameNetBundle["counts"];
  parts: DataPart[];
}

const DATA_ROOT = "/ansci-data";

async function fetchJson<T>(relativePath: string): Promise<T> {
  const url = `${DATA_ROOT}/${relativePath}`;
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-cache" });
  } catch (error) {
    throw new Error(`${relativePath}: network error while loading (${String(error)})`);
  }
  if (!response.ok) throw new Error(`${relativePath}: HTTP ${response.status} ${response.statusText}`);
  try {
    return await response.json() as T;
  } catch (error) {
    throw new Error(`${relativePath}: invalid JSON (${String(error)})`);
  }
}

async function loadWordNet(): Promise<WordNetExtract> {
  const root = "wordnet/extract";
  const manifest = await fetchJson<WordNetManifest>(`${root}/manifest.json`);
  if (!manifest.parts?.length || !manifest.counts?.synsets || !manifest.counts?.relations || !manifest.counts?.forms || !manifest.source || !manifest.edition || !manifest.license) {
    throw new Error(`${root}/manifest.json: required WordNet metadata, counts, or parts are missing`);
  }
  const parts = await Promise.all(manifest.parts.map((part) => fetchJson<unknown[]>(`${root}/${part.file}`)));
  const synsets: SynsetRecord[] = [];
  const relations: Record<string, (number | string)[]> = {};
  const forms = new Map<string, FormCandidate[]>();
  let relationRecords = 0;
  let formRecords = 0;

  manifest.parts.forEach((part, i) => {
    const records = parts[i];
    if (!Array.isArray(records) || records.length !== part.count) {
      throw new Error(`${root}/${part.file}: expected ${part.count} records, received ${records?.length ?? "no array"}`);
    }
    if (part.kind === "synsets") {
      for (const row of records as [number, SynsetRecord["pos"], string, string[]][]) {
        const [offset, pos, gloss, lemmas] = row;
        synsets.push({ index: synsets.length, id: synsetId(pos, offset), pos, offset, gloss, lemmas });
      }
    } else if (part.kind === "relations") {
      relationRecords += records.length;
      for (const [kind, ...values] of records as [string, ...(number | string)[]][]) {
        (relations[kind] ??= []).push(...values);
      }
    } else if (part.kind === "forms") {
      formRecords += records.length;
      for (const [surface, lemma, pos] of records as [string, string, FormCandidate["pos"]][]) {
        const candidates = forms.get(surface) ?? [];
        if (!candidates.some((item) => item.lemma === lemma && item.pos === pos)) candidates.push({ lemma, pos });
        forms.set(surface, candidates);
      }
    } else {
      throw new Error(`${root}/manifest.json: unsupported part kind "${part.kind}"`);
    }
  });

  if (synsets.length !== manifest.counts.synsets || relationRecords !== manifest.counts.relations || formRecords !== manifest.counts.forms || forms.size === 0) {
    throw new Error(`${root}: loaded ${synsets.length} synsets, ${relationRecords} relation records, and ${formRecords} form records; manifest requires ${manifest.counts.synsets}, ${manifest.counts.relations}, and ${manifest.counts.forms}`);
  }
  return { source: manifest.source, edition: manifest.edition, license: manifest.license, synsets, relations, forms };
}

async function loadFrameNet(): Promise<FrameNetBundle> {
  const root = "framenet";
  const manifest = await fetchJson<FrameNetManifest>(`${root}/manifest.json`);
  if (!manifest.parts?.length || !manifest.counts?.frames || !manifest.counts.frameRelations || !manifest.counts.frameElements || !manifest.counts.lexicalUnits || !manifest.source || !manifest.edition || !manifest.license) {
    throw new Error(`${root}/manifest.json: required FrameNet metadata, counts, or parts are missing`);
  }
  const parts = await Promise.all(manifest.parts.map((part) => fetchJson<unknown[]>(`${root}/${part.file}`)));
  const frames: FrameNetBundle["frames"] = [];
  const relations: FrameNetBundle["relations"] = [];

  manifest.parts.forEach((part, i) => {
    const records = parts[i];
    if (!Array.isArray(records) || records.length !== part.count) {
      throw new Error(`${root}/${part.file}: expected ${part.count} records, received ${records?.length ?? "no array"}`);
    }
    if (part.kind === "frames") {
      for (const [name, fnId, definition, rawFes, rawLus] of records as [
        string, number, string,
        [string, 0 | 1, string, number][],
        [string, string, string, number][],
      ][]) {
        frames.push({
          name,
          fnId,
          definition,
          fes: rawFes.map(([feName, core, feDefinition, feId]) => ({ name: feName, core: core === 1, definition: feDefinition, feId })),
          lus: rawLus.map(([lemma, pos, luName, luId]) => ({ lemma, pos, luName, luId })),
        });
      }
    } else if (part.kind === "relations") {
      for (const [type, superFrame, subFrame, feRelations] of records as [string, string, string, [string, string][]][]) {
        relations.push({ type, superFrame, subFrame, feRelations });
      }
    } else {
      throw new Error(`${root}/manifest.json: unsupported part kind "${part.kind}"`);
    }
  });

  const frameElements = frames.reduce((count, frame) => count + frame.fes.length, 0);
  const lexicalUnits = frames.reduce((count, frame) => count + frame.lus.length, 0);
  if (frames.length !== manifest.counts.frames || relations.length !== manifest.counts.frameRelations || frameElements !== manifest.counts.frameElements || lexicalUnits !== manifest.counts.lexicalUnits) {
    throw new Error(`${root}: loaded ${frames.length} frames, ${frameElements} frame elements, ${lexicalUnits} lexical units, and ${relations.length} relations; manifest requires ${manifest.counts.frames}, ${manifest.counts.frameElements}, ${manifest.counts.lexicalUnits}, and ${manifest.counts.frameRelations}`);
  }
  return { source: manifest.source, edition: manifest.edition, license: manifest.license, counts: manifest.counts, frames, relations };
}

export interface BrowserLexicalReadiness {
  wordnet: { source: string; edition: string; synsets: number; forms: number };
  framenet: { source: string; edition: string; frames: number; lexicalUnits: number };
}

let loading: Promise<BrowserLexicalReadiness> | undefined;

/** Load the repository's required lexical datasets from same-origin
 *  static assets and install them into the synchronous turn engine. */
export function initializeBrowserLexicalData(): Promise<BrowserLexicalReadiness> {
  if (!loading) {
    loading = Promise.allSettled([loadWordNet(), loadFrameNet()]).then((results) => {
      const failures = results.flatMap((result, index) => result.status === "rejected"
        ? [`${index === 0 ? "WordNet" : "FrameNet"}: ${String(result.reason)}`]
        : []);
      if (failures.length) throw new Error(failures.join("; "));
      const [wordnetResult, framenetResult] = results as [PromiseFulfilledResult<WordNetExtract>, PromiseFulfilledResult<FrameNetBundle>];
      const wordnet = wordnetResult.value;
      const framenet = framenetResult.value;
      installWordnetExtract(wordnet);
      installDefaultFrameNetBundle(framenet);
      setFrameNetEnabled(true);
      if (!wordnetAvailable()) throw new Error("WordNet loaded but its parser provider is unavailable");
      if (!frameNetAvailable()) throw new Error("FrameNet loaded but its parser provider is unavailable");
      return {
        wordnet: { source: wordnet.source, edition: wordnet.edition, synsets: wordnet.synsets.length, forms: wordnet.forms.size },
        framenet: { source: framenet.source, edition: framenet.edition, frames: framenet.frames.length, lexicalUnits: framenet.counts.lexicalUnits },
      };
    }).catch((error) => {
      loading = undefined;
      throw error instanceof Error ? error : new Error(String(error));
    });
  }
  return loading;
}
