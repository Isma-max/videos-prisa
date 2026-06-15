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
function saveLinks() {
  localStorage.setItem(STORAGE_KEYS.links, JSON.stringify(state.links));
}

function loadPersisted() {
  try {
    const links = JSON.parse(localStorage.getItem(STORAGE_KEYS.links) || "[]");
    if (Array.isArray(links)) state.links = links;
  } catch {
    /* ignorar datos corruptos */
  }
  const savedInterval = parseInt(localStorage.getItem(STORAGE_KEYS.interval), 10);
  if (Number.isFinite(savedInterval) && savedInterval >= 5) {
    state.intervalSeconds = savedInterval;
  }
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
  if (!state.links.length) {
    $("#now-playing").hidden = true;
    $("#player-placeholder").hidden = false;
    return;
  }
  $("#player-placeholder").hidden = true;

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
  btn.textContent = state.rotating ? "⏸ Pausar rotación" : "▶ Reanudar rotación";
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
  if (state.links.length < 2) {
    el.textContent = state.links.length ? "único canal" : "—";
    return;
  }
  el.textContent = state.rotating ? `${state.remaining}s` : "en pausa";
}

function renderLinkList() {
  const ul = $("#link-list");
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
  const videoId = parseVideoId(rawUrl);
  if (!videoId) {
    alert("No pude reconocer un video de YouTube en ese link.");
    return false;
  }
  state.links.push({ id: uid(), url: rawUrl.trim(), videoId });
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

  const track = state.audioTracks[state.audioIndex];
  audioEl.src = track.url;
  audioEl.play().catch(() => {
    /* el navegador puede bloquear autoplay hasta la primera interacción */
  });
  updateAudioToggle();
  renderAudioList();
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
  $("#audio-toggle").textContent = audioEl.paused ? "▶ Reproducir" : "⏸ Pausar";
}

// Al terminar una pista, pasar a la siguiente (loop de la parrilla).
audioEl.addEventListener("ended", () => {
  if (!state.audioTracks.length) return;
  state.audioIndex += 1;
  playAudioCurrent();
});

/* --------------------------- Eventos UI --------------------------------- */
function bindEvents() {
  $("#add-link-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#link-input");
    if (addLink(input.value)) input.value = "";
  });

  $("#btn-next").addEventListener("click", nextVideo);
  $("#btn-prev").addEventListener("click", prevVideo);
  $("#btn-toggle").addEventListener("click", toggleRotation);

  $("#interval-input").addEventListener("change", (e) => {
    const val = parseInt(e.target.value, 10);
    if (Number.isFinite(val) && val >= 5) {
      state.intervalSeconds = val;
      state.remaining = val;
      localStorage.setItem(STORAGE_KEYS.interval, String(val));
    } else {
      e.target.value = state.intervalSeconds;
    }
  });

  $("#audio-input").addEventListener("change", (e) => {
    if (e.target.files.length) addAudioFiles(e.target.files);
    e.target.value = ""; // permitir resubir el mismo archivo
  });

  $("#audio-toggle").addEventListener("click", () => {
    if (!state.audioTracks.length) return;
    if (audioEl.paused) {
      if (!audioEl.src) playAudioCurrent();
      else audioEl.play();
    } else {
      audioEl.pause();
    }
    updateAudioToggle();
  });

  $("#audio-next").addEventListener("click", () => {
    if (!state.audioTracks.length) return;
    state.audioIndex += 1;
    playAudioCurrent();
  });

  $("#audio-prev").addEventListener("click", () => {
    if (!state.audioTracks.length) return;
    state.audioIndex -= 1;
    playAudioCurrent();
  });

  $("#audio-volume").addEventListener("input", (e) => {
    audioEl.volume = parseFloat(e.target.value);
  });
}

/* ------------------------------- Init ----------------------------------- */
function init() {
  loadPersisted();
  $("#interval-input").value = state.intervalSeconds;
  state.remaining = state.intervalSeconds;
  audioEl.volume = parseFloat($("#audio-volume").value);

  bindEvents();
  renderLinkList();
  renderAudioList();
  renderNowPlaying();
  renderCountdown();

  loadYouTubeApi();
}

document.addEventListener("DOMContentLoaded", init);
