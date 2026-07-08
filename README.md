# Ptolemaic Orbit of Mars — HTML5

Accessible HTML5 rebuild of the ClassAction Flash animation *Ptolemaic Orbit of Mars*,
built on the shared KL‑UNL foundation.

## This sim MUST be served over HTTP — it will not run from a double‑clicked file

Opening `index.html` directly from disk (a `file://` path) shows a broken/empty title
bar and no Help/About text.

**Why:** the KL‑UNL masthead component (`foundation/kl-unl-masthead.js`) loads its
title, Help, and About text with `fetch('foundation/contents.json')`. Browsers block
`fetch()` of local files under the `file://` protocol (the same‑origin/CORS policy), so
the fetch fails and the masthead can't populate. Served over HTTP the fetch succeeds and
the sim loads normally.

## How to run locally

Run one of these **from inside this `html5/` folder**, then open the printed URL:

```
# Python 3
python3 -m http.server 8123        # then open http://localhost:8123/

# Node
npx serve                          # or:  npx http-server

# VS Code
# Use the "Live Server" extension and "Open with Live Server".
```

Because you serve from inside `html5/`, the sim is at the server **root** — the URL is
`http://localhost:8123/`, not `http://localhost:8123/html5/index.html`.

> This repo also ships a tiny dev server at `../.claude/serve.js` (`node ../.claude/serve.js`)
> used during development; any static server works.

## Production

When deployed to the cloud host (served over HTTP/HTTPS) it just works. The `file://`
limitation only affects local double‑clicking.

## What's here

```
index.html          KL-UNL scaffold: masthead + diagram panel + info/controls panel
foundation/         KL-UNL foundation, copied in (see CONVERSION_NOTES for the one
                    required contents.json syntax fix)
styles/styles.css   sim-specific styles only (shared style comes from kl-unl.css)
simulation.js       the ported simulation (physics + rendering + controls)
assets/             reused exported art (the ClassAction logo bitmap)
CONVERSION_NOTES.md  behavior model, AS→HTML5 mapping, constants, deviations
ACCESSIBILITY.md     WCAG affordances, ARIA, keyboard map, live-region wording
```

No build step, no bundler, no framework, no CDN — all files are local. The only runtime
network request is the local `foundation/contents.json` fetch.
