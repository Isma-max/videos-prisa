/* =========================================================================
 * Videos Prisa — player rotativo de YouTube Live con audio propio.
 *
 * - Embebe videos de YouTube (en vivo o no) y rota entre ellos.
 * - El video va SIEMPRE en mudo: el audio sale de los archivos que sube
 *   el usuario (pensado como "parrilla" de programas de radio).
 * - Rotación por intervalo fijo + controles manuales (anterior / siguiente /
 *   pausar).
 * ========================================================================= */

"use strict";

const STORAGE_KEYS = {
  links: "videosprisa.links",
  interval: "videosprisa.interval",
};

// Señales live que vienen precargadas la primera vez (o al restaurar).
const DEFAULT_LINKS = [
  "https://youtu.be/VR-x3HdhKLQ",
  "https://www.youtube.com/watch?v=m1XcdxjVGos",
  "https://www.youtube.com/watch?v=NqOmHpwMUxs",
  "https://www.youtube.com/watch?v=xCLTpcx9aO8",
  "https://www.youtube.com/watch?v=6MMXJrzT5c0",
  "https://www.youtube.com/watch?v=1HxOxiMZUNI",
  "https://www.youtube.com/watch?v=0FBiyFpV__g",
  "https://www.youtube.com/watch?v=12KqO5IBLeY",
  "https://youtu.be/hM69IdmpHsc",
];

// Audio para pilotear: se intenta cargar automáticamente desde la carpeta
// audio/ y se deja en loop. Dejá tu archivo ahí con uno de estos nombres.
const DEFAULT_AUDIO = {
  name: "0615",
  candidates: [
    "audio/0615.mp3",
    "audio/0615.m4a",
    "audio/0615.aac",
    "audio/0615.ogg",
    "audio/0615.opus",
    "audio/0615.wav",
  ],
};

// Ubicación de Santiago de Chile para el clima (Open-Meteo, sin API key).
const SANTIAGO = { lat: -33.4489, lon: -70.6693, tz: "America/Santiago" };

/* ----------------------------- Estado ---------------------------------- */
const state = {
  links: [], // [{ id, url, videoId }]
  currentIndex: 0,
  rotating: true,
  intervalSeconds: 30,
  remaining: 30,
  player: null, // YT.Player
  playerReady: false,

  audioTracks: [], // [{ id, name, url }]
  audioIndex: 0,
};

/* --------------------------- Utilidades --------------------------------- */
const $ = (sel) => document.querySelector(sel);
const uid = () => Math.random().toString(36).slice(2, 10);

// Liga un evento solo si el elemento existe (la vista "limpia" no tiene
// controles, así que el mismo app.js sirve para ambas páginas).
function on(sel, event, handler) {
  const el = $(sel);
  if (el) el.addEventListener(event, handler);
}

/**
 * Extrae el ID de video de un link de YouTube en sus formatos habituales:
 * watch?v=ID, youtu.be/ID, /live/ID, /embed/ID, /shorts/ID, o un ID pelado.
 * Devuelve null si no se puede determinar.
 */
function parseVideoId(input) {
  const raw = input.trim();
  if (!raw) return null;

  // ID pelado (11 caracteres válidos de YouTube).
  if (/^[\w-]{11}$/.test(raw)) return raw;

  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return /^[\w-]{11}$/.test(id) ? id : null;
  }

  if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    const v = url.searchParams.get("v");
    if (v && /^[\w-]{11}$/.test(v)) return v;

    const parts = url.pathname.split("/").filter(Boolean);
    const keyed = ["live", "embed", "shorts", "v"];
    const i = parts.findIndex((p) => keyed.includes(p));
    if (i !== -1 && parts[i + 1] && /^[\w-]{11}$/.test(parts[i + 1])) {
      return parts[i + 1];
    }
  }

  return null;
}

/* --------------------------- Persistencia ------------------------------- */
// Wrappers tolerantes: si el navegador bloquea localStorage (modo privado,
// escudos de privacidad, etc.), la app sigue funcionando solo en memoria.
function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* almacenamiento no disponible; seguimos en memoria */
  }
}

function saveLinks() {
  storageSet(STORAGE_KEYS.links, JSON.stringify(state.links));
}

function loadPersisted() {
  try {
    const links = JSON.parse(storageGet(STORAGE_KEYS.links) || "[]");
    if (Array.isArray(links)) state.links = links;
  } catch {
    /* ignorar datos corruptos */
  }
  // Primera vez (sin links guardados): sembrar las señales por defecto.
  if (!state.links.length) seedDefaultLinks();

  const savedInterval = parseInt(storageGet(STORAGE_KEYS.interval), 10);
  if (Number.isFinite(savedInterval) && savedInterval >= 5) {
    state.intervalSeconds = savedInterval;
  }
}

function makeLink(rawUrl) {
  const videoId = parseVideoId(rawUrl);
  if (!videoId) return null;
  return { id: uid(), url: rawUrl.trim(), videoId };
}

function seedDefaultLinks() {
  state.links = DEFAULT_LINKS.map(makeLink).filter(Boolean);
  state.currentIndex = 0;
  saveLinks();
}

/* --------------------- YouTube IFrame API ------------------------------- */
// Cargada por el script de la API (callback global obligatorio).
window.onYouTubeIframeAPIReady = function () {
  state.player = new YT.Player("yt-player", {
    width: "100%",
    height: "100%",
    playerVars: {
      autoplay: 1,
      mute: 1, // el audio propio reemplaza al original
      controls: 0,
      modestbranding: 1,
      rel: 0,
      playsinline: 1,
    },
    events: {
      onReady: () => {
        state.playerReady = true;
        state.player.mute();
        if (state.links.length) playCurrent();
      },
    },
  });
};

function loadYouTubeApi() {
  if (window.YT && window.YT.Player) {
    window.onYouTubeIframeAPIReady();
    return;
  }
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

/* --------------------------- Rotación ----------------------------------- */
function playCurrent() {
  const placeholder = $("#player-placeholder");
  const np = $("#now-playing");
  if (!state.links.length) {
    if (np) np.hidden = true;
    if (placeholder) placeholder.hidden = false;
    return;
  }
  if (placeholder) placeholder.hidden = true;

  // Mantener el índice dentro de rango.
  state.currentIndex =
    ((state.currentIndex % state.links.length) + state.links.length) %
    state.links.length;

  const link = state.links[state.currentIndex];

  if (state.playerReady && link) {
    state.player.loadVideoById(link.videoId);
    state.player.mute();
  }

  state.remaining = state.intervalSeconds;
  renderNowPlaying();
  renderLinkList();
}

function nextVideo() {
  state.currentIndex += 1;
  playCurrent();
}

function prevVideo() {
  state.currentIndex -= 1;
  playCurrent();
}

function toggleRotation() {
  state.rotating = !state.rotating;
  const btn = $("#btn-toggle");
  if (btn) {
    btn.textContent = state.rotating ? "⏸ Pausar rotación" : "▶ Reanudar rotación";
  }
}

// Tic de 1 segundo: maneja la cuenta regresiva de la rotación.
setInterval(() => {
  if (!state.rotating || state.links.length < 2) {
    renderCountdown();
    return;
  }
  state.remaining -= 1;
  if (state.remaining <= 0) {
    nextVideo();
  }
  renderCountdown();
}, 1000);

/* --------------------------- Render UI ---------------------------------- */
function renderNowPlaying() {
  const np = $("#now-playing");
  if (!np) return;
  if (!state.links.length) {
    np.hidden = true;
    return;
  }
  np.hidden = false;
  $("#np-index").textContent = `${state.currentIndex + 1}/${state.links.length}`;
  $("#np-title").textContent = state.links[state.currentIndex].url;
}

function renderCountdown() {
  const el = $("#countdown");
  if (!el) return;
  if (state.links.length < 2) {
    el.textContent = state.links.length ? "único canal" : "—";
    return;
  }
  el.textContent = state.rotating ? `${state.remaining}s` : "en pausa";
}

function renderLinkList() {
  const ul = $("#link-list");
  if (!ul) return;
  ul.innerHTML = "";

  if (!state.links.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Sin canales todavía.";
    ul.appendChild(li);
    return;
  }

  state.links.forEach((link, i) => {
    const li = document.createElement("li");
    if (i === state.currentIndex) li.className = "active";

    const label = document.createElement("span");
    label.className = "item-label";
    label.textContent = link.url;
    label.title = link.url;
    label.addEventListener("click", () => {
      state.currentIndex = i;
      playCurrent();
    });

    const remove = document.createElement("button");
    remove.className = "item-remove";
    remove.textContent = "✕";
    remove.title = "Quitar";
    remove.addEventListener("click", () => removeLink(link.id));

    li.append(label, remove);
    ul.appendChild(li);
  });
}

/* --------------------------- Acciones de links -------------------------- */
function addLink(rawUrl) {
  const link = makeLink(rawUrl);
  if (!link) {
    alert("No pude reconocer un video de YouTube en ese link.");
    return false;
  }
  state.links.push(link);
  saveLinks();
  renderLinkList();

  // Si era el primer link, arrancar a reproducir.
  if (state.links.length === 1) playCurrent();
  return true;
}

function removeLink(id) {
  const idx = state.links.findIndex((l) => l.id === id);
  if (idx === -1) return;

  const wasCurrent = idx === state.currentIndex;
  state.links.splice(idx, 1);
  if (idx < state.currentIndex) state.currentIndex -= 1;
  saveLinks();

  if (!state.links.length) {
    state.currentIndex = 0;
    if (state.playerReady) state.player.stopVideo();
    $("#player-placeholder").hidden = false;
    renderNowPlaying();
    renderLinkList();
    renderCountdown();
  } else if (wasCurrent) {
    playCurrent();
  } else {
    renderLinkList();
    renderNowPlaying();
  }
}

/* ------------------------------- Audio ---------------------------------- */
const audioEl = $("#audio-el");

function renderAudioList() {
  const ul = $("#audio-list");
  if (!ul) return;
  ul.innerHTML = "";

  if (!state.audioTracks.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Sin audio cargado.";
    ul.appendChild(li);
    return;
  }

  state.audioTracks.forEach((track, i) => {
    const li = document.createElement("li");
    if (i === state.audioIndex) li.className = "active";

    const label = document.createElement("span");
    label.className = "item-label";
    label.textContent = track.name;
    label.title = track.name;
    label.addEventListener("click", () => {
      state.audioIndex = i;
      playAudioCurrent();
    });

    const remove = document.createElement("button");
    remove.className = "item-remove";
    remove.textContent = "✕";
    remove.addEventListener("click", () => removeAudio(track.id));

    li.append(label, remove);
    ul.appendChild(li);
  });
}

function playAudioCurrent() {
  if (!state.audioTracks.length) return;
  state.audioIndex =
    ((state.audioIndex % state.audioTracks.length) + state.audioTracks.length) %
    state.audioTracks.length;

  // Con una sola pista (caso piloto) usamos loop nativo para que sea continuo.
  audioEl.loop = state.audioTracks.length === 1;

  const track = state.audioTracks[state.audioIndex];
  audioEl.src = track.url;
  audioEl.play().catch(() => {
    /* el navegador puede bloquear autoplay hasta la primera interacción */
  });
  updateAudioToggle();
  renderAudioList();
}

/**
 * Intenta cargar el audio de piloto desde la carpeta audio/ probando varias
 * extensiones. Si lo encuentra, lo agrega y lo deja sonando en loop.
 */
async function loadDefaultAudio() {
  for (const url of DEFAULT_AUDIO.candidates) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) {
        state.audioTracks.push({ id: uid(), name: DEFAULT_AUDIO.name, url });
        renderAudioList();
        playAudioCurrent();
        return;
      }
    } catch {
      /* archivo no disponible con esa extensión; seguir probando */
    }
  }
}

function addAudioFiles(fileList) {
  for (const file of fileList) {
    state.audioTracks.push({
      id: uid(),
      name: file.name,
      url: URL.createObjectURL(file),
    });
  }
  renderAudioList();
  // Arrancar si no había nada sonando.
  if (audioEl.paused && state.audioTracks.length) playAudioCurrent();
}

function removeAudio(id) {
  const idx = state.audioTracks.findIndex((t) => t.id === id);
  if (idx === -1) return;
  URL.revokeObjectURL(state.audioTracks[idx].url);
  state.audioTracks.splice(idx, 1);
  if (idx < state.audioIndex) state.audioIndex -= 1;
  if (!state.audioTracks.length) {
    audioEl.pause();
    audioEl.removeAttribute("src");
    state.audioIndex = 0;
  } else if (idx === state.audioIndex) {
    playAudioCurrent();
  }
  renderAudioList();
  updateAudioToggle();
}

function updateAudioToggle() {
  const btn = $("#audio-toggle");
  if (btn) btn.textContent = audioEl.paused ? "▶ Reproducir" : "⏸ Pausar";
}

// Al terminar una pista, pasar a la siguiente (loop de la parrilla).
audioEl.addEventListener("ended", () => {
  if (!state.audioTracks.length) return;
  state.audioIndex += 1;
  playAudioCurrent();
});

/* ----------------------- Reloj + clima Santiago ------------------------- */
const timeFmt = new Intl.DateTimeFormat("es-CL", {
  timeZone: SANTIAGO.tz,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function renderClock() {
  const el = $("#oi-time");
  if (el) el.textContent = timeFmt.format(new Date());
}

async function fetchTemperature() {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${SANTIAGO.lat}` +
    `&longitude=${SANTIAGO.lon}&current=temperature_2m` +
    `&timezone=${encodeURIComponent(SANTIAGO.tz)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const t = data?.current?.temperature_2m;
    const el = $("#oi-temp");
    if (el && typeof t === "number") {
      el.textContent = `${Math.round(t)}°C`;
    }
  } catch {
    const el = $("#oi-temp");
    if (el) el.textContent = "—";
  }
}

function startClockAndWeather() {
  renderClock();
  setInterval(renderClock, 1000);
  fetchTemperature();
  setInterval(fetchTemperature, 10 * 60 * 1000); // refrescar cada 10 min
}

// Arranca el audio tras la primera interacción (los navegadores bloquean el
// autoplay con sonido hasta que el usuario interactúa con la página).
function armAudioAutostart() {
  const tryStart = () => {
    if (state.audioTracks.length && audioEl.paused) {
      if (!audioEl.src) playAudioCurrent();
      else audioEl.play().catch(() => {});
      updateAudioToggle();
    }
  };
  document.addEventListener("pointerdown", tryStart, { once: true });
  document.addEventListener("keydown", tryStart, { once: true });
}

/* --------------------------- Eventos UI --------------------------------- */
function bindEvents() {
  on("#add-link-form", "submit", (e) => {
    e.preventDefault();
    const input = $("#link-input");
    if (addLink(input.value)) input.value = "";
  });

  on("#btn-next", "click", nextVideo);
  on("#btn-prev", "click", prevVideo);
  on("#btn-toggle", "click", toggleRotation);

  on("#btn-restore", "click", () => {
    if (!confirm("¿Restaurar la lista de canales por defecto?")) return;
    seedDefaultLinks();
    renderLinkList();
    playCurrent();
  });

  on("#interval-input", "change", (e) => {
    const val = parseInt(e.target.value, 10);
    if (Number.isFinite(val) && val >= 5) {
      state.intervalSeconds = val;
      state.remaining = val;
      storageSet(STORAGE_KEYS.interval, String(val));
    } else {
      e.target.value = state.intervalSeconds;
    }
  });

  on("#audio-input", "change", (e) => {
    if (e.target.files.length) addAudioFiles(e.target.files);
    e.target.value = ""; // permitir resubir el mismo archivo
  });

  on("#audio-toggle", "click", () => {
    if (!state.audioTracks.length) return;
    if (audioEl.paused) {
      if (!audioEl.src) playAudioCurrent();
      else audioEl.play();
    } else {
      audioEl.pause();
    }
    updateAudioToggle();
  });

  on("#audio-next", "click", () => {
    if (!state.audioTracks.length) return;
    state.audioIndex += 1;
    playAudioCurrent();
  });

  on("#audio-prev", "click", () => {
    if (!state.audioTracks.length) return;
    state.audioIndex -= 1;
    playAudioCurrent();
  });

  on("#audio-volume", "input", (e) => {
    audioEl.volume = parseFloat(e.target.value);
  });
}

/* ------------------------------- Init ----------------------------------- */
function init() {
  loadPersisted();
  const intervalInput = $("#interval-input");
  if (intervalInput) intervalInput.value = state.intervalSeconds;
  state.remaining = state.intervalSeconds;
  const volInput = $("#audio-volume");
  if (volInput) audioEl.volume = parseFloat(volInput.value);

  bindEvents();
  renderLinkList();
  renderAudioList();
  renderNowPlaying();
  renderCountdown();

  // Si ya hay canales, ocultar el placeholder aunque el video todavía no haya
  // cargado (evita mostrar "sin canales" por error mientras carga YouTube).
  const placeholder = $("#player-placeholder");
  if (placeholder && state.links.length) placeholder.hidden = true;

  startClockAndWeather();
  armAudioAutostart();
  loadDefaultAudio();
  loadYouTubeApi();
}

document.addEventListener("DOMContentLoaded", init);
