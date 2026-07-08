# Conversion Notes — Ptolemaic Orbit of Mars

## Behavior model (one paragraph)

This is a non‑interactive **animation** of Ptolemy's Earth‑centered (geocentric) model
for the orbit of Mars, with a single control: an animation‑speed slider. Earth sits fixed
at the center. Mars rides a small circle (the **epicycle**) whose center rides a larger
circle (the **deferent**). The deferent is **eccentric** (its center is offset from Earth)
and the epicycle center moves at a uniform angular rate **as seen from the equant point**
(offset from Earth by twice the eccentricity along the apse line) — the classic Ptolemaic
equant construction. The epicycle turns once per Earth year (tied to the Sun's motion),
while the deferent completes a revolution in Mars's sidereal period (1.881 yr). Combining
the two motions traces the looping red path that reproduces Mars's apparent **retrograde**
motion in the sky. A separate gray circle with a yellow marker shows the **mean Sun** on
its own simple eccentric circle. Time advances by `slider.value` per original frame; at 0
the animation is stopped.

## Source of truth / how the ActionScript was recovered

The decompiled `scripts/` folder shipped **empty** — no `.as` files. The AS1/AS2 behavior
was recovered by **disassembling the bytecode directly from `marsOrbit005.swf`** (a
zlib‑compressed `CWS` v6 SWF): `DoInitAction` tags for `SunsOrbitClass` and
`MarsOrbitClass`, the main‑frame `onEnterFrame`, and the slider component's
`ClipActionRecord` parameters. Every constant below is taken verbatim from that bytecode
(exact doubles, not rounded). Stage placement came from the `PlaceObject2` matrices.

## Constants (verbatim from the AS constructors)

Original stage 825×550 px @ **20 fps**; both orbit clips placed at Earth = stage (282, 282).

**MarsOrbitClass** (`instance "ptolemaic"`), all lengths ×`scaleFactor = 2.5`:
| AS name | value | meaning |
|---|---|---|
| eccentricity | 6 × 2.5 = **15** | Earth↔deferent‑center offset (e) |
| deferentRadius | 60 × 2.5 = **150** | deferent radius (dR) |
| epicycleRadius | 39.5 × 2.5 = **98.75** | epicycle radius (eR) |
| apogee | **106.67** | apse‑line direction; clip `_rotation = −106.67°` |
| kappaAtEpoch | **3.53** | deferent angle at epoch (deg) |
| alphaAtEpoch | **327.22** | epicycle angle at epoch (deg) |
| period | **1.881** | Mars sidereal period (Earth years) |
| lineSegments | **175** | length of the fading red‑trail ring buffer |
| maxTimeStep / minTimeStep | **0.02 / 0.002** | sub‑step cap / minimum step |

Derived (verbatim formulas):
`kappa0 = (π/180)·(kappaAtEpoch − apogee)`,
`gamma0 = (π/180)·(alphaAtEpoch + kappaAtEpoch − apogee)`,
`kappaRate = 2π / period`.

**SunsOrbitClass** (`instance "sunOrbit"`), all lengths ×`scaleFactor = 1.64`:
eccentricity = 2.5×1.64 = **4.10**, deferentRadius = 60×1.64 = **98.4**,
apogee = **65.5** (clip `_rotation = −65.5°`), kappaAtEpoch = **265.25**.
`kappa = (π/180)·kappaAtEpoch + time·2π`; sun at `(e + dR·cos κ, −dR·sin κ)`.

**Speed slider** (component params from the placed instance's ClipAction):
`initValue = 0.01`, `initMinValue = 0`, `initMaxValue = 0.08`, `initScaleMode = "linear"`,
`initPrecision = 4` decimal places. Value is Earth‑years added to `time` per original frame.

Colors (from the exported icon bitmaps / AS `lineStyle` ints): Earth **#3399FF**,
Mars **#FF0000**, mean Sun **#FFCC00**; deferent & epicycle **#000000** hairline; Sun ring
**#A0A0A0** (AS `10526880`); red trail **#FF0000** (AS `16711680`).

## AS → HTML5 mapping

- `Object.registerClass` prototype classes → plain JS constructors `MarsOrbit` / `SunsOrbit`
  with the same methods (`setTime`), same fields, same formulas.
- `MarsOrbitClass.setTime(arg)` ported line‑for‑line, including: the
  `if (abs(deltaT) < minTimeStep) return;` guard that leaves `timeLast` **unadvanced** (so
  small deltas accrue across frames), the `numSteps = ceil(abs(deltaT/maxTimeStep))`
  sub‑stepping, the equant distance `m = −e·ck + sqrt(dR² − e²·sk²)`, epicycle‑center
  `cx = 2e + m·ck`, `cy = m·sk`, planet `px = cx + eR·cos γ`, `py = −(cy + eR·sin γ)`.
- The **fading red trail** is a 175‑entry **ring buffer** of one‑segment lines, exactly as
  the AS used 175 `MovieClip`s. Per‑segment alpha uses the AS formula verbatim:
  `alphaStep = 100/ls`; `a = (i>cs) ? 100 − alphaStep·(cs−i+ls) : 100 − alphaStep·(cs−i)`.
- `drawArc`/`curveTo` 10‑segment bezier circles → `ctx.arc` (geometrically identical circle).
- Flash clip `_rotation` (degrees) → `ctx.translate(EarthX, EarthY); ctx.rotate(rad)` around
  Earth, matching the nested clip transform. Screen‑Y‑down with `y = −sin` is preserved.
- `onEnterFrame` @ 20 fps `time += stepSizeSlider.value` → a `requestAnimationFrame` loop that
  advances by **wall‑clock** time: `time += value · 20 · dt_seconds`, so the on‑screen rate
  matches the original 20 fps rate on any display refresh (per the pipeline timing rule).
- `getTimer()` → `performance.now()` (via rAF timestamp). `trace(...)` dropped. The Flash UI
  component framework (slider) is **not** ported; only its observable behavior is, using a
  native `<input type="range">`.

## Assets: reused vs code‑drawn

- **ClassAction logo:** present in the original info panel (exported as the animated
  `sprites/DefineSprite_83`), but **removed at the user's request**; the `assets/` folder and
  the `<img>` were deleted accordingly.
- **Code‑drawn (no exported file exists):** the deferent, epicycle, and Sun‑ring circles and
  the red epicyclic trail — these are drawn at runtime in the AS via `createEmptyMovieClip`/
  `drawArc`/`lineTo`, so they are reproduced on the canvas with matching geometry/motion.
- The Earth/Mars/Sun markers are exported as tiny 14×14 icon symbols. Because they are
  continuously repositioned canvas objects composited with the code‑drawn art, they are
  rendered as canvas circles using the icons' **exact** colors and diameter (radius 7),
  which stays crisp at any zoom/DPR. The originals are solid‑color dots, so this is
  pixel‑equivalent, not a redraw of pictorial art.

## Deviations from the original (and why)

1. **contents.json syntax fix (REQUIRED — please propagate upstream).** The shipped
   foundation `contents.json` is **invalid JSON** and the masthead's `JSON.parse` fails on
   it, which breaks the title/Help/About for *every* sim, not just this one. Two classes of
   defect were present: (a) raw newline characters inside string literals (entries `ce_hc`,
   `meltednail`, `longlat`‑area, and `eclipsingbinarysim`), and (b) **unescaped** `"` inside
   `href` attributes (entries `ptolemaicphases` and `venusphases`, e.g.
   `<a href="../venusphases">`). The copied `html5/foundation/contents.json` was minimally
   corrected — raw control chars removed, those `href` quotes escaped to `\"` to match the
   file's own convention — with **no visible/teaching text changed** (108 entries preserved,
   `marsorbit` entry untouched). The `.js`/`.css` foundation files are byte‑for‑byte
   unchanged. The `marsorbit` entry (sim‑id, title "Ptolemaic Orbit of Mars", v2.0) already
   existed, so no entry was added. **Action for maintainers:** apply the same syntax fix to
   the shared source `contents.json`.
2. **Layout follows KL‑UNL, not Flash pixels.** The diagram is a `<canvas>` in the left/wide
   `.panel`; the intro text, speed control, and logo are in the right/narrow `.panel`,
   mirroring the original's diagram‑left / info‑right arrangement. On phone‑portrait widths
   it stacks to one column (diagram → intro → controls → logo). The canvas keeps the original
   internal coordinate units and is scaled by CSS.
3. **Pause added.** The original auto‑plays with no stop. A Play/Pause button is added
   (WCAG 2.2.2); the animation also stops when the speed slider is at 0. Under
   `prefers-reduced-motion` the sim starts **paused**. The rAF loop stops when not animating
   (render‑on‑demand) rather than spinning forever.
4. **Earth marker z‑order.** In the SWF the Earth dot is frame content beneath the code‑drawn
   children and the Sun clip; here it is drawn last (on top) so the central reference marker
   is always visible. This affects only a single point at the rotation center where nothing
   meaningful overlaps.
5. **Speed announced with real units.** The abstract slider value is announced to screen
   readers as `value × 20 = Earth years per second` (e.g. 0.01 → "0.20 Earth years per
   second"), or "stopped" at 0.

No physics constant, formula, or on‑screen/Help/About text was altered.

## Verification performed (no emulator)

Ported logic checked against the disassembled AS; masthead loads (title + Reset/Help/About)
with no console errors and no failed requests over HTTP; the recovered constants reproduce
the reference screenshot's geometry (Earth centered; Sun ring radius ≈98; two overlapping
black circles; the characteristic red epicyclic loop and central curl). Reset restores the
exact initial state; slider/keyboard and Play/Pause update the same state; announcements
carry units. Desktop two‑column and phone‑portrait single‑column layouts verified with no
overlap. **Human screen‑reader QA (NVDA + VoiceOver) is still recommended.**
