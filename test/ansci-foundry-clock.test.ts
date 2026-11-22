import { test } from "node:test";
import assert from "node:assert/strict";
import { clockFromConfig } from "../src/ansci/foundry-clock";

test("absent clock config means no session clock", () => {
  assert.equal(clockFromConfig({}), null);
  assert.equal(clockFromConfig({ clock: undefined }), null);
});

test("fixture clock pins the instant and reports itself", () => {
  const clock = clockFromConfig({
    clock: { fixture: { instant: "2026-11-22T15:04:00Z" } },
  });
  assert.ok(clock);
  assert.equal(clock.retrievedFrom, "foundry-configuration");
  assert.ok(clock.description.includes("2026-11-22T15:04:00Z"));
  const first = clock.source.read();
  const second = clock.source.read();
  assert.equal(first.status, "ok");
  assert.equal(second.status, "ok");
  if (first.status === "ok" && second.status === "ok") {
    assert.equal(first.instant.toISOString(), second.instant.toISOString());
  }
});

test("malformed clock configs are rejected, never silently unpinned", () => {
  for (const clock of [
    "host",
    { host: true },
    { fixture: {} },
    { fixture: { instant: "not-a-date" } },
    { fixture: { instant: 123 } },
  ]) {
    assert.throws(() => clockFromConfig({ clock: clock as never }), /fixture/, JSON.stringify(clock));
  }
});
