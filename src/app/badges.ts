type Badge = { id: string; name: string; description: string; icon: string };

const BADGES: readonly Badge[] = [
  { id: "lively", name: "Its getting lively", description: "Reach the maximum number of goobers.", icon: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="12" r="4"/><circle cx="10" cy="17" r="3"/><circle cx="30" cy="17" r="3"/><path d="M12 30v-3a8 8 0 0 1 16 0v3M4 29v-2a6 6 0 0 1 7-6M36 29v-2a6 6 0 0 0-7-6"/></svg>' },
  { id: "lonely", name: "Its getting lonely", description: "Leave the field with no goobers.", icon: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="17" r="6"/><path d="M9 32a11 11 0 0 1 22 0M6 8l28 25"/></svg>' },
  { id: "different", name: "This ones different", description: "Spawn and check a special type goober.", icon: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="18" cy="22" r="9"/><path d="m29 5 1.8 5.2L36 12l-5.2 1.8L29 19l-1.8-5.2L22 12l5.2-1.8L29 5ZM15 21h.1M21 21h.1M15 26q3 3 6 0"/></svg>' },
  { id: "gooberologist", name: "gooberologist", description: "Unlock the goober notebook.", icon: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 7h19a3 3 0 0 1 3 3v23H12a3 3 0 0 1-3-3V7Zm0 0v23a3 3 0 0 0 3 3M15 13h11M15 18h11M15 23h7"/><circle cx="29" cy="28" r="5"/><path d="m33 32 4 4"/></svg>' },
  { id: "gilded-notebook", name: "gilded notebook", description: "Add a golden goober to the notebook.", icon: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 7h19a3 3 0 0 1 3 3v23H12a3 3 0 0 1-3-3V7Zm0 0v23a3 3 0 0 0 3 3M15 13h11M15 18h7"/><path d="m27 21 2 4 4 .6-3 3 .7 4.4-3.7-2-3.7 2 .7-4.4-3-3 4-.6 2-4Z" fill="#ffd700"/></svg>' },
  { id: "rainbow-visitor", name: "rainbow visitor", description: "Witness the rainbow goober event.", icon: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 29a15 15 0 0 1 30 0M10 29a10 10 0 0 1 20 0M15 29a5 5 0 0 1 10 0" fill="none" stroke="#e34f6f" stroke-width="3"/><path d="M10 29a10 10 0 0 1 20 0" fill="none" stroke="#f2be45" stroke-width="3"/><path d="M15 29a5 5 0 0 1 10 0" fill="none" stroke="#548bdd" stroke-width="3"/></svg>' },
  { id: "little-guy", name: "hey there little guy", description: "Follow a goober.", icon: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="9"/><path d="M17 19h.1M23 19h.1M17 24q3 3 6 0M4 20h4M32 20h4M20 4v4M20 32v4M7 7l3 3M30 30l3 3"/></svg>' },
  { id: "customizer", name: "Customizer", description: "Add a goober with a custom color.", icon: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 5a15 15 0 1 0 0 30h2a4 4 0 0 0 3.3-6.3 2.5 2.5 0 0 1 2-4H30A5 5 0 0 0 35 20 15 15 0 0 0 20 5Z"/><circle cx="12" cy="17" r="1.5"/><circle cx="18" cy="12" r="1.5"/><circle cx="25" cy="13" r="1.5"/><circle cx="29" cy="19" r="1.5"/></svg>' },
  { id: "first-event", name: "A change of pace", description: "Witness your first field event.", icon: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="m20 3 4.2 11 11.8 1-9 7.5 3 11.5L20 28l-10 6 3-11.5L4 15l11.8-1L20 3Z"/><circle cx="20" cy="20" r="3"/></svg>' },
];

const PAGE_SIZE = 4;

export class BadgeSystem {
  private readonly earned = new Set<string>();
  private readonly toggle: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly toasts: HTMLElement;
  private page = 0;

  constructor(
    toggle: HTMLButtonElement,
    panel: HTMLElement,
    toasts: HTMLElement,
  ) {
    this.toggle = toggle;
    this.panel = panel;
    this.toasts = toasts;
  }

  earn(id: string): void {
    if (this.earned.has(id)) return;
    const badge = BADGES.find((item) => item.id === id);
    if (!badge) return;
    this.earned.add(id);
    this.showToast(badge);
    this.render();
  }

  render(): void {
    const unlocked = this.earned.size > 0;
    this.toggle.hidden = !unlocked;
    this.toggle.classList.toggle("is-unlocked", unlocked);
    this.panel.hidden = !unlocked || this.panel.hidden;
    this.panel.replaceChildren();

    const header = document.createElement("div"); header.className = "notebook-heading";
    const title = document.createElement("div"); title.innerHTML = `<span class="detail-kicker">FIELD MILESTONES</span><h2>badges · ${this.earned.size}</h2>`;
    const close = document.createElement("button"); close.type = "button"; close.className = "detail-close"; close.textContent = "×"; close.setAttribute("aria-label", "Close badges");
    close.addEventListener("click", () => { this.panel.hidden = true; this.toggle.setAttribute("aria-expanded", "false"); });
    header.append(title, close); this.panel.append(header);

    const earned = BADGES.filter((badge) => this.earned.has(badge.id));
    const pageCount = Math.ceil(earned.length / PAGE_SIZE);
    this.page = Math.min(this.page, Math.max(0, pageCount - 1));
    const list = document.createElement("div"); list.className = "badge-list";
    for (const badge of earned.slice(this.page * PAGE_SIZE, (this.page + 1) * PAGE_SIZE)) {
      const row = document.createElement("article"); row.className = "badge-card is-earned";
      const icon = document.createElement("span"); icon.className = "badge-icon"; icon.innerHTML = badge.icon;
      const copy = document.createElement("span"); copy.className = "badge-copy";
      const name = document.createElement("strong"); name.textContent = badge.name;
      const description = document.createElement("span"); description.textContent = badge.description;
      copy.append(name, description); row.append(icon, copy); list.append(row);
    }
    this.panel.append(list);

    if (pageCount > 1) {
      const pagination = document.createElement("nav"); pagination.className = "notebook-pagination"; pagination.setAttribute("aria-label", "Badge pages");
      const previous = document.createElement("button"); previous.type = "button"; previous.textContent = "←"; previous.disabled = this.page === 0; previous.setAttribute("aria-label", "Previous badge page");
      previous.addEventListener("click", () => { this.page--; this.render(); });
      const status = document.createElement("span"); status.textContent = `page ${this.page + 1} of ${pageCount}`;
      const next = document.createElement("button"); next.type = "button"; next.textContent = "→"; next.disabled = this.page >= pageCount - 1; next.setAttribute("aria-label", "Next badge page");
      next.addEventListener("click", () => { this.page++; this.render(); });
      pagination.append(previous, status, next); this.panel.append(pagination);
    }
  }

  private showToast(badge: Badge): void {
    const toast = document.createElement("div"); toast.className = "badge-toast"; toast.setAttribute("role", "status");
    const icon = document.createElement("span"); icon.className = "badge-icon"; icon.innerHTML = badge.icon;
    const copy = document.createElement("span"); copy.className = "badge-copy";
    const label = document.createElement("span"); label.className = "badge-toast-label"; label.textContent = "badge earned";
    const name = document.createElement("strong"); name.textContent = badge.name;
    copy.append(label, name); toast.append(icon, copy); this.toasts.append(toast);
    window.setTimeout(() => {
      toast.classList.add("is-leaving");
      window.setTimeout(() => toast.remove(), 220);
    }, 3500);
  }
}
