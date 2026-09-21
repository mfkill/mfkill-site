// Manifest globale del "comic": tutti i volumi e tutti gli episodi in un
// solo posto. Modifica SOLO questo file quando aggiungi un episodio o un
// volume — il lettore (reader.js) calcola tutto il resto da solo (a che
// pagina globale inizia ogni episodio, quante pagine ha ogni volume):
// tu indichi solo QUANTE PAGINE ha ogni episodio, nient'altro.

// Ogni volume: id (= nome della sua cartella) e label mostrata.
const VOLUMES = [
  { id: "vol0", label: "VOL. 0" },
  { id: "vol1", label: "VOL. 1" },
  // { id: "vol2", label: "VOL. 2" },
];

// Ogni episodio: id progressivo (continua tra i volumi, non riparte da 1
// — Ep.1-5 nel Vol.0 (Ep.5 è l'ultimo del volume), poi Ep.7 in poi nel
// Vol.1), label mostrata, a quale volume appartiene, e QUANTE PAGINE ha.
// Le pagine di ogni episodio vanno messe nella cartella
// comic/<volume>/ep<id>/ — vedi il README.
const EPISODES = [
  // coverPages: 1 = la prima pagina di questo episodio è una copertina —
  // resta leggibile scorrendo indietro, ma l'apertura da QR code la salta
  // e mostra subito la prima tavola numerata (vedi ENTRY_PAGE in index.html).
  // audio: colonna sonora di sottofondo per l'episodio (facoltativa) — va
  // messa in comic/audio/<file>. Parte solo se l'utente attiva l'audio col
  // tasto speaker, e cambia da sola (con un dissolvenza) quando si passa
  // a un episodio successivo. Un episodio senza "audio" resta silenzioso.
  { id: 1, label: "EP. 1", volume: "vol0", pages: 16, coverPages: 1, audio: "audio/ep1-v2.mp3" },
  { id: 2, label: "EP. 2", volume: "vol0", pages: 9, audio: "audio/ep2-v2.mp3" },
  { id: 3, label: "EP. 3", volume: "vol0", pages: 10, audio: "audio/ep3-v2.mp3" },
  { id: 4, label: "EP. 4", volume: "vol0", pages: 8, audio: "audio/ep4-v2.mp3" },
  { id: 5, label: "EP. 5", volume: "vol0", pages: 6, audio: "audio/ep5-v2.mp3" },
  { id: 7, label: "EP. 7", volume: "vol1", pages: 1 }, // solo tavola "coming soon", in attesa delle tavole vere
  // { id: 8, label: "EP. 8", volume: "vol1", pages: 8 },
];
