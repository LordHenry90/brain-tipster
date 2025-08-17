
// Assumendo sintassi ESM. Usa 'require' per CommonJS se necessario.
// 'fetch' è globale in Node.js >= v18. Altrimenti, installa 'node-fetch'.

const API_SPORTS_BASE_URL = "https://v3.football.api-sports.io";

const makeApiRequest = async (endpoint, apiKey, params = new URLSearchParams()) => {
  if (!apiKey) {
    console.warn("SPORTS_API_KEY non fornita al servizio. Impossibile fare richieste API Sports.");
    // Non lanciare un errore qui, ma lascia che fetchExternalMatchData lo gestisca
    // restituendo dati nulli o un messaggio di errore specifico.
    return null; 
  }
  const url = `${API_SPORTS_BASE_URL}/${endpoint}?${params.toString()}`;
  console.log(`Chiamata API Sports (backend): ${url.substring(0,100)}...`); // Log abbreviato
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "v3.football.api-sports.io"
      }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error(`Errore API Sports (${response.status}) (backend): ${JSON.stringify(errorData)} per URL: ${url}`);
      if (response.status === 401 || response.status === 403) {
        throw new Error("Chiave API Sports non valida o non autorizzata (controlla la variabile d'ambiente SPORTS_API_KEY nel backend).");
      }
      if (response.status === 429) {
        throw new Error("Limite di richieste API Sports raggiunto. Riprova più tardi.");
      }
      throw new Error(`Errore API Sports (${response.status}): ${errorData.message || 'Errore sconosciuto'}`);
    }
    const data = await response.json();
    if (data.errors && (Object.keys(data.errors).length > 0 || (Array.isArray(data.errors) && data.errors.length > 0) )) {
        const errorMessages = Array.isArray(data.errors) ? data.errors.join(", ") : JSON.stringify(data.errors);
        if (errorMessages.toLowerCase().includes("not included in your subscription")) {
            throw new Error("La lega richiesta non è inclusa nel tuo piano di abbonamento API Sports.");
        }
        if (errorMessages.toLowerCase().includes("no league found")) {
            throw new Error("Nessuna lega trovata con il nome fornito nell'API Sports.");
        }
        throw new Error(`Errore dall'API Sports: ${errorMessages}`);
    }
    return data.response;
  } catch (error) {
    console.error("Errore di rete o parsing chiamando API Sports (backend):", error);
    throw error;
  }
};

const getTeamId = async (teamName, apiKey) => {
  const params = new URLSearchParams({ search: teamName });
  const response = await makeApiRequest("teams", apiKey, params);
  if (response && response.length > 0) {
    const exactMatch = response.find((item) => item.team.name.toLowerCase() === teamName.toLowerCase());
    if (exactMatch) return exactMatch.team.id;
    return response[0].team.id;
  }
  console.warn(`Nessun ID squadra trovato per ${teamName} (backend)`);
  return null;
};

const getLeagueId = async (leagueName, seasonYear, apiKey) => {
  const params = new URLSearchParams({ name: leagueName, season: String(seasonYear) });
  const response = await makeApiRequest("leagues", apiKey, params);
  if (response && response.length > 0) {
    const exactMatch = response.find((item) => item.league.name.toLowerCase() === leagueName.toLowerCase());
     if (exactMatch) return exactMatch.league.id;
    return response[0].league.id;
  }
  console.warn(`Nessun ID lega trovato per ${leagueName}, stagione ${seasonYear} (backend)`);
  return null;
};

const fetchTeamSeasonStats = async (teamId, leagueId, seasonYear, apiKey) => {
  const params = new URLSearchParams({
    league: String(leagueId),
    season: String(seasonYear),
    team: String(teamId)
  });
  const responseData = await makeApiRequest("teams/statistics", apiKey, params);
  if (!responseData) return null;

  const stats = responseData;
  return {
    teamId: stats.team?.id,
    teamName: stats.team?.name || "N/A",
    form: stats.form || "N/A",
    goalsFor: { 
        total: stats.goals?.for?.total?.total || null, 
        average: stats.goals?.for?.average?.total || stats.goals?.for?.average?.home || stats.goals?.for?.average?.away || null
    },
    goalsAgainst: { 
        total: stats.goals?.against?.total?.total || null, 
        average: stats.goals?.against?.average?.total || stats.goals?.against?.average?.home || stats.goals?.against?.average?.away || null 
    },
    fixturesPlayed: stats.fixtures?.played?.total || 0,
    wins: stats.fixtures?.wins?.total || 0,
    draws: stats.fixtures?.draws?.total || 0,
    loses: stats.fixtures?.loses?.total || 0,
    cleanSheets: stats.clean_sheet?.total || 0,
    failedToScore: stats.failed_to_score?.total || 0,
    penaltyScored: stats.penalty?.scored?.total || 0,
    penaltyMissed: stats.penalty?.missed?.total || 0,
    leagueSeason: {
        leagueId: stats.league?.id,
        leagueName: stats.league?.name,
        seasonYear: stats.league?.season
    }
  };
};

const fetchH2HData = async (homeTeamId, awayTeamId, apiKey, limit = 5) => {
  const params = new URLSearchParams({
    h2h: `${homeTeamId}-${awayTeamId}`,
    last: String(limit)
  });
  const responseData = await makeApiRequest("fixtures/headtohead", apiKey, params);
  if (!responseData || !Array.isArray(responseData)) return null;

  const meetings = responseData.map((fixture) => {
    let winner = "Pareggio";
    if (fixture.teams.home.winner) winner = fixture.teams.home.name;
    else if (fixture.teams.away.winner) winner = fixture.teams.away.name;
    
    return {
      date: new Date(fixture.fixture.date).toLocaleDateString('it-IT'),
      score: `${fixture.goals.home}-${fixture.goals.away}`,
      winner: winner,
      homeTeamName: fixture.teams.home.name,
      awayTeamName: fixture.teams.away.name,
      leagueName: fixture.league?.name
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let homeTeamWinsInH2H = 0;
  let awayTeamWinsInH2H = 0;
  let drawsInH2H = 0;
  let totalGoalsInH2H = 0;

  responseData.forEach((fixture) => {
    totalGoalsInH2H += (fixture.goals.home || 0) + (fixture.goals.away || 0);
    if (fixture.teams.home.id === homeTeamId && fixture.teams.home.winner) {
      homeTeamWinsInH2H++;
    } else if (fixture.teams.away.id === awayTeamId && fixture.teams.away.winner) {
      awayTeamWinsInH2H++;
    } else if (!fixture.teams.home.winner && !fixture.teams.away.winner) {
      drawsInH2H++;
    }
  });
  
  return {
    totalMatches: responseData.length,
    homeTeamWinsInH2H,
    awayTeamWinsInH2H,
    drawsInH2H,
    averageGoalsInH2H: responseData.length > 0 ? parseFloat((totalGoalsInH2H / responseData.length).toFixed(2)) : 0,
    lastMeetings: meetings.slice(0, limit)
  };
};

export const fetchExternalMatchData = async (matchInput, apiKey) => {
  if (!apiKey) {
    console.warn("SPORTS_API_KEY non fornita a fetchExternalMatchData (backend). Impossibile recuperare dati sportivi.");
    // Lanciare un errore qui o restituire null e lasciare che geminiService lo gestisca.
    // Per coerenza, lanciamo un errore che geminiService può catturare.
    throw new Error("SPORTS_API_KEY non configurata nel backend. Impossibile recuperare dati sportivi esterni.");
  }

  try {
    const seasonYear = matchInput.matchDate ? new Date(matchInput.matchDate).getFullYear() : new Date().getFullYear();
    
    let leagueId = null;
    if (matchInput.league) {
      leagueId = await getLeagueId(matchInput.league, seasonYear, apiKey);
      if (!leagueId) {
         console.warn(`ID Lega non trovato per ${matchInput.league}, stagione ${seasonYear} (backend).`);
      }
    } else {
        console.warn("Nessuna lega specificata (backend). Statistiche di squadra potrebbero non essere recuperate.");
    }

    const homeTeamId = await getTeamId(matchInput.homeTeam, apiKey);
    const awayTeamId = await getTeamId(matchInput.awayTeam, apiKey);

    if (!homeTeamId || !awayTeamId) {
      console.error("ID squadra non trovato per una o entrambe le squadre (backend).");
      throw new Error("Impossibile identificare una o entrambe le squadre nell'API Sports (backend).");
    }
    
    let homeTeamStats = null;
    let awayTeamStats = null;

    if (leagueId) {
        homeTeamStats = await fetchTeamSeasonStats(homeTeamId, leagueId, seasonYear, apiKey);
        awayTeamStats = await fetchTeamSeasonStats(awayTeamId, leagueId, seasonYear, apiKey);
    } else {
        console.warn("Statistiche stagionali non recuperate a causa di ID lega mancante (backend).");
    }
    
    const headToHeadStats = await fetchH2HData(homeTeamId, awayTeamId, apiKey);

    const matchData = {
      homeTeamStats: homeTeamStats || { teamName: matchInput.homeTeam, teamId: homeTeamId },
      awayTeamStats: awayTeamStats || { teamName: matchInput.awayTeam, teamId: awayTeamId },
      headToHead: headToHeadStats || undefined,
      leagueName: matchInput.league,
      leagueId: leagueId || undefined,
      seasonYear: seasonYear,
    };
    
    if (matchInput.matchDate && leagueId) {
        const fixtureParams = new URLSearchParams({
            league: String(leagueId),
            season: String(seasonYear),
            team: String(homeTeamId),
            date: matchInput.matchDate
        });
        const fixtureResponse = await makeApiRequest("fixtures", apiKey, fixtureParams);
        if (fixtureResponse && fixtureResponse.length > 0) {
            const fixture = fixtureResponse.find((f) => 
                (f.teams.home.id === homeTeamId && f.teams.away.id === awayTeamId) ||
                (f.teams.home.id === awayTeamId && f.teams.away.id === homeTeamId) 
            );
            if (fixture) {
                matchData.matchId = fixture.fixture.id;
                matchData.stadium = fixture.fixture.venue?.name ? `${fixture.fixture.venue.name}, ${fixture.fixture.venue.city}` : undefined;
                matchData.referee = fixture.fixture.referee || undefined;
            }
        }
    }
    return { matchData };
  } catch (error) {
    console.error("Errore generale in fetchExternalMatchData (backend):", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("Errore sconosciuto durante il recupero dei dati sportivi (backend).");
  }
};
