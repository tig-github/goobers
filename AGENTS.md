# Project Guidelines

## Project overview

- This is a small browser based goober simulation built with TypeScript, Canvas 2D, and Vite.
- Keep simulation rules in `src/simulation.ts`, drawing code in `src/renderer.ts`, and UI behavior in `src/app/` and `src/app.ts`.
- Keep shared world dimensions and tuning defaults in `src/consts.ts`.

## Implementation

- Prefer small, focused changes that fit the existing module boundaries and coding style.
- Preserve Goober behavior and special types unless a change explicitly calls for different behavior.
- Keep pixel art aligned to the sprite grid and draw orientation-dependent details in the same local coordinate space as the body.
- Use semantic HTML and accessible labels for interactive controls; keep visual styles in `src/field.css`.
- Avoid adding dependencies for functionality that can be implemented cleanly with the existing browser APIs.

## Verification

- Run `npm run build` after TypeScript or application changes when practical.
- For visual changes, inspect the result in the browser at more than one Goober heading and at portrait scale when applicable.
- Do not commit generated build output unless the task asks for it.
