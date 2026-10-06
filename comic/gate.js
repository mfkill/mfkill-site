// Configurazione della tendina di iscrizione a fine episodio — la
// lettura si ferma lì: i prossimi episodi vengono rilasciati man mano, e
// chi lascia la mail viene avvisato quando ne esce uno nuovo. Il pulsante
// Instagram è un'opzione in più (un semplice link).
//
// COME RILASCIARE UN NUOVO EPISODIO: basta alzare di 1 il numero in
// "triggerFromEpisodeId" qui sotto (es. 2 → 3: si legge fino alla fine
// dell'Ep.2, la tendina compare alla fine dell'Ep.2) e ricaricare questo
// file su GitHub. Le pagine degli episodi successivi non vengono nemmeno
// caricate nel sito finché non le sblocchi tu.
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
  // Id del primo episodio NON ancora rilasciato (numerazione continua di
  // manifest.js): si legge liberamente fino alla fine dell'episodio
  // precedente, dove compare la tendina. 2 = per ora solo l'Ep.1.
  triggerFromEpisodeId: 2,

  // false = l'email NON sblocca nulla: serve solo per avvisare quando esce
  // il prossimo episodio (rilascio graduale, vedi sopra). true = vecchio
  // comportamento, l'iscrizione sblocca subito tutto il resto.
  unlockOnSubscribe: false,

  formAction: "https://buttondown.com/api/emails/embed-subscribe/mfkill",

  eyebrow: "Episodio 1 completato",
  title: "Hai finito l'episodio 1",
  body: "I prossimi episodi escono man mano. Lascia la tua email e ti avviseremo appena uscirà il prossimo.",
  placeholder: "la-tua-email@esempio.it",
  buttonLabel: "Avvisami",
  successText: "Fatto — ti avviseremo.",
  alreadyText: "Sei già iscritto — ti avviseremo appena esce il prossimo episodio.",
  disclaimer: "Niente spam. Puoi disiscriverti quando vuoi.",

  // Secondario rispetto all'email (che è già il CTA principale) — solo
  // "Instagram", nessuna frase a invito.
  instagramUrl: "https://www.instagram.com/mfkillz/",
  instagramLabel: "Instagram",
};
