/**
 * Dyson Oscillation Card
 * Aim and shape the oscillation of a Dyson fan from Home Assistant, inspired by
 * the MyDyson app — drag the centre to aim, drag each edge to lengthen/shorten
 * that side, plus an optional Mushroom-style control row.
 *
 * For the hass-dyson integration (cmgrayb/hass-dyson). No build step, no deps.
 * Multilingual (en/nl/de/fr/es), follows the Home Assistant UI language.
 *
 * Angles run 0–350°. 175° points forward (toward you, bottom of the dial).
 * The 10° dead-zone (350°→0°) sits at the top — the back of the fan. Handles
 * are dragged *relatively*, so they pin to 0°/350° and never hop across the gap.
 */

const VERSION = "1.4.3";

/* ---------- geometry ---------------------------------------------------- */
const VB = 400, CX = 200, CY = 200;
const R_ARC = 150, R_FILL = 150, R_TICK_OUT = 176, R_TICK_IN = 138;
const DEG2RAD = Math.PI / 180;
const screenDeg = (d) => d - 85;
const polar = (d, r) => { const a = screenDeg(d) * DEG2RAD; return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }; };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ---------- i18n -------------------------------------------------------- */
const LANG = {
  en: {
    title: "Oscillation", dir: "direction", width: "width", off: "Off",
    hint: "Drag the centre to aim · drag an edge to adjust that side",
    c_power: "Power", c_oscillation: "Oscillation", c_night: "Night", c_auto: "Auto",
    c_monitor: "Monitor", c_speed: "Speed", c_timer: "Timer", c_air: "Air", c_filter: "Filter",
    e_name: "Title (optional)",
    e_center: "Direction / centre angle (required)",
    e_low: "Low angle — start edge (required)", e_high: "High angle — end edge (required)",
    e_span: "Width (optional, for presets + restore)",
    e_show_title: "Show title", e_show_state: "Show angle read-out (direction/width)",
    e_show_hint: "Show instruction text", e_show_presets: "Show preset buttons",
    e_haptics: "Haptic feedback (phone)", e_animate: "Animate fan icon with speed",
    e_minspan: "Min. width on double-tap (°)", e_fanicon: "Centre icon style",
    e_features: "Control buttons (Mushroom style)",
    o_power: "Power", o_oscillation: "Oscillation on/off", o_night: "Night mode", o_auto: "Auto mode",
    o_monitor: "Continuous monitoring", o_speed: "Speed (slider)", o_timer: "Sleep timer",
    o_air: "Air quality", o_filter: "Filter life",
    i_tower: "Tower (elongated)", i_oval: "Oval (round fan)",
  },
  nl: {
    title: "Oscillatie", dir: "richting", width: "breedte", off: "Uit",
    hint: "Sleep het midden om te richten · sleep een rand om die kant bij te stellen",
    c_power: "Aan/uit", c_oscillation: "Oscillatie", c_night: "Nacht", c_auto: "Auto",
    c_monitor: "Monitor", c_speed: "Snelheid", c_timer: "Timer", c_air: "Lucht", c_filter: "Filter",
    e_name: "Titel (optioneel)",
    e_center: "Richting / center-hoek (vereist)",
    e_low: "Lage hoek — startrand (vereist)", e_high: "Hoge hoek — eindrand (vereist)",
    e_span: "Spanwijdte (optioneel, voor presets + herstel)",
    e_show_title: "Toon titel", e_show_state: "Toon hoek-waarden (richting/breedte)",
    e_show_hint: "Toon instructietekst", e_show_presets: "Toon preset-knoppen",
    e_haptics: "Haptische feedback (telefoon)", e_animate: "Animeer fan-icoon op snelheid",
    e_minspan: "Min. breedte bij dubbeltik (°)", e_fanicon: "Stijl van het middenicoon",
    e_features: "Bedieningsknoppen (Mushroom-stijl)",
    o_power: "Aan/uit", o_oscillation: "Oscillatie aan/uit", o_night: "Nachtstand", o_auto: "Auto-modus",
    o_monitor: "Continue monitoring", o_speed: "Snelheid (slider)", o_timer: "Slaaptimer",
    o_air: "Luchtkwaliteit", o_filter: "Filterlevensduur",
    i_tower: "Toren (langwerpig)", i_oval: "Ovaal (ronde ventilator)",
  },
  de: {
    title: "Oszillation", dir: "Richtung", width: "Breite", off: "Aus",
    hint: "Mitte ziehen zum Ausrichten · Rand ziehen, um diese Seite anzupassen",
    c_power: "Ein/Aus", c_oscillation: "Oszillation", c_night: "Nacht", c_auto: "Auto",
    c_monitor: "Monitor", c_speed: "Geschw.", c_timer: "Timer", c_air: "Luft", c_filter: "Filter",
    e_name: "Titel (optional)",
    e_center: "Richtung / Mittelwinkel (erforderlich)",
    e_low: "Niedriger Winkel — Startkante (erforderlich)", e_high: "Hoher Winkel — Endkante (erforderlich)",
    e_span: "Breite (optional, für Presets + Wiederherstellung)",
    e_show_title: "Titel anzeigen", e_show_state: "Winkelanzeige zeigen (Richtung/Breite)",
    e_show_hint: "Hinweistext anzeigen", e_show_presets: "Preset-Tasten anzeigen",
    e_haptics: "Haptisches Feedback (Telefon)", e_animate: "Lüftersymbol mit Geschwindigkeit animieren",
    e_minspan: "Min. Breite bei Doppeltipp (°)", e_fanicon: "Stil des Mittelsymbols",
    e_features: "Bedientasten (Mushroom-Stil)",
    o_power: "Ein/Aus", o_oscillation: "Oszillation an/aus", o_night: "Nachtmodus", o_auto: "Auto-Modus",
    o_monitor: "Dauerüberwachung", o_speed: "Geschwindigkeit (Regler)", o_timer: "Sleep-Timer",
    o_air: "Luftqualität", o_filter: "Filterlebensdauer",
    i_tower: "Turm (länglich)", i_oval: "Oval (runder Ventilator)",
  },
  fr: {
    title: "Oscillation", dir: "direction", width: "largeur", off: "Arrêt",
    hint: "Faites glisser le centre pour orienter · un bord pour ajuster ce côté",
    c_power: "Marche", c_oscillation: "Oscillation", c_night: "Nuit", c_auto: "Auto",
    c_monitor: "Suivi", c_speed: "Vitesse", c_timer: "Minut.", c_air: "Air", c_filter: "Filtre",
    e_name: "Titre (optionnel)",
    e_center: "Direction / angle central (requis)",
    e_low: "Angle bas — bord de début (requis)", e_high: "Angle haut — bord de fin (requis)",
    e_span: "Largeur (optionnel, pour préréglages + restauration)",
    e_show_title: "Afficher le titre", e_show_state: "Afficher l'angle (direction/largeur)",
    e_show_hint: "Afficher le texte d'aide", e_show_presets: "Afficher les préréglages",
    e_haptics: "Retour haptique (téléphone)", e_animate: "Animer l'icône du ventilateur selon la vitesse",
    e_minspan: "Largeur min. au double-tap (°)", e_fanicon: "Style de l'icône centrale",
    e_features: "Boutons de commande (style Mushroom)",
    o_power: "Marche/Arrêt", o_oscillation: "Oscillation on/off", o_night: "Mode nuit", o_auto: "Mode auto",
    o_monitor: "Surveillance continue", o_speed: "Vitesse (curseur)", o_timer: "Minuterie",
    o_air: "Qualité de l'air", o_filter: "Durée de vie du filtre",
    i_tower: "Tour (allongée)", i_oval: "Ovale (ventilateur rond)",
  },
  es: {
    title: "Oscilación", dir: "dirección", width: "anchura", off: "Apagado",
    hint: "Arrastra el centro para orientar · arrastra un borde para ajustar ese lado",
    c_power: "Encendido", c_oscillation: "Oscilación", c_night: "Noche", c_auto: "Auto",
    c_monitor: "Monitor", c_speed: "Velocidad", c_timer: "Temporiz.", c_air: "Aire", c_filter: "Filtro",
    e_name: "Título (opcional)",
    e_center: "Dirección / ángulo central (obligatorio)",
    e_low: "Ángulo bajo — borde inicial (obligatorio)", e_high: "Ángulo alto — borde final (obligatorio)",
    e_span: "Anchura (opcional, para preajustes + restaurar)",
    e_show_title: "Mostrar título", e_show_state: "Mostrar ángulos (dirección/anchura)",
    e_show_hint: "Mostrar texto de ayuda", e_show_presets: "Mostrar botones de preajuste",
    e_haptics: "Respuesta háptica (teléfono)", e_animate: "Animar el icono del ventilador con la velocidad",
    e_minspan: "Anchura mín. al doble toque (°)", e_fanicon: "Estilo del icono central",
    e_features: "Botones de control (estilo Mushroom)",
    o_power: "Encendido/Apagado", o_oscillation: "Oscilación on/off", o_night: "Modo noche", o_auto: "Modo auto",
    o_monitor: "Monitoreo continuo", o_speed: "Velocidad (deslizador)", o_timer: "Temporizador",
    o_air: "Calidad del aire", o_filter: "Vida del filtro",
    i_tower: "Torre (alargada)", i_oval: "Óvalo (ventilador redondo)",
  },
};
const langOf = (hass) => {
  const raw = (hass && (hass.locale && hass.locale.language || hass.language)) || "en";
  const l = String(raw).split("-")[0].toLowerCase();
  return LANG[l] ? l : "en";
};
const tr = (lang, key) => (LANG[lang] && LANG[lang][key]) || LANG.en[key] || key;

/* ---------- helpers ----------------------------------------------------- */
function fireEvent(node, type, detail) {
  const ev = new Event(type, { bubbles: true, cancelable: false, composed: true });
  ev.detail = detail === undefined ? {} : detail;
  node.dispatchEvent(ev);
  return ev;
}
let _lastHaptic = 0;
function haptic(type, minGap = 0) {
  const now = Date.now();
  if (now - _lastHaptic < minGap) return;
  _lastHaptic = now;
  fireEvent(window, "haptic", type);
}

/* ---------- Mushroom-style control catalogue ---------------------------- */
const CONTROLS = {
  power: { lkey: "c_power", okey: "o_power", icon: "mdi:power", kind: "toggle",
    entity: (m) => m.fan, active: (s) => s && s.state === "on",
    tap: (hass, id) => hass.callService("homeassistant", "toggle", { entity_id: id }) },
  oscillation: { lkey: "c_oscillation", okey: "o_oscillation", icon: "mdi:arrow-left-right", kind: "toggle",
    entity: (m) => m.fan, active: (s) => !!(s && s.attributes && s.attributes.oscillating),
    tap: (hass, id, s) => hass.callService("fan", "oscillate", { entity_id: id, oscillating: !(s && s.attributes && s.attributes.oscillating) }) },
  night_mode: { lkey: "c_night", okey: "o_night", icon: "mdi:weather-night", kind: "toggle",
    entity: (m) => m.night_mode, active: (s) => s && s.state === "on",
    tap: (hass, id) => hass.callService("homeassistant", "toggle", { entity_id: id }) },
  auto: { lkey: "c_auto", okey: "o_auto", icon: "mdi:fan-auto", kind: "toggle",
    entity: (m) => m.fan, active: (s) => !!(s && s.attributes && s.attributes.preset_mode === "auto"),
    tap: (hass, id, s) => hass.callService("fan", "set_preset_mode", { entity_id: id, preset_mode: s && s.attributes && s.attributes.preset_mode === "auto" ? "manual" : "auto" }) },
  continuous_monitoring: { lkey: "c_monitor", okey: "o_monitor", icon: "mdi:eye", kind: "toggle",
    entity: (m) => m.continuous_monitoring, active: (s) => s && s.state === "on",
    tap: (hass, id) => hass.callService("homeassistant", "toggle", { entity_id: id }) },
  speed: { lkey: "c_speed", okey: "o_speed", icon: "mdi:fan", kind: "slider", entity: (m) => m.fan },
  sleep_timer: { lkey: "c_timer", okey: "o_timer", icon: "mdi:timer-outline", kind: "badge",
    entity: (m) => m.sleep_timer,
    text: (s, t) => { const v = parseFloat(s.state); return Number.isFinite(v) && v > 0 ? `${Math.round(v)}m` : t("off"); } },
  air_quality: { lkey: "c_air", okey: "o_air", icon: "mdi:air-filter", kind: "badge",
    entity: (m) => m.air_quality, text: (s) => s.state },
  filter_life: { lkey: "c_filter", okey: "o_filter", icon: "mdi:air-purifier", kind: "badge",
    entity: (m) => m.filter_life,
    text: (s) => { const v = parseFloat(s.state); return Number.isFinite(v) ? `${Math.round(v)}%` : s.state; } },
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
    this._sliderDrag = false; this._lang = "en";
  }

  _t(key) { return tr(this._lang, key); }

  static getStubConfig(hass) {
    const find = (suffix) => Object.keys(hass.states).find((e) => e.startsWith("number.") && e.endsWith(suffix));
    return {
      type: "custom:dyson-oscillation-card",
      center_angle_entity: find("_oscillation_center_angle") || "",
      low_angle_entity: find("_oscillation_low_angle") || "",
      high_angle_entity: find("_oscillation_high_angle") || "",
      span_entity: find("_oscillation_angle_span") || find("_oscillation_angle") || "",
      show_presets: true, features: [...DEFAULT_FEATURES],
    };
  }

  static getConfigElement() { return document.createElement("dyson-oscillation-card-editor"); }

  setConfig(config) {
    if (!config.center_angle_entity || !config.low_angle_entity || !config.high_angle_entity)
      throw new Error("Set center_angle_entity, low_angle_entity and high_angle_entity.");
    this._config = {
      show_presets: true, show_hint: true, show_title: true, show_state: true,
      haptics: true, animate_fan: true, min_span: 35, fan_icon: "tower",
      presets: [45, 90, 180, 350], features: [...DEFAULT_FEATURES],
      ...config,
    };
    this._map = this._deriveEntities(this._config);
    this._built = false;
  }

  _deriveEntities(cfg) {
    const m = {};
    const slug = cfg.center_angle_entity.replace(/^number\./, "").replace(/_oscillation_center_angle$/, "");
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

  set hass(hass) {
    this._hass = hass;
    this._lang = langOf(hass);
    if (!this._built) this._build();
    if (this._dragging || this._sliderDrag) return;
    const num = (id, fb) => { const s = hass.states[id]; const v = s ? parseFloat(s.state) : NaN; return Number.isFinite(v) ? v : fb; };
    this._low = clamp(num(this._config.low_angle_entity, 0), 0, 350);
    this._high = clamp(num(this._config.high_angle_entity, 350), 0, 350);
    if (this._high < this._low) [this._low, this._high] = [this._high, this._low];
    this._center = clamp(num(this._config.center_angle_entity, (this._low + this._high) / 2), 0, 350);
    const cs = hass.states[this._config.center_angle_entity];
    this._available = !!(cs && cs.state !== "unavailable");
    this._render();
  }

  _build() {
    this._built = true;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        ha-card { padding:16px; overflow:hidden;
          --acc: var(--dyson-accent, var(--primary-color, #7C5CFF));
          --acc-soft: color-mix(in srgb, var(--acc) 26%, transparent);
          --chip-bg: var(--card-background-color, #1c1c1c); }
        @keyframes dyson-spin { from { transform:rotate(0deg);} to { transform:rotate(360deg);} }
        .head { display:flex; align-items:baseline; justify-content:space-between; margin:0 4px 4px; min-height:1px; }
        .title { font-size:1.05rem; font-weight:600; color:var(--primary-text-color); }
        .readout { font-variant-numeric:tabular-nums; font-size:.82rem; color:var(--secondary-text-color); }
        .readout b { color:var(--primary-text-color); font-weight:600; }
        .stage { width:100%; max-width:380px; margin:0 auto; }
        svg { width:100%; height:auto; display:block; pointer-events:none; touch-action:auto; }
        #hitlayer circle { fill:transparent; pointer-events:all; touch-action:none; cursor:grab; }
        .tick { stroke:var(--divider-color,#444); stroke-width:2.4; stroke-linecap:round; }
        .tick.on { stroke:var(--acc); }
        .wedge { fill:var(--acc-soft); }
        .edge { stroke:var(--acc); stroke-width:5; fill:none; stroke-linecap:round; }
        .handle { fill:var(--chip-bg); stroke:var(--acc); stroke-width:4; }
        .handle.center { stroke-width:5; }
        .hlabel { fill:var(--primary-text-color); font-size:15px; font-weight:600; text-anchor:middle;
          dominant-baseline:central; font-variant-numeric:tabular-nums; }
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
        .off { opacity:.45; }
        #hitlayer.off circle { pointer-events:none; }
        /* idle: lets touches through; during a drag: full no-scroll capture surface */
        #dragcatch { pointer-events:none; touch-action:none; }
        #dragcatch.active { pointer-events:all; cursor:grabbing; }
        .controls { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:14px; }
        .chip { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;
          padding:9px 3px; border-radius:14px; background:var(--chip-bg);
          border:1px solid var(--divider-color,#333); cursor:pointer; transition:.15s; min-width:0; }
        .chip:hover { border-color:var(--acc); }
        .chip ha-icon { --mdc-icon-size:22px; color:var(--primary-text-color); }
        .chip .clabel { font-size:.64rem; color:var(--secondary-text-color); text-align:center; line-height:1.05;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
        .chip.on { background:var(--acc); border-color:var(--acc); }
        .chip.on ha-icon, .chip.on .clabel { color:#fff; }
        .chip.badge .cval { font-size:.8rem; font-weight:600; color:var(--primary-text-color); }
        .slider { grid-column:1 / -1; display:flex; align-items:center; gap:12px; padding:10px 14px;
          border-radius:18px; background:var(--chip-bg); border:1px solid var(--divider-color,#333); }
        .slider ha-icon { --mdc-icon-size:24px; color:var(--primary-text-color); flex:0 0 auto; transform-origin:50% 50%; }
        .track { position:relative; flex:1 1 auto; height:34px; border-radius:12px;
          background:var(--divider-color,#3a3a3a); cursor:pointer; touch-action:none; overflow:hidden; }
        .fill { position:absolute; left:0; top:0; bottom:0; border-radius:12px; background:var(--acc); min-width:12px; }
        .thumb { position:absolute; top:50%; width:5px; height:22px; border-radius:3px; background:#fff;
          transform:translate(-50%,-50%); box-shadow:0 0 5px rgba(0,0,0,.45); pointer-events:none; }
        .sval { flex:0 0 auto; min-width:1.4em; text-align:right; font-weight:600;
          font-variant-numeric:tabular-nums; color:var(--primary-text-color); }
      </style>
      <ha-card>
        <div class="head"><span class="title"></span><span class="readout"></span></div>
        <div class="stage"><svg viewBox="0 0 ${VB} ${VB}" id="svg">
          <g id="content"></g>
          <g id="hitlayer">
            <circle id="hit-low" r="48"/>
            <circle id="hit-high" r="48"/>
            <circle id="hit-center" r="54"/>
          </g>
          <rect id="dragcatch" x="0" y="0" width="${VB}" height="${VB}" fill="transparent"/>
        </svg></div>
        <div class="hint"></div>
        <div class="presets"></div>
        <div class="controls"></div>
      </ha-card>`;
    this._svg = this.shadowRoot.getElementById("svg");
    this._content = this.shadowRoot.getElementById("content");
    this._hitLayer = this.shadowRoot.getElementById("hitlayer");
    this._hitEls = {
      low: this.shadowRoot.getElementById("hit-low"),
      high: this.shadowRoot.getElementById("hit-high"),
      center: this.shadowRoot.getElementById("hit-center"),
    };
    this._dragCatch = this.shadowRoot.getElementById("dragcatch");
    this._headEl = this.shadowRoot.querySelector(".head");
    this._titleEl = this.shadowRoot.querySelector(".title");
    this._readoutEl = this.shadowRoot.querySelector(".readout");
    this._hintEl = this.shadowRoot.querySelector(".hint");
    this._presetsEl = this.shadowRoot.querySelector(".presets");
    this._controlsEl = this.shadowRoot.querySelector(".controls");
    this._ctrlSig = "";
    // Start a drag only on the three handle zones; everything else scrolls.
    for (const el of Object.values(this._hitEls))
      el.addEventListener("pointerdown", (e) => this._onDown(e));
    // Once dragging, the full-area catch surface (touch-action:none) owns the
    // pointer, so the drag keeps working off the ring without the page scrolling.
    this._dragCatch.addEventListener("pointermove", (e) => this._onMove(e));
    this._dragCatch.addEventListener("pointerup", (e) => this._onUp(e));
    this._dragCatch.addEventListener("pointercancel", (e) => this._onUp(e));
    // Mobile browsers ignore touch-action on SVG sub-elements, so block the page
    // scroll directly: a non-passive touchmove that preventDefaults while dragging.
    // (Empty-space touches don't drag, so they still scroll.)
    this._stage = this.shadowRoot.querySelector(".stage");
    this._stage.addEventListener("touchmove", (e) => { if (this._dragging) e.preventDefault(); }, { passive: false });
  }

  /* ---- coordinate helpers ---- */
  _screenAngle(clientX, clientY) {
    const r = this._svg.getBoundingClientRect();
    const sx = ((clientX - r.left) / r.width) * VB, sy = ((clientY - r.top) / r.height) * VB;
    return Math.atan2(sy - CY, sx - CX) / DEG2RAD;
  }
  _pickHandle(clientX, clientY) {
    const r = this._svg.getBoundingClientRect();
    const sx = ((clientX - r.left) / r.width) * VB, sy = ((clientY - r.top) / r.height) * VB;
    const dist = (d) => { const p = polar(d, R_ARC); return Math.hypot(p.x - sx, p.y - sy); };
    const c = [["center", dist(this._center)], ["low", dist(this._low)], ["high", dist(this._high)]].sort((a, b) => a[1] - b[1]);
    return c[0][0];
  }

  /* ---- relative drag ---- */
  _onDown(e) {
    if (!this._available) return;
    const handle = this._pickHandle(e.clientX, e.clientY);
    const now = Date.now();
    const dbl = handle === "center" && now - (this._lastTap || 0) < 320;
    this._lastTap = now;
    if (dbl && (this._high - this._low) < (this._config.min_span || 35)) {
      e.preventDefault(); this._restoreSpan(this._config.min_span || 35); return;
    }
    e.preventDefault();
    this._dragging = handle;
    // hand the pointer to the full-area catch surface so the drag survives
    // leaving the small grab zone (the cause of scroll-instead-of-drag on mobile)
    this._dragCatch.classList.add("active");
    try { this._dragCatch.setPointerCapture(e.pointerId); } catch (_) {}
    this._dragPrevAngle = this._screenAngle(e.clientX, e.clientY);
    this._dragValue = handle === "low" ? this._low : handle === "high" ? this._high : this._center;
    this._hapticValue = this._dragValue;
    if (this._config.haptics) haptic("selection");
  }

  _onMove(e) {
    if (!this._dragging) return;
    e.preventDefault();
    const a = this._screenAngle(e.clientX, e.clientY);
    const delta = ((a - this._dragPrevAngle + 540) % 360) - 180;
    this._dragPrevAngle = a;
    let lo, hi;
    if (this._dragging === "low") { lo = 0; hi = this._high; }
    else if (this._dragging === "high") { lo = this._low; hi = 350; }
    else { const half = Math.floor((this._high - this._low) / 2); lo = half; hi = 350 - half; }
    const v = clamp(this._dragValue + delta, lo, hi);
    this._dragValue = v;
    if (this._dragging === "low") {
      this._low = Math.round(v); this._center = (this._low + this._high) / 2;
      this._queue(this._config.low_angle_entity, this._low);
    } else if (this._dragging === "high") {
      this._high = Math.round(v); this._center = (this._low + this._high) / 2;
      this._queue(this._config.high_angle_entity, this._high);
    } else { this._applyCenter(Math.round(v)); }
    if (this._config.haptics && Math.abs(v - this._hapticValue) >= 4) { haptic("selection", 30); this._hapticValue = v; }
    this._render();
  }

  _onUp(e) {
    if (!this._dragging) return;
    try { this._dragCatch.releasePointerCapture(e.pointerId); } catch (_) {}
    this._dragCatch.classList.remove("active");
    this._dragging = null;
    if (this._config.haptics) haptic("light");
    this._flush(); this._render();
  }

  _applyCenter(c) {
    c = clamp(Math.round(c), 0, 350);
    const span = this._high - this._low, half = Math.floor(span / 2);
    let lo = Math.max(0, c - half), hi = Math.min(350, c + half);
    if (lo === 0) hi = Math.min(350, span); else if (hi === 350) lo = Math.max(0, 350 - span);
    this._low = lo; this._high = hi; this._center = (lo + hi) / 2;
    this._queue(this._config.center_angle_entity, c);
  }

  _restoreSpan(deg) {
    const c = Math.round(this._center);
    let lo = clamp(c - Math.floor(deg / 2), 0, 350);
    let hi = clamp(lo + deg, 0, 350);
    if (hi - lo < deg) lo = clamp(hi - deg, 0, 350);
    this._low = lo; this._high = hi; this._center = (lo + hi) / 2;
    if (this._config.haptics) haptic("medium");
    if (this._config.span_entity && this._hass.states[this._config.span_entity]) {
      this._hass.callService("number", "set_value", { entity_id: this._config.span_entity, value: hi - lo });
    } else {
      this._hass.callService("number", "set_value", { entity_id: this._config.high_angle_entity, value: hi });
      setTimeout(() => this._hass.callService("number", "set_value", { entity_id: this._config.low_angle_entity, value: lo }), 350);
    }
    this._render();
  }

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
    for (const [entity_id, value] of entries) this._hass.callService("number", "set_value", { entity_id, value });
  }

  _setPreset(deg) {
    if (this._config.haptics) haptic("medium");
    const sel = this._map.oscillation_select;
    if (sel && this._hass.states[sel]) { this._hass.callService("select", "select_option", { entity_id: sel, option: `${deg}°` }); return; }
    if (this._config.span_entity && this._hass.states[this._config.span_entity]) { this._hass.callService("number", "set_value", { entity_id: this._config.span_entity, value: deg }); return; }
    const c = this._center, half = deg / 2;
    let lo = clamp(Math.round(c - half), 0, 350), hi = clamp(Math.round(c + half), 0, 350);
    if (lo === 0) hi = Math.min(350, deg); if (hi === 350) lo = Math.max(0, 350 - deg);
    this._hass.callService("number", "set_value", { entity_id: this._config.high_angle_entity, value: hi });
    setTimeout(() => this._hass.callService("number", "set_value", { entity_id: this._config.low_angle_entity, value: lo }), 350);
  }

  _fanGlyph() {
    if ((this._config.fan_icon || "tower") === "oval") {
      return `<ellipse class="fan-ring" cx="${CX}" cy="${CY}" rx="34" ry="44" stroke-width="9"/>
        <rect class="fan" x="${CX - 13}" y="${CY + 30}" width="26" height="34" rx="7"/>`;
    }
    // tower: tall Air Multiplier loop (stadium ring) + neck + cylindrical base
    return `<rect class="fan-ring" x="${CX - 17}" y="104" width="34" height="150" rx="17" stroke-width="7"/>
      <rect class="fan" x="${CX - 7}" y="248" width="14" height="16" rx="3"/>
      <rect class="fan" x="${CX - 30}" y="262" width="60" height="40" rx="16"/>`;
  }

  /* ---- render ---- */
  _render() {
    if (!this._built) return;
    const lo = this._low, hi = this._high, c = this._center, span = Math.round(hi - lo);
    const showTitle = this._config.show_title !== false, showState = this._config.show_state !== false;
    this._titleEl.style.display = showTitle ? "" : "none";
    this._titleEl.textContent = this._config.name || this._t("title");
    this._readoutEl.style.display = showState ? "" : "none";
    this._readoutEl.innerHTML = `${this._t("dir")} <b>${Math.round(c)}°</b> · ${this._t("width")} <b>${span}°</b>`;
    this._headEl.style.display = (showTitle || showState) ? "" : "none";
    this._hintEl.style.display = this._config.show_hint !== false ? "" : "none";
    this._hintEl.textContent = this._t("hint");

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
    const lp = polar(lo, R_ARC), hp = polar(hi, R_ARC);
    const handles = `
      <circle class="handle" cx="${lp.x.toFixed(1)}" cy="${lp.y.toFixed(1)}" r="15"/>
      <circle class="handle" cx="${hp.x.toFixed(1)}" cy="${hp.y.toFixed(1)}" r="15"/>
      <circle class="handle center" cx="${cp.x.toFixed(1)}" cy="${cp.y.toFixed(1)}" r="22"/>
      <text class="hlabel" x="${cp.x.toFixed(1)}" y="${cp.y.toFixed(1)}">${Math.round(c)}</text>`;
    this._content.innerHTML = ticks + wedge + aim + this._fanGlyph() + edge + handles;
    this._content.classList.toggle("off", !this._available);
    // keep the (persistent) grab zones on top of the handles, unless dragging
    if (!this._dragging) {
      this._hitEls.low.setAttribute("cx", lp.x.toFixed(1)); this._hitEls.low.setAttribute("cy", lp.y.toFixed(1));
      this._hitEls.high.setAttribute("cx", hp.x.toFixed(1)); this._hitEls.high.setAttribute("cy", hp.y.toFixed(1));
      this._hitEls.center.setAttribute("cx", cp.x.toFixed(1)); this._hitEls.center.setAttribute("cy", cp.y.toFixed(1));
    }
    this._hitLayer.classList.toggle("off", !this._available);

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
    this._presetsEl.querySelectorAll(".preset").forEach((b) => b.onclick = () => this._setPreset(parseInt(b.dataset.p, 10)));
  }

  _renderControls() {
    const hass = this._hass, visible = [];
    for (const key of (this._config.features || [])) {
      const def = CONTROLS[key]; if (!def) continue;
      const id = def.entity(this._map); const st = id && hass.states[id];
      if (st) visible.push({ key, def, id });
    }
    const sig = this._lang + "|" + visible.map((v) => v.key).join(",");
    if (sig !== this._ctrlSig) { this._buildControls(visible); this._ctrlSig = sig; }
    this._updateControls(visible);
  }

  _buildControls(visible) {
    this._controlsEl.innerHTML = "";
    this._ctrlEls = {};
    for (const { key, def, id } of visible) {
      if (def.kind === "slider") {
        const el = document.createElement("div");
        el.className = "slider";
        el.innerHTML = `<ha-icon icon="${def.icon}"></ha-icon>
          <div class="track"><div class="fill"></div><div class="thumb"></div></div><span class="sval"></span>`;
        this._controlsEl.appendChild(el);
        const refs = { kind: "slider", root: el, def, id, icon: el.querySelector("ha-icon"),
          track: el.querySelector(".track"), fill: el.querySelector(".fill"),
          thumb: el.querySelector(".thumb"), sval: el.querySelector(".sval"), spinning: false, dur: null };
        this._ctrlEls[key] = refs; this._wireSlider(refs);
      } else {
        const el = document.createElement("div");
        el.className = def.kind === "badge" ? "chip badge" : "chip";
        el.setAttribute("role", "button"); el.tabIndex = 0;
        const label = this._t(def.lkey);
        el.innerHTML = def.kind === "badge"
          ? `<ha-icon icon="${def.icon}"></ha-icon><span class="cval"></span><span class="clabel">${label}</span>`
          : `<ha-icon icon="${def.icon}"></ha-icon><span class="clabel">${label}</span>`;
        const fire = () => {
          if (this._config.haptics) haptic("light");
          if (def.kind === "badge") fireEvent(this, "hass-more-info", { entityId: id });
          else def.tap(this._hass, id, this._hass.states[id]);
        };
        el.onclick = fire;
        el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fire(); } };
        this._controlsEl.appendChild(el);
        this._ctrlEls[key] = { kind: def.kind, root: el, def, id, val: el.querySelector(".cval") };
      }
    }
  }

  _updateControls(visible) {
    const t = (k) => this._t(k);
    for (const { key, def, id } of visible) {
      const refs = this._ctrlEls[key]; if (!refs) continue;
      const st = this._hass.states[id]; if (!st) continue;
      if (refs.kind === "toggle") refs.root.classList.toggle("on", def.active(st));
      else if (refs.kind === "badge") refs.val.textContent = def.text(st, t);
      else if (refs.kind === "slider" && !this._sliderDrag) {
        const pct = clamp(parseFloat(st.attributes.percentage) || 0, 0, 100);
        refs.fill.style.width = pct + "%"; refs.thumb.style.left = pct + "%";
        refs.sval.textContent = Math.round(pct / 10);
        this._applyFanSpin(refs, st.state === "on" ? pct : 0);
      }
    }
  }

  _applyFanSpin(refs, pct) {
    const spin = this._config.animate_fan !== false && pct > 0;
    if (!spin) { if (refs.spinning) { refs.icon.style.animation = ""; refs.spinning = false; refs.dur = null; } return; }
    const dur = Math.max(0.4, 2.4 - (pct / 100) * 1.9).toFixed(2) + "s";
    if (!refs.spinning) {
      refs.icon.style.setProperty("--fan-dur", dur);
      refs.icon.style.animation = "dyson-spin var(--fan-dur,2s) linear infinite";
      refs.spinning = true; refs.dur = dur;
    } else if (dur !== refs.dur) { refs.icon.style.setProperty("--fan-dur", dur); refs.dur = dur; }
  }

  _wireSlider(refs) {
    const { track, fill, thumb, sval, id } = refs;
    let lastPct = -1, sendTimer = null;
    const apply = (clientX) => {
      const r = track.getBoundingClientRect();
      let pct = clamp(((clientX - r.left) / r.width) * 100, 0, 100);
      pct = Math.round(pct / 10) * 10;
      fill.style.width = pct + "%"; thumb.style.left = pct + "%"; sval.textContent = Math.round(pct / 10);
      if (pct !== lastPct) {
        lastPct = pct;
        if (this._config.haptics) haptic("selection", 30);
        this._applyFanSpin(refs, pct);
        clearTimeout(sendTimer);
        sendTimer = setTimeout(() => this._hass.callService("fan", "set_percentage", { entity_id: id, percentage: pct }), 120);
      }
    };
    track.addEventListener("pointerdown", (e) => { e.preventDefault(); this._sliderDrag = true; track.setPointerCapture(e.pointerId); apply(e.clientX); });
    track.addEventListener("pointermove", (e) => { if (this._sliderDrag) apply(e.clientX); });
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
  set hass(hass) { this._hass = hass; this._lang = langOf(hass); if (this._form) { this._form.hass = hass; this._render(); } }
  _render() {
    const t = (k) => tr(this._lang || "en", k);
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.addEventListener("value-changed", (e) =>
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: e.detail.value }, bubbles: true, composed: true })));
      this.appendChild(this._form);
    }
    this._form.computeLabel = (s) => ({
      name: t("e_name"), center_angle_entity: t("e_center"), low_angle_entity: t("e_low"),
      high_angle_entity: t("e_high"), span_entity: t("e_span"), show_title: t("e_show_title"),
      show_state: t("e_show_state"), show_hint: t("e_show_hint"), show_presets: t("e_show_presets"),
      haptics: t("e_haptics"), animate_fan: t("e_animate"), min_span: t("e_minspan"),
      fan_icon: t("e_fanicon"), features: t("e_features"),
    }[s.name] || s.name);
    this._form.hass = this._hass;
    this._form.data = {
      show_title: true, show_state: true, show_hint: true, show_presets: true,
      haptics: true, animate_fan: true, min_span: 35, fan_icon: "tower", features: DEFAULT_FEATURES, ...this._config,
    };
    this._form.schema = [
      { name: "name", selector: { text: {} } },
      { name: "center_angle_entity", required: true, selector: { entity: { domain: "number" } } },
      { name: "low_angle_entity", required: true, selector: { entity: { domain: "number" } } },
      { name: "high_angle_entity", required: true, selector: { entity: { domain: "number" } } },
      { name: "span_entity", selector: { entity: { domain: "number" } } },
      { name: "fan_icon", selector: { select: { mode: "dropdown", options: [
        { value: "tower", label: t("i_tower") }, { value: "oval", label: t("i_oval") } ] } } },
      { name: "show_title", selector: { boolean: {} } },
      { name: "show_state", selector: { boolean: {} } },
      { name: "show_hint", selector: { boolean: {} } },
      { name: "show_presets", selector: { boolean: {} } },
      { name: "haptics", selector: { boolean: {} } },
      { name: "animate_fan", selector: { boolean: {} } },
      { name: "min_span", selector: { number: { min: 5, max: 175, step: 5, mode: "box", unit_of_measurement: "°" } } },
      { name: "features", selector: { select: { multiple: true, mode: "list", options: [
        { value: "power", label: t("o_power") }, { value: "oscillation", label: t("o_oscillation") },
        { value: "night_mode", label: t("o_night") }, { value: "auto", label: t("o_auto") },
        { value: "continuous_monitoring", label: t("o_monitor") }, { value: "speed", label: t("o_speed") },
        { value: "sleep_timer", label: t("o_timer") }, { value: "air_quality", label: t("o_air") },
        { value: "filter_life", label: t("o_filter") } ] } } },
    ];
  }
}
customElements.define("dyson-oscillation-card-editor", DysonOscillationCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "dyson-oscillation-card",
  name: "Dyson Oscillation Card",
  description: "Aim and resize your Dyson's oscillation, with a Mushroom-style control row.",
  preview: true,
  documentationURL: "https://github.com/Dominic-070/dyson-oscillation-card",
});
console.info(`%c DYSON-OSCILLATION-CARD %c v${VERSION} `,
  "color:#fff;background:#7C5CFF;border-radius:3px 0 0 3px;padding:2px 4px;",
  "color:#7C5CFF;background:#222;border-radius:0 3px 3px 0;padding:2px 4px;");
