import React from 'react';
import type { MatchStatisticsPrediction, StatisticaConLinea } from '../types';

// Icon for the statistics section
const ClipboardDocumentListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M10.5 3.75a2.25 2.25 0 0 0-2.25 2.25v10.5a2.25 2.25 0 0 0 2.25 2.25h3a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25h-3Zm-2.625 2.25c-.207 0-.396.042-.575.119A.75.75 0 0 0 6.75 6.75v10.5c0 .391.285.708.656.745.18.018.357.022.531.022h3.012c.174 0 .352-.004.531-.022a.75.75 0 0 0 .656-.745V6.75a.75.75 0 0 0-.575-.631A2.235 2.235 0 0 0 13.512 6H10.5c-.966 0-1.844.369-2.512.988S6.375 8.396 6.375 9.362V10.5H4.125C3.504 10.5 3 11.004 3 11.625v3.75c0 .621.504 1.125 1.125 1.125H6.375V18c0 .966.369 1.844.988 2.512s1.546.988 2.512.988h.012c.966 0 1.844-.369 2.512-.988s.988-1.546.988-2.512V6a2.625 2.625 0 0 0-2.625-2.25Z" clipRule="evenodd" />
    <path d="M7.875 6a.75.75 0 0 0-1.5 0v1.5H4.125a.75.75 0 0 0 0 1.5H6.375V9a.75.75 0 0 0 1.5 0V7.5h1.5a.75.75 0 0 0 0-1.5H7.875V6Z" />
  </svg>
);

interface StatisticsMatrixProps {
  statistiche: MatchStatisticsPrediction;
  homeTeamName?: string;
  awayTeamName?: string;
}

interface StatisticRowProps {
  label: string;
  homeData?: StatisticaConLinea;
  awayData?: StatisticaConLinea;
  totalData?: StatisticaConLinea;
  homeTeamName: string;
  awayTeamName: string;
  isEven: boolean;
}

const StatisticRow: React.FC<StatisticRowProps> = ({ 
  label, 
  homeData, 
  awayData, 
  totalData, 
  homeTeamName, 
  awayTeamName, 
  isEven 
}) => {
  const rowBgClass = isEven ? 'bg-surface-highlight/15' : 'bg-surface-highlight/25';

  const StatValue: React.FC<{ value?: string | any; isHome?: boolean; isAway?: boolean; isTotal?: boolean; isStat?: boolean }> = ({ 
    value, 
    isHome = false, 
    isAway = false, 
    isTotal = false,
    isStat = true
  }) => {
    // Gestisci sia stringhe che oggetti
    let displayValue = '';
    
    if (!value) {
      displayValue = '-';
    } else if (typeof value === 'string') {
      displayValue = value;
    } else if (typeof value === 'object') {
      // Se è un oggetto, prova a accedere alle proprietà
      displayValue = isStat ? (value.statistica || value.toString()) : (value.linea || '-');
    } else {
      displayValue = value.toString();
    }

    if (displayValue === '-' || displayValue === '[object Object]') {
      return (
        <div className="flex-1 px-2 py-3 flex items-center justify-center border-r border-border-primary/20 last:border-r-0">
          <span className="text-sm text-text-secondary font-bold">-</span>
        </div>
      );
    }

    let textColor = 'text-text-primary';
    if (isStat) {
      textColor = 'text-text-accent font-bold';
    } else {
      textColor = 'text-text-secondary font-semibold';
    }

    return (
      <div className="flex-1 px-2 py-3 flex items-center justify-center border-r border-border-primary/20 last:border-r-0">
        <span className={`text-sm ${textColor}`}>
          {displayValue}
        </span>
      </div>
    );
  };

  return (
    <div className={`${rowBgClass} hover:bg-surface-highlight/40 transition-colors duration-200 rounded-lg mb-1`}>
      <div className="flex items-center">
        {/* Label Column */}
        <div className="w-20 sm:w-24 px-3 py-4 bg-gradient-to-r from-surface-section to-surface-highlight/30 rounded-l-lg border-r border-border-primary/30">
          <span className="text-xs sm:text-sm font-bold text-text-accent uppercase tracking-wide">
            {label}
          </span>
        </div>
        
        {/* 6 Columns: Home Stat, Home Line, Away Stat, Away Line, Total Stat, Total Line */}
        <StatValue value={homeData?.statistica} isHome isStat />
        <StatValue value={homeData?.linea} isHome />
        <StatValue value={awayData?.statistica} isAway isStat />
        <StatValue value={awayData?.linea} isAway />
        <StatValue value={totalData?.statistica} isTotal isStat />
        <StatValue value={totalData?.linea} isTotal />
      </div>
    </div>
  );
};

export const StatisticsMatrix: React.FC<StatisticsMatrixProps> = ({ 
  statistiche, 
  homeTeamName = "CASA", 
  awayTeamName = "OSPITE" 
}) => {
  // DEBUG: Aggiungi console.log per vedere la struttura dei dati
  console.log('StatisticsMatrix - statistiche:', statistiche);
  console.log('StatisticsMatrix - falliTotali:', statistiche.falliTotali);
  
  const formatTeamName = (name: string) => {
    return name.length > 8 ? name.substring(0, 8) : name;
  };

  // Funzione helper per convertire i dati nel formato atteso
  const convertToStatisticaConLinea = (value: any): StatisticaConLinea | undefined => {
    if (!value) return undefined;
    
    if (typeof value === 'string') {
      // Formato legacy: stringa semplice
      return { statistica: value, linea: '-' };
    } else if (typeof value === 'object' && value.statistica) {
      // Formato nuovo: oggetto con statistica e linea
      return value as StatisticaConLinea;
    }
    
    return undefined;
  };

  // Definizione delle righe della matrice
  const statisticsRows = [
    {
      label: "TIRI",
      homeData: convertToStatisticaConLinea(statistiche.tiriSquadraCasa),
      awayData: convertToStatisticaConLinea(statistiche.tiriSquadraOspite),
      totalData: convertToStatisticaConLinea(statistiche.tiriTotali),
    },
    {
      label: "TIRI IN PORTA",
      homeData: convertToStatisticaConLinea(statistiche.tiriInPortaSquadraCasa),
      awayData: convertToStatisticaConLinea(statistiche.tiriInPortaSquadraOspite),
      totalData: convertToStatisticaConLinea(statistiche.tiriInPortaTotali),
    },
    {
      label: "CORNER",
      homeData: convertToStatisticaConLinea(statistiche.cornerSquadraCasa),
      awayData: convertToStatisticaConLinea(statistiche.cornerSquadraOspite),
      totalData: convertToStatisticaConLinea(statistiche.cornerTotali),
    },
    {
      label: "FALLI",
      homeData: convertToStatisticaConLinea(statistiche.falliSquadraCasa),
      awayData: convertToStatisticaConLinea(statistiche.falliSquadraOspite),
      totalData: convertToStatisticaConLinea(statistiche.falliTotali),
    },
    {
      label: "CARTELLINI",
      homeData: convertToStatisticaConLinea(statistiche.cartelliniSquadraCasa),
      awayData: convertToStatisticaConLinea(statistiche.cartelliniSquadraOspite),
      totalData: convertToStatisticaConLinea(statistiche.cartelliniTotali),
    },
    {
      label: "PARATE",
      homeData: convertToStatisticaConLinea(statistiche.paratePortiereSquadraCasa),
      awayData: convertToStatisticaConLinea(statistiche.paratePortiereSquadraOspite),
      totalData: convertToStatisticaConLinea(statistiche.parateTotaliPortieri),
    },
  ];

  // Verifica se ci sono dati da mostrare
  const hasData = statisticsRows.some(row => 
    row.homeData?.statistica || row.awayData?.statistica || row.totalData?.statistica
  );

  if (!hasData) {
    return null;
  }

  return (
    <div className="mb-7 bg-surface-section rounded-xl shadow-section overflow-hidden border border-border-primary/20 hover:border-border-primary/50 transition-all duration-300 hover:shadow-card-hover">
      {/* Header */}
      <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-gradient-to-r from-surface-highlight/50 to-surface-section border-b border-border-primary/30">
        <h3 className="text-lg sm:text-xl font-bold text-text-accent flex items-center mb-3">
          <span className="mr-3 opacity-90 p-1.5 bg-brand-primary/10 rounded-full">
            <ClipboardDocumentListIcon />
          </span>
          Matrice Statistiche Previste
        </h3>
        
        {/* Column Headers */}
        <div className="flex items-center">
          <div className="w-20 sm:w-24"></div> {/* Empty space for label column */}
          <div className="flex-1 text-center">
            <span className="text-xs font-bold text-text-accent uppercase tracking-wider">
              {homeTeamName.length > 3 ? homeTeamName.substring(0, 3).toUpperCase() : homeTeamName.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs font-semibold text-text-secondary uppercase">LINEA</span>
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs font-bold text-text-accent uppercase tracking-wider">
              {awayTeamName.length > 3 ? awayTeamName.substring(0, 3).toUpperCase() : awayTeamName.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs font-semibold text-text-secondary uppercase">LINEA</span>
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs font-bold text-text-accent uppercase tracking-wider">TOT</span>
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs font-semibold text-text-secondary uppercase">LINEA</span>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="px-4 py-3 bg-surface-highlight/10 border-b border-border-primary/20">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-text-accent rounded-full"></div>
            <span className="text-text-secondary">Valore AI</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-text-secondary rounded-full"></div>
            <span className="text-text-secondary">Linea Bookmaker</span>
          </div>
        </div>
      </div>
      
      {/* Matrix Content */}
      <div className="p-3">
        {statisticsRows.map((row, index) => (
          <StatisticRow
            key={row.label}
            label={row.label}
            homeData={row.homeData}
            awayData={row.awayData}
            totalData={row.totalData}
            homeTeamName={formatTeamName(homeTeamName)}
            awayTeamName={formatTeamName(awayTeamName)}
            isEven={index % 2 === 0}
          />
        ))}
      </div>
      
      {/* Footer note */}
      <div className="px-4 py-2 bg-surface-highlight/10 border-t border-border-primary/20">
        <p className="text-xs text-text-secondary text-center">
          I valori mostrati sono stime AI confrontate con le linee dei principali bookmaker
        </p>
      </div>
    </div>
  );
};
