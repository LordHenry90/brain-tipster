
// Le costanti relative ai nomi dei modelli o altre configurazioni specifiche
// del frontend possono rimanere qui, se necessario.
// Per ora, GEMINI_MODEL_NAME, OPENROUTER_API_KEY, OPENROUTER_MODEL_NAME, e USER_SPORTS_API_KEY
// sono gestite dal backend.

// Esempio: se il frontend avesse bisogno di sapere il nome del modello per qualche motivo
// export const GEMINI_MODEL_NAME_INFO = "gemini-2.5-flash-preview-04-17"; // Non usato al momento

// Mappa robusta per la logica di trascodifica nel backend.
// Include alias comuni per ogni campionato.
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
