# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

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

[1.1.0]: https://github.com/Dominic-070/dyson-oscillation-card/releases/tag/v1.1.0
[1.0.0]: https://github.com/Dominic-070/dyson-oscillation-card/releases/tag/v1.0.0
