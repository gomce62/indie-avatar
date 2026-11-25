# AGENTS.md — Indie Avatar (`indie-avatar`)

This file captures the architecture, design rules, and roadmap discussed for `gomce62/indie-avatar` so any AI assistant can immediately pick up where we left off.

---

## 1. Project Goal & Context

- **Origin:** Extracted from `gomce62/morro-bay-dashboards` (`Indies Kayak Forecast/index.html`). **Do not modify `morro-bay-dashboards`**—that dashboard remains untouched and live.
- **Goal:** Build a **standalone, reusable JavaScript Module & Web Component** (`<indie-presenter>`) so the Indie Avatar can be embedded on **any website** with:
  1. **Selectable Outfits:** Sites can specify which outfit keys are enabled (e.g., `['shorts', 'cozy', 'rainy', 'night_black']`), excluding outfits that don't fit the site (e.g., kayak-specific ones).
  2. **Custom Backgrounds:** Sites can supply any background image(s) (e.g., a lake shoreline, mountain vista, studio, or beach) for day, rain, and night modes.
  3. **Location-Agnostic Forecasts:** Sites can pass a custom script string, structured weather telemetry, or coordinates (`lat`/`lon` + `locationName`) to generate a spoken forecast for any location.
  4. **Zero-Build Static Hosting:** Designed to be served directly via **GitHub Pages** (`https://gomce62.github.io/indie-avatar/`) or any CDN/static host, with an interactive `index.html` demo page.

---

## 2. Repository Assets (`assets/`)

All character frames (`1024x1024` transparent PNGs) and sample backgrounds are already copied into `assets/`:

- **Outfits (9 total, 4 frames each: `closed`, `mid`, `open`, `blink`):**
  - Daytime (`mode: 'day'`): `onepiece` ("One-Piece"), `shorts` ("Sport Shorts"), `skort` ("Skort & Knit"), `rashguard` ("Surf Rashguard"), `cozy` ("Cozy Knit")
  - Daytime Rain (`mode: 'rainy'`): `rainy` ("Rainy Day")
  - Night / Indoor Studio (`mode: 'night'`): `night_black` ("Black Mini"), `night_bw` ("B&W Wrap Mini"), `night_cowl` ("Cowl & Mini")
- **Sample Backgrounds (`assets/bg_*.jpg`):**
  - `bg_morro_bay.jpg`, `bg_morro_bay_rainy.jpg`, `bg_indoor_clear_night.jpg`, `bg_indoor_rainy_night.jpg`

---

## 3. Critical Avatar Layering & Animation Rules (Must Preserve)

To prevent flicker, dark shadow artifacts, and GPU tile tearing:

1. **Strict `z-index` Stack inside the stage:**
   - Background image (`<img>`): `z-0`
   - Soft grounding shadow under her feet: `z-[1]`
   - Foreground character wrapper: `z-10`
   - `closed` frame (`<img>`): `z-10`, permanently `opacity: 1` (never faded out, no CSS `transition`)
   - `mid`, `open`, `blink` frames (`<img>`): `z-20`, `will-change: opacity`, instant crisp swap (no CSS `opacity` transition)
2. **Face-Only Overlays:** `mid`, `open`, and `blink` PNGs are 100% transparent (`alpha = 0`) everywhere outside Indie's face. Her body, hair, and props are rendered solely by the `closed` frame.
3. **Motion Constraints:** Do not add 2D `rotate()` to the breathing keyframe animation (`indieSpeakBody`)—use only gentle scale/vertical breathing.
4. **Preloading:** Preload all enabled outfit frames and backgrounds on initialization so the base `closed` image never disappears while loading.
5. **Lip-Sync, Blink & Captions:**
   - **Blink loop:** Independent loop triggers a `135ms` blink every `2.6s–5.0s`, both idle and while speaking.
   - **Lip-sync:** Use Web Speech API (`SpeechSynthesisUtterance`) `onboundary` with a `115ms` debounce, plus a cadence timer fallback for browsers/voices that don't fire `onboundary`. Always return to `closed` when finished.
   - **Captions:** Highlight the active spoken word and auto-scroll the caption container to keep it visible; reset `scrollTop = 0` on stop/end.

---

## 4. Planned Architecture & API Design

1. **Core Module (`src/indie-presenter.js` or `indie-presenter.js`):**
   - Vanilla ES Module exporting `IndiePresenter` Web Component (`<indie-presenter>`) and a programmatic `createIndiePresenter(container, options)` helper.
   - **Configurable options / attributes:**
     - `baseUrl` (defaulting relative to `import.meta.url` so assets load automatically even when embedded from another domain via GitHub Pages!)
     - `outfits`: array of allowed outfit keys (defaults to all 9)
     - `backgrounds`: `{ day, rainy, nightClear, nightRainy }` (defaults to `assets/bg_*.jpg`, or accepts custom URLs like a lake photo)
     - `locationName`, `badgeText`, `tagline` (e.g., `"Lake Tahoe Live Desk"`, `"I'm Indie, your Lake Tahoe weather presenter"`)
     - `script`: custom text to speak directly, **or** `weather`: structured weather object, **or** `lat`/`lon` for optional Open-Meteo fetch
     - Voice controls: voice selector, speed (`0.80–1.20`, default `0.95`), pitch (`0.85–1.20`, default `0.98`), Play/Stop, and outfit cycle button.
2. **Demo & Embed Playground (`index.html`):**
   - Interactive demo showing Indie in a generic/lake setting (e.g., Lake Tahoe or Donner Lake) with live outfit filter checkboxes, background switcher, custom script input, and copy-paste embed snippets (`<script type="module">` and `<iframe>`).
3. **Optional `embed.html`:**
   - Lightweight iframe-ready wrapper reading URL query params / `postMessage` for sites that prefer an `<iframe>` embed.

---

## 5. Constraints & Verification

- **Zero external build tools required:** Keep everything plain ES Modules / HTML / CSS so it works out of the box on GitHub Pages.
- **Security:** Never commit API keys, tokens, passwords, or `.env` secrets.
- **Before pushing:**
  - Verify all referenced `assets/...` paths exist on disk.
  - Validate JS syntax with `node --check` (or `new Function(...)` for inline scripts).
