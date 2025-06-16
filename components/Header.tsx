
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="w-full py-5 sm:py-7 bg-surface-card/85 backdrop-blur-xl shadow-header sticky top-0 z-50 border-b border-border-primary/20">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-center">
        {/* 
          NOTA: Per visualizzare il logo, assicurati che il file 'BrainTipster.png' 
          sia presente nella directory 'images' alla radice del tuo progetto.
        */}
        <img 
          src="images/BrainTipster.png" 
          alt="BrainTipster Logo" 
          className="w-16 h-16 sm:w-20 sm:h-20 mr-0 mb-3 sm:mr-4 sm:mb-0 object-contain"
        />
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-center sm:text-left relative">
            <span 
              className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-text-accent to-cyan-400
                         relative inline-block
                         after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-0.5 
                         after:bg-gradient-to-r after:from-brand-primary/0 after:via-text-accent/70 after:to-brand-primary/0
                         after:animate-shine-slow after:bg-[length:200%_auto]"
            >
              BrainTipster
            </span>
          </h1>
          <p className="text-center sm:text-left text-text-secondary mt-1 text-sm sm:text-base font-medium">
            Analisi Avanzata e Insight per le Tue Scommesse Sportive
          </p>
        </div>
      </div>
    </header>
  );
};
