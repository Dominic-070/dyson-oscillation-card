/**
 * Dyson Oscillation Card
 * Aim and shape the oscillation of a Dyson fan from Home Assistant, inspired by
 * the MyDyson app — drag the centre to aim, drag each edge to lengthen/shorten
 * that side, plus an optional Mushroom-style control row (power, oscillation,
 * night mode, auto, speed, sleep timer, air quality, filter).
 *
 * For the hass-dyson integration (cmgrayb/hass-dyson). No build step, no deps.
 *
 * Angles run 0–350°. 175° points forward (toward you, bottom of the dial).
 * The 10° dead-zone (350°→0°) sits at the top — the back of the fan.
 */

const VERSION = "1.1.0";

/* ---------- geometry ---------------------------------------------------- */
const VB = 400, CX = 200, CY = 200;
const R_ARC = 150, R_FILL = 150, R_TICK_OUT = 176, R_TICK_IN = 138;
const DEG2RAD = Math.PI / 180;
const screenDeg = (d) => d - 85;
const polar = (d, r) => {
  const a = screenDeg(d) * DEG2RAD;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ---------- helpers ----------------------------------------------------- */
function fireEvent(node, type, detail) {
  const ev = new Event(type, { bubbles: true, cancelable: false, composed: true });
  ev.detail = detail === undefined ? {} : detail;
  node.dispatchEvent(ev);
  return ev;
}
// Companion-app haptics. No-op on desktop.
let _lastHaptic = 0;
function haptic(type, minGap = 0) {
  const now = Date.now();
  if (now - _lastHaptic < minGap) return;
  _lastHaptic = now;
  fireEvent(window, "haptic", type);
}

/* ---------- Mushroom-style control catalogue ---------------------------- */
// Each control resolves an entity from the auto-detected map and renders a chip,
// a slider, or a read-only badge. Anything whose entity is missing is hidden,
// which is what makes the card model-agnostic across the hass-dyson line-up.
const CONTROLS = {
  power: {
    label: "Aan/uit", icon: "mdi:power", kind: "toggle",
    entity: (m) => m.fan,
    active: (s) => s && s.state === "on",
    tap: (hass, id) => hass.callService("homeassistant", "toggle", { entity_id: id }),
  },
  oscillation: {
    label: "Oscillatie", icon: "mdi:arrow-left-right", kind: "toggle",
    entity: (m) => m.fan,
    active: (s) => !!(s && s.attributes && s.attributes.oscillating),
    tap: (hass, id, s) => hass.callService("fan", "oscillate", {
      entity_id: id, oscillating: !(s && s.attributes && s.attributes.oscillating),
    }),
  },
  night_mode: {
    label: "Nachtstand", icon: "mdi:weather-night", kind: "toggle",
    entity: (m) => m.night_mode,
    active: (s) => s && s.state === "on",
    tap: (hass, id) => hass.callService("homeassistant", "toggle", { entity_id: id }),
  },
  auto: {
    label: "Auto", icon: "mdi:fan-auto", kind: "toggle",
    entity: (m) => m.fan,
    active: (s) => !!(s && s.attributes && s.attributes.preset_mode === "auto"),
    tap: (hass, id, s) => hass.callService("fan", "set_preset_mode", {
      entity_id: id,
      preset_mode: s && s.attributes && s.attributes.preset_mode === "auto" ? "manual" : "auto",
    }),
  },
  continuous_monitoring: {
    label: "Monitoring", icon: "mdi:eye", kind: "toggle",
    entity: (m) => m.continuous_monitoring,
    active: (s) => s && s.state === "on",
    tap: (hass, id) => hass.callService("homeassistant", "toggle", { entity_id: id }),
  },
  speed: {
    label: "Snelheid", icon: "mdi:fan", kind: "slider",
    entity: (m) => m.fan,
  },
  sleep_timer: {
    label: "Slaaptimer", icon: "mdi:timer-outline", kind: "badge",
    entity: (m) => m.sleep_timer,
    text: (s) => {
      const v = parseFloat(s.state);
      return Number.isFinite(v) && v > 0 ? `${Math.round(v)} min` : "Uit";
    },
  },
  air_quality: {
    label: "Lucht", icon: "mdi:air-filter", kind: "badge",
    entity: (m) => m.air_quality,
    text: (s) => s.state,
  },
  filter_life: {
    label: "Filter", icon: "mdi:air-purifier", kind: "badge",
    entity: (m) => m.filter_life,
    text: (s) => {
      const v = parseFloat(s.state);
      return Number.isFinite(v) ? `${Math.round(v)}%` : s.state;
    },
  },
};
const DEFAULT_FEATURES = ["power", "oscillation", "night_mode", "auto", "speed"];

/* ====================================================================== */
class DysonOscillationCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._dragging = null;
    this._center = 175; this._low = 0; this._high = 350;
    this._pending = {}; this._lastSend = 0; this._sendTimer = null;
    this._hapticAngle = 0;
    this._sliderDrag = false;
  }

  /* ---- config + auto-detect ---- */
  static getStubConfig(hass) {
    const find = (suffix) => Object.keys(hass.states).find(
      (e) => e.startsWith("number.") && e.endsWith(suffix));
    return {
      type: "custom:dyson-oscillation-card",
      center_angle_entity: find("_oscillation_center_angle") || "",
      low_angle_entity: find("_oscillation_low_angle") || "",
      high_angle_entity: find("_oscillation_high_angle") || "",
      span_entity: find("_oscillation_angle_span") || find("_oscillation_angle") || "",
      show_presets: true,
      features: [...DEFAULT_FEATURES],
    };
  }

  static getConfigElement() {
    return document.createElement("dyson-oscillation-card-editor");
  }

  setConfig(config) {
    if (!config.center_angle_entity || !config.low_angle_entity || !config.high_angle_entity)
      throw new Error("Stel center_angle_entity, low_angle_entity en high_angle_entity in.");
    this._config = {
      show_presets: true,
      presets: [45, 90, 180, 350],
      features: [...DEFAULT_FEATURES],
      haptics: true,
      ...config,
    };
    this._map = this._deriveEntities(this._config);
    this._built = false;
  }

  // Build the related-entity map from the device slug shared by the angle numbers.
  _deriveEntities(cfg) {
    const m = {};
    const slug = cfg.center_angle_entity
      .replace(/^number\./, "")
      .replace(/_oscillation_center_angle$/, "");
    const d = (domain, suffix) => `${domain}.${slug}${suffix}`;
    m.fan = cfg.fan_entity || `fan.${slug}`;
    m.night_mode = cfg.night_mode_entity || d("switch", "_night_mode");
    m.continuous_monitoring = cfg.continuous_monitoring_entity || d("switch", "_continuous_monitoring");
    m.sleep_timer = cfg.sleep_timer_entity || d("number", "_sleep_timer");
    m.air_quality = cfg.air_quality_entity || d("sensor", "_air_quality_category");
    m.filter_life = cfg.filter_life_entity || d("sensor", "_hepa_filter_life");
    m.oscillation_select = cfg.oscillation_select_entity || d("select", "_oscillation");
    return m;
  }

  getCardSize() { return 6; }

  /* ---- hass ---- */
  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
    if (this._dragging || this._sliderDrag) return;
    const num = (id, fb) => {
      const s = hass.states[id]; const v = s ? parseFloat(s.state) : NaN;
      return Number.isFinite(v) ? v : fb;
    };
    this._low = clamp(num(this._config.low_angle_entity, 0), 0, 350);
    this._high = clamp(num(this._config.high_angle_entity, 350), 0, 350);
    if (this._high < this._low) [this._low, this._high] = [this._high, this._low];
    this._center = clamp(num(this._config.center_angle_entity, (this._low + this._high) / 2), 0, 350);
    const cs = hass.states[this._config.center_angle_entity];
    this._available = !!(cs && cs.state !== "unavailable");
    this._render();
  }

  /* ---- scaffold ---- */
  _build() {
    this._built = true;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        ha-card { padding:16px; overflow:hidden;
          --acc: var(--dyson-accent, var(--primary-color, #7C5CFF));
          --acc-soft: color-mix(in srgb, var(--acc) 26%, transparent);
          --chip-bg: var(--card-background-color, #1c1c1c); }
        .head { display:flex; align-items:baseline; justify-content:space-between; margin:0 4px 4px; }
        .title { font-size:1.05rem; font-weight:600; color:var(--primary-text-color); }
        .readout { font-variant-numeric:tabular-nums; font-size:.82rem; color:var(--secondary-text-color); }
        .readout b { color:var(--primary-text-color); font-weight:600; }
        .stage { width:100%; max-width:380px; margin:0 auto; }
        svg { width:100%; height:auto; display:block; touch-action:none; user-select:none; -webkit-user-select:none; }
        .tick { stroke:var(--divider-color,#444); stroke-width:2.4; stroke-linecap:round; }
        .tick.on { stroke:var(--acc); }
        .wedge { fill:var(--acc-soft); }
        .edge { stroke:var(--acc); stroke-width:5; fill:none; stroke-linecap:round; }
        .handle { fill:var(--chip-bg); stroke:var(--acc); stroke-width:4; cursor:grab; }
        .handle.center { stroke-width:5; }
        .hlabel { fill:var(--primary-text-color); font-size:15px; font-weight:600; text-anchor:middle;
          dominant-baseline:central; pointer-events:none; font-variant-numeric:tabular-nums; }
        .fan { fill:var(--primary-text-color); opacity:.85; }
        .fan-ring { fill:none; stroke:var(--primary-text-color); opacity:.85; }
        .aim { stroke:var(--acc); stroke-width:3; stroke-dasharray:2 7; stroke-linecap:round; opacity:.8; }
        .hint { text-align:center; font-size:.74rem; color:var(--secondary-text-color); margin:6px 4px 0; }
        .presets { display:flex; gap:8px; margin:14px 4px 4px; flex-wrap:wrap; justify-content:center; }
        .preset { flex:1 1 0; min-width:52px; padding:9px 4px; border-radius:12px;
          border:1px solid var(--divider-color,#444); background:transparent; color:var(--primary-text-color);
          font:inherit; font-size:.9rem; font-weight:600; cursor:pointer; transition:.15s; }
        .preset:hover { border-color:var(--acc); }
        .preset.sel { background:var(--acc); border-color:var(--acc); color:#fff; }
        .off { opacity:.45; pointer-events:none; }

        .controls { display:flex; flex-wrap:wrap; gap:10px; margin-top:14px; }
        .chip { flex:1 1 64px; min-width:64px; display:flex; flex-direction:column; align-items:center;
          gap:5px; padding:11px 6px; border-radius:16px; background:var(--chip-bg);
          border:1px solid var(--divider-color,#333); cursor:pointer; transition:.15s; }
        .chip:hover { border-color:var(--acc); }
        .chip ha-icon { --mdc-icon-size:24px; color:var(--primary-text-color); }
        .chip .clabel { font-size:.7rem; color:var(--secondary-text-color); text-align:center; line-height:1.1; }
        .chip.on { background:var(--acc); border-color:var(--acc); }
        .chip.on ha-icon, .chip.on .clabel { color:#fff; }
        .chip.badge { cursor:pointer; }
        .chip.badge .cval { font-size:.85rem; font-weight:600; color:var(--primary-text-color); }

        .slider { flex:1 1 100%; display:flex; align-items:center; gap:12px; padding:12px 14px;
          border-radius:18px; background:var(--chip-bg); border:1px solid var(--divider-color,#333);
          touch-action:none; user-select:none; }
        .slider ha-icon { --mdc-icon-size:22px; color:var(--primary-text-color); flex:0 0 auto; }
        .track { position:relative; flex:1 1 auto; height:10px; border-radius:6px;
          background:var(--divider-color,#3a3a3a); cursor:pointer; }
        .fill { position:absolute; inset:0 auto 0 0; border-radius:6px; background:var(--acc); }
        .sval { flex:0 0 auto; min-width:1.6em; text-align:right; font-weight:600;
          font-variant-numeric:tabular-nums; color:var(--primary-text-color); }
      </style>
      <ha-card>
        <div class="head"><span class="title"></span><span class="readout"></span></div>
        <div class="stage"><svg viewBox="0 0 ${VB} ${VB}" id="svg"><g id="content"></g></svg></div>
        <div class="hint">Sleep het midden om te richten · sleep een rand om die kant bij te stellen</div>
        <div class="presets"></div>
        <div class="controls"></div>
      </ha-card>`;
    this._svg = this.shadowRoot.getElementById("svg");
    this._content = this.shadowRoot.getElementById("content");
    this._titleEl = this.shadowRoot.querySelector(".title");
    this._readoutEl = this.shadowRoot.querySelector(".readout");
    this._presetsEl = this.shadowRoot.querySelector(".presets");
    this._controlsEl = this.shadowRoot.querySelector(".controls");
    this._svg.addEventListener("pointerdown", (e) => this._onDown(e));
    this._svg.addEventListener("pointermove", (e) => this._onMove(e));
    this._svg.addEventListener("pointerup", (e) => this._onUp(e));
    this._svg.addEventListener("pointercancel", (e) => this._onUp(e));
  }

  /* ---- coordinate helpers ---- */
  // ref = current value of the handle being dragged; used so dragging across the
  // top dead-zone clamps to the *near* boundary instead of flipping to the far one.
  _toDevice(clientX, clientY, ref) {
    const r = this._svg.getBoundingClientRect();
    const sx = ((clientX - r.left) / r.width) * VB;
    const sy = ((clientY - r.top) / r.height) * VB;
    let deg = Math.atan2(sy - CY, sx - CX) / DEG2RAD;
    let d = ((deg + 85) % 360 + 360) % 360;
    if (d > 350) {
      d = ref == null
        ? (360 - d < d - 350 ? 0 : 350)            // no reference: nearest boundary
        : (Math.abs(ref - 0) <= Math.abs(ref - 350) ? 0 : 350); // stay on the handle's side
    }
    return d;
  }

  _nearestHandle(clientX, clientY) {
    const r = this._svg.getBoundingClientRect();
    const sx = ((clientX - r.left) / r.width) * VB;
    const sy = ((clientY - r.top) / r.height) * VB;
    const dist = (d) => { const p = polar(d, R_ARC); return Math.hypot(p.x - sx, p.y - sy); };
    const c = [["center", dist(this._center)], ["low", dist(this._low)], ["high", dist(this._high)]]
      .sort((a, b) => a[1] - b[1]);
    return c[0][1] < 40 ? c[0][0] : "center";
  }

  /* ---- dial drag ---- */
  _onDown(e) {
    if (!this._available) return;
    e.preventDefault();
    this._dragging = this._nearestHandle(e.clientX, e.clientY);
    this._svg.setPointerCapture(e.pointerId);
    this._hapticAngle = this._dragging === "low" ? this._low
      : this._dragging === "high" ? this._high : this._center;
    if (this._config.haptics) haptic("selection");
    this._onMove(e);
  }

  _onMove(e) {
    if (!this._dragging) return;
    e.preventDefault();
    const ref = this._dragging === "low" ? this._low
      : this._dragging === "high" ? this._high : this._center;
    const d = this._toDevice(e.clientX, e.clientY, ref);

    if (this._dragging === "low") {
      this._low = clamp(Math.round(d), 0, this._high);
      this._center = (this._low + this._high) / 2;
      this._queue(this._config.low_angle_entity, this._low);
    } else if (this._dragging === "high") {
      this._high = clamp(Math.round(d), this._low, 350);
      this._center = (this._low + this._high) / 2;
      this._queue(this._config.high_angle_entity, this._high);
    } else {
      const span = this._high - this._low;
      const c = clamp(Math.round(d), 0, 350), half = Math.floor(span / 2);
      let lo = Math.max(0, c - half), hi = Math.min(350, c + half);
      if (lo === 0) hi = Math.min(350, span); else if (hi === 350) lo = Math.max(0, 350 - span);
      this._low = lo; this._high = hi; this._center = (lo + hi) / 2;
      this._queue(this._config.center_angle_entity, c);
    }

    if (this._config.haptics) {
      const cur = this._dragging === "low" ? this._low
        : this._dragging === "high" ? this._high : this._center;
      if (Math.abs(cur - this._hapticAngle) >= 4) { haptic("selection", 30); this._hapticAngle = cur; }
    }
    this._render();
  }

  _onUp(e) {
    if (!this._dragging) return;
    try { this._svg.releasePointerCapture(e.pointerId); } catch (_) {}
    this._dragging = null;
    if (this._config.haptics) haptic("light");
    this._flush();
    this._render();
  }

  /* ---- throttled writes ---- */
  _queue(entity, value) {
    if (!entity) return;
    this._pending[entity] = Math.round(value);
    const now = Date.now();
    if (now - this._lastSend > 180) this._flush();
    else { clearTimeout(this._sendTimer); this._sendTimer = setTimeout(() => this._flush(), 180); }
  }
  _flush() {
    clearTimeout(this._sendTimer);
    const entries = Object.entries(this._pending); this._pending = {};
    if (!entries.length || !this._hass) return;
    this._lastSend = Date.now();
    for (const [entity_id, value] of entries)
      this._hass.callService("number", "set_value", { entity_id, value });
  }

  /* ---- presets (prefer the oscillation select; keeps centre) ---- */
  _setPreset(deg) {
    if (this._config.haptics) haptic("medium");
    const sel = this._map.oscillation_select;
    if (sel && this._hass.states[sel]) {
      this._hass.callService("select", "select_option", { entity_id: sel, option: `${deg}°` });
      return;
    }
    if (this._config.span_entity && this._hass.states[this._config.span_entity]) {
      this._hass.callService("number", "set_value", { entity_id: this._config.span_entity, value: deg });
      return;
    }
    const c = this._center, half = deg / 2;
    let lo = clamp(Math.round(c - half), 0, 350), hi = clamp(Math.round(c + half), 0, 350);
    if (lo === 0) hi = Math.min(350, deg); if (hi === 350) lo = Math.max(0, 350 - deg);
    this._hass.callService("number", "set_value", { entity_id: this._config.high_angle_entity, value: hi });
    setTimeout(() => this._hass.callService("number", "set_value",
      { entity_id: this._config.low_angle_entity, value: lo }), 350);
  }

  /* ---- render ---- */
  _render() {
    if (!this._built) return;
    const lo = this._low, hi = this._high, c = this._center, span = Math.round(hi - lo);
    this._titleEl.textContent = this._config.name || "Oscillatie";
    this._readoutEl.innerHTML = `richting <b>${Math.round(c)}°</b> · breedte <b>${span}°</b>`;

    let ticks = "";
    for (let d = 0; d <= 350; d += 5) {
      const a = polar(d, R_TICK_OUT), b = polar(d, R_TICK_IN), on = d >= lo && d <= hi;
      ticks += `<line class="tick ${on ? "on" : ""}" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"/>`;
    }
    const ps = polar(lo, R_FILL), pe = polar(hi, R_FILL), large = hi - lo > 180 ? 1 : 0;
    const wedge = (hi - lo) < 0.5 ? "" :
      `<path class="wedge" d="M ${CX} ${CY} L ${ps.x.toFixed(1)} ${ps.y.toFixed(1)} A ${R_FILL} ${R_FILL} 0 ${large} 1 ${pe.x.toFixed(1)} ${pe.y.toFixed(1)} Z"/>`;
    const edge = (hi - lo) < 0.5 ? "" :
      `<path class="edge" d="M ${ps.x.toFixed(1)} ${ps.y.toFixed(1)} A ${R_ARC} ${R_ARC} 0 ${large} 1 ${pe.x.toFixed(1)} ${pe.y.toFixed(1)}"/>`;
    const cp = polar(c, R_ARC);
    const aim = `<line class="aim" x1="${CX}" y1="${CY}" x2="${cp.x.toFixed(1)}" y2="${cp.y.toFixed(1)}"/>`;
    const fan = `<ellipse class="fan-ring" cx="${CX}" cy="${CY}" rx="34" ry="44" stroke-width="9"/>
      <rect class="fan" x="${CX - 13}" y="${CY + 30}" width="26" height="34" rx="7"/>`;
    const lp = polar(lo, R_ARC), hp = polar(hi, R_ARC);
    const handles = `
      <circle class="handle" data-h="low"  cx="${lp.x.toFixed(1)}" cy="${lp.y.toFixed(1)}" r="15"/>
      <circle class="handle" data-h="high" cx="${hp.x.toFixed(1)}" cy="${hp.y.toFixed(1)}" r="15"/>
      <circle class="handle center" data-h="center" cx="${cp.x.toFixed(1)}" cy="${cp.y.toFixed(1)}" r="22"/>
      <text class="hlabel" x="${cp.x.toFixed(1)}" y="${cp.y.toFixed(1)}">${Math.round(c)}</text>`;
    this._content.innerHTML = ticks + wedge + aim + fan + edge + handles;
    this._svg.classList.toggle("off", !this._available);

    this._renderPresets(span);
    this._renderControls();
  }

  _renderPresets(span) {
    if (!this._config.show_presets) { this._presetsEl.innerHTML = ""; return; }
    const sel = this._map.oscillation_select;
    const selOpt = sel && this._hass.states[sel] ? this._hass.states[sel].state : null;
    const presets = this._config.presets || [45, 90, 180, 350];
    this._presetsEl.innerHTML = presets.map((p) => {
      const active = selOpt ? selOpt === `${p}°` : p === span;
      return `<button class="preset ${active ? "sel" : ""}" data-p="${p}">${p}°</button>`;
    }).join("");
    this._presetsEl.querySelectorAll(".preset").forEach((b) =>
      b.onclick = () => this._setPreset(parseInt(b.dataset.p, 10)));
  }

  _renderControls() {
    const feats = this._config.features || [];
    const hass = this._hass;
    let html = "";
    for (const key of feats) {
      const def = CONTROLS[key]; if (!def) continue;
      const id = def.entity(this._map);
      const st = id && hass.states[id]; if (!st) continue; // auto-hide if absent

      if (def.kind === "toggle") {
        const on = def.active(st);
        html += `<div class="chip ${on ? "on" : ""}" data-key="${key}" data-id="${id}" role="button" tabindex="0">
          <ha-icon icon="${def.icon}"></ha-icon><span class="clabel">${def.label}</span></div>`;
      } else if (def.kind === "badge") {
        html += `<div class="chip badge" data-key="${key}" data-id="${id}" role="button" tabindex="0">
          <ha-icon icon="${def.icon}"></ha-icon><span class="cval">${def.text(st)}</span>
          <span class="clabel">${def.label}</span></div>`;
      } else if (def.kind === "slider") {
        const pct = clamp(parseFloat(st.attributes.percentage) || 0, 0, 100);
        const lvl = Math.round(pct / 10);
        html += `<div class="slider" data-key="${key}" data-id="${id}">
          <ha-icon icon="${def.icon}"></ha-icon>
          <div class="track" data-track="1"><div class="fill" style="width:${pct}%"></div></div>
          <span class="sval">${lvl}</span></div>`;
      }
    }
    this._controlsEl.innerHTML = html;

    this._controlsEl.querySelectorAll(".chip").forEach((el) => {
      const key = el.dataset.key, id = el.dataset.id, def = CONTROLS[key];
      const fire = () => {
        if (this._config.haptics) haptic("light");
        if (def.kind === "badge") fireEvent(this, "hass-more-info", { entityId: id });
        else def.tap(hass, id, hass.states[id]);
      };
      el.onclick = fire;
      el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fire(); } };
    });

    const slider = this._controlsEl.querySelector(".slider");
    if (slider) this._wireSlider(slider);
  }

  _wireSlider(slider) {
    const id = slider.dataset.id;
    const track = slider.querySelector(".track");
    const fill = slider.querySelector(".fill");
    const sval = slider.querySelector(".sval");
    let lastPct = -1, sendTimer = null;
    const setFromEvent = (clientX) => {
      const r = track.getBoundingClientRect();
      let pct = clamp(((clientX - r.left) / r.width) * 100, 0, 100);
      pct = Math.round(pct / 10) * 10;                 // snap to 10 Dyson levels
      fill.style.width = pct + "%";
      sval.textContent = Math.round(pct / 10);
      if (pct !== lastPct) {
        lastPct = pct;
        if (this._config.haptics) haptic("selection", 30);
        clearTimeout(sendTimer);
        sendTimer = setTimeout(() =>
          this._hass.callService("fan", "set_percentage", { entity_id: id, percentage: pct }), 120);
      }
    };
    track.addEventListener("pointerdown", (e) => {
      e.preventDefault(); this._sliderDrag = true;
      track.setPointerCapture(e.pointerId); setFromEvent(e.clientX);
    });
    track.addEventListener("pointermove", (e) => { if (this._sliderDrag) setFromEvent(e.clientX); });
    const end = (e) => {
      if (!this._sliderDrag) return;
      this._sliderDrag = false;
      try { track.releasePointerCapture(e.pointerId); } catch (_) {}
      if (this._config.haptics) haptic("light");
    };
    track.addEventListener("pointerup", end);
    track.addEventListener("pointercancel", end);
  }
}
customElements.define("dyson-oscillation-card", DysonOscillationCard);

/* ---------- visual config editor --------------------------------------- */
class DysonOscillationCardEditor extends HTMLElement {
  setConfig(config) { this._config = config; this._render(); }
  set hass(hass) { this._hass = hass; if (this._form) this._form.hass = hass; }
  _render() {
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => ({
        name: "Titel (optioneel)",
        center_angle_entity: "Richting / center-hoek (vereist)",
        low_angle_entity: "Lage hoek — startrand (vereist)",
        high_angle_entity: "Hoge hoek — eindrand (vereist)",
        span_entity: "Spanwijdte (optioneel, voor presets)",
        show_presets: "Toon preset-knoppen",
        haptics: "Haptische feedback (telefoon)",
        features: "Bedieningsknoppen (Mushroom-stijl)",
      }[s.name] || s.name);
      this._form.addEventListener("value-changed", (e) =>
        this.dispatchEvent(new CustomEvent("config-changed", {
          detail: { config: e.detail.value }, bubbles: true, composed: true })));
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = { haptics: true, show_presets: true, features: DEFAULT_FEATURES, ...this._config };
    this._form.schema = [
      { name: "name", selector: { text: {} } },
      { name: "center_angle_entity", required: true, selector: { entity: { domain: "number" } } },
      { name: "low_angle_entity", required: true, selector: { entity: { domain: "number" } } },
      { name: "high_angle_entity", required: true, selector: { entity: { domain: "number" } } },
      { name: "span_entity", selector: { entity: { domain: "number" } } },
      { name: "show_presets", selector: { boolean: {} } },
      { name: "haptics", selector: { boolean: {} } },
      { name: "features", selector: { select: { multiple: true, mode: "list", options: [
        { value: "power", label: "Aan/uit" },
        { value: "oscillation", label: "Oscillatie aan/uit" },
        { value: "night_mode", label: "Nachtstand" },
        { value: "auto", label: "Auto-modus" },
        { value: "continuous_monitoring", label: "Continue monitoring" },
        { value: "speed", label: "Snelheid (slider)" },
        { value: "sleep_timer", label: "Slaaptimer" },
        { value: "air_quality", label: "Luchtkwaliteit" },
        { value: "filter_life", label: "Filterlevensduur" },
      ] } } },
    ];
  }
}
customElements.define("dyson-oscillation-card-editor", DysonOscillationCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "dyson-oscillation-card",
  name: "Dyson Oscillation Card",
  description: "Richt en versmal/verbreed de oscillatie van je Dyson + Mushroom-stijl bediening.",
  preview: true,
  documentationURL: "https://github.com/Dominic-070/dyson-oscillation-card",
});
console.info(`%c DYSON-OSCILLATION-CARD %c v${VERSION} `,
  "color:#fff;background:#7C5CFF;border-radius:3px 0 0 3px;padding:2px 4px;",
  "color:#7C5CFF;background:#222;border-radius:0 3px 3px 0;padding:2px 4px;");
