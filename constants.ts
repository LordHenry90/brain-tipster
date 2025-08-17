
// Le costanti relative ai nomi dei modelli o altre configurazioni specifiche
// del frontend possono rimanere qui, se necessario.
// Per ora, GEMINI_MODEL_NAME, OPENROUTER_API_KEY, OPENROUTER_MODEL_NAME, e USER_SPORTS_API_KEY
// sono gestite dal backend.

// Esempio: se il frontend avesse bisogno di sapere il nome del modello per qualche motivo
// export const GEMINI_MODEL_NAME_INFO = "gemini-2.5-flash-preview-04-17"; // Non usato al momento

// Lista di oggetti per popolare facilmente la picklist nel frontend
export const LEAGUE_LIST = [
    { code: "PL", name: "Premier League" },
    { code: "SA", name: "Serie A" },
    { code: "BL1", name: "Bundesliga" },
    { code: "PD", name: "Primera Division" },
    { code: "FL1", name: "Ligue 1" },
    { code: "CL", name: "UEFA Champions League" },
    { code: "ELC", name: "Championship" },
    { code: "PPL", name: "Primeira Liga" },
    { code: "EC", name: "European Championship" },
    { code: "WC", name: "FIFA World Cup" },
    { code: "DED", name: "Eredivisie" },
    { code: "BSA", name: "Campeonato Brasileiro Série A" },
];

// Mappa robusta per la logica di trascodifica nel backend.
// Include alias comuni per ogni campionato.
export const LEAGUE_CODES: { [key: string]: string } = {
    // Premier League
    "premier league": "PL",
    "epl": "PL",

    // Serie A
    "serie a": "SA",
    "serie a tim": "SA",

    // Bundesliga
    "bundesliga": "BL1",

    // La Liga
    "primera division": "PD",
    "la liga": "PD",
    "liga": "PD",

    // Ligue 1
    "ligue 1": "FL1",
    "ligue1": "FL1",

    // Champions League
    "champions league": "CL",
    "uefa champions league": "CL",

    // Championship
    "championship": "ELC",
    "english league championship": "ELC",

    // Primeira Liga
    "primeira liga": "PPL",

    // Europei
    "european championship": "EC",
    "euro": "EC",
    "uefa european championship": "EC",

    // Mondiali
    "fifa world cup": "WC",
    "world cup": "WC",

    // Eredivisie
    "eredivisie": "DED",

    // Brasileirão
    "campeonato brasileiro série a": "BSA",
    "brasileirao": "BSA",
    "serie a brasileiro": "BSA"
};
