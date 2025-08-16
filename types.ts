
export interface MatchInput {
  homeTeam: string;
  awayTeam: string;
  league?: string;
  matchDate?: string; 
}

// --- START: Strutture per API Sportiva Esterna Reale (v3.football.api-sports.io) ---
// Queste strutture sono usate internamente dal backend, ma possono essere utili 
// anche per il frontend se una parte dei dati sportivi grezzi viene esposta.
export interface ExternalTeamStats {
  teamId?: number;
  teamName: string;
  form?: string; // Es. "WWLDW"
  goalsFor?: { total: number | null; average: string | null; };
  goalsAgainst?: { total: number | null; average: string | null; };
  fixturesPlayed?: number;
  wins?: number;
  draws?: number;
  loses?: number;
  cleanSheets?: number;
  failedToScore?: number;
  penaltyScored?: number;
  penaltyMissed?: number;
  leagueSeason?: { leagueId?: number; leagueName?: string; seasonYear?: number };
}

export interface ExternalH2HMeeting {
  date: string;
  score: string; // Es. "2-1"
  winner?: string | null; // Nome squadra o "Pareggio" or null if not clear
  homeTeamName: string;
  awayTeamName: string;
  leagueName?: string;
}
export interface ExternalH2HStats {
  totalMatches: number;
  homeTeamWinsInH2H: number; 
  awayTeamWinsInH2H: number; 
  drawsInH2H: number;
  averageGoalsInH2H?: number; 
  lastMeetings: ExternalH2HMeeting[];
}

export interface ExternalPlayerStats { 
  playerName: string;
  goals: number;
  assists: number;
  shotsPerGame: number;
  keyPassesPerGame: number;
  currentFormRating?: number; 
  isInjured?: boolean;
  isSuspended?: boolean;
}

export interface ExternalMatchData {
  matchId?: string | number; 
  homeTeamStats?: ExternalTeamStats;
  awayTeamStats?: ExternalTeamStats;
  headToHead?: ExternalH2HStats;
  keyPlayersHome?: ExternalPlayerStats[]; 
  keyPlayersAway?: ExternalPlayerStats[]; 
  referee?: string; 
  stadium?: string;
  leagueName?: string;
  leagueId?: number;
  seasonYear?: number;
}

export interface SportsAPIData {
  matchData: ExternalMatchData | null; 
}
// --- END: Strutture per API Sportiva Esterna Reale ---


// Detailed sub-structures for the new prediction format

export interface ResultProbability {
  vittoriaCasa: string; // e.g., "45%"
  pareggio: string; // e.g., "30%"
  vittoriaOspite: string; // e.g., "25%"
}

export interface OverUnderGoalLine {
  linea: string; // e.g., "Over 0.5", "Under 2.5"
  probabilita: string; // e.g., "90%"
}

export interface ExactScoreProbability {
  risultato: string; // e.g., "2-1"
  probabilita: string; // e.g., "15%"
}

export interface ProbableScorer {
  nomeGiocatore: string;
  probabilitaGol: string; // e.g., "Alta", "55%"
}

export interface TeamWinProbability {
    squadra: string; // e.g. "Inter" or "Pareggio"
    probabilita: string; // e.g. "60%"
}

// Nuova struttura per singola statistica con valore calcolato e linea bookmaker
export interface StatisticaConLinea {
  statistica: string; // Valore calcolato dall'AI (es. "20.3")
  linea: string; // Linea dei bookmaker (es. "20.5")
}

// Struttura completa per tutte le statistiche previste
export interface MatchStatisticsPrediction {
  // Statistiche Totali
  falliTotali?: StatisticaConLinea;
  cornerTotali?: StatisticaConLinea;
  cartelliniTotali?: StatisticaConLinea;
  tiriTotali?: StatisticaConLinea;
  tiriInPortaTotali?: StatisticaConLinea;
  parateTotaliPortieri?: StatisticaConLinea;
  
  // Statistiche Squadra Casa
  falliSquadraCasa?: StatisticaConLinea;
  cornerSquadraCasa?: StatisticaConLinea;
  cartelliniSquadraCasa?: StatisticaConLinea;
  tiriSquadraCasa?: StatisticaConLinea;
  tiriInPortaSquadraCasa?: StatisticaConLinea;
  paratePortiereSquadraCasa?: StatisticaConLinea;
  
  // Statistiche Squadra Ospite
  falliSquadraOspite?: StatisticaConLinea;
  cornerSquadraOspite?: StatisticaConLinea;
  cartelliniSquadraOspite?: StatisticaConLinea;
  tiriSquadraOspite?: StatisticaConLinea;
  tiriInPortaSquadraOspite?: StatisticaConLinea;
  paratePortiereSquadraOspite?: StatisticaConLinea;
}

export interface WebSource {
  uri: string;
  title: string;
}

export interface StatisticaCorrelata {
  nomeStatistica: string; 
  valoreStatistica: string; 
}

export interface BettingTip {
  mercato: string; 
  selezione: string; 
  lineaConsigliata?: string; 
  valoreFiducia: string; 
  statisticaCorrelata?: StatisticaCorrelata; 
  motivazioneBreve: string; 
}

// Main PredictionDetails interface incorporating all new fields
export interface PredictionDetails {
  partitaIdentificata?: string; 
  fontiRicercaWeb?: WebSource[]; 
  squadraVincente?: TeamWinProbability;
  risultatoFinaleProbabilita?: ResultProbability;
  overUnderGoals?: OverUnderGoalLine[];
  risultatiEsatti?: ExactScoreProbability[];
  probabiliMarcatori?: ProbableScorer[];
  statisticheMediePreviste?: MatchStatisticsPrediction;
  consiglioScommessaExpert?: BettingTip[]; 
  ragionamentoAnalitico?: string;
  
  externalApiDataUsed?: boolean; 
  
  // Keep old fields for potential partial responses or backward compatibility if needed
  risultatoFinale?: string;
  overUnder25?: string;
  risultatoEsatto?: string;
  marcatoreProbabile?: string;
  consiglioScommessa?: string; 
  ragionamentoGenerale?: string;
}

// This is the structure we expect from Gemini when asking for JSON (usato nel backend)
export interface GeminiAPIResponseFormat {
  predictions: PredictionDetails;
}

// This is what our service layer (ORA IL BACKEND) returns to the frontend
export interface GeminiPredictionResponse {
  parsed?: PredictionDetails; 
  rawText?: string; // Potrebbe essere omesso se il backend gestisce sempre il parsing
  searchSources?: WebSource[]; 
  externalSportsData?: SportsAPIData | null; // Utile se il frontend vuole visualizzare alcuni dati grezzi
  refinementIssue?: string; 
  sportsApiError?: string; 
}
