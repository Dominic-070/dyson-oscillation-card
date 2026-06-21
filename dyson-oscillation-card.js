/**
 * Dyson Oscillation Card
 * A Home Assistant Lovelace (dashboard) card to control Dyson fan oscillation,
 * inspired by the MyDyson app — drag to aim the direction, drag each outer
 * edge to lengthen/shorten that side independently.
 *
 * Works with the hass-dyson integration (cmgrayb/hass-dyson):
 *   number.*_oscillation_center_angle   (aim / rotate, keeps width)
 *   number.*_oscillation_low_angle      (lower edge)
 *   number.*_oscillation_high_angle     (upper edge)
 *   number.*_oscillation_angle_span     (optional, used for presets)
 *
 * All angles run 0–350°. 175° points "forward" (toward you, at the bottom).
 * The 10° dead-zone (350°→0°) sits at the top — the back of the fan.
 *
 * No build step, no dependencies. Single file.
 */

const VERSION = "1.0.0";

/* ---------- geometry ---------------------------------------------------- */
const VB = 400;                 // viewBox size
const CX = 200, CY = 200;       // centre of the dial
const R_ARC = 150;              // radius the handles ride on
const R_FILL = 150;             // wedge fill radius
const R_TICK_OUT = 176;         // tick marks
const R_TICK_IN = 138;
const DEG2RAD = Math.PI / 180;

// Device angle (0–350, 175 = forward/down) -> screen degrees (0 = east, cw).
// screen = d - 85  =>  d=175 -> 90 (south/down), gap (350->360) lands at top.
const screenDeg = (d) => d - 85;
const polar = (d, r) => {
  const a = screenDeg(d) * DEG2RAD;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ---------- the card ---------------------------------------------------- */
class DysonOscillationCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._dragging = null;        // 'center' | 'low' | 'high' | null
    this._center = 175;
    this._low = 0;
    this._high = 350;
    this._pending = {};
    this._lastSend = 0;
    this._sendTimer = null;
  }

  /* ---- config ---- */
  static getStubConfig(hass) {
    const find = (suffix) =>
      Object.keys(hass.states).find(
        (e) => e.startsWith("number.") && e.endsWith(suffix)
      );
    return {
      type: "custom:dyson-oscillation-card",
      center_angle_entity: find("_oscillation_center_angle") || "",
      low_angle_entity: find("_oscillation_low_angle") || "",
      high_angle_entity: find("_oscillation_high_angle") || "",
      span_entity: find("_oscillation_angle_span") || "",
      show_presets: true,
    };
  }

  static getConfigElement() {
    return document.createElement("dyson-oscillation-card-editor");
  }

  setConfig(config) {
    if (!config.center_angle_entity || !config.low_angle_entity || !config.high_angle_entity) {
      throw new Error(
        "Stel center_angle_entity, low_angle_entity en high_angle_entity in."
      );
    }
    this._config = { show_presets: true, presets: [45, 90, 180, 350], ...config };
    this._built = false;
  }

  getCardSize() { return 5; }

  /* ---- hass updates ---- */
  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
    if (this._dragging) return; // don't fight the user mid-drag

    const num = (id, fb) => {
      const s = hass.states[id];
      const v = s ? parseFloat(s.state) : NaN;
      return Number.isFinite(v) ? v : fb;
    };
    this._low = clamp(num(this._config.low_angle_entity, 0), 0, 350);
    this._high = clamp(num(this._config.high_angle_entity, 350), 0, 350);
    if (this._high < this._low) [this._low, this._high] = [this._high, this._low];
    this._center = clamp(
      num(this._config.center_angle_entity, (this._low + this._high) / 2),
      0, 350
    );
    this._available = !!(hass.states[this._config.center_angle_entity] &&
      hass.states[this._config.center_angle_entity].state !== "unavailable");
    this._render();
  }

  /* ---- DOM scaffold (built once) ---- */
  _build() {
    this._built = true;
    const root = this.shadowRoot;
    root.innerHTML = `
      <style>
        :host { display:block; }
        ha-card {
          padding:16px; overflow:hidden;
          --acc: var(--dyson-accent, var(--primary-color, #7C5CFF));
          --acc-soft: color-mix(in srgb, var(--acc) 26%, transparent);
        }
        .head { display:flex; align-items:baseline; justify-content:space-between;
          margin:0 4px 4px; }
        .title { font-size:1.05rem; font-weight:600;
          color:var(--primary-text-color); }
        .readout { font-variant-numeric:tabular-nums; font-size:.82rem;
          color:var(--secondary-text-color); letter-spacing:.02em; }
        .readout b { color:var(--primary-text-color); font-weight:600; }
        .stage { width:100%; max-width:380px; margin:0 auto; }
        svg { width:100%; height:auto; display:block; touch-action:none;
          -webkit-user-select:none; user-select:none; }
        .tick { stroke:var(--divider-color, #444); stroke-width:2.4;
          stroke-linecap:round; }
        .tick.on { stroke:var(--acc); }
        .wedge { fill:var(--acc-soft); }
        .edge { stroke:var(--acc); stroke-width:5; fill:none; stroke-linecap:round; }
        .handle { fill:var(--card-background-color, #1c1c1c);
          stroke:var(--acc); stroke-width:4; cursor:grab; }
        .handle.center { stroke-width:5; }
        .handle:active { cursor:grabbing; }
        .hlabel { fill:var(--primary-text-color); font-size:15px; font-weight:600;
          text-anchor:middle; dominant-baseline:central; pointer-events:none;
          font-variant-numeric:tabular-nums; }
        .fan { fill:var(--primary-text-color); opacity:.85; }
        .fan-ring { fill:none; stroke:var(--primary-text-color); opacity:.85; }
        .aim { stroke:var(--acc); stroke-width:3; stroke-dasharray:2 7;
          stroke-linecap:round; opacity:.8; }
        .hint { text-align:center; font-size:.74rem; color:var(--secondary-text-color);
          margin:6px 4px 0; }
        .presets { display:flex; gap:8px; margin:14px 4px 2px; flex-wrap:wrap;
          justify-content:center; }
        .preset { flex:1 1 0; min-width:52px; padding:9px 4px; border-radius:12px;
          border:1px solid var(--divider-color,#444); background:transparent;
          color:var(--primary-text-color); font:inherit; font-size:.9rem;
          font-weight:600; cursor:pointer; transition:.15s; }
        .preset:hover { border-color:var(--acc); }
        .preset.sel { background:var(--acc); border-color:var(--acc); color:#fff; }
        .off { opacity:.45; pointer-events:none; }
      </style>
      <ha-card>
        <div class="head">
          <span class="title"></span>
          <span class="readout"></span>
        </div>
        <div class="stage">
          <svg viewBox="0 0 ${VB} ${VB}" id="svg">
            <g id="content"></g>
          </svg>
        </div>
        <div class="hint">Sleep het midden om te richten · sleep een rand om die kant bij te stellen</div>
        <div class="presets"></div>
      </ha-card>
    `;

    this._svg = root.getElementById("svg");
    this._content = root.getElementById("content");
    this._titleEl = root.querySelector(".title");
    this._readoutEl = root.querySelector(".readout");
    this._presetsEl = root.querySelector(".presets");

    // pointer handling lives on the svg; capture keeps the drag alive off-target
    this._svg.addEventListener("pointerdown", (e) => this._onDown(e));
    this._svg.addEventListener("pointermove", (e) => this._onMove(e));
    this._svg.addEventListener("pointerup", (e) => this._onUp(e));
    this._svg.addEventListener("pointercancel", (e) => this._onUp(e));
  }

  /* ---- coordinate helpers ---- */
  _toDevice(clientX, clientY) {
    const r = this._svg.getBoundingClientRect();
    const sx = ((clientX - r.left) / r.width) * VB;
    const sy = ((clientY - r.top) / r.height) * VB;
    let deg = Math.atan2(sy - CY, sx - CX) / DEG2RAD; // screen degrees
    let d = deg + 85;                                  // back to device
    d = ((d % 360) + 360) % 360;                        // 0..360
    if (d > 350) d = 360 - d < d - 350 ? 0 : 350;       // snap out of dead-zone
    return d;
  }

  _nearestHandle(clientX, clientY) {
    const r = this._svg.getBoundingClientRect();
    const sx = ((clientX - r.left) / r.width) * VB;
    const sy = ((clientY - r.top) / r.height) * VB;
    const dist = (d) => {
      const p = polar(d, R_ARC);
      return Math.hypot(p.x - sx, p.y - sy);
    };
    const cand = [
      ["center", dist(this._center)],
      ["low", dist(this._low)],
      ["high", dist(this._high)],
    ].sort((a, b) => a[1] - b[1]);
    // grab a handle if close enough, else fall back to aiming (center)
    return cand[0][1] < 40 ? cand[0][0] : "center";
  }

  /* ---- drag ---- */
  _onDown(e) {
    if (!this._available) return;
    e.preventDefault();
    this._dragging = this._nearestHandle(e.clientX, e.clientY);
    this._svg.setPointerCapture(e.pointerId);
    this._onMove(e);
  }

  _onMove(e) {
    if (!this._dragging) return;
    e.preventDefault();
    const d = this._toDevice(e.clientX, e.clientY);

    if (this._dragging === "low") {
      this._low = clamp(Math.round(d), 0, this._high);
      this._center = (this._low + this._high) / 2;
      this._queue(this._config.low_angle_entity, this._low);
    } else if (this._dragging === "high") {
      this._high = clamp(Math.round(d), this._low, 350);
      this._center = (this._low + this._high) / 2;
      this._queue(this._config.high_angle_entity, this._high);
    } else {
      // aim: keep span, recentre — mirror the integration's edge behaviour
      const span = this._high - this._low;
      const c = clamp(Math.round(d), 0, 350);
      const half = Math.floor(span / 2);
      let lo = Math.max(0, c - half);
      let hi = Math.min(350, c + half);
      if (lo === 0) hi = Math.min(350, span);
      else if (hi === 350) lo = Math.max(0, 350 - span);
      this._low = lo; this._high = hi; this._center = (lo + hi) / 2;
      this._queue(this._config.center_angle_entity, c);
    }
    this._render();
  }

  _onUp(e) {
    if (!this._dragging) return;
    try { this._svg.releasePointerCapture(e.pointerId); } catch (_) {}
    this._dragging = null;
    this._flush();          // make sure the final value lands
    this._render();
  }

  /* ---- service calls (throttled while dragging) ---- */
  _queue(entity, value) {
    if (!entity) return;
    this._pending[entity] = Math.round(value);
    const now = Date.now();
    if (now - this._lastSend > 180) {
      this._flush();
    } else {
      clearTimeout(this._sendTimer);
      this._sendTimer = setTimeout(() => this._flush(), 180);
    }
  }

  _flush() {
    clearTimeout(this._sendTimer);
    const entries = Object.entries(this._pending);
    this._pending = {};
    if (!entries.length || !this._hass) return;
    this._lastSend = Date.now();
    for (const [entity_id, value] of entries) {
      this._hass.callService("number", "set_value", { entity_id, value });
    }
  }

  _setSpan(span) {
    // Preset: keep the current centre, change the width.
    if (this._config.span_entity && this._hass.states[this._config.span_entity]) {
      this._hass.callService("number", "set_value", {
        entity_id: this._config.span_entity,
        value: span,
      });
    } else {
      // No span entity — emulate by writing edges (spaced to avoid a race).
      const c = this._center;
      const half = span / 2;
      let lo = clamp(Math.round(c - half), 0, 350);
      let hi = clamp(Math.round(c + half), 0, 350);
      if (lo === 0) hi = Math.min(350, span);
      if (hi === 350) lo = Math.max(0, 350 - span);
      this._hass.callService("number", "set_value", {
        entity_id: this._config.high_angle_entity, value: hi,
      });
      setTimeout(() => this._hass.callService("number", "set_value", {
        entity_id: this._config.low_angle_entity, value: lo,
      }), 350);
    }
  }

  /* ---- render ---- */
  _render() {
    if (!this._built) return;
    const lo = this._low, hi = this._high, c = this._center;
    const span = Math.round(hi - lo);

    this._titleEl.textContent = this._config.name || "Oscillatie";
    this._readoutEl.innerHTML =
      `richting <b>${Math.round(c)}°</b> · breedte <b>${span}°</b>`;

    /* ticks */
    let ticks = "";
    for (let d = 0; d <= 350; d += 5) {
      const a = polar(d, R_TICK_OUT), b = polar(d, R_TICK_IN);
      const on = d >= lo && d <= hi;
      ticks += `<line class="tick ${on ? "on" : ""}" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"/>`;
    }

    /* wedge fill from centre */
    const ps = polar(lo, R_FILL), pe = polar(hi, R_FILL);
    const large = hi - lo > 180 ? 1 : 0;
    const wedge = (hi - lo) < 0.5 ? "" :
      `<path class="wedge" d="M ${CX} ${CY} L ${ps.x.toFixed(1)} ${ps.y.toFixed(1)} A ${R_FILL} ${R_FILL} 0 ${large} 1 ${pe.x.toFixed(1)} ${pe.y.toFixed(1)} Z"/>`;

    /* arc edge stroke */
    const edge = (hi - lo) < 0.5 ? "" :
      `<path class="edge" d="M ${ps.x.toFixed(1)} ${ps.y.toFixed(1)} A ${R_ARC} ${R_ARC} 0 ${large} 1 ${pe.x.toFixed(1)} ${pe.y.toFixed(1)}"/>`;

    /* aim line from fan to centre handle */
    const cp = polar(c, R_ARC);
    const aim = `<line class="aim" x1="${CX}" y1="${CY}" x2="${cp.x.toFixed(1)}" y2="${cp.y.toFixed(1)}"/>`;

    /* fan glyph (abstract bladeless loop, original) */
    const fan = `
      <ellipse class="fan-ring" cx="${CX}" cy="${CY}" rx="34" ry="44" stroke-width="9"/>
      <rect class="fan" x="${CX - 13}" y="${CY + 30}" width="26" height="34" rx="7"/>`;

    /* handles */
    const lp = polar(lo, R_ARC), hp = polar(hi, R_ARC);
    const handles = `
      <circle class="handle" data-h="low"  cx="${lp.x.toFixed(1)}" cy="${lp.y.toFixed(1)}" r="15"/>
      <circle class="handle" data-h="high" cx="${hp.x.toFixed(1)}" cy="${hp.y.toFixed(1)}" r="15"/>
      <circle class="handle center" data-h="center" cx="${cp.x.toFixed(1)}" cy="${cp.y.toFixed(1)}" r="22"/>
      <text class="hlabel" x="${cp.x.toFixed(1)}" y="${cp.y.toFixed(1)}">${Math.round(c)}</text>`;

    this._content.innerHTML = ticks + wedge + aim + fan + edge + handles;
    this._svg.classList.toggle("off", !this._available);

    this._renderPresets(span);
  }

  _renderPresets(span) {
    if (!this._config.show_presets) { this._presetsEl.innerHTML = ""; return; }
    const presets = this._config.presets || [45, 90, 180, 350];
    this._presetsEl.innerHTML = presets
      .map((p) => `<button class="preset ${p === span ? "sel" : ""}" data-p="${p}">${p}°</button>`)
      .join("");
    this._presetsEl.querySelectorAll(".preset").forEach((b) => {
      b.onclick = () => this._setSpan(parseInt(b.dataset.p, 10));
    });
  }
}
customElements.define("dyson-oscillation-card", DysonOscillationCard);

/* ---------- visual config editor --------------------------------------- */
class DysonOscillationCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }
  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }
  _render() {
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) =>
        ({
          name: "Titel (optioneel)",
          center_angle_entity: "Richting / center-hoek (vereist)",
          low_angle_entity: "Lage hoek — linkerrand (vereist)",
          high_angle_entity: "Hoge hoek — rechterrand (vereist)",
          span_entity: "Spanwijdte (optioneel, voor presets)",
          show_presets: "Toon preset-knoppen",
        }[s.name] || s.name);
      this._form.addEventListener("value-changed", (e) => {
        this.dispatchEvent(
          new CustomEvent("config-changed", {
            detail: { config: e.detail.value },
            bubbles: true,
            composed: true,
          })
        );
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = this._config;
    this._form.schema = [
      { name: "name", selector: { text: {} } },
      { name: "center_angle_entity", required: true,
        selector: { entity: { domain: "number" } } },
      { name: "low_angle_entity", required: true,
        selector: { entity: { domain: "number" } } },
      { name: "high_angle_entity", required: true,
        selector: { entity: { domain: "number" } } },
      { name: "span_entity", selector: { entity: { domain: "number" } } },
      { name: "show_presets", selector: { boolean: {} } },
    ];
  }
}
customElements.define("dyson-oscillation-card-editor", DysonOscillationCardEditor);

/* ---------- register in the card picker --------------------------------- */
window.customCards = window.customCards || [];
window.customCards.push({
  type: "dyson-oscillation-card",
  name: "Dyson Oscillation Card",
  description: "Richt en versmal/verbreed de oscillatie van je Dyson — sleepbaar, geïnspireerd door de MyDyson-app.",
  preview: true,
  documentationURL: "https://github.com/Dominic-070/dyson-oscillation-card",
});

console.info(
  `%c DYSON-OSCILLATION-CARD %c v${VERSION} `,
  "color:#fff;background:#7C5CFF;border-radius:3px 0 0 3px;padding:2px 4px;",
  "color:#7C5CFF;background:#222;border-radius:0 3px 3px 0;padding:2px 4px;"
);
