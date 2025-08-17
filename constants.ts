
// Assumendo sintassi ESM per coerenza con @google/genai
export const GEMINI_MODEL_NAME = "gemini-2.5-pro";
export const OPENROUTER_MODEL_NAME = "mistralai/mistral-small-3.2-24b-instruct:free"; // Modello DeepSeek free su OpenRouter

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
