import { DEFAULT_GOOBER_COLOR, MAX_GOOBER_SPEED_UNITS, WORLD_HEIGHT, WORLD_WIDTH } from "./consts";
import { chooseSpawnPersonality, PERSONALITIES_BY_ID, type Personality } from "./personalities";
import { MAX_ORDERLY_RADIUS, randomOrderlyRadius, specialTypeRegistry, type OrderlyPattern, type SpecialType } from "./special-types";
import type { FieldEvent } from "./events";

export interface Goober {
  id: number;
  name: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  heading: number;
  wanderAngle: number;
  nextTurn: number;
  size: number;
  bobOffset: number;
  color: string;
  personality: Personality;
  personalityStrength: number;
  speedFactor: number;
  preferredCorner: number;
  specialType: SpecialType | null;
  orderlyPattern?: OrderlyPattern;
  patternOriginX?: number;
  patternOriginY?: number;
  patternDistance?: number;
  orderlyRadius?: number;
  isGoldenEventVisitor?: boolean;
  isRainbowEventVisitor?: boolean;
  isEventGoober?: boolean;
  isGoldenLeaving?: boolean;
  isEventVisitorLeaving?: boolean;
  hasLeftField?: boolean;
  rainbowSpinTurns?: number;
  isRainbowSpinning?: boolean;
}

export type GooberLoadout = Pick<Goober, "color" | "personality" | "personalityStrength" | "size" | "speedFactor" | "preferredCorner" | "specialType" | "orderlyPattern" | "orderlyRadius">;

export function saveGooberLoadout(goober: Goober): GooberLoadout {
  return {
    color: goober.color,
    personality: goober.personality,
    personalityStrength: goober.personalityStrength,
    size: goober.size,
    speedFactor: goober.speedFactor,
    preferredCorner: goober.preferredCorner,
    specialType: goober.specialType,
    orderlyPattern: goober.orderlyPattern,
    orderlyRadius: goober.orderlyRadius,
  };
}

export function spawnGooberFromLoadout(loadout: GooberLoadout, width = WORLD_WIDTH, height = WORLD_HEIGHT): Goober {
  const goober = createGoobers(1, loadout.color, width, height)[0];
  Object.assign(goober, loadout);
  if (loadout.specialType === "orderly" && loadout.orderlyPattern) {
    const radius = loadout.orderlyRadius ?? randomOrderlyRadius();
    goober.orderlyRadius = radius;
    if (loadout.orderlyPattern === "circle") {
      goober.patternOriginX = goober.x - radius;
      goober.patternOriginY = goober.y;
    } else if (loadout.orderlyPattern === "triangle") {
      goober.patternOriginX = goober.x;
      goober.patternOriginY = goober.y + radius;
    } else {
      goober.patternOriginX = goober.x + radius;
      goober.patternOriginY = goober.y + radius;
    }
    goober.patternDistance = 0;
  }
  return goober;
}

let nextId = 0;

export function createGoobers(count: number, color = DEFAULT_GOOBER_COLOR, width = WORLD_WIDTH, height = WORLD_HEIGHT): Goober[] {
  return Array.from({ length: count }, () => {
    const personality = chooseSpawnPersonality();
    return {
      id: nextId++,
      name: `Goober #${nextId}`,
      x: 110 + Math.random() * Math.max(1, width - 220),
      y: 95 + Math.random() * Math.max(1, height - 190),
      velocityX: (Math.random() - 0.5) * 24,
      velocityY: (Math.random() - 0.5) * 24,
      heading: Math.random() * Math.PI * 2,
      wanderAngle: Math.random() * Math.PI * 2,
      nextTurn: 0.5 + Math.random() * 2,
      size: 0.78 + Math.random() * 0.45,
      bobOffset: Math.random() * Math.PI * 2,
      color,
      personality,
      personalityStrength: 0.55 + Math.random() * 0.9,
      speedFactor: (0.85 + Math.random() * 0.3) * samplePersonalitySpeedMultiplier(personality),
      preferredCorner: Math.floor(Math.random() * 4),
      specialType: null,
    };
  });
}

function samplePersonalitySpeedMultiplier(personality: Personality): number {
  const [minimum, maximum] = PERSONALITIES_BY_ID[personality].speedMultiplier;
  return minimum === maximum ? minimum : minimum + Math.random() * (maximum - minimum);
}

export function maybeAssignSpecialType(goober: Goober): void {
  specialTypeRegistry.assign(goober);
}

function parseHexColor(color: string): [number, number, number] | null {
  const value = color.startsWith("#") ? color.slice(1) : color;
  const normalized = value.length === 3
    ? [...value].map((digit) => digit + digit).join("")
    : value;
  if (!/^[\da-f]{6}$/i.test(normalized)) return null;
  return [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16)) as [number, number, number];
}

function blendHexColors(from: string, to: string, amount: number): string {
  const source = parseHexColor(from);
  const target = parseHexColor(to);
  if (!source || !target) return to;
  const channels = source.map((value, index) => Math.round(value + (target[index] - value) * amount));
  return `#${channels.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

const GOLDEN_GOOBER_NAMES = ["shmoober", "doober", "bloober", "scoober", "goldagoober", "gloober", "mr thames"];
const CHAMELEON_COLOR_RADIUS = 130;
const CHAMELEON_COLOR_BLEND_RATE = 7.5;

export function createGoldenEventGoober(width: number, height: number): Goober {
  const goober = createGoobers(1, "#ffcc00", width, height)[0];
  goober.name = GOLDEN_GOOBER_NAMES[Math.floor(Math.random() * GOLDEN_GOOBER_NAMES.length)];
  goober.specialType = "golden";
  goober.isGoldenEventVisitor = true;
  goober.isEventGoober = true;
  const edge = Math.floor(Math.random() * 4);
  if (edge === 0) { goober.x = 34; goober.y = Math.random() * height; goober.velocityX = Math.abs(goober.velocityX) + 18; }
  else if (edge === 1) { goober.x = width - 34; goober.y = Math.random() * height; goober.velocityX = -Math.abs(goober.velocityX) - 18; }
  else if (edge === 2) { goober.x = Math.random() * width; goober.y = 34; goober.velocityY = Math.abs(goober.velocityY) + 18; }
  else { goober.x = Math.random() * width; goober.y = height - 34; goober.velocityY = -Math.abs(goober.velocityY) - 18; }
  goober.heading = Math.atan2(goober.velocityY, goober.velocityX);
  goober.wanderAngle = goober.heading;
  return goober;
}

export function createRainbowEventGoober(width: number, height: number): Goober {
  const goober = createGoobers(1, "#ff55cc", width, height)[0];
  const names = ["raindrop", "gumdrop", "sherlock", "glainbowber", "monica"];
  goober.name = names[Math.floor(Math.random() * names.length)];
  goober.specialType = "rainbow";
  goober.isRainbowEventVisitor = true;
  goober.isEventGoober = true;
  setGooberAtRandomEdge(goober, width, height);
  return goober;
}

function setGooberAtRandomEdge(goober: Goober, width: number, height: number): void {
  const edge = Math.floor(Math.random() * 4);
  if (edge === 0) { goober.x = 34; goober.y = Math.random() * height; goober.velocityX = Math.abs(goober.velocityX) + 18; }
  else if (edge === 1) { goober.x = width - 34; goober.y = Math.random() * height; goober.velocityX = -Math.abs(goober.velocityX) - 18; }
  else if (edge === 2) { goober.x = Math.random() * width; goober.y = 34; goober.velocityY = Math.abs(goober.velocityY) + 18; }
  else { goober.x = Math.random() * width; goober.y = height - 34; goober.velocityY = -Math.abs(goober.velocityY) - 18; }
  goober.heading = Math.atan2(goober.velocityY, goober.velocityX);
  goober.wanderAngle = goober.heading;
}

export function resumeOrderlyPaths(goobers: Goober[]): void {
  for (const goober of goobers) {
    if (goober.specialType !== "orderly" || !goober.orderlyPattern) continue;
    const radius = goober.orderlyRadius ?? 58;
    if (goober.orderlyPattern === "circle") {
      goober.patternOriginX = goober.x - radius;
      goober.patternOriginY = goober.y;
    } else if (goober.orderlyPattern === "triangle") {
      goober.patternOriginX = goober.x;
      goober.patternOriginY = goober.y + radius;
    } else {
      goober.patternOriginX = goober.x + radius;
      goober.patternOriginY = goober.y + radius;
    }
    goober.patternDistance = 0;
  }
}

export function stepSimulation(
  goobers: Goober[],
  deltaSeconds: number,
  width: number,
  height: number,
  fieldEvent?: FieldEvent,
): void {
  if (deltaSeconds <= 0) return;

  for (const goober of goobers) {
    if (fieldEvent?.type === "rainbow-goober" && goober.specialType === "orderly") {
      goober.rainbowSpinTurns = Math.min(5, (goober.rainbowSpinTurns ?? 0) + deltaSeconds * 2);
      goober.isRainbowSpinning = goober.rainbowSpinTurns < 5;
    } else if (fieldEvent?.type !== "rainbow-goober" && goober.rainbowSpinTurns !== undefined) {
      delete goober.rainbowSpinTurns;
      goober.isRainbowSpinning = false;
    }
  }

  const congaLine = fieldEvent?.type === "conga-line"
    ? goobers.filter((goober) => goober.specialType !== "orderly").sort((a, b) => a.id - b.id)
    : [];
  const rainbowOrbiters = fieldEvent?.type === "rainbow-goober"
    ? goobers.filter((goober) => goober.specialType !== "rainbow" && (goober.specialType !== "orderly" || (goober.rainbowSpinTurns ?? 0) >= 5)).sort((a, b) => a.id - b.id)
    : [];

  for (const goober of goobers) {
    if (goober.isGoldenLeaving || goober.isEventVisitorLeaving) {
      const distances = [goober.x, width - goober.x, goober.y, height - goober.y];
      const nearestEdge = distances.indexOf(Math.min(...distances));
      const targets = [
        { x: -60, y: goober.y },
        { x: width + 60, y: goober.y },
        { x: goober.x, y: -60 },
        { x: goober.x, y: height + 60 },
      ];
      const target = targets[nearestEdge];
      const angle = Math.atan2(target.y - goober.y, target.x - goober.x);
      const pace = MAX_GOOBER_SPEED_UNITS * goober.speedFactor * 4;
      goober.velocityX = Math.cos(angle) * pace;
      goober.velocityY = Math.sin(angle) * pace;
      goober.x += goober.velocityX * deltaSeconds;
      goober.y += goober.velocityY * deltaSeconds;
      goober.heading = angle;
      const trailClearance = goober.isRainbowEventVisitor ? pace * 1.4 : 0;
      const clearMargin = 32 * goober.size + 12 + trailClearance;
      goober.hasLeftField = goober.x < -clearMargin || goober.x > width + clearMargin || goober.y < -clearMargin || goober.y > height + clearMargin;
      continue;
    }
    if (goober.specialType === "chameleon") {
      let nearestColorSource: Goober | null = null;
      let nearestDistanceSquared = CHAMELEON_COLOR_RADIUS * CHAMELEON_COLOR_RADIUS;
      for (const neighbor of goobers) {
        if (neighbor === goober || neighbor.specialType === "golden" || neighbor.specialType === "rainbow") continue;
        const dx = neighbor.x - goober.x;
        const dy = neighbor.y - goober.y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < nearestDistanceSquared) {
          nearestColorSource = neighbor;
          nearestDistanceSquared = distanceSquared;
        }
      }
      if (nearestColorSource) {
        const blend = 1 - Math.exp(-deltaSeconds * CHAMELEON_COLOR_BLEND_RATE);
        goober.color = blendHexColors(goober.color, nearestColorSource.color, blend);
      }
    }
    if (fieldEvent?.type === "rainbow-goober" && goober.specialType === "orderly" && (goober.rainbowSpinTurns ?? 0) < 5) {
      goober.heading += deltaSeconds * Math.PI * 4;
      goober.velocityX = 0;
      goober.velocityY = 0;
      continue;
    }
    if ((!fieldEvent || fieldEvent.type === "gathering" || fieldEvent.type === "conga-line" || fieldEvent.type === "golden-goober" || fieldEvent.type === "rainbow-goober" || fieldEvent.type === "gassy") && goober.specialType === "orderly" && goober.orderlyPattern && !(fieldEvent?.type === "rainbow-goober" && (goober.rainbowSpinTurns ?? 0) >= 5)) {
      stepOrderlyGoober(goober, deltaSeconds, width, height);
      continue;
    }
    goober.nextTurn -= deltaSeconds;
    if (goober.nextTurn <= 0) {
      const personality = PERSONALITIES_BY_ID[goober.personality];
      goober.wanderAngle += (Math.random() - 0.5) * personality.turniness * goober.personalityStrength;
      const [minimumTurn, maximumTurn] = personality.turnInterval;
      goober.nextTurn = minimumTurn + Math.random() * (maximumTurn - minimumTurn);
    }

    let steerX = Math.cos(goober.wanderAngle) * 0.42;
    let steerY = Math.sin(goober.wanderAngle) * 0.42;

    const margin = 82;
    if (goober.x < margin) steerX += (margin - goober.x) / margin;
    if (goober.x > width - margin)
      steerX -= (goober.x - (width - margin)) / margin;
    if (goober.y < margin) steerY += (margin - goober.y) / margin;
    if (goober.y > height - margin)
      steerY -= (goober.y - (height - margin)) / margin;

    for (const neighbor of goobers) {
      if (neighbor === goober) continue;
      const offsetX = goober.x - neighbor.x;
      const offsetY = goober.y - neighbor.y;
      const distanceSquared = offsetX * offsetX + offsetY * offsetY;
      if (distanceSquared > 0 && distanceSquared < 54 * 54) {
        const distance = Math.sqrt(distanceSquared);
        const strength = (54 - distance) / 54;
        const separation = PERSONALITIES_BY_ID[goober.personality].separation;
        steerX += (offsetX / distance) * strength * 1.2 * separation;
        steerY += (offsetY / distance) * strength * 1.2 * separation;
      }
    }

    if (fieldEvent?.type === "gathering") {
      const towardX = fieldEvent.x - goober.x;
      const towardY = fieldEvent.y - goober.y;
      const distance = Math.hypot(towardX, towardY);
      const pull = Math.min(distance / 180, 1) * 3.5;
      steerX += (towardX / (distance || 1)) * pull;
      steerY += (towardY / (distance || 1)) * pull;
    } else if (PERSONALITIES_BY_ID[goober.personality].behavior === "keep-distance") {
      const inset = 105;
      const corners = [
        [inset, inset], [width - inset, inset],
        [inset, height - inset], [width - inset, height - inset],
      ];
      const [cornerX, cornerY] = corners[goober.preferredCorner];
      const towardX = cornerX - goober.x;
      const towardY = cornerY - goober.y;
      const distance = Math.hypot(towardX, towardY) || 1;
      const pull = 0.2 * goober.personalityStrength;
      steerX += (towardX / distance) * pull;
      steerY += (towardY / distance) * pull;
    } else if (PERSONALITIES_BY_ID[goober.personality].behavior === "seek-group") {
      let nearbyX = 0;
      let nearbyY = 0;
      let nearbyCount = 0;
      for (const neighbor of goobers) {
        if (neighbor === goober) continue;
        const offsetX = neighbor.x - goober.x;
        const offsetY = neighbor.y - goober.y;
        if (offsetX * offsetX + offsetY * offsetY < 180 * 180) {
          nearbyX += offsetX;
          nearbyY += offsetY;
          nearbyCount++;
        }
      }
      if (nearbyCount > 0) {
        const cohesion = 0.003 * goober.personalityStrength / nearbyCount;
        steerX += nearbyX * cohesion;
        steerY += nearbyY * cohesion;
      }
    } else if (PERSONALITIES_BY_ID[goober.personality].behavior === "curious") {
      let target: Goober | null = null;
      let nearestDistanceSquared = 300 * 300;
      for (const neighbor of goobers) {
        if (neighbor === goober || neighbor.specialType === null) continue;
        const offsetX = neighbor.x - goober.x;
        const offsetY = neighbor.y - goober.y;
        const distanceSquared = offsetX * offsetX + offsetY * offsetY;
        if (distanceSquared < nearestDistanceSquared) {
          target = neighbor;
          nearestDistanceSquared = distanceSquared;
        }
      }
      if (target) {
        const distance = Math.sqrt(nearestDistanceSquared) || 1;
        const curiosity = 0.75 * goober.personalityStrength;
        steerX += ((target.x - goober.x) / distance) * curiosity;
        steerY += ((target.y - goober.y) / distance) * curiosity;
      }
    }

    if (fieldEvent?.type === "drift") {
      steerX += fieldEvent.directionX * 0.24;
      steerY += fieldEvent.directionY * 0.24;
    } else if (fieldEvent?.type === "color-parade") {
      let matchingX = 0;
      let matchingY = 0;
      let matchingCount = 0;
      let aversionX = 0;
      let aversionY = 0;
      let aversionCount = 0;
      for (const neighbor of goobers) {
        if (neighbor === goober) continue;
        const offsetX = neighbor.x - goober.x;
        const offsetY = neighbor.y - goober.y;
        const distanceSquared = offsetX * offsetX + offsetY * offsetY;
        if (neighbor.color === goober.color && distanceSquared < 320 * 320) {
          matchingX += offsetX;
          matchingY += offsetY;
          matchingCount++;
        } else if (neighbor.color !== goober.color && distanceSquared > 0 && distanceSquared < 180 * 180) {
          const distance = Math.sqrt(distanceSquared);
          const strength = (180 - distance) / 180;
          aversionX -= (offsetX / distance) * strength;
          aversionY -= (offsetY / distance) * strength;
          aversionCount++;
        }
      }
      if (matchingCount > 0) {
        const cohesion = 0.004 * goober.personalityStrength / matchingCount;
        steerX += matchingX * cohesion;
        steerY += matchingY * cohesion;
      }
      if (aversionCount > 0) {
        steerX += (aversionX / aversionCount) * 0.9;
        steerY += (aversionY / aversionCount) * 0.9;
      }
    }

    if (fieldEvent?.type === "golden-goober" && goober.specialType !== "orderly") {
      const golden = goobers.find((candidate) => candidate.isGoldenEventVisitor);
      if (golden && goober !== golden) {
        const dx = golden.x - goober.x;
        const dy = golden.y - goober.y;
        const distance = Math.hypot(dx, dy) || 1;
        const safeDistance = 118 * (goober.size + golden.size) / 2;
        const adjustment = distance < safeDistance
          ? -(safeDistance - distance) * 0.035
          : Math.min((distance - safeDistance) * 0.012, 2.2);
        steerX = (dx / distance) * adjustment;
        steerY = (dy / distance) * adjustment;
      }
    }

    let rainbowFollowDistance: number | null = null;
    if (fieldEvent?.type === "rainbow-goober" && goober.specialType !== "rainbow" && (goober.specialType !== "orderly" || (goober.rainbowSpinTurns ?? 0) >= 5)) {
      const index = rainbowOrbiters.indexOf(goober);
      const angle = (index / Math.max(1, rainbowOrbiters.length)) * Math.PI * 2 + (45 - fieldEvent.remainingSeconds) * 0.08;
      const edge = 32 * goober.size + 12;
      const heartScaleX = Math.max(0, width / 2 - edge);
      const heartScaleY = Math.max(0, height / 2 - edge);
      const heartX = 16 * Math.sin(angle) ** 3;
      const heartY = 13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle);
      const targetX = width / 2 + (heartX / 16) * heartScaleX;
      const targetY = height / 2 - ((heartY + 3) / 14) * heartScaleY;
      rainbowFollowDistance = Math.hypot(targetX - goober.x, targetY - goober.y);
      steerX = (targetX - goober.x) * 0.035;
      steerY = (targetY - goober.y) * 0.035;
    }

    if (fieldEvent?.type === "rainbow-goober" && goober.isRainbowEventVisitor) {
      const towardCenterX = width / 2 - goober.x;
      const towardCenterY = height / 2 - goober.y;
      const distanceToCenter = Math.hypot(towardCenterX, towardCenterY) || 1;
      const centerPull = Math.min(distanceToCenter / 260, 1) * 0.85;
      steerX += (towardCenterX / distanceToCenter) * centerPull;
      steerY += (towardCenterY / distanceToCenter) * centerPull;
    }

    let congaFollowDistance: number | null = null;
    let congaSpacing = 64;
    if (fieldEvent?.type === "conga-line" && goober.specialType !== "orderly") {
      const index = congaLine.indexOf(goober);
      if (index > 0) {
        const leader = congaLine[index - 1];
        // The sprite body is about 54 units wide at size 1; add turning clearance.
        congaSpacing = 36 * (leader.size + goober.size) + 12;
        const leaderHeading = Math.hypot(leader.velocityX, leader.velocityY) > 0.1
          ? Math.atan2(leader.velocityY, leader.velocityX)
          : leader.heading;
        const targetX = leader.x - Math.cos(leaderHeading) * congaSpacing;
        const targetY = leader.y - Math.sin(leaderHeading) * congaSpacing;
        congaFollowDistance = Math.hypot(targetX - goober.x, targetY - goober.y);
        steerX = (targetX - goober.x) * 0.035;
        steerY = (targetY - goober.y) * 0.035;
      } else if (index === 0) {
        // Keep the leader from cutting back across its own line.
        for (const follower of congaLine.slice(1)) {
          const awayX = goober.x - follower.x;
          const awayY = goober.y - follower.y;
          const distance = Math.hypot(awayX, awayY) || 1;
          const safeDistance = 40 * (goober.size + follower.size) + 12;
          const avoidanceDistance = safeDistance * 1.8;
          if (distance < avoidanceDistance) {
            const push = (avoidanceDistance - distance) / avoidanceDistance * 4;
            steerX += (awayX / distance) * push;
            steerY += (awayY / distance) * push;
          }
        }
      }
    }

    const steerLength = Math.hypot(steerX, steerY) || 1;
    const congaSpeedFactor = congaFollowDistance === null ? 1 : Math.min(1, congaFollowDistance / congaSpacing);
    const rainbowSpeedFactor = rainbowFollowDistance === null ? 1 : Math.min(1, rainbowFollowDistance / 110);
    const targetSpeed = MAX_GOOBER_SPEED_UNITS * goober.speedFactor * congaSpeedFactor * rainbowSpeedFactor;
    const targetX = (steerX / steerLength) * targetSpeed;
    const targetY = (steerY / steerLength) * targetSpeed;
    const response = Math.min(deltaSeconds * (congaFollowDistance === null && rainbowFollowDistance === null ? 1.25 : 2.5), 1);
    goober.velocityX += (targetX - goober.velocityX) * response;
    goober.velocityY += (targetY - goober.velocityY) * response;

    goober.x += goober.velocityX * deltaSeconds;
    goober.y += goober.velocityY * deltaSeconds;

    // Keep the whole sprite inside the arena even after a long frame or a
    // boundary collision. Reflecting the velocity makes the edge feel solid.
    const edge = 32 * goober.size;
    if (goober.x < edge) {
      goober.x = edge;
      goober.velocityX = Math.abs(goober.velocityX);
    } else if (goober.x > width - edge) {
      goober.x = width - edge;
      goober.velocityX = -Math.abs(goober.velocityX);
    }
    if (goober.y < edge) {
      goober.y = edge;
      goober.velocityY = Math.abs(goober.velocityY);
    } else if (goober.y > height - edge) {
      goober.y = height - edge;
      goober.velocityY = -Math.abs(goober.velocityY);
    }

    goober.heading = Math.atan2(goober.velocityY, goober.velocityX);
  }

  if (congaLine.length > 1) separateCongaGoobers(congaLine, width, height);
}

function separateCongaGoobers(line: Goober[], width: number, height: number): void {
  // Resolve all pairs, not only neighbors, so a tight turn cannot fold the
  // line back through itself. Two passes handle small groups of collisions.
  for (let pass = 0; pass < 2; pass++) {
    for (let firstIndex = 0; firstIndex < line.length; firstIndex++) {
      const first = line[firstIndex];
      for (let secondIndex = firstIndex + 1; secondIndex < line.length; secondIndex++) {
        const second = line[secondIndex];
        let dx = second.x - first.x;
        let dy = second.y - first.y;
        let distance = Math.hypot(dx, dy);
        const minimumDistance = 40 * (first.size + second.size) + 12;
        if (distance >= minimumDistance) continue;
        if (distance < 0.001) {
          const angle = ((first.id * 31 + second.id * 17) % 360) * Math.PI / 180;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distance = 1;
        }
        const push = (minimumDistance - distance) / 2;
        const unitX = dx / distance;
        const unitY = dy / distance;
        first.x -= unitX * push;
        first.y -= unitY * push;
        second.x += unitX * push;
        second.y += unitY * push;
      }
    }
    for (const goober of line) {
      const edge = 32 * goober.size;
      goober.x = Math.max(edge, Math.min(width - edge, goober.x));
      goober.y = Math.max(edge, Math.min(height - edge, goober.y));
    }
  }
}

function stepOrderlyGoober(goober: Goober, deltaSeconds: number, width: number, height: number): void {
  const edge = 32 * goober.size;
  const xFactor = goober.orderlyPattern === "triangle" ? Math.sqrt(3) / 2 : 1;
  const maxRadius = Math.max(0, Math.min(
    MAX_ORDERLY_RADIUS,
    (width / 2 - edge) / xFactor,
    height / 2 - edge,
  ));
  let radius = goober.orderlyRadius ?? 58;
  let centerX = goober.patternOriginX;
  let centerY = goober.patternOriginY;
  if (centerX === undefined || centerY === undefined) {
    if (goober.orderlyPattern === "circle") {
      centerX = goober.x - radius;
      centerY = goober.y;
    } else if (goober.orderlyPattern === "triangle") {
      centerX = goober.x;
      centerY = goober.y + radius;
    } else {
      centerX = goober.x + radius;
      centerY = goober.y + radius;
    }
  }

  let boundsRadius = maxRadius;
  if (goober.orderlyPattern === "triangle") boundsRadius *= xFactor;
  const minCenterX = edge + boundsRadius;
  const maxCenterX = width - edge - boundsRadius;
  const minCenterY = edge + maxRadius;
  const maxCenterY = height - edge - maxRadius;
  const safeMinX = Math.min(minCenterX, width / 2);
  const safeMaxX = Math.max(maxCenterX, width / 2);
  const safeMinY = Math.min(minCenterY, height / 2);
  const safeMaxY = Math.max(maxCenterY, height / 2);
  const safeCenterX = Math.max(safeMinX, Math.min(safeMaxX, centerX));
  const safeCenterY = Math.max(safeMinY, Math.min(safeMaxY, centerY));
  const needsNewPath = Math.abs(radius - maxRadius) > 0.5 || safeCenterX !== centerX || safeCenterY !== centerY;
  if (needsNewPath) {
    radius = maxRadius;
    centerX = safeCenterX;
    centerY = safeCenterY;
    goober.orderlyRadius = radius;
    goober.patternOriginX = centerX;
    goober.patternOriginY = centerY;
    goober.patternDistance = 0;
  }
  if (radius <= 0) {
    goober.x = centerX;
    goober.y = centerY;
    goober.velocityX = 0;
    goober.velocityY = 0;
    return;
  }
  const vertices = goober.orderlyPattern === "triangle"
    ? [[0, -radius], [radius * Math.sqrt(3) / 2, radius / 2], [-radius * Math.sqrt(3) / 2, radius / 2]]
    : [[-radius, -radius], [radius, -radius], [radius, radius], [-radius, radius]];
  const perimeter = goober.orderlyPattern === "circle" ? Math.PI * 2 * radius : vertices.reduce((total, point, index) => {
    const next = vertices[(index + 1) % vertices.length];
    return total + Math.hypot(next[0] - point[0], next[1] - point[1]);
  }, 0);
  const distance = ((goober.patternDistance ?? 0) + MAX_GOOBER_SPEED_UNITS * goober.speedFactor * deltaSeconds) % perimeter;
  goober.patternDistance = distance;

  let nextX: number;
  let nextY: number;
  if (goober.orderlyPattern === "circle") {
    const angle = distance / radius;
    nextX = centerX + Math.cos(angle) * radius;
    nextY = centerY + Math.sin(angle) * radius;
  } else {
    let remaining = distance;
    let segment = 0;
    while (segment < vertices.length - 1) {
      const current = vertices[segment];
      const next = vertices[segment + 1];
      const length = Math.hypot(next[0] - current[0], next[1] - current[1]);
      if (remaining <= length) break;
      remaining -= length;
      segment++;
    }
    const current = vertices[segment];
    const next = vertices[(segment + 1) % vertices.length];
    const length = Math.hypot(next[0] - current[0], next[1] - current[1]);
    const progress = remaining / length;
    nextX = centerX + current[0] + (next[0] - current[0]) * progress;
    nextY = centerY + current[1] + (next[1] - current[1]) * progress;
  }

  const deltaX = nextX - goober.x;
  const deltaY = nextY - goober.y;
  goober.x = nextX;
  goober.y = nextY;
  goober.velocityX = deltaX / deltaSeconds;
  goober.velocityY = deltaY / deltaSeconds;
  if (deltaX !== 0 || deltaY !== 0) goober.heading = Math.atan2(deltaY, deltaX);
}


