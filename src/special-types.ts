import type { SpecialGoober, SpecialType } from "./goober";
import type { RandomSource } from "./random";
export type { OrderlyPattern, SpecialType } from "./goober";

export const MIN_ORDERLY_RADIUS = 36;
export const MAX_ORDERLY_RADIUS = 180;

export function randomOrderlyRadius(random: RandomSource = Math.random): number {
  return MIN_ORDERLY_RADIUS + random() * (MAX_ORDERLY_RADIUS - MIN_ORDERLY_RADIUS);
}

export function initializeOrderlyPath(goober: SpecialGoober, random: RandomSource = Math.random): void {
  const radius = goober.orderlyRadius ?? randomOrderlyRadius(random);
  goober.orderlyRadius = radius;
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


export const SPECIAL_TYPE_CHANCES: Readonly<Record<SpecialType, number>> = {
  tiny: 2.5,
  speedy: 2.5,
  orderly: 2.5,
  glowy: 2.5,
  golden: 0,
  rainbow: 0,
  chameleon: 2.5,
  artist: 2.5,
};

type SpecialTypeEffect = (goober: SpecialGoober, random: RandomSource) => void;
const SPECIAL_TYPE_EFFECTS: Partial<Record<SpecialType, SpecialTypeEffect>> = {
  tiny: (goober) => { goober.size *= 0.55; },
  speedy: (goober) => { goober.speedFactor *= 2; },
  orderly: (goober, random) => {
    goober.personality = "orderly";
    goober.orderlyPattern = (["triangle", "circle", "square"] as const)[Math.floor(random() * 3)];
    initializeOrderlyPath(goober, random);
  },
};

export class SpecialTypeRegistry {
  private readonly chances: Readonly<Record<SpecialType, number>>;

  constructor(chances: Readonly<Record<SpecialType, number>> = SPECIAL_TYPE_CHANCES) {
    this.chances = chances;
    const totalChance = Object.values(chances).reduce((total, chance) => total + chance, 0);
    if (Object.values(chances).some((chance) => chance < 0 || chance > 100) || totalChance > 100) {
      throw new RangeError("Special type chances must be between 0 and 100 and total no more than 100.");
    }
  }

  assign(goober: SpecialGoober, random: RandomSource = Math.random): void {
    let roll = random() * 100;
    for (const [type, chance] of Object.entries(this.chances) as [SpecialType, number][]) {
      if (roll >= chance) {
        roll -= chance;
        continue;
      }
      this.apply(type, goober, random);
      return;
    }
  }

  assignSpecific(type: SpecialType, goober: SpecialGoober, random: RandomSource = Math.random): void {
    this.apply(type, goober, random);
  }

  private apply(type: SpecialType, goober: SpecialGoober, random: RandomSource): void {
    goober.specialType = type;
    SPECIAL_TYPE_EFFECTS[type]?.(goober, random);
  }
}

export const specialTypeRegistry = new SpecialTypeRegistry();

export function applySpecialType(goober: SpecialGoober, type: SpecialType, random: RandomSource = Math.random): void {
  specialTypeRegistry.assignSpecific(type, goober, random);
}


