// Servizio per interagire con l'API di football-data.org V4

const API_BASE_URL = "https://api.football-data.org/v4/";

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
      const errorData = await response.json();
      console.error(`Errore API football-data (${response.status}): ${JSON.stringify(errorData)}`);
      throw new Error(`Errore da football-data.org: ${errorData.message || response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Errore di rete o parsing chiamando API football-data:", error);
    throw error;
  }
};

/**
 * Funzione principale per ottenere i dati completi di una partita imminente tra due squadre.
 * @param {object} matchInput Dati della partita forniti dall'utente.
 * @param {string} apiKey La tua chiave API.
 * @returns {Promise<SportsAPIData|null>} Dati completi della partita o null se non trovata.
 */
export const fetchExternalMatchData = async (matchInput, apiKey) => {
  try {
    // 1. Trovare l'ID delle squadre con una logica più robusta
    const teamsResponse = await makeApiRequest('teams', apiKey);
    if (!teamsResponse || !teamsResponse.teams) throw new Error("Risposta team non valida dall'API.");

    const findTeam = (name) => {
        const searchTerm = name.toLowerCase();
        // Priorità 1: Corrispondenza esatta del nome
        let team = teamsResponse.teams.find(t => t.name.toLowerCase() === searchTerm);
        if (team) return team;
        // Priorità 2: Corrispondenza esatta del nome breve
        team = teamsResponse.teams.find(t => t.shortName.toLowerCase() === searchTerm);
        if (team) return team;
        // Priorità 3: Corrispondenza parziale (come fallback)
        team = teamsResponse.teams.find(t => t.name.toLowerCase().includes(searchTerm));
        return team;
    };

    const homeTeam = findTeam(matchInput.homeTeam);
    const awayTeam = findTeam(matchInput.awayTeam);

    if (!homeTeam || !awayTeam) {
      throw new Error(`Impossibile trovare una o entrambe le squadre: ${matchInput.homeTeam}, ${matchInput.awayTeam}`);
    }
    
    // 2. Trovare il prossimo match tra le due squadre
    const matchesResponse = await makeApiRequest(`teams/${homeTeam.id}/matches?status=SCHEDULED`, apiKey);
    if (!matchesResponse || !matchesResponse.matches) throw new Error("Risposta partite non valida dall'API.");
    
    const upcomingMatch = matchesResponse.matches.find(m => m.awayTeam.id === awayTeam.id);

    if (!upcomingMatch) {
      console.warn(`Nessuna partita imminente trovata tra ${homeTeam.name} e ${awayTeam.name}.`);
      return null;
    }

    // 3. Ottenere i dettagli completi del match e, SEPARATAMENTE, l'H2H
    console.log(`Partita trovata con ID: ${upcomingMatch.id}. Recupero dettagli e H2H...`);
    
    // Chiamata 1: Dettagli del match
    const matchDetails = await makeApiRequest(`matches/${upcomingMatch.id}`, apiKey);

    // Chiamata 2: Dettagli Head-to-Head
    const h2hDetails = await makeApiRequest(`matches/${upcomingMatch.id}/head2head`, apiKey);

    if (!matchDetails || !h2hDetails) {
        throw new Error("La risposta dei dettagli del match o dell'H2H non è valida.");
    }
    
    return {
        match: matchDetails,
        head2head: h2hDetails
    };

  } catch (error) {
    console.error("Errore in fetchExternalMatchData (football-data):", error);
    // Propaga l'errore per gestirlo nel servizio Gemini
    throw error;
  }
};