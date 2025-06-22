// Usa 'import' per ESM se il tuo package.json ha "type": "module" o usi .mjs
// Altrimenti, usa 'require' per CommonJS
// Per semplicità e coerenza con @google/genai, assumiamo un ambiente ESM.
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv'; // Per caricare variabili d'ambiente da .env
import path from 'path';
import { fileURLToPath } from 'url';
import { getMatchPrediction } from './services/geminiService.js';

// Carica variabili d'ambiente da .env (opzionale, ma buona pratica)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Per ES modules, dobbiamo ricreare __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors()); // Abilita CORS per tutte le rotte
app.use(express.json()); // Per parsare il body delle richieste JSON

// Serve static files (frontend built) in produzione
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
}

// NUOVO: Global request logger - METTERE PRIMA DI TUTTE LE ALTRE ROTTE E MIDDLEWARE SPECIFICI DI ROTTA
app.use((req, res, next) => {
  console.log(`[Railway INCOMING] Timestamp: ${new Date().toISOString()}, Method: ${req.method}, URL: ${req.originalUrl}, IP: ${req.ip}`);
  next();
});

// Middleware per la verifica dell'API Key
const apiKeyAuth = (req, res, next) => {
  const backendApiKey = process.env.FRONTEND_API_KEY;
  if (backendApiKey) { // Verifica solo se una chiave API è configurata nel backend
    const frontendApiKey = req.headers['x-api-key'];
    if (!frontendApiKey) {
      return res.status(401).json({ message: "Chiave API mancante nell'header X-API-KEY." });
    }
    if (frontendApiKey !== backendApiKey) {
      return res.status(401).json({ message: "Chiave API non valida." });
    }
  }
  next();
};

// Helper function to notify n8n webhook
async function notifyN8n(predictionData) {
  const webhookUrl = process.env.N8N_RESULTS_WEBHOOK_URL;
  if (webhookUrl) {
    console.log(`Attempting to send prediction data to n8n webhook: ${webhookUrl}`);
    try {
      // fetch is global in Node.js v18+
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(predictionData),
      });
      if (!response.ok) {
        const responseBody = await response.text();
        console.error(`Error sending data to n8n webhook: ${response.status} ${response.statusText}. Response: ${responseBody}`);
      } else {
        console.log('Prediction data successfully sent to n8n webhook.');
      }
    } catch (error) {
      console.error('Failed to send data to n8n webhook due to a network or setup error:', error);
    }
  }
}

// Endpoint di health check (solitamente non protetto da API Key)
app.get('/health', (req, res) => {
    console.log('[Railway ROUTE] /health endpoint hit'); // Log specifico per la rotta
    res.status(200).json({ 
      status: 'UP', 
      message: 'BrainTipster Backend is running.',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
});

// Rotta API per le predizioni, protetta da API Key Auth
app.post('/api/predict', apiKeyAuth, async (req, res) => {
  console.log('[Railway ROUTE] /api/predict endpoint hit'); // Log specifico per la rotta
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

    // After successfully sending response to client, try to notify n8n (fire and forget)
    if (process.env.N8N_RESULTS_WEBHOOK_URL) {
      notifyN8n(predictionResponse).catch(err => {
        // Log errors from the async notification without affecting the client response
        console.error("Background task to notify n8n failed:", err);
      });
    }

  } catch (error) {
    console.error('Errore nella gestione della richiesta /api/predict:', error);
    res.status(500).json({ message: error.message || 'Errore interno del server durante l\'elaborazione della predizione.' });
  }
});

// Serve frontend in produzione (catch-all route)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`BrainTipster Backend in ascolto sulla porta ${PORT} sull'host 0.0.0.0`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Endpoint API disponibile: POST /api/predict`);
  console.log(`Health check disponibile: GET /health`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`Frontend served from: /public`);
  }
  console.log('Variabili d\'ambiente caricate (verifica):');
  console.log(`  API_KEY (Gemini): ${process.env.API_KEY ? 'Presente' : 'NON PRESENTE (CRITICO!)'}`);
  console.log(`  SPORTS_API_KEY: ${process.env.SPORTS_API_KEY ? 'Presente' : 'NON PRESENTE (Analisi degradata)'}`);
  console.log(`  OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? 'Presente' : 'NON PRESENTE (Raffinamento disabilitato)'}`);
  console.log(`  N8N_RESULTS_WEBHOOK_URL: ${process.env.N8N_RESULTS_WEBHOOK_URL ? process.env.N8N_RESULTS_WEBHOOK_URL : 'NON PRESENTE (Invio risultati a n8n disabilitato)'}`);
  console.log(`  FRONTEND_API_KEY: ${process.env.FRONTEND_API_KEY ? 'Configurata (Autenticazione frontend ATTIVA)' : 'NON PRESENTE (Autenticazione frontend DISATTIVATA)'}`);
});