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
let fetchExternalMatchData, callOpenRouterLLM;
try {
  const sportsModule = await import('./sportsApiService.js');
  fetchExternalMatchData = sportsModule.fetchExternalMatchData;
} catch (error) {
  console.warn('⚠️ sportsApiService.js non caricato:', error.message);
  fetchExternalMatchData = null;
}

try {
  const openRouterModule = await import('./openRouterService.js');
  callOpenRouterLLM = openRouterModule.callOpenRouterLLM;
} catch (error) {
  console.warn('⚠️ openRouterService.js non caricato:', error.message);
  callOpenRouterLLM = null;
}

// Tipi importati come JSDoc per riferimento, dato che siamo in JS
/**
 * @typedef {import('../../types').MatchInput} MatchInput
 * @typedef {import('../../types').GeminiPredictionResponse} GeminiPredictionResponse
 * @typedef {import('../../types').GeminiAPIResponseFormat} GeminiAPIResponseFormat
 * @typedef {import('../../types').PredictionDetails} PredictionDetails
 * @typedef {import('../../types').WebSource} WebSource
 * @typedef {import('../../types').SportsAPIData} SportsAPIData
 */

/** @typedef {{ googleSearch: {} }} GoogleSearchTool */

const formatSportsApiDataForPrompt = (sportsData, homeTeamNameInput, awayTeamNameInput) => {
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

const constructGeminiPrompt = (matchInput, externalApiData) => {
  const dateInstruction = matchInput.matchDate
    ? `Inoltre, l'utente ha fornito una DATA SPECIFICA: '${matchInput.matchDate}'. DAI PRIORITÀ ASSOLUTA a trovare la partita ufficiale disputata in QUESTA DATA. UTILIZZA LE TUE CAPACITÀ DI RICERCA WEB per confermare l'esistenza e i dettagli della partita in questa data. Includi le fonti web che hai utilizzato per la verifica nel campo 'fontiRicercaWeb'. Se i dati API esterni forniti si riferiscono a questa data, usali come fonte primaria.`
    : `Se non è fornita una data specifica dall'utente, identifica la *prossima partita ufficiale in calendario* tra le due squadre. Se i dati API esterni sono disponibili, considerali nel contesto della prossima partita.`;

  const competitionContext = matchInput.league && (matchInput.league.toLowerCase().includes('champions') || matchInput.league.toLowerCase().includes('europa') || matchInput.league.toLowerCase().includes('conference'))
    ? `Trattandosi di un torneo europeo (${matchInput.league}), è possibile che non esista uno storico di scontri diretti significativo tra le due squadre (verificalo con i dati API H2H se presenti). In tal caso, la tua analisi dovrà basarsi maggiormente su: 1) Forma attuale e performance recenti (dati API). 2) Forza relativa e performance nei rispettivi campionati nazionali (dati API e tue conoscenze). 3) Esperienza e performance in precedenti campagne europee. 4) Analisi tattica e qualità individuale dei giocatori. Se esistono scontri diretti (dati API), considerali, ma pondera la loro rilevanza se datati o in contesti molto diversi.`
    : `Considera gli scontri diretti storici (dati API H2H se presenti e rilevanti).`;
  
  const externalApiDataSection = formatSportsApiDataForPrompt(externalApiData, matchInput.homeTeam, matchInput.awayTeam);

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
1.  Stagione Corrente e Contesto (interpretazione basata su dati API e ricerca).
2.  Performance Squadre (basata su dati API e ricerca).
3.  Performance Storica e Variazioni Rose (basata su dati API e ricerca). ${competitionContext}
4.  Infortuni/Squalifiche (basati su ricerca web per conferme/ultime notizie oggettive, da integrare ai dati API che potrebbero non essere aggiornati all'ultimo minuto).
5.  Performance Recente Giocatori Chiave (basata su ricerca).
6.  Assetto Tattico Attuale/Probabile (basato su informazioni verificate).

È cruciale che l'analisi sia **esaustiva, accurata e precisa** e che **tutti i campi** del JSON richiesto siano compilati con il massimo dettaglio possibile e basati sui fatti, come base per la collaborazione.
Analizza la partita identificata e fornisci previsioni statistiche dettagliate e precise in formato JSON.
NON INCLUDERE NESSUN TESTO AL DI FUORI DELL'OGGETTO JSON, nemmeno i delimitatori \`\`\`json \`\`\`. La risposta deve essere ESCLUSIVAMENTE l'oggetto JSON.

Dettagli Partita:
Squadra Casa: ${matchInput.homeTeam}
Squadra Ospite: ${matchInput.awayTeam}
Competizione: ${matchInput.league || 'Non specificato'}
Data: ${matchInput.matchDate || 'Non fornita (cercare prossima partita)'}

Restituisci un oggetto JSON con la chiave "predictions" che contiene un oggetto con la seguente struttura:

{
  "predictions": {
    "partitaIdentificata": "stringa (OBBLIGATORIO: Descrizione partita ufficiale...)",
    "fontiRicercaWeb": [ { "uri": "stringa", "title": "stringa" } ],
    "externalApiDataUsed": "boolean (true se i dati API esterni sono stati usati e sono significativi, false altrimenti)",
    "squadraVincente": { "squadra": "stringa", "probabilita": "stringa (es. '45%')" },
    "risultatoFinaleProbabilita": { "vittoriaCasa": "stringa", "pareggio": "stringa", "vittoriaOspite": "stringa" },
    "overUnderGoals": [ { "linea": "Over 0.5", "probabilita": "stringa" }, /* ... altre ... */ { "linea": "Under 4.5", "probabilita": "stringa" } ],
    "risultatiEsatti": [ { "risultato": "stringa", "probabilita": "stringa" } /* ... altri ... */ ],
    "probabiliMarcatori": [ { "nomeGiocatore": "stringa", "probabilitaGol": "stringa (es. 'Alta' o '60%')" } /* ... altri ... */ ],
    "statisticheMediePreviste": {
      "falliTotali": "stringa (range es. '20-25 falli', basati su dati API se disponibili, altrimenti stima generale)",
      "cornerTotali": "stringa (range es. '8-11 corner', basati su dati API se disponibili, altrimenti stima generale)",
      "cartelliniGialliTotali": "stringa (range es. '3-5 cartellini gialli', basati su dati API se disponibili, altrimenti stima generale)",
      "cartelliniRossiPossibili": "stringa (es. 'Bassa probabilità', basati su dati API e contesto partita)",
      "tiriTotali": "stringa (range es. '22-28 tiri', stima basata su dati API e stile di gioco)",
      "tiriInPortaTotali": "stringa (range es. '7-10 tiri in porta', stima basata su dati API e stile di gioco)",
      "parateTotaliPortieri": "stringa (range es. '5-8 parate', stima basata sul volume di tiri previsto)"
    },
    "consiglioScommessaExpert": [
      {
        "mercato": "stringa", "selezione": "stringa", "lineaConsigliata": "stringa (OPZIONALE)", "valoreFiducia": "stringa",
        "statisticaCorrelata": { "nomeStatistica": "stringa (OPZIONALE)", "valoreStatistica": "stringa (OPZIONALE)" },
        "motivazioneBreve": "stringa (basata su analisi fattuale e dati API)"
      }
      // Includi consigli per Esito Finale, Over/Under Goals principali E POI un consiglio specifico per OGNI statistica in 'statisticheMediePreviste'
    ],
    "ragionamentoAnalitico": "stringa (Analisi preliminare concisa e fattuale (150-300 parole) CHE INTEGRA i dati API esterni (se usati), contesto, notizie oggettive, ecc. Questa sarà la base per la rifinitura.)"
  }
}
Assicurati che tutte le probabilità siano stringhe percentuali (es. "75%"). Solo JSON.
`;
};

const constructCollaborationRefinementPrompt = (geminiDraftAnalysis) => {
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

const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0 && !(value instanceof Date)) return true;
  return false;
};

export const getMatchPrediction = async (matchInput) => {
  console.log(`🚀 Inizio analisi: ${matchInput.homeTeam} vs ${matchInput.awayTeam}`);
  
  // La chiave API_KEY per Gemini è verificata nel server.js prima di chiamare questa funzione
  // Le chiavi SPORTS_API_KEY e OPENROUTER_API_KEY sono usate direttamente da process.env nei rispettivi servizi

  let externalSportsData = null;
  let sportsApiErrorMessage = undefined;
  let externalApiDataUsedInitially = false;

  const SPORTS_API_KEY = process.env.SPORTS_API_KEY; // Chiave Sports API dal backend env

  if (SPORTS_API_KEY && fetchExternalMatchData) {
    try {
      console.log("Tentativo di recupero dati da API Sports (chiave disponibile nel backend)...");
      externalSportsData = await fetchExternalMatchData(matchInput, SPORTS_API_KEY);
      
      if (externalSportsData && externalSportsData.matchData && 
          (externalSportsData.matchData.homeTeamStats?.fixturesPlayed !== undefined || 
           externalSportsData.matchData.awayTeamStats?.fixturesPlayed !== undefined ||
           externalSportsData.matchData.headToHead?.totalMatches !== undefined) ) {
        console.log("Dati API Sports recuperati con successo e considerati significativi.");
        externalApiDataUsedInitially = true;
      } else {
        if (!sportsApiErrorMessage) {
            sportsApiErrorMessage = "Dati API Sports non trovati o insufficienti per questa partita. L'analisi potrebbe essere basata solo su web search e conoscenze generali.";
        }
        if (externalSportsData) {
            console.warn("Dati API Sports recuperati ma considerati non significativi o insufficienti.");
        } else {
            console.warn("Nessun dato (null) restituito da fetchExternalMatchData.");
        }
      }
    } catch (sportsError) {
      console.error("Errore durante il recupero dei dati dall'API Sports (gestito in geminiService del backend):", sportsError);
      if (sportsError instanceof Error) {
        sportsApiErrorMessage = sportsError.message;
      } else {
        sportsApiErrorMessage = "Errore sconosciuto durante il recupero dei dati sportivi esterni.";
      }
      externalSportsData = null;
    }
  } else {
    if (!SPORTS_API_KEY) {
      sportsApiErrorMessage = "SPORTS_API_KEY non configurata nel backend. Impossibile recuperare statistiche esterne dettagliate.";
      console.warn(sportsApiErrorMessage);
    }
    if (!fetchExternalMatchData) {
      console.warn("⚠️ fetchExternalMatchData non disponibile");
    }
  }

  // ✅ CORREZIONE: Inizializzazione corretta dell'API Gemini
  console.log('🔧 Inizializzazione GoogleGenerativeAI...');
  const ai = new GoogleGenerativeAI(process.env.API_KEY);
  
  const geminiPrompt = constructGeminiPrompt(matchInput, externalSportsData);
  console.log(`Lunghezza prompt Gemini: ${geminiPrompt.length} caratteri.`);

  const modelConfig = {
    temperature: 0.1, 
    topP: 0.8,      
    topK: 30,       
    tools: matchInput.matchDate ? [{ googleSearch: {} }] : undefined,
    responseMimeType: !matchInput.matchDate ? "application/json" : undefined,
  };
  
  // Rimuovi responseMimeType se tools è presente, perché non sono compatibili
  if (modelConfig.tools) {
    delete modelConfig.responseMimeType;
  }

  // ✅ CORREZIONE: Ottenimento corretto del modello
  console.log('🤖 Configurazione modello Gemini...');
  const model = ai.getGenerativeModel({
    model: GEMINI_MODEL_NAME,
    generationConfig: {
      temperature: modelConfig.temperature,
      topP: modelConfig.topP,
      topK: modelConfig.topK,
      maxOutputTokens: 4096,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  });

  let geminiResultText;
  let parsedGeminiData;
  let finalRefinedData;
  let geminiSearchSources = [];
  let refinementIssueMessage = undefined;

  try {
    console.log("Invio richiesta a Gemini...");
    
    // ✅ CORREZIONE: Chiamata corretta al modello
    const geminiResponse = await model.generateContent(geminiPrompt);
    const response = await geminiResponse.response;
    geminiResultText = response.text();

    console.log("Testo grezzo ricevuto da Gemini (primi 500 caratteri):", geminiResultText?.substring(0,500));

    if (matchInput.matchDate && geminiResponse.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      geminiResponse.candidates[0].groundingMetadata.groundingChunks.forEach(chunk => {
        if (chunk.web) {
          geminiSearchSources.push({
            uri: chunk.web.uri,
            title: chunk.web.title || chunk.web.uri, 
          });
        }
      });
    }
    
    if (!geminiResultText || geminiResultText.trim() === "") {
        console.warn("La risposta di Gemini era vuota.");
    }
    
    try {
      let jsonStr = geminiResultText ? geminiResultText.trim() : "";
      if (jsonStr) {
        const fencedJsonRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/;
        const fencedMatch = jsonStr.match(fencedJsonRegex);

        if (fencedMatch && fencedMatch[1]) {
          jsonStr = fencedMatch[1].trim();
        } else {
          const firstBrace = jsonStr.indexOf('{');
          const lastBrace = jsonStr.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace > firstBrace) {
              jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
          } else {
              jsonStr = ""; 
          }
        }
        
        if (jsonStr) {
            const apiResponse = JSON.parse(jsonStr);
            if (apiResponse && apiResponse.predictions) {
              parsedGeminiData = apiResponse.predictions;
            } else {
              try {
                  const directParse = JSON.parse(jsonStr);
                  if (directParse.partitaIdentificata || directParse.squadraVincente) { 
                       parsedGeminiData = directParse;
                  }
              } catch (e) { /* no-op */ }
            }
        }
      }

      if (parsedGeminiData) {
        parsedGeminiData.externalApiDataUsed = externalApiDataUsedInitially; 
        if (geminiSearchSources.length > 0 && (!parsedGeminiData.fontiRicercaWeb || parsedGeminiData.fontiRicercaWeb.length === 0)) {
            parsedGeminiData.fontiRicercaWeb = geminiSearchSources;
        }
      }
    } catch (parseError) {
      console.error("Errore nel parsing JSON da Gemini:", parseError, "Raw text:", geminiResultText);
    }

    if (!parsedGeminiData && !geminiResultText) { 
        throw new Error("Gemini non ha fornito una risposta valida (né JSON né testo grezzo).");
    }
    if (!parsedGeminiData && geminiResultText) {
        console.warn("Non è stato possibile interpretare il JSON da Gemini, ma è presente testo grezzo.");
    }

    finalRefinedData = parsedGeminiData; 
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (parsedGeminiData && OPENROUTER_API_KEY && OPENROUTER_MODEL_NAME && callOpenRouterLLM) {
        console.log("Tentativo di raffinamento collaborativo con OpenRouter (Mistral)...");
        try {
            const refinementPrompt = constructCollaborationRefinementPrompt(parsedGeminiData);
            const openRouterResponseText = await callOpenRouterLLM(
                OPENROUTER_MODEL_NAME,
                refinementPrompt,
                OPENROUTER_API_KEY,
                openRouterSystemPrompt
            );
            
            const trimmedOpenRouterResponse = openRouterResponseText ? openRouterResponseText.trim() : "";

            if (trimmedOpenRouterResponse === "" || trimmedOpenRouterResponse === "Il modello OpenRouter non ha fornito un output testuale significativo.") {
                refinementIssueMessage = "Il modello AI collaboratore (Mistral) non ha fornito un output valido per il raffinamento. Viene mostrata l'analisi iniziale.";
            } else {
                let mistralParsedData;
                try {
                    let mistralJsonStr = trimmedOpenRouterResponse;
                    const fencedJsonRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/;
                    const fencedMatch = mistralJsonStr.match(fencedJsonRegex);
                    if (fencedMatch && fencedMatch[1]) {
                        mistralJsonStr = fencedMatch[1].trim();
                    }
                    if (mistralJsonStr.startsWith("{") && mistralJsonStr.endsWith("}")) {
                        mistralParsedData = JSON.parse(mistralJsonStr);
                        const tempRefinedData = { ...parsedGeminiData }; 
                        let fieldsRefinedCount = 0;
                        for (const key in tempRefinedData) {
                            if (Object.prototype.hasOwnProperty.call(mistralParsedData, key)) {
                                const mistralValue = mistralParsedData[key];
                                if (!isEmpty(mistralValue)) {
                                    tempRefinedData[key] = mistralValue;
                                    if (JSON.stringify(mistralValue) !== JSON.stringify(parsedGeminiData[key])) {
                                      fieldsRefinedCount++;
                                    }
                                }
                            }
                        }
                        finalRefinedData = tempRefinedData;
                        if(finalRefinedData) finalRefinedData.externalApiDataUsed = externalApiDataUsedInitially;
                        if (fieldsRefinedCount > 0) {
                            refinementIssueMessage = `Analisi arricchita con successo da Mistral (${fieldsRefinedCount} campi aggiornati).`;
                        } else {
                             refinementIssueMessage = "Mistral ha processato l'analisi, ma senza modifiche significative rilevate."
                        }
                    } else {
                        refinementIssueMessage = "Il modello AI collaboratore (Mistral) ha restituito un formato non JSON.";
                    }
                } catch (parseError) {
                    refinementIssueMessage = "Errore durante l'interpretazione della risposta di Mistral.";
                    if(finalRefinedData) finalRefinedData.externalApiDataUsed = externalApiDataUsedInitially;
                }
            }
        } catch (openRouterError) {
            refinementIssueMessage = "Si è verificato un errore durante la comunicazione con Mistral per il raffinamento.";
            if(finalRefinedData) finalRefinedData.externalApiDataUsed = externalApiDataUsedInitially;
        }
    } else if (parsedGeminiData && (!OPENROUTER_API_KEY || !OPENROUTER_MODEL_NAME)) {
        refinementIssueMessage = "Configurazione per il modello AI collaboratore mancante. Raffinamento non eseguito.";
    } else if (!callOpenRouterLLM) {
        refinementIssueMessage = "Servizio OpenRouter non disponibile.";
    }

    console.log("🎯 Analisi completata con successo");

    return { 
        parsed: finalRefinedData, 
        rawText: geminiResultText, 
        searchSources: finalRefinedData?.fontiRicercaWeb || geminiSearchSources, 
        externalSportsData: externalSportsData, 
        refinementIssue: refinementIssueMessage,
        sportsApiError: sportsApiErrorMessage 
    };

  } catch (error) {
    console.error('Errore nel processo di generazione del pronostico (backend):', error);
    let finalErrorMessage = 'Errore sconosciuto durante la generazione del pronostico.';
    if (error instanceof Error) {
        finalErrorMessage = error.message; 
        if (error.message.includes("API key not valid")) { 
            finalErrorMessage = `Chiave API non valida. Controlla la configurazione della chiave per Gemini nel backend. (${error.message})`;
        } else if (!error.message.toLowerCase().includes("gemini")) {
             finalErrorMessage = `Errore API Gemini o sistema (backend): ${error.message}`;
        }
    }
    throw new Error(finalErrorMessage);
  }
};

const formatSportsApiDataForPrompt = (sportsData, homeTeamNameInput, awayTeamNameInput) => {
  if (!sportsData || !sportsData.matchData) {
    return "Nessun dato statistico dettagliato fornito dall'API sportiva esterna per questa partita. Basa l'analisi su conoscenze generali.";
  }

  const md = sportsData.matchData;
  let promptData = "\nDATI STATISTICI DETTAGLIATI FORNITI DA API ESTERNA:\n";
  
  promptData += `Partita: ${md.homeTeamStats?.teamName || homeTeamNameInput} vs ${md.awayTeamStats?.teamName || awayTeamNameInput}\n`;
  if (md.leagueName) promptData += `Lega: ${md.leagueName}`;
  if (md.seasonYear) promptData += `, Stagione: ${md.seasonYear}\n`;
  if (md.stadium) promptData += `Stadio: ${md.stadium}\n`;
  if (md.referee) promptData += `Arbitro: ${md.referee}\n`;
  
  const formatTeamStats = (stats, teamNameIfMissing) => {
    if (!stats) return `  Statistiche per ${teamNameIfMissing} non disponibili.\n`;
    let teamStr = `Squadra: ${stats.teamName || teamNameIfMissing} (ID: ${stats.teamId || 'N/A'})\n`;
    if (stats.leagueSeason?.leagueName) teamStr += `  - Lega: ${stats.leagueSeason.leagueName} (${stats.leagueSeason.seasonYear})\n`;
    if (stats.form) teamStr += `  - Forma Recente: ${stats.form}\n`;
    if (stats.fixturesPlayed) teamStr += `  - Partite Giocate: ${stats.fixturesPlayed}\n`;
    if (stats.wins) teamStr += `  - Vittorie: ${stats.wins}\n`;
    if (stats.draws) teamStr += `  - Pareggi: ${stats.draws}\n`;
    if (stats.loses) teamStr += `  - Sconfitte: ${stats.loses}\n`;
    if (stats.goalsFor?.total !== null && stats.goalsFor?.total !== undefined) teamStr += `  - Gol Fatti: ${stats.goalsFor.total} (Media: ${stats.goalsFor.average || 'N/A'})\n`;
    if (stats.goalsAgainst?.total !== null && stats.goalsAgainst?.total !== undefined) teamStr += `  - Gol Subiti: ${stats.goalsAgainst.total} (Media: ${stats.goalsAgainst.average || 'N/A'})\n`;
    if (stats.cleanSheets) teamStr += `  - Clean Sheets: ${stats.cleanSheets}\n`;
    if (stats.failedToScore) teamStr += `  - Partite Senza Segnare: ${stats.failedToScore}\n`;
    return teamStr;
  };

  promptData += "\nStatistiche Squadra Casa:\n" + formatTeamStats(md.homeTeamStats, homeTeamNameInput);
  promptData += "\nStatistiche Squadra Ospite:\n" + formatTeamStats(md.awayTeamStats, awayTeamNameInput);

  if (md.headToHead) {
    const h2h = md.headToHead;
    promptData += `\nScontri Diretti (H2H) Recenti:\n`;
    promptData += `  - Partite Totali: ${h2h.totalMatches}\n`;
    promptData += `  - Vittorie ${md.homeTeamStats?.teamName || homeTeamNameInput}: ${h2h.homeTeamWinsInH2H}\n`;
    promptData += `  - Vittorie ${md.awayTeamStats?.teamName || awayTeamNameInput}: ${h2h.awayTeamWinsInH2H}\n`;
    promptData += `  - Pareggi: ${h2h.drawsInH2H}\n`;
    if(h2h.averageGoalsInH2H) promptData += `  - Media Gol per Partita: ${h2h.averageGoalsInH2H.toFixed(2)}\n`;
    promptData += `  - Ultimi Incontri:\n`;
    h2h.lastMeetings.slice(0, 5).forEach(m => {
      promptData += `    - ${m.date}: ${m.homeTeamName} ${m.score} ${m.awayTeamName} (Vincitore: ${m.winner || 'Pareggio'})${m.leagueName ? ` [${m.leagueName}]` : ''}\n`;
    });
  }
  
  promptData += "\nFINE DATI API ESTERNA.\n";
  return promptData;
};

const constructGeminiPrompt = (matchInput, externalApiData) => {
  const dateInstruction = matchInput.matchDate
    ? `DATA SPECIFICA FORNITA: '${matchInput.matchDate}'. Dai priorità assoluta a trovare la partita ufficiale disputata in questa data.`
    : `Identifica la prossima partita ufficiale in calendario tra le due squadre.`;

  const competitionContext = matchInput.league && (matchInput.league.toLowerCase().includes('champions') || matchInput.league.toLowerCase().includes('europa') || matchInput.league.toLowerCase().includes('conference'))
    ? `Trattandosi di un torneo europeo (${matchInput.league}), considera che potrebbe non esserci uno storico significativo di scontri diretti.`
    : `Considera gli scontri diretti storici se disponibili.`;
  
  const externalApiDataSection = formatSportsApiDataForPrompt(externalApiData, matchInput.homeTeam, matchInput.awayTeam);

  return `
Sei BrainTipster, un analista calcistico esperto. Fornisci un'analisi dettagliata per questa partita.

PARTITA DA ANALIZZARE:
Squadra Casa: ${matchInput.homeTeam}
Squadra Ospite: ${matchInput.awayTeam}
Competizione: ${matchInput.league || 'Non specificato'}
Data: ${matchInput.matchDate || 'Non fornita'}

${dateInstruction}
${competitionContext}

${externalApiDataSection}

Fornisci un'analisi completa in formato JSON con la seguente struttura:

{
  "predictions": {
    "partitaIdentificata": "Descrizione della partita identificata",
    "fontiRicercaWeb": [],
    "externalApiDataUsed": ${!!externalApiData},
    "squadraVincente": {
      "squadra": "Nome squadra favorita",
      "probabilita": "XX%"
    },
    "risultatoFinaleProbabilita": {
      "vittoriaCasa": "XX%",
      "pareggio": "XX%",
      "vittoriaOspite": "XX%"
    },
    "overUnderGoals": [
      {"linea": "Over 0.5", "probabilita": "XX%"},
      {"linea": "Over 1.5", "probabilita": "XX%"},
      {"linea": "Over 2.5", "probabilita": "XX%"},
      {"linea": "Under 2.5", "probabilita": "XX%"},
      {"linea": "Under 3.5", "probabilita": "XX%"}
    ],
    "risultatiEsatti": [
      {"risultato": "1-0", "probabilita": "XX%"},
      {"risultato": "2-1", "probabilita": "XX%"},
      {"risultato": "1-1", "probabilita": "XX%"}
    ],
    "probabiliMarcatori": [
      {"nomeGiocatore": "Nome giocatore", "probabilitaGol": "Alta/Media/Bassa"}
    ],
    "statisticheMediePreviste": {
      "falliTotali": "XX-XX falli",
      "cornerTotali": "XX-XX corner",
      "cartelliniGialliTotali": "XX-XX cartellini gialli",
      "cartelliniRossiPossibili": "Bassa/Media/Alta probabilità",
      "tiriTotali": "XX-XX tiri",
      "tiriInPortaTotali": "XX-XX tiri in porta",
      "parateTotaliPortieri": "XX-XX parate"
    },
    "consiglioScommessaExpert": [
      {
        "mercato": "Esito Finale",
        "selezione": "1X2",
        "lineaConsigliata": "",
        "valoreFiducia": "Alta/Media/Bassa",
        "statisticaCorrelata": {
          "nomeStatistica": "Forma casa",
          "valoreStatistica": "Ottima"
        },
        "motivazioneBreve": "Motivazione basata sull'analisi"
      }
    ],
    "ragionamentoAnalitico": "Analisi dettagliata della partita con considerazioni tattiche, forma delle squadre, statistiche storiche e fattori che influenzano il risultato."
  }
}

IMPORTANTE: Rispondi SOLO con il JSON valido, senza markdown o testo aggiuntivo.
`;
};

const constructCollaborationRefinementPrompt = (geminiDraftAnalysis) => {
  return `
Sei un esperto analista calcistico. Ricevi questa analisi preliminare e devi raffinarla e migliorarla mantenendo la stessa struttura JSON.

ANALISI DA RAFFINARE:
${JSON.stringify(geminiDraftAnalysis, null, 2)}

Il tuo compito:
1. Mantieni ESATTAMENTE la stessa struttura JSON
2. Migliora la precisione delle percentuali
3. Aggiungi dettagli al ragionamento analitico
4. Verifica la coerenza interna
5. Completa eventuali campi mancanti

Rispondi SOLO con l'oggetto JSON raffinato, senza markdown.
`;
};

const openRouterSystemPrompt = "Sei un esperto analista calcistico specializzato nel raffinamento di analisi JSON. Mantieni la struttura originale e migliora precisione e dettagli.";

const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0 && !(value instanceof Date)) return true;
  return false;
};

export const getMatchPrediction = async (matchInput) => {
  console.log(`🚀 Inizio analisi: ${matchInput.homeTeam} vs ${matchInput.awayTeam}`);
  
  let externalSportsData = null;
  let sportsApiErrorMessage = undefined;
  let externalApiDataUsedInitially = false;

  // Tentativo di recupero dati Sports API (se disponibile)
  const SPORTS_API_KEY = process.env.SPORTS_API_KEY;
  if (SPORTS_API_KEY && fetchExternalMatchData) {
    try {
      console.log("🏈 Tentativo recupero dati Sports API...");
      externalSportsData = await fetchExternalMatchData(matchInput, SPORTS_API_KEY);
      
      if (externalSportsData && externalSportsData.matchData && 
          (externalSportsData.matchData.homeTeamStats?.fixturesPlayed !== undefined || 
           externalSportsData.matchData.awayTeamStats?.fixturesPlayed !== undefined ||
           externalSportsData.matchData.headToHead?.totalMatches !== undefined)) {
        console.log("✅ Dati Sports API recuperati con successo");
        externalApiDataUsedInitially = true;
      } else {
        sportsApiErrorMessage = "Dati API Sports non trovati o insufficienti per questa partita.";
        console.warn("⚠️ " + sportsApiErrorMessage);
      }
    } catch (sportsError) {
      console.error("❌ Errore Sports API:", sportsError);
      sportsApiErrorMessage = sportsError.message;
      externalSportsData = null;
    }
  } else {
    if (!SPORTS_API_KEY) {
      sportsApiErrorMessage = "SPORTS_API_KEY non configurata nel backend.";
      console.warn("⚠️ " + sportsApiErrorMessage);
    }
    if (!fetchExternalMatchData) {
      console.warn("⚠️ Servizio Sports API non disponibile");
    }
  }

  // Costruzione prompt e configurazione modello
  const geminiPrompt = constructGeminiPrompt(matchInput, externalSportsData);
  console.log(`📝 Lunghezza prompt Gemini: ${geminiPrompt.length} caratteri`);

  // Configurazione modello Gemini corretto
  let model;
  try {
    model = genAI.getGenerativeModel({
      model: GEMINI_MODEL_NAME,
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 30,
        maxOutputTokens: 4096,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
    });
    
    console.log('✅ Modello Gemini configurato:', {
      modelExists: !!model,
      hasGenerateContent: !!(model && model.generateContent)
    });
    
  } catch (modelError) {
    console.error('❌ Errore configurazione modello:', modelError);
    throw new Error(`Errore configurazione modello Gemini: ${modelError.message}`);
  }

  let geminiResultText;
  let parsedGeminiData;
  let finalRefinedData;
  let geminiSearchSources = [];
  let refinementIssueMessage = undefined;

  try {
    console.log("📡 Invio richiesta a Gemini...");
    
    // Chiamata corretta all'API Gemini
    const geminiResponse = await model.generateContent(geminiPrompt);
    const response = await geminiResponse.response;
    geminiResultText = response.text();
    
    console.log("📨 Risposta ricevuta da Gemini");
    console.log(`📄 Lunghezza risposta: ${geminiResultText?.length || 0} caratteri`);

    // Parsing della risposta JSON
    if (geminiResultText && geminiResultText.trim()) {
      try {
        let jsonStr = geminiResultText.trim();
        
        // Rimuovi markdown se presente
        const fencedJsonRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/;
        const fencedMatch = jsonStr.match(fencedJsonRegex);

        if (fencedMatch && fencedMatch[1]) {
          jsonStr = fencedMatch[1].trim();
        } else {
          // Trova primo { e ultimo }
          const firstBrace = jsonStr.indexOf('{');
          const lastBrace = jsonStr.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace > firstBrace) {
            jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
          }
        }
        
        if (jsonStr) {
          const apiResponse = JSON.parse(jsonStr);
          if (apiResponse && apiResponse.predictions) {
            parsedGeminiData = apiResponse.predictions;
          } else if (apiResponse.partitaIdentificata || apiResponse.squadraVincente) {
            parsedGeminiData = apiResponse;
          }
        }

        if (parsedGeminiData) {
          parsedGeminiData.externalApiDataUsed = externalApiDataUsedInitially;
          console.log("✅ JSON da Gemini parsato con successo");
        }
        
      } catch (parseError) {
        console.error("❌ Errore parsing JSON da Gemini:", parseError);
        console.log("📄 Testo raw (primi 500 char):", geminiResultText.substring(0, 500));
      }
    }

    if (!parsedGeminiData) {
      throw new Error("Gemini non ha fornito una risposta JSON valida");
    }

    finalRefinedData = parsedGeminiData;

    // Tentativo di raffinamento con OpenRouter (se disponibile)
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    
    if (parsedGeminiData && OPENROUTER_API_KEY && callOpenRouterLLM) {
      console.log("🤖 Tentativo raffinamento con OpenRouter...");
      try {
        const refinementPrompt = constructCollaborationRefinementPrompt(parsedGeminiData);
        const openRouterResponseText = await callOpenRouterLLM(
          OPENROUTER_MODEL_NAME,
          refinementPrompt,
          OPENROUTER_API_KEY,
          openRouterSystemPrompt
        );
        
        if (openRouterResponseText && openRouterResponseText.trim()) {
          try {
            let mistralJsonStr = openRouterResponseText.trim();
            
            // Rimuovi markdown
            const fencedJsonRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/;
            const fencedMatch = mistralJsonStr.match(fencedJsonRegex);
            if (fencedMatch && fencedMatch[1]) {
              mistralJsonStr = fencedMatch[1].trim();
            }
            
            if (mistralJsonStr.startsWith("{") && mistralJsonStr.endsWith("}")) {
              const mistralParsedData = JSON.parse(mistralJsonStr);
              const tempRefinedData = { ...parsedGeminiData };
              let fieldsRefinedCount = 0;
              
              for (const key in tempRefinedData) {
                if (Object.prototype.hasOwnProperty.call(mistralParsedData, key)) {
                  const mistralValue = mistralParsedData[key];
                  if (!isEmpty(mistralValue)) {
                    tempRefinedData[key] = mistralValue;
                    if (JSON.stringify(mistralValue) !== JSON.stringify(parsedGeminiData[key])) {
                      fieldsRefinedCount++;
                    }
                  }
                }
              }
              
              finalRefinedData = tempRefinedData;
              finalRefinedData.externalApiDataUsed = externalApiDataUsedInitially;
              
              if (fieldsRefinedCount > 0) {
                refinementIssueMessage = `✅ Analisi raffinata con successo (${fieldsRefinedCount} campi migliorati)`;
                console.log(refinementIssueMessage);
              }
            }
          } catch (parseError) {
            refinementIssueMessage = "⚠️ Errore nel parsing della risposta OpenRouter";
            console.warn(refinementIssueMessage);
          }
        }
      } catch (openRouterError) {
        refinementIssueMessage = "⚠️ Errore comunicazione con OpenRouter";
        console.warn(refinementIssueMessage, openRouterError.message);
      }
    } else {
      if (!OPENROUTER_API_KEY) {
        refinementIssueMessage = "⚠️ OpenRouter non configurato (OPENROUTER_API_KEY mancante)";
      } else if (!callOpenRouterLLM) {
        refinementIssueMessage = "⚠️ Servizio OpenRouter non disponibile";
      }
      console.warn(refinementIssueMessage);
    }

    console.log("🎯 Analisi completata con successo");
    
    return { 
      parsed: finalRefinedData, 
      rawText: geminiResultText, 
      searchSources: finalRefinedData?.fontiRicercaWeb || geminiSearchSources, 
      externalSportsData: externalSportsData, 
      refinementIssue: refinementIssueMessage,
      sportsApiError: sportsApiErrorMessage 
    };

  } catch (error) {
    console.error('❌ Errore nel processo di generazione del pronostico:', error);
    
    let finalErrorMessage = 'Errore sconosciuto durante la generazione del pronostico.';
    if (error instanceof Error) {
      finalErrorMessage = error.message;
      if (error.message.includes("API key not valid")) {
        finalErrorMessage = `Chiave API Gemini non valida. Verifica la configurazione.`;
      } else if (error.message.includes("quota")) {
        finalErrorMessage = `Quota API Gemini esaurita. Riprova più tardi.`;
      }
    }
    
    throw new Error(`Errore API Gemini: ${finalErrorMessage}`);
  }
};