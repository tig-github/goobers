import { DEFAULT_GOOBER_COLOR, MAX_GOOBER_SPEED_UNITS, WORLD_HEIGHT, WORLD_WIDTH } from "./consts";
import { PERSONALITIES_BY_ID, SPAWN_PERSONALITIES, type Personality } from "./personalities";
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
    const personality = SPAWN_PERSONALITIES[Math.floor(Math.random() * SPAWN_PERSONALITIES.length)];
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
    if ((!fieldEvent || fieldEvent.type === "gathering") && goober.specialType === "orderly" && goober.orderlyPattern) {
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

    const steerLength = Math.hypot(steerX, steerY) || 1;
    const targetSpeed = MAX_GOOBER_SPEED_UNITS * goober.speedFactor;
    const targetX = (steerX / steerLength) * targetSpeed;
    const targetY = (steerY / steerLength) * targetSpeed;
    const response = Math.min(deltaSeconds * 1.25, 1);
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


