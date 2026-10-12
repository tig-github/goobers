import test from "node:test";
import assert from "node:assert/strict";
import { FIELD_EVENT_DESCRIPTIONS, suspendsOrderlyPatterns } from "../src/events.ts";

test("only the events that override movement suspend orderly patterns", () => {
  assert.equal(suspendsOrderlyPatterns({ type: "drift", remainingSeconds: 4, directionX: 1, directionY: 0 }), true);
  assert.equal(suspendsOrderlyPatterns({ type: "color-parade", remainingSeconds: 4 }), true);
  assert.equal(suspendsOrderlyPatterns({ type: "gassy", remainingSeconds: 4 }), false);
  assert.equal(suspendsOrderlyPatterns(undefined), false);
});

test("every event has a banner description", () => {
  assert.deepEqual(Object.keys(FIELD_EVENT_DESCRIPTIONS).sort(), [
    "color-parade", "conga-line", "drift", "gassy", "gathering", "golden-goober", "rainbow-goober",
  ]);
});
