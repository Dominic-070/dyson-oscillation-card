# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.3.1] - 2026-06-22

### Fixed
- Smooth fan-icon animation: the control row is built once and updated in place
  instead of being recreated on every state tick, so the icon's CSS spin no
  longer restarts. Speed changes adjust a `--fan-dur` CSS variable to retime the
  running animation without a restart (as the Mushroom fan card does).

## [1.3.0] - 2026-06-22

### Fixed
- Edge handles no longer hop across the rear dead-zone: dragging now uses a
  relative model and pins cleanly at 0° / 350°.
- Only a narrow band around the ring reacts to touch, so the empty corners and
  centre can be used to scroll the dashboard on mobile.

### Added
- Separate switches to hide the title, the angle read-out and the instruction
  text (`show_title`, `show_state`, `show_hint`).
- Double-tap the centre angle to expand a collapsed (0°) width back to a minimum
  (`min_span`, default 35°).
- Draggable speed slider (press-and-drag, 10 levels).
- Animated fan icon that spins with the speed (`animate_fan`, default on).

### Changed
- Control chips are narrower in a 4-column grid so four fit on a phone.

## [1.1.0] - 2026-06-21

### Added
- Mushroom-style control row below the dial, fully configurable via `features`:
  `power`, `oscillation`, `night_mode`, `auto`, `continuous_monitoring`,
  `speed` (10-level slider), `sleep_timer`, `air_quality`, `filter_life`.
- Haptic feedback on the oscillation dial and controls (grab, drag ticks,
  release, taps, slider) via the Companion app — toggle with `haptics`.
- Automatic entity detection for the fan and helper entities, derived from the
  device slug of the angle numbers. Any control whose entity is missing is
  hidden, so one card works across the Dyson line-up (Cool / Hot+Cool / Pure,
  Day0 and Day1 oscillation).
- Preset buttons now drive `select.…_oscillation` when present (preserves the
  centre), falling back to the span number.
- Advanced entity overrides: `fan_entity`, `night_mode_entity`,
  `continuous_monitoring_entity`, `sleep_timer_entity`, `air_quality_entity`,
  `filter_life_entity`, `oscillation_select_entity`.

### Changed
- `span_entity` now auto-fills from `…_oscillation_angle_span` **or**
  `…_oscillation_angle` (the friendly "Oscillation Angle" number).
- Editor extended with a feature multi-select and a haptics toggle.

### Fixed
- Dragging an edge across the top dead-zone no longer flips to the opposite
  side: the start edge stops at 0° and the end edge at 350°
  (continuity clamp based on the handle's current side).

## [1.0.0] - 2026-06-21

### Added
- Initial release: radial oscillation dial for the hass-dyson integration.
  Drag the centre to aim (keeps width), drag each edge to resize that side.
- Optional preset row (45 / 90 / 180 / 350°).
- Visual UI editor with entity pickers; HACS dashboard packaging.

[1.3.1]: https://github.com/Dominic-070/dyson-oscillation-card/releases/tag/v1.3.1
[1.3.0]: https://github.com/Dominic-070/dyson-oscillation-card/releases/tag/v1.3.0
[1.1.0]: https://github.com/Dominic-070/dyson-oscillation-card/releases/tag/v1.1.0
[1.0.0]: https://github.com/Dominic-070/dyson-oscillation-card/releases/tag/v1.0.0
