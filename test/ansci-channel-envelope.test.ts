/**
 * ansci-channel-envelope.test.ts — the Bot Framework envelope
 * port's contract: validation rejects malformed envelopes at
 * the boundary, translation carries text in and out, and the
 * channel store honours upstream's eTag rule. No activity
 * object touches the session record anywhere in this file.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activityFromText,
  activityText,
  isChannelActivity,
  replyRoute,
  type ChannelActivity,
} from "../src/ansci/channel-activity";
import { MemoryChannelStore } from "../src/ansci/channel-store";

const SYSTEM = { id: "ansci", name: "AnSci", role: "bot" };
const VISITOR = { id: "visitor-1", name: "Visitor", role: "user" };
const CONVERSATION = { id: "conv-1" };

function inbound(text?: string): ChannelActivity {
  return {
    type: "message",
    channelId: "terminal",
    from: { ...VISITOR },
    recipient: { ...SYSTEM },
    conversation: { ...CONVERSATION },
    ...(text !== undefined ? { text } : {}),
  };
}

test("validation: a well-formed activity passes, a malformed one fails", () => {
  assert.equal(isChannelActivity(inbound("hello")), true);
  assert.equal(isChannelActivity({ type: "message", channelId: "t" }), false);
  assert.equal(isChannelActivity({ ...inbound("hi"), from: { id: "" } }), false);
  assert.equal(isChannelActivity(null), false);
});

test("inbound translation: message text is extracted; non-messages yield nothing", () => {
  assert.equal(activityText(inbound("hello")), "hello");
  assert.equal(activityText(inbound("  ")), undefined);
  assert.equal(activityText(inbound()), undefined);
  assert.equal(activityText({ ...inbound("hi"), type: "conversationUpdate" }), undefined);
});

test("outbound translation: the reply is wrapped with the reverse route, content untouched", () => {
  const route = replyRoute({ ...inbound("hello"), id: "a1" }, SYSTEM);
  assert.deepEqual(route.recipient, VISITOR);
  assert.deepEqual(route.from, SYSTEM);
  assert.deepEqual(route.conversation, CONVERSATION);
  assert.equal(route.replyToId, "a1");
  const out = activityFromText("I am in Oklahoma City, OK.", route);
  assert.equal(out.type, "message");
  assert.equal(out.text, "I am in Oklahoma City, OK.");
  assert.ok(isChannelActivity(out));
});

test("channel store: write then read round-trips a clone, not a reference", async () => {
  const store = new MemoryChannelStore();
  await store.write({ cursor: { position: 3 } });
  const first = await store.read(["cursor", "missing"]);
  assert.equal(first.cursor.position, 3);
  assert.ok(first.cursor.eTag);
  assert.equal("missing" in first, false);
  (first.cursor as { position: number }).position = 99;
  const second = await store.read(["cursor"]);
  assert.equal(second.cursor.position, 3);
});

test("channel store: a stale eTag rejects rather than overwriting", async () => {
  const store = new MemoryChannelStore();
  await store.write({ cursor: { position: 1 } });
  const a = await store.read(["cursor"]);
  const b = await store.read(["cursor"]);
  await store.write({ cursor: { ...(a.cursor as object), position: 2, eTag: a.cursor.eTag } });
  await assert.rejects(store.write({ cursor: { ...(b.cursor as object), position: 3, eTag: b.cursor.eTag } }), /eTag conflict/);
  const current = await store.read(["cursor"]);
  assert.equal(current.cursor.position, 2);
});
