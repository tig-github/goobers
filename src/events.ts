export type FieldEventType = "gathering" | "drift" | "color-parade" | "conga-line" | "golden-goober" | "rainbow-goober" | "gassy";

interface TimedFieldEvent {
  readonly type: FieldEventType;
  readonly remainingSeconds: number;
}

export interface GatheringEvent extends TimedFieldEvent {
  readonly type: "gathering";
  readonly x: number;
  readonly y: number;
}

export interface DriftEvent extends TimedFieldEvent {
  readonly type: "drift";
  readonly directionX: number;
  readonly directionY: number;
}

export interface ColorParadeEvent extends TimedFieldEvent {
  readonly type: "color-parade";
}

export interface CongaLineEvent extends TimedFieldEvent {
  readonly type: "conga-line";
}

export interface GoldenGooberEvent extends TimedFieldEvent {
  readonly type: "golden-goober";
}

export interface RainbowGooberEvent extends TimedFieldEvent {
  readonly type: "rainbow-goober";
}

export interface GassyEvent extends TimedFieldEvent {
  readonly type: "gassy";
}

export type FieldEvent = GatheringEvent | DriftEvent | ColorParadeEvent | CongaLineEvent | GoldenGooberEvent | RainbowGooberEvent | GassyEvent;

const EVENT_DURATION_SECONDS = 30;
const COLOR_PARADE_DURATION_SECONDS = 60;
const CONGA_LINE_DURATION_SECONDS = 90;
const GOLDEN_GOOBER_DURATION_SECONDS = 45;
const GOLDEN_GOOBER_DURATION_VARIATION_SECONDS = 3;
const EVENT_COOLDOWN_SECONDS = 15 * 60;
const EVENT_CHECK_INTERVAL_SECONDS = 1;
const EVENT_CHANCE_PER_CHECK = 1 / 240;
const FIELD_EDGE_PADDING = 100;
const INITIAL_EVENT_DELAY_SECONDS = 60;
const RANDOM_EVENT_TYPES: readonly FieldEventType[] = ["gathering", "drift", "color-parade", "conga-line", "golden-goober", "gassy"];

export class EventSystem {
  private activeEvent: FieldEvent | null = null;
  private cooldownSeconds = INITIAL_EVENT_DELAY_SECONDS;
  private checkElapsed = 0;

  trigger(type: FieldEventType, width: number, height: number): FieldEvent {
    if (type === "gathering") {
      const horizontalRange = Math.max(0, width - FIELD_EDGE_PADDING * 2);
      const verticalRange = Math.max(0, height - FIELD_EDGE_PADDING * 2);
      this.activeEvent = {
        type,
        x: FIELD_EDGE_PADDING + Math.random() * horizontalRange,
        y: FIELD_EDGE_PADDING + Math.random() * verticalRange,
        remainingSeconds: EVENT_DURATION_SECONDS,
      };
    } else if (type === "drift") {
      const angle = Math.random() * Math.PI * 2;
      this.activeEvent = {
        type,
        directionX: Math.cos(angle),
        directionY: Math.sin(angle),
        remainingSeconds: EVENT_DURATION_SECONDS,
      };
    } else {
      this.activeEvent = {
        type,
        remainingSeconds: type === "golden-goober" || type === "rainbow-goober"
          ? GOLDEN_GOOBER_DURATION_SECONDS + (Math.random() * 2 - 1) * GOLDEN_GOOBER_DURATION_VARIATION_SECONDS
          : type === "color-parade"
          ? COLOR_PARADE_DURATION_SECONDS
          : type === "conga-line"
            ? CONGA_LINE_DURATION_SECONDS
            : EVENT_DURATION_SECONDS,
      };
    }
    this.checkElapsed = 0;
    return this.activeEvent;
  }

  update(deltaSeconds: number, width: number, height: number): { event: FieldEvent | null; ended: FieldEvent | null } {
    if (deltaSeconds <= 0) return { event: this.activeEvent, ended: null };

    if (this.activeEvent) {
      const remainingSeconds = this.activeEvent.remainingSeconds - deltaSeconds;
      if (remainingSeconds <= 0) {
        const ended = this.activeEvent;
        this.activeEvent = null;
        this.cooldownSeconds = EVENT_COOLDOWN_SECONDS;
        return { event: null, ended };
      }
      this.activeEvent = { ...this.activeEvent, remainingSeconds };
      return { event: this.activeEvent, ended: null };
    }

    if (this.cooldownSeconds > 0) {
      this.cooldownSeconds = Math.max(0, this.cooldownSeconds - deltaSeconds);
      return { event: null, ended: null };
    }

    this.checkElapsed += deltaSeconds;
    while (this.checkElapsed >= EVENT_CHECK_INTERVAL_SECONDS) {
      this.checkElapsed -= EVENT_CHECK_INTERVAL_SECONDS;
      if (Math.random() < EVENT_CHANCE_PER_CHECK) {
        const roll = Math.random() * (RANDOM_EVENT_TYPES.length + 0.5);
        const type = roll < RANDOM_EVENT_TYPES.length
          ? RANDOM_EVENT_TYPES[Math.floor(roll)]
          : "rainbow-goober";
        this.trigger(type, width, height);
        break;
      }
    }

    return { event: this.activeEvent, ended: null };
  }

  reset(): void {
    this.activeEvent = null;
    this.cooldownSeconds = INITIAL_EVENT_DELAY_SECONDS;
    this.checkElapsed = 0;
  }
}
