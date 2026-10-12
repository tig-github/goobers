import "./field.css";
import { saveGooberLoadout, type GooberLoadout } from "./simulation";
import type { Goober } from "./goober";
import { ArenaRenderer } from "./renderer";
import { DEFAULT_ZOOM, MAX_GOOBERS, MAX_ZOOM, MIN_ZOOM } from "./consts";
import { mountApp } from "./app/view";
import { createStartingGoobers, presetGooberColors } from "./app/state";
import { BadgeSystem } from "./app/badges";
import { World } from "./world";
import { Progression } from "./progression";
import { FIELD_EVENT_DESCRIPTIONS } from "./events";
import { mountAdminPanel } from "./app/admin";
import { PERSONALITIES } from "./personalities";
import type { SpecialType } from "./special-types";
import { createNotebookView, type NotebookData, type NotebookEntry, type NotebookViewState } from "./app/notebook";
import { createLoadoutsPanel } from "./app/loadouts";
import { FixedStepGameLoop } from "./app/game-loop";
import { createGooberDetails } from "./app/details";

const app = document.querySelector<HTMLDivElement>("#app")!;
mountApp(app);
const canvas = document.querySelector<HTMLCanvasElement>("#arena")!;
const renderer = new ArenaRenderer(canvas);
const detailsPanel = document.querySelector<HTMLElement>("#goober-details")!;
const countOutput =
  document.querySelector<HTMLSpanElement>("#population-count")!;
const clearButton =
  document.querySelector<HTMLButtonElement>("#clear-goobers")!;
const colorInput = document.querySelector<HTMLSelectElement>("#goober-color")!;
const customColorInput =
  document.querySelector<HTMLInputElement>("#custom-color")!;
colorInput.addEventListener("change", () => {
  customColorInput.hidden = colorInput.value !== "custom";
});
const runState = document.querySelector<HTMLSpanElement>("#run-state")!;
const clock = document.querySelector<HTMLSpanElement>("#field-clock")!;
const eventIndicator =
  document.querySelector<HTMLDivElement>("#event-indicator")!;
const themeButton =
  document.querySelector<HTMLButtonElement>("#theme-control")!;
const fieldSizeInput = document.querySelector<HTMLInputElement>("#field-size")!;
const fieldSizeOutput =
  document.querySelector<HTMLOutputElement>("#field-size-value")!;
const zoomInput = document.querySelector<HTMLInputElement>("#zoom-control")!;
const zoomOutput = document.querySelector<HTMLOutputElement>("#zoom-value")!;
let fieldScale = 1;
const world = new World(createStartingGoobers);
const goobers = world.goobers;
const artistPaints = world.artistPaints;
const savedLoadouts: { name: string; loadout: GooberLoadout }[] = [];
const NOTEBOOK_PAGE_SIZE = 6;
const SPECIAL_TYPES: readonly SpecialType[] = [
  "tiny",
  "speedy",
  "orderly",
  "glowy",
  "golden",
  "rainbow",
  "chameleon",
  "artist",
];
const progression = new Progression();
const notebookData: NotebookData = {
  personalities: new Set<string>(),
  specialTypes: new Set<string>(),
  entries: [] as NotebookEntry[],
  loadoutsSaved: 0,
};
const notebookToggle =
  document.querySelector<HTMLButtonElement>("#notebook-toggle")!;
const notebookPanel = document.querySelector<HTMLElement>("#notebook-panel")!;
const badgesToggle =
  document.querySelector<HTMLButtonElement>("#badges-toggle")!;
const badgesPanel = document.querySelector<HTMLElement>("#badges-panel")!;
const badgeSystem = new BadgeSystem(
  badgesToggle,
  badgesPanel,
  document.querySelector<HTMLElement>("#badge-toasts")!,
);
function earnBadge(id: string): void {
  if (progression.earnBadge(id)) badgeSystem.showEarned(id, progression.earnedBadgeIds);
}
function updateIconSidebarPosition(): void {
  const loadoutPanel = document.querySelector<HTMLElement>("#saved-loadouts");
  const top =
    loadoutPanel && !loadoutPanel.hidden
      ? loadoutPanel.getBoundingClientRect().top
      : window.innerHeight / 2;
  document.documentElement.style.setProperty(
    "--icon-sidebar-top",
    `${Math.max(8, top)}px`,
  );
}
const notebookViewState: NotebookViewState = {
  selectedEntry: null,
  listPage: 0,
  catalogPages: { personalities: 0, "special types": 0 },
};
const selection = { selectedGooberId: null as number | null, followedGooberId: null as number | null };
let clearUnlocked = false;
let theme: "dark" | "light" = "light";

function setTheme(nextTheme: "dark" | "light"): void {
  theme = nextTheme;
  document.documentElement.dataset.theme = theme;
  renderer.setTheme(theme);
  themeButton.textContent = theme === "dark" ? "light mode" : "dark mode";
  themeButton.setAttribute(
    "aria-label",
    `Switch to ${theme === "dark" ? "light" : "dark"} mode`,
  );
}

function updatePopulationDisplay(): void {
  countOutput.textContent = String(goobers.length);
  if (goobers.length >= MAX_GOOBERS) clearUnlocked = true;
  clearButton.hidden = !clearUnlocked;
  const populationBadge = progression.populationBadge(goobers.length);
  if (populationBadge) earnBadge(populationBadge);
}

function inspectGoobers(): void {
  progression.observeGoobers(goobers);
}

function addGooberToNotebook(goober: Goober, name: string): void {
  notebookData.entries.push({ name, goober, favorite: false });
  progression.notebookEntryBadges(goober, notebookData.entries.length)
    .forEach(earnBadge);
  notebookData.personalities.add(goober.personality);
  if (goober.specialType) notebookData.specialTypes.add(goober.specialType);
}

function addLoadoutToNotebook(name: string, loadout: GooberLoadout): void {
  const exists = notebookData.entries.some(
    (entry) =>
      entry.name === name &&
      JSON.stringify(saveGooberLoadout(entry.goober)) ===
        JSON.stringify(loadout),
  );
  if (exists) return;
  const goober = world.spawnLoadout(loadout);
  goober.name = name;
  addGooberToNotebook(goober, name);
}

function addNotebookGooberToLoadouts(entry: NotebookEntry): boolean {
  const loadout = saveGooberLoadout(entry.goober);
  const alreadySaved = savedLoadouts.some(
    ({ loadout: saved }) => JSON.stringify(saved) === JSON.stringify(loadout),
  );
  if (alreadySaved) return false;
  savedLoadouts.push({ name: entry.name, loadout });
  notebookData.loadoutsSaved++;
  updateSavedLoadouts();
  updateNotebook();
  return true;
}

const renderNotebook = createNotebookView({
  data: notebookData,
  savedLoadouts,
  state: notebookViewState,
  toggle: notebookToggle,
  panel: notebookPanel,
  personalityIds: PERSONALITIES.map(({ id }) => id),
  specialTypes: SPECIAL_TYPES,
  pageSize: NOTEBOOK_PAGE_SIZE,
  isUnlocked: () => progression.isNotebookUnlocked(),
  addToLoadouts: (entry) => { addNotebookGooberToLoadouts(entry); },
});

function updateNotebook(): void {
  const justUnlocked = progression.updateNotebookUnlock(notebookData.loadoutsSaved);
  if (justUnlocked) {
    earnBadge("gooberologist");
    savedLoadouts.forEach(({ name, loadout }) => addLoadoutToNotebook(name, loadout));
  }
  renderNotebook();
  if (justUnlocked) updateGooberDetails();
}
const gameLoop = new FixedStepGameLoop(world, (result) => {
  inspectGoobers();
  if (result.started) {
    earnBadge("first-event");
    if (result.started.type === "rainbow-goober") earnBadge("rainbow-visitor");
  }
  if (result.visitorArrived || result.departedVisitor) updatePopulationDisplay();
  let selectionChanged = false;
  if (result.departedIds.includes(selection.selectedGooberId ?? -1)) {
    selection.selectedGooberId = null;
    selectionChanged = true;
  }
  if (result.departedIds.includes(selection.followedGooberId ?? -1)) {
    selection.followedGooberId = null;
    selectionChanged = true;
  }
  if (selectionChanged) updateGooberDetails();
});
const updateSavedLoadouts = createLoadoutsPanel({
  world,
  savedLoadouts,
  selection,
  updatePopulation: updatePopulationDisplay,
  updateDetails: () => updateGooberDetails(),
  updateSidebarPosition: updateIconSidebarPosition,
});
const updateGooberDetails = createGooberDetails({
  panel: detailsPanel,
  world,
  selection,
  savedLoadouts,
  notebookData,
  progression,
  zoomInput,
  earnBadge,
  addLoadoutToNotebook,
  addGooberToNotebook: (goober, name) => { addGooberToNotebook(goober, name); },
  updateNotebook,
  updateLoadouts: () => updateSavedLoadouts(),
  updatePopulation: updatePopulationDisplay,
});
notebookToggle.addEventListener("click", () => {
  if (notebookToggle.disabled) return;
  notebookPanel.hidden = !notebookPanel.hidden;
  if (!notebookPanel.hidden) {
    badgesPanel.hidden = true;
    badgesToggle.setAttribute("aria-expanded", "false");
  }
  notebookToggle.setAttribute("aria-expanded", String(!notebookPanel.hidden));
  if (!notebookPanel.hidden) updateNotebook();
});
badgesToggle.addEventListener("click", () => {
  badgesPanel.hidden = !badgesPanel.hidden;
  if (!badgesPanel.hidden) {
    notebookPanel.hidden = true;
    notebookToggle.setAttribute("aria-expanded", "false");
  }
  badgesToggle.setAttribute("aria-expanded", String(!badgesPanel.hidden));
  if (!badgesPanel.hidden) badgeSystem.render(progression.earnedBadgeIds);
});

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

document
  .querySelector<HTMLButtonElement>("#population-down")!
  .addEventListener("click", () => {
    const removed = world.removeLast();
    if (removed && selection.followedGooberId === removed.id) {
      selection.followedGooberId = null;
    }
    updatePopulationDisplay();
    updateGooberDetails();
    updateSavedLoadouts();
  });
document
  .querySelector<HTMLButtonElement>("#population-up")!
  .addEventListener("click", () => {
    if (goobers.length < MAX_GOOBERS) {
      const color =
        colorInput.value === "custom"
          ? customColorInput.value
          : colorInput.value === "random"
            ? presetGooberColors[
                Math.floor(world.random() * presetGooberColors.length)
              ]
            : colorInput.value;
      const added = world.createGoobers(1, color);
      world.assignRandomSpecialType(added[0]);
      world.add(...added);
      if (colorInput.value === "custom") earnBadge("customizer");
      inspectGoobers();
    }
    updatePopulationDisplay();
    updateSavedLoadouts();
  });
clearButton.addEventListener("click", () => {
  world.clear();
  selection.selectedGooberId = null;
  selection.followedGooberId = null;
  updatePopulationDisplay();
  updateGooberDetails();
  updateSavedLoadouts();
});
fieldSizeInput.addEventListener("input", () => {
  fieldScale = Number(fieldSizeInput.value);
  renderer.setFieldScale(fieldScale);
  world.setFieldScale(fieldScale);
  fieldSizeOutput.value = `${fieldScale.toFixed(2)}\u00d7`;
});
zoomInput.addEventListener("input", () => {
  renderer.setZoom(Number(zoomInput.value));
  zoomOutput.value = `${Number(zoomInput.value).toFixed(1)}\u00d7`;
});
canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    if (event.deltaY === 0) return;
    const currentZoom = Number(zoomInput.value);
    const nextZoom = Math.max(
      MIN_ZOOM,
      Math.min(
        MAX_ZOOM,
        Math.round(currentZoom * Math.exp(-event.deltaY * 0.001) * 10) / 10,
      ),
    );
    if (nextZoom === currentZoom) return;
    zoomInput.value = String(nextZoom);
    renderer.setZoomAt(nextZoom, event.clientX, event.clientY);
    zoomOutput.value = `${nextZoom.toFixed(1)}\u00d7`;
  },
  { passive: false },
);
document
  .querySelector<HTMLButtonElement>("#view-reset")!
  .addEventListener("click", () => {
    selection.followedGooberId = null;
    updateGooberDetails();
    fieldSizeInput.value = "1";
    fieldSizeInput.dispatchEvent(new Event("input"));
    zoomInput.value = String(DEFAULT_ZOOM);
    zoomInput.dispatchEvent(new Event("input"));
  });
let dragPoint: { x: number; y: number } | null = null;
let dragDistance = 0;
canvas.addEventListener("pointerdown", (event) => {
  dragDistance = 0;
  if (Number(zoomInput.value) <= DEFAULT_ZOOM || selection.followedGooberId !== null)
    return;
  dragPoint = { x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (!dragPoint) return;
  dragDistance += Math.hypot(
    event.clientX - dragPoint.x,
    event.clientY - dragPoint.y,
  );
  renderer.panByPixels(
    event.clientX - dragPoint.x,
    event.clientY - dragPoint.y,
  );
  dragPoint = { x: event.clientX, y: event.clientY };
});
canvas.addEventListener("pointerup", () => {
  dragPoint = null;
});
canvas.addEventListener("pointercancel", () => {
  dragPoint = null;
});
canvas.addEventListener("click", (event) => {
  if (dragDistance > 4) return;
  const selected = renderer.pickGoober(event.clientX, event.clientY, goobers);
  selection.selectedGooberId = selected?.id ?? null;
  updateGooberDetails();
});
themeButton.addEventListener("click", () =>
  setTheme(theme === "dark" ? "light" : "dark"),
);
mountAdminPanel(world, {
  onGooberSpawned: () => {
    inspectGoobers();
    updatePopulationDisplay();
    updateSavedLoadouts();
    updateGooberDetails();
  },
  onEventTriggered: (type) => {
    if (type === "golden-goober" || type === "rainbow-goober") updatePopulationDisplay();
    if (type === "rainbow-goober") earnBadge("rainbow-visitor");
    earnBadge("first-event");
  },
});
document
  .querySelector<HTMLButtonElement>("#reset-control")!
  .addEventListener("click", () => {
    world.reset();
    inspectGoobers();
    selection.followedGooberId = null;
    selection.selectedGooberId = null;
    updateGooberDetails();
    eventIndicator.hidden = true;
    clock.textContent = formatTime(0);
    updatePopulationDisplay();
    updateSavedLoadouts();
  });
window.addEventListener("resize", updateIconSidebarPosition);

function animate(timestamp: number): void {
  gameLoop.advance(timestamp);
  const activeEvent = world.activeEvent;
  clock.textContent = formatTime(world.elapsedSeconds);
  eventIndicator.hidden = !activeEvent;
  if (activeEvent) {
    const eventName = activeEvent.type.replaceAll("-", " ");
    const description = FIELD_EVENT_DESCRIPTIONS[activeEvent.type];
    eventIndicator.textContent = `${eventName} event: ${description} (${Math.ceil(activeEvent.remainingSeconds)}s)`;
  }
  runState.textContent = activeEvent
    ? activeEvent.type.replaceAll("-", " ")
    : "wandering";
  renderer.draw(
    goobers,
    world.elapsedSeconds,
    selection.selectedGooberId,
    activeEvent ?? undefined,
    artistPaints,
    selection.followedGooberId,
  );
  if (notebookViewState.selectedEntry) {
    const notebookGoober = notebookViewState.selectedEntry.goober;
    const notebookPortrait =
      document.querySelector<HTMLCanvasElement>("#notebook-portrait");
    if (notebookGoober && notebookPortrait)
      renderer.drawPortrait(notebookPortrait, notebookGoober, world.elapsedSeconds);
  }
  const selected = goobers.find((goober) => goober.id === selection.selectedGooberId);
  const portrait =
    document.querySelector<HTMLCanvasElement>("#goober-portrait");
  if (selected && portrait)
    renderer.drawPortrait(portrait, selected, world.elapsedSeconds);
  requestAnimationFrame(animate);
}

updatePopulationDisplay();
updateSavedLoadouts();
inspectGoobers();
updateNotebook();
setTheme(theme);
requestAnimationFrame(animate);
