import { MAX_GOOBERS } from "../consts";
import type { Goober } from "../goober";
import type { FieldEventType } from "../events";
import type { SpecialType } from "../special-types";
import type { World } from "../world";

interface AdminActions {
  onGooberSpawned(goober: Goober): void;
  onEventTriggered(type: FieldEventType): void;
}

export function mountAdminPanel(world: World, actions: AdminActions): void {
  const adminToggle = document.querySelector<HTMLButtonElement>("#admin-toggle")!;
  const adminPanel = document.querySelector<HTMLElement>("#admin-panel")!;
  const eventsTab = document.querySelector<HTMLButtonElement>("#admin-events-tab")!;
  const spawnTab = document.querySelector<HTMLButtonElement>("#admin-spawn-tab")!;
  const eventsPanel = document.querySelector<HTMLElement>("#admin-events-panel")!;
  const spawnPanel = document.querySelector<HTMLElement>("#admin-spawn-panel")!;
  const form = document.querySelector<HTMLFormElement>("#admin-spawn-form")!;
  const nameInput = document.querySelector<HTMLInputElement>("#admin-goober-name")!;
  const colorInput = document.querySelector<HTMLInputElement>("#admin-goober-color")!;
  const personalityInput = document.querySelector<HTMLSelectElement>("#admin-goober-personality")!;
  const sizeInput = document.querySelector<HTMLInputElement>("#admin-goober-size")!;
  const sizeValue = document.querySelector<HTMLOutputElement>("#admin-goober-size-value")!;
  const speedInput = document.querySelector<HTMLInputElement>("#admin-goober-speed")!;
  const speedValue = document.querySelector<HTMLOutputElement>("#admin-goober-speed-value")!;
  const specialInput = document.querySelector<HTMLSelectElement>("#admin-goober-special")!;
  const status = document.querySelector<HTMLElement>("#admin-spawn-status")!;

  adminToggle.addEventListener("click", () => {
    adminPanel.hidden = !adminPanel.hidden;
    adminToggle.setAttribute("aria-expanded", String(!adminPanel.hidden));
  });
  const selectTab = (tab: "events" | "spawn") => {
    const showSpawn = tab === "spawn";
    eventsTab.classList.toggle("is-active", !showSpawn);
    spawnTab.classList.toggle("is-active", showSpawn);
    eventsTab.setAttribute("aria-selected", String(!showSpawn));
    spawnTab.setAttribute("aria-selected", String(showSpawn));
    eventsPanel.hidden = showSpawn;
    spawnPanel.hidden = !showSpawn;
  };
  eventsTab.addEventListener("click", () => selectTab("events"));
  spawnTab.addEventListener("click", () => selectTab("spawn"));

  personalityInput.addEventListener("change", () => {
    if (personalityInput.value === "orderly") specialInput.value = "orderly";
    else if (specialInput.value === "orderly") specialInput.value = "none";
  });
  specialInput.addEventListener("change", () => {
    if (specialInput.value === "orderly") personalityInput.value = "orderly";
    else if (personalityInput.value === "orderly") personalityInput.value = "shy";
  });
  sizeInput.addEventListener("input", () => { sizeValue.value = `${Number(sizeInput.value).toFixed(2)}\u00d7`; });
  speedInput.addEventListener("input", () => { speedValue.value = `${Number(speedInput.value).toFixed(1)}\u00d7`; });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (world.goobers.length >= MAX_GOOBERS) {
      status.textContent = "field is full";
      return;
    }
    const goober = world.createGoobers(1, colorInput.value)[0];
    goober.size = Number(sizeInput.value);
    goober.speedFactor = Number(speedInput.value);
    goober.personality = personalityInput.value as Goober["personality"];
    const name = nameInput.value.trim();
    if (name) goober.name = name;
    if (specialInput.value !== "none") world.assignSpecialType(goober, specialInput.value as SpecialType);
    world.add(goober);
    actions.onGooberSpawned(goober);
    status.textContent = `${goober.name} spawned`;
  });

  const eventTypes: readonly FieldEventType[] = ["gathering", "drift", "color-parade", "conga-line", "golden-goober", "rainbow-goober", "gassy"];
  for (const type of eventTypes) {
    document.querySelector<HTMLButtonElement>(`#trigger-${type}`)!.addEventListener("click", () => {
      world.trigger(type);
      actions.onEventTriggered(type);
    });
  }
}
