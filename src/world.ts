import { WORLD_HEIGHT, WORLD_WIDTH } from "./consts";
import {
  createGoobers,
  createGoldenEventGoober,
  createRainbowEventGoober,
  maybeAssignSpecialType,
  resumeOrderlyPaths,
  spawnGooberFromLoadout,
  stepSimulation,
  type GooberLoadout,
} from "./simulation";
import type { ArtistPaint, Goober } from "./goober";
import { EventSystem, type FieldEvent, type FieldEventType } from "./events";
import { createSeededRandom, type RandomSource } from "./random";
import { applySpecialType, type SpecialType } from "./special-types";

export interface WorldStepResult {
  started: FieldEvent | null;
  ended: FieldEvent | null;
  visitorArrived: boolean;
  departedVisitor: boolean;
  departedIds: number[];
}

/** Owns the running simulation and coordinates timed field events. */
export class World {
  private readonly gooberList: Goober[];
  private readonly paintList: ArtistPaint[] = [];
  private elapsedValue = 0;
  private currentEvent: FieldEvent | null = null;
  private readonly events: EventSystem;
  private widthValue = WORLD_WIDTH;
  private heightValue = WORLD_HEIGHT;
  private readonly createInitialGoobers: (width: number, height: number, random: RandomSource) => Goober[];
  readonly random: RandomSource;

  constructor(createInitialGoobers: (width: number, height: number, random: RandomSource) => Goober[], random: RandomSource = createSeededRandom(Date.now())) {
    this.random = random;
    this.createInitialGoobers = createInitialGoobers;
    this.events = new EventSystem(random);
    this.gooberList = createInitialGoobers(this.widthValue, this.heightValue, random);
  }

  get goobers(): readonly Goober[] { return this.gooberList; }
  get artistPaints(): readonly ArtistPaint[] { return this.paintList; }
  get elapsedSeconds(): number { return this.elapsedValue; }
  get activeEvent(): FieldEvent | null { return this.currentEvent; }
  get width(): number { return this.widthValue; }
  get height(): number { return this.heightValue; }

  setBounds(width: number, height: number): void {
    this.widthValue = width;
    this.heightValue = height;
  }

  setFieldScale(scale: number): void {
    this.setBounds(WORLD_WIDTH * scale, WORLD_HEIGHT * scale);
  }

  add(...goobers: Goober[]): void {
    this.gooberList.push(...goobers);
  }

  createGoobers(count: number, color: string): Goober[] {
    return createGoobers(count, color, this.widthValue, this.heightValue, this.random);
  }

  spawnLoadout(loadout: GooberLoadout): Goober {
    return spawnGooberFromLoadout(loadout, this.widthValue, this.heightValue, this.random);
  }

  assignRandomSpecialType(goober: Goober): void {
    maybeAssignSpecialType(goober, this.random);
  }

  assignSpecialType(goober: Goober, type: SpecialType): void {
    applySpecialType(goober, type, this.random);
  }

  remove(id: number): void {
    const index = this.gooberList.findIndex((goober) => goober.id === id);
    if (index >= 0) this.gooberList.splice(index, 1);
  }

  removeLast(): Goober | undefined {
    return this.gooberList.pop();
  }

  clear(): void {
    this.gooberList.length = 0;
  }

  reset(): void {
    this.gooberList.splice(0, this.gooberList.length, ...this.createInitialGoobers(this.widthValue, this.heightValue, this.random));
    this.paintList.length = 0;
    this.elapsedValue = 0;
    this.events.reset();
    this.currentEvent = null;
  }

  trigger(type: FieldEventType): FieldEvent {
    const event = this.events.trigger(type, this.widthValue, this.heightValue);
    this.currentEvent = event;
    if (type === "golden-goober") this.add(createGoldenEventGoober(this.widthValue, this.heightValue, this.random));
    if (type === "rainbow-goober") this.add(createRainbowEventGoober(this.widthValue, this.heightValue, this.random));
    return event;
  }

  step(deltaSeconds: number): WorldStepResult {
    this.elapsedValue += deltaSeconds;
    const update = this.events.update(deltaSeconds, this.widthValue, this.heightValue);
    const started = !this.currentEvent && update.event ? update.event : null;
    const visitorArrived = started?.type === "golden-goober" || started?.type === "rainbow-goober";
    if (started?.type === "golden-goober") this.add(createGoldenEventGoober(this.widthValue, this.heightValue, this.random));
    if (started?.type === "rainbow-goober") this.add(createRainbowEventGoober(this.widthValue, this.heightValue, this.random));
    if (update.ended?.type === "golden-goober" || update.ended?.type === "rainbow-goober") {
      for (const goober of this.gooberList) {
        if (goober.isEventGoober) goober.isEventVisitorLeaving = true;
      }
    }
    if (update.ended && update.ended.type !== "gathering") resumeOrderlyPaths(this.gooberList, this.random);
    this.currentEvent = update.event;
    stepSimulation(this.gooberList, deltaSeconds, this.widthValue, this.heightValue, this.currentEvent ?? undefined, this.paintList, this.random);

    const departedIds: number[] = [];
    let departedVisitor = false;
    for (let index = this.gooberList.length - 1; index >= 0; index--) {
      const goober = this.gooberList[index];
      if (!goober.hasLeftField) continue;
      departedIds.push(goober.id);
      departedVisitor ||= Boolean(goober.isEventGoober);
      this.gooberList.splice(index, 1);
    }
    return { started, ended: update.ended, visitorArrived, departedVisitor, departedIds };
  }
}
