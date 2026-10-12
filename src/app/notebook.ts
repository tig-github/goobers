import { saveGooberLoadout, type GooberLoadout } from "../simulation";
import type { Goober } from "../goober";

export interface NotebookEntry { name: string; goober: Goober; favorite: boolean }
export interface NotebookData {
  personalities: Set<string>;
  specialTypes: Set<string>;
  entries: NotebookEntry[];
  loadoutsSaved: number;
}
export interface NotebookViewState {
  selectedEntry: NotebookEntry | null;
  listPage: number;
  catalogPages: Record<string, number>;
}
interface NotebookViewOptions {
  data: NotebookData;
  savedLoadouts: { name: string; loadout: GooberLoadout }[];
  state: NotebookViewState;
  toggle: HTMLButtonElement;
  panel: HTMLElement;
  personalityIds: readonly string[];
  specialTypes: readonly string[];
  pageSize: number;
  isUnlocked(): boolean;
  addToLoadouts(entry: NotebookEntry): void;
}
export function createNotebookView(options: NotebookViewOptions): () => void {
  const { data: notebookData, savedLoadouts, state, toggle: notebookToggle, panel: notebookPanel, personalityIds: PERSONALITY_IDS, specialTypes: SPECIAL_TYPES, pageSize: NOTEBOOK_PAGE_SIZE, addToLoadouts: addNotebookGooberToLoadouts } = options;
  const header = document.createElement("div");
  header.className = "notebook-heading";
  const title = document.createElement("div");
  const close = document.createElement("button");
  close.type = "button";
  close.className = "detail-close";
  close.textContent = "\u00d7";
  close.setAttribute("aria-label", "Close notebook");
  close.addEventListener("click", () => {
    notebookPanel.hidden = true;
    notebookToggle.setAttribute("aria-expanded", "false");
  });
  header.append(title, close);
  const catalog = document.createElement("div");
  catalog.className = "notebook-catalog";
  const savedHeading = document.createElement("h3");
  savedHeading.className = "notebook-saved-heading";
  const content = document.createElement("div");
  content.className = "notebook-content";
  notebookPanel.append(header, catalog, savedHeading, content);

  function renderNotebook(): void {
    const unlocked = options.isUnlocked();
    notebookToggle.hidden = !unlocked;
  notebookToggle.setAttribute("aria-label", "Open notebook");
  notebookToggle.classList.toggle("is-unlocked", unlocked);
  notebookPanel.hidden = !unlocked || notebookPanel.hidden;
  if (!unlocked) notebookToggle.setAttribute("aria-expanded", "false");
  title.textContent = state.selectedEntry === null ? "goober notebook" : "goober profile";
  catalog.replaceChildren();
  content.replaceChildren();
  const addCatalog = (
    heading: string,
    values: readonly string[],
    found: Set<string>,
  ) => {
    if (heading === "special types" && found.size === 0) return;
    const foundValues = values.filter((value) => found.has(value));
    const catalogPageCount = Math.ceil(foundValues.length / 4);
    state.catalogPages[heading] = Math.min(
      state.catalogPages[heading] ?? 0,
      Math.max(0, catalogPageCount - 1),
    );
    const section = document.createElement("section");
    const h = document.createElement("h3");
    h.textContent = heading;
    section.append(h);
    const list = document.createElement("ul");
    const first = state.catalogPages[heading] * 4;
    for (const value of foundValues.slice(first, first + 4)) {
      const item = document.createElement("li");
      const marker = document.createElement("span");
      marker.textContent = "\u25cf";
      const label = document.createElement("span");
      label.textContent = value;
      item.append(marker, label);
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
      previous.textContent = "\u2039";
      previous.setAttribute("aria-label", `Previous ${heading}`);
      previous.disabled = state.catalogPages[heading] === 0;
      previous.addEventListener("click", () => {
        state.catalogPages[heading]--;
        renderNotebook();
      });
      const status = document.createElement("span");
      status.textContent = `${state.catalogPages[heading] + 1} / ${catalogPageCount}`;
      const next = document.createElement("button");
      next.type = "button";
      next.textContent = "\u203a";
      next.setAttribute("aria-label", `Next ${heading}`);
      next.disabled = state.catalogPages[heading] >= catalogPageCount - 1;
      next.addEventListener("click", () => {
        state.catalogPages[heading]++;
        renderNotebook();
      });
      pagination.append(previous, status, next);
      section.append(pagination);
    }
    catalog.append(section);
  };
  addCatalog("personalities", PERSONALITY_IDS, notebookData.personalities);
  addCatalog("special types", SPECIAL_TYPES, notebookData.specialTypes);
  savedHeading.textContent = `saved goobers \u00b7 ${notebookData.entries.length}`;
  if (
    state.selectedEntry &&
    notebookData.entries.includes(state.selectedEntry)
  ) {
    const entry = state.selectedEntry;
    const back = document.createElement("button");
    back.type = "button";
    back.className = "notebook-back";
    back.textContent = "\u2190 all saved goobers";
    back.addEventListener("click", () => {
      state.selectedEntry = null;
      renderNotebook();
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
      ["Pace", `${entry.goober.speedFactor.toFixed(1)}\u00d7`],
      ["Color", entry.goober.color],
    ];
    if (entry.goober.specialType)
      traits.splice(1, 0, [
        "Special type",
        entry.goober.specialType === "orderly" && entry.goober.orderlyPattern
          ? `Orderly \u00b7 ${entry.goober.orderlyPattern}`
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
    favorite.textContent = entry.favorite ? "\u2605 favorited" : "\u2606 favorite";
    favorite.addEventListener("click", () => {
      entry.favorite = !entry.favorite;
      renderNotebook();
    });
    page.append(portrait, name, favorite, details);
    content.append(back, page);
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
    state.listPage = Math.min(state.listPage, Math.max(0, pageCount - 1));
    const pageEntries = sortedEntries.slice(
      state.listPage * NOTEBOOK_PAGE_SIZE,
      (state.listPage + 1) * NOTEBOOK_PAGE_SIZE,
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
        ? `${entry.goober.personality} \u00b7 ${entry.goober.specialType}`
        : entry.goober.personality;
      info.append(name, description);
      button.append(swatch, info);
      button.addEventListener("click", () => {
        state.selectedEntry = entry;
        renderNotebook();
      });
      const favorite = document.createElement("button");
      favorite.type = "button";
      favorite.className = "notebook-favorite-icon";
      favorite.setAttribute(
        "aria-label",
        entry.favorite ? `Unfavorite ${entry.name}` : `Favorite ${entry.name}`,
      );
      favorite.setAttribute("aria-pressed", String(entry.favorite));
      favorite.textContent = entry.favorite ? "\u2605" : "\u2606";
      favorite.addEventListener("click", () => {
        entry.favorite = !entry.favorite;
        renderNotebook();
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
    content.append(entries);
    if (pageCount > 1) {
      const pagination = document.createElement("nav");
      pagination.className = "notebook-pagination";
      pagination.setAttribute("aria-label", "Notebook pages");
      const previous = document.createElement("button");
      previous.type = "button";
      previous.textContent = "\u2190";
      previous.disabled = state.listPage === 0;
      previous.setAttribute("aria-label", "Previous page");
      previous.addEventListener("click", () => {
        state.listPage--;
        renderNotebook();
      });
      const status = document.createElement("span");
      status.textContent = `page ${state.listPage + 1} of ${pageCount}`;
      const next = document.createElement("button");
      next.type = "button";
      next.textContent = "\u2192";
      next.disabled = state.listPage >= pageCount - 1;
      next.setAttribute("aria-label", "Next page");
      next.addEventListener("click", () => {
        state.listPage++;
        renderNotebook();
      });
      pagination.append(previous, status, next);
      content.append(pagination);
    }
  }
  }
  return renderNotebook;
}
