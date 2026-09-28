import { createGoobers } from "../simulation";
import { DEFAULT_GOOBER_COLOR, DEFAULT_STARTING_GOOBERS } from "../consts";

export const presetGooberColors = ["#438cff", "#f28a62", "#a98cff", "#a4d66d", "#f2cf5b", "#f27eae"];

export function createStartingGoobers(width?: number, height?: number) {
  const goobers = createGoobers(DEFAULT_STARTING_GOOBERS, DEFAULT_GOOBER_COLOR, width, height);
  for (const goober of goobers) {
    goober.color = presetGooberColors[Math.floor(Math.random() * presetGooberColors.length)];
  }
  return goobers;
}
