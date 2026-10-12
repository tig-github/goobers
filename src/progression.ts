import type { Goober } from "./goober";
import { MAX_GOOBERS } from "./consts.ts";

/** Pure progression rules; the app decides how earned IDs are presented. */
export class Progression {
  private seenSpecialType = false;
  private notebookUnlocked = false;
  private readonly earnedBadges = new Set<string>();

  get earnedBadgeIds(): ReadonlySet<string> { return this.earnedBadges; }

  earnBadge(id: string): boolean {
    if (this.earnedBadges.has(id)) return false;
    this.earnedBadges.add(id);
    return true;
  }

  observeGoobers(goobers: readonly Goober[]): void {
    if (goobers.some((goober) => goober.specialType !== null)) this.seenSpecialType = true;
  }

  populationBadge(count: number): string | null {
    if (count >= MAX_GOOBERS) return "lively";
    if (count === 0) return "lonely";
    return null;
  }

  notebookEntryBadges(goober: Goober, totalEntries: number): string[] {
    const badges: string[] = [];
    if (totalEntries >= 10) badges.push("goobcyclopedia");
    if (goober.specialType === "golden") badges.push("gilded-notebook");
    return badges;
  }

  updateNotebookUnlock(savedLoadouts: number): boolean {
    if (this.notebookUnlocked || !this.seenSpecialType || savedLoadouts < 3) return false;
    this.notebookUnlocked = true;
    return true;
  }

  isNotebookUnlocked(): boolean {
    return this.notebookUnlocked;
  }
}
