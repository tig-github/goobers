# Project Guidelines

## Project overview

- This is a small browser based goober simulation built with TypeScript, Canvas 2D, and Vite.
- Keep simulation rules in `src/simulation.ts` and world orchestration in `src/world.ts`; keep shared world dimensions and tuning defaults in `src/consts.ts`.
- Keep drawing code in `src/renderer.ts`. The renderer reads world state to draw it and must not mutate simulation data.
- Keep panel behavior in focused modules under `src/app/` and use `src/app.ts` to wire panels, `World`, and the renderer together. UI code changes game state through `World` methods; it does not implement simulation or progression rules.
- Keep simulation, events, personalities, special types, and `src/world.ts` free of DOM, `window`, and rendering dependencies.
- Keep progression rules in `src/progression.ts`, which reports earned badge IDs; keep badge and toast presentation in `src/app/badges.ts`.
- Pass injectable random sources through world creation, event updates, and simulation steps. Rendering randomness must not affect simulation outcomes.

## Implementation

- Prefer small, focused changes that fit the existing module boundaries and coding style.
- Preserve Goober behavior and special types unless a change explicitly calls for different behavior.
- Keep pixel art aligned to the sprite grid and draw orientation-dependent details in the same local coordinate space as the body.
- Use semantic HTML and accessible labels for interactive controls; keep visual styles in `src/field.css`.
- Avoid adding dependencies for functionality that can be implemented cleanly with the existing browser APIs.

## Verification

- Run `npm run build` after TypeScript or application changes when practical.
- Run `npm test` for simulation, event, and progression rule changes.
- For visual changes, inspect the result in the browser at more than one Goober heading and at portrait scale when applicable.
- Do not commit generated build output unless the task asks for it.
