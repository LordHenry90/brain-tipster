import React, { useState } from 'react';
import type { MatchInput } from '../types';
import { LEAGUE_LIST } from '../constants'; 

interface MatchInputFormProps {
  onSubmit: (matchInput: MatchInput) => void;
  isLoading: boolean;
}

// Sparkles Icon for the button
const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.39-3.423 3.245.95 4.872 4.236 2.179 3.245-3.423.39-4.753 4.401-1.83c.772-.321.772-1.415 0-1.736l-4.401-1.83ZM8.496 15.479c.21.21.21.55 0 .76l-.504.503c-.21.21-.55.21-.76 0l-.503-.504a.538.538 0 0 1 0-.76l.504-.503c.21-.21.55-.21.76 0l.503.504Z" clipRule="evenodd" />
    <path d="M6.25 7.152c.06-.199.06-.403 0-.602a.804.804 0 0 1 .602-.602c.199-.06.403-.06.602 0a.804.804 0 0 1 .602.602c.06.199.06.403 0 .602a.804.804 0 0 1-.602.602c-.199.06-.403.06-.602 0a.804.804 0 0 1-.602-.602ZM14 12.152c.06-.199.06-.403 0-.602a.804.804 0 0 1 .602-.602c.199-.06.403-.06.602 0a.804.804 0 0 1 .602.602c.06.199.06.403 0 .602a.804.804 0 0 1-.602.602c-.199.06-.403.06-.602 0a.804.804 0 0 1-.602-.602Z" />
  </svg>
);


export const MatchInputForm: React.FC<MatchInputFormProps> = ({ onSubmit, isLoading }) => {
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [league, setLeague] = useState('');
  const [matchDate, setMatchDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeTeam.trim() || !awayTeam.trim()) {
      alert("Per favore, inserisci entrambe le squadre.");
      return;
    }
    onSubmit({ homeTeam, awayTeam, league, matchDate: matchDate || undefined });
  };
  
  const inputBaseClasses = "w-full px-4 py-3.5 bg-surface-input border border-border-primary/70 rounded-lg focus:ring-2 focus:ring-focus-ring focus:border-focus-ring outline-none transition-all duration-200 ease-in-out text-text-primary placeholder-slate-500 shadow-sm hover:border-slate-400 focus:shadow-input-focus text-base";

  return (
    <div className="w-full bg-gradient-to-br from-surface-card to-surface-section p-6 sm:p-8 rounded-xl shadow-card space-y-6 transform transition-all duration-300 hover:shadow-card-hover hover:animate-lift-up">
      <h2 className="text-2xl sm:text-3xl font-bold text-center text-brand-primary mb-2">
        Configura la Tua Analisi
      </h2>
      <p className="text-center text-sm text-text-secondary -mt-3 mb-6">Fornisci i dati per iniziare l'elaborazione.</p>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="homeTeam" className="block text-sm font-semibold text-text-secondary mb-2">
            Squadra Casa
          </label>
          <input
            type="text"
            id="homeTeam"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            placeholder="Es. Real Madrid"
            className={inputBaseClasses}
            required
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="awayTeam" className="block text-sm font-semibold text-text-secondary mb-2">
            Squadra Ospite
          </label>
          <input
            type="text"
            id="awayTeam"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            placeholder="Es. Barcellona"
            className={inputBaseClasses}
            required
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="league" className="block text-sm font-semibold text-text-secondary mb-2">
            Campionato/Competizione <span className="text-xs text-slate-500 font-normal">(opzionale)</span>
          </label>
          <select
            id="league"
            value={league}
            onChange={(e) => setLeague(e.target.value)}
            className={inputBaseClasses}
            required
            aria-required="true"
          >
            <option value="" disabled>Seleziona un campionato</option>
            {LEAGUE_LIST.map((l) => (
              <option key={l.code} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="matchDate" className="block text-sm font-semibold text-text-secondary mb-2">
            Data Partita <span className="text-xs text-slate-500 font-normal">(opzionale - YYYY-MM-DD)</span>
          </label>
          <input
            type="date"
            id="matchDate"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
            className={`${inputBaseClasses} appearance-none date-input`}
            pattern="\d{4}-\d{2}-\d{2}"
          />
           <p className="text-xs text-slate-500 mt-1.5">Lascia vuoto per analizzare la prossima partita a calendario.</p>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-x-2.5 px-6 py-4 bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to hover:from-brand-primary hover:to-emerald-500 text-white text-base font-semibold rounded-lg shadow-lg hover:shadow-button-hover focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-surface-card focus:ring-focus-ring focus:ring-opacity-60 transition-all duration-300 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-md transform hover:scale-103 focus:scale-103 disabled:scale-100 active:scale-98"
          aria-live="polite"
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analisi in Corso...
            </>
          ) : (
            <>
              <SparklesIcon />
              Ottieni Pronostico Avanzato
            </>
          )}
        </button>
      </form>
    </div>
  );
};