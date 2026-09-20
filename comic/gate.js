// Configurazione della tendina di iscrizione a fine Vol.0 — blocca la
// lettura oltre quel punto finché non lasci la tua email: è così che
// saranno accessibili i volumi futuri. Il pulsante Instagram è un'opzione
// in più (un semplice link), non sblocca nulla da solo — solo l'email lo
// fa.
//
// COME COLLEGARE UN SERVIZIO EMAIL VERO (consigliato: Buttondown, gratis
// fino a 1000 iscritti, manda da solo una mail di benvenuto senza dover
// scrivere codice):
//   1. Crea un account gratuito su https://buttondown.email
//   2. Nelle impostazioni del tuo account trovi il tuo "username"
//      (es. se il tuo profilo è buttondown.email/mfkill, lo username è "mfkill")
//   3. Sostituisci qui sotto formAction con:
//      "https://buttondown.email/api/emails/embed-subscribe/IL-TUO-USERNAME"
//   4. In Buttondown, sezione "Settings → Welcome email", scrivi il testo
//      della mail automatica che ricevono i nuovi iscritti (nessun codice,
//      si fa dalla loro interfaccia)
//
// Finché formAction resta il segnaposto qui sotto, il gate funziona lo
// stesso (sblocca la lettura sul sito) ma non manda vere email a nessuno.
// Metti formAction a stringa vuota "" per disattivare del tutto il gate
// (tutto libero, comodo in fase di test).

const GATE_CONFIG = {
  // Id dell'episodio (numerazione continua di manifest.js) a partire dal
  // quale serve iscriversi. 7 = si legge gratis tutto il Vol.0, poi serve
  // la mail per continuare nell'Episodio 7 (primo del Vol.1).
  triggerFromEpisodeId: 7,

  formAction: "https://buttondown.email/api/emails/embed-subscribe/mfkill",

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
