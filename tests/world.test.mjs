import test from "node:test";
import assert from "node:assert/strict";
import { World } from "../src/world.ts";
import { createGoobers } from "../src/simulation.ts";
import { createSeededRandom } from "../src/random.ts";

test("world owns event visitors, elapsed time, and resets", () => {
  const world = new World((width, height, random) => createGoobers(0, "#438cff", width, height, random), createSeededRandom(5));
  const event = world.trigger("golden-goober");
  assert.equal(event.type, "golden-goober");
  assert.equal(world.goobers.length, 1);
  world.step(1 / 60);
  assert.ok(world.elapsedSeconds > 0);
  world.reset();
  assert.equal(world.activeEvent, null);
  assert.equal(world.elapsedSeconds, 0);
  assert.equal(world.goobers.length, 0);
});
