# Dyson Oscillation Card

A Home Assistant dashboard card to aim and shape the oscillation of a Dyson fan,
inspired by the MyDyson app — with one thing the app doesn't give you: **drag
each outer edge independently** to lengthen or shorten that side, instead of only
picking a fixed preset width. Plus an optional **Mushroom-style control row**
(power, oscillation, night mode, auto, speed, sleep timer, air quality, filter).

Built for the [`cmgrayb/hass-dyson`](https://github.com/cmgrayb/hass-dyson)
integration. No build step, no dependencies — a single JS file.

- **Drag the centre knob** to aim the direction (keeps the current width).
- **Drag the start/end edge** to extend or retract just that side.
- Dragging an edge across the top dead-zone **stops at the boundary** (0° / 350°)
  instead of flipping to the far side; dragging one edge past the other collapses
  the width to 0° (point-aim).
- **Haptic feedback** while dragging and on taps (Companion app on your phone).
- **Preset buttons** (45/90/180/350°) use the oscillation `select` so the centre
  is preserved (falls back to the span number).
- Every extra control **auto-hides if your model doesn't expose that entity**, so
  the same card works across the Dyson line-up (Cool, Hot+Cool, Pure, etc.).
- Full **UI editor** — no YAML required.

> Angles run **0–350°**. 175° points forward (toward you, bottom of the dial).
> The 10° dead-zone between 350° and 0° sits at the top — the back of the fan.

## How it maps to the entities

`low` and `high` are the real values (osal/osau); `centre` and `span` are derived.
The card writes exactly one entity per gesture, so there are no race conditions:

| Gesture | Writes to |
|---|---|
| Drag centre knob (aim) | `number.…_oscillation_center_angle` — recentres, keeps width |
| Drag start edge | `number.…_oscillation_low_angle` |
| Drag end edge | `number.…_oscillation_high_angle` |
| Preset button | `select.…_oscillation` (or `number.…_oscillation_angle` as fallback) |

The control row resolves the fan and helper entities from the device slug shared
by the angle numbers, so you normally don't configure them by hand.

## Install (HACS)

The old "frontend / plugin" category is now called **Dashboard** in HACS.

1. HACS → top-right menu → **Custom repositories**.
2. URL: `https://github.com/Dominic-070/dyson-oscillation-card`, category **Dashboard**.
3. Find **Dyson Oscillation Card**, install. HACS adds the resource automatically.
4. Hard-refresh the browser (Ctrl/Cmd+Shift+R).

<details>
<summary>Manual install</summary>

Copy `dyson-oscillation-card.js` to `/config/www/`, then Settings → Dashboards →
⋮ → Resources → Add: `url: /local/dyson-oscillation-card.js`, type **JavaScript Module**.
</details>

## Add the card

Edit a dashboard → **Add card** → search **Dyson Oscillation Card**. The visual
editor lets you pick the angle entities and tick which control buttons to show.
Fields auto-fill when your entity IDs end with the standard suffixes.

### YAML

```yaml
type: custom:dyson-oscillation-card
name: Woonkamer Dyson
center_angle_entity: number.woonkamer_dyson_cool_pc1_oscillation_center_angle
low_angle_entity: number.woonkamer_dyson_cool_pc1_oscillation_low_angle
high_angle_entity: number.woonkamer_dyson_cool_pc1_oscillation_high_angle
span_entity: number.woonkamer_dyson_cool_pc1_oscillation_angle   # optional
show_presets: true
haptics: true
features:
  - power
  - oscillation
  - night_mode
  - auto
  - speed
  # - continuous_monitoring
  # - sleep_timer
  # - air_quality
  # - filter_life
```

### Options

| Option | Required | Default | Description |
|---|---|---|---|
| `center_angle_entity` | ✅ | — | Aim / direction (0–350) |
| `low_angle_entity` | ✅ | — | Start edge (0–350) |
| `high_angle_entity` | ✅ | — | End edge (0–350) |
| `span_entity` | — | auto | Width number, preset fallback |
| `name` | — | `Oscillatie` | Card title |
| `show_presets` | — | `true` | Show the preset row |
| `haptics` | — | `true` | Haptic feedback on phone (Companion app) |
| `features` | — | power, oscillation, night_mode, auto, speed | Control buttons to show, in order |

Available `features`: `power`, `oscillation`, `night_mode`, `auto`,
`continuous_monitoring`, `speed`, `sleep_timer`, `air_quality`, `filter_life`.
Each is skipped automatically if the matching entity doesn't exist.

### Entity overrides (advanced)

Auto-detection assumes the default hass-dyson entity IDs. Override any of them:
`fan_entity`, `night_mode_entity`, `continuous_monitoring_entity`,
`sleep_timer_entity`, `air_quality_entity`, `filter_life_entity`,
`oscillation_select_entity`.

## Theming

The accent colour follows `--primary-color`. Override per card:

```yaml
card_mod:
  style: |
    ha-card { --dyson-accent: #7C5CFF; }
```

## Licence

MIT
