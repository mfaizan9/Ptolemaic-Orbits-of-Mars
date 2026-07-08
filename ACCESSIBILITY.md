# Accessibility Notes — Ptolemaic Orbit of Mars

Target: WCAG 2.1 AA (AAA where reasonable). This sim is a speed‑controlled animation; its
only interactive control is a native speed slider, plus an added Play/Pause button.

## Structure & semantics
- Single `<h1>` is rendered by the `<kl-unl-masthead>` component (the sim does not add a
  competing `h1`). Panels use `<h2 class="sr-only">` headings ("Ptolemaic model diagram",
  "About and controls") for a non‑skipping outline while keeping the clean original look.
- Landmarks: `<main class="app-shell">`, two `<section class="panel">` regions, each
  `aria-labelledby` its heading. `<html lang="en">`‑equivalent is set via the document.
- The masthead provides Reset / Help ("Review Help Guide") / About and their modal dialog,
  managing focus and Escape itself. The sim listens for the bubbling `sim-reset` event and
  restores the exact initial state; it does **not** build its own masthead/dialog/Reset.

## Text alternatives (1.1.1)
- The animated `<canvas>` has `role="img"` and `aria-describedby` pointing to a concise,
  screen‑reader description (`#diagram-desc`) of what the diagram shows: Earth at center,
  Mars on the epicycle, the epicycle center on the deferent, the looping red retrograde
  path, and the yellow mean‑Sun marker on the gray circle.
- The ClassAction logo image has `alt="ClassAction"`. The "slow"/"fast" end labels are
  decorative (`aria-hidden`) because the slider's accessible name/value already conveys the
  quantity and value.

## Color & contrast (1.4.1 / 1.4.3 / 1.4.11)
- Palette/chrome come from the KL‑UNL CSS custom properties. The diagram keeps the
  physically meaningful, historically faithful colors (blue Earth, yellow Sun, red Mars,
  gray/black construction circles). **No state is encoded by color alone** — the bodies are
  identified by name and role in `#diagram-desc` and the live region, not by hue. Body/label
  text meets ≥4.5:1 on the white background.

## Keyboard (2.1.1 / 2.1.2 / 2.4.7)
- Fully keyboard operable in a logical tab order: Play/Pause button → speed slider (both
  focusable, with the foundation's visible `:focus-visible` ring). No keyboard traps; Tab
  moves away normally. There are **no draggable canvas objects** in this sim (the original
  exposes only the slider), so no canvas keyboard‑proxy is needed.
- The speed control is a native `<input type="range">`, so it supports Left/Down (decrement),
  Right/Up (increment), PageUp/PageDown (larger step), Home/End (min/max) out of the box, and
  never "sticks". `step` = 0.0001 (the original's 4‑decimal precision).

## Timing / motion (2.2.2 / 2.3.3)
- A **Play/Pause** button controls the continuous motion; setting the slider to 0 also stops
  it. `prefers-reduced-motion: reduce` starts the sim **paused** (with a spoken hint) so no
  motion begins without user action. Nothing flashes; there is no >3‑per‑second flashing.
  The animation loop stops scheduling frames whenever it is not actively moving.

## Screen‑reader narration (NVDA + VoiceOver)
- An `aria-live="polite"` region (`#sr-status`) announces meaningful changes **on commit**
  (not per animation tick, to avoid flooding):
  - Speed change (on `change`): e.g. *"Animation speed: 0.20 Earth years per second"* or
    *"Animation speed: stopped"*.
  - Play/Pause: *"Animation playing"* / *"Animation paused"*.
  - Reset: *"Simulation reset. Animation speed: 0.20 Earth years per second"*.
- **Units are always spoken.** The slider's abstract value is exposed as a real,
  unit‑bearing quantity via `aria-valuetext` (`value × 20` = *Earth years per second*),
  and as full words ("Earth years per second", not a bare number or a symbol). An audio‑only
  user can therefore: know what the diagram depicts (`#diagram-desc`), start/stop it, and
  read the current speed with its unit.

## Zoom & responsiveness (1.4.4 / 1.4.10)
- Body type is ≥1.125rem, sized in rem/em so it tracks the browser font setting. Layout uses
  relative units and reflows without clipping at 200% zoom. The `<canvas>` keeps its original
  internal coordinates and is scaled by CSS (`max-width:100%`, `aspect-ratio:1/1`); its
  labels live in surrounding HTML (which zooms), not baked into the scaled canvas.
- Desktop/iPad shows the diagram (left) and info panel (right); phone‑portrait collapses to a
  single column in reading order. Touch targets (button, slider) meet the ≥44px minimum; no
  hover‑only affordances; pointer/touch share the native controls.

## No mathematics
This sim displays no equations, variables, or math symbols anywhere in the UI (only the
plain labels "animation speed:", "slow", "fast" and the intro sentence). MathJax is therefore
not used, and the foundation ships no MathJax include. If future edits introduce any math
symbol, it must be typeset with MathJax via `kl-unl.js` per the pipeline rules.

## Still required
Human screen‑reader QA on both **NVDA** (Windows / Chrome + Firefox) and **VoiceOver**
(macOS / Safari + Chrome) is recommended before sign‑off.
