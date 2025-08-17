// Servizio per interagire con l'API di football-data.org V4

const API_BASE_URL = "https://api.football-data.org/v4/";

// Mappa per tradurre i nomi delle leghe comuni nei loro codici API
const LEAGUE_CODES = {
    "champions league": "CL",
    "uefa champions league": "CL",
    "bundesliga": "BL1",
    "eredivisie": "DED",
    "campeonato brasileiro série a": "BSA",
    "brasileirao": "BSA",
    "primera division": "PD",
    "la liga": "PD",
    "ligue 1": "FL1",
    "championship": "ELC",
    "primeira liga": "PPL",
    "serie a": "SA",
    "premier league": "PL",
    "fifa world cup": "WC",
    "world cup": "WC",
    "european championship": "EC",
    "euro": "EC"
};

const makeApiRequest = async (endpoint, apiKey) => {
  if (!apiKey) {
    console.warn("FOOTBALL_DATA_API_KEY non fornita. Impossibile fare richieste.");
    return null;
  }
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`Chiamata API football-data: ${url}`);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "X-Auth-Token": apiKey },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error(`Errore API football-data (${response.status}): ${JSON.stringify(errorData)}`);
      throw new Error(`Errore da football-data.org: ${errorData.message || 'Errore sconosciuto'}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Errore di rete o parsing chiamando API football-data:", error);
    throw error;
  }
};

/**
 * Funzione principale per ottenere i dati completi di una partita.
 * @param {object} matchInput Dati della partita forniti dall'utente.
 * @param {string} apiKey La tua chiave API.
 * @returns {Promise<SportsAPIData|null>} Dati completi della partita o null se non trovata.
 */
export const fetchExternalMatchData = async (matchInput, apiKey) => {
  try {
    // 1. DEDURRE CODICE LEGA E DATA
    if (!matchInput.league) {
        console.warn("Lega non fornita. Impossibile procedere con la ricerca mirata.");
        return null;
    }
    const competitionCode = LEAGUE_CODES[matchInput.league.toLowerCase()];
    if (!competitionCode) {
        console.warn(`Codice lega non trovato per "${matchInput.league}".`);
        return null;
    }

    const date = matchInput.matchDate || new Date().toISOString().split('T')[0];

    // 2. TROVARE LA PARTITA SPECIFICA IN QUEL GIORNO E IN QUELLA LEGA
    const endpoint = `competitions/${competitionCode}/matches?date=${date}`;
    const dailyMatches = await makeApiRequest(endpoint, apiKey);

    if (!dailyMatches || !dailyMatches.matches || dailyMatches.matches.length === 0) {
        console.warn(`Nessuna partita trovata per la lega ${competitionCode} in data ${date}.`);
        return null;
    }

    const homeTeamName = matchInput.homeTeam.toLowerCase();
    const awayTeamName = matchInput.awayTeam.toLowerCase();

    const targetMatch = dailyMatches.matches.find(match => 
        match.homeTeam.name.toLowerCase().includes(homeTeamName) &&
        match.awayTeam.name.toLowerCase().includes(awayTeamName)
    );

    if (!targetMatch) {
        console.warn(`Nessuna corrispondenza esatta per ${homeTeamName} vs ${awayTeamName} trovata.`);
        return null;
    }

    // 3. OTTENERE DETTAGLI E H2H USANDO L'ID DEL MATCH
    console.log(`Partita trovata con ID: ${targetMatch.id}. Recupero dettagli e H2H...`);
    
    // Chiamata 1: Dettagli completi del match
    const matchDetails = await makeApiRequest(`matches/${targetMatch.id}`, apiKey);

    // Chiamata 2: Dettagli Head-to-Head
    const h2hDetails = await makeApiRequest(`matches/${targetMatch.id}/head2head`, apiKey);

    if (!matchDetails || !h2hDetails) {
        throw new Error("La risposta dei dettagli del match o dell'H2H non è valida.");
    }
    
    return {
        match: matchDetails,
        head2head: h2hDetails
    };

  } catch (error) {
    console.error("Errore in fetchExternalMatchData (football-data):", error);
    // Propaga l'errore per gestirlo nel servizio Gemini, che mostrerà un messaggio all'utente.
    throw error;
  }
};