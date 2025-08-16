import { GoogleGenerativeAI } from "@google/generative-ai";

// Import delle costanti con fallback se non esistono
let GEMINI_MODEL_NAME, OPENROUTER_MODEL_NAME;
try {
  const constants = await import('../constants.js');
  GEMINI_MODEL_NAME = constants.GEMINI_MODEL_NAME || 'gemini-1.5-flash';
  OPENROUTER_MODEL_NAME = constants.OPENROUTER_MODEL_NAME || 'mistralai/mistral-7b-instruct:free';
} catch (error) {
  console.warn('⚠️ constants.js non trovato, uso valori di default');
  GEMINI_MODEL_NAME = 'gemini-1.5-flash';
  OPENROUTER_MODEL_NAME = 'mistralai/mistral-7b-instruct:free';
}

// Import dei servizi con gestione errori
let fetchExternalMatchData = null;
let callOpenRouterLLM = null;

try {
  const sportsModule = await import('./sportsApiService.js');
  fetchExternalMatchData = sportsModule.fetchExternalMatchData;
  console.log('✅ sportsApiService.js caricato con successo');
} catch (error) {
  console.warn('⚠️ sportsApiService.js non caricato:', error.message);
}

try {
  const openRouterModule = await import('./openRouterService.js');
  callOpenRouterLLM = openRouterModule.callOpenRouterLLM;
  console.log('✅ openRouterService.js caricato con successo');
} catch (error) {
  console.warn('⚠️ openRouterService.js non caricato:', error.message);
}

// Tipi importati come JSDoc per riferimento, dato che siamo in JS
/**
 * @typedef {Object} MatchInput
 * @property {string} homeTeam - Nome della squadra di casa
 * @property {string} awayTeam - Nome della squadra ospite
 * @property {string} [league] - Nome della lega/competizione
 * @property {string} [matchDate] - Data della partita
 */

/**
 * @typedef {Object} GeminiPredictionResponse
 * @property {Object} parsed - Dati predizione parsati
 * @property {string} rawText - Testo grezzo della risposta
 * @property {Array} searchSources - Fonti di ricerca web
 * @property {Object} externalSportsData - Dati sportivi esterni
 * @property {string} [refinementIssue] - Messaggio sui problemi di raffinamento
 * @property {string} [sportsApiError] - Errore API sportiva
 */

const formatSportsDataForPrompt = (sportsData, homeTeamNameInput, awayTeamNameInput) => {
  if (!sportsData || !sportsData.matchData) {
    return "Nessun dato statistico dettagliato fornito dall'API sportiva esterna per questa partita. Basa l'analisi su conoscenze generali e ricerca web.";
  }

  const md = sportsData.matchData;
  let promptData = "\nDATI STATISTICI DETTAGLIATI FORNITI DA API ESTERNA (USA QUESTI COME FONTE PRIMARIA PER LE STATISTICHE NUMERICHE E VALUTAZIONI DI FORMA):\n";
  
  promptData += `Partita: ${md.homeTeamStats?.teamName || homeTeamNameInput} vs ${md.awayTeamStats?.teamName || awayTeamNameInput}\n`;
  if (md.leagueName) promptData += `Lega: ${md.leagueName}`;
  if (md.seasonYear) promptData += `, Stagione: ${md.seasonYear}\n`;
  if (md.stadium) promptData += `Stadio: ${md.stadium}\n`;
  if (md.referee) promptData += `Arbitro: ${md.referee}\n`;
  
  const formatTeamStats = (stats, teamNameIfMissing) => {
    if (!stats) return `  Statistiche per ${teamNameIfMissing} non disponibili.\n`;
    let teamStr = `Squadra: ${stats.teamName || teamNameIfMissing} (ID: ${stats.teamId || 'N/A'})\n`;
    if (stats.leagueSeason?.leagueName) teamStr += `  - Lega Analizzata: ${stats.leagueSeason.leagueName} (${stats.leagueSeason.seasonYear})\n`;
    if (stats.form) teamStr += `  - Forma Recente: ${stats.form}\n`;
    if (stats.fixturesPlayed) teamStr += `  - Partite Giocate: ${stats.fixturesPlayed}\n`;
    if (stats.wins) teamStr += `  - Vittorie: ${stats.wins}\n`;
    if (stats.draws) teamStr += `  - Pareggi: ${stats.draws}\n`;
    if (stats.loses) teamStr += `  - Sconfitte: ${stats.loses}\n`;
    if (stats.goalsFor?.total !== null && stats.goalsFor?.total !== undefined) teamStr += `  - Gol Fatti: ${stats.goalsFor.total} (Media: ${stats.goalsFor.average || 'N/A'})\n`;
    if (stats.goalsAgainst?.total !== null && stats.goalsAgainst?.total !== undefined) teamStr += `  - Gol Subiti: ${stats.goalsAgainst.total} (Media: ${stats.goalsAgainst.average || 'N/A'})\n`;
    if (stats.cleanSheets) teamStr += `  - Partite Senza Subire Gol (Clean Sheets): ${stats.cleanSheets}\n`;
    if (stats.failedToScore) teamStr += `  - Partite Senza Segnare: ${stats.failedToScore}\n`;
    if (stats.penaltyScored) teamStr += `  - Rigori Segnati: ${stats.penaltyScored}\n`;
    if (stats.penaltyMissed) teamStr += `  - Rigori Falliti: ${stats.penaltyMissed}\n`;
    return teamStr;
  };

  promptData += "\nStatistiche Squadra Casa:\n" + formatTeamStats(md.homeTeamStats, homeTeamNameInput);
  promptData += "\nStatistiche Squadra Ospite:\n" + formatTeamStats(md.awayTeamStats, awayTeamNameInput);

  if (md.headToHead) {
    const h2h = md.headToHead;
    promptData += `\nScontri Diretti (H2H) Recenti (ultime ${h2h.lastMeetings.length} partite):\n`;
    promptData += `  - Partite Totali Analizzate: ${h2h.totalMatches}\n`;
    promptData += `  - Vittorie ${md.homeTeamStats?.teamName || homeTeamNameInput} (in H2H): ${h2h.homeTeamWinsInH2H}\n`;
    promptData += `  - Vittorie ${md.awayTeamStats?.teamName || awayTeamNameInput} (in H2H): ${h2h.awayTeamWinsInH2H}\n`;
    promptData += `  - Pareggi (in H2H): ${h2h.drawsInH2H}\n`;
    if(h2h.averageGoalsInH2H) promptData += `  - Media Gol per Partita (in H2H): ${h2h.averageGoalsInH2H.toFixed(2)}\n`;
    promptData += `  - Ultimi Incontri:\n`;
    h2h.lastMeetings.slice(0, 5).forEach(m => {
      promptData += `    - ${m.date}: ${m.homeTeamName} ${m.score} ${m.awayTeamName} (Vincitore: ${m.winner || 'Pareggio'})${m.leagueName ? ` [${m.leagueName}]` : ''}\n`;
    });
  } else {
    promptData += "\nNessun dato sugli scontri diretti (H2H) recenti disponibile dall'API.\n";
  }
  
  promptData += "\nFINE DATI API ESTERNA.\nConsidera questi dati come base fattuale per le tue previsioni quantitative e qualitative.\n";
  return promptData;
};

const buildGeminiPrompt = (matchInput, externalApiData) => {
  const dateInstruction = matchInput.matchDate
    ? `Inoltre, l'utente ha fornito una DATA SPECIFICA: '${matchInput.matchDate}'. DAI PRIORITÀ ASSOLUTA a trovare la partita ufficiale disputata in QUESTA DATA. UTILIZZA LE TUE CAPACITÀ DI RICERCA WEB per confermare l'esistenza e i dettagli della partita in questa data. Includi le fonti web che hai utilizzato per la verifica nel campo 'fontiRicercaWeb'. Se i dati API esterni forniti si riferiscono a questa data, usali come fonte primaria.`
    : `Se non è fornita una data specifica dall'utente, identifica la *prossima partita ufficiale in calendario* tra le due squadre. Se i dati API esterni sono disponibili, considerali nel contesto della prossima partita.`;

  const competitionContext = matchInput.league && (matchInput.league.toLowerCase().includes('champions') || matchInput.league.toLowerCase().includes('europa') || matchInput.league.toLowerCase().includes('conference'))
    ? `Trattandosi di un torneo europeo (${matchInput.league}), è possibile che non esista uno storico di scontri diretti significativo tra le due squadre (verificalo con i dati API H2H se presenti). In tal caso, la tua analisi dovrà basarsi maggiormente su: 1) Forma attuale e performance recenti (dati API). 2) Forza relativa e performance nei rispettivi campionati nazionali (dati API e tue conoscenze). 3) Esperienza e performance in precedenti campagne europee. 4) Analisi tattica e qualità individuale dei giocatori. Se esistono scontri diretti (dati API), considerali, ma pondera la loro rilevanza se datati o in contesti molto diversi.`
    : `Considera gli scontri diretti storici (dati API H2H se presenti e rilevanti).`;
  
  const externalApiDataSection = formatSportsDataForPrompt(externalApiData, matchInput.homeTeam, matchInput.awayTeam);

  return `
Sei un esperto analista di scommesse sportive sul calcio (Gemini). Stai preparando un'ANALISI PRELIMINARE DETTAGLIATA per una partita. Questa analisi verrà successivamente RIFINITA E POTENZIATA da un altro LLM esperto (Mistral) in un processo collaborativo.
Il tuo compito è fornire una base solida, precisa e completa. Evita speculazioni e attieniti ai dati e a interpretazioni conservative.

OBIETTIVO PRINCIPALE:
1.  **IDENTIFICA LA PARTITA**: Identifica la partita ufficiale: Squadra Casa ('${matchInput.homeTeam}'), Ospite ('${matchInput.awayTeam}'), Competizione ('${matchInput.league || 'Non specificato'}'). ${dateInstruction} Tutta l'analisi deve riferirsi a *questa specifica partita*.
2.  **UTILIZZA DATI API ESTERNI E RICERCA WEB**:
    ${externalApiDataSection}
    Se i dati API sono disponibili, usali come fonte primaria per statistiche, forma, H2H.
    Integra con le tue conoscenze generali e, se la data della partita è fornita, con ricerca web per notizie recenti (infortuni, morale squadra, ecc.) non coperte dai dati API. Cita le fonti web.
3.  **PREPARA L'ANALISI PRELIMINARE**: Fornisci un'analisi statistica dettagliata e previsioni per la partita identificata.

Fattori da considerare per l'analisi preliminare (mantenendo precisione):
1.  Stagione Corrente e Contesto (interpretazione basata su dati API e ricerca web).
2.  Performance Squadre (basata su dati API e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta).
3.  Performance Storica e Variazioni Rose (basata su dati API e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta). ${competitionContext}
4.  Infortuni/Squalifiche (basati su ricerca web per conferme/ultime notizie oggettive, da integrare ai dati API che potrebbero non essere aggiornati all'ultimo minuto).
5.  Performance Recente Giocatori Chiave (basata su ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta).
6.  Assetto Tattico Attuale/Probabile (basato su informazioni verificate).

È cruciale che l'analisi sia **esaustiva, accurata e precisa** e che **tutti i campi** del JSON richiesto siano compilati con il massimo dettaglio possibile e basati sui fatti, come base per la collaborazione.
Analizza la partita identificata e fornisci previsioni statistiche dettagliate e precise in formato JSON.

Dettagli Partita:
Squadra Casa: ${matchInput.homeTeam}
Squadra Ospite: ${matchInput.awayTeam}
Competizione: ${matchInput.league || 'Non specificato'}
Data: ${matchInput.matchDate || 'Non fornita (cercare prossima partita)'}

Restituisci un oggetto JSON con la chiave "predictions" che contiene un oggetto con la seguente struttura:

{
  "predictions": {
    "partitaIdentificata": "stringa (OBBLIGATORIO: Descrizione partita ufficiale...)",
    "fontiRicercaWeb": [ { "uri": "stringa", "title": "stringa" } (le fonti devono essere ATTENDIBILI e gli uri forniti devono essere REALI e FUNZIONANTI) ],
    "externalApiDataUsed": "boolean (true se i dati API esterni sono stati usati e sono significativi, false altrimenti)",
    "squadraVincente": { "squadra": "stringa", "probabilita": "stringa (es. '45%')" },
    "risultatoFinaleProbabilita": { "vittoriaCasa": "stringa", "pareggio": "stringa", "vittoriaOspite": "stringa" },
    "overUnderGoals": [ { "linea": "Over 0.5", "probabilita": "stringa" }, { "linea": "Under 4.5", "probabilita": "stringa" } ],
    "risultatiEsatti": [ { "risultato": "stringa", "probabilita": "stringa" } ],
    "probabiliMarcatori": [ { "nomeGiocatore": "stringa", "probabilitaGol": "stringa (es. 'Alta' o '60%')" } ],
    "statisticheMediePreviste": {
      "falliTotali": { "statistica" : "stringa (calcolo preciso es. '20.3',totale basato su dati API se disponibili, altrimenti ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)", 
      "linea" : "stringa (la linea relativa alla statistica es. '20.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"} ,
      "cornerTotali": { "statistica" : "stringa (calcolo preciso es. '9.5',totale basato su dati API se disponibili, altrimenti ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)",
      "linea" : "stringa (la linea relativa alla statistica es. '9.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"} ,
      "cartelliniTotali": { "statistica" : "stringa (calcolo preciso es. '3.5', totale basato su dati API se disponibili, altrimenti ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)",
      "linea" : "stringa (la linea relativa alla statistica es. '3.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"} ,
      "tiriTotali": { "statistica" :  "stringa (calcolo preciso es. '25.7', stima totale basata su dati API, stile di gioco e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)",
      "linea" : "stringa (la linea relativa alla statistica es. '25.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"} ,
      "tiriInPortaTotali": { "statistica" :  "stringa (calcolo preciso es. '8.5', stima totale basata su dati API, stile di gioco e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)",
      "linea" : "stringa (la linea relativa alla statistica es. '8.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"} ,
      "parateTotaliPortieri": { "statistica" :  "stringa (calcolo preciso es. '4.3', stima totale basata sul volume di tiri previsto e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta )",
      "linea" : "stringa (la linea relativa alla statistica es. '2.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"} ,
      "falliSquadraCasa": { "statistica" :  "stringa (calcolo preciso es. '18.2', basati per la Squadra Casa '${matchInput.homeTeam}' su dati API se disponibili, altrimenti ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)",
      "linea" : "stringa (la linea relativa alla statistica es. '18.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"} ,
      "cornerSquadraCasa": { "statistica" :  "stringa (calcolo preciso es. '5.8', basati per la Squadra Casa '${matchInput.homeTeam}' su dati API se disponibili, altrimenti ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)",
      "linea" : "stringa (la linea relativa alla statistica es. '5.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"} ,
      "cartelliniSquadraCasa": { "statistica" :  "stringa (calcolo preciso es. '3.8', basati per la Squadra Casa '${matchInput.homeTeam}' su dati API se disponibili, altrimenti ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)",
      "linea" : "stringa (la linea relativa alla statistica es. '3.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"} ,
      "tiriSquadraCasa": { "statistica" :  "stringa (calcolo preciso es. '13.7', stima per la Squadra Casa '${matchInput.homeTeam}' basata su dati API, stile di gioco e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)",
      "linea" : "stringa (la linea relativa alla statistica es. '12.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"} ,
      "tiriInPortaSquadraCasa": { "statistica" :  "stringa (calcolo preciso es. '6.5', stima per la Squadra Casa '${matchInput.homeTeam}' basata su dati API, stile di gioco e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)",
      "linea" : "stringa (la linea relativa alla statistica es. '4.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"} ,
      "paratePortiereSquadraCasa": { "statistica" :  "stringa (calcolo preciso es. '3.3', stima basata per la Squadra Casa '${matchInput.homeTeam}' sul volume di tiri previsto e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta )",
      "linea" : "stringa (la linea relativa alla statistica es. '2.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"} ,
      "falliSquadraOspite": { "statistica" :  "stringa (calcolo preciso es. '26.3', basati per la Squadra Ospite '${matchInput.awayTeam}' su dati API se disponibili, altrimenti ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)",
      "linea" : "stringa (la linea relativa alla statistica es. '22.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"} ,
      "cornerSquadraOspite": "stringa (calcolo preciso es. '7.5', basati per la Squadra Ospite '${matchInput.awayTeam}' su dati API se disponibili, altrimenti ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)",
      "linea" : "stringa (la linea relativa alla statistica es. '5.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"} ,
      "cartelliniSquadraOspite": { "statistica" :  "stringa (calcolo preciso es. '3.2', basati per la Squadra Ospite '${matchInput.awayTeam}' su dati API se disponibili, altrimenti ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)",
      "linea" : "stringa (la linea relativa alla statistica es. '3.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"} ,
      "tiriSquadraOspite": { "statistica" :  "stringa (calcolo preciso es. '21.7', stima basata per la Squadra Ospite '${matchInput.awayTeam}' su dati API, stile di gioco e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)",
      "linea" : "stringa (la linea relativa alla statistica es. '19.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"} ,
      "tiriInPortaSquadraOspite": { "statistica" :  "stringa (calcolo preciso es. '5.5', stima basata per la Squadra Ospite '${matchInput.awayTeam}' su dati API, stile di gioco e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)",
      "linea" : "stringa (la linea relativa alla statistica es. '3.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"} ,
      "paratePortiereSquadraOspite": { "statistica" :  "stringa (calcolo preciso es. '2.3', stima basata sul volume di tiri previsto per la Squadra Ospite '${matchInput.awayTeam}' e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta )",
      "linea" : "stringa (la linea relativa alla statistica es. '2.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"} 
    },
    "consiglioScommessaExpert": [
      {
        "mercato": "stringa", "selezione": "stringa", "lineaConsigliata": "stringa (OPZIONALE)", "valoreFiducia": "stringa",
        "statisticaCorrelata": { "nomeStatistica": "stringa (OPZIONALE)", "valoreStatistica": "stringa (OPZIONALE)" },
        "motivazioneBreve": "stringa (basata su analisi fattuale e dati API)"
      }
    ],
    "ragionamentoAnalitico": "stringa (Analisi preliminare concisa e fattuale (150-300 parole) CHE INTEGRA i dati API esterni (se usati), contesto, notizie oggettive, ecc. Questa sarà la base per la rifinitura.)"
  }
}
Assicurati che tutte le probabilità siano stringhe percentuali (es. "75%"). Solo JSON.
NON INCLUDERE NESSUN TESTO AL DI FUORI DELL'OGGETTO JSON, nemmeno i delimitatori \`\`\`json \`\`\`. La risposta deve essere ESCLUSIVAMENTE l'oggetto JSON.
`;
};

const buildRefinementPrompt = (geminiDraftAnalysis) => {
  const prompt = `
MODELLO MISTRAL, ATTENZIONE: COLLABORAZIONE PER RAFFINAMENTO ANALISI CALCISTICA.

Hai ricevuto un'ANALISI PRELIMINARE DETTAGLIATA in formato JSON da un altro LLM (Gemini). Questa analisi POTREBBE includere dati statistici da un'API esterna, indicati dal flag 'externalApiDataUsed' e dettagliati nel testo.
Il tuo compito è AGIRE COME UN ESPERTO COLLABORATORE per RAFFINARE, MIGLIORARE e, se necessario, CORREGGERE questa analisi.
L'obiettivo è produrre un'analisi finale più accurata, completa e profonda possibile, tenendo in forte considerazione i dati API se presenti.

ISTRUZIONI CRUCIALI PER IL RAFFINAMENTO:
1.  **MANTIENI LA STRUTTURA JSON**: La tua risposta DEVE essere un oggetto JSON che rispecchia ESATTAMENTE la struttura del JSON di Gemini fornito qui sotto. NON alterare i nomi delle chiavi. NON aggiungere nuove chiavi non presenti nel draft.
2.  **RAFFINA OGNI CAMPO**: Esamina attentamente OGNI campo del JSON di Gemini.
    *   Se 'externalApiDataUsed' è true nel draft, dai PESO SIGNIFICATIVO ai dati statistici che Gemini avrà riportato nel suo 'ragionamentoAnalitico' o che si evincono dalle sue stime. La tua rifinitura dovrebbe essere coerente con tali dati fattuali.
    *   Migliora la precisione delle percentuali e delle stime.
    *   Aggiungi profondità e sfumature al "ragionamentoAnalitico" e alle "motivazioniBrevi" dei consigli, specialmente se puoi correlarli ai dati API.
    *   Verifica la coerenza interna dell'analisi.
    *   Se ritieni che un dato sia impreciso o incompleto (nonostante i dati API), correggilo o completalo basandoti sulla tua conoscenza calcistica e su interpretazioni logiche dei dati forniti.
3.  **NON OMETTERE CAMPI**: Assicurati che TUTTI i campi presenti nel JSON di Gemini siano presenti anche nella tua risposta JSON raffinata. Se non hai miglioramenti specifici per un campo, restituisci il valore originale di Gemini per quel campo. NON LASCIARE CAMPI VUOTI SE GEMINI AVEVA FORNITO UN VALORE.
4.  **OUTPUT ESCLUSIVAMENTE JSON**: La tua intera risposta deve essere l'oggetto JSON raffinato. NON includere NESSUN testo introduttivo, NESSUNA spiegazione esterna al JSON, NESSUN markdown (come \`\`\`json). La risposta deve iniziare con \`{\` e terminare con \`}\`.
5.  **APPROFONDISCI I CONSIGLI ('consiglioScommessaExpert')**: Assicurati che ogni consiglio sia ben motivato e, se possibile, supportato da statistiche (idealmente quelle API se disponibili e pertinenti). Se il draft di Gemini manca di consigli per alcune delle 'statisticheMediePreviste', cerca di generarli.
6.  **RAGIONAMENTO ANALITICO**: Questo è un campo chiave. Amplia e migliora il ragionamento, integrando logica, contesto, dati API (se usati da Gemini) e possibili scenari di gioco. Deve essere un'analisi approfondita.

JSON PRELIMINARE (DRAFT) DA GEMINI (da raffinare):
\`\`\`json
${JSON.stringify(geminiDraftAnalysis, null, 2)}
\`\`\`

Il tuo contributo è fondamentale per elevare la qualità dell'analisi. Procedi con attenzione e precisione.
Restituisci SOLO l'oggetto JSON raffinato.
`;
  console.log(`Prompt di raffinamento per Mistral (OpenRouter). Lunghezza: ${prompt.length} caratteri.`);
  return prompt;
};

const openRouterSystemPrompt = "Sei un esperto LLM (Mistral) specializzato nell'analisi calcistica e nel raffinamento collaborativo di dati JSON strutturati. Il tuo compito è migliorare la precisione, la profondità e la completezza di un'analisi JSON fornita da un altro LLM, tenendo in forte considerazione eventuali dati statistici API referenziati. Devi restituire un oggetto JSON completo che mantenga la struttura originale, applicando i tuoi miglioramenti a ciascun campo. La tua risposta deve essere esclusivamente l'oggetto JSON raffinato.";

const checkEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0 && !(value instanceof Date)) return true;
  return false;
};

/**
 * Funzione principale per ottenere predizioni di partita
 * @param {MatchInput} matchInput - Oggetto contenente i dati della partita
 * @returns {Promise<GeminiPredictionResponse>} - Risultato dell'analisi
 */
export const getMatchPrediction = async (matchInput) => {
  // Validazione input
  if (!matchInput || typeof matchInput !== 'object') {
    throw new Error('matchInput deve essere un oggetto valido');
  }
  
  if (!matchInput.homeTeam || !matchInput.awayTeam) {
    throw new Error('homeTeam e awayTeam sono campi obbligatori');
  }

  console.log(`🚀 Inizio analisi: ${matchInput.homeTeam} vs ${matchInput.awayTeam}`);
  
  // Verifica chiave API Gemini
  if (!process.env.API_KEY) {
    throw new Error('API_KEY per Gemini non configurata nel backend');
  }

  let externalSportsData = null;
  let sportsApiErrorMessage = undefined;
  let externalApiDataUsedInitially = false;

  const SPORTS_API_KEY = process.env.SPORTS_API_KEY;

  // Tentativo di recupero dati dall'API Sports
  if (SPORTS_API_KEY && fetchExternalMatchData) {
    try {
      console.log("🔍 Tentativo di recupero dati da API Sports...");
      externalSportsData = await fetchExternalMatchData(matchInput, SPORTS_API_KEY);
      
      if (externalSportsData && externalSportsData.matchData && 
          (externalSportsData.matchData.homeTeamStats?.fixturesPlayed !== undefined || 
           externalSportsData.matchData.awayTeamStats?.fixturesPlayed !== undefined ||
           externalSportsData.matchData.headToHead?.totalMatches !== undefined)) {
        console.log("✅ Dati API Sports recuperati con successo e considerati significativi.");
        externalApiDataUsedInitially = true;
      } else {
        sportsApiErrorMessage = "Dati API Sports non trovati o insufficienti per questa partita. L'analisi sarà basata su web search e conoscenze generali.";
        console.warn("⚠️ " + sportsApiErrorMessage);
      }
    } catch (sportsError) {
      console.error("❌ Errore durante il recupero dei dati dall'API Sports:", sportsError);
      sportsApiErrorMessage = sportsError instanceof Error ? sportsError.message : "Errore sconosciuto durante il recupero dei dati sportivi esterni.";
      externalSportsData = null;
    }
  } else {
    if (!SPORTS_API_KEY) {
      sportsApiErrorMessage = "SPORTS_API_KEY non configurata nel backend. Impossibile recuperare statistiche esterne dettagliate.";
      console.warn("⚠️ " + sportsApiErrorMessage);
    }
    if (!fetchExternalMatchData) {
      console.warn("⚠️ fetchExternalMatchData non disponibile");
    }
  }

  // Inizializzazione API Gemini
  console.log('🔧 Inizializzazione GoogleGenerativeAI...');
  let ai;
  try {
    ai = new GoogleGenerativeAI(process.env.API_KEY);
  } catch (error) {
    throw new Error(`Errore nell'inizializzazione di GoogleGenerativeAI: ${error.message}`);
  }
  
  const geminiPrompt = buildGeminiPrompt(matchInput, externalSportsData);
  console.log(`📝 Lunghezza prompt Gemini: ${geminiPrompt.length} caratteri.`);

  // Configurazione del modello
  const hasSearchTools = !!matchInput.matchDate;
  const modelConfig = {
    temperature: 0.1, 
    topP: 0.8,      
    topK: 30,
    maxOutputTokens: 4096,
  };
  
  const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  ];

  // Ottenimento del modello
  console.log('🤖 Configurazione modello Gemini...');
  let model;
  try {
    model = ai.getGenerativeModel({
      model: GEMINI_MODEL_NAME,
      generationConfig: modelConfig,
      safetySettings: safetySettings,
      tools: hasSearchTools ? [{ googleSearch: {} }] : undefined,
    });
  } catch (error) {
    throw new Error(`Errore nella configurazione del modello Gemini: ${error.message}`);
  }

  let geminiResultText;
  let parsedGeminiData;
  let finalRefinedData;
  let geminiSearchSources = [];
  let refinementIssueMessage = undefined;

  try {
    console.log("📡 Invio richiesta a Gemini...");
    
    // Chiamata al modello Gemini
    const geminiResponse = await model.generateContent(geminiPrompt);
    
    if (!geminiResponse || !geminiResponse.response) {
      throw new Error("Risposta non valida da Gemini");
    }
    
    const response = await geminiResponse.response;
    geminiResultText = response.text();

    console.log("📥 Testo grezzo ricevuto da Gemini (primi 500 caratteri):", geminiResultText?.substring(0, 500));

    // Estrazione delle fonti di ricerca web (se presenti)
    if (hasSearchTools && geminiResponse.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      geminiResponse.candidates[0].groundingMetadata.groundingChunks.forEach(chunk => {
        if (chunk.web) {
          geminiSearchSources.push({
            uri: chunk.web.uri,
            title: chunk.web.title || chunk.web.uri, 
          });
        }
      });
      console.log(`🔍 Trovate ${geminiSearchSources.length} fonti di ricerca web`);
    }
    
    // Controllo se la risposta è vuota
    if (!geminiResultText || geminiResultText.trim() === "") {
      throw new Error("La risposta di Gemini era vuota");
    }
    
    // Parsing del JSON dalla risposta di Gemini
    try {
      let jsonStr = geminiResultText.trim();
      
      // Rimozione di eventuali markdown code blocks
      const fencedJsonRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/;
      const fencedMatch = jsonStr.match(fencedJsonRegex);

      if (fencedMatch && fencedMatch[1]) {
        jsonStr = fencedMatch[1].trim();
      } else {
        // Estrazione del JSON dal testo
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
        }
      }
      
      if (jsonStr) {
        const apiResponse = JSON.parse(jsonStr);
        
        // Verifica della struttura della risposta
        if (apiResponse && apiResponse.predictions) {
          parsedGeminiData = apiResponse.predictions;
        } else if (apiResponse.partitaIdentificata || apiResponse.squadraVincente) {
          // Se il JSON è direttamente l'oggetto predictions
          parsedGeminiData = apiResponse;
        } else {
          throw new Error("Struttura JSON non riconosciuta");
        }
      } else {
        throw new Error("Impossibile estrarre JSON valido dalla risposta");
      }

      // Aggiungi metadati
      if (parsedGeminiData) {
        parsedGeminiData.externalApiDataUsed = externalApiDataUsedInitially;
        
        // Aggiungi fonti di ricerca se non presenti
        if (geminiSearchSources.length > 0 && (!parsedGeminiData.fontiRicercaWeb || parsedGeminiData.fontiRicercaWeb.length === 0)) {
          parsedGeminiData.fontiRicercaWeb = geminiSearchSources;
        }
      }
      
      console.log("✅ JSON di Gemini parsato con successo");
      
    } catch (parseError) {
      console.error("❌ Errore nel parsing JSON da Gemini:", parseError);
      throw new Error(`Errore nel parsing della risposta Gemini: ${parseError.message}`);
    }

    // Imposta i dati parsati come risultato finale iniziale
    finalRefinedData = parsedGeminiData;
    
    // Tentativo di raffinamento con OpenRouter (se disponibile)
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const openRouterEnabled = process.env.DISABLE_OPENROUTER !== 'true';

    if (parsedGeminiData && OPENROUTER_API_KEY && OPENROUTER_MODEL_NAME && callOpenRouterLLM && openRouterEnabled) {
      console.log("🔄 Tentativo di raffinamento collaborativo con OpenRouter (Mistral)...");
      
      try {
        const refinementPrompt = buildRefinementPrompt(parsedGeminiData);
        const openRouterResponseText = await callOpenRouterLLM(
          OPENROUTER_MODEL_NAME,
          refinementPrompt,
          OPENROUTER_API_KEY,
          openRouterSystemPrompt
        );
        
        const trimmedOpenRouterResponse = openRouterResponseText ? openRouterResponseText.trim() : "";

        if (!trimmedOpenRouterResponse || trimmedOpenRouterResponse === "Il modello OpenRouter non ha fornito un output testuale significativo.") {
          refinementIssueMessage = "Il modello AI collaboratore (Mistral) non ha fornito un output valido per il raffinamento. Viene mostrata l'analisi iniziale.";
        } else {
          try {
            let mistralJsonStr = trimmedOpenRouterResponse;
            
            // Rimozione markdown se presente
            const fencedJsonRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/;
            const fencedMatch = mistralJsonStr.match(fencedJsonRegex);
            if (fencedMatch && fencedMatch[1]) {
              mistralJsonStr = fencedMatch[1].trim();
            }
            
            if (mistralJsonStr.startsWith("{") && mistralJsonStr.endsWith("}")) {
              const mistralParsedData = JSON.parse(mistralJsonStr);
              const tempRefinedData = { ...parsedGeminiData };
              let fieldsRefinedCount = 0;
              
              // Merge dei dati raffinati
              for (const key in tempRefinedData) {
                if (Object.prototype.hasOwnProperty.call(mistralParsedData, key)) {
                  const mistralValue = mistralParsedData[key];
                  if (!checkEmpty(mistralValue)) {
                    const originalValue = JSON.stringify(parsedGeminiData[key]);
                    const newValue = JSON.stringify(mistralValue);
                    
                    tempRefinedData[key] = mistralValue;
                    
                    if (originalValue !== newValue) {
                      fieldsRefinedCount++;
                    }
                  }
                }
              }
              
              finalRefinedData = tempRefinedData;
              finalRefinedData.externalApiDataUsed = externalApiDataUsedInitially;
              
              if (fieldsRefinedCount > 0) {
                refinementIssueMessage = `✅ Analisi arricchita con successo da Mistral (${fieldsRefinedCount} campi aggiornati).`;
                console.log(`✅ Raffinamento completato: ${fieldsRefinedCount} campi aggiornati`);
              } else {
                refinementIssueMessage = "ℹ️ Mistral ha processato l'analisi, ma senza modifiche significative rilevate.";
              }
            } else {
              refinementIssueMessage = "⚠️ Il modello AI collaboratore (Mistral) ha restituito un formato non JSON.";
            }
          } catch (parseError) {
            console.error("❌ Errore parsing risposta Mistral:", parseError);
            refinementIssueMessage = "❌ Errore durante l'interpretazione della risposta di Mistral.";
          }
        }
      } catch (openRouterError) {
        console.error("❌ Errore OpenRouter:", openRouterError);
        refinementIssueMessage = "❌ Si è verificato un errore durante la comunicazione con Mistral per il raffinamento.";
      }
    } else {
      // Gestione messaggi quando OpenRouter non è disponibile
      if (!openRouterEnabled) {
        refinementIssueMessage = "ℹ️ Raffinamento con OpenRouter disabilitato dalla configurazione.";
      } else if (!OPENROUTER_API_KEY || !OPENROUTER_MODEL_NAME) {
        refinementIssueMessage = "ℹ️ Configurazione per il modello AI collaboratore mancante. Raffinamento non eseguito.";
      } else if (!callOpenRouterLLM) {
        refinementIssueMessage = "ℹ️ Servizio OpenRouter non disponibile.";
      }
    }

    // Assicurati che externalApiDataUsed sia sempre impostato
    if (finalRefinedData) {
      finalRefinedData.externalApiDataUsed = externalApiDataUsedInitially;
    }

    console.log("🎯 Analisi completata con successo");

    // Costruzione della risposta finale
    const result = { 
      parsed: finalRefinedData, 
      rawText: geminiResultText, 
      searchSources: finalRefinedData?.fontiRicercaWeb || geminiSearchSources, 
      externalSportsData: externalSportsData
    };
    
    // Aggiungi messaggi opzionali solo se presenti
    if (refinementIssueMessage) {
      result.refinementIssue = refinementIssueMessage;
    }
    
    if (sportsApiErrorMessage) {
      result.sportsApiError = sportsApiErrorMessage;
    }
    
    return result;

  } catch (error) {
    console.error('❌ Errore nel processo di generazione del pronostico:', error);
    
    // Gestione errori specifici
    let finalErrorMessage = 'Errore sconosciuto durante la generazione del pronostico.';
    
    if (error instanceof Error) {
      finalErrorMessage = error.message;
      
      // Gestione errori specifici API
      if (error.message.includes("API key not valid") || error.message.includes("API_KEY")) { 
        finalErrorMessage = `Chiave API Gemini non valida o non configurata. Controlla la configurazione nel backend.`;
      } else if (error.message.includes("quota") || error.message.includes("limit")) {
        finalErrorMessage = `Limite di quota API raggiunto. Riprova più tardi.`;
      } else if (error.message.includes("network") || error.message.includes("timeout")) {
        finalErrorMessage = `Errore di rete durante la comunicazione con l'API. Riprova.`;
      }
    }
    
    throw new Error(finalErrorMessage);
  }
};
