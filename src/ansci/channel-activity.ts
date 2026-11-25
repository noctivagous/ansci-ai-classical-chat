/**
 * channel-activity.ts — a TypeScript port of the Bot Framework
 * activity envelope shapes (MIT License; Microsoft Corporation,
 * botbuilder-js: libraries/botframework-schema/src/index.ts and
 * src/activityInterfaces.ts — ChannelAccount, ConversationAccount,
 * IActivity / IMessageActivity — plus Attachment's contentType /
 * content shape for card payloads).
 *
 * Ported at the owner's direction: what a channel needs to carry
 * a turn is a solved transport problem, so the envelope is
 * ported, not reinvented. What this file does NOT contain is
 * anything of ours — no parse, no session record, no reply
 * policy; that integration layer is the surface boundary
 * below. It also contains nothing of theirs beyond the
 * envelope: no TurnContext, no middleware, no dialog system,
 * no connector client — those are behaviour, and behaviour
 * stays AnSci's.
 *
 * Scope discipline (the port's contract, pinned by test):
 * activities are translated in and out at the surfaces/chat
 * boundary — inbound text is extracted, outbound text is
 * wrapped — and no activity object is ever stored in the
 * session record. The session holds AnSci's own semantic
 * objects; the channel holds its envelope. Validation is
 * structural (plain guards, no zod dependency): a malformed
 * envelope is rejected at the boundary, never repaired.
 */

/** Who sent or receives, on the channel's own addressing. */
export interface ChannelAccount {
  /** Channel id for the user or bot (e.g. a user id, a name). */
  id: string;
  /** Display-friendly name. */
  name?: string;
  /** Role of the entity behind the account ('user', 'bot', …). */
  role?: string;
}

/** Which conversation the activity belongs to. */
export interface ConversationAccount {
  /** The conversation's id on the channel. */
  id: string;
  /** Display-friendly name, where the channel gives one. */
  name?: string;
  /** Whether the conversation holds more than two parties. */
  isGroup?: boolean;
}

/** A card or file payload riding on a message activity. */
export interface ChannelAttachment {
  /** MIME type of the content ('application/vnd.microsoft.card.hero', …). */
  contentType: string;
  /** The card or file content itself. */
  content?: unknown;
  /** A URL where the content lives, when it lives elsewhere. */
  contentUrl?: string;
  /** Display name for the attachment. */
  name?: string;
}

/** The narrow activity subset AnSci's surface speaks: message
 *  activities and their conversation-update kin. Anything else
 *  a channel sends is outside the boundary and declined there. */
export interface ChannelActivity {
  /** The activity type ('message', 'conversationUpdate', …). */
  type: string;
  /** Id uniquely identifying the activity on the channel. */
  id?: string;
  /** The channel carrying this activity. */
  channelId: string;
  /** The channel's service endpoint, where it names one. */
  serviceUrl?: string;
  /** When the message was sent, where the channel stamps it. */
  timestamp?: string;
  /** Who sent the message. */
  from: ChannelAccount;
  /** Who receives it. */
  recipient: ChannelAccount;
  /** The conversation it belongs to. */
  conversation: ConversationAccount;
  /** Id of the message this replies to, when it is a reply. */
  replyToId?: string;
  /** The message text. */
  text?: string;
  /** Text to display where the channel cannot render cards. */
  summary?: string;
  /** Card or file payloads. */
  attachments?: ChannelAttachment[];
  /** Members added, on conversation-update activities. */
  membersAdded?: ChannelAccount[];
  /** Members removed, on conversation-update activities. */
  membersRemoved?: ChannelAccount[];
  /** Channel-specific content, carried opaquely, never read. */
  channelData?: unknown;
}

/** Structural validation at the boundary. A malformed envelope
 *  is rejected here — never repaired, never passed inward. */
export function isChannelAccount(value: unknown): value is ChannelAccount {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && v.id.length > 0;
}

export function isConversationAccount(value: unknown): value is ConversationAccount {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && v.id.length > 0;
}

export function isChannelActivity(value: unknown): value is ChannelActivity {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.type === "string" &&
    typeof v.channelId === "string" &&
    isChannelAccount(v.from) &&
    isChannelAccount(v.recipient) &&
    isConversationAccount(v.conversation)
  );
}

/** The boundary translation, inbound: extract the turn text an
 *  activity carries. Returns undefined where the activity is
 *  not a text-carrying message — the surface declines those,
 *  it does not guess at them. */
export function activityText(activity: ChannelActivity): string | undefined {
  if (activity.type !== "message") return undefined;
  const text = activity.text?.trim();
  return text ? text : undefined;
}

/** The boundary translation, outbound: wrap a reply sentence
 *  as the channel's message activity. The reply's wording is
 *  already decided before this runs — this sets addressing,
 *  never content. */
export function activityFromText(
  text: string,
  route: { channelId: string; conversation: ConversationAccount; from: ChannelAccount; recipient: ChannelAccount; serviceUrl?: string; replyToId?: string },
): ChannelActivity {
  return {
    type: "message",
    channelId: route.channelId,
    ...(route.serviceUrl ? { serviceUrl: route.serviceUrl } : {}),
    timestamp: new Date().toISOString(),
    from: { ...route.from },
    recipient: { ...route.recipient },
    conversation: { ...route.conversation },
    ...(route.replyToId ? { replyToId: route.replyToId } : {}),
    text,
  };
}

/** The reverse route for an inbound activity: who the reply
 *  goes to, on the channel's own addressing — the sender
 *  becomes the recipient and the system's account answers. */
export function replyRoute(
  inbound: ChannelActivity,
  systemAccount: ChannelAccount,
): { channelId: string; conversation: ConversationAccount; from: ChannelAccount; recipient: ChannelAccount; serviceUrl?: string; replyToId?: string } {
  return {
    channelId: inbound.channelId,
    conversation: { ...inbound.conversation },
    from: { ...systemAccount },
    recipient: { ...inbound.from },
    ...(inbound.serviceUrl ? { serviceUrl: inbound.serviceUrl } : {}),
    ...(inbound.id ? { replyToId: inbound.id } : {}),
  };
}
