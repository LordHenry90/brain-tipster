import { GoogleGenerativeAI } from "@google/generative-ai";
import { Performative, createMessage } from './agentProtocol.js';
import * as constants from '../constants.js';

// Import delle costanti con fallback se non esistono
let GEMINI_MODEL_NAME;

const AGENT_ID = 'AnalystAgent';
try {
  
  GEMINI_MODEL_NAME = constants.GEMINI_MODEL_NAME || 'gemini-1.5-flash';
  console.log(constants.GEMINI_MODEL_NAME);
} catch (error) {
  console.warn('⚠️ constants.js non trovato, uso valori di default');
  GEMINI_MODEL_NAME = 'gemini-1.5-flash';
}


/**
 * Costruisce il prompt per l'agente analista, basandosi sulla logica originale.
 * @param {object} matchInput - L'input della partita dall'utente.
 * @param {string} externalApiDataSection - La stringa formattata con i dati dall'API esterna.
 * @returns {string} Il prompt completo.
 */
const buildAnalystPrompt = (matchInput, externalApiDataSection) => {
	
  const dateInstruction = matchInput.matchDate
    ? `Inoltre, l'utente ha fornito una DATA SPECIFICA: '${matchInput.matchDate}'. DAI PRIORITÀ ASSOLUTA a trovare la partita ufficiale disputata in QUESTA DATA. UTILIZZA LE TUE CAPACITÀ DI RICERCA WEB per confermare l'esistenza e i dettagli della partita in questa data. Includi le fonti web che hai utilizzato per la verifica nel campo 'fontiRicercaWeb'. Se i dati API esterni forniti si riferiscono a questa data, usali come fonte primaria.`
    : `Se non è fornita una data specifica dall'utente, identifica la *prossima partita ufficiale in calendario* tra le due squadre. Se i dati API esterni sono disponibili, considerali nel contesto della prossima partita.`;

  const competitionContext = matchInput.league && (matchInput.league.toLowerCase().includes('champions') || matchInput.league.toLowerCase().includes('europa') || matchInput.league.toLowerCase().includes('conference'))
    ? `Trattandosi di un torneo europeo (${matchInput.league}), è possibile che non esista uno storico di scontri diretti significativo tra le due squadre (verificalo con i dati API H2H se presenti). In tal caso, la tua analisi dovrà basarsi maggiormente su: 1) Forma attuale e performance recenti (dati API). 2) Forza relativa e performance nei rispettivi campionati nazionali (dati API e tue conoscenze). 3) Esperienza e performance in precedenti campagne europee. 4) Analisi tattica e qualità individuale dei giocatori. Se esistono scontri diretti (dati API), considerali, ma pondera la loro rilevanza se datati o in contesti molto diversi.`
    : `Considera gli scontri diretti storici (dati API H2H se presenti e rilevanti).`;

  return `
Sei un esperto analista di scommesse sportive sul calcio (Gemini). Stai preparando un'ANALISI PRELIMINARE DETTAGLIATA per una partita. 
Il tuo compito è fornire una base solida, precisa e completa. Evita speculazioni e attieniti ai dati e a interpretazioni conservative.

OBIETTIVO PRINCIPALE:
1.  **IDENTIFICA LA PARTITA**: Identifica la partita ufficiale: Squadra Casa ('${matchInput.homeTeam}'), Ospite ('${matchInput.awayTeam}'), Competizione ('${matchInput.league || 'Non specificato'}'). ${dateInstruction} Tutta l'analisi deve riferirsi a *questa specifica partita*.
2.  **UTILIZZA DATI API ESTERNI E RICERCA WEB**:
    ${externalApiDataSection}
    Se i dati API sono disponibili, usali come fonte primaria per statistiche, forma, H2H.
    Integra con le tue conoscenze generali e, se la data della partita è fornita, con ricerca web per notizie recenti (infortuni, morale squadra, ecc.) non coperte dai dati API. Cita le fonti web. ASSICURATI CHE LE FONTI WEB SIANO ATTENDIBILI E SOPRATTUTTO CHE I LINK SIANO VALIDI E PERTINENTI E CHE NON RISPONDANO '404 - NOT FOUND'.
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

SUGGERISCI I PROBABILI MARCATORI TENENDO CONTO DELLA VARIAZIONE DELLA ROSA. NON METTERE PROBABILI MARCATORI CHE NON FANNO PARTE ATTUALMENTE DELLE ROSE DELLE DUE SQUADRE.

Restituisci un oggetto JSON con la chiave "predictions" che contiene un oggetto con la seguente struttura:

{
  "predictions": {
    "partitaIdentificata": "stringa (OBBLIGATORIO: Descrizione partita ufficiale...)",
    "fontiRicercaWeb": [ { "uri": "stringa", "title": "stringa" }],
    "externalApiDataUsed": "boolean (true se i dati API esterni sono stati usati e sono significativi, false altrimenti)",
    "squadraVincente": { "squadra": "stringa", "probabilita": "stringa (es. '45%')" },
    "risultatoFinaleProbabilita": { "vittoriaCasa": "stringa", "pareggio": "stringa", "vittoriaOspite": "stringa" },
    "overUnderGoals": [ { "linea": "Over 0.5", "probabilita": "stringa" }, { "linea": "Under 4.5", "probabilita": "stringa" } ],
    "risultatiEsatti": [ { "risultato": "stringa", "probabilita": "stringa" } ],
    "probabiliMarcatori": [ { "nomeGiocatore": "stringa" , "probabilitaGol": "stringa (es. 'Alta' o '60%')" } ],
    "statisticheMediePreviste": {
      "falliTotali": { "statistica" : "stringa (calcolo preciso es. '20.3',totale basato su dati API se disponibili, altrimenti ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)"} ,
      "cornerTotali": { "statistica" : "stringa (calcolo preciso es. '9.5',totale basato su dati API se disponibili, altrimenti ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)"} ,
      "cartelliniTotali": { "statistica" : "stringa (calcolo preciso es. '3.5', totale basato su dati API se disponibili, altrimenti ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)"} ,
      "tiriTotali": { "statistica" :  "stringa (calcolo preciso es. '25.7', stima totale basata su dati API, stile di gioco e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)"} ,
      "tiriInPortaTotali": { "statistica" :  "stringa (calcolo preciso es. '8.5', stima totale basata su dati API, stile di gioco e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)"} ,
      "parateTotaliPortieri": { "statistica" :  "stringa (calcolo preciso es. '4.3', stima totale basata sul volume di tiri previsto e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta )"} ,
      "falliSquadraCasa": { "statistica" :  "stringa (calcolo preciso es. '18.2', basati per la Squadra Casa '${matchInput.homeTeam}' su dati API se disponibili, altrimenti ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)"} ,
      "cornerSquadraCasa": { "statistica" :  "stringa (calcolo preciso es. '5.8', basati per la Squadra Casa '${matchInput.homeTeam}' su dati API se disponibili, altrimenti ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)"} ,
      "cartelliniSquadraCasa": { "statistica" :  "stringa (calcolo preciso es. '3.8', basati per la Squadra Casa '${matchInput.homeTeam}' su dati API se disponibili, altrimenti ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)"} ,
      "tiriSquadraCasa": { "statistica" :  "stringa (calcolo preciso es. '13.7', stima per la Squadra Casa '${matchInput.homeTeam}' basata su dati API, stile di gioco e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)"} ,
      "tiriInPortaSquadraCasa": { "statistica" :  "stringa (calcolo preciso es. '6.5', stima per la Squadra Casa '${matchInput.homeTeam}' basata su dati API, stile di gioco e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)"} ,
      "paratePortiereSquadraCasa": { "statistica" :  "stringa (calcolo preciso es. '3.3', stima basata per la Squadra Casa '${matchInput.homeTeam}' sul volume di tiri previsto e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta )"} ,
      "falliSquadraOspite": { "statistica" :  "stringa (calcolo preciso es. '26.3', basati per la Squadra Ospite '${matchInput.awayTeam}' su dati API se disponibili, altrimenti ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)"} ,
      "cornerSquadraOspite": "stringa (calcolo preciso es. '7.5', basati per la Squadra Ospite '${matchInput.awayTeam}' su dati API se disponibili, altrimenti ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)"} ,
      "cartelliniSquadraOspite": { "statistica" :  "stringa (calcolo preciso es. '3.2', basati per la Squadra Ospite '${matchInput.awayTeam}' su dati API se disponibili, altrimenti ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)"} ,
      "tiriSquadraOspite": { "statistica" :  "stringa (calcolo preciso es. '21.7', stima basata per la Squadra Ospite '${matchInput.awayTeam}' su dati API, stile di gioco e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)"} ,
      "tiriInPortaSquadraOspite": { "statistica" :  "stringa (calcolo preciso es. '5.5', stima basata per la Squadra Ospite '${matchInput.awayTeam}' su dati API, stile di gioco e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta)"} ,
      "paratePortiereSquadraOspite": { "statistica" :  "stringa (calcolo preciso es. '2.3', stima basata sul volume di tiri previsto per la Squadra Ospite '${matchInput.awayTeam}' e ricerca web delle statistiche pubbliche di provider Opta o di clienti che utilizzano Opta )"} 
    },
    "ragionamentoAnalitico": "stringa (Analisi preliminare concisa e fattuale (150-300 parole) CHE INTEGRA i dati API esterni (se usati), contesto, notizie oggettive, ecc. Questa sarà la base per la rifinitura.)"
  }
}
Assicurati che tutte le probabilità siano stringhe percentuali (es. "75%"). Solo JSON.
NON INCLUDERE NESSUN TESTO AL DI FUORI DELL'OGGETTO JSON, nemmeno i delimitatori \`\`\`json \`\`\`. La risposta deve essere ESCLUSIVAMENTE l'oggetto JSON.
`;	
		
}


/**
 * Gestisce i messaggi in arrivo per l'agente analista.
 * @param {object} message - Il messaggio ricevuto secondo l'agentProtocol.
 * @param {string} apiKey - La chiave API di Google.
 * @returns {Promise<object>} Un messaggio di risposta (INFORM o FAILURE).
 */
export const handleMessage = async (message, apiKey) => {
	  if (message.performative !== Performative.REQUEST) {
    return createMessage(AGENT_ID, message.sender, Performative.FAILURE, "L'agente analista accetta solo messaggi di tipo REQUEST.");
  }
  
  const { matchInput, externalApiDataSection } = message.content;

  // Inizializzazione API Gemini
  console.log('🔧 Inizializzazione GoogleGenerativeAI per Analyst Agent...');
  let ai;
  try {
    ai = new GoogleGenerativeAI(process.env.API_KEY);
  } catch (error) {
    throw new Error(`Errore nell'inizializzazione di GoogleGenerativeAI: ${error.message}`);
  }
  
  
  const geminiPrompt = buildAnalystPrompt(matchInput, externalApiDataSection);
  console.log(`🤖 ${AGENT_ID}: Ricevuto ${message.performative} da ${message.sender}. Avvio analisi...`);
  console.log(`📝 Lunghezza prompt Gemini: ${geminiPrompt.length} caratteri.`);
  
  // Configurazione del modello
  const hasSearchTools = !!matchInput.matchDate;
  const modelConfig = {
    temperature: 0.6, 
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
  console.log('🤖 Configurazione modello Gemini per Analyst Agent...');
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
  let geminiSearchSources = [];
  
  
  try{
	console.log("📡 Invio richiesta a Gemini...");
	
	// Chiamata al modello Gemini
    const geminiResponse = await model.generateContent(geminiPrompt);
    
    if (!geminiResponse || !geminiResponse.response) {
      throw new Error("Risposta non valida da Gemini");
    }
	
    const response = await geminiResponse.response;
    geminiResultText = response.text();

    console.log("📥 Testo grezzo ricevuto da Gemini (primi 500 caratteri):", geminiResultText?.substring(0, 500));
	
	console.log("Full Gemini Raw Response:", geminiResultText);

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
        parsedGeminiData.externalApiDataUsed = true;
        
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
	
    console.log("🎯 Analisi completata con successo");

    // Costruzione della risposta finale
    const analysisResult = parsedGeminiData;
	
	console.log(`✅ ${AGENT_ID}: Analisi completata. Invio INFORM a ${message.sender}.`);
    return createMessage(AGENT_ID, message.sender, Performative.INFORM, analysisResult);
	  
  }catch (error) {
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
	
}