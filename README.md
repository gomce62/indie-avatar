# Indie Avatar (`indie-avatar`)

A reusable, zero-dependency animated weather & forecast presenter built as a vanilla JS Module and Web Component (`<indie-presenter>`).

Extracted from [morro-bay-dashboards](https://github.com/gomce62/morro-bay-dashboards) so Indie can be embedded on any website with configurable outfits, custom backgrounds (lakes, beaches, studios, etc.), and location-specific forecasts.

## Status

- [x] Character sprite frames (`assets/indie_*_{closed,mid,open,blink}.png`) and sample backgrounds (`assets/bg_*.jpg`, `assets/bg_lake_tahoe.svg`)
- [x] Architecture & guidelines documented in [`AGENTS.md`](./AGENTS.md)
- [x] Build `<indie-presenter>` Web Component & JS module (`src/indie-presenter.js`)
- [x] Build interactive demo & embed playground (`index.html`)
- [x] Add `embed.html` for `<iframe>` embeds

## Quick Start

```html
<script type="module" src="https://gomce62.github.io/indie-avatar/src/indie-presenter.js"></script>
<indie-presenter
  outfits="shorts,cozy,skort,rainy,night_black"
  bg-day="https://example.com/lake-shore.jpg"
  location-name="Lake Tahoe"
  lat="39.0968"
  lon="-120.0324"
></indie-presenter>
```
