export type Personality = "shy" | "social" | "chaotic" | "curious" | "orderly";
export type PersonalityBehavior = "keep-distance" | "seek-group" | "wander" | "curious" | "pattern";

export interface PersonalityDefinition {
  readonly id: Personality;
  readonly name: string;
  readonly description: string;
  /** Whether naturally spawned goobers can have this personality. */
  readonly availableAtSpawn: boolean;
  /** Relative chance among personalities available at spawn. */
  readonly spawnWeight: number;
  readonly behavior: PersonalityBehavior;
  readonly turniness: number;
  readonly turnInterval: readonly [number, number];
  readonly separation: number;
  readonly speedMultiplier: readonly [number, number];
}

export const PERSONALITIES: readonly PersonalityDefinition[] = [
  { id: "shy", name: "Shy", description: "Keeps a little extra space and likes the corners.", availableAtSpawn: true, spawnWeight: 1, behavior: "keep-distance", turniness: 2.2, turnInterval: [0.8, 3.2], separation: 1.7, speedMultiplier: [1, 1] },
  { id: "social", name: "Social", description: "Enjoys drifting toward nearby goobers.", availableAtSpawn: true, spawnWeight: 1, behavior: "seek-group", turniness: 2.2, turnInterval: [0.8, 3.2], separation: 1, speedMultiplier: [1, 1] },
  { id: "chaotic", name: "Chaotic", description: "Turns often and never quite follows a plan.", availableAtSpawn: true, spawnWeight: 1, behavior: "wander", turniness: 4.8, turnInterval: [0.25, 1.05], separation: 1, speedMultiplier: [1.2, 1.55] },
  { id: "curious", name: "Curious", description: "Wanders toward special goobers, then sets off to explore again.", availableAtSpawn: true, spawnWeight: 0.5, behavior: "curious", turniness: 2.8, turnInterval: [0.7, 2.8], separation: 1, speedMultiplier: [1, 1.1] },
  { id: "orderly", name: "Orderly", description: "A rare special personality that travels in a pattern.", availableAtSpawn: false, spawnWeight: 0, behavior: "pattern", turniness: 0, turnInterval: [0, 0], separation: 0, speedMultiplier: [1, 1] },
] as const;

export const PERSONALITIES_BY_ID: Readonly<Record<Personality, PersonalityDefinition>> =
  Object.fromEntries(PERSONALITIES.map((personality) => [personality.id, personality])) as Record<Personality, PersonalityDefinition>;

export const SPAWN_PERSONALITIES: readonly Personality[] = PERSONALITIES
  .filter((personality) => personality.availableAtSpawn)
  .map((personality) => personality.id);

export function chooseSpawnPersonality(random = Math.random): Personality {
  const available = PERSONALITIES.filter(({ availableAtSpawn }) => availableAtSpawn);
  const totalWeight = available.reduce((sum, personality) => sum + personality.spawnWeight, 0);
  let roll = random() * totalWeight;
  for (const personality of available) {
    roll -= personality.spawnWeight;
    if (roll < 0) return personality.id;
  }
  return available[available.length - 1].id;
}
