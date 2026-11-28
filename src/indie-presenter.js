/**
 * Indie Presenter — Reusable ES Module & Web Component (<indie-presenter>)
 * Zero-build, zero-dependency animated weather & forecast presenter.
 */

export const OUTFITS = Object.freeze({
  onepiece: { key: 'onepiece', label: 'One-Piece', mode: 'day' },
  shorts: { key: 'shorts', label: 'Sport Shorts', mode: 'day' },
  skort: { key: 'skort', label: 'Skort & Knit', mode: 'day' },
  rashguard: { key: 'rashguard', label: 'Surf Rashguard', mode: 'day' },
  cozy: { key: 'cozy', label: 'Cozy Knit', mode: 'day' },
  rainy: { key: 'rainy', label: 'Rainy Day', mode: 'rainy' },
  night_black: { key: 'night_black', label: 'Black Mini', mode: 'night' },
  night_bw: { key: 'night_bw', label: 'B&W Wrap Mini', mode: 'night' },
  night_cowl: { key: 'night_cowl', label: 'Cowl & Mini', mode: 'night' },
});

export const ALL_OUTFIT_KEYS = Object.freeze(Object.keys(OUTFITS));

export const DEFAULT_BACKGROUNDS = Object.freeze({
  day: 'bg_morro_bay.jpg',
  rainy: 'bg_morro_bay_rainy.jpg',
  nightClear: 'bg_indoor_clear_night.jpg',
  nightRainy: 'bg_indoor_rainy_night.jpg',
});

const DEFAULT_MODULE_BASE = (() => {
  try {
    return new URL('..', import.meta.url).href;
  } catch {
    return './';
  }
})();

const preloadedUrls = new Set();

function preloadImage(url) {
  if (!url || preloadedUrls.has(url)) return;
  preloadedUrls.add(url);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
}

function normalizeBaseUrl(baseUrl) {
  const raw = (baseUrl || DEFAULT_MODULE_BASE).trim();
  return raw.endsWith('/') ? raw : `${raw}/`;
}

function resolveAssetUrl(pathOrUrl, baseUrl) {
  if (!pathOrUrl) return '';
  if (
    /^(https?:)?\/\//i.test(pathOrUrl) ||
    pathOrUrl.startsWith('data:') ||
    pathOrUrl.startsWith('blob:') ||
    pathOrUrl.startsWith('/')
  ) {
    return pathOrUrl;
  }
  const base = normalizeBaseUrl(baseUrl);
  const clean = pathOrUrl.startsWith('assets/') ? pathOrUrl : `assets/${pathOrUrl}`;
  try {
    return new URL(clean, base).href;
  } catch {
    return `${base}${clean}`;
  }
}

function degreesToCompass(deg) {
  if (typeof deg !== 'number' || Number.isNaN(deg)) return '';
  const dirs = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  return dirs[Math.round(deg / 45) % 8];
}

function describeWmoCode(code) {
  const map = {
    0: { text: 'clear skies', rainy: false },
    1: { text: 'mostly clear skies', rainy: false },
    2: { text: 'partly cloudy skies', rainy: false },
    3: { text: 'overcast skies', rainy: false },
    45: { text: 'foggy conditions', rainy: false },
    48: { text: 'freezing fog', rainy: false },
    51: { text: 'light drizzle', rainy: true },
    53: { text: 'moderate drizzle', rainy: true },
    55: { text: 'dense drizzle', rainy: true },
    61: { text: 'light rain', rainy: true },
    63: { text: 'steady rain', rainy: true },
    65: { text: 'heavy rain', rainy: true },
    71: { text: 'light snow', rainy: true },
    73: { text: 'moderate snow', rainy: true },
    75: { text: 'heavy snow', rainy: true },
    80: { text: 'scattered rain showers', rainy: true },
    81: { text: 'moderate rain showers', rainy: true },
    82: { text: 'heavy rain showers', rainy: true },
    95: { text: 'thunderstorms', rainy: true },
  };
  return map[code] || { text: 'mild conditions', rainy: false };
}

/**
 * Fetch current + daily forecast from Open-Meteo for any lat/lon.
 */
export async function fetchOpenMeteoWeather({ lat, lon, locationName = 'your area' }) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Valid numeric lat and lon are required for Open-Meteo.');
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set(
    'current',
    'temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m'
  );
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,uv_index_max');
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('wind_speed_unit', 'mph');
  url.searchParams.set('precipitation_unit', 'inch');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '1');

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Open-Meteo request failed (${res.status})`);
  }
  const data = await res.json();
  const cur = data.current || {};
  const daily = data.daily || {};
  const wmo = describeWmoCode(cur.weather_code);
  const isRainy = wmo.rainy || (typeof cur.precipitation === 'number' && cur.precipitation > 0.01);

  return {
    locationName,
    tempF: typeof cur.temperature_2m === 'number' ? Math.round(cur.temperature_2m) : null,
    feelsLikeF: typeof cur.apparent_temperature === 'number' ? Math.round(cur.apparent_temperature) : null,
    highF: Array.isArray(daily.temperature_2m_max) ? Math.round(daily.temperature_2m_max[0]) : null,
    lowF: Array.isArray(daily.temperature_2m_min) ? Math.round(daily.temperature_2m_min[0]) : null,
    windMph: typeof cur.wind_speed_10m === 'number' ? Math.round(cur.wind_speed_10m) : null,
    windGustMph: typeof cur.wind_gusts_10m === 'number' ? Math.round(cur.wind_gusts_10m) : null,
    windDir: degreesToCompass(cur.wind_direction_10m),
    humidity: typeof cur.relative_humidity_2m === 'number' ? Math.round(cur.relative_humidity_2m) : null,
    uvIndex: Array.isArray(daily.uv_index_max) ? Math.round(daily.uv_index_max[0]) : null,
    condition: wmo.text,
    isRainy,
    isNight: cur.is_day === 0,
  };
}

/**
 * Generate a natural spoken forecast script from structured weather telemetry.
 */
export function buildForecastScript(weather = {}, options = {}) {
  const location = weather.locationName || options.locationName || 'your area';
  const parts = [];

  parts.push(`Hi, I'm Indie with your ${location} forecast.`);

  if (weather.condition || weather.tempF !== undefined && weather.tempF !== null) {
    const cond = weather.condition ? `${weather.condition}` : 'comfortable conditions';
    const temp =
      weather.tempF !== undefined && weather.tempF !== null ? ` and ${weather.tempF} degrees` : '';
    parts.push(`Right now we're seeing ${cond}${temp}.`);
  }

  if (weather.highF !== undefined && weather.highF !== null && weather.lowF !== undefined && weather.lowF !== null) {
    parts.push(`Today's high will reach ${weather.highF}, with an overnight low near ${weather.lowF}.`);
  } else if (weather.highF !== undefined && weather.highF !== null) {
    parts.push(`Expect a daytime high around ${weather.highF} degrees.`);
  }

  if (weather.windMph !== undefined && weather.windMph !== null) {
    const dir = weather.windDir ? ` from the ${weather.windDir}` : '';
    const gust =
      weather.windGustMph && weather.windGustMph > weather.windMph + 4
        ? `, with gusts up to ${weather.windGustMph} miles per hour`
        : '';
    parts.push(`Winds are ${weather.windMph} miles per hour${dir}${gust}.`);
  }

  if (weather.waterTempF !== undefined && weather.waterTempF !== null) {
    parts.push(`Water temperature is sitting around ${weather.waterTempF} degrees.`);
  }

  if (weather.humidity !== undefined && weather.humidity !== null) {
    parts.push(`Relative humidity is at ${weather.humidity} percent.`);
  }

  if (weather.summary) {
    parts.push(String(weather.summary).trim());
  } else if (weather.isRainy) {
    parts.push('Keep a rain jacket handy if you are heading outside.');
  } else if (weather.isNight) {
    parts.push('Enjoy a calm evening out there.');
  } else {
    parts.push('Have a great time out on the water and stay safe!');
  }

  return parts.join(' ');
}

const STYLES = /* css */ `
  :host {
    display: block;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #f8fafc;
    --indie-accent: #38bdf8;
    --indie-accent-strong: #0284c7;
    --indie-surface: rgba(15, 23, 42, 0.78);
    --indie-border: rgba(148, 163, 184, 0.24);
    --indie-radius: 18px;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  .indie-card {
    position: relative;
    display: flex;
    flex-direction: column;
    background: #0f172a;
    border: 1px solid var(--indie-border);
    border-radius: var(--indie-radius);
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(2, 6, 23, 0.45);
  }

  /* Stage */
  .indie-stage {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 10;
    min-height: 310px;
    overflow: hidden;
    background: #0b1324;
    user-select: none;
  }

  :host([compact]) .indie-stage {
    aspect-ratio: 4 / 3;
    min-height: 250px;
  }

  /* Strict z-index stack:
     0  : Background image
     1  : Soft grounding shadow under her feet
     10 : Character wrapper & closed frame (always opacity: 1)
     20 : Face-only overlays (mid, open, blink)
     30 : HUD overlays (badge, status)
  */
  .indie-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
    pointer-events: none;
  }

  .indie-bg-scrim {
    position: absolute;
    inset: 0;
    z-index: 0;
    background: linear-gradient(
      180deg,
      rgba(2, 6, 23, 0.35) 0%,
      rgba(2, 6, 23, 0.05) 38%,
      rgba(2, 6, 23, 0.12) 72%,
      rgba(2, 6, 23, 0.62) 100%
    );
    pointer-events: none;
  }

  .indie-ground-shadow {
    position: absolute;
    left: 50%;
    bottom: 3.5%;
    width: 34%;
    max-width: 240px;
    height: 22px;
    transform: translateX(-50%);
    background: radial-gradient(ellipse at center, rgba(2, 6, 23, 0.56) 0%, rgba(2, 6, 23, 0) 72%);
    border-radius: 999px;
    z-index: 1;
    pointer-events: none;
  }

  .indie-char-wrap {
    position: absolute;
    left: 50%;
    bottom: 0;
    height: 92%;
    aspect-ratio: 1 / 1;
    transform: translateX(-50%);
    transform-origin: bottom center;
    z-index: 10;
    pointer-events: none;
  }

  @keyframes indieSpeakBody {
    0%, 100% {
      transform: translateX(-50%) translateY(0px) scale(1);
    }
    50% {
      transform: translateX(-50%) translateY(-2px) scale(1.006);
    }
  }

  .indie-char-wrap.speaking {
    animation: indieSpeakBody 3.8s ease-in-out infinite;
  }

  .indie-frame {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: bottom center;
    pointer-events: none;
  }

  .indie-frame-closed {
    z-index: 10;
    opacity: 1;
  }

  .indie-frame-overlay {
    z-index: 20;
    will-change: opacity;
    opacity: 0;
    transition: opacity 55ms ease-out;
  }

  .indie-frame-blink {
    z-index: 21;
    transition: none;
  }

  .indie-frame-overlay.active {
    opacity: 1;
  }

  /* HUD Overlays */
  .indie-hud-top {
    position: absolute;
    top: 12px;
    left: 12px;
    right: 12px;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    pointer-events: none;
  }

  .indie-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 11px;
    border-radius: 999px;
    background: var(--indie-surface);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid var(--indie-border);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: #f8fafc;
    pointer-events: auto;
  }

  .indie-live-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #22c55e;
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.85);
    flex-shrink: 0;
  }

  .indie-live-dot.speaking {
    background: #f43f5e;
    box-shadow: 0 0 10px rgba(244, 63, 94, 0.95);
    animation: pulseDot 1s ease-in-out infinite;
  }

  @keyframes pulseDot {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.35); opacity: 0.75; }
  }

  .indie-outfit-pill {
    padding: 5px 10px;
    border-radius: 999px;
    background: var(--indie-surface);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid var(--indie-border);
    font-size: 11px;
    font-weight: 500;
    color: #cbd5e1;
    pointer-events: auto;
  }

  .indie-tagline-bar {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 10px;
    z-index: 30;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 10px;
    pointer-events: none;
  }

  .indie-tagline {
    padding: 5px 10px;
    border-radius: 10px;
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(148, 163, 184, 0.2);
    font-size: 12px;
    color: #e2e8f0;
  }

  /* Captions */
  .indie-captions {
    max-height: 86px;
    overflow-y: auto;
    padding: 12px 16px;
    background: rgba(15, 23, 42, 0.96);
    border-top: 1px solid var(--indie-border);
    font-size: 14px;
    line-height: 1.6;
    color: #94a3b8;
    scroll-behavior: smooth;
  }

  .indie-captions.hidden {
    display: none;
  }

  .indie-word {
    display: inline;
    padding: 1px 2px;
    border-radius: 4px;
    transition: color 80ms linear, background-color 80ms linear;
  }

  .indie-word.spoken {
    color: #e2e8f0;
  }

  .indie-word.active {
    color: #ffffff;
    background: rgba(56, 189, 248, 0.32);
    font-weight: 600;
  }

  /* Controls */
  .indie-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: #0b1220;
    border-top: 1px solid var(--indie-border);
  }

  .indie-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 10px;
    border: 1px solid var(--indie-border);
    background: #1e293b;
    color: #f8fafc;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 140ms ease, border-color 140ms ease, transform 80ms ease;
  }

  .indie-btn:hover {
    background: #334155;
    border-color: rgba(148, 163, 184, 0.45);
  }

  .indie-btn:active {
    transform: translateY(1px);
  }

  .indie-btn-primary {
    background: var(--indie-accent-strong);
    border-color: var(--indie-accent);
    color: #ffffff;
  }

  .indie-btn-primary:hover {
    background: #0369a1;
  }

  .indie-btn-primary.playing {
    background: #be123c;
    border-color: #fb7185;
  }

  .indie-btn-primary.playing:hover {
    background: #9f1239;
  }

  .indie-select,
  .indie-range {
    accent-color: var(--indie-accent);
  }

  .indie-select {
    flex: 1 1 150px;
    min-width: 130px;
    padding: 7px 10px;
    border-radius: 10px;
    border: 1px solid var(--indie-border);
    background: #1e293b;
    color: #f8fafc;
    font-size: 12px;
  }

  .indie-sliders {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-left: auto;
  }

  .indie-slider-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #cbd5e1;
  }

  .indie-slider-label input[type="range"] {
    width: 72px;
    cursor: pointer;
  }

  .indie-status-msg {
    width: 100%;
    font-size: 11px;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  .indie-status-msg.error {
    color: #fca5a5;
  }
`;

export class IndiePresenter extends HTMLElement {
  static get observedAttributes() {
    return [
      'base-url',
      'outfits',
      'outfit',
      'mode',
      'bg-day',
      'bg-rainy',
      'bg-night-clear',
      'bg-night-rainy',
      'location-name',
      'badge-text',
      'tagline',
      'script',
      'lat',
      'lon',
      'rate',
      'pitch',
      'show-captions',
      'compact',
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this._config = {
      baseUrl: DEFAULT_MODULE_BASE,
      outfits: [...ALL_OUTFIT_KEYS],
      outfit: null,
      mode: 'auto', // 'auto' | 'day' | 'rainy' | 'night'
      backgrounds: { ...DEFAULT_BACKGROUNDS },
      locationName: 'Morro Bay',
      badgeText: '',
      tagline: '',
      script: '',
      weather: null,
      lat: null,
      lon: null,
      rate: 0.95,
      pitch: 0.98,
      showCaptions: true,
      compact: false,
    };

    this._isSpeaking = false;
    this._mouthState = 'closed'; // 'closed' | 'rest' | 'mid' | 'open' | 'round'
    this._isBlinking = false;
    this._blinkTimer = null;
    this._blinkOffTimer = null;
    this._mouthDebounceTimer = null;
    this._visemeTimers = [];
    this._lastBoundaryAt = 0;
    this._avgWordMs = 300;
    this._cadenceTimer = null;
    this._cadenceStartTimer = null;
    this._boundarySeen = false;
    this._wordSpans = [];
    this._wordOffsets = [];
    this._activeWordIdx = -1;
    this._voices = [];
    this._selectedVoiceURI = '';
    this._utterance = null;
    this._weatherFetchToken = 0;

    this._renderShell();
  }

  connectedCallback() {
    this._syncFromAttributes();
    this._initVoices();
    this._startBlinkLoop();
    this._preloadEnabledAssets();
    this._updateUI();

    if (this._config.lat !== null && this._config.lon !== null && !this._config.script && !this._config.weather) {
      this.refreshForecast();
    }
  }

  disconnectedCallback() {
    this.stop();
    this._stopBlinkLoop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && this._voicesHandler) {
      window.speechSynthesis.removeEventListener('voiceschanged', this._voicesHandler);
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    this._applyAttribute(name, newVal);
    if (this.isConnected) {
      this._preloadEnabledAssets();
      this._updateUI();
      if ((name === 'lat' || name === 'lon') && this._config.lat !== null && this._config.lon !== null && !this._config.script) {
        this.refreshForecast();
      }
    }
  }

  /* ---- Public Properties ---- */

  get baseUrl() { return this._config.baseUrl; }
  set baseUrl(v) { this.setConfig({ baseUrl: v }); }

  get outfits() { return [...this._config.outfits]; }
  set outfits(v) { this.setConfig({ outfits: v }); }

  get outfit() { return this._getActiveOutfitKey(); }
  set outfit(v) { this.setOutfit(v); }

  get mode() { return this._config.mode; }
  set mode(v) { this.setConfig({ mode: v }); }

  get backgrounds() { return { ...this._config.backgrounds }; }
  set backgrounds(v) { this.setConfig({ backgrounds: v }); }

  get locationName() { return this._config.locationName; }
  set locationName(v) { this.setConfig({ locationName: v }); }

  get badgeText() { return this._config.badgeText; }
  set badgeText(v) { this.setConfig({ badgeText: v }); }

  get tagline() { return this._config.tagline; }
  set tagline(v) { this.setConfig({ tagline: v }); }

  get script() { return this._config.script; }
  set script(v) { this.setConfig({ script: v }); }

  get weather() { return this._config.weather; }
  set weather(v) { this.setConfig({ weather: v }); }

  get lat() { return this._config.lat; }
  set lat(v) { this.setConfig({ lat: v }); }

  get lon() { return this._config.lon; }
  set lon(v) { this.setConfig({ lon: v }); }

  get rate() { return this._config.rate; }
  set rate(v) { this.setConfig({ rate: v }); }

  get pitch() { return this._config.pitch; }
  set pitch(v) { this.setConfig({ pitch: v }); }

  get showCaptions() { return this._config.showCaptions; }
  set showCaptions(v) { this.setConfig({ showCaptions: Boolean(v) }); }

  get compact() { return this._config.compact; }
  set compact(v) { this.setConfig({ compact: Boolean(v) }); }

  /* ---- Public Methods ---- */

  setConfig(options = {}) {
    if (!options || typeof options !== 'object') return;
    const prevLat = this._config.lat;
    const prevLon = this._config.lon;

    if (options.baseUrl !== undefined) {
      this._config.baseUrl = options.baseUrl || DEFAULT_MODULE_BASE;
    }
    if (options.outfits !== undefined) {
      this._config.outfits = this._parseOutfits(options.outfits);
    }
    if (options.outfit !== undefined) {
      this._config.outfit = options.outfit;
    }
    if (options.mode !== undefined) {
      this._config.mode = options.mode || 'auto';
    }
    if (options.backgrounds && typeof options.backgrounds === 'object') {
      this._config.backgrounds = {
        ...this._config.backgrounds,
        ...options.backgrounds,
      };
    }
    if (options.locationName !== undefined) {
      this._config.locationName = options.locationName || 'your area';
    }
    if (options.badgeText !== undefined) {
      this._config.badgeText = options.badgeText || '';
    }
    if (options.tagline !== undefined) {
      this._config.tagline = options.tagline || '';
    }
    if (options.script !== undefined) {
      this._config.script = options.script || '';
    }
    if (options.weather !== undefined) {
      this._config.weather = options.weather;
    }
    if (options.lat !== undefined) {
      this._config.lat = options.lat === null || options.lat === '' ? null : Number(options.lat);
    }
    if (options.lon !== undefined) {
      this._config.lon = options.lon === null || options.lon === '' ? null : Number(options.lon);
    }
    if (options.rate !== undefined) {
      this._config.rate = this._clamp(Number(options.rate) || 0.95, 0.8, 1.2);
    }
    if (options.pitch !== undefined) {
      this._config.pitch = this._clamp(Number(options.pitch) || 0.98, 0.85, 1.2);
    }
    if (options.showCaptions !== undefined) {
      this._config.showCaptions = Boolean(options.showCaptions);
    }
    if (options.compact !== undefined) {
      this._config.compact = Boolean(options.compact);
      if (this._config.compact) this.setAttribute('compact', '');
      else this.removeAttribute('compact');
    }

    if (this.isConnected) {
      this._preloadEnabledAssets();
      this._updateUI();

      const coordsChanged =
        (options.lat !== undefined || options.lon !== undefined) &&
        (this._config.lat !== prevLat || this._config.lon !== prevLon);

      if (coordsChanged && this._config.lat !== null && this._config.lon !== null && !options.script && !options.weather) {
        this.refreshForecast();
      }
    }
  }

  setOutfit(key) {
    if (!key || !OUTFITS[key]) return;
    if (!this._config.outfits.includes(key)) {
      this._config.outfits = [...this._config.outfits, key];
    }
    this._config.outfit = key;
    if (this.isConnected) {
      this._preloadOutfit(key);
      this._updateCharacterImages();
      this._updateHud();
    }
    this.dispatchEvent(new CustomEvent('indie:outfit-change', { detail: { outfit: key } }));
  }

  cycleOutfit() {
    const allowed = this._config.outfits;
    if (!allowed.length) return;
    const current = this._getActiveOutfitKey();
    const idx = allowed.indexOf(current);
    const next = allowed[(idx + 1) % allowed.length];
    this.setOutfit(next);
  }

  async refreshForecast() {
    const { lat, lon, locationName } = this._config;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    const token = ++this._weatherFetchToken;
    this._setStatus(`Fetching forecast for ${locationName}...`);

    try {
      const weather = await fetchOpenMeteoWeather({ lat, lon, locationName });
      if (token !== this._weatherFetchToken) return null;
      this._config.weather = weather;
      this._setStatus(`Live Open-Meteo telemetry loaded for ${locationName}`);
      this._updateUI();
      this.dispatchEvent(new CustomEvent('indie:forecast-loaded', { detail: { weather } }));
      return weather;
    } catch (err) {
      if (token !== this._weatherFetchToken) return null;
      this._setStatus(`Could not load Open-Meteo: ${err.message}`, true);
      this.dispatchEvent(new CustomEvent('indie:error', { detail: { error: err } }));
      return null;
    }
  }

  getActiveScript() {
    if (this._config.script && this._config.script.trim()) {
      return this._config.script.trim();
    }
    if (this._config.weather) {
      return buildForecastScript(this._config.weather, { locationName: this._config.locationName });
    }
    const loc = this._config.locationName || 'your area';
    return `Hi! I'm Indie, your ${loc} weather presenter. Pass a custom script, weather telemetry, or coordinates to hear your live forecast.`;
  }

  play() {
    this.stop();
    const text = this.getActiveScript();
    if (!text) return;

    this._buildCaptions(text);
    this._isSpeaking = true;
    this._boundarySeen = false;
    this._els.charWrap.classList.add('speaking');
    this._els.liveDot.classList.add('speaking');
    this._els.playBtn.classList.add('playing');
    this._els.playBtn.textContent = '⏹ Stop';

    this.dispatchEvent(new CustomEvent('indie:play', { detail: { text } }));

    const hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

    if (!hasSpeech) {
      this._setStatus('Web Speech API unavailable — running visual cadence');
      this._startCadenceFallback(text, true);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this._config.rate;
    utterance.pitch = this._config.pitch;

    const chosenVoice = this._voices.find((v) => v.voiceURI === this._selectedVoiceURI) || this._pickDefaultVoice();
    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    utterance.onstart = () => {
      if (!this._isSpeaking) return;
      this._cadenceStartTimer = setTimeout(() => {
        if (this._isSpeaking && !this._boundarySeen) {
          this._startCadenceFallback(text, false);
        }
      }, 280);
    };

    utterance.onboundary = (event) => {
      if (!this._isSpeaking) return;
      if (event.charIndex !== undefined) {
        this._boundarySeen = true;
        this._stopCadenceFallback();
        this._highlightWordAtChar(event.charIndex);
        const tail = text.slice(event.charIndex);
        const wordMatch = tail.match(/^\S+/);
        const word = wordMatch ? wordMatch[0] : tail.slice(0, event.charLength || 4);
        this._pulseMouthFromBoundary(word);
      }
    };

    utterance.onend = () => {
      this._finishSpeaking();
    };

    utterance.onerror = () => {
      this._finishSpeaking();
    };

    this._utterance = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this._utterance = null;
    this._finishSpeaking(true);
  }

  togglePlay() {
    if (this._isSpeaking) this.stop();
    else this.play();
  }

  /* ---- Internal Helpers ---- */

  _renderShell() {
    const style = document.createElement('style');
    style.textContent = STYLES;

    const root = document.createElement('div');
    root.className = 'indie-card';
    root.innerHTML = `
      <div class="indie-stage">
        <img class="indie-bg" alt="" />
        <div class="indie-bg-scrim"></div>
        <div class="indie-ground-shadow"></div>
        <div class="indie-char-wrap">
          <img class="indie-frame indie-frame-closed" alt="Indie Presenter" />
          <img class="indie-frame indie-frame-overlay indie-frame-rest" alt="" aria-hidden="true" />
          <img class="indie-frame indie-frame-overlay indie-frame-mid" alt="" aria-hidden="true" />
          <img class="indie-frame indie-frame-overlay indie-frame-open" alt="" aria-hidden="true" />
          <img class="indie-frame indie-frame-overlay indie-frame-round" alt="" aria-hidden="true" />
          <img class="indie-frame indie-frame-overlay indie-frame-blink" alt="" aria-hidden="true" />
        </div>
        <div class="indie-hud-top">
          <div class="indie-badge">
            <span class="indie-live-dot"></span>
            <span class="indie-badge-text">Indie Live Desk</span>
          </div>
          <div class="indie-outfit-pill"></div>
        </div>
        <div class="indie-tagline-bar">
          <div class="indie-tagline"></div>
        </div>
      </div>
      <div class="indie-captions" aria-live="polite"></div>
      <div class="indie-controls">
        <button type="button" class="indie-btn indie-btn-primary indie-play-btn">▶ Play</button>
        <button type="button" class="indie-btn indie-outfit-btn" title="Cycle outfit">👕 Outfit</button>
        <select class="indie-select indie-voice-select" aria-label="Presenter voice"></select>
        <div class="indie-sliders">
          <label class="indie-slider-label">
            Speed <span class="indie-rate-val">0.95</span>
            <input class="indie-range indie-rate-input" type="range" min="0.80" max="1.20" step="0.05" value="0.95" />
          </label>
          <label class="indie-slider-label">
            Pitch <span class="indie-pitch-val">0.98</span>
            <input class="indie-range indie-pitch-input" type="range" min="0.85" max="1.20" step="0.02" value="0.98" />
          </label>
        </div>
        <div class="indie-status-msg"></div>
      </div>
    `;

    this.shadowRoot.append(style, root);

    this._els = {
      bg: root.querySelector('.indie-bg'),
      charWrap: root.querySelector('.indie-char-wrap'),
      frameClosed: root.querySelector('.indie-frame-closed'),
      frameRest: root.querySelector('.indie-frame-rest'),
      frameMid: root.querySelector('.indie-frame-mid'),
      frameOpen: root.querySelector('.indie-frame-open'),
      frameRound: root.querySelector('.indie-frame-round'),
      frameBlink: root.querySelector('.indie-frame-blink'),
      liveDot: root.querySelector('.indie-live-dot'),
      badgeText: root.querySelector('.indie-badge-text'),
      outfitPill: root.querySelector('.indie-outfit-pill'),
      tagline: root.querySelector('.indie-tagline'),
      captions: root.querySelector('.indie-captions'),
      playBtn: root.querySelector('.indie-play-btn'),
      outfitBtn: root.querySelector('.indie-outfit-btn'),
      voiceSelect: root.querySelector('.indie-voice-select'),
      rateInput: root.querySelector('.indie-rate-input'),
      rateVal: root.querySelector('.indie-rate-val'),
      pitchInput: root.querySelector('.indie-pitch-input'),
      pitchVal: root.querySelector('.indie-pitch-val'),
      statusMsg: root.querySelector('.indie-status-msg'),
    };

    this._els.playBtn.addEventListener('click', () => this.togglePlay());
    this._els.outfitBtn.addEventListener('click', () => this.cycleOutfit());
    this._els.voiceSelect.addEventListener('change', (e) => {
      this._selectedVoiceURI = e.target.value;
    });
    this._els.rateInput.addEventListener('input', (e) => {
      this._config.rate = Number(e.target.value);
      this._els.rateVal.textContent = this._config.rate.toFixed(2);
    });
    this._els.pitchInput.addEventListener('input', (e) => {
      this._config.pitch = Number(e.target.value);
      this._els.pitchVal.textContent = this._config.pitch.toFixed(2);
    });
  }

  _syncFromAttributes() {
    for (const attr of IndiePresenter.observedAttributes) {
      if (this.hasAttribute(attr)) {
        this._applyAttribute(attr, this.getAttribute(attr));
      }
    }
  }

  _applyAttribute(name, val) {
    switch (name) {
      case 'base-url':
        this._config.baseUrl = val || DEFAULT_MODULE_BASE;
        break;
      case 'outfits':
        this._config.outfits = this._parseOutfits(val);
        break;
      case 'outfit':
        this._config.outfit = val || null;
        break;
      case 'mode':
        this._config.mode = val || 'auto';
        break;
      case 'bg-day':
        this._config.backgrounds.day = val || DEFAULT_BACKGROUNDS.day;
        break;
      case 'bg-rainy':
        this._config.backgrounds.rainy = val || DEFAULT_BACKGROUNDS.rainy;
        break;
      case 'bg-night-clear':
        this._config.backgrounds.nightClear = val || DEFAULT_BACKGROUNDS.nightClear;
        break;
      case 'bg-night-rainy':
        this._config.backgrounds.nightRainy = val || DEFAULT_BACKGROUNDS.nightRainy;
        break;
      case 'location-name':
        this._config.locationName = val || 'Morro Bay';
        break;
      case 'badge-text':
        this._config.badgeText = val || '';
        break;
      case 'tagline':
        this._config.tagline = val || '';
        break;
      case 'script':
        this._config.script = val || '';
        break;
      case 'lat':
        this._config.lat = val === null || val === '' ? null : Number(val);
        break;
      case 'lon':
        this._config.lon = val === null || val === '' ? null : Number(val);
        break;
      case 'rate':
        this._config.rate = this._clamp(Number(val) || 0.95, 0.8, 1.2);
        break;
      case 'pitch':
        this._config.pitch = this._clamp(Number(val) || 0.98, 0.85, 1.2);
        break;
      case 'show-captions':
        this._config.showCaptions = val !== 'false';
        break;
      case 'compact':
        this._config.compact = val !== null && val !== 'false';
        break;
      default:
        break;
    }
  }

  _parseOutfits(val) {
    let list = ALL_OUTFIT_KEYS;
    if (Array.isArray(val)) {
      list = val;
    } else if (typeof val === 'string' && val.trim()) {
      list = val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const filtered = list.filter((k) => Boolean(OUTFITS[k]));
    return filtered.length ? filtered : [...ALL_OUTFIT_KEYS];
  }

  _clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  _resolveEffectiveMode() {
    if (this._config.mode && this._config.mode !== 'auto') {
      return this._config.mode;
    }
    const w = this._config.weather;
    if (w) {
      if (w.isNight) return w.isRainy ? 'night-rainy' : 'night';
      if (w.isRainy) return 'rainy';
      return 'day';
    }
    return 'day';
  }

  _getActiveOutfitKey() {
    const allowed = this._config.outfits;
    if (this._config.outfit && allowed.includes(this._config.outfit)) {
      return this._config.outfit;
    }
    const mode = this._resolveEffectiveMode();
    const targetMode = mode.startsWith('night') ? 'night' : mode;
    const match = allowed.find((k) => OUTFITS[k]?.mode === targetMode);
    return match || allowed[0] || 'shorts';
  }

  _getBackgroundUrl() {
    const mode = this._resolveEffectiveMode();
    const bgs = this._config.backgrounds;
    let raw = bgs.day;
    if (mode === 'rainy') raw = bgs.rainy || bgs.day;
    else if (mode === 'night-rainy') raw = bgs.nightRainy || bgs.nightClear || bgs.day;
    else if (mode === 'night') raw = bgs.nightClear || bgs.day;
    return resolveAssetUrl(raw, this._config.baseUrl);
  }

  _preloadOutfit(key) {
    const base = this._config.baseUrl;
    for (const suffix of ['closed', 'rest', 'mid', 'open', 'round', 'blink']) {
      preloadImage(resolveAssetUrl(`indie_${key}_${suffix}.png`, base));
    }
  }

  _preloadEnabledAssets() {
    for (const key of this._config.outfits) {
      this._preloadOutfit(key);
    }
    const bgs = this._config.backgrounds;
    for (const bgKey of ['day', 'rainy', 'nightClear', 'nightRainy']) {
      if (bgs[bgKey]) {
        preloadImage(resolveAssetUrl(bgs[bgKey], this._config.baseUrl));
      }
    }
  }

  _updateUI() {
    this._updateCharacterImages();
    this._updateBackground();
    this._updateHud();
    this._buildCaptions(this.getActiveScript());

    this._els.captions.classList.toggle('hidden', !this._config.showCaptions);
    this._els.rateInput.value = String(this._config.rate);
    this._els.rateVal.textContent = this._config.rate.toFixed(2);
    this._els.pitchInput.value = String(this._config.pitch);
    this._els.pitchVal.textContent = this._config.pitch.toFixed(2);
    this._els.outfitBtn.style.display = this._config.outfits.length > 1 ? '' : 'none';
  }

  _updateCharacterImages() {
    const key = this._getActiveOutfitKey();
    const base = this._config.baseUrl;
    this._els.frameClosed.src = resolveAssetUrl(`indie_${key}_closed.png`, base);
    this._els.frameRest.src = resolveAssetUrl(`indie_${key}_rest.png`, base);
    this._els.frameMid.src = resolveAssetUrl(`indie_${key}_mid.png`, base);
    this._els.frameOpen.src = resolveAssetUrl(`indie_${key}_open.png`, base);
    this._els.frameRound.src = resolveAssetUrl(`indie_${key}_round.png`, base);
    this._els.frameBlink.src = resolveAssetUrl(`indie_${key}_blink.png`, base);
    this._applyFaceState();
  }

  _updateBackground() {
    const url = this._getBackgroundUrl();
    if (this._els.bg.src !== url) {
      this._els.bg.src = url;
    }
  }

  _updateHud() {
    const loc = this._config.locationName || 'Live';
    this._els.badgeText.textContent = this._config.badgeText || `${loc} Live Desk`;
    this._els.tagline.textContent =
      this._config.tagline || `I'm Indie, your ${loc} weather presenter`;
    const activeKey = this._getActiveOutfitKey();
    const meta = OUTFITS[activeKey];
    this._els.outfitPill.textContent = meta ? meta.label : activeKey;
  }

  _setStatus(msg, isError = false) {
    this._els.statusMsg.textContent = msg || '';
    this._els.statusMsg.classList.toggle('error', isError);
  }

  /* ---- Face Layering (Zero-Flicker) ---- */

  _applyFaceState() {
    const showBlink = this._isBlinking;
    const showRest = this._mouthState === 'rest';
    const showMid = this._mouthState === 'mid';
    const showOpen = this._mouthState === 'open';
    const showRound = this._mouthState === 'round';

    this._els.frameBlink.classList.toggle('active', showBlink);
    this._els.frameRest.classList.toggle('active', showRest);
    this._els.frameMid.classList.toggle('active', showMid);
    this._els.frameOpen.classList.toggle('active', showOpen);
    this._els.frameRound.classList.toggle('active', showRound);
  }

  _startBlinkLoop() {
    this._stopBlinkLoop();
    const scheduleNext = () => {
      const delay = 2600 + Math.random() * 2400; // 2.6s - 5.0s
      this._blinkTimer = setTimeout(() => {
        this._isBlinking = true;
        this._applyFaceState();
        this._blinkOffTimer = setTimeout(() => {
          this._isBlinking = false;
          this._applyFaceState();
          scheduleNext();
        }, 135);
      }, delay);
    };
    scheduleNext();
  }

  _stopBlinkLoop() {
    clearTimeout(this._blinkTimer);
    clearTimeout(this._blinkOffTimer);
    this._isBlinking = false;
    this._applyFaceState();
  }

  _clearVisemeTimers() {
    clearTimeout(this._mouthDebounceTimer);
    if (this._visemeTimers.length) {
      for (const id of this._visemeTimers) clearTimeout(id);
      this._visemeTimers = [];
    }
  }

  _wordToVisemes(rawWord) {
    const word = String(rawWord || '').toLowerCase();
    const letters = word.replace(/[^a-z]/g, '');
    if (!letters) return ['rest'];

    // Pick 1–2 primary vowel-driven shapes so the mouth moves smoothly without fluttering
    const shapes = [];
    const pushShape = (v) => {
      if (shapes[shapes.length - 1] !== v) shapes.push(v);
    };

    for (let i = 0; i < letters.length; i++) {
      const ch = letters[i];
      const next = letters[i + 1] || '';
      const pair = ch + next;

      if (pair === 'oo' || pair === 'ou' || pair === 'ow' || pair === 'oa') {
        pushShape('round');
        i += 1;
      } else if (ch === 'o' || ch === 'u' || ch === 'w') {
        pushShape('round');
      } else if (ch === 'a') {
        pushShape('open');
      } else if (ch === 'e' || ch === 'i' || ch === 'y') {
        pushShape('mid');
      }
    }

    if (shapes.length === 0) {
      return /^[mbpfv]/.test(letters) ? ['rest'] : ['mid'];
    }
    if (letters.length <= 4) {
      return [shapes[0]];
    }
    if (shapes.length === 1) {
      return [shapes[0], shapes[0] === 'open' ? 'mid' : 'open'];
    }
    return shapes.slice(0, 2);
  }

  _pulseMouthFromBoundary(wordOrLen) {
    this._clearVisemeTimers();

    const now = performance.now();
    if (this._lastBoundaryAt > 0) {
      const delta = now - this._lastBoundaryAt;
      if (delta >= 90 && delta <= 900) {
        this._avgWordMs = this._avgWordMs * 0.65 + delta * 0.35;
      }
    }
    this._lastBoundaryAt = now;

    const raw = typeof wordOrLen === 'string' ? wordOrLen : '';
    const visemes = raw ? this._wordToVisemes(raw) : [wordOrLen > 4 ? 'open' : 'mid'];

    const rate = this._clamp(this._config.rate || 0.95, 0.8, 1.2);
    const estByLen = Math.max(150, Math.min(340, (raw.length * 42) / rate));
    const wordBudgetMs = this._clamp(this._avgWordMs * 0.72 + estByLen * 0.28, 150, 380);

    this._mouthState = visemes[0];
    this._applyFaceState();

    if (visemes.length > 1) {
      const secondDelay = Math.round(wordBudgetMs * 0.44);
      const t = setTimeout(() => {
        if (!this._isSpeaking) return;
        this._mouthState = visemes[1];
        this._applyFaceState();
      }, secondDelay);
      this._visemeTimers.push(t);
    }

    const isSentenceEnd = /[.!?]["')\]]*$/.test(raw);
    const settleDelay = Math.round(wordBudgetMs * 0.86);

    this._mouthDebounceTimer = setTimeout(() => {
      if (!this._isSpeaking) return;
      this._mouthState = 'rest';
      this._applyFaceState();

      if (isSentenceEnd) {
        const smileWait = setTimeout(() => {
          if (this._isSpeaking) {
            this._mouthState = 'closed';
            this._applyFaceState();
          }
        }, 200);
        this._visemeTimers.push(smileWait);
      }
    }, settleDelay);
  }

  _startCadenceFallback(text, autoStopAtEnd) {
    this._stopCadenceFallback();
    const words = text.trim().split(/\s+/).filter(Boolean);
    const totalWords = Math.max(1, words.length);
    const wordVisemes = words.map((w) => ({
      seq: this._wordToVisemes(w),
      endSmile: /[.!?]["')\]]*$/.test(w),
    }));
    const estimatedMs = Math.max(1800, (totalWords / (2.55 * this._config.rate)) * 1000);
    const startTime = performance.now();

    this._cadenceTimer = setInterval(() => {
      if (!this._isSpeaking) {
        this._stopCadenceFallback();
        return;
      }
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / estimatedMs);
      const wordFloat = progress * totalWords;
      const wordIdx = Math.min(totalWords - 1, Math.floor(wordFloat));
      const wordFrac = wordFloat - wordIdx;

      this._highlightWordByIndex(wordIdx);

      const entry = wordVisemes[wordIdx];
      let nextState = 'rest';
      if (wordFrac < 0.78) {
        if (entry.seq.length > 1 && wordFrac >= 0.39) {
          nextState = entry.seq[1];
        } else {
          nextState = entry.seq[0];
        }
      } else if (entry.endSmile && wordFrac >= 0.90) {
        nextState = 'closed';
      }

      if (this._mouthState !== nextState) {
        this._mouthState = nextState;
        this._applyFaceState();
      }

      if (autoStopAtEnd && progress >= 1) {
        this._finishSpeaking();
      }
    }, 60);
  }

  _stopCadenceFallback() {
    clearInterval(this._cadenceTimer);
    this._cadenceTimer = null;
  }

  _finishSpeaking(silent = false) {
    const wasSpeaking = this._isSpeaking;
    this._isSpeaking = false;
    this._boundarySeen = false;
    this._lastBoundaryAt = 0;
    clearTimeout(this._cadenceStartTimer);
    this._clearVisemeTimers();
    this._stopCadenceFallback();

    this._mouthState = 'closed';
    this._applyFaceState();

    this._els.charWrap.classList.remove('speaking');
    this._els.liveDot.classList.remove('speaking');
    this._els.playBtn.classList.remove('playing');
    this._els.playBtn.textContent = '▶ Play';

    this._resetCaptions();

    if (wasSpeaking && !silent) {
      this.dispatchEvent(new CustomEvent('indie:end'));
    }
  }

  /* ---- Captions ---- */

  _buildCaptions(text) {
    const container = this._els.captions;
    container.innerHTML = '';
    this._wordSpans = [];
    this._wordOffsets = [];
    this._activeWordIdx = -1;

    const regex = /\S+/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const span = document.createElement('span');
      span.className = 'indie-word';
      span.textContent = match[0];
      container.appendChild(span);
      this._wordSpans.push(span);
      this._wordOffsets.push(match.index);
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      container.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    container.scrollTop = 0;
  }

  _highlightWordAtChar(charIndex) {
    let idx = 0;
    for (let i = 0; i < this._wordOffsets.length; i++) {
      if (this._wordOffsets[i] <= charIndex) idx = i;
      else break;
    }
    this._highlightWordByIndex(idx);
  }

  _highlightWordByIndex(idx) {
    if (idx === this._activeWordIdx || idx < 0 || idx >= this._wordSpans.length) return;
    this._activeWordIdx = idx;

    this._wordSpans.forEach((span, i) => {
      span.classList.toggle('spoken', i < idx);
      span.classList.toggle('active', i === idx);
    });

    const activeSpan = this._wordSpans[idx];
    const box = this._els.captions;
    if (activeSpan && box) {
      const spanTop = activeSpan.offsetTop - box.offsetTop;
      const targetScroll = spanTop - box.clientHeight / 2 + activeSpan.offsetHeight / 2;
      box.scrollTop = Math.max(0, targetScroll);
    }
  }

  _resetCaptions() {
    this._activeWordIdx = -1;
    for (const span of this._wordSpans) {
      span.classList.remove('spoken', 'active');
    }
    if (this._els.captions) {
      this._els.captions.scrollTop = 0;
    }
  }

  /* ---- Voices ---- */

  _initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this._els.voiceSelect.innerHTML = '<option value="">Default Visual Mode</option>';
      this._els.voiceSelect.disabled = true;
      return;
    }

    const load = () => {
      const all = window.speechSynthesis.getVoices() || [];
      const english = all.filter((v) => /^en/i.test(v.lang));
      this._voices = english.length ? english : all;

      const select = this._els.voiceSelect;
      const prev = this._selectedVoiceURI;
      select.innerHTML = '';

      if (!this._voices.length) {
        select.innerHTML = '<option value="">System Default Voice</option>';
        return;
      }

      for (const v of this._voices) {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.textContent = `${v.name} (${v.lang})`;
        select.appendChild(opt);
      }

      const preferred = this._voices.find((v) => v.voiceURI === prev) || this._pickDefaultVoice();
      if (preferred) {
        this._selectedVoiceURI = preferred.voiceURI;
        select.value = preferred.voiceURI;
      }
    };

    load();
    this._voicesHandler = load;
    window.speechSynthesis.addEventListener('voiceschanged', load);
  }

  _pickDefaultVoice() {
    if (!this._voices.length) return null;
    const preferredPatterns = [
      /aria/i,
      /jenny/i,
      /samantha/i,
      /google us english/i,
      /natural/i,
      /female/i,
    ];
    for (const pattern of preferredPatterns) {
      const match = this._voices.find((v) => pattern.test(v.name));
      if (match) return match;
    }
    return this._voices[0];
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('indie-presenter')) {
  customElements.define('indie-presenter', IndiePresenter);
}

/**
 * Programmatic helper to mount <indie-presenter> into any container element or selector.
 */
export function createIndiePresenter(container, options = {}) {
  const host = typeof container === 'string' ? document.querySelector(container) : container;
  if (!host) {
    throw new Error('createIndiePresenter: target container not found.');
  }
  const el = document.createElement('indie-presenter');
  el.setConfig(options);
  host.appendChild(el);
  return el;
}
