
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full py-10 text-center mt-20 relative">
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-px w-2/3 sm:w-1/2 bg-gradient-to-r from-transparent via-border-primary/50 to-transparent"></div>
      <p className="text-sm text-text-secondary mb-2">
        © {new Date().getFullYear()} BrainTipster. Tutti i diritti riservati.
      </p>
      <p className="text-xs text-slate-500 mb-3">
        I pronostici sono generati da intelligenza artificiale e non garantiscono vincite.
        <span className="block sm:inline mt-1 sm:mt-0"> Gioca responsabilmente e con moderazione.</span>
      </p>
      <p className="text-xs text-slate-600">
        Realizzato con <a href="https://deepmind.google/technologies/gemini/" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-secondary hover:text-brand-primary transition-colors">Google Gemini API</a>.
      </p>
    </footer>
  );
};
