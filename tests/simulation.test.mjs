import test from "node:test";
import assert from "node:assert/strict";
import { createGoobers, stepSimulation } from "../src/simulation.ts";
import { createSeededRandom } from "../src/random.ts";

test("seeded random sources create matching goober attributes", () => {
  const first = createGoobers(4, "#123456", 1000, 620, createSeededRandom(42));
  const second = createGoobers(4, "#123456", 1000, 620, createSeededRandom(42));
  const attributes = (goober) => [
    goober.x, goober.y, goober.velocityX, goober.velocityY,
    goober.heading, goober.wanderAngle, goober.nextTurn, goober.size,
    goober.personality, goober.personalityStrength, goober.speedFactor,
    goober.preferredCorner,
  ];
  assert.deepEqual(first.map(attributes), second.map(attributes));
});

test("seeded simulation steps produce matching motion", () => {
  const first = createGoobers(4, "#123456", 1000, 620, createSeededRandom(7));
  const second = createGoobers(4, "#123456", 1000, 620, createSeededRandom(7));
  const firstRandom = createSeededRandom(100);
  const secondRandom = createSeededRandom(100);
  for (let step = 0; step < 120; step++) {
    stepSimulation(first, 1 / 60, 1000, 620, undefined, [], firstRandom);
    stepSimulation(second, 1 / 60, 1000, 620, undefined, [], secondRandom);
  }
  assert.deepEqual(
    first.map(({ x, y, velocityX, velocityY, heading }) => [x, y, velocityX, velocityY, heading]),
    second.map(({ x, y, velocityX, velocityY, heading }) => [x, y, velocityX, velocityY, heading]),
  );
});
