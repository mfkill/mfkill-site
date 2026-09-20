// Lettore condiviso del "comic" — usato da ogni cartella volX/index.html.
// Ogni pagina volume include, in questo ordine: manifest.js, gate.js, la
// costante ENTRY_PAGE (pagina globale di apertura predefinita), poi
// questo file.

const PAGE_PREFIX = "page-";
const PAGE_EXT = ".webp"; // formato più leggero del jpg a parità di qualità visiva

function pad(n) { return String(n).padStart(3, "0"); }

// ---------- Indice globale: unisce le pagine di TUTTI gli episodi (di
// tutti i volumi) in una sola sequenza continua, così lo scroll passa da
// un episodio/volume al successivo senza soluzione di continuità.
// Ogni episodio ha una sua cartella (comic/<volume>/ep<id>/) con
// numerazione locale che riparte da 1 — la pagina globale e il punto in
// cui inizia ogni episodio (ep.startPage) si calcolano qui, da soli. ----------
const PAGE_INDEX = (function build() {
  const list = [];
  let cursor = 1;      // pagina globale, su tutto il fumetto
  let volCursor = 1;   // pagina dentro il volume corrente (per il contatore in basso)
  let lastVolume = null;
  EPISODES.forEach(ep => {
    if (ep.volume !== lastVolume) { volCursor = 1; lastVolume = ep.volume; }
    ep.startPage = cursor; // calcolata automaticamente, non scriverla a mano in manifest.js
    for (let local = 1; local <= ep.pages; local++) {
      list.push({
        global: cursor,
        volume: ep.volume,
        episodeId: ep.id,
        local: local,          // posizione dentro l'episodio (usata per il nome del file)
        volumeLocal: volCursor, // posizione dentro il volume (usata per il contatore in basso)
        src: "../" + ep.volume + "/ep" + ep.id + "/" + PAGE_PREFIX + pad(local) + PAGE_EXT,
      });
      cursor++;
      volCursor++;
    }
  });
  return list;
})();

const TOTAL_PAGES = PAGE_INDEX.length;

function volumeInfo(volId) { return VOLUMES.find(v => v.id === volId); }
function entryFor(globalPage) { return PAGE_INDEX[globalPage - 1]; }
function episodesForVolume(volId) { return EPISODES.filter(ep => ep.volume === volId); }
function volumePageCount(volId) {
  return episodesForVolume(volId).reduce((sum, ep) => sum + ep.pages, 0);
}
// Pagina globale di apertura "naturale" di un volume: l'inizio del suo
// primo episodio, saltando l'eventuale copertina (coverPages) — usata dal
// selettore di volume (vedi renderEpisodeNav/buildVolumeMenu più sotto).
function volumeEntryPage(volId) {
  const eps = episodesForVolume(volId);
  if (!eps.length) return 1;
  return eps[0].startPage + (eps[0].coverPages || 0);
}

// ---------- Gate email a fine Vol.0 (vedi gate.js per il testo e il
// collegamento al servizio email) ----------
const UNLOCK_KEY = "mfkill_unlocked";
function isUnlocked() {
  try { return localStorage.getItem(UNLOCK_KEY) === "1"; } catch (e) { return false; }
}
function setUnlocked() {
  try { localStorage.setItem(UNLOCK_KEY, "1"); } catch (e) { /* localStorage non disponibile, va bene lo stesso */ }
}

const gateEpisode = (typeof GATE_CONFIG !== "undefined")
  ? EPISODES.find(ep => ep.id === GATE_CONFIG.triggerFromEpisodeId)
  : null;

// il gate è attivo solo se: è configurato un episodio soglia, esiste un
// formAction reale (non vuoto) e l'utente non ha già sbloccato prima
let gateActive = !!(gateEpisode && GATE_CONFIG.formAction && !isUnlocked());
const maxFreePage = gateEpisode ? gateEpisode.startPage - 1 : TOTAL_PAGES;

// ---------- Costruzione della striscia di pagine ----------
// Prima dello sblocco, le pagine OLTRE il gate non vengono nemmeno
// create nella pagina: non esistono nel DOM, quindi non c'è nessun modo
// (swipe veloce, tasti, link diretto) di "superarle" per sbaglio — non è
// un blocco via CSS/JS aggirabile, semplicemente quel contenuto non è lì.
// Il pulsante Instagram nella tendina resta un semplice link: solo
// l'iscrizione via email sblocca la lettura.
const scrollEl = document.getElementById("reader-scroll");
const slides = [];

function appendSlide(entry) {
  const slide = document.createElement("div");
  slide.className = "page-slide";
  slide.dataset.page = entry.global;

  const card = document.createElement("div");
  card.className = "page-card";

  const img = document.createElement("img");
  img.alt = "Pagina " + entry.local + " — " + entry.volume;
  img.loading = (entry.global <= 2) ? "eager" : "lazy";
  img.decoding = "async";
  img.src = entry.src;
  img.onerror = () => {
    card.innerHTML = '<div class="placeholder"><strong>Pagina in arrivo</strong><span>' + entry.src + ' non trovata</span></div>';
  };

  const watermark = document.createElement("div");
  watermark.className = "page-watermark";
  watermark.textContent = "MFKILL.COM";
  watermark.setAttribute("aria-hidden", "true"); // decorativo: uno screen reader non deve leggerlo su ogni tavola

  card.appendChild(img);
  card.appendChild(watermark);
  slide.appendChild(card);
  scrollEl.appendChild(slide);
  slides.push(slide);
  observer.observe(slide);
  return slide;
}

// ---------- Barra degli episodi: mostra SOLO gli episodi del volume in
// cui ti trovi in quel momento. Si ricostruisce da sola quando lo scroll
// attraversa il confine tra un volume e il successivo. ----------
const navEl = document.getElementById("episode-nav");
const volumeTagEl = document.getElementById("volume-tag");
let renderedVolume = null;
let volumeMenuEl = null;

function renderEpisodeNav(volId) {
  navEl.innerHTML = "";
  episodesForVolume(volId).forEach(ep => {
    // <button>, non <a>: sono richiami di scroll via JS, non veri link —
    // così restano raggiungibili col Tab e attivabili con Invio/Spazio
    // (un <a> senza href viene saltato dalla tastiera).
    const a = document.createElement("button");
    a.type = "button";
    a.textContent = ep.label;
    a.addEventListener("click", () => scrollToPage(ep.startPage));
    navEl.appendChild(a);
  });
  if (volumeTagEl) {
    const vol = volumeInfo(volId);
    let labelEl = volumeTagEl.querySelector(".volume-tag-label");
    if (!labelEl) {
      labelEl = document.createElement("span");
      labelEl.className = "volume-tag-label";
      volumeTagEl.insertBefore(labelEl, volumeTagEl.firstChild);
    }
    labelEl.textContent = vol ? vol.label : "";
  }
  if (volumeMenuEl) {
    Array.from(volumeMenuEl.children).forEach((btn, i) => {
      btn.classList.toggle("current", VOLUMES[i] && VOLUMES[i].id === volId);
    });
  }
  renderedVolume = volId;
}

// ---------- Selettore di volume: se ci sono più volumi, la piccola
// etichetta "VOL. 0" in alto diventa cliccabile e apre un menu compatto
// per saltare direttamente all'inizio di un altro volume, senza dover
// scorrere episodio per episodio. Con un solo volume resta un'etichetta
// passiva, come finora. ----------
function setupVolumeMenu() {
  if (!volumeTagEl || VOLUMES.length < 2) return;

  volumeTagEl.classList.add("clickable");
  volumeTagEl.setAttribute("role", "button");
  volumeTagEl.setAttribute("tabindex", "0");

  volumeMenuEl = document.createElement("div");
  volumeMenuEl.className = "volume-menu";
  VOLUMES.forEach(vol => {
    const item = document.createElement("button");
    item.type = "button";
    item.textContent = vol.label;
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      closeVolumeMenu();
      scrollToPage(volumeEntryPage(vol.id));
    });
    volumeMenuEl.appendChild(item);
  });
  volumeTagEl.appendChild(volumeMenuEl);

  volumeTagEl.addEventListener("click", (e) => {
    e.stopPropagation();
    volumeMenuEl.classList.toggle("open");
  });
  volumeTagEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      volumeMenuEl.classList.toggle("open");
    }
  });
  document.addEventListener("click", closeVolumeMenu);
}

function closeVolumeMenu() {
  if (volumeMenuEl) volumeMenuEl.classList.remove("open");
}

function updateEpisodeHighlight(volId, page) {
  const eps = episodesForVolume(volId);
  let active = eps[0];
  eps.forEach(ep => { if (ep.startPage <= page) active = ep; });
  Array.from(navEl.children).forEach((a, i) => {
    a.classList.toggle("current", eps[i] && eps[i].id === active.id);
  });
}

// ---------- Stato lettore ----------
let currentPage = 1;
let gateAutoShown = false;

// Pre-carica un paio di pagine "avanti" (e una indietro) rispetto a quella
// su cui ti trovi: normalmente il browser aspetta che una pagina lazy sia
// quasi in vista prima di scaricarla, e su uno swipe veloce questo si
// sente come un piccolo ritardo. Passandole da "lazy" a "eager" un attimo
// prima che tu ci arrivi, sono già pronte quando scorri.
const PRELOAD_AHEAD = 2;
const PRELOAD_BEHIND = 1;
function preloadAround(page) {
  for (let g = page - PRELOAD_BEHIND; g <= page + PRELOAD_AHEAD; g++) {
    const slide = slides[g - 1];
    if (!slide) continue;
    const img = slide.querySelector("img");
    if (img && img.loading !== "eager") img.loading = "eager";
  }
}

function updateHud(page) {
  const entry = entryFor(page);
  const volTotal = volumePageCount(entry.volume);

  preloadAround(page);

  if (entry.volume !== renderedVolume) {
    renderEpisodeNav(entry.volume);
  }
  updateEpisodeHighlight(entry.volume, page);

  if (entry.episodeId !== lastAudioEpisodeId) {
    lastAudioEpisodeId = entry.episodeId;
    applyTrackForEpisode(entry.episodeId);
  }

  document.getElementById("hud-current").textContent = entry.volumeLocal;
  document.getElementById("hud-total").textContent = volTotal;
  document.getElementById("hud-fill").style.width = (entry.volumeLocal / volTotal * 100) + "%";
  document.getElementById("btn-prev").disabled = page <= 1;
  document.getElementById("btn-next").disabled = page >= TOTAL_PAGES;

  history.replaceState(null, "", "#" + page);

  // se sei arrivato sull'ultima pagina libera (fine Vol.0), la tendina si
  // presenta da sola dopo una pausa (così c'è il tempo di guardarsi
  // l'ultima tavola con calma) — una volta per sessione: un tentativo di
  // andare oltre nel frattempo, con le frecce/episodi/swipe, la richiama
  // comunque subito, finché non ti iscrivi — vedi scrollToPage e i
  // listener più sotto
  if (gateActive && page === maxFreePage && !gateAutoShown) {
    gateAutoShown = true;
    setTimeout(showGate, 3000);
  }
}

function scrollToPage(n) {
  if (gateActive && n > slides.length) {
    showGate();
    n = slides.length;
  }
  n = Math.max(1, Math.min(slides.length, n));
  scrollEl.scrollTo({ left: slides[n - 1].offsetLeft, behavior: "smooth" });
}

function nextPage() { scrollToPage(currentPage + 1); }
function prevPage() { scrollToPage(currentPage - 1); }

document.getElementById("btn-next").addEventListener("click", nextPage);
document.getElementById("btn-prev").addEventListener("click", prevPage);

// ---------- Tentativo di swipe oltre l'ultima pagina libera: sul touch
// non c'è una pagina successiva a cui agganciarsi (lo scroll si blocca
// lì, senza generare eventi utili), quindi la tendina non può aspettare
// l'arrivo — deve scattare sul GESTO stesso: se sei fermo sull'ultima
// pagina libera e provi comunque a scorrere in avanti (swipe verso
// sinistra), si apre subito, ogni volta. Uno swipe all'indietro (per
// rileggere) non la richiama. ----------
let touchStartX = null;
scrollEl.addEventListener("touchstart", (e) => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });
scrollEl.addEventListener("touchend", (e) => {
  if (!gateActive || currentPage !== maxFreePage || touchStartX === null) return;
  const endX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : touchStartX;
  const swipedForward = (touchStartX - endX) > 30; // soglia minima, evita falsi positivi su un tap
  touchStartX = null;
  if (swipedForward) showGate();
}, { passive: true });

// stesso concetto per trackpad/rotellina del mouse su desktop
scrollEl.addEventListener("wheel", (e) => {
  if (gateActive && currentPage === maxFreePage && e.deltaX > 15) showGate();
}, { passive: true });

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") nextPage();
  if (e.key === "ArrowLeft") prevPage();
  if (e.key === "Escape" && gateOverlay && gateOverlay.classList.contains("visible")) hideGate();
});

// ---------- Rilevamento della pagina attiva durante lo swipe ----------
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
      const page = parseInt(entry.target.dataset.page, 10);
      if (page !== currentPage) {
        currentPage = page;
        updateHud(currentPage);
      }
    }
  });
}, { root: scrollEl, threshold: [0.6] });

// costruisce le pagine iniziali disponibili (tutte, se il gate non è
// attivo o l'utente ha già sbloccato in una visita precedente)
const initialLimit = gateActive ? maxFreePage : TOTAL_PAGES;
for (let g = 1; g <= initialLimit; g++) {
  appendSlide(PAGE_INDEX[g - 1]);
}

// ---------- Tendina di iscrizione a fine Vol.0 ----------
let gateOverlay, gateForm, gateEmailInput, gateSuccessEl;

function buildGate() {
  const wrap = document.createElement("div");
  wrap.className = "gate-overlay";
  wrap.id = "gate-overlay";
  wrap.setAttribute("role", "dialog");
  wrap.setAttribute("aria-modal", "true");
  wrap.setAttribute("aria-labelledby", "gate-title");
  wrap.innerHTML =
    '<div class="gate-card">' +
      '<button class="gate-close" id="gate-close" aria-label="Chiudi">✕</button>' +
      (gateEpisode ? '<div class="gate-eyebrow">Vol. 0 completato</div>' : '') +
      '<h2 class="gate-title" id="gate-title">' + GATE_CONFIG.title + '</h2>' +
      '<p class="gate-body">' + GATE_CONFIG.body + '</p>' +
      '<form class="gate-form" id="gate-form" target="gate-hidden-frame">' +
        '<label class="sr-only" for="gate-email">Email</label>' +
        '<input type="email" name="email" id="gate-email" required placeholder="' + GATE_CONFIG.placeholder + '">' +
        '<button type="submit">' + GATE_CONFIG.buttonLabel + '</button>' +
      '</form>' +
      '<p class="gate-success" id="gate-success">Fatto — ti avviseremo.</p>' +
      (GATE_CONFIG.instagramUrl ?
        '<a class="gate-instagram" href="' + GATE_CONFIG.instagramUrl + '" target="_blank" rel="noopener">' +
          '<svg class="gate-instagram-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
            '<rect x="3" y="3" width="18" height="18" rx="5"/>' +
            '<circle cx="12" cy="12" r="4"/>' +
            '<circle cx="17.2" cy="6.8" r="1.15" fill="currentColor" stroke="none"/>' +
          '</svg>' +
          (GATE_CONFIG.instagramLabel || "Instagram") +
        '</a>'
        : '') +
      '<p class="gate-disclaimer">' + GATE_CONFIG.disclaimer + '</p>' +
    '</div>';
  document.body.appendChild(wrap);

  // iframe nascosto: il form invia la mail al servizio esterno senza
  // ricaricare o abbandonare la pagina (funziona con qualunque servizio
  // di email marketing che offra un URL di iscrizione via form)
  const iframe = document.createElement("iframe");
  iframe.name = "gate-hidden-frame";
  iframe.style.display = "none";
  iframe.title = "invio modulo iscrizione";
  document.body.appendChild(iframe);

  gateOverlay = wrap;
  gateForm = document.getElementById("gate-form");
  gateEmailInput = document.getElementById("gate-email");
  gateSuccessEl = document.getElementById("gate-success");

  document.getElementById("gate-close").addEventListener("click", hideGate);
  wrap.addEventListener("click", (e) => { if (e.target === wrap) hideGate(); });

  gateForm.action = GATE_CONFIG.formAction;
  gateForm.method = "POST";

  gateForm.addEventListener("submit", () => {
    // Disabilita subito il pulsante: un doppio tap/click prima che il form
    // sparisca (riga sotto) non deve poter inviare due iscrizioni.
    gateForm.querySelector("button[type=submit]").disabled = true;
    // Sblocco immediato lato sito, senza aspettare risposta dal servizio
    // email (che comunque non è leggibile da qui, l'invio va all'iframe
    // nascosto): il pulsante Instagram qui sopra resta invece un semplice
    // link, non sblocca nulla — solo l'iscrizione lo fa.
    unlockReading();
    gateForm.style.display = "none";
    gateSuccessEl.classList.add("visible");
    setTimeout(hideGate, 900);
  });
}

function showGate() {
  if (!gateOverlay) buildGate();
  gateOverlay.classList.add("visible");
  setTimeout(() => gateEmailInput && gateEmailInput.focus(), 300);
}

function hideGate() {
  if (gateOverlay) gateOverlay.classList.remove("visible");
}

function unlockReading() {
  setUnlocked();
  gateActive = false;
  // aggiunge ora, dinamicamente, tutte le pagine rimaste — da qui in poi
  // lo scroll continua libero fino alla fine di tutto il comic
  for (let g = slides.length + 1; g <= TOTAL_PAGES; g++) {
    appendSlide(PAGE_INDEX[g - 1]);
  }
  scrollToPage(maxFreePage + 1);
}

// ---------- Colonna sonora per episodio ----------
// Sottofondo facoltativo (campo "audio" in manifest.js, per episodio).
// Parte solo dopo una scelta esplicita dell'utente — i browser bloccano
// comunque l'audio automatico. È una scelta unica, fatta una volta sola:
// due tasti (ON/OFF) compaiono insieme, e con un tap su uno dei due
// spariscono entrambi per sempre. "ON" attiva subito la traccia
// dell'episodio in cui ti trovi (se c'è) e da lì in poi il sottofondo
// cambia da sé, con una dissolvenza, ogni volta che lo scroll entra in un
// episodio con una traccia diversa — un episodio senza "audio" lascia
// semplicemente il sottofondo in silenzio finché non se ne raggiunge uno
// che ce l'ha. "OFF" lascia tutto muto per l'intera lettura.
// Ricorda la scelta ON/OFF fatta una volta, così a ogni ricarica o cambio
// pagina (es. Vol.0 → Vol.1, ognuno un documento a sé) non si richiede più:
// si applica subito la preferenza salvata, senza mostrare il prompt.
const SOUND_PREF_KEY = "mfkill_sound_pref";
function getSoundPref() {
  try { return localStorage.getItem(SOUND_PREF_KEY); } catch (e) { return null; }
}
function setSoundPref(v) {
  try { localStorage.setItem(SOUND_PREF_KEY, v); } catch (e) { /* va bene lo stesso */ }
}
const savedSoundPref = getSoundPref();

const soundPromptEl = document.createElement("div");
soundPromptEl.className = "sound-prompt";
soundPromptEl.innerHTML =
  '<button type="button" class="sound-choice on" aria-label="Attiva la colonna sonora">♪<span>AUDIO ON</span></button>' +
  '<button type="button" class="sound-choice off" aria-label="Lascia la lettura senza audio">✕<span>AUDIO OFF</span></button>';
if (!savedSoundPref) document.body.appendChild(soundPromptEl); // solo se non ha già scelto in passato
const soundOnBtn = soundPromptEl.querySelector(".on");
const soundOffBtn = soundPromptEl.querySelector(".off");

function dismissSoundPrompt() {
  soundPromptEl.classList.add("dismissed");
  setTimeout(() => soundPromptEl.remove(), 400);
}

const audioEl = new Audio();
audioEl.loop = true;
audioEl.preload = "none";
audioEl.volume = 0;
const AUDIO_TARGET_VOLUME = 0.38;
const AUDIO_FADE_MS = 500;

let soundOn = false;
let currentAudioTrack = null; // percorso (relativo) attualmente caricato
let lastAudioEpisodeId = null;
let fadeRAF = null;

function fadeAudio(to, ms, onDone) {
  if (fadeRAF) cancelAnimationFrame(fadeRAF);
  const from = audioEl.volume;
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / ms);
    audioEl.volume = from + (to - from) * t;
    if (t < 1) {
      fadeRAF = requestAnimationFrame(step);
    } else {
      fadeRAF = null;
      if (onDone) onDone();
    }
  }
  fadeRAF = requestAnimationFrame(step);
}

// Pre-scarica (senza riprodurre) le tracce degli episodi adiacenti mentre
// l'utente legge quello corrente, così quando la pagina attraversa il
// confine tra un episodio e l'altro il file è già in cache del browser
// (vedi _headers: /comic/audio/* è cache immutabile di 1 anno) e il cambio
// traccia è istantaneo invece di aspettare il download in quel momento.
const prefetchedTracks = new Set();
function prefetchTrack(track) {
  if (!track || prefetchedTracks.has(track)) return;
  prefetchedTracks.add(track);
  fetch(track).catch(() => {});
}
function prefetchNeighborTracks(epId) {
  if (!soundOn) return; // non scaricare audio extra se l'utente non l'ha attivato
  [epId - 1, epId + 1].forEach(id => {
    const ep = EPISODES.find(e => e.id === id);
    if (ep && ep.audio) prefetchTrack("../" + ep.audio);
  });
}

function applyTrackForEpisode(epId) {
  const ep = EPISODES.find(e => e.id === epId);
  const track = ep && ep.audio ? "../" + ep.audio : null;

  prefetchNeighborTracks(epId);

  if (track === currentAudioTrack) return; // stesso episodio/stessa traccia, niente da fare

  if (!soundOn) { currentAudioTrack = track; return; } // aggiorna solo il riferimento, senza suonare

  fadeAudio(0, AUDIO_FADE_MS, () => {
    currentAudioTrack = track;
    if (!track) { audioEl.pause(); return; }
    audioEl.src = track;
    audioEl.currentTime = 0;
    audioEl.play().catch(() => { /* riprovare al prossimo tap è inutile forzarlo */ });
    fadeAudio(AUDIO_TARGET_VOLUME, AUDIO_FADE_MS);
  });
}

// ---------- Tastino "♪" fisso in alto, di fianco al VOL. — resta sempre
// visibile e permette di riattivare/silenziare l'audio in qualsiasi
// momento della lettura, anche dopo la prima scelta ON/OFF iniziale. ----------
const soundToggleBtn = document.getElementById("sound-toggle-btn");

function updateSoundToggleBtn() {
  if (!soundToggleBtn) return;
  soundToggleBtn.classList.toggle("muted", !soundOn);
  soundToggleBtn.textContent = soundOn ? "♪" : "♪̶";
  soundToggleBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
}

function turnSoundOn() {
  soundOn = true;
  const entry = entryFor(currentPage);
  const ep = EPISODES.find(e => e.id === entry.episodeId);
  const track = ep && ep.audio ? "../" + ep.audio : null;

  prefetchNeighborTracks(entry.episodeId);

  if (track && track === currentAudioTrack && audioEl.src) {
    // stessa traccia già caricata (solo messa in pausa da un OFF precedente)
    audioEl.play().then(() => fadeAudio(AUDIO_TARGET_VOLUME, AUDIO_FADE_MS)).catch(() => {});
  } else if (track) {
    audioEl.src = track;
    audioEl.currentTime = 0;
    audioEl.play().then(() => fadeAudio(AUDIO_TARGET_VOLUME, AUDIO_FADE_MS)).catch(() => {});
    currentAudioTrack = track;
  } else {
    currentAudioTrack = null;
  }
  updateSoundToggleBtn();
}

function turnSoundOff() {
  soundOn = false; // resta muto finché non lo riattivi dal tastino
  fadeAudio(0, AUDIO_FADE_MS, () => audioEl.pause());
  updateSoundToggleBtn();
}

soundOnBtn.addEventListener("click", () => {
  turnSoundOn();
  setSoundPref("on");
  dismissSoundPrompt();
});

soundOffBtn.addEventListener("click", () => {
  turnSoundOff();
  setSoundPref("off");
  dismissSoundPrompt();
});

if (soundToggleBtn) {
  soundToggleBtn.addEventListener("click", () => {
    if (soundOn) { turnSoundOff(); } else { turnSoundOn(); }
    setSoundPref(soundOn ? "on" : "off");
    dismissSoundPrompt(); // se non era ancora stata chiusa, la scelta è ormai fatta
  });
  updateSoundToggleBtn(); // stato iniziale: muto, finché non si sceglie
}

// Se la preferenza era già salvata, applicala subito senza mostrare il
// prompt (il prompt non è stato nemmeno inserito nella pagina, vedi sopra).
if (savedSoundPref === "on") {
  turnSoundOn();
} else if (savedSoundPref === "off") {
  updateSoundToggleBtn(); // resta muto, ma l'icona riflette comunque lo stato
}

setupVolumeMenu();

// ---------- Init: apre sulla pagina indicata nell'URL, o su ENTRY_PAGE ----------
(function init() {
  const hash = location.hash.replace("#", "");
  const n = parseInt(hash, 10);
  const fallback = (typeof ENTRY_PAGE !== "undefined") ? ENTRY_PAGE : 1;
  let startPage = (!isNaN(n) && n >= 1 && n <= TOTAL_PAGES) ? n : fallback;

  // non si può arrivare via link diretto oltre il gate: se non ancora
  // sbloccato, il punto di apertura più avanzato possibile è l'ultima
  // pagina libera
  if (gateActive && startPage > maxFreePage) {
    startPage = maxFreePage;
  }

  currentPage = startPage;
  updateHud(startPage);
  requestAnimationFrame(() => {
    scrollEl.scrollTo({ left: slides[startPage - 1].offsetLeft, behavior: "auto" });
  });
})();
