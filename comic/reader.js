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
  if (typeof resetZoom === "function") resetZoom(); // ogni tavola nuova riparte sempre a zoom 1×

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

  // (niente più history.replaceState qui: vedi il commento in fondo al
  // file, sopra init(), sul perché la pagina corrente NON va più scritta
  // nell'URL — restava "incollata" nella barra degli indirizzi/cronologia
  // e faceva ripartire le visite successive da lì invece che dall'inizio)

  // se sei arrivato sull'ultima pagina libera (fine Vol.0), la tendina si
  // presenta da sola dopo una pausa (così c'è il tempo di guardarsi
  // l'ultima tavola con calma) — una volta per sessione: un tentativo di
  // andare oltre nel frattempo, con le frecce/episodi/swipe, la richiama
  // comunque subito, finché non ti iscrivi — vedi scrollToPage e i
  // listener più sotto
  if (gateActive && page === maxFreePage && !gateAutoShown) {
    gateAutoShown = true;
    setTimeout(showGate, 5000);
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
// Durante uno swipe veloce può capitare che DUE tavole superino insieme la
// soglia nello stesso "batch" di IntersectionObserver (quella che esce e
// quella che entra) — prendendo semplicemente l'ultima della lista si
// rischiava di impostare la pagina sbagliata (quella che sta uscendo, se
// il browser la riporta per seconda), con l'effetto di "tornare indietro"
// per un istante e dare l'impressione di vedere due volte la stessa
// tavola. Ora si sceglie sempre quella con la percentuale di visibilità
// più alta nel batch, indipendentemente dall'ordine in cui il browser le
// riporta.
const observer = new IntersectionObserver((entries) => {
  let best = null;
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
      if (!best || entry.intersectionRatio > best.intersectionRatio) best = entry;
    }
  });
  if (best) {
    const page = parseInt(best.target.dataset.page, 10);
    if (page !== currentPage) {
      currentPage = page;
      updateHud(currentPage);
    }
  }
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
      '<form class="gate-form" id="gate-form" target="_blank" rel="noopener">' +
        '<label class="sr-only" for="gate-email">Email</label>' +
        '<input type="email" name="email" id="gate-email" required placeholder="' + GATE_CONFIG.placeholder + '">' +
        '<input type="hidden" name="embed" value="1">' +
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
    // L'invio vero e proprio va a Buttondown in una scheda a parte
    // (target="_blank": Buttondown lo richiede esplicitamente — un invio
    // "nascosto" via iframe può fallire in silenzio se serve un CAPTCHA o
    // la mail non è valida). Sul sito, intanto, si sblocca subito senza
    // aspettare risposta: il pulsante Instagram qui sopra resta invece un
    // semplice link, non sblocca nulla — solo l'iscrizione lo fa.
    unlockReading();
    gateForm.style.display = "none";
    gateSuccessEl.classList.add("visible");
    setTimeout(hideGate, 900);
  });
}

function showGate() {
  if (typeof setImmersive === "function") setImmersive(false); // la tendina va vista con l'interfaccia normale attorno
  if (typeof resetZoom === "function") resetZoom();
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
let currentAudioTrack = null; // percorso della traccia che "dovrebbe" suonare in base alla pagina (vedi loadedAudioTrack più sotto)
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

// currentAudioTrack: quale traccia "dovrebbe" suonare in base alla pagina
// attuale (aggiornata sempre, anche muta). loadedAudioTrack: quale traccia è
// REALMENTE caricata dentro audioEl in questo momento (aggiornata solo
// quando si tocca audioEl.src per davvero). Sono due cose diverse: se si
// silenzia l'audio e poi si cambia episodio scorrendo, la prima cambia ma
// la seconda no — servono entrambe per capire, alla riattivazione, se
// basta riprendere quella già caricata o se bisogna caricarne una nuova.
let loadedAudioTrack = null;

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
    loadedAudioTrack = track;
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

  if (track && track === loadedAudioTrack) {
    // è davvero la traccia già caricata in audioEl (solo messa in pausa da
    // un OFF precedente, e non si è cambiato episodio nel frattempo)
    audioEl.play().then(() => fadeAudio(AUDIO_TARGET_VOLUME, AUDIO_FADE_MS)).catch(() => {});
  } else if (track) {
    audioEl.src = track;
    loadedAudioTrack = track;
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

// ---------- Tastino "condividi", di fianco a quello audio: sul telefono
// apre la scheda di condivisione nativa (l'utente sceglie WhatsApp,
// Messaggi, Telegram, Mail, ecc.); se il browser non la supporta (quasi
// sempre il caso su desktop) apre direttamente una chat WhatsApp Web/
// Desktop già pronta con il messaggio; se anche questo fallisce, copia
// il link negli appunti come ultima spiaggia. ----------
const shareBtn = document.getElementById("share-btn");
const SHARE_URL = "https://mfkill.com";
const SHARE_TEXT = "MF KILL — leggi gratis il fumetto:";

function flashShareBtn(symbol) {
  if (!shareBtn) return;
  const original = shareBtn.textContent;
  shareBtn.textContent = symbol;
  setTimeout(() => { shareBtn.textContent = original; }, 1500);
}

if (shareBtn) {
  shareBtn.addEventListener("click", async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "MF KILL", text: SHARE_TEXT, url: SHARE_URL });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return; // l'utente ha chiuso la scheda di condivisione, nessun fallback
      }
    }
    try {
      window.open("https://wa.me/?text=" + encodeURIComponent(SHARE_TEXT + " " + SHARE_URL), "_blank", "noopener");
    } catch (err) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(SHARE_URL).then(() => flashShareBtn("✓")).catch(() => {});
      }
    }
  });
}

// ---------- Modalità immersiva: un tap sulla tavola nasconde barra in
// alto, HUD e frecce, lasciando solo il disegno a schermo intero — lo
// scroll orizzontale a scatti resta identico. Un altro tap le fa
// ricomparire. Il tap va distinto da uno swipe/trascinamento: si
// riconosce solo se il puntatore non si è spostato più di qualche pixel
// tra down e up, altrimenti ogni scorrimento attiverebbe/disattiverebbe
// la modalità per sbaglio. Pointer Events copre in un colpo solo touch,
// mouse e penna (niente logica separata per click vs touch).
let immersive = false;
function setImmersive(on) {
  immersive = on;
  document.body.classList.toggle("immersive", immersive);
  // Nascondere/mostrare barra e HUD non cambia le dimensioni della
  // finestra, ma su mobile può far comparire/sparire la barra degli
  // indirizzi del browser (l'altezza "visibile" cambia), e con essa la
  // larghezza calcolata della tavola (100dvh nel CSS) — riallineandosi
  // subito alla pagina corrente si evita di restare a metà tra una
  // tavola e l'altra.
  requestAnimationFrame(() => {
    const slide = slides[currentPage - 1];
    if (slide) scrollEl.scrollTo({ left: slide.offsetLeft, behavior: "auto" });
  });
}
function toggleImmersive() { setImmersive(!immersive); }

// ---------- Zoom sulla tavola (pizzico con due dita o doppio tap, come
// nell'app Foto) + il tap per lo schermo intero qui sopra: un'unica
// gestione dei puntatori distingue i gesti sulla tavola VISIBILE in quel
// momento (currentPage):
// - un dito fermo (tap) -> schermo intero (con un piccolo ritardo, per
//   lasciare il tempo a un eventuale secondo tap di arrivare)
// - due tap ravvicinati nello stesso punto -> zoom avanti/indietro
// - due dita che si allontanano/avvicinano -> zoom continuo (pinch)
// - un dito che trascina QUANDO la tavola è già ingrandita -> sposta
//   l'inquadratura invece di cambiare pagina (lo swipe orizzontale per
//   cambiare pagina resta sospeso finché non si torna a zoom 1×)
const ZOOM_MAX = 4;
const ZOOM_DOUBLE_TAP = 2.5;
const TAP_MOVE_TOLERANCE = 10;   // px — oltre, è uno swipe/trascinamento, non un tap
const TAP_MAX_DURATION = 500;    // ms — oltre, è una pressione prolungata, non un tap
const DOUBLE_TAP_WINDOW = 300;   // ms tra un tap e l'altro per contare come doppio tap

let zoomScale = 1, zoomTx = 0, zoomTy = 0;
let zoomedSlide = null; // la slide che porta l'eventuale zoom applicato ora
const activePointers = new Map(); // pointerId -> {x, y}
let gestureMode = null;  // null | "pinch" | "pan"
let pinchStartDist = 0, pinchStartScale = 1;
let panStartX = 0, panStartY = 0, panOriginTx = 0, panOriginTy = 0;
let tapCandidate = null; // {x, y, time} del pointerdown in corso, per riconoscere un tap
let singleTapTimer = null;
let lastTapTime = 0, lastTapX = 0, lastTapY = 0;

function currentZoomImg() {
  const slide = slides[currentPage - 1];
  return slide ? slide.querySelector(".page-card img") : null;
}
function currentZoomCard() {
  const slide = slides[currentPage - 1];
  return slide ? slide.querySelector(".page-card") : null;
}
function pointerDist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function applyZoom() {
  const img = currentZoomImg();
  const slide = slides[currentPage - 1];
  if (!img || !slide) return;
  img.style.transform = zoomScale === 1 ? "" : "translate(" + zoomTx + "px," + zoomTy + "px) scale(" + zoomScale + ")";
  const zoomed = zoomScale > 1.01;
  slide.classList.toggle("zoomed", zoomed);
  scrollEl.classList.toggle("zoom-active", zoomed); // sospende lo swipe orizzontale (vedi CSS)
  zoomedSlide = zoomed ? slide : null;
}

// L'immagine ingrandita non può essere trascinata oltre i propri bordi
// (come nell'app Foto): il trascinamento massimo è metà dell'eccedenza
// creata dallo zoom, dato che scala attorno al proprio centro.
function clampPan() {
  const card = currentZoomCard();
  if (!card) return;
  const maxTx = Math.max(0, (card.offsetWidth * (zoomScale - 1)) / 2);
  const maxTy = Math.max(0, (card.offsetHeight * (zoomScale - 1)) / 2);
  zoomTx = Math.max(-maxTx, Math.min(maxTx, zoomTx));
  zoomTy = Math.max(-maxTy, Math.min(maxTy, zoomTy));
}

// Riporta a zoom 1× la tavola eventualmente ingrandita — richiamata ad
// ogni cambio pagina, così ogni tavola nuova si apre sempre "pulita".
function resetZoom() {
  zoomScale = 1; zoomTx = 0; zoomTy = 0;
  if (zoomedSlide) {
    const img = zoomedSlide.querySelector(".page-card img");
    if (img) { img.style.transform = ""; img.style.transition = ""; }
    zoomedSlide.classList.remove("zoomed");
  }
  scrollEl.classList.remove("zoom-active");
  zoomedSlide = null;
}

function setZoomTo(scale) {
  zoomScale = Math.max(1, Math.min(ZOOM_MAX, scale));
  if (zoomScale <= 1.01) { zoomScale = 1; zoomTx = 0; zoomTy = 0; }
  clampPan();
  applyZoom();
}

scrollEl.addEventListener("pointerdown", (e) => {
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (activePointers.size === 1) {
    tapCandidate = { x: e.clientX, y: e.clientY, time: Date.now() };
    panStartX = e.clientX; panStartY = e.clientY;
    panOriginTx = zoomTx; panOriginTy = zoomTy;
    gestureMode = null; // deciso al primo movimento vero (vedi pointermove)
  } else if (activePointers.size === 2) {
    if (singleTapTimer) { clearTimeout(singleTapTimer); singleTapTimer = null; }
    tapCandidate = null;
    gestureMode = "pinch";
    const img = currentZoomImg();
    if (img) img.style.transition = "none";
    const pts = Array.from(activePointers.values());
    pinchStartDist = pointerDist(pts[0], pts[1]) || 1;
    pinchStartScale = zoomScale;
  }
});

scrollEl.addEventListener("pointermove", (e) => {
  if (!activePointers.has(e.pointerId)) return;
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (gestureMode === "pinch" && activePointers.size >= 2) {
    const pts = Array.from(activePointers.values());
    const d = pointerDist(pts[0], pts[1]) || 1;
    zoomScale = Math.max(1, Math.min(ZOOM_MAX, pinchStartScale * (d / pinchStartDist)));
    clampPan();
    applyZoom();
  } else if (activePointers.size === 1 && zoomScale > 1.01) {
    const dx = e.clientX - panStartX, dy = e.clientY - panStartY;
    if (gestureMode !== "pan" && (Math.abs(dx) > TAP_MOVE_TOLERANCE || Math.abs(dy) > TAP_MOVE_TOLERANCE)) {
      gestureMode = "pan";
      const img = currentZoomImg();
      if (img) img.style.transition = "none";
    }
    if (gestureMode === "pan") {
      zoomTx = panOriginTx + dx;
      zoomTy = panOriginTy + dy;
      clampPan();
      applyZoom();
    }
  }
});

function endPointer(e) {
  activePointers.delete(e.pointerId);

  if (activePointers.size === 0) {
    if (gestureMode === "pinch" || gestureMode === "pan") {
      const img = currentZoomImg();
      if (img) img.style.transition = "";
      if (gestureMode === "pinch" && zoomScale <= 1.05) resetZoom();
    }

    // fine di un tap "semplice": un solo dito, niente pinch/trascinamento nel mezzo
    if (tapCandidate && gestureMode !== "pinch" && gestureMode !== "pan") {
      const dx = Math.abs(e.clientX - tapCandidate.x);
      const dy = Math.abs(e.clientY - tapCandidate.y);
      const dt = Date.now() - tapCandidate.time;
      if (dx < TAP_MOVE_TOLERANCE && dy < TAP_MOVE_TOLERANCE && dt < TAP_MAX_DURATION) {
        const now = Date.now();
        const isDoubleTap = (now - lastTapTime) < DOUBLE_TAP_WINDOW &&
          Math.abs(e.clientX - lastTapX) < 40 && Math.abs(e.clientY - lastTapY) < 40;
        if (isDoubleTap) {
          if (singleTapTimer) { clearTimeout(singleTapTimer); singleTapTimer = null; }
          lastTapTime = 0; // un eventuale terzo tap non va letto come un altro doppio tap
          setZoomTo(zoomScale > 1.01 ? 1 : ZOOM_DOUBLE_TAP);
        } else {
          lastTapTime = now; lastTapX = e.clientX; lastTapY = e.clientY;
          // un solo tap: aspetta un momento (potrebbe diventare un doppio
          // tap prima che scada) prima di attivare/disattivare lo schermo intero
          singleTapTimer = setTimeout(() => { singleTapTimer = null; toggleImmersive(); }, DOUBLE_TAP_WINDOW - 20);
        }
      }
    }
    gestureMode = null;
    tapCandidate = null;
  } else if (activePointers.size === 1) {
    // da due dita a una: se stavi facendo un pinch, il dito rimasto
    // continua come trascinamento, senza salti
    if (gestureMode === "pinch") {
      const [remaining] = Array.from(activePointers.values());
      panStartX = remaining.x; panStartY = remaining.y;
      panOriginTx = zoomTx; panOriginTy = zoomTy;
      gestureMode = null; // riparte da capo: pointermove lo trasforma in "pan" se c'è movimento vero
    }
    tapCandidate = null; // non è un tap se si arriva da due dita
  }
}
scrollEl.addEventListener("pointerup", endPointer);
scrollEl.addEventListener("pointercancel", endPointer);

setupVolumeMenu();

// ---------- Init: apre sempre su ENTRY_PAGE ----------
// In passato la pagina raggiunta veniva scritta nell'URL (#N) tramite
// history.replaceState, con l'idea di poter riprendere da lì con un
// refresh. In pratica quel numero restava "incollato" nella barra degli
// indirizzi (e quindi nella cronologia/negli autocompletamenti del
// browser): riaprendo il sito più tardi — anche da un link o QR code che
// punta alla pagina "pulita" — capitava di ripartire da lì invece che
// dall'inizio dell'Ep.1. Ora l'apertura è sempre e solo ENTRY_PAGE: niente
// più lettura né scrittura dell'hash nell'URL.
(function init() {
  const fallback = (typeof ENTRY_PAGE !== "undefined") ? ENTRY_PAGE : 1;
  let startPage = fallback;

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

// ---------- Riallineamento dopo resize/rotazione ----------
// La striscia scorre a pixel (scrollLeft), ma le pagine sono larghe in %
// (flex 0 0 100%): se le dimensioni della viewport cambiano MENTRE sei
// fermo su una pagina — barra indirizzi del telefono che compare/scompare
// durante lo scroll, rotazione dello schermo, tastiera che si apre per la
// tendina email — lo scrollLeft resta quello di prima, ma non punta più
// esattamente all'inizio della pagina corrente: il risultato è vedere per
// un istante un pezzo della tavola precedente o successiva insieme a
// quella attuale (a volte scambiato per "la stessa pagina due volte").
// Al resize, si riallinea subito (senza animazione) alla pagina che stavi
// leggendo.
let resizeRAF = null;
window.addEventListener("resize", () => {
  if (resizeRAF) cancelAnimationFrame(resizeRAF);
  resizeRAF = requestAnimationFrame(() => {
    const slide = slides[currentPage - 1];
    if (slide) scrollEl.scrollTo({ left: slide.offsetLeft, behavior: "auto" });
  });
});

// Se la preferenza era già salvata su "ON", applicala senza mostrare il
// prompt (il prompt non è stato nemmeno inserito nella pagina, vedi sopra) —
// MA i browser bloccano l'avvio dell'audio se non c'è un gesto esplicito
// dell'utente nel mezzo (tap, click, scroll...): un semplice caricamento di
// pagina non basta, e forzarlo qui fallirebbe in silenzio. Quindi l'icona
// riflette subito lo stato "acceso", e la riproduzione vera e propria parte
// al primo gesto sulla pagina — che in pratica coincide con l'inizio della
// lettura (il primo scroll/tap per girare pagina).
if (savedSoundPref === "on") {
  soundOn = true;
  updateSoundToggleBtn();
  // Pre-scarica già ORA (in parallelo alla lettura) la traccia
  // dell'episodio di apertura: sappiamo già che questo visitatore vuole
  // l'audio, quindi non serve aspettare il primo gesto per iniziare il
  // download — così, quando arriva il tap/scroll che sblocca la
  // riproduzione, il file è già in cache e parte quasi subito.
  if (currentAudioTrack) prefetchTrack(currentAudioTrack);
  const startOnFirstGesture = () => { turnSoundOn(); };
  ["pointerdown", "touchstart", "wheel", "keydown"].forEach(evt =>
    document.addEventListener(evt, startOnFirstGesture, { once: true, passive: true })
  );
} else if (savedSoundPref === "off") {
  updateSoundToggleBtn(); // resta muto, ma l'icona riflette comunque lo stato
}
