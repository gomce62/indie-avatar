# Example Prompt for Building a New Website with Indie

Copy and paste the prompt below when asking Antigravity (or any AI coding assistant) to build a new website that embeds the `<indie-presenter>` avatar from this repository. Replace the bracketed `[...]` placeholders with your site's details.

---

```text
Build a new website for [LOCATION / TOPIC, e.g., Donner Lake Weather & Boating].

Embed the Indie animated presenter from `gomce62/indie-avatar` using the instructions in `AGENTS.md` (Section 6). Do NOT copy `assets/` or `src/` into this project—import directly from:
https://gomce62.github.io/indie-avatar/src/indie-presenter.js

Configuration requirements for `<indie-presenter>`:
- Location & labels: `location-name="[LOCATION]"`, `badge-text="[BADGE TEXT]"`, `tagline="[TAGLINE]"`
- Outfits: Only enable `[e.g., shorts,cozy,skort,rainy]` (exclude outfits that don't fit this site). Default outfit: `[e.g., cozy]`.
- Background: Use `[URL, local image path in this new site, or ask AI to generate a scenic background]` for `bg-day` (and optionally `bg-rainy` / `bg-night-clear`).
- Weather & Script: [Fetch live weather from Open-Meteo using lat/lon OR fetch from my API / telemetry].
- Personality & Tone: Write Indie's spoken forecast script in a [funny, lighthearted, family-friendly] tone (no flirty or suggestive undertones). Whenever the forecast or AI script generator updates, pass the new text to `indie.setConfig({ script: ... })` so both the spoken audio and captions update.
```

---

## Available Outfit Keys Reference

- **Day:** `onepiece`, `shorts`, `skort`, `rashguard`, `cozy`
- **Rainy:** `rainy`
- **Night:** `night_black`, `night_bw`, `night_cowl`
