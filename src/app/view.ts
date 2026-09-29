import {
  DEFAULT_GOOBER_COLOR,
  DEFAULT_GOOBER_SPEED,
  DEFAULT_STARTING_GOOBERS,
  DEFAULT_ZOOM,
  FIELD_SCALE_STEP,
  GOOBER_SPEED_STEP,
  MAX_FIELD_SCALE,
  MAX_GOOBER_SPEED,
  MAX_ZOOM,
  MIN_FIELD_SCALE,
  MIN_GOOBER_SPEED,
  ZOOM_STEP,
} from "../consts";

export function mountApp(root: HTMLElement): void {
  root.innerHTML = `
  <button id="notebook-toggle" class="notebook-toggle" type="button" aria-label="Open notebook" aria-expanded="false" hidden>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h11.5A2.5 2.5 0 0 1 19 7v13H7a2 2 0 0 1-2-2V4.5Zm0 0v13.8A2.7 2.7 0 0 0 7.7 21H19M9 8h6M9 11h6"/></svg>
  </button>
  <button id="badges-toggle" class="notebook-toggle badges-toggle" type="button" aria-label="Open badges" aria-expanded="false" hidden><span aria-hidden="true">✦</span></button>
  <aside id="notebook-panel" class="notebook-panel" aria-label="Goober notebook" hidden></aside>
  <aside id="badges-panel" class="notebook-panel badges-panel" aria-label="Badges" hidden></aside>
  <div id="badge-toasts" class="badge-toasts" aria-live="polite" aria-atomic="false"></div>
  <main>
    <header class="heading"><h1>goobers<span>.</span></h1><div class="heading-actions"><button id="admin-toggle" type="button" aria-controls="admin-panel" aria-expanded="false">admin</button><div class="live"><i></i><span id="run-state">wandering</span></div></div></header>
    <section class="arena-layout" aria-label="Goober field and details">
      <section id="saved-loadouts" class="saved-loadouts" aria-label="Saved goober loadouts" hidden>
        <div class="saved-loadouts-heading"><strong>saved loadouts</strong><span id="loadout-count">none yet</span></div>
        <div id="loadout-list" class="loadout-list"></div>
      </section>
      <div class="field" aria-label="Goober simulation"><canvas id="arena" aria-label="Goobers wandering in a field"></canvas><div id="event-indicator" class="event-indicator" role="status" aria-live="polite" hidden></div></div>
      <aside id="goober-details" class="goober-details" aria-live="polite" hidden></aside>
      <aside id="admin-panel" class="admin-panel" aria-label="Admin panel" hidden>
        <h2>admin panel</h2>
        <p>Developer controls for testing field events.</p>
        <button id="trigger-gathering" type="button">trigger gathering</button>
        <button id="trigger-drift" type="button">trigger drift</button>
        <button id="trigger-color-parade" type="button">trigger color parade</button>
        <button id="trigger-conga-line" type="button">trigger conga line</button>
        <button id="trigger-golden-goober" type="button">trigger golden goober</button>
        <button id="trigger-rainbow-goober" type="button">trigger rainbow goober</button>
        <button id="trigger-gassy" type="button">trigger gassy</button>
      </aside>
    </section>
    <section class="toolbar" aria-label="Field controls">
      <div class="population"><strong id="population-count">${DEFAULT_STARTING_GOOBERS}</strong><span>in the field</span><button id="clear-goobers" class="clear-goobers" type="button" hidden>clear</button></div>
      <div class="actions">
        <label class="color-picker" for="goober-color">new color
          <select id="goober-color" aria-label="Color for new goobers">
            <option value="#438cff">blue</option><option value="#f28a62">coral</option>
            <option value="#a98cff">lilac</option><option value="#a4d66d">lime</option>
            <option value="#f2cf5b">yellow</option><option value="#f27eae">pink</option><option value="random">random</option><option value="custom">custom</option>
          </select>
          <input id="custom-color" type="color" value="${DEFAULT_GOOBER_COLOR}" aria-label="Choose a custom RGB color" title="Choose a custom color" hidden>
        </label>
        <button id="population-down" type="button">− remove</button>
        <button id="population-up" class="add-button" type="button">+ add</button>
      </div>
      <div class="field-actions"><label for="speed-control">speed <output id="speed-value">${DEFAULT_GOOBER_SPEED.toFixed(1)}×</output></label><input id="speed-control" type="range" min="${MIN_GOOBER_SPEED}" max="${MAX_GOOBER_SPEED}" step="${GOOBER_SPEED_STEP}" value="${DEFAULT_GOOBER_SPEED}" aria-label="Wander speed"><button id="theme-control" type="button">light mode</button><button id="pause-control" type="button"><span id="pause-label">pause</span></button><button id="reset-control" type="button">reset</button></div>
    </section>
    <section class="view-controls" aria-label="Field size and view controls">
      <label for="field-size">field size <output id="field-size-value">1.00×</output></label>
      <input id="field-size" type="range" min="${MIN_FIELD_SCALE}" max="${MAX_FIELD_SCALE}" step="${FIELD_SCALE_STEP}" value="1" aria-label="Field size">
      <label for="zoom-control">zoom <output id="zoom-value">${DEFAULT_ZOOM.toFixed(1)}×</output></label>
      <input id="zoom-control" type="range" min="${DEFAULT_ZOOM}" max="${MAX_ZOOM}" step="${ZOOM_STEP}" value="${DEFAULT_ZOOM}" aria-label="Zoom view">
      <span class="pan-hint">drag field to pan</span>
      <button id="view-reset" type="button">reset view</button>
    </section>
    <footer><span>small creatures, no particular place to be</span><span id="field-clock">00:00</span></footer>
  </main>
`;
}
