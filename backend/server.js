
// Usa 'import' per ESM se il tuo package.json ha "type": "module" o usi .mjs
// Altrimenti, usa 'require' per CommonJS
// Per semplicità e coerenza con @google/genai, assumiamo un ambiente ESM.
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv'; // Per caricare variabili d'ambiente da .env
import { getMatchPrediction } from './services/geminiService.js';

// Carica variabili d'ambiente da .env (opzionale, ma buona pratica)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Abilita CORS per tutte le rotte
app.use(express.json()); // Per parsare il body delle richieste JSON

// Rotta API per le predizioni
app.post('/api/predict', async (req, res) => {
  const matchInput = req.body;

  // Validazione base dell'input
  if (!matchInput || !matchInput.homeTeam || !matchInput.awayTeam) {
    return res.status(400).json({ message: "Input non valido: 'homeTeam' e 'awayTeam' sono obbligatori." });
  }

  try {
    // Verifica che le chiavi API essenziali siano configurate nel backend
    if (!process.env.API_KEY) {
      console.error("API_KEY per Gemini non configurata nel backend.");
      return res.status(500).json({ message: "Errore di configurazione del server: API_KEY Gemini mancante." });
    }
    // Altre chiavi (SPORTS_API_KEY, OPENROUTER_API_KEY) sono verificate all'interno dei rispettivi servizi.

    const predictionResponse = await getMatchPrediction(matchInput);
    res.json(predictionResponse);
  } catch (error) {
    console.error('Errore nella gestione della richiesta /api/predict:', error);
    res.status(500).json({ message: error.message || 'Errore interno del server durante l\'elaborazione della predizione.' });
  }
});

// Endpoint di health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'BrainTipster Backend is running.' });
});


app.listen(PORT, () => {
  console.log(`BrainTipster Backend in ascolto sulla porta ${PORT}`);
  console.log(`Endpoint API disponibile: POST http://localhost:${PORT}/api/predict`);
  console.log('Variabili d\'ambiente caricate (verifica):');
  console.log(`  API_KEY (Gemini): ${process.env.API_KEY ? 'Presente' : 'NON PRESENTE'}`);
  console.log(`  SPORTS_API_KEY: ${process.env.SPORTS_API_KEY ? 'Presente' : 'NON PRESENTE (opzionale, fallback non più nel codice)'}`);
  console.log(`  OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? 'Presente' : 'NON PRESENTE (opzionale per raffinamento)'}`);

});
