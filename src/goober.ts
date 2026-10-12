import type { Personality } from "./personalities";

export type SpecialType = "tiny" | "speedy" | "orderly" | "glowy" | "golden" | "rainbow" | "chameleon" | "artist";
export type OrderlyPattern = "triangle" | "circle" | "square";

/** The shared fields needed to assign and configure a special type. */
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

/** Core goober data used by the simulation and renderer. */
export interface GooberBase extends SpecialGoober {
  id: number;
  name: string;
  velocityX: number;
  velocityY: number;
  heading: number;
  wanderAngle: number;
  nextTurn: number;
  bobOffset: number;
  color: string;
  personalityStrength: number;
  preferredCorner: number;
}

export interface OrderlyGooberState {
  orderlyPattern?: OrderlyPattern;
  patternOriginX?: number;
  patternOriginY?: number;
  patternDistance?: number;
  orderlyRadius?: number;
}

export interface EventGooberState {
  isGoldenEventVisitor?: boolean;
  isRainbowEventVisitor?: boolean;
  isEventGoober?: boolean;
  isGoldenLeaving?: boolean;
  isEventVisitorLeaving?: boolean;
  hasLeftField?: boolean;
  rainbowSpinTurns?: number;
  isRainbowSpinning?: boolean;
}

export interface ArtistGooberState {
  artistCellX?: number;
  artistCellY?: number;
  artistDwell?: number;
  artistPaintedCell?: boolean;
  isArtistPainting?: boolean;
  artistBreakRemaining?: number;
  artistNextBreak?: number;
}

export interface PersonalityGooberState {
  homeX?: number;
  homeY?: number;
  explorerX?: number;
  explorerY?: number;
  napRemaining?: number;
  nextNap?: number;
  dizzyPhase?: number;
  playfulTargetId?: number;
  orbitDirection?: number;
}

export interface Goober extends GooberBase, EventGooberState, ArtistGooberState, PersonalityGooberState {}

export interface ArtistPaint {
  x: number;
  y: number;
  color: string;
  age: number;
}
