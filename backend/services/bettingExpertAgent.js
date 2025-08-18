import { GoogleGenerativeAI } from "@google/generative-ai";
import { Performative, createMessage } from './agentProtocol.js';
import * as constants from '../constants.js';

// Import delle costanti con fallback se non esistono
let GEMINI_MODEL_NAME;

const AGENT_ID = 'BettingExpertAgent';
try {
  
  GEMINI_MODEL_NAME = constants.GEMINI_MODEL_NAME || 'gemini-1.5-flash';
  console.log(constants.GEMINI_MODEL_NAME);
} catch (error) {
  console.warn('⚠️ constants.js non trovato, uso valori di default');
  GEMINI_MODEL_NAME = 'gemini-1.5-flash';
}


/**
 * Costruisce il prompt per l'agente esperto di scommesse.
 * @param {object} preliminaryAnalysis - L'analisi JSON prodotta dall'agente analista.
 * @returns {string} Il prompt completo.
 */
const buildBettingExpertPrompt = (preliminaryAnalysis) => {
 return `
    Sei un Agente AI Esperto di Scommesse. Hai ricevuto un'analisi statistica preliminare da un altro agente.
    
    OBIETTIVI:
    1.  **RICERCA LINEE BOOKMAKER**: Per ogni statistica nella sezione "statisticheMediePreviste", esegui una ricerca web per trovare le linee offerte dai principali bookmaker (Snai, Sisal, bet365) e inseriscile nel campo "linea".
    2.  **GENERAZIONE CONSIGLI EXPERT**: Basandoti sull'analisi completa (statistiche + linee), genera una serie di consigli di scommessa dettagliati e motivati.

    ANALISI PRELIMINARE DALL'AGENTE ANALISTA:
    \`\`\`json
    ${JSON.stringify(preliminaryAnalysis, null, 2)}
    \`\`\`

    ISTRUZIONI DI OUTPUT:
    Restituisci ESCLUSIVAMENTE un oggetto JSON con la seguente struttura. Compila i campi "linea" e la sezione "consiglioScommessaExpert".

    {
      "statisticheMediePreviste": {
        "falliTotali": { "linea" : "stringa (la linea relativa alla statistica es. '20.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"},
        "cornerTotali": { "linea" : "stringa (la linea relativa alla statistica es. '20.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"},
        "cartelliniTotali": { "linea" : "stringa (la linea relativa alla statistica es. '3.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"},
        "tiriTotali": { "linea" : "stringa (la linea relativa alla statistica es. '25.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"} ,
        "tiriInPortaTotali": { "linea" : "stringa (la linea relativa alla statistica es. '8.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"},
		"parateTotaliPortieri": { "linea" : "stringa (la linea relativa alla statistica es. '8.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"},
        "falliSquadraCasa": { "linea" : "stringa (la linea relativa alla statistica es. '18.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"},
        "cornerSquadraCasa": { "linea" : "stringa (la linea relativa alla statistica es. '5.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"},
        "cartelliniSquadraCasa": { "linea" : "stringa (la linea relativa alla statistica es. '3.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"},
        "tiriSquadraCasa": { "linea" : "stringa (la linea relativa alla statistica es. '12.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"},
        "tiriInPortaSquadraCasa": { "linea" : "stringa (la linea relativa alla statistica es. '4.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"},
        "paratePortiereSquadraCasa": { "linea" : "stringa (la linea relativa alla statistica es. '2.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"},
        "falliSquadraOspite": { "linea" : "stringa (la linea relativa alla statistica es. '22.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"},
        "cornerSquadraOspite": { "linea" : "stringa (la linea relativa alla statistica es. '5.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"},
        "cartelliniSquadraOspite": { "linea" : "stringa (la linea relativa alla statistica es. '3.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"},
        "tiriSquadraOspite": { "linea" : "stringa (la linea relativa alla statistica es. '19.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"},
        "tiriInPortaSquadraOspite": { "linea" : "stringa (la linea relativa alla statistica es. '3.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"},
        "paratePortiereSquadraOspite": { "linea" : "stringa (la linea relativa alla statistica es. '2.5' ricavata dalla ricerca web sui principali bookmakers, Snai, Sisal e bet365, selezionando quella più vantaggiosa per la scommessa, sia statisticamente che per quota)"}
      },
		"consiglioScommessaExpert": [
			{
				"mercato": "stringa", "selezione": "stringa", "lineaConsigliata": "stringa (OPZIONALE)", "valoreFiducia": "stringa",
				"statisticaCorrelata": { "nomeStatistica": "stringa (OPZIONALE)", "valoreStatistica": "stringa (OPZIONALE)" },
				"motivazioneBreve": "stringa (basata su analisi fattuale e dati API)"
			}
		]
    }
  `;
};


/**
 * Gestisce i messaggi in arrivo per l'agente esperto di scommesse.
 * @param {object} message - Il messaggio ricevuto secondo l'agentProtocol.
 * @param {string} apiKey - La chiave API di Google.
 * @returns {Promise<object>} Un messaggio di risposta (INFORM o FAILURE).
 */
export const handleMessage = async (message, apiKey) => {
	
  if (message.performative !== Performative.REQUEST) {
    return createMessage(AGENT_ID, message.sender, Performative.FAILURE, "L'agente esperto accetta solo messaggi di tipo REQUEST.");
  }	
	
  const preliminaryAnalysis = message.content;
  
  // Inizializzazione API Gemini
  console.log('🔧 Inizializzazione GoogleGenerativeAI per Betting Expert Agent...');
  let ai;
  try {
    ai = new GoogleGenerativeAI(process.env.API_KEY);
  } catch (error) {
    throw new Error(`Errore nell'inizializzazione di GoogleGenerativeAI: ${error.message}`);
  }
  
  const geminiPrompt = buildBettingExpertPrompt(preliminaryAnalysis);
  console.log(`🤖 ${AGENT_ID}: Ricevuto ${message.performative} da ${message.sender}. Avvio analisi...`);
  console.log(`📝 Lunghezza prompt Gemini: ${geminiPrompt.length} caratteri.`);
  
  
  // Configurazione del modello
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
  console.log('🤖 Configurazione modello Gemini per Betting Expert Agent...');
  let model;
  try {
    model = ai.getGenerativeModel({
      model: GEMINI_MODEL_NAME,
      generationConfig: modelConfig,
      safetySettings: safetySettings,
      tools: [{ googleSearch: {} }],
    });
  } catch (error) {
    throw new Error(`Errore nella configurazione del modello Gemini: ${error.message}`);
  }
  
  let geminiResultText;
  let parsedGeminiData;
  
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
		parsedGeminiData = apiResponse;
      } else {
        throw new Error("Impossibile estrarre JSON valido dalla risposta");
      }
	  
	  console.log("✅ JSON di Gemini parsato con successo");
	  
	}catch (parseError) {
      console.error("❌ Errore nel parsing JSON da Gemini:", parseError);
      throw new Error(`Errore nel parsing della risposta Gemini: ${parseError.message}`);
    }	
	
    console.log("🎯 Analisi completata con successo");
	
	const enrichedResult = parsedGeminiData;
	
	console.log(`✅ ${AGENT_ID}: Arricchimento completato. Invio INFORM a ${message.sender}.`);
    return createMessage(AGENT_ID, message.sender, Performative.INFORM, enrichedResult);
	
  }catch (error) {
    console.error(`❌ Errore in ${AGENT_ID}:`, error);
    return createMessage(AGENT_ID, message.sender, Performative.FAILURE, error.message);
  }
	
}