import { createGoobers } from "../simulation";
import { DEFAULT_GOOBER_COLOR, DEFAULT_STARTING_GOOBERS } from "../consts";
import type { RandomSource } from "../random";

export const presetGooberColors = ["#438cff", "#f28a62", "#a98cff", "#a4d66d", "#f2cf5b", "#f27eae"];

export function createStartingGoobers(width?: number, height?: number, random: RandomSource = Math.random) {
  const goobers = createGoobers(DEFAULT_STARTING_GOOBERS, DEFAULT_GOOBER_COLOR, width, height, random);
  for (const goober of goobers) {
    goober.color = presetGooberColors[Math.floor(random() * presetGooberColors.length)];
  }
  return goobers;
}
