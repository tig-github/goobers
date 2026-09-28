export type Personality = "shy" | "social" | "chaotic" | "orderly";
export type PersonalityBehavior = "keep-distance" | "seek-group" | "wander" | "pattern";

export interface PersonalityDefinition {
  readonly id: Personality;
  readonly name: string;
  readonly description: string;
  /** Whether naturally spawned goobers can have this personality. */
  readonly availableAtSpawn: boolean;
  readonly behavior: PersonalityBehavior;
  readonly turniness: number;
  readonly turnInterval: readonly [number, number];
  readonly separation: number;
  readonly speedMultiplier: readonly [number, number];
}

export const PERSONALITIES: readonly PersonalityDefinition[] = [
  { id: "shy", name: "Shy", description: "Keeps a little extra space and likes the corners.", availableAtSpawn: true, behavior: "keep-distance", turniness: 2.2, turnInterval: [0.8, 3.2], separation: 1.7, speedMultiplier: [1, 1] },
  { id: "social", name: "Social", description: "Enjoys drifting toward nearby goobers.", availableAtSpawn: true, behavior: "seek-group", turniness: 2.2, turnInterval: [0.8, 3.2], separation: 1, speedMultiplier: [1, 1] },
  { id: "chaotic", name: "Chaotic", description: "Turns often and never quite follows a plan.", availableAtSpawn: true, behavior: "wander", turniness: 4.8, turnInterval: [0.25, 1.05], separation: 1, speedMultiplier: [1.2, 1.55] },
  { id: "orderly", name: "Orderly", description: "A rare special personality that travels in a pattern.", availableAtSpawn: false, behavior: "pattern", turniness: 0, turnInterval: [0, 0], separation: 0, speedMultiplier: [1, 1] },
] as const;

export const PERSONALITIES_BY_ID: Readonly<Record<Personality, PersonalityDefinition>> =
  Object.fromEntries(PERSONALITIES.map((personality) => [personality.id, personality])) as Record<Personality, PersonalityDefinition>;

export const SPAWN_PERSONALITIES: readonly Personality[] = PERSONALITIES
  .filter((personality) => personality.availableAtSpawn)
  .map((personality) => personality.id);
