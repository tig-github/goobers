import "./field.css";
import {
  createGoobers,
  createGoldenEventGoober,
  createRainbowEventGoober,
  maybeAssignSpecialType,
  resumeOrderlyPaths,
  saveGooberLoadout,
  spawnGooberFromLoadout,
  stepSimulation,
  type Goober,
  type GooberLoadout,
} from "./simulation";
import { ArenaRenderer } from "./renderer";
import { DEFAULT_ZOOM, MAX_GOOBERS, MAX_ZOOM, MIN_ZOOM } from "./consts";
import { mountApp } from "./app/view";
import { createStartingGoobers, presetGooberColors } from "./app/state";
import { BadgeSystem } from "./app/badges";
import { PERSONALITIES } from "./personalities";
import { EventSystem, type FieldEvent } from "./events";
import { applySpecialType, type SpecialType } from "./special-types";

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
const speedInput = document.querySelector<HTMLInputElement>("#speed-control")!;
const speedOutput = document.querySelector<HTMLOutputElement>("#speed-value")!;
const pauseButton =
  document.querySelector<HTMLButtonElement>("#pause-control")!;
const pauseLabel = document.querySelector<HTMLSpanElement>("#pause-label")!;
const runState = document.querySelector<HTMLSpanElement>("#run-state")!;
const clock = document.querySelector<HTMLSpanElement>("#field-clock")!;
const eventIndicator =
  document.querySelector<HTMLDivElement>("#event-indicator")!;
const adminToggle = document.querySelector<HTMLButtonElement>("#admin-toggle")!;
const adminPanel = document.querySelector<HTMLElement>("#admin-panel")!;
const adminEventsTab = document.querySelector<HTMLButtonElement>("#admin-events-tab")!;
const adminSpawnTab = document.querySelector<HTMLButtonElement>("#admin-spawn-tab")!;
const adminEventsPanel = document.querySelector<HTMLElement>("#admin-events-panel")!;
const adminSpawnPanel = document.querySelector<HTMLElement>("#admin-spawn-panel")!;
const adminSpawnForm = document.querySelector<HTMLFormElement>("#admin-spawn-form")!;
const adminSpawnName = document.querySelector<HTMLInputElement>("#admin-goober-name")!;
const adminSpawnColor = document.querySelector<HTMLInputElement>("#admin-goober-color")!;
const adminSpawnPersonality = document.querySelector<HTMLSelectElement>("#admin-goober-personality")!;
const adminSpawnSize = document.querySelector<HTMLInputElement>("#admin-goober-size")!;
const adminSpawnSizeValue = document.querySelector<HTMLOutputElement>("#admin-goober-size-value")!;
const adminSpawnSpeed = document.querySelector<HTMLInputElement>("#admin-goober-speed")!;
const adminSpawnSpeedValue = document.querySelector<HTMLOutputElement>("#admin-goober-speed-value")!;
const adminSpawnSpecial = document.querySelector<HTMLSelectElement>("#admin-goober-special")!;
const adminSpawnStatus = document.querySelector<HTMLElement>("#admin-spawn-status")!;
const themeButton =
  document.querySelector<HTMLButtonElement>("#theme-control")!;
const fieldSizeInput = document.querySelector<HTMLInputElement>("#field-size")!;
const fieldSizeOutput =
  document.querySelector<HTMLOutputElement>("#field-size-value")!;
const zoomInput = document.querySelector<HTMLInputElement>("#zoom-control")!;
const zoomOutput = document.querySelector<HTMLOutputElement>("#zoom-value")!;
let fieldScale = 1;
let goobers = createStartingGoobers();
const savedLoadouts: { name: string; loadout: GooberLoadout }[] = [];
type NotebookEntry = { name: string; goober: Goober; favorite: boolean };
const NOTEBOOK_PAGE_SIZE = 6;
const PERSONALITY_IDS = PERSONALITIES.map(({ id }) => id);
const SPECIAL_TYPES: readonly SpecialType[] = [
  "tiny",
  "speedy",
  "orderly",
  "glowy",
  "golden",
  "rainbow",
  "chameleon",
];
const notebookData = {
  personalities: new Set<string>(),
  specialTypes: new Set<string>(),
  entries: [] as NotebookEntry[],
  loadoutsSaved: 0,
};
let hasSeenSpecialType = false;
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
let selectedNotebookEntry: NotebookEntry | null = null;
let notebookListPage = 0;
const notebookCatalogPages: Record<string, number> = {
  personalities: 0,
  "special types": 0,
};
let notebookUnlocked = false;
let selectedGooberId: number | null = null;
let followedGooberId: number | null = null;
let clearUnlocked = false;
let isPaused = false;
let elapsedSeconds = 0;
const eventSystem = new EventSystem();
let activeEvent: FieldEvent | null = null;
let previousFrame = 0;
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
  if (goobers.length >= MAX_GOOBERS) badgeSystem.earn("lively");
  if (goobers.length === 0) badgeSystem.earn("lonely");
}

function addEventGoober(goober: Goober): void {
  goobers.push(goober);
  updatePopulationDisplay();
}

function inspectGoobers(): void {
  if (goobers.some((goober) => goober.specialType)) hasSeenSpecialType = true;
}

function addGooberToNotebook(goober: Goober, name: string): void {
  notebookData.entries.push({ name, goober, favorite: false });
  if (notebookData.entries.length >= 10) badgeSystem.earn("goobcyclopedia");
  notebookData.personalities.add(goober.personality);
  if (goober.specialType) notebookData.specialTypes.add(goober.specialType);
  if (goober.specialType === "golden") badgeSystem.earn("gilded-notebook");
}

function addLoadoutToNotebook(name: string, loadout: GooberLoadout): void {
  const exists = notebookData.entries.some(
    (entry) =>
      entry.name === name &&
      JSON.stringify(saveGooberLoadout(entry.goober)) ===
        JSON.stringify(loadout),
  );
  if (exists) return;
  const goober = spawnGooberFromLoadout(
    loadout,
    renderer.worldWidth,
    renderer.worldHeight,
  );
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

function updateNotebook(): void {
  const unlocked =
    hasSeenSpecialType && notebookData.loadoutsSaved >= 3;
  const justUnlocked = unlocked && !notebookUnlocked;
  notebookUnlocked = unlocked;
  if (justUnlocked) badgeSystem.earn("gooberologist");
  if (justUnlocked)
    savedLoadouts.forEach(({ name, loadout }) =>
      addLoadoutToNotebook(name, loadout),
    );
  notebookToggle.hidden = !unlocked;
  notebookToggle.setAttribute("aria-label", "Open notebook");
  notebookToggle.classList.toggle("is-unlocked", unlocked);
  notebookPanel.hidden = !unlocked || notebookPanel.hidden;
  if (!unlocked) notebookToggle.setAttribute("aria-expanded", "false");
  notebookPanel.replaceChildren();
  const header = document.createElement("div");
  header.className = "notebook-heading";
  const title = document.createElement("div");
  title.innerHTML = `<span class="detail-kicker">FIELD NOTES</span><h2>${selectedNotebookEntry === null ? "goober notebook" : "goober profile"}</h2>`;
  const close = document.createElement("button");
  close.type = "button";
  close.className = "detail-close";
  close.textContent = "×";
  close.setAttribute("aria-label", "Close notebook");
  close.addEventListener("click", () => {
    notebookPanel.hidden = true;
    notebookToggle.setAttribute("aria-expanded", "false");
  });
  header.append(title, close);
  notebookPanel.append(header);
  const catalog = document.createElement("div");
  catalog.className = "notebook-catalog";
  const addCatalog = (
    heading: string,
    values: readonly string[],
    found: Set<string>,
  ) => {
    if (heading === "special types" && found.size === 0) return;
    const foundValues = values.filter((value) => found.has(value));
    const catalogPageCount = Math.ceil(foundValues.length / 4);
    notebookCatalogPages[heading] = Math.min(
      notebookCatalogPages[heading] ?? 0,
      Math.max(0, catalogPageCount - 1),
    );
    const section = document.createElement("section");
    const h = document.createElement("h3");
    h.textContent = heading;
    section.append(h);
    const list = document.createElement("ul");
    const first = notebookCatalogPages[heading] * 4;
    for (const value of foundValues.slice(first, first + 4)) {
      const item = document.createElement("li");
      item.innerHTML = "<span>●</span>";
      const label = document.createElement("span");
      label.textContent = value;
      item.append(label);
      list.append(item);
    }
    if (list.childElementCount === 0) {
      const empty = document.createElement("li");
      empty.className = "notebook-empty";
      empty.textContent = "none found yet";
      list.append(empty);
    }
    section.append(list);
    if (catalogPageCount > 1) {
      const pagination = document.createElement("nav");
      pagination.className = "notebook-catalog-pagination";
      pagination.setAttribute("aria-label", `${heading} pages`);
      const previous = document.createElement("button");
      previous.type = "button";
      previous.textContent = "‹";
      previous.setAttribute("aria-label", `Previous ${heading}`);
      previous.disabled = notebookCatalogPages[heading] === 0;
      previous.addEventListener("click", () => {
        notebookCatalogPages[heading]--;
        updateNotebook();
      });
      const status = document.createElement("span");
      status.textContent = `${notebookCatalogPages[heading] + 1} / ${catalogPageCount}`;
      const next = document.createElement("button");
      next.type = "button";
      next.textContent = "›";
      next.setAttribute("aria-label", `Next ${heading}`);
      next.disabled = notebookCatalogPages[heading] >= catalogPageCount - 1;
      next.addEventListener("click", () => {
        notebookCatalogPages[heading]++;
        updateNotebook();
      });
      pagination.append(previous, status, next);
      section.append(pagination);
    }
    catalog.append(section);
  };
  addCatalog("personalities", PERSONALITY_IDS, notebookData.personalities);
  addCatalog("special types", SPECIAL_TYPES, notebookData.specialTypes);
  notebookPanel.append(catalog);
  const savedHeading = document.createElement("h3");
  savedHeading.className = "notebook-saved-heading";
  savedHeading.textContent = `saved goobers · ${notebookData.entries.length}`;
  notebookPanel.append(savedHeading);
  if (
    selectedNotebookEntry &&
    notebookData.entries.includes(selectedNotebookEntry)
  ) {
    const entry = selectedNotebookEntry;
    const back = document.createElement("button");
    back.type = "button";
    back.className = "notebook-back";
    back.textContent = "← all saved goobers";
    back.addEventListener("click", () => {
      selectedNotebookEntry = null;
      updateNotebook();
    });
    const page = document.createElement("article");
    page.className = "notebook-profile";
    const portrait = document.createElement("div");
    portrait.className = "notebook-portrait-wrap";
    const portraitCanvas = document.createElement("canvas");
    portraitCanvas.id = "notebook-portrait";
    portraitCanvas.setAttribute("aria-label", `Portrait of ${entry.name}`);
    portrait.append(portraitCanvas);
    const name = document.createElement("h3");
    name.className = "notebook-profile-name";
    name.textContent = entry.name;
    const traits: [string, string][] = [
      ["Personality", entry.goober.personality],
      ["Size", `${Math.round(entry.goober.size * 100)}%`],
      ["Pace", `${entry.goober.speedFactor.toFixed(1)}×`],
      ["Color", entry.goober.color],
    ];
    if (entry.goober.specialType)
      traits.splice(1, 0, [
        "Special type",
        entry.goober.specialType === "orderly" && entry.goober.orderlyPattern
          ? `Orderly · ${entry.goober.orderlyPattern}`
          : entry.goober.specialType,
      ]);
    const details = document.createElement("dl");
    details.className = "notebook-profile-traits";
    for (const [label, value] of traits) {
      const row = document.createElement("div");
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      row.append(dt, dd);
      details.append(row);
    }
    const favorite = document.createElement("button");
    favorite.type = "button";
    favorite.className = "notebook-favorite";
    favorite.setAttribute("aria-pressed", String(entry.favorite));
    favorite.textContent = entry.favorite ? "★ favorited" : "☆ favorite";
    favorite.addEventListener("click", () => {
      entry.favorite = !entry.favorite;
      updateNotebook();
    });
    page.append(portrait, name, favorite, details);
    notebookPanel.append(back, page);
  } else {
    const entries = document.createElement("div");
    entries.className = "notebook-entries";
    if (notebookData.entries.length === 0) {
      const empty = document.createElement("p");
      empty.className = "notebook-empty";
      empty.textContent = "Save a goober from its profile to keep a page here.";
      entries.append(empty);
    }
    const sortedEntries = [...notebookData.entries].sort(
      (a, b) => Number(b.favorite) - Number(a.favorite),
    );
    const pageCount = Math.ceil(sortedEntries.length / NOTEBOOK_PAGE_SIZE);
    notebookListPage = Math.min(notebookListPage, Math.max(0, pageCount - 1));
    const pageEntries = sortedEntries.slice(
      notebookListPage * NOTEBOOK_PAGE_SIZE,
      (notebookListPage + 1) * NOTEBOOK_PAGE_SIZE,
    );
    pageEntries.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "notebook-entry-row";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "notebook-entry";
      button.setAttribute("aria-label", `Open ${entry.name}'s notebook page`);
      const swatch = document.createElement("i");
      swatch.className = "loadout-swatch";
      swatch.style.setProperty("--swatch", entry.goober.color);
      const info = document.createElement("span");
      info.className = "notebook-entry-info";
      const name = document.createElement("strong");
      name.textContent = entry.name;
      const description = document.createElement("span");
      description.textContent = entry.goober.specialType
        ? `${entry.goober.personality} · ${entry.goober.specialType}`
        : entry.goober.personality;
      info.append(name, description);
      button.append(swatch, info);
      button.addEventListener("click", () => {
        selectedNotebookEntry = entry;
        updateNotebook();
      });
      const favorite = document.createElement("button");
      favorite.type = "button";
      favorite.className = "notebook-favorite-icon";
      favorite.setAttribute(
        "aria-label",
        entry.favorite ? `Unfavorite ${entry.name}` : `Favorite ${entry.name}`,
      );
      favorite.setAttribute("aria-pressed", String(entry.favorite));
      favorite.textContent = entry.favorite ? "★" : "☆";
      favorite.addEventListener("click", () => {
        entry.favorite = !entry.favorite;
        updateNotebook();
      });
      const addToLoadouts = document.createElement("button");
      addToLoadouts.type = "button";
      addToLoadouts.className = "notebook-add-loadout";
      addToLoadouts.textContent = "+";
      const alreadyInLoadouts = savedLoadouts.some(
        ({ loadout }) =>
          JSON.stringify(loadout) ===
          JSON.stringify(saveGooberLoadout(entry.goober)),
      );
      addToLoadouts.disabled = alreadyInLoadouts;
      addToLoadouts.setAttribute(
        "aria-label",
        alreadyInLoadouts
          ? `${entry.name} is already in loadouts`
          : `Add ${entry.name} to loadouts`,
      );
      addToLoadouts.title = alreadyInLoadouts
        ? "Already in loadouts"
        : "Add to loadouts";
      addToLoadouts.addEventListener("click", () => {
        addNotebookGooberToLoadouts(entry);
      });
      row.append(button, favorite, addToLoadouts);
      entries.append(row);
    });
    notebookPanel.append(entries);
    if (pageCount > 1) {
      const pagination = document.createElement("nav");
      pagination.className = "notebook-pagination";
      pagination.setAttribute("aria-label", "Notebook pages");
      const previous = document.createElement("button");
      previous.type = "button";
      previous.textContent = "←";
      previous.disabled = notebookListPage === 0;
      previous.setAttribute("aria-label", "Previous page");
      previous.addEventListener("click", () => {
        notebookListPage--;
        updateNotebook();
      });
      const status = document.createElement("span");
      status.textContent = `page ${notebookListPage + 1} of ${pageCount}`;
      const next = document.createElement("button");
      next.type = "button";
      next.textContent = "→";
      next.disabled = notebookListPage >= pageCount - 1;
      next.setAttribute("aria-label", "Next page");
      next.addEventListener("click", () => {
        notebookListPage++;
        updateNotebook();
      });
      pagination.append(previous, status, next);
      notebookPanel.append(pagination);
    }
  }
  if (justUnlocked) updateGooberDetails();
}

function updateSavedLoadouts(): void {
  const panel = document.querySelector<HTMLElement>("#saved-loadouts")!;
  const list = document.querySelector<HTMLElement>("#loadout-list")!;
  document.querySelector<HTMLElement>("#loadout-count")!.textContent =
    savedLoadouts.length === 1 ? "1 saved" : `${savedLoadouts.length} saved`;
  panel.hidden = savedLoadouts.length === 0;
  list.replaceChildren();
  if (savedLoadouts.length === 0) {
    updateIconSidebarPosition();
    return;
  }
  savedLoadouts.forEach(({ name, loadout }, index) => {
    const card = document.createElement("div");
    card.className = "loadout-card";
    const swatch = document.createElement("i");
    swatch.className = "loadout-swatch";
    swatch.style.setProperty("--swatch", loadout.color);
    const label = document.createElement("span");
    label.className = "loadout-name";
    label.textContent = name;
    const rename = document.createElement("button");
    rename.type = "button";
    rename.textContent = "edit";
    rename.setAttribute("aria-label", `Rename ${name} loadout`);
    rename.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 24;
      input.className = "loadout-name-input";
      input.value = savedLoadouts[index].name;
      input.setAttribute("aria-label", "New loadout name");
      let finished = false;
      const finish = (save: boolean) => {
        if (finished) return;
        finished = true;
        if (save) savedLoadouts[index].name = input.value.trim() || name;
        updateSavedLoadouts();
      };
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") finish(true);
        if (event.key === "Escape") finish(false);
      });
      input.addEventListener("blur", () => finish(true));
      card.replaceChild(input, label);
      rename.hidden = true;
      input.focus();
      input.select();
    });
    const spawn = document.createElement("button");
    spawn.type = "button";
    spawn.textContent = "spawn";
    spawn.disabled = goobers.length >= MAX_GOOBERS;
    spawn.setAttribute("aria-label", `Spawn ${name}`);
    spawn.addEventListener("click", () => {
      if (goobers.length >= MAX_GOOBERS) return;
      const goober = spawnGooberFromLoadout(
        loadout,
        renderer.worldWidth,
        renderer.worldHeight,
      );
      goobers.push(goober);
      selectedGooberId = goober.id;
      updatePopulationDisplay();
      updateGooberDetails();
      updateSavedLoadouts();
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-loadout";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove ${name} loadout`);
    remove.addEventListener("click", () => {
      savedLoadouts.splice(index, 1);
      updateSavedLoadouts();
    });
    card.append(swatch, label, rename, spawn, remove);
    list.append(card);
  });
  updateIconSidebarPosition();
}

function updateGooberDetails(): void {
  const selected = goobers.find((goober) => goober.id === selectedGooberId);
  if (selected?.specialType) badgeSystem.earn("different");
  if (!selected) {
    selectedGooberId = null;
    detailsPanel.hidden = true;
    detailsPanel.replaceChildren();
    return;
  }
  const selectedLoadout = saveGooberLoadout(selected);
  const alreadySaved = savedLoadouts.some(
    ({ loadout }) =>
      JSON.stringify(loadout) === JSON.stringify(selectedLoadout),
  );
  const alreadyInNotebook = notebookData.entries.some(
    (entry) =>
      entry.name === selected.name &&
      JSON.stringify(saveGooberLoadout(entry.goober)) ===
        JSON.stringify(selectedLoadout),
  );
  detailsPanel.hidden = false;
  detailsPanel.classList.add("is-expanded");
  detailsPanel.classList.toggle("has-special", Boolean(selected.specialType));
  const traits: [string, string][] = [
    ["Personality", selected.personality],
    ["Size", `${Math.round(selected.size * 100)}%`],
    ["Pace", `${selected.speedFactor.toFixed(1)}×`],
    ["Color", selected.color],
  ];
  if (selected.specialType) {
    const specialName =
      selected.specialType === "orderly" && selected.orderlyPattern
        ? `Orderly · ${selected.orderlyPattern}`
        : selected.specialType;
    traits.splice(1, 0, ["Special type", specialName]);
  }
  detailsPanel.innerHTML = `
    <div class="detail-heading"><div><span class="detail-kicker">GOOBER FILE</span><input class="goober-name" type="text" maxlength="24" aria-label="Goober name" title="Rename this goober"></div><button class="detail-close" type="button" aria-label="Close goober details">×</button></div>
    <div class="portrait-wrap"><canvas id="goober-portrait" aria-label="Portrait of Goober #${selected.id + 1}"></canvas></div>
    <dl class="trait-list">${traits.map(([label, value]) => `<div><dt>${label}</dt><dd>${label === "Color" ? `<span class="color-swatch" style="--swatch:${value}"></span>${value}` : value}</dd></div>`).join("")}</dl>
    <div class="detail-actions"><button class="follow-goober" type="button" aria-pressed="${followedGooberId === selected.id}">${followedGooberId === selected.id ? "stop following" : "follow"}</button><button class="save-loadout" type="button" ${alreadySaved ? "disabled" : ""}>${alreadySaved ? "loadout already saved" : "save this loadout"}</button>${notebookUnlocked ? `<button class="notebook-save" type="button" ${alreadyInNotebook ? "disabled" : ""}>${alreadyInNotebook ? "in notebook" : "save to notebook"}</button>` : ""}<button class="kill-goober" type="button">kill goober</button></div>
  `;
  const nameInput =
    detailsPanel.querySelector<HTMLInputElement>(".goober-name")!;
  nameInput.value = selected.name;
  nameInput.addEventListener("change", () => {
    selected.name = nameInput.value.trim() || `Goober #${selected.id + 1}`;
    nameInput.value = selected.name;
  });
  detailsPanel
    .querySelector<HTMLButtonElement>(".save-loadout")!
    .addEventListener("click", () => {
      const loadout = saveGooberLoadout(selected);
      if (
        savedLoadouts.some(
          ({ loadout: existing }) =>
            JSON.stringify(existing) === JSON.stringify(loadout),
        )
      )
        return;
      savedLoadouts.push({ name: selected.name, loadout });
      notebookData.loadoutsSaved++;
      if (notebookUnlocked) addLoadoutToNotebook(selected.name, loadout);
      updateSavedLoadouts();
      updateGooberDetails();
      updateNotebook();
    });
  detailsPanel
    .querySelector<HTMLButtonElement>(".notebook-save")
    ?.addEventListener("click", () => {
      addGooberToNotebook({ ...selected }, selected.name);
      updateNotebook();
      updateGooberDetails();
    });
  detailsPanel
    .querySelector<HTMLButtonElement>(".follow-goober")!
    .addEventListener("click", () => {
      followedGooberId = followedGooberId === selected.id ? null : selected.id;
      if (followedGooberId === selected.id) badgeSystem.earn("little-guy");
      renderer.setFollowTarget(followedGooberId);
      if (
        followedGooberId !== null &&
        Number(zoomInput.value) === DEFAULT_ZOOM
      ) {
        zoomInput.value = "1.8";
        zoomInput.dispatchEvent(new Event("input"));
      }
      updateGooberDetails();
    });
  detailsPanel
    .querySelector<HTMLButtonElement>(".kill-goober")!
    .addEventListener("click", () => {
      goobers = goobers.filter((goober) => goober.id !== selected.id);
      if (followedGooberId === selected.id) {
        followedGooberId = null;
        renderer.setFollowTarget(null);
      }
      selectedGooberId = null;
      updatePopulationDisplay();
      updateGooberDetails();
      updateSavedLoadouts();
    });
  detailsPanel.querySelector(".detail-close")!.addEventListener("click", () => {
    selectedGooberId = null;
    updateGooberDetails();
  });
}

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
  if (!badgesPanel.hidden) badgeSystem.render();
});

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

function setPaused(paused: boolean): void {
  isPaused = paused;
  pauseLabel.textContent = paused ? "resume" : "pause";
  runState.textContent = paused
    ? "resting"
    : activeEvent
      ? activeEvent.type.replaceAll("-", " ")
      : "wandering";
  pauseButton.setAttribute("aria-pressed", String(paused));
}

document
  .querySelector<HTMLButtonElement>("#population-down")!
  .addEventListener("click", () => {
    const removed = goobers.pop();
    if (removed && followedGooberId === removed.id) {
      followedGooberId = null;
      renderer.setFollowTarget(null);
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
                Math.floor(Math.random() * presetGooberColors.length)
              ]
            : colorInput.value;
      const added = createGoobers(
        1,
        color,
        renderer.worldWidth,
        renderer.worldHeight,
      );
      maybeAssignSpecialType(added[0]);
      goobers.push(...added);
      if (colorInput.value === "custom") badgeSystem.earn("customizer");
      inspectGoobers();
    }
    updatePopulationDisplay();
    updateSavedLoadouts();
  });
clearButton.addEventListener("click", () => {
  goobers = [];
  selectedGooberId = null;
  followedGooberId = null;
  renderer.setFollowTarget(null);
  updatePopulationDisplay();
  updateGooberDetails();
  updateSavedLoadouts();
});
speedInput.addEventListener("input", () => {
  speedOutput.value = `${Number(speedInput.value).toFixed(1)}×`;
});
fieldSizeInput.addEventListener("input", () => {
  fieldScale = Number(fieldSizeInput.value);
  renderer.setFieldScale(fieldScale);
  fieldSizeOutput.value = `${fieldScale.toFixed(2)}×`;
});
zoomInput.addEventListener("input", () => {
  renderer.setZoom(Number(zoomInput.value));
  zoomOutput.value = `${Number(zoomInput.value).toFixed(1)}×`;
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
    zoomOutput.value = `${nextZoom.toFixed(1)}×`;
  },
  { passive: false },
);
document
  .querySelector<HTMLButtonElement>("#view-reset")!
  .addEventListener("click", () => {
    followedGooberId = null;
    renderer.setFollowTarget(null);
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
  if (Number(zoomInput.value) <= DEFAULT_ZOOM || followedGooberId !== null)
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
  selectedGooberId = selected?.id ?? null;
  updateGooberDetails();
});
pauseButton.addEventListener("click", () => setPaused(!isPaused));
themeButton.addEventListener("click", () =>
  setTheme(theme === "dark" ? "light" : "dark"),
);
adminToggle.addEventListener("click", () => {
  adminPanel.hidden = !adminPanel.hidden;
  adminToggle.setAttribute("aria-expanded", String(!adminPanel.hidden));
});
function selectAdminTab(tab: "events" | "spawn"): void {
  const showSpawn = tab === "spawn";
  adminEventsTab.classList.toggle("is-active", !showSpawn);
  adminSpawnTab.classList.toggle("is-active", showSpawn);
  adminEventsTab.setAttribute("aria-selected", String(!showSpawn));
  adminSpawnTab.setAttribute("aria-selected", String(showSpawn));
  adminEventsPanel.hidden = showSpawn;
  adminSpawnPanel.hidden = !showSpawn;
}
adminEventsTab.addEventListener("click", () => selectAdminTab("events"));
adminSpawnTab.addEventListener("click", () => selectAdminTab("spawn"));
adminSpawnPersonality.addEventListener("change", () => {
  if (adminSpawnPersonality.value === "orderly") {
    adminSpawnSpecial.value = "orderly";
  } else if (adminSpawnSpecial.value === "orderly") {
    adminSpawnSpecial.value = "none";
  }
});
adminSpawnSpecial.addEventListener("change", () => {
  if (adminSpawnSpecial.value === "orderly") {
    adminSpawnPersonality.value = "orderly";
  } else if (adminSpawnPersonality.value === "orderly") {
    adminSpawnPersonality.value = "shy";
  }
});
adminSpawnSize.addEventListener("input", () => {
  adminSpawnSizeValue.value = `${Number(adminSpawnSize.value).toFixed(2)}×`;
});
adminSpawnSpeed.addEventListener("input", () => {
  adminSpawnSpeedValue.value = `${Number(adminSpawnSpeed.value).toFixed(1)}×`;
});
adminSpawnForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (goobers.length >= MAX_GOOBERS) {
    adminSpawnStatus.textContent = "field is full";
    return;
  }
  const added = createGoobers(
    1,
    adminSpawnColor.value,
    renderer.worldWidth,
    renderer.worldHeight,
  );
  const goober = added[0];
  goober.size = Number(adminSpawnSize.value);
  goober.speedFactor = Number(adminSpawnSpeed.value);
  goober.personality = adminSpawnPersonality.value as Goober["personality"];
  const name = adminSpawnName.value.trim();
  if (name) goober.name = name;
  if (adminSpawnSpecial.value !== "none") {
    applySpecialType(goober, adminSpawnSpecial.value as SpecialType);
  }
  goobers.push(goober);
  inspectGoobers();
  updatePopulationDisplay();
  updateSavedLoadouts();
  updateGooberDetails();
  adminSpawnStatus.textContent = `${goober.name} spawned`;
});
for (const eventType of [
  "gathering",
  "drift",
  "color-parade",
  "conga-line",
  "golden-goober",
  "rainbow-goober",
  "gassy",
] as const) {
  document
    .querySelector<HTMLButtonElement>(`#trigger-${eventType}`)!
    .addEventListener("click", () => {
      activeEvent = eventSystem.trigger(
        eventType,
        renderer.worldWidth,
        renderer.worldHeight,
      );
      if (eventType === "golden-goober") {
        addEventGoober(createGoldenEventGoober(renderer.worldWidth, renderer.worldHeight));
      }
      if (eventType === "rainbow-goober") {
        addEventGoober(createRainbowEventGoober(renderer.worldWidth, renderer.worldHeight));
        badgeSystem.earn("rainbow-visitor");
      }
      badgeSystem.earn("first-event");
    });
}
document
  .querySelector<HTMLButtonElement>("#reset-control")!
  .addEventListener("click", () => {
    goobers = createStartingGoobers(renderer.worldWidth, renderer.worldHeight);
    inspectGoobers();
    followedGooberId = null;
    renderer.setFollowTarget(null);
    selectedGooberId = null;
    updateGooberDetails();
    elapsedSeconds = 0;
    eventSystem.reset();
    activeEvent = null;
    eventIndicator.hidden = true;
    clock.textContent = formatTime(0);
    updatePopulationDisplay();
    updateSavedLoadouts();
    setPaused(false);
  });
window.addEventListener("keydown", (event: KeyboardEvent) => {
  if (
    event.code === "Space" &&
    !(event.target instanceof HTMLInputElement) &&
    !(event.target instanceof HTMLSelectElement)
  ) {
    event.preventDefault();
    setPaused(!isPaused);
  }
});
window.addEventListener("resize", updateIconSidebarPosition);

function animate(timestamp: number): void {
  const deltaSeconds =
    previousFrame === 0
      ? 0
      : Math.min((timestamp - previousFrame) / 1000, 0.05);
  previousFrame = timestamp;
  inspectGoobers();
  if (!isPaused) {
    elapsedSeconds += deltaSeconds;
    const eventUpdate = eventSystem.update(
      deltaSeconds,
      renderer.worldWidth,
      renderer.worldHeight,
    );
    if (!activeEvent && eventUpdate.event) {
      badgeSystem.earn("first-event");
      if (eventUpdate.event.type === "golden-goober") {
        addEventGoober(createGoldenEventGoober(renderer.worldWidth, renderer.worldHeight));
      }
      if (eventUpdate.event.type === "rainbow-goober") {
        addEventGoober(createRainbowEventGoober(renderer.worldWidth, renderer.worldHeight));
        badgeSystem.earn("rainbow-visitor");
      }
    }
    if (eventUpdate.ended?.type === "golden-goober" || eventUpdate.ended?.type === "rainbow-goober") {
      for (const goober of goobers) {
        if (goober.isEventGoober) goober.isEventVisitorLeaving = true;
      }
    }
    if (eventUpdate.ended && eventUpdate.ended.type !== "gathering")
      resumeOrderlyPaths(goobers);
    activeEvent = eventUpdate.event;
    stepSimulation(
      goobers,
      deltaSeconds * Number(speedInput.value),
      renderer.worldWidth,
      renderer.worldHeight,
      activeEvent ?? undefined,
    );
    const departedEventGoober = goobers.some((goober) => goober.isEventGoober && goober.hasLeftField);
    goobers = goobers.filter((goober) => !goober.hasLeftField);
    if (departedEventGoober) updatePopulationDisplay();
    if (departedEventGoober && selectedGooberId !== null && !goobers.some((goober) => goober.id === selectedGooberId)) {
      selectedGooberId = null;
      updateGooberDetails();
    }
    clock.textContent = formatTime(elapsedSeconds);
  }
  eventIndicator.hidden = !activeEvent;
  if (activeEvent) {
    const eventName = activeEvent.type.replaceAll("-", " ");
    const description =
      activeEvent.type === "gathering"
        ? "goobers are clustering"
        : activeEvent.type === "drift"
          ? "a current is sweeping the field"
          : activeEvent.type === "color-parade"
            ? "goobers are finding their colors"
            : activeEvent.type === "golden-goober"
              ? "a golden visitor is wandering through"
              : activeEvent.type === "rainbow-goober"
                ? "goobers are spinning around a rainbow visitor"
              : activeEvent.type === "gassy"
                ? "every goober leaves a little trail"
                : "goobers are following the line";
    eventIndicator.textContent = `${eventName} event: ${description} (${Math.ceil(activeEvent.remainingSeconds)}s)`;
  }
  runState.textContent = isPaused
    ? "resting"
    : activeEvent
      ? activeEvent.type.replaceAll("-", " ")
      : "wandering";
  renderer.draw(
    goobers,
    elapsedSeconds,
    selectedGooberId,
    activeEvent ?? undefined,
  );
  if (selectedNotebookEntry) {
    const notebookGoober = selectedNotebookEntry.goober;
    const notebookPortrait =
      document.querySelector<HTMLCanvasElement>("#notebook-portrait");
    if (notebookGoober && notebookPortrait)
      renderer.drawPortrait(notebookPortrait, notebookGoober, elapsedSeconds);
  }
  const selected = goobers.find((goober) => goober.id === selectedGooberId);
  const portrait =
    document.querySelector<HTMLCanvasElement>("#goober-portrait");
  if (selected && portrait)
    renderer.drawPortrait(portrait, selected, elapsedSeconds);
  requestAnimationFrame(animate);
}

updatePopulationDisplay();
updateSavedLoadouts();
inspectGoobers();
updateNotebook();
setTheme(theme);
requestAnimationFrame(animate);
