import { saveGooberLoadout } from "../simulation";
import type { Goober } from "../goober";
import type { World } from "../world";
import type { Progression } from "../progression";
import type { NotebookData } from "./notebook";
import { DEFAULT_ZOOM } from "../consts";

interface Selection { selectedGooberId: number | null; followedGooberId: number | null }
interface DetailsOptions {
  panel: HTMLElement;
  world: World;
  selection: Selection;
  savedLoadouts: { name: string; loadout: ReturnType<typeof saveGooberLoadout> }[];
  notebookData: NotebookData;
  progression: Progression;
  zoomInput: HTMLInputElement;
  earnBadge(id: string): void;
  addLoadoutToNotebook(name: string, loadout: ReturnType<typeof saveGooberLoadout>): void;
  addGooberToNotebook(goober: Goober, name: string): void;
  updateNotebook(): void;
  updateLoadouts(): void;
  updatePopulation(): void;
}
export function createGooberDetails(options: DetailsOptions): () => void {
  const { panel: detailsPanel, world, selection, savedLoadouts, notebookData, progression, zoomInput, earnBadge: onEarnBadge, addLoadoutToNotebook, addGooberToNotebook, updateNotebook, updateLoadouts, updatePopulation } = options;
  function renderDetails(): void {
  const selected = world.goobers.find((goober) => goober.id === selection.selectedGooberId);
  if (selected?.specialType) onEarnBadge("different");
  if (!selected) {
    selection.selectedGooberId = null;
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
    ["Pace", `${selected.speedFactor.toFixed(1)}\u00d7`],
    ["Color", selected.color],
  ];
  if (selected.specialType) {
    const specialName =
      selected.specialType === "orderly" && selected.orderlyPattern
        ? `Orderly \u00b7 ${selected.orderlyPattern}`
        : selected.specialType;
    traits.splice(1, 0, ["Special type", specialName]);
  }
  const heading = document.createElement("div");
  heading.className = "detail-heading";
  const nameInput = document.createElement("input");
  nameInput.className = "goober-name";
  nameInput.type = "text";
  nameInput.maxLength = 24;
  nameInput.setAttribute("aria-label", "Goober name");
  nameInput.title = "Rename this goober";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "detail-close";
  close.setAttribute("aria-label", "Close goober details");
  close.textContent = "\u00d7";
  heading.append(nameInput, close);

  const portraitWrap = document.createElement("div");
  portraitWrap.className = "portrait-wrap";
  const portraitCanvas = document.createElement("canvas");
  portraitCanvas.id = "goober-portrait";
  portraitCanvas.setAttribute("aria-label", `Portrait of Goober #${selected.id + 1}`);
  portraitWrap.append(portraitCanvas);

  const traitList = document.createElement("dl");
  traitList.className = "trait-list";
  for (const [label, value] of traits) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    if (label === "Color") {
      const swatch = document.createElement("span");
      swatch.className = "color-swatch";
      swatch.style.setProperty("--swatch", value);
      description.append(swatch, document.createTextNode(value));
    } else description.textContent = value;
    row.append(term, description);
    traitList.append(row);
  }

  const actions = document.createElement("div");
  actions.className = "detail-actions";
  const follow = document.createElement("button");
  follow.className = "follow-goober";
  follow.type = "button";
  follow.setAttribute("aria-pressed", String(selection.followedGooberId === selected.id));
  follow.textContent = selection.followedGooberId === selected.id ? "stop following" : "follow";
  const save = document.createElement("button");
  save.className = "save-loadout";
  save.type = "button";
  save.disabled = alreadySaved;
  save.textContent = alreadySaved ? "loadout already saved" : "save this loadout";
  actions.append(follow, save);
  if (progression.isNotebookUnlocked()) {
    const saveToNotebook = document.createElement("button");
    saveToNotebook.className = "notebook-save";
    saveToNotebook.type = "button";
    saveToNotebook.disabled = alreadyInNotebook;
    saveToNotebook.textContent = alreadyInNotebook ? "in notebook" : "save to notebook";
    actions.append(saveToNotebook);
  }
  const kill = document.createElement("button");
  kill.className = "kill-goober";
  kill.type = "button";
  kill.textContent = "kill goober";
  actions.append(kill);
  detailsPanel.replaceChildren(heading, portraitWrap, traitList, actions);
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
      if (progression.isNotebookUnlocked()) addLoadoutToNotebook(selected.name, loadout);
      updateLoadouts();
      renderDetails();
      updateNotebook();
    });
  detailsPanel
    .querySelector<HTMLButtonElement>(".notebook-save")
    ?.addEventListener("click", () => {
      addGooberToNotebook({ ...selected }, selected.name);
      updateNotebook();
      renderDetails();
    });
  detailsPanel
    .querySelector<HTMLButtonElement>(".follow-goober")!
    .addEventListener("click", () => {
      selection.followedGooberId = selection.followedGooberId === selected.id ? null : selected.id;
      if (selection.followedGooberId === selected.id) onEarnBadge("little-guy");
      if (
        selection.followedGooberId !== null &&
        Number(zoomInput.value) === DEFAULT_ZOOM
      ) {
        zoomInput.value = "1.8";
        zoomInput.dispatchEvent(new Event("input"));
      }
      renderDetails();
    });
  detailsPanel
    .querySelector<HTMLButtonElement>(".kill-goober")!
    .addEventListener("click", () => {
      world.remove(selected.id);
      if (selection.followedGooberId === selected.id) {
        selection.followedGooberId = null;
      }
      selection.selectedGooberId = null;
      updatePopulation();
      renderDetails();
      updateLoadouts();
    });
  detailsPanel.querySelector(".detail-close")!.addEventListener("click", () => {
    selection.selectedGooberId = null;
    renderDetails();
  });
}


  return renderDetails;
}
