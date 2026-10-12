import type { Goober } from "./goober";
import type { Personality } from "./personalities";
import type { RandomSource } from "./random";

export interface SteeringVector { x: number; y: number }
export interface SteeringContext {
  goober: Goober;
  steering: SteeringVector;
  width: number;
  height: number;
  deltaSeconds: number;
  random: RandomSource;
}
type SteerFn = (context: SteeringContext) => void;

function noSpecialSteering(): void {}

function steerHomebody({ goober, steering }: SteeringContext): void {
  goober.homeX ??= goober.x;
  goober.homeY ??= goober.y;
  const dx = goober.homeX - goober.x;
  const dy = goober.homeY - goober.y;
  const distance = Math.hypot(dx, dy);
  if (distance > 100) {
    steering.x += (dx / distance) * Math.min((distance - 80) * 0.025, 3);
    steering.y += (dy / distance) * Math.min((distance - 80) * 0.025, 3);
  }
}

function steerExplorer({ goober, steering, width, height, random }: SteeringContext): void {
  const hasTarget = goober.explorerX !== undefined && goober.explorerY !== undefined;
  if (!hasTarget || Math.hypot(goober.explorerX! - goober.x, goober.explorerY! - goober.y) < 65) {
    const angle = random() * Math.PI * 2;
    const distance = 220 + random() * 300;
    goober.explorerX = Math.max(60, Math.min(width - 60, goober.x + Math.cos(angle) * distance));
    goober.explorerY = Math.max(60, Math.min(height - 60, goober.y + Math.sin(angle) * distance));
  }
  steering.x += (goober.explorerX! - goober.x) * 0.018;
  steering.y += (goober.explorerY! - goober.y) * 0.018;
}

function steerDizzy({ goober, steering, deltaSeconds }: SteeringContext): void {
  goober.dizzyPhase = (goober.dizzyPhase ?? 0) + deltaSeconds * 5;
  steering.x += -Math.sin(goober.wanderAngle) * Math.sin(goober.dizzyPhase) * 1.25;
  steering.y += Math.cos(goober.wanderAngle) * Math.sin(goober.dizzyPhase) * 1.25;
}

function steerWallflower({ goober, steering, width, height }: SteeringContext): void {
  const edgeMargin = 48;
  const distances = [goober.y, width - goober.x, height - goober.y, goober.x];
  const edgeIndex = distances.indexOf(Math.min(...distances));
  const nearestDistance = distances[edgeIndex];
  const tangent = [0, Math.PI / 2, Math.PI, -Math.PI / 2][edgeIndex];
  steering.x += Math.cos(tangent) * 1.2;
  steering.y += Math.sin(tangent) * 1.2;
  const edgeForce = Math.min(Math.abs(nearestDistance - edgeMargin) * 0.025, 2.5);
  const normalAngle = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][edgeIndex];
  const towardEdge = nearestDistance > edgeMargin ? -1 : 1;
  steering.x += Math.cos(normalAngle) * edgeForce * towardEdge;
  steering.y += Math.sin(normalAngle) * edgeForce * towardEdge;
}

const NO_SPECIAL_STEERING: SteerFn = noSpecialSteering;

export const PERSONALITY_STEERING: Readonly<Record<Personality, SteerFn>> = {
  shy: NO_SPECIAL_STEERING,
  social: NO_SPECIAL_STEERING,
  chaotic: NO_SPECIAL_STEERING,
  curious: NO_SPECIAL_STEERING,
  orderly: NO_SPECIAL_STEERING,
  homebody: steerHomebody,
  explorer: steerExplorer,
  sleepy: NO_SPECIAL_STEERING,
  dizzy: steerDizzy,
  jealous: NO_SPECIAL_STEERING,
  picky: NO_SPECIAL_STEERING,
  contrarian: NO_SPECIAL_STEERING,
  wallflower: steerWallflower,
  orbiter: NO_SPECIAL_STEERING,
  playful: NO_SPECIAL_STEERING,
};
