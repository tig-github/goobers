import type { World, WorldStepResult } from "../world";

const FIXED_STEP_SECONDS = 1 / 60;
const MAX_FRAME_SECONDS = 0.25;

/** Advances the world at a stable rate and reports each completed step. */
export class FixedStepGameLoop {
  private previousFrame: number | null = null;
  private accumulator = 0;
  private readonly world: World;
  private readonly onStep: (result: WorldStepResult) => void;

  constructor(world: World, onStep: (result: WorldStepResult) => void) {
    this.world = world;
    this.onStep = onStep;
  }

  advance(timestamp: number): void {
    const frameSeconds = this.previousFrame === null
      ? 0
      : Math.min((timestamp - this.previousFrame) / 1000, MAX_FRAME_SECONDS);
    this.previousFrame = timestamp;
    this.accumulator += frameSeconds;
    while (this.accumulator + 1e-10 >= FIXED_STEP_SECONDS) {
      this.onStep(this.world.step(FIXED_STEP_SECONDS));
      this.accumulator = Math.max(0, this.accumulator - FIXED_STEP_SECONDS);
    }
  }
}
