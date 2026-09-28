import type { Goober } from "./simulation";
import { WORLD_HEIGHT, WORLD_WIDTH } from "./consts";
import type { FieldEvent } from "./events";

export class ArenaRenderer {
  worldWidth = WORLD_WIDTH;
  worldHeight = WORLD_HEIGHT;
  private zoom = 1;
  private centerX = WORLD_WIDTH / 2;
  private centerY = WORLD_HEIGHT / 2;
  private followedGooberId: number | null = null;
  private readonly context: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private theme: "dark" | "light" = "light";
  private readonly renderedHeadings = new Map<number, number>();
  private readonly portraitHeadings = new Map<number, number>();
  private previousRenderTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable in this browser.");
    this.canvas = canvas;
    this.context = context;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  draw(goobers: Goober[], elapsed: number, selectedId: number | null = null, fieldEvent?: FieldEvent): void {
    const now = performance.now();
    const delta = this.previousRenderTime === 0 ? 0 : Math.min((now - this.previousRenderTime) / 1000, 0.05);
    this.previousRenderTime = now;
    const headingSmoothing = 1 - Math.exp(-delta * 7);
    const portraitSmoothing = 1 - Math.exp(-delta * 1.8);
    if (this.followedGooberId !== null) {
      const followed = goobers.find((goober) => goober.id === this.followedGooberId);
      if (followed) {
        const followSmoothing = 1 - Math.exp(-delta * 8);
        this.centerX += (followed.x - this.centerX) * followSmoothing;
        this.centerY += (followed.y - this.centerY) * followSmoothing;
        this.clampView();
      } else {
        this.followedGooberId = null;
      }
    }
    for (const goober of goobers) {
      const previous = this.renderedHeadings.get(goober.id);
      if (previous === undefined) this.renderedHeadings.set(goober.id, goober.heading);
      else {
        const difference = Math.atan2(Math.sin(goober.heading - previous), Math.cos(goober.heading - previous));
        this.renderedHeadings.set(goober.id, previous + difference * headingSmoothing);
      }
      const rendered = this.renderedHeadings.get(goober.id) ?? goober.heading;
      const portraitPrevious = this.portraitHeadings.get(goober.id);
      if (portraitPrevious === undefined) this.portraitHeadings.set(goober.id, rendered);
      else {
        const difference = Math.atan2(Math.sin(rendered - portraitPrevious), Math.cos(rendered - portraitPrevious));
        this.portraitHeadings.set(goober.id, portraitPrevious + difference * portraitSmoothing);
      }
    }
    const { context, canvas } = this;
    const viewWidth = this.worldWidth / this.zoom;
    const viewHeight = this.worldHeight / this.zoom;
    const left = this.centerX - viewWidth / 2;
    const top = this.centerY - viewHeight / 2;
    const scaleX = canvas.width / viewWidth;
    const scaleY = canvas.height / viewHeight;
    context.setTransform(
      scaleX,
      0,
      0,
      scaleY,
      -left * scaleX,
      -top * scaleY,
    );
    context.clearRect(left, top, viewWidth, viewHeight);
    this.drawField();
    if (fieldEvent) this.drawFieldEvent(fieldEvent, elapsed);
    for (const goober of goobers) {
      this.drawGoober(goober, elapsed, this.context, this.renderedHeadings.get(goober.id) ?? goober.heading, goober.id === selectedId);
    }
  }

  pickGoober(clientX: number, clientY: number, goobers: Goober[]): Goober | undefined {
    const bounds = this.canvas.getBoundingClientRect();
    const viewWidth = this.worldWidth / this.zoom;
    const viewHeight = this.worldHeight / this.zoom;
    const worldX = this.centerX - viewWidth / 2 + (clientX - bounds.left) / bounds.width * viewWidth;
    const worldY = this.centerY - viewHeight / 2 + (clientY - bounds.top) / bounds.height * viewHeight;
    return [...goobers].reverse().find((goober) => Math.hypot(worldX - goober.x, worldY - goober.y) <= 34 * goober.size);
  }

  drawPortrait(canvas: HTMLCanvasElement, goober: Goober, elapsed: number): void {
    const context = canvas.getContext("2d");
    if (!context) return;
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(bounds.width * ratio) || canvas.height !== Math.round(bounds.height * ratio)) {
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
    }
    const scale = 2.6;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, bounds.width, bounds.height);
    context.setTransform(ratio * scale, 0, 0, ratio * scale,
      ratio * (bounds.width / 2 - goober.x * scale),
      ratio * (bounds.height / 2 - goober.y * scale));
    this.drawGoober(goober, elapsed, context, this.portraitHeadings.get(goober.id) ?? goober.heading);
  }

  setTheme(theme: "dark" | "light"): void {
    this.theme = theme;
  }

  setFieldScale(scale: number): void {
    this.worldWidth = WORLD_WIDTH * scale;
    this.worldHeight = WORLD_HEIGHT * scale;
    this.centerX = this.worldWidth / 2;
    this.centerY = this.worldHeight / 2;
  }

  setZoom(zoom: number): void {
    this.zoom = zoom;
    this.clampView();
  }

  setZoomAt(zoom: number, clientX: number, clientY: number): void {
    const bounds = this.canvas.getBoundingClientRect();
    const horizontalOffset = (clientX - bounds.left) / bounds.width - 0.5;
    const verticalOffset = (clientY - bounds.top) / bounds.height - 0.5;
    const worldX = this.centerX + horizontalOffset * this.worldWidth / this.zoom;
    const worldY = this.centerY + verticalOffset * this.worldHeight / this.zoom;
    this.zoom = zoom;
    this.centerX = worldX - horizontalOffset * this.worldWidth / this.zoom;
    this.centerY = worldY - verticalOffset * this.worldHeight / this.zoom;
    this.clampView();
  }

  setFollowTarget(gooberId: number | null): void {
    this.followedGooberId = gooberId;
  }

  panByPixels(deltaX: number, deltaY: number): void {
    if (this.zoom <= 1) return;
    const bounds = this.canvas.getBoundingClientRect();
    this.centerX -= deltaX / bounds.width * this.worldWidth / this.zoom;
    this.centerY -= deltaY / bounds.height * this.worldHeight / this.zoom;
    this.clampView();
  }

  private clampView(): void {
    const halfWidth = this.worldWidth / this.zoom / 2;
    const halfHeight = this.worldHeight / this.zoom / 2;
    this.centerX = Math.max(halfWidth, Math.min(this.worldWidth - halfWidth, this.centerX));
    this.centerY = Math.max(halfHeight, Math.min(this.worldHeight - halfHeight, this.centerY));
  }

  private resize(): void {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const bounds = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(bounds.width * pixelRatio);
    this.canvas.height = Math.round(bounds.height * pixelRatio);
  }

  private drawFieldEvent(event: FieldEvent, elapsed: number): void {
    if (event.type === "drift") {
      const context = this.context;
      const angle = Math.atan2(event.directionY, event.directionX);
      context.save();
      context.strokeStyle = this.theme === "light" ? "rgba(59, 129, 166, 0.48)" : "rgba(122, 205, 231, 0.55)";
      context.fillStyle = context.strokeStyle;
      context.lineWidth = 3;
      for (let column = 1; column <= 5; column++) {
        for (let row = 1; row <= 3; row++) {
          const x = (this.worldWidth / 6) * column;
          const y = (this.worldHeight / 4) * row;
          context.save();
          context.translate(x, y + Math.sin(elapsed * 2 + column + row) * 5);
          context.rotate(angle);
          context.beginPath();
          context.moveTo(-15, 0);
          context.lineTo(15, 0);
          context.lineTo(7, -7);
          context.moveTo(15, 0);
          context.lineTo(7, 7);
          context.stroke();
          context.restore();
        }
      }
      context.restore();
    } else if (event.type === "gathering") {
      this.drawGatheringMarker(event, elapsed);
    }
  }

  private drawGatheringMarker(target: { x: number; y: number }, elapsed: number): void {
    const context = this.context;
    const pulse = 1 + Math.sin(elapsed * 5) * 0.12;
    context.save();
    context.translate(target.x, target.y);
    context.scale(pulse, pulse);
    context.strokeStyle = this.theme === "light" ? "rgba(214, 151, 45, 0.75)" : "rgba(255, 204, 103, 0.85)";
    context.fillStyle = this.theme === "light" ? "rgba(244, 187, 79, 0.18)" : "rgba(255, 204, 103, 0.16)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, 32, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.beginPath();
    context.arc(0, 0, 46, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(-8, 0); context.lineTo(8, 0);
    context.moveTo(0, -8); context.lineTo(0, 8);
    context.stroke();
    context.restore();
  }

  private drawField(): void {
    const context = this.context;
    const light = this.theme === "light";
    context.fillStyle = light ? "#e6edf3" : "#101c24";
    context.fillRect(0, 0, this.worldWidth, this.worldHeight);

    context.strokeStyle = light ? "rgba(54, 83, 108, 0.10)" : "rgba(163, 207, 216, 0.06)";
    context.lineWidth = 1;
    for (let x = 24; x < this.worldWidth; x += 48) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, this.worldHeight);
      context.stroke();
    }
    for (let y = 24; y < this.worldHeight; y += 48) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(this.worldWidth, y);
      context.stroke();
    }

  }

  private drawGoober(goober: Goober, elapsed: number, context = this.context, heading = goober.heading, selected = false): void {
    const bob = Math.sin(elapsed * 5 + goober.bobOffset) > 0.45 ? 1 : 0;
    const pixel = 6 * goober.size;
    const left = -pixel * 4.5;
    const top = -pixel * 4.5;
    if (goober.specialType === "glowy") {
      context.save();
      context.globalAlpha = 0.2 + Math.sin(elapsed * 3 + goober.bobOffset) * 0.08;
      context.fillStyle = goober.color;
      context.shadowColor = goober.color;
      context.shadowBlur = pixel * 3;
      context.beginPath();
      context.ellipse(goober.x, goober.y + bob, pixel * 8, pixel * 4.4, heading, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    if (selected) {
      const radius = pixel * 5.05;
      const arm = pixel * 1.25;
      context.beginPath();
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          const x = goober.x + sx * radius;
          const y = goober.y + bob + sy * radius;
          context.moveTo(x - sx * arm, y);
          context.lineTo(x, y);
          context.lineTo(x, y - sy * arm);
        }
      }
      context.lineCap = "square";
      context.strokeStyle = "#07111a";
      context.lineWidth = Math.max(3, pixel * 0.62);
      context.stroke();
      context.strokeStyle = this.theme === "light" ? "#ffffff" : "#d8e8ff";
      context.lineWidth = Math.max(1.5, pixel * 0.28);
      context.stroke();
    }
    // A compact 9×9 pixel body. Eyes are separate so they can follow heading.
    const sprite = [
      "..kkkkk..",
      ".kccccck.",
      "kccccccck",
      "kccccccck",
      "kccccccck",
      "kccccccck",
      ".kccccck.",
      "..kccck..",
      "...kkk...",
    ];
    context.save();
    context.translate(goober.x, goober.y + bob);
    context.rotate(heading - Math.PI / 2);
    for (let y = 0; y < sprite.length; y++) {
      for (let x = 0; x < sprite[y].length; x++) {
        const shade = sprite[y][x];
        if (shade === ".") continue;
        context.fillStyle = shade === "k" ? "#07111a" : goober.color;
        context.fillRect(left + x * pixel, top + y * pixel, pixel, pixel);
      }
    }
    context.restore();

    const forwardX = Math.cos(heading);
    const forwardY = Math.sin(heading);
    const sideX = -forwardY;
    const sideY = forwardX;
    context.fillStyle = "#e8f4ff";
    for (const side of [-1, 1]) {
      const eyeX = goober.x + (forwardX * 1.15 + sideX * side * 1.05) * pixel;
      const eyeY = goober.y + bob + (forwardY * 1.15 + sideY * side * 1.05) * pixel;
      context.fillRect(eyeX - pixel / 2, eyeY - pixel / 2, pixel, pixel);
    }
  }
}
