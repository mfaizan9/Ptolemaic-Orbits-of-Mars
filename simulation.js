/* ===========================================================================
   Ptolemaic Orbit of Mars  —  HTML5 port
   ---------------------------------------------------------------------------
   Behavior ported VERBATIM from the decompiled ActionScript of marsOrbit005.swf
   (SunsOrbitClass, MarsOrbitClass, and the main-frame onEnterFrame). All physics
   constants, formulas, and the eccentric + equant deferent geometry are taken
   directly from that bytecode; nothing is rounded or invented.

   Original stage: 825 x 550 px @ 20 fps. Both orbit clips ("ptolemaic" and
   "sunOrbit") sit at the same stage point (Earth). Here we render only the
   diagram onto a 580 x 580 canvas whose internal coordinate system keeps the
   original Flash stage units (radii 150, 98.75, ... unchanged); Earth is placed
   at the canvas center and CSS scales the canvas to fit its panel.
   =========================================================================== */

(function () {
  "use strict";

  var DEG2RAD = 0.017453292519943295; // Math.PI / 180  (verbatim constant in AS)
  var TWO_PI  = 6.283185307179586;    // 2 * Math.PI     (verbatim constant in AS)

  var ORIGINAL_FPS = 20;  // the Flash movie ran onEnterFrame at 20 fps

  // --- Canvas geometry (does NOT affect physics; only where the origin maps) --
  var STAGE = 580;              // canvas backing size (internal units == Flash units)
  var EARTH_X = STAGE / 2;      // 290 — Earth at canvas center
  var EARTH_Y = STAGE / 2;      // 290

  // Marker colors + radius taken from the exported Mars/Sun/Earth icon bitmaps
  // (14 x 14 px each -> radius 7). Rendered as canvas circles because they are
  // continuously repositioned canvas objects composited with the code-drawn art.
  var EARTH_COLOR = "#3399ff";
  var MARS_COLOR  = "#ff0000";
  var SUN_COLOR   = "#ffcc00";
  var MARKER_R    = 7;

  var DEFERENT_COLOR = "#000000";   // AS lineStyle(0, 0x000000, 100)
  var EPICYCLE_COLOR = "#000000";   // AS lineStyle(0, 0x000000, 100)
  var SUN_RING_COLOR = "#a0a0a0";   // AS lineStyle(0, 0x00A0A0A0=10526880, 100)
  var TRAIL_COLOR    = "#ff0000";   // AS lineStyle(1, 0xFF0000, 100)

  /* =========================================================================
     SunsOrbitClass  (symbol "Suns Orbit", instance "sunOrbit")
     Mean-Sun marker riding a simple eccentric circle (the gray ring). No trail.
     Constructor values are hard-coded in the AS constructor.
     ========================================================================= */
  function SunsOrbit() {
    var scaleFactor    = 1.64;
    this.eccentricity  = 2.5 * scaleFactor;  // 4.10
    this.deferentRadius = 60 * scaleFactor;  // 98.40
    this.apogee        = 65.5;
    this.kappaAtEpoch  = 265.25;
    this.rotationRad   = (0 - this.apogee) * DEG2RAD; // clip _rotation = -apogee
    this.sunX = 0;
    this.sunY = 0;
  }
  // AS: setTime(arg){ kappa = DEG2RAD*kappaAtEpoch + arg*2PI;
  //     sunMC._x = eccentricity + deferentRadius*cos(kappa);
  //     sunMC._y = (0 - deferentRadius)*sin(kappa); }
  SunsOrbit.prototype.setTime = function (arg) {
    var kappa = DEG2RAD * this.kappaAtEpoch + arg * TWO_PI;
    this.sunX = this.eccentricity + this.deferentRadius * Math.cos(kappa);
    this.sunY = (0 - this.deferentRadius) * Math.sin(kappa);
  };

  /* =========================================================================
     MarsOrbitClass  (symbol "Mars Orbit", instance "ptolemaic")
     Eccentric + equant deferent carrying an epicycle, plus the fading red path.
     ========================================================================= */
  function MarsOrbit() {
    var scaleFactor     = 2.5;
    this.eccentricity   = 6 * scaleFactor;    // e  = 15
    this.deferentRadius = 60 * scaleFactor;   // dR = 150
    this.epicycleRadius = 39.5 * scaleFactor; // eR = 98.75
    this.apogee         = 106.67;
    this.kappaAtEpoch   = 3.53;
    this.alphaAtEpoch   = 327.22;
    this.period         = 1.881;              // Mars sidereal period (Earth years)
    this.rotationRad    = (0 - this.apogee) * DEG2RAD; // clip _rotation = -apogee

    this.lineSegments = 175;                  // red-path ring-buffer length

    // Ring buffer of trail segments; each entry is {x0,y0,x1,y1} or null.
    this.segments = new Array(this.lineSegments);

    // Sub-stepping limits (verbatim from AS setTime)
    this.maxTimeStep = 0.02;
    this.minTimeStep = 0.002;

    // Position of the epicycle center and of Mars, in local screen coords.
    this.epiX = 0; this.epiY = 0;
    this.marsX = 0; this.marsY = 0;

    this.reset();
  }

  // Constructor tail in AS: kappa0/gamma0/timeLast set, then setTime(0).
  MarsOrbit.prototype.reset = function () {
    var i;
    // kappa0 = DEG2RAD*(kappaAtEpoch - apogee)
    this.kappa0 = DEG2RAD * (this.kappaAtEpoch - this.apogee);
    // gamma0 = DEG2RAD*(alphaAtEpoch + kappaAtEpoch - apogee)
    this.gamma0 = DEG2RAD * (this.alphaAtEpoch + this.kappaAtEpoch - this.apogee);
    // kappaRate = 2PI / period
    this.kappaRate = TWO_PI / this.period;

    this.timeLast = -0.002;
    this.lastX = undefined;   // AS leaves lastX/lastY undefined until first sub-step
    this.lastY = undefined;
    this.currentSegment = 0;
    for (i = 0; i < this.lineSegments; i++) { this.segments[i] = null; }

    this.setTime(0);
  };

  // Faithful port of MarsOrbitClass.prototype.setTime(arg).
  MarsOrbit.prototype.setTime = function (arg) {
    var deltaT = arg - this.timeLast;
    // if (Math.abs(deltaT) < minTimeStep) return;  (timeLast NOT advanced -> accrues)
    if (Math.abs(deltaT) < this.minTimeStep) { return; }

    var numSteps = Math.ceil(Math.abs(deltaT / this.maxTimeStep));
    var stepSize = deltaT / numSteps;

    var kappa0 = this.kappa0, gamma0 = this.gamma0, kappaRate = this.kappaRate;
    var dR = this.deferentRadius, eR = this.epicycleRadius, e = this.eccentricity;
    var cos = Math.cos, sin = Math.sin, sqrt = Math.sqrt;

    var t0 = this.timeLast;
    var lx = this.lastX, ly = this.lastY;
    var cs = this.currentSegment, ls = this.lineSegments;
    var segments = this.segments;

    var i, t, kappa, sk, ck, m, cx, cy, gamma, cpx, cpy, px, py;

    for (i = 0; i < numSteps; i++) {
      t = t0 + i * stepSize;
      kappa = kappa0 + t * kappaRate;
      sk = sin(kappa);
      ck = cos(kappa);

      // Distance from the equant to the epicycle center along direction kappa.
      // m = -e*ck + sqrt(dR^2 - e^2*sk^2)
      m = (0 - e) * ck + sqrt(dR * dR - e * e * sk * sk);

      // Epicycle-center position (Earth at origin; equant offset 2e on the apse line).
      // cx = 2e + m*ck ;  cy = m*sk  (cy negated to screen coords when drawn).
      cx = 2 * e + m * ck;
      cy = m * sk;

      // Planet on the epicycle: gamma = gamma0 + 2PI*t
      gamma = gamma0 + TWO_PI * t;
      cpx = eR * cos(gamma);
      cpy = eR * sin(gamma);

      // Mars in local screen coords: px = cx+cpx ; py = -(cy+cpy)
      px = cx + cpx;
      py = 0 - (cy + cpy);

      if (lx !== undefined) {
        // advance ring buffer and store the segment from the previous point
        cs = (cs + 1) % ls;
        segments[cs] = { x0: lx, y0: ly, x1: px, y1: py };
      }
      lx = px;
      ly = py;
    }

    // Commit end-of-step state (AS assigns marsMC/_epicycleMC positions, etc.)
    this.marsX = px;
    this.marsY = py;
    this.epiX = cx;
    this.epiY = 0 - cy;         // epicycleMC._y = 0 - cy
    this.lastX = lx;
    this.lastY = ly;
    this.timeLast = arg;
    this.currentSegment = cs;
  };

  /* =========================================================================
     Rendering
     ========================================================================= */
  var canvas = document.getElementById("stage");
  var ctx = canvas.getContext("2d");
  var dpr = Math.max(1, window.devicePixelRatio || 1);

  function sizeCanvas() {
    dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = STAGE * dpr;
    canvas.height = STAGE * dpr;
  }
  sizeCanvas();

  var mars = new MarsOrbit();
  var sun = new SunsOrbit();

  // Draw a tessellated / true circle (AS drawCircle draws a 10-seg bezier circle;
  // ctx.arc is geometrically identical). Centered at (cx,cy), radius r.
  function strokeCircle(cx, cy, r, color) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TWO_PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;              // AS hairline lineStyle(0/1, ...)
    ctx.stroke();
  }

  function fillDot(cx, cy, r, color) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TWO_PI);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function render() {
    sun.setTime(state.time); // Sun position is a pure function of time

    // reset transform, clear
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, STAGE, STAGE);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    /* ---- Mars clip: rotated by -apogee about Earth --------------------------- */
    ctx.save();
    ctx.translate(EARTH_X, EARTH_Y);
    ctx.rotate(mars.rotationRad);

    // Red epicyclic path (fading ring buffer). alphaStep = 100/lineSegments.
    var ls = mars.lineSegments;
    var cs = mars.currentSegment;
    var alphaStep = 100 / ls;
    ctx.strokeStyle = TRAIL_COLOR;
    ctx.lineWidth = 1;
    for (var i = 0; i < ls; i++) {
      var seg = mars.segments[i];
      if (!seg) { continue; }
      // AS: if (i>cs) a = 100 - alphaStep*(cs-i+ls); else a = 100 - alphaStep*(cs-i);
      var a = (i > cs)
        ? 100 - alphaStep * (cs - i + ls)
        : 100 - alphaStep * (cs - i);
      if (a <= 0) { continue; }
      ctx.globalAlpha = a / 100;
      ctx.beginPath();
      ctx.moveTo(seg.x0, seg.y0);
      ctx.lineTo(seg.x1, seg.y1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Deferent (black), centered at (eccentricity, 0)
    strokeCircle(mars.eccentricity, 0, mars.deferentRadius, DEFERENT_COLOR);
    // Epicycle (black), centered at the moving epicycle center
    strokeCircle(mars.epiX, mars.epiY, mars.epicycleRadius, EPICYCLE_COLOR);
    // Mars marker (red)
    fillDot(mars.marsX, mars.marsY, MARKER_R, MARS_COLOR);

    ctx.restore();

    /* ---- Sun clip: rotated by -apogee(sun) about Earth ----------------------- */
    ctx.save();
    ctx.translate(EARTH_X, EARTH_Y);
    ctx.rotate(sun.rotationRad);
    // Gray deferent ring, centered at (eccentricity, 0)
    strokeCircle(sun.eccentricity, 0, sun.deferentRadius, SUN_RING_COLOR);
    // Mean-Sun marker (yellow)
    fillDot(sun.sunX, sun.sunY, MARKER_R, SUN_COLOR);
    ctx.restore();

    /* ---- Earth marker (blue) at the center ---------------------------------- */
    fillDot(EARTH_X, EARTH_Y, MARKER_R, EARTH_COLOR);
  }

  /* =========================================================================
     Animation loop + controls
     ========================================================================= */
  var prefersReduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var state = {
    time: 0,
    speed: 0.01,            // slider value: Earth years added per original frame
    playing: !prefersReduced
  };

  var slider = document.getElementById("speedSlider");
  var playPauseBtn = document.getElementById("playPauseBtn");
  var srStatus = document.getElementById("sr-status");

  var lastFrameTime = null;
  var running = false;   // whether the rAF loop is currently scheduled

  function announce(msg) { srStatus.textContent = msg; }

  // The animation is "live" only while playing at a non-zero speed. When it is
  // not live we render one final static frame and STOP scheduling rAF (saves
  // power and gives a settled frame — there is no perpetual background motion).
  function isLive() { return state.playing && state.speed > 0; }

  function startLoop() {
    if (!running && isLive()) {
      running = true;
      lastFrameTime = null;
      requestAnimationFrame(frame);
    } else if (!isLive()) {
      // schedule a single static render to reflect current state
      requestAnimationFrame(function () { if (!running) { render(); } });
    }
  }

  // Speed announcement in real, unit-bearing terms: value * 20 fps = years/second.
  function speedText() {
    var yearsPerSec = state.speed * ORIGINAL_FPS;
    if (state.speed <= 0) { return "Animation speed: stopped"; }
    return "Animation speed: " + yearsPerSec.toFixed(2) + " Earth years per second";
  }

  function updateSliderValueText() {
    var yearsPerSec = state.speed * ORIGINAL_FPS;
    slider.setAttribute(
      "aria-valuetext",
      state.speed <= 0
        ? "stopped"
        : yearsPerSec.toFixed(2) + " Earth years per second"
    );
  }

  function setPlaying(on) {
    state.playing = on;
    playPauseBtn.textContent = on ? "Pause" : "Play";
    playPauseBtn.setAttribute("aria-pressed", on ? "false" : "true");
    lastFrameTime = null; // avoid a time jump after a pause
  }

  function frame(now) {
    if (!isLive()) {
      // Became paused / speed 0: draw one settled frame and stop the loop.
      running = false;
      render();
      return;
    }
    if (lastFrameTime === null) { lastFrameTime = now; }
    var dt = (now - lastFrameTime) / 1000; // seconds elapsed (wall clock)
    lastFrameTime = now;
    if (dt > 0.1) { dt = 0.1; }            // clamp after tab-switch stalls
    // Original added `speed` per frame at 20 fps -> speed*20 Earth years / second.
    state.time += state.speed * ORIGINAL_FPS * dt;
    mars.setTime(state.time);
    render();
    requestAnimationFrame(frame);
  }

  /* ---- Wire controls ------------------------------------------------------- */
  slider.value = String(state.speed);
  updateSliderValueText();

  slider.addEventListener("input", function () {
    state.speed = parseFloat(slider.value);
    updateSliderValueText();
    startLoop();   // resume motion if speed left 0, or settle a frame if it hit 0
  });
  // Announce only on commit (not every tick) to avoid flooding the live region.
  slider.addEventListener("change", function () {
    state.speed = parseFloat(slider.value);
    updateSliderValueText();
    startLoop();
    announce(speedText());
  });

  playPauseBtn.addEventListener("click", function () {
    setPlaying(!state.playing);
    startLoop();
    announce(state.playing ? "Animation playing" : "Animation paused");
  });

  // Reset from the KL-UNL masthead: restore the exact initial state.
  document.addEventListener("sim-reset", function () {
    state.time = 0;
    state.speed = 0.01;
    slider.value = String(state.speed);
    updateSliderValueText();
    mars.reset();
    sun.setTime(0);
    setPlaying(!prefersReduced);
    startLoop();
    announce("Simulation reset. " + speedText());
  });

  window.addEventListener("resize", function () {
    sizeCanvas();
    startLoop();   // repaint at the new backing resolution
  });

  // Initial button state + first paint.
  setPlaying(state.playing);
  if (prefersReduced) {
    announce("Reduced-motion is on; the animation is paused. Press Play to start.");
  }
  startLoop();

  // Expose for debugging/inspection (harmless).
  window.__marsOrbit = {
    mars: mars, sun: sun, state: state,
    render: render, startLoop: startLoop
  };
})();
