import type { GooberLoadout } from "../simulation";
import type { World } from "../world";
import { MAX_GOOBERS } from "../consts";

interface Selection { selectedGooberId: number | null }
interface LoadoutsOptions {
  world: World;
  savedLoadouts: { name: string; loadout: GooberLoadout }[];
  selection: Selection;
  updatePopulation(): void;
  updateDetails(): void;
  updateSidebarPosition(): void;
}
export function createLoadoutsPanel(options: LoadoutsOptions): () => void {
  const { world, savedLoadouts, selection, updatePopulation, updateDetails, updateSidebarPosition } = options;
  const updateIconSidebarPosition = updateSidebarPosition;
  const updatePopulationDisplay = updatePopulation;
  const updateGooberDetails = updateDetails;
  function renderLoadouts(): void {
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
        renderLoadouts();
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
    spawn.disabled = world.goobers.length >= MAX_GOOBERS;
    spawn.setAttribute("aria-label", `Spawn ${name}`);
    spawn.addEventListener("click", () => {
      if (world.goobers.length >= MAX_GOOBERS) return;
      const goober = world.spawnLoadout(loadout);
      world.add(goober);
      selection.selectedGooberId = goober.id;
      updatePopulationDisplay();
      updateGooberDetails();
      renderLoadouts();
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-loadout";
    remove.textContent = "\u00d7";
    remove.setAttribute("aria-label", `Remove ${name} loadout`);
    remove.addEventListener("click", () => {
      savedLoadouts.splice(index, 1);
      renderLoadouts();
    });
    card.append(swatch, label, rename, spawn, remove);
    list.append(card);
  });
  updateIconSidebarPosition();
}


  return renderLoadouts;
}
