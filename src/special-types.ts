import type { Personality } from "./personalities";

export type SpecialType = "tiny" | "speedy" | "orderly" | "glowy" | "golden" | "rainbow";
export type OrderlyPattern = "triangle" | "circle" | "square";
export const MIN_ORDERLY_RADIUS = 36;
export const MAX_ORDERLY_RADIUS = 180;

export function randomOrderlyRadius(): number {
  return MIN_ORDERLY_RADIUS + Math.random() * (MAX_ORDERLY_RADIUS - MIN_ORDERLY_RADIUS);
}

export interface SpecialGoober {
  x: number;
  y: number;
  size: number;
  speedFactor: number;
  personality: Personality;
  specialType: SpecialType | null;
  orderlyPattern?: OrderlyPattern;
  patternOriginX?: number;
  patternOriginY?: number;
  patternDistance?: number;
  orderlyRadius?: number;
}

export const SPECIAL_TYPE_CHANCES: Readonly<Record<SpecialType, number>> = {
  tiny: 2.5,
  speedy: 2.5,
  orderly: 2.5,
  glowy: 2.5,
  golden: 0,
  rainbow: 0,
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

  assign(goober: SpecialGoober): void {
    let roll = Math.random() * 100;
    for (const [type, chance] of Object.entries(this.chances) as [SpecialType, number][]) {
      if (roll >= chance) {
        roll -= chance;
        continue;
      }
      this.apply(type, goober);
      return;
    }
  }

  private apply(type: SpecialType, goober: SpecialGoober): void {
    goober.specialType = type;
    switch (type) {
      case "tiny":
        goober.size *= 0.55;
        break;
      case "speedy":
        goober.speedFactor *= 2;
        break;
      case "orderly":
        goober.personality = "orderly";
        goober.orderlyPattern = (["triangle", "circle", "square"] as const)[Math.floor(Math.random() * 3)];
        goober.patternDistance = 0;
        const radius = randomOrderlyRadius();
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
        break;
      case "glowy":
        break;
      case "golden":
        break;
      case "rainbow":
        break;
    }
  }
}

export const specialTypeRegistry = new SpecialTypeRegistry();


