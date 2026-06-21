# Dyson Oscillation Card

A Home Assistant dashboard card to aim and shape the oscillation of a Dyson fan,
inspired by the MyDyson app — but with one thing the app doesn't give you:
**drag each outer edge independently** to lengthen or shorten that side, instead
of only picking a fixed preset width.

- **Drag the centre knob** to aim the direction (keeps the current width).
- **Drag the left/right edge handle** to extend or retract just that side.
- **Optional preset buttons** (45° / 90° / 180° / 350°) keep the centre and set the width.
- Full **UI editor** — no YAML required.

Built for the [`cmgrayb/hass-dyson`](https://github.com/cmgrayb/hass-dyson)
integration. No build step, no dependencies — a single JS file.

> Angles run **0–350°**. 175° points forward (toward you, at the bottom of the
> dial). The 10° dead-zone between 350° and 0° sits at the top — the back of the fan.

## How it maps to the entities

The integration treats **low** and **high** angle as the real values; **centre**
and **span** are derived. The card uses exactly one entity per gesture, so there
are no race conditions:

| Gesture | Writes to |
|---|---|
| Drag centre knob (aim) | `number.…_oscillation_center_angle` — recentres, keeps width |
| Drag left edge | `number.…_oscillation_low_angle` |
| Drag right edge | `number.…_oscillation_high_angle` |
| Preset button | `number.…_oscillation_angle_span` (if configured) |

## Install (HACS)

The old "frontend / plugin" category is now called **Dashboard** in HACS.

1. HACS → top-right menu → **Custom repositories**.
2. URL: your repo, e.g. `https://github.com/Dominic-070/dyson-oscillation-card`,
   category: **Dashboard**.
3. Find **Dyson Oscillation Card**, install. HACS adds the resource automatically.
4. Hard-refresh the browser (Ctrl/Cmd+Shift+R).

<details>
<summary>Manual install</summary>

Copy `dyson-oscillation-card.js` to `/config/www/` and add a resource:
Settings → Dashboards → ⋮ → Resources → Add
`url: /local/dyson-oscillation-card.js`, `type: JavaScript Module`.
</details>

## Add the card

Edit a dashboard → **Add card** → search **Dyson Oscillation Card**. The visual
editor lets you pick the entities. It auto-fills if your entity IDs end with the
standard suffixes.

### YAML

```yaml
type: custom:dyson-oscillation-card
name: Woonkamer Dyson            # optional
center_angle_entity: number.woonkamer_dyson_cool_pc1_oscillation_center_angle
low_angle_entity: number.woonkamer_dyson_cool_pc1_oscillation_low_angle
high_angle_entity: number.woonkamer_dyson_cool_pc1_oscillation_high_angle
span_entity: number.woonkamer_dyson_cool_pc1_oscillation_angle_span   # optional, for presets
show_presets: true              # optional, default true
presets: [45, 90, 180, 350]     # optional
```

| Option | Required | Default | Description |
|---|---|---|---|
| `center_angle_entity` | ✅ | — | Aim / direction (0–350) |
| `low_angle_entity` | ✅ | — | Lower edge (0–350) |
| `high_angle_entity` | ✅ | — | Upper edge (0–350) |
| `span_entity` | — | — | Width entity, drives the preset buttons |
| `name` | — | `Oscillatie` | Card title |
| `show_presets` | — | `true` | Show the preset row |
| `presets` | — | `[45,90,180,350]` | Preset widths |

## Theming

The accent colour follows `--primary-color`. Override per card or globally:

```yaml
card_mod:
  style: |
    ha-card { --dyson-accent: #7C5CFF; }
```

## Licence

MIT
