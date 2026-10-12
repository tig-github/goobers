import test from "node:test";
import assert from "node:assert/strict";
import { Progression } from "../src/progression.ts";

test("population badges are earned at the field boundaries", () => {
  const progression = new Progression();
  assert.equal(progression.populationBadge(0), "lonely");
  assert.equal(progression.populationBadge(39), null);
  assert.equal(progression.populationBadge(40), "lively");
});

test("notebook badges follow entry count and golden goober rules", () => {
  const progression = new Progression();
  const ordinary = { specialType: null };
  const golden = { specialType: "golden" };
  assert.deepEqual(progression.notebookEntryBadges(ordinary, 9), []);
  assert.deepEqual(progression.notebookEntryBadges(ordinary, 10), ["goobcyclopedia"]);
  assert.deepEqual(progression.notebookEntryBadges(golden, 1), ["gilded-notebook"]);
});

test("notebook unlock requires a seen special type and three loadouts", () => {
  const progression = new Progression();
  assert.equal(progression.updateNotebookUnlock(3), false);
  progression.observeGoobers([{ specialType: "orderly" }]);
  assert.equal(progression.updateNotebookUnlock(2), false);
  assert.equal(progression.updateNotebookUnlock(3), true);
  assert.equal(progression.isNotebookUnlocked(), true);
  assert.equal(progression.updateNotebookUnlock(4), false);
});
