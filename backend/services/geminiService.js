import { fetchExternalMatchData } from './footballDataService.js';
import * as analystAgent from './analystAgent.js';
import * as bettingExpertAgent from './bettingExpertAgent.js';
import { createMessage, Performative } from './agentProtocol.js';
import _ from 'lodash';

const ORCHESTRATOR_ID = 'Orchestrator';


const formatSportsDataForPrompt = (sportsData, homeTeamNameInput, awayTeamNameInput) => {
  if (!sportsData || !sportsData.match || !sportsData.head2head) {
    return "Nessun dato statistico dettagliato fornito dall'API esterna. Basa l'analisi su conoscenze generali e ricerca web.";
  }

  const { match, head2head } = sportsData;
  let promptData = "\nDATI STATISTICI DETTAGLIATI FORNITI DA API ESTERNA (USA QUESTI COME FONTE PRIMARIA):\n";
  
  // Informazioni generali sulla partita
  promptData += `Partita: ${match.homeTeam.name} vs ${match.awayTeam.name}\n`;
  promptData += `Competizione: ${match.competition.name}, Stagione: ${match.season.startDate.substring(0, 4)}\n`;
  if (match.venue) promptData += `Stadio: ${match.venue}\n`;
  
  const mainReferee = match.referees?.find(r => r.type === 'REFEREE');
  if (mainReferee) promptData += `Arbitro: ${mainReferee.name}\n`;

  // Funzione per formattare i dettagli di una squadra
  const formatTeam = (team) => {
    let teamStr = `Squadra: ${team.name} (Acronimo: ${team.tla})\n`;
    if (team.coach) teamStr += `  - Allenatore: ${team.coach.name}\n`;
    if (team.formation) teamStr += `  - Ultima Formazione Utilizzata: ${team.formation}\n`;
    
    // Aggiunge le statistiche dell'ultima partita se disponibili
    if (team.statistics) {
        teamStr += "  - Statistiche Ultima Partita:\n";
        teamStr += `    - Possesso Palla: ${team.statistics.ball_possession}%\n`;
        teamStr += `    - Tiri totali: ${team.statistics.shots}\n`;
        teamStr += `    - Tiri in porta: ${team.statistics.shots_on_goal}\n`;
        teamStr += `    - Falli commessi: ${team.statistics.fouls}\n`;
        teamStr += `    - Calci d'angolo: ${team.statistics.corner_kicks}\n`;
        teamStr += `    - Cartellini gialli: ${team.statistics.yellow_cards}\n`;
    }
    return teamStr;
  };

  promptData += "\n--- SQUADRA CASA ---\n" + formatTeam(match.homeTeam);
  promptData += "\n--- SQUADRA OSPITE ---\n" + formatTeam(match.awayTeam);

  // Formattazione dati Head-to-Head
  if (head2head.aggregates) {
    const aggregates = head2head.aggregates;
    promptData += `\n--- SCONTRI DIRETTI (H2H) - AGGREGATO ---\n`;
    promptData += `  - Partite Totali Analizzate: ${aggregates.numberOfMatches}\n`;
    promptData += `  - Gol Totali: ${aggregates.totalGoals}\n`;
    promptData += `  - Vittorie ${aggregates.homeTeam.name}: ${aggregates.homeTeam.wins}\n`;
    promptData += `  - Vittorie ${aggregates.awayTeam.name}: ${aggregates.awayTeam.wins}\n`;
    promptData += `  - Pareggi: ${aggregates.homeTeam.draws}\n`;
  }
  
  if (head2head.matches && head2head.matches.length > 0) {
    promptData += `\n--- ULTIMI INCONTRI (H2H) ---\n`;
    head2head.matches.slice(0, 5).forEach(m => {
      const winner = m.score.winner === 'HOME_TEAM' ? m.homeTeam.name : m.score.winner === 'AWAY_TEAM' ? m.awayTeam.name : 'Pareggio';
      promptData += `    - ${new Date(m.utcDate).toLocaleDateString('it-IT')}: ${m.homeTeam.name} ${m.score.fullTime.home}-${m.score.fullTime.away} ${m.awayTeam.name} (Vincitore: ${winner})\n`;
    });
  }
  
  promptData += "\nFINE DATI API ESTERNA.\n";
  return promptData;
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

  const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;

  // Tentativo di recupero dati dall'API Sports
  if (FOOTBALL_DATA_API_KEY && fetchExternalMatchData) {
    try {
      console.log("🔍 Tentativo di recupero dati da da football-data.org...");
      externalSportsData = await fetchExternalMatchData(matchInput, FOOTBALL_DATA_API_KEY);
      
      if (externalSportsData && externalSportsData.match && 
          (externalSportsData.head2head.aggregates !== undefined || 
           externalSportsData.head2head.matches !== undefined)) {
        console.log("✅ Dati da football-data.org recuperati con successo e considerati significativi.");
        externalApiDataUsedInitially = true;
      } else {
        sportsApiErrorMessage = "Dati da football-data.org non trovati o insufficienti per questa partita. L'analisi sarà basata su web search e conoscenze generali.";
        console.warn("⚠️ " + sportsApiErrorMessage);
      }
    } catch (sportsError) {
      console.error("❌ Errore durante il recupero dei dati da da football-data.org:", sportsError);
      sportsApiErrorMessage = sportsError instanceof Error ? sportsError.message : "Errore sconosciuto durante il recupero dei dati sportivi esterni.";
      externalSportsData = null;
    }	  
	  
  }else {
    if (!FOOTBALL_DATA_API_KEY) {
      sportsApiErrorMessage = "FOOTBALL_DATA_API_KEY non configurata nel backend. Impossibile recuperare statistiche esterne dettagliate.";
      console.warn("⚠️ " + sportsApiErrorMessage);
    }
    if (!fetchExternalMatchData) {
      console.warn("⚠️ fetchExternalMatchData non disponibile");
    }
  }
  
  const externalApiDataSection = formatSportsDataForPrompt(externalSportsData, matchInput.homeTeam, matchInput.awayTeam);
  
  
  try {
	  
	// --- Inizio Conversazione Multi-Agente ---

    // 1. L'Orchestratore invia un REQUEST all'Agente Analista
	const requestToAnalyst = createMessage(
      ORCHESTRATOR_ID, 
      'AnalystAgent', 
      Performative.REQUEST, 
      { matchInput, externalApiDataSection }
    );
	
	const apiKey = process.env.API_KEY;
	
	const responseFromAnalyst = await analystAgent.handleMessage(requestToAnalyst, apiKey);
	
	const preliminaryAnalysis = responseFromAnalyst.content;
	
	// 2. L'Orchestratore invia un nuovo REQUEST all'Agente Esperto, con l'analisi del primo
    const requestToExpert = createMessage(
      ORCHESTRATOR_ID,
      'BettingExpertAgent',
      Performative.REQUEST,
      preliminaryAnalysis
    );
    const responseFromExpert = await bettingExpertAgent.handleMessage(requestToExpert, apiKey);
	
	if (responseFromExpert.performative === Performative.FAILURE) {
      throw new Error(`L'Agente Esperto ha fallito: ${responseFromExpert.content}`);
    }
    const expertEnrichment = responseFromExpert.content;
	
	// 3. Unione profonda e intelligente dei risultati per preservare la struttura
    const finalAnalysis = _.merge({}, preliminaryAnalysis, expertEnrichment);
    finalAnalysis.externalApiDataUsed = !!externalSportsData;

    console.log("🎯 Analisi multi-agente completata con successo");
	
	return { 
      parsed: finalAnalysis, 
      externalSportsData: externalSportsData,
      sportsApiError: sportsApiErrorMessage,
    };
	  
  }catch (error) {
    console.error('❌ Errore nel flusso di orchestrazione:', error);
    throw error;
  }
    
}