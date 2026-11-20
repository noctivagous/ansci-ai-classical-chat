/**
 * The Interlocutor store (Social Unit S6, design §5 and §11;
 * commissioned by the owner 2026-11-18 on synthetic-returner
 * gates, ahead of ruling 5a's deployment precondition).
 *
 * What persists across conversations is the durable core
 * only: under a known identity, the name as stated, how many
 * conversations have been held under it, and the topics
 * established with them — as renderings (topic lemmas), not
 * as pointers: within a conversation the Interlocutor
 * register holds pointers to session objects, never copies,
 * and pointers die with the session, so the persisted form
 * of "established with them" is necessarily the topics'
 * names. Nothing else crosses: no statements, no states, no
 * session record — what was said in an earlier conversation
 * is not carried into a later one as if it stood there.
 *
 * The discipline is the design's: the store is keyed by a
 * stated identity and is consulted only once the interlocutor
 * has stated that identity in the present conversation —
 * never before, and never from a guess. A visitor who gives
 * no name writes nothing here and is first contact every
 * time. The key is the stated name normalised (trimmed,
 * case-folded): the name is the only identity channel this
 * system has, and two people stating the same name share a
 * record — the known limit of the channel, recorded rather
 * than disguised.
 */

import * as fs from "node:fs";
import * as pathModule from "node:path";

export interface InterlocutorRecord {
  /** The name as most recently stated. */
  name: string;
  /** Conversations held under this identity, including the
   *  current one once it has identified itself. */
  conversations: number;
  /** Topic lemmas established with them, accumulated across
   *  conversations, in the order first established. */
  establishedTopics: string[];
}

export interface InterlocutorStore {
  get(key: string): InterlocutorRecord | undefined;
  put(key: string, record: InterlocutorRecord): void;
}

/** The store key for a stated name: trimmed and case-folded. */
export function interlocutorKey(name: string): string {
  return name.trim().toLowerCase();
}

/** An in-memory store — the synthetic-returner gates' store,
 *  and any embedding that wants persistence only for its own
 *  process's lifetime. */
export class MemoryInterlocutorStore implements InterlocutorStore {
  private readonly records = new Map<string, InterlocutorRecord>();

  get(key: string): InterlocutorRecord | undefined {
    const record = this.records.get(key);
    return record ? { ...record, establishedTopics: [...record.establishedTopics] } : undefined;
  }

  put(key: string, record: InterlocutorRecord): void {
    this.records.set(key, { ...record, establishedTopics: [...record.establishedTopics] });
  }

  /** Test and inspection helper: the keys currently held. */
  keys(): string[] {
    return [...this.records.keys()];
  }
}

/** A JSON-file store: the whole record set as one object,
 *  read at construction and rewritten on each put. The path
 *  is the deployment's configuration; nothing about the file
 *  is consulted until an identity is stated. */
export class FileInterlocutorStore implements InterlocutorStore {
  private readonly records = new Map<string, InterlocutorRecord>();

  constructor(private readonly path: string) {
    try {
      if (fs.existsSync(path)) {
        const parsed = JSON.parse(fs.readFileSync(path, "utf8")) as Record<string, InterlocutorRecord>;
        for (const [key, record] of Object.entries(parsed)) this.records.set(key, record);
      }
    } catch {
      // An unreadable or malformed store starts empty: losing
      // the durable core loses courtesies, never facts the
      // conversation itself established.
      this.records.clear();
    }
  }

  get(key: string): InterlocutorRecord | undefined {
    const record = this.records.get(key);
    return record ? { ...record, establishedTopics: [...record.establishedTopics] } : undefined;
  }

  put(key: string, record: InterlocutorRecord): void {
    this.records.set(key, { ...record, establishedTopics: [...record.establishedTopics] });
    fs.mkdirSync(pathModule.dirname(this.path), { recursive: true });
    fs.writeFileSync(this.path, JSON.stringify(Object.fromEntries(this.records), null, 2));
  }
}
