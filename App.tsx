
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { MatchInputForm } from './components/MatchInputForm';
import { PredictionCard } from './components/PredictionCard';
import { LoadingIcon } from './components/LoadingIcon';
import { Footer } from './components/Footer';
import type { MatchInput, GeminiPredictionResponse } from './types';

// L'URL del backend. In produzione, dovrebbe essere l'URL del tuo server deployato.
const BACKEND_API_URL = 'http://localhost:3001/api/predict'; 

const App: React.FC = () => {
  const [predictionResponse, setPredictionResponse] = useState<GeminiPredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Questi stati verranno popolati dalla risposta del backend
  const [refinementIssue, setRefinementIssue] = useState<string | null>(null);
  const [sportsApiError, setSportsApiError] = useState<string | null>(null);

  const handleMatchSubmit = useCallback(async (matchInput: MatchInput) => {
    setIsLoading(true);
    setError(null);
    setPredictionResponse(null);
    setRefinementIssue(null); 
    setSportsApiError(null);

    try {
      // La chiave API Gemini è ora gestita dal backend, quindi non c'è bisogno di controllarla qui.
      // Il controllo della chiave API Sports è anch'esso gestito dal backend.

      const response = await fetch(BACKEND_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchInput),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Errore dal server: ${response.statusText} (Status: ${response.status})` }));
        throw new Error(errorData.message || `Errore HTTP: ${response.status}`);
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
            \n- Errore CORS se il backend non è configurato correttamente per accettare richieste dal dominio del frontend.`;
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

  // Non c'è più bisogno di isApiMode o degli useEffect correlati, 
  // né di isSportsApiKeyMissing perché la gestione delle chiavi è del backend.

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-transparent text-text-primary selection:bg-brand-primary selection:text-white">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 py-10 flex-grow flex flex-col items-center w-full max-w-5xl">
        <p className="text-center text-text-secondary mb-10 text-lg sm:text-xl px-2 leading-relaxed">
          Benvenuto in BrainTipster! Inserisci i dettagli della partita per ricevere un pronostico AI avanzato, statistiche dettagliate e consigli di betting.
        </p>
        
        {/* L'avviso isSportsApiKeyMissing è stato rimosso. sportsApiError gestirà gli errori specifici dell'API Sports. */}

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
          {sportsApiError && !isLoading && !error && ( // Mostra solo se non c'è un errore generale più grave
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
          {refinementIssue && !isLoading && !error && ( // Mostra solo se non c'è un errore generale più grave
            <div className="my-6 p-4 bg-yellow-500/10 text-yellow-600 border border-yellow-500/30 rounded-xl w-full text-center animate-fadeIn shadow-lg">
                <div className="flex justify-center items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="font-semibold text-lg">Avviso sul Raffinamento AI Collaboratore</p>
                </div>
                <p className="text-yellow-700 text-sm">{refinementIssue}</p>
            </div>
          )}
          {predictionResponse && !isLoading && !error && (
            <div className="w-full animate-fadeIn delay-100 duration-700">
              <PredictionCard predictionData={predictionResponse} />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
