export interface MatchInput {
  homeTeam: string;
  awayTeam: string;
  league?: string;
  matchDate?: string;
}

// --- START: Strutture Corrette e Complete per football-data.org API V4 ---

interface Area { id: number; name: string; code: string; flag: string | null; }
interface Competition { id: number; name: string; code: string; type: string; emblem: string | null; }
interface Coach { id: number | null; name: string | null; nationality: string | null; }
interface Player { id: number; name: string; position: string | null; shirtNumber: number | null; }

interface TeamStatistics {
  corner_kicks: number | null;
  free_kicks: number | null;
  goal_kicks: number | null;
  offsides: number | null;
  fouls: number | null;
  ball_possession: number | null;
  saves: number | null;
  throw_ins: number | null;
  shots: number | null;
  shots_on_goal: number | null;
  shots_off_goal: number | null;
  yellow_cards: number | null;
  yellow_red_cards: number | null;
  red_cards: number | null;
}

interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  coach: Coach | null;
  leagueRank: number | null;
  formation: string | null;
  lineup: Player[];
  bench: Player[];
  statistics: TeamStatistics | null;
  form?: string;
}

interface ScoreTime { home: number | null; away: number | null; }
interface Score { winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null; duration: string; fullTime: ScoreTime; halfTime: ScoreTime; }
interface Referee { id: number; name: string; type: string; nationality: string | null; }

interface Goal {
  minute: number;
  injuryTime: number | null;
  type: string;
  team: { id: number; name: string; };
  scorer: { id: number; name: string; };
  assist: { id: number; name: string; } | null;
  score: { home: number; away: number; };
}

// Struttura completa per la risposta di un singolo match
export interface ExternalMatchData {
  area: Area;
  competition: Competition;
  season: { id: number; startDate: string; endDate: string; currentMatchday: number; };
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  stage: string;
  group: string | null;
  lastUpdated: string;
  homeTeam: Team;
  awayTeam: Team;
  score: Score;
  goals: Goal[];
  bookings: { minute: number; team: { id: number; name: string; }; player: { id: number; name: string; }; card: 'YELLOW' | 'RED' }[];
  substitutions: { minute: number; team: { id: number; name: string; }; playerOut: { id: number; name: string; }; playerIn: { id: number; name: string; }; }[];
  odds: { homeWin: number; draw: number; awayWin: number; };
  referees: Referee[];
  venue?: string;
}

// Struttura per la risposta H2H
export interface ExternalH2HStats {
  aggregates: {
    numberOfMatches: number;
    totalGoals: number;
    homeTeam: { id: number; name: string; wins: number; draws: number; losses: number };
    awayTeam: { id: number; name: string; wins: number; draws: number; losses: number };
  };
  matches: ExternalMatchData[];
}

// Contenitore per i dati API combinati
export interface SportsAPIData {
  match: ExternalMatchData;
  head2head: ExternalH2HStats;
}
// --- FINE: Strutture Corrette ---

// --- Strutture Gemini (invariate) ---
export interface ResultProbability { vittoriaCasa: string; pareggio: string; vittoriaOspite: string; }
export interface OverUnderGoalLine { linea: string; probabilita: string; }
export interface ExactScoreProbability { risultato: string; probabilita: string; }
export interface ProbableScorer { nomeGiocatore: string; probabilitaGol: string; }
export interface TeamWinProbability { squadra: string; probabilita: string; }
export interface StatisticaConLinea { statistica: string; linea: string; }
export interface MatchStatisticsPrediction {
  falliTotali?: StatisticaConLinea;
  cornerTotali?: StatisticaConLinea;
  cartelliniTotali?: StatisticaConLinea;
  tiriTotali?: StatisticaConLinea;
  tiriInPortaTotali?: StatisticaConLinea;
  parateTotaliPortieri?: StatisticaConLinea;
  falliSquadraCasa?: StatisticaConLinea;
  cornerSquadraCasa?: StatisticaConLinea;
  cartelliniSquadraCasa?: StatisticaConLinea;
  tiriSquadraCasa?: StatisticaConLinea;
  tiriInPortaSquadraCasa?: StatisticaConLinea;
  paratePortiereSquadraCasa?: StatisticaConLinea;
  falliSquadraOspite?: StatisticaConLinea;
  cornerSquadraOspite?: StatisticaConLinea;
  cartelliniSquadraOspite?: StatisticaConLinea;
  tiriSquadraOspite?: StatisticaConLinea;
  tiriInPortaSquadraOspite?: StatisticaConLinea;
  paratePortiereSquadraOspite?: StatisticaConLinea;
}
export interface WebSource { uri: string; title: string; }
export interface StatisticaCorrelata { nomeStatistica: string; valoreStatistica: string; }
export interface BettingTip { mercato: string; selezione: string; lineaConsigliata?: string; valoreFiducia: string; statisticaCorrelata?: StatisticaCorrelata; motivazioneBreve: string; }
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
  risultatoFinale?: string;
  overUnder25?: string;
  risultatoEsatto?: string;
  marcatoreProbabile?: string;
  consiglioScommessa?: string;
  ragionamentoGenerale?: string;
}
export interface GeminiPredictionResponse {
  parsed?: PredictionDetails;
  rawText?: string;
  searchSources?: WebSource[];
  externalSportsData?: SportsAPIData | null;
  refinementIssue?: string;
  sportsApiError?: string;
}