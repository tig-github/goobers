export type Personality = "shy" | "social" | "chaotic" | "curious" | "orderly" | "homebody" | "explorer" | "sleepy" | "dizzy" | "jealous" | "picky" | "contrarian" | "wallflower" | "orbiter" | "playful";
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
  { id: "homebody", name: "Homebody", description: "Stays close to where it spawned, while still exploring a little.", availableAtSpawn: true, spawnWeight: 0.45, behavior: "wander", turniness: 2.2, turnInterval: [0.8, 3.2], separation: 1, speedMultiplier: [0.8, 1] },
  { id: "explorer", name: "Explorer", description: "Sets off toward faraway random waypoints.", availableAtSpawn: true, spawnWeight: 0.45, behavior: "wander", turniness: 1, turnInterval: [2, 5], separation: 1, speedMultiplier: [1, 1.15] },
  { id: "sleepy", name: "Sleepy", description: "Wanders for a while, then takes a short nap.", availableAtSpawn: true, spawnWeight: 0.45, behavior: "wander", turniness: 2, turnInterval: [0.8, 3.5], separation: 1, speedMultiplier: [0.65, 0.9] },
  { id: "dizzy", name: "Dizzy", description: "Weaves from side to side as it wanders.", availableAtSpawn: true, spawnWeight: 0.45, behavior: "wander", turniness: 2.8, turnInterval: [0.7, 2.8], separation: 1, speedMultiplier: [0.9, 1.05] },
  { id: "jealous", name: "Jealous", description: "Keeps its distance from special-type goobers.", availableAtSpawn: true, spawnWeight: 0.45, behavior: "wander", turniness: 2.2, turnInterval: [0.8, 3.2], separation: 1, speedMultiplier: [1, 1.1] },
  { id: "picky", name: "Picky", description: "Prefers to spend time with goobers of its own color.", availableAtSpawn: true, spawnWeight: 0.45, behavior: "wander", turniness: 2.2, turnInterval: [0.8, 3.2], separation: 1, speedMultiplier: [0.9, 1] },
  { id: "contrarian", name: "Contrarian", description: "Seeks out goobers with different colors.", availableAtSpawn: true, spawnWeight: 0.45, behavior: "wander", turniness: 2.2, turnInterval: [0.8, 3.2], separation: 1, speedMultiplier: [1, 1.1] },
  { id: "wallflower", name: "Wallflower", description: "Keeps to the edges and drifts along the walls.", availableAtSpawn: true, spawnWeight: 0.45, behavior: "wander", turniness: 1.8, turnInterval: [1, 4], separation: 1, speedMultiplier: [0.9, 1] },
  { id: "orbiter", name: "Orbiter", description: "Circles around the nearest goober.", availableAtSpawn: true, spawnWeight: 0.45, behavior: "wander", turniness: 1.5, turnInterval: [1.5, 4], separation: 1, speedMultiplier: [0.9, 1.05] },
  { id: "playful", name: "Playful", description: "Chases a goober, then picks a new playmate when it catches up.", availableAtSpawn: true, spawnWeight: 0.45, behavior: "wander", turniness: 2, turnInterval: [0.8, 3.2], separation: 0.7, speedMultiplier: [1, 1.15] },
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
