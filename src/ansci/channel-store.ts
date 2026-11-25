/**
 * channel-store.ts — a TypeScript port of the Bot Framework
 * storage contract (MIT License; Microsoft Corporation,
 * botbuilder-js: libraries/botbuilder-core/src/storage.ts —
 * Storage, StoreItem, StoreItems — and src/memoryStorage.ts —
 * MemoryStorage's eTag read/write/delete semantics).
 *
 * Ported at the owner's direction: keyed JSON persistence with
 * optimistic concurrency is a solved storage problem, so the
 * contract is ported, not reinvented. What this file does NOT
 * contain is anything of ours — no interlocutor record, no
 * session register; those stay in interlocutor-store.ts and
 * session.ts on their own discipline. It also contains nothing
 * of theirs beyond storage: no TurnContext, no BotState, no
 * state-property accessors — the state that matters in AnSci
 * is the session's own, and no BotState object mediates it.
 *
 * Scope discipline (the port's contract, pinned by test): this
 * interface serves CHANNEL-scoped JSON only — drafts, cursors,
 * delivery receipts — where a surface needs to keep them. It
 * never holds conversation content: no statements, no states,
 * no Interlocutor records. The eTag rule is upstream's own:
 * a write carrying a stale eTag fails rather than overwriting.
 */

/** A stored object with an optional optimistic-concurrency tag. */
export interface ChannelStoreItem {
  [key: string]: unknown;
  /** eTag for stores that support optimistic concurrency. */
  eTag?: string;
}

/** Named store items, indexed by key. */
export interface ChannelStoreItems {
  [key: string]: ChannelStoreItem;
}

/** A storage provider for plain JSON objects, keyed by string. */
export interface ChannelStore {
  /** Load items by key; absent keys are simply missing. */
  read(keys: string[]): Promise<ChannelStoreItems>;
  /** Save items by key, honouring the eTag rule below. */
  write(changes: ChannelStoreItems): Promise<void>;
  /** Remove items by key. */
  delete(keys: string[]): Promise<void>;
}

/** In-memory channel store with upstream's eTag semantics: a
 *  write with no eTag (or '*') always wins; a write carrying
 *  an eTag wins only against the matching stored eTag, and a
 *  mismatch rejects rather than overwriting. Reads and writes
 *  clone through JSON so callers never share the store's own
 *  objects — the network-store simulation upstream documents. */
export class MemoryChannelStore implements ChannelStore {
  private readonly memory = new Map<string, string>();
  private etag = 1;

  async read(keys: string[]): Promise<ChannelStoreItems> {
    if (!keys) throw new ReferenceError("Keys are required when reading.");
    const data: ChannelStoreItems = {};
    for (const key of keys) {
      const raw = this.memory.get(key);
      if (raw !== undefined) data[key] = JSON.parse(raw) as ChannelStoreItem;
    }
    return data;
  }

  async write(changes: ChannelStoreItems): Promise<void> {
    if (!changes) throw new ReferenceError("Changes are required when writing.");
    for (const key of Object.keys(changes)) {
      const incoming = changes[key] as ChannelStoreItem;
      const stored = this.memory.get(key);
      if (!stored || incoming.eTag === "*" || !incoming.eTag) {
        this.save(key, incoming);
      } else {
        const current = JSON.parse(stored) as ChannelStoreItem;
        if (incoming.eTag === current.eTag) {
          this.save(key, incoming);
        } else {
          throw new Error(`Storage: error writing "${key}" due to eTag conflict.`);
        }
      }
    }
  }

  async delete(keys: string[]): Promise<void> {
    for (const key of keys) this.memory.delete(key);
  }

  private save(key: string, item: ChannelStoreItem): void {
    const clone: ChannelStoreItem = { ...(JSON.parse(JSON.stringify(item)) as ChannelStoreItem) };
    clone.eTag = (this.etag++).toString();
    this.memory.set(key, JSON.stringify(clone));
  }
}
