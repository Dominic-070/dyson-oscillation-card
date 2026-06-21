## Dyson Oscillation Card v1.1.0

Bigger update: a configurable Mushroom-style control row, haptics, smarter
model detection, and a fix for the annoying edge-flip at the top of the dial.

### ✨ New
- **Mushroom-style controls** under the dial — pick exactly what you want via
  `features`: power, oscillation on/off, night mode, auto, continuous
  monitoring, a 10-level speed slider, sleep timer, air quality and filter life.
- **Haptic feedback** while aiming, resizing, tapping chips and sliding speed
  (Companion app on your phone; silent on desktop). Toggle with `haptics`.
- **Model-aware**: the fan and helper entities are detected automatically and
  any control without a matching entity is hidden, so the same card fits Cool,
  Hot+Cool and Pure models (Day0 and Day1 oscillation alike).
- **Presets via the oscillation select** when available, so the centre is
  preserved; falls back to the span number otherwise.

### 🛠 Changed
- `span_entity` auto-fills from `…_oscillation_angle_span` **or**
  `…_oscillation_angle`.
- UI editor gains a feature picker and a haptics switch.

### 🐛 Fixed
- Dragging an edge over the top dead-zone no longer jumps to the other side —
  the start edge stops at **0°**, the end edge at **350°**.

### ⬆️ Upgrading
No breaking changes. Existing cards keep working; the control row appears with a
sensible default set (power, oscillation, night mode, auto, speed) — adjust it
in the card editor or via `features:`.

**Full changelog:** https://github.com/Dominic-070/dyson-oscillation-card/blob/main/CHANGELOG.md
