// Configurazione della tendina di iscrizione a fine Vol.0 — blocca la
// lettura oltre quel punto finché non lasci la tua email: è così che
// saranno accessibili i volumi futuri. Il pulsante Instagram è un'opzione
// in più (un semplice link), non sblocca nulla da solo — solo l'email lo
// fa.
//
// SERVIZIO EMAIL COLLEGATO: Buttondown (account di Mario, username
// "mfkill" — verificato in Settings → Basics → Username su
// buttondown.com). Le iscrizioni arrivano davvero: si vedono nella
// sezione "Subscribers" del suo account Buttondown.
//
// L'invio del modulo apre una scheda del browser a parte verso
// Buttondown (richiesto da Buttondown stesso: un invio "nascosto" via
// iframe può perdere silenziosamente l'iscrizione se serve un CAPTCHA o
// la mail non è valida — vedi reader.js, buildGate()). Sul sito la
// tendina si chiude comunque subito, senza aspettare quella scheda.
//
// Per cambiare il testo che ricevono i nuovi iscritti: su buttondown.com,
// sezione "Settings → Welcome email" (nessun codice, si fa dalla loro
// interfaccia).
//
// Metti formAction a stringa vuota "" per disattivare del tutto il gate
// (tutto libero, comodo in fase di test).

const GATE_CONFIG = {
  // Id dell'episodio (numerazione continua di manifest.js) a partire dal
  // quale serve iscriversi. 7 = si legge gratis tutto il Vol.0, poi serve
  // la mail per continuare nell'Episodio 7 (primo del Vol.1).
  triggerFromEpisodeId: 7,

  formAction: "https://buttondown.com/api/emails/embed-subscribe/mfkill",

  title: "Hai finito il Vol. 0",
  body: "Sblocca subito il resto del fumetto con la tua email. Riceverai una mail ogni volta che uscirà un nuovo episodio di MF KILL.",
  placeholder: "la-tua-email@esempio.it",
  buttonLabel: "Continua a leggere",
  disclaimer: "Niente spam. Puoi disiscriverti quando vuoi.",

  // Secondario rispetto all'email (che è già il CTA principale) — solo
  // "Instagram", nessuna frase a invito.
  instagramUrl: "https://www.instagram.com/mfkillz/",
  instagramLabel: "Instagram",
};
