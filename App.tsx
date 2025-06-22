import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { MatchInputForm } from './components/MatchInputForm';
import { PredictionCard } from './components/PredictionCard';
import { LoadingIcon } from './components/LoadingIcon';
import { Footer } from './components/Footer';
import type { MatchInput, GeminiPredictionResponse } from './types';

// --- CONFIGURAZIONE URL BACKEND ---
let BACKEND_API_URL: string;

if (import.meta.env.DEV) {
  // In development, use Vite proxy (definito in vite.config.ts)
  BACKEND_API_URL = '/api/predict';
  console.log('Running in development mode. Using Vite proxy for backend.');
} else {
  // In production, il backend serve il frontend, quindi usiamo URL relative
  BACKEND_API_URL = '/api/predict';
  console.log('Running in production mode. Using relative URL for backend.');
}
// --- FINE CONFIGURAZIONE URL BACKEND ---

// --- CONFIGURAZIONE API KEY FRONTEND ---
// **** IMPORTANTE PER LA PRODUZIONE ****
// Questa chiave API viene inviata nell'header X-API-KEY per autenticare il frontend al backend.
// Deve corrispondere alla variabile d'ambiente FRONTEND_API_KEY configurata nel tuo backend.
const CLIENT_SIDE_API_KEY: string = 'e20AL7XEDZVXQ3n3ly2v7SSE5YBl5fpi3GkzQM858oUHTM8bdMM5v3yvUEKlXYUkyGRVhExQr7CnCJDO6PWZhoNvC1iJCnGhoxBlpxeLUYdmnyIDHEEa5unTbZhpVsg8';

// Questo controllo verifica se la chiave è il placeholder ORIGINALE, non la tua chiave attuale.
// Se hai già sostituito 'YOUR_SECRET_FRONTEND_API_KEY_HERE' con la tua chiave, questo log non apparirà, ed è corretto.
if (CLIENT_SIDE_API_KEY === 'YOUR_SECRET_FRONTEND_API_KEY_HERE') { 
  console.warn('ATTENZIONE: CLIENT_SIDE_API_KEY è ancora il placeholder. Aggiornala con la chiave API corretta per il backend, se l\'autenticazione è attiva sul backend!');
}
// --- FINE CONFIGURAZIONE API KEY FRONTEND ---

const App: React.FC = () => {
  const [predictionResponse, setPredictionResponse] = useState<GeminiPredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [refinementIssue, setRefinementIssue] = useState<string | null>(null);
  const [sportsApiError, setSportsApiError] = useState<string | null>(null);

  const handleMatchSubmit = useCallback(async (matchInput: MatchInput) => {
    setIsLoading(true);
    setError(null);
    setPredictionResponse(null);
    setRefinementIssue(null); 
    setSportsApiError(null);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (CLIENT_SIDE_API_KEY && CLIENT_SIDE_API_KEY !== 'YOUR_SECRET_FRONTEND_API_KEY_HERE') {
        headers['X-API-KEY'] = CLIENT_SIDE_API_KEY;
      } else if (CLIENT_SIDE_API_KEY === 'YOUR_SECRET_FRONTEND_API_KEY_HERE' && !import.meta.env.DEV) {
        console.error('CRITICAL: CLIENT_SIDE_API_KEY is still the placeholder in production. Backend authentication will likely fail if enabled.');
      }

      const response = await fetch(BACKEND_API_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(matchInput),
      });

      if (!response.ok) {
        let errorMessage = `Errore dal server: ${response.statusText} (Status: ${response.status})`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } catch (e) {
            // Se il corpo non è JSON o è vuoto, usa il messaggio di stato HTTP.
        }
        throw new Error(errorMessage);
      }

      const result: GeminiPredictionResponse = await response.json();
      
      setPredictionResponse(result);
      if (result.refinementIssue) {
        setRefinementIssue(result.refinementIssue);
      }
      if (result.sportsApiError) {
        setSportsApiError(result.sportsApiError);
      }

    } catch (err) {
      let errorMessage = 'Si è verificato un errore sconosciuto durante la comunicazione con il server.';
      if (err instanceof Error) {
         if (err.message.toLowerCase().includes("failed to fetch")) {
            errorMessage = `Errore di rete (Failed to fetch): Impossibile contattare il server BrainTipster (${BACKEND_API_URL}). 
            Possibili cause:
            \n- Il server backend non è in esecuzione o non è raggiungibile.
            \n- Problemi di connessione Internet o configurazione di rete (firewall, VPN).
            \n- Errore CORS se il backend non è configurato correttamente.
            \n- Verifica che l'applicazione sia correttamente deployata e in esecuzione.`;
        } else {
            errorMessage = err.message; 
        }
      }
      setError(errorMessage);
      console.error("Error fetching prediction from backend:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-transparent text-text-primary selection:bg-brand-primary selection:text-white">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 py-10 flex-grow flex flex-col items-center w-full max-w-5xl">
        <p className="text-center text-text-secondary mb-10 text-lg sm:text-xl px-2 leading-relaxed">
          Benvenuto in BrainTipster! Inserisci i dettagli della partita per ricevere un pronostico AI avanzato, statistiche dettagliate e consigli di betting.
        </p>
        
        <MatchInputForm onSubmit={handleMatchSubmit} isLoading={isLoading} />
        
        <div className="mt-12 w-full"> 
          {isLoading && (
            <div className="flex flex-col items-center animate-fadeIn w-full p-8 bg-surface-card rounded-xl shadow-xl">
              <LoadingIcon className="w-24 h-24 text-brand-primary" />
              <p className="text-text-primary font-bold mt-8 text-2xl">Elaborazione Pronostico Avanzato...</p>
              <p className="text-text-secondary text-lg animate-pulse-subtle mt-3">L'analisi AI di BrainTipster è in corso e potrebbe richiedere alcuni istanti.</p>
            </div>
          )}
          {error && (
            <div className="p-6 sm:p-8 bg-danger-bg text-danger border border-danger-border rounded-xl w-full text-center animate-fadeIn shadow-xl">
               <div className="flex justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-danger" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="font-bold text-2xl sm:text-3xl mb-2">Errore di Analisi</p>
              <p className="text-danger-light text-base sm:text-lg whitespace-pre-line">{error}</p>
            </div>
          )}
          {sportsApiError && !isLoading && !error && ( 
            <div className="my-6 p-4 bg-yellow-500/10 text-yellow-600 border border-yellow-500/30 rounded-xl w-full text-center animate-fadeIn shadow-lg">
                <div className="flex justify-center items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-semibold text-lg">Avviso API Sports</p>
                </div>
                <p className="text-yellow-700 text-sm">{sportsApiError}</p>
            </div>
          )}
          {refinementIssue && !isLoading && !error && ( 
            <div className="my-6 p-4 bg-yellow-500/10 text-yellow-600 border border-yellow-500/30 rounded-xl w-full text-center animate-fadeIn shadow-lg">
                <div className="flex justify-center items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3.006l-6.928-12.02A2.25 2.25 0 0012 4.506a2.25 2.25 0 00-1.932 1.13L3.14 14.654A2.502 2.502 0 004.872 17.5z" />
                    </svg>
                    <p className="font-semibold text-lg">Nota sull'Analisi</p>
                </div>
                <p className="text-yellow-700 text-sm">{refinementIssue}</p>
            </div>
          )}
          {predictionResponse && (
            <PredictionCard predictionData={predictionResponse} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;