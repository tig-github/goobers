import test from "node:test";
import assert from "node:assert/strict";
import { FixedStepGameLoop } from "../src/app/game-loop.ts";

function countSteps(frameRate) {
  let steps = 0;
  const world = { step: () => { steps++; return {}; } };
  const loop = new FixedStepGameLoop(world, () => {});
  for (let frame = 0; frame <= frameRate; frame++) {
    loop.advance(frame * 1000 / frameRate);
  }
  return steps;
}

test("fixed timestep advances equally at 60 Hz and 144 Hz", () => {
  assert.equal(countSteps(60), 60);
  assert.equal(countSteps(144), 60);
});
