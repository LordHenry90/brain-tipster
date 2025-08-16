
import React from 'react';
import type { GeminiPredictionResponse, PredictionDetails, OverUnderGoalLine, ExactScoreProbability, ProbableScorer, WebSource, BettingTip } from '../types';
import { StatisticsMatrix } from './StatisticsMatrix';

// Heroicon SVGs (inline for simplicity, consider a library for more icons)
const TrophyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M11.226 1.062A2.25 2.25 0 0 0 9.75 3V4.5H4.574A2.25 2.25 0 0 0 2.4 6.256L.426 13.5A2.25 2.25 0 0 0 2.4 16.5h19.2a2.25 2.25 0 0 0 1.973-2.999l-1.974-7.245A2.25 2.25 0 0 0 19.426 4.5H14.25V3a2.25 2.25 0 0 0-1.474-2.125A2.25 2.25 0 0 0 11.226 1.062ZM4.574 6H12V4.5a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75V6h7.426l1.667 6.111H2.907L4.574 6ZM2.4 18A2.25 2.25 0 0 0 4.65 20.25h14.7a2.25 2.25 0 0 0 2.25-2.25v-1.5H2.4v1.5Z" clipRule="evenodd" />
  </svg>
);
const ChartBarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.035-.84-1.875-1.875-1.875h-.75ZM9.75 8.625c-1.035 0-1.875.84-1.875 1.875v11.25c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V10.5c0-1.035-.84-1.875-1.875-1.875h-.75ZM3 15.375c-1.035 0-1.875.84-1.875 1.875v3.375c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V17.25c0-1.035-.84-1.875-1.875-1.875h-.75Z" />
  </svg>
);
const ListBulletIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M2.625 6.75a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H3.375a.75.75 0 0 1-.75-.75V6.75Zm0 6a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H3.375a.75.75 0 0 1-.75-.75v-.01Zm0 6a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H3.375a.75.75 0 0 1-.75-.75V18.75ZM6 6.75a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75Zm0 6a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75Zm0 6a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
  </svg>
);
const UserGroupIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M4.5 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM14.25 8.625a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM1.5 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM17.25 19.128l-.001.144a2.25 2.25 0 0 1-.533 1.403 12.759 12.759 0 0 1-3.516 1.482.75.75 0 0 1-.604-.444c-.446-1.021-1.086-1.874-1.903-2.496a.75.75 0 1 1 .615-1.115c.89.492 1.587 1.233 2.125 2.117a11.252 11.252 0 0 0 2.924-1.176.75.75 0 0 1 .645.495Z" />
  </svg>
);
const ClipboardDocumentListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M10.5 3.75a2.25 2.25 0 0 0-2.25 2.25v10.5a2.25 2.25 0 0 0 2.25 2.25h3a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25h-3Zm-2.625 2.25c-.207 0-.396.042-.575.119A.75.75 0 0 0 6.75 6.75v10.5c0 .391.285.708.656.745.18.018.357.022.531.022h3.012c.174 0 .352-.004.531-.022a.75.75 0 0 0 .656-.745V6.75a.75.75 0 0 0-.575-.631A2.235 2.235 0 0 0 13.512 6H10.5c-.966 0-1.844.369-2.512.988S6.375 8.396 6.375 9.362V10.5H4.125C3.504 10.5 3 11.004 3 11.625v3.75c0 .621.504 1.125 1.125 1.125H6.375V18c0 .966.369 1.844.988 2.512s1.546.988 2.512.988h.012c.966 0 1.844-.369 2.512-.988s.988-1.546.988-2.512V6a2.625 2.625 0 0 0-2.625-2.25Z" clipRule="evenodd" />
    <path d="M7.875 6a.75.75 0 0 0-1.5 0v1.5H4.125a.75.75 0 0 0 0 1.5H6.375V9a.75.75 0 0 0 1.5 0V7.5h1.5a.75.75 0 0 0 0-1.5H7.875V6Z" />
  </svg>
);

const ChatBubbleLeftRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071 1.05L12.963 2.286ZM9.75 6.75A.75.75 0 0 1 9 6V4.5a.75.75 0 0 1 .75.75v1.5ZM14.25 6.75v-1.5a.75.75 0 0 1 .75-.75A.75.75 0 0 1 14.25 6ZM5.703 16.5a.75.75 0 0 0-.312 1.348l.312-1.348Zm12.594 0L18 17.848a.75.75 0 0 0 .312-1.348l-1.312 2.696ZM18 9.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 18 9.75ZM21.75 12a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 .75-.75ZM6 9.75A.75.75 0 0 1 5.25 9h-1.5a.75.75 0 0 0 0 1.5H5.25A.75.75 0 0 1 6 9.75ZM2.25 12a.75.75 0 0 0 .75.75h1.5a.75.75 0 0 0 0-1.5H3a.75.75 0 0 0-.75-.75ZM9.057 2.286a4.502 4.502 0 0 0-2.426 2.24L7.704 5.28A3.002 3.002 0 0 1 9.057 3.83ZM6.63 4.526A4.502 4.502 0 0 0 4.5 8.383H6A3.002 3.002 0 0 1 7.705 5.28L6.63 4.526ZM4.5 8.383V12H6V8.383A3.002 3.002 0 0 1 4.5 8.383Zm0 3.617A4.502 4.502 0 0 0 6.63 16.474l1.072-.754A3.002 3.002 0 0 1 6 12v-.001H4.5v.001Zm2.32 5.136a4.5 4.5 0 0 0 6.36 0l-1.06-1.06a3 3 0 0 1-4.24 0l-1.06 1.06Zm6.36-5.136A4.502 4.502 0 0 0 19.5 12V12H18v.001a3.002 3.002 0 0 1-1.632 2.673L17.431 12Zm1.925-3.617A4.502 4.502 0 0 0 17.37 4.526l-1.072.754A3.002 3.002 0 0 1 18 8.383V8.383h1.5V8.383Zm0 0A4.502 4.502 0 0 0 14.944 2.286l-1.071 1.05A3.002 3.002 0 0 1 16.32 5.28l1.072-.754ZM9.056 3.83c.424-.618 1.05-.99 1.732-.99h.024c.682 0 1.308.372 1.732.99l1.071-1.05A4.502 4.502 0 0 0 12.188.75h-.024A4.502 4.502 0 0 0 8.013 3.318L9.056 2.286l.001.001ZM12.188.75A4.502 4.502 0 0 0 8.013 3.318l1.05 1.071A3.002 3.002 0 0 1 12.188 2.25h-.024A3.002 3.002 0 0 1 14.943 4.39l1.05-1.072A4.502 4.502 0 0 0 12.188.75ZM9.75 4.5H9v1.5h.75V4.5ZM14.25 6V4.5h.75v1.5h-.75ZM18 12v-1.5A.75.75 0 0 1 18.75 9h1.5a.75.75 0 0 0 0-1.5H18a.75.75 0 0 1-.75.75v1.5a.75.75 0 0 1 0 1.5H18v1.5a.75.75 0 0 1 0 1.5H18a.75.75 0 0 1 0-1.5V12ZM5.39 17.848a3.001 3.001 0 0 1 0-3.696l-1.313-1.313a4.501 4.501 0 0 0 0 6.322l1.313-1.313h.001ZM18.312 14.152a3.001 3.001 0 0 1 0 3.696l1.313 1.313a4.501 4.501 0 0 0 0-6.322l-1.313 1.313Z" clipRule="evenodd" />
  </svg>
);
const GlobeAltIcon = () => ( 
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v.091C11.063 6.36 10.5 7.024 10.5 7.875c0 .898.603 1.618 1.406 1.713.157.022.319.034.481.037.83.027 1.553-.33 2.01-.898a.75.75 0 0 0-1.242-.825C12.972 7.952 12.75 8.016 12.75 7.875V6Zm-1.5 12.654A8.25 8.25 0 0 0 12 20.25a8.25 8.25 0 0 0 1.082-3.872.75.75 0 0 0-.038-.222 3.288 3.288 0 0 0-1.044-2.02 3.311 3.311 0 0 0-2.038-1.058.75.75 0 0 0-.244.032A8.25 8.25 0 0 0 3.75 12c0 1.52.413 2.933 1.125 4.125a.75.75 0 0 0 .791.439 6.755 6.755 0 0 1 4.584-1.216.75.75 0 0 0 .395-.076A3.288 3.288 0 0 0 12 12.375c0-.898-.603-1.618-1.406-1.713a.75.75 0 0 0-.482.038c-.83.274-1.553.931-2.01 1.498A8.317 8.317 0 0 0 8.25 15c0 .249.017.494.05.735a.75.75 0 0 0 .17.519A6.755 6.755 0 0 1 11.25 18.654Zm1.582-3.872a.75.75 0 0 0-.038.222A8.25 8.25 0 0 1 12 20.25a8.25 8.25 0 0 1-1.082-3.872.75.75 0 0 1 .038-.222 3.288 3.288 0 0 1 1.044-2.02 3.311 3.311 0 0 1 2.038-1.058.75.75 0 0 1 .244.032A8.25 8.25 0 0 1 20.25 12c0-1.52-.413-2.933-1.125-4.125a.75.75 0 0 1-.791-.439 6.755 6.755 0 0 0-4.584 1.216.75.75 0 0 1-.395.076A3.288 3.288 0 0 1 12 12.375c0 .898.603 1.618 1.406 1.713a.75.75 0 0 1 .482-.038c.83-.274 1.553-.931 2.01-1.498A8.317 8.317 0 0 1 15.75 15c0-.249-.017-.494-.05-.735a.75.75 0 0 1-.17-.519A6.755 6.755 0 0 0 12.75 18.654Z" clipRule="evenodd" />
  </svg>
);

const CurrencyDollarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 7.5a2.25 2.25 0 0 0-2.25 2.25v2.25H7.5a2.25 2.25 0 0 0-2.25 2.25v2.25m13.5-6.75a2.25 2.25 0 0 0-2.25-2.25H15a2.25 2.25 0 0 0-2.25 2.25v2.25m4.5 0H15v2.25A2.25 2.25 0 0 0 12.75 15h-3.75a.75.75 0 0 0-.75.75V18a.75.75 0 0 0 .75.75h3.75a2.25 2.25 0 0 0 2.25-2.25V15m0-2.25h2.25a2.25 2.25 0 0 0 2.25-2.25v-2.25a2.25 2.25 0 0 0-2.25-2.25H15a2.25 2.25 0 0 0-2.25 2.25V15m0 0V7.5m0 7.5A2.25 2.25 0 0 0 10.5 15H7.5a2.25 2.25 0 0 0-2.25 2.25v2.25A2.25 2.25 0 0 0 7.5 22.5h5.25a2.25 2.25 0 0 0 2.25-2.25v-2.25a2.25 2.25 0 0 0-2.25-2.25H10.5a2.25 2.25 0 0 0-2.25 2.25V15" />
        <path fillRule="evenodd" d="M10.06 2.269A2.25 2.25 0 0 0 8.25 4.5V18a2.25 2.25 0 0 0 2.25 2.25h3a2.25 2.25 0 0 0 2.25-2.25V4.5A2.25 2.25 0 0 0 13.5 2.25h-3a2.25 2.25 0 0 0-.19.019ZM12 3.75a.75.75 0 0 0-.75.75V18a.75.75 0 0 0 .75.75h1.5a.75.75 0 0 0 .75-.75V10.5A.75.75 0 0 0 13.5 9.75h-3a.75.75 0 0 0-.75.75V18a.75.75 0 0 0 .75.75h.75a.75.75 0 0 0 .75-.75V4.5a.75.75 0 0 0-.75-.75h-.75Z" clipRule="evenodd" />
    </svg>
);

const LinkIcon = () => ( 
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 1 1 2.828 2.828l-3 3a2 2 0 0 1-2.828 0l-.879-.878A2 2 0 0 1 9.12 7.12l3-3Zm-2.5 2.5L11.5 8.5a.5.5 0 0 1 0 .708L8.42 12.292a1 1 0 0 0 0 1.414l.879.879a1 1 0 0 0 1.414 0l3-3a1 1 0 0 0 0-1.414L11.5 8.5a.5.5 0 0 1 0-.708l.293-.293a1 1 0 0 0-1.414-1.414l-.293.293ZM7.414 15.414a2 2 0 1 1-2.828-2.828l3-3a2 2 0 0 1 2.828 0l.879.878a2 2 0 0 1-.414 2.414l-3 3Z" clipRule="evenodd" />
  </svg>
);

const DatabaseIcon = () => ( 
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1.5">
        <path d="M6.75 3.25A.75.75 0 0 1 7.5 2.5h5A.75.75 0 0 1 13.25 3.25v.5A.75.75 0 0 1 12.5 4.5h-5A.75.75 0 0 1 6.75 3.75v-.5Z" />
        <path fillRule="evenodd" d="M3 6a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6Zm0 4a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10Zm0 4a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 14Z" clipRule="evenodd" />
    </svg>
);

// Helper functions per estrarre i nomi delle squadre
const extractHomeTeamName = (partitaIdentificata?: string): string => {
  if (!partitaIdentificata) return "CASA";
  
  // Cerca pattern "TeamA vs TeamB" o "TeamA - TeamB" 
  const vsMatch = partitaIdentificata.match(/^([^vs\-]+)(?:\s*(?:vs|-)?\s*)([^vs\-]+)$/i);
  if (vsMatch) {
    return vsMatch[1].trim();
  }
  
  return "CASA";
};

const extractAwayTeamName = (partitaIdentificata?: string): string => {
  if (!partitaIdentificata) return "OSPITE";
  
  // Cerca pattern "TeamA vs TeamB" o "TeamA - TeamB"
  const vsMatch = partitaIdentificata.match(/^([^vs\-]+)(?:\s*(?:vs|-)?\s*)([^vs\-]+)$/i);
  if (vsMatch) {
    return vsMatch[2].trim();
  }
  
  return "OSPITE";
};

interface PredictionCardProps {
  predictionData: GeminiPredictionResponse;
}

interface DetailItemProps {
  label: string;
  value?: string | number;
  className?: string;
  isPercentage?: boolean;
  valueClassName?: string;
  labelClassName?: string;
  isProminent?: boolean;
}

const DetailItem: React.FC<DetailItemProps> = ({ label, value, className = '', isPercentage, valueClassName = '', labelClassName = '', isProminent = false }) => {
  if (value === undefined || value === null || String(value).trim() === '' || String(value).trim().toLowerCase() === 'n/a') return null;
  
  let displayValue = String(value);
  if (isPercentage && !displayValue.includes('%')) {
    displayValue = `${displayValue}%`;
  }

  const baseItemClasses = `flex justify-between items-center transition-all duration-200 ease-in-out rounded-lg`;
  const paddingClasses = isProminent ? 'py-3.5 px-4' : 'py-2.5 px-3.5'; 
  const labelTextClasses = isProminent ? 'text-base text-text-secondary' : 'text-sm text-text-secondary';
  const valueTextClasses = isProminent ? 'text-lg text-text-primary font-bold' : 'text-md text-text-primary font-semibold';
  
  return (
    <div className={`${baseItemClasses} ${paddingClasses} ${className}`}>
      <span className={`${labelTextClasses} ${labelClassName} mr-2`}>{label}:</span>
      <span className={`${valueTextClasses} text-right ${valueClassName}`}>{displayValue}</span>
    </div>
  );
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  sectionClass?: string;
}

const Section: React.FC<SectionProps> = ({ title, children, icon, sectionClass = '' }) => (
  <div className={`mb-7 bg-surface-section rounded-xl shadow-section overflow-hidden ${sectionClass} border border-border-primary/20 hover:border-border-primary/50 transition-all duration-300 hover:shadow-card-hover`}>
    <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-gradient-to-r from-surface-highlight/50 to-surface-section border-b border-border-primary/30">
        <h3 className="text-lg sm:text-xl font-bold text-text-accent flex items-center">
        {icon && <span className="mr-3 opacity-90 p-1.5 bg-brand-primary/10 rounded-full ">{icon}</span>}
        {title}
        </h3>
    </div>
    <div className="p-2 sm:p-3 space-y-1">
     {children}
    </div>
  </div>
);


export const PredictionCard: React.FC<PredictionCardProps> = ({ predictionData }) => {
  const { parsed, rawText, searchSources: serviceSearchSources, externalSportsData } = predictionData;

  if (!parsed && !rawText) {
    return (
      <div className="bg-surface-card p-10 rounded-2xl shadow-card text-center mt-8 w-full border border-border-primary/30">
        <p className="text-text-secondary text-xl">Nessun pronostico disponibile al momento.</p>
        <p className="text-sm text-slate-500 mt-2">Prova a modificare i parametri di ricerca o riprova più tardi.</p>
      </div>
    );
  }
  
  const details: PredictionDetails | undefined = parsed;
  const finalSearchSources = details?.fontiRicercaWeb && details.fontiRicercaWeb.length > 0 
                             ? details.fontiRicercaWeb 
                             : (serviceSearchSources && serviceSearchSources.length > 0 ? serviceSearchSources : undefined);

  const apiDataActuallyUsed = details?.externalApiDataUsed === true || (externalSportsData && externalSportsData.matchData !== null);

  return (
    <div className="bg-gradient-to-b from-surface-card to-surface-section/90 p-5 sm:p-7 rounded-2xl shadow-card w-full mt-8 border border-border-primary/20 transition-all duration-300 hover:shadow-card-hover hover:border-border-primary/40">
      <div className="text-center mb-10 pb-4 border-b-2 border-brand-primary/20 relative">
         <h2 className="text-3xl sm:text-4xl font-black">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-text-accent to-cyan-400 animate-pulse-subtle">
                Analisi AI Dettagliata
            </span>
        </h2>
        <p className="text-text-secondary text-sm mt-1.5">Pronostici e statistiche per la partita selezionata.</p>
        {apiDataActuallyUsed && (
            <div className="mt-3 text-xs inline-flex items-center text-text-accent bg-border-accent/10 px-2.5 py-1 rounded-full border border-border-accent/30">
                <DatabaseIcon /> Statistiche potenziate da dati API esterni
            </div>
        )}
      </div>
      
      
      {details?.partitaIdentificata && (
        <div className="mb-8 p-4 sm:p-5 bg-gradient-to-r from-brand-primary/15 via-brand-primary/10 to-brand-primary/5 border-l-4 border-brand-primary rounded-r-lg shadow-md">
          <p className="text-sm font-semibold text-text-accent mb-1">Partita Identificata e Analizzata:</p>
          <p className="text-xl text-text-primary font-bold leading-tight">{details.partitaIdentificata}</p>
        </div>
      )}

      {finalSearchSources && finalSearchSources.length > 0 && (
        <Section title="Fonti Web Utilizzate (per contesto/notizie)" icon={<GlobeAltIcon />} sectionClass="bg-surface-card/50">
          <ul className="space-y-1.5 p-2">
            {finalSearchSources.map((source: WebSource, index: number) => (
              <li key={index} className="text-xs text-text-secondary flex items-center hover:bg-surface-highlight/70 p-2 rounded-md transition-colors duration-150 group">
                <GlobeAltIcon />
                <a 
                  href={source.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sky-400 group-hover:text-sky-300 group-hover:underline truncate ml-2 text-sm"
                  title={source.title || source.uri}
                >
                  {source.title || source.uri}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}
      
      {details ? (
        <>
          {details.squadraVincente && (
            <Section title="Esito Finale Previsto" icon={<TrophyIcon />}>
              <DetailItem 
                label={`Vincitore Probabile: ${details.squadraVincente.squadra}`}
                value={details.squadraVincente.probabilita} 
                isPercentage 
                isProminent
                valueClassName="text-2xl font-black text-brand-primary"
                className="bg-surface-highlight/30 hover:bg-surface-highlight/50 rounded-lg transition-colors"
              />
            </Section>
          )}

          {details.risultatoFinaleProbabilita && (
            <Section title="Probabilità Esito (1X2)" icon={<ChartBarIcon />}>
              <DetailItem label="Vittoria Squadra Casa" value={details.risultatoFinaleProbabilita.vittoriaCasa} isPercentage className="even:bg-surface-highlight/20 hover:bg-surface-highlight/40 rounded-md"/>
              <DetailItem label="Pareggio" value={details.risultatoFinaleProbabilita.pareggio} isPercentage className="odd:bg-surface-highlight/20 hover:bg-surface-highlight/40 rounded-md"/>
              <DetailItem label="Vittoria Squadra Ospite" value={details.risultatoFinaleProbabilita.vittoriaOspite} isPercentage className="even:bg-surface-highlight/20 hover:bg-surface-highlight/40 rounded-md"/>
            </Section>
          )}
          
          {details.consiglioScommessaExpert && Array.isArray(details.consiglioScommessaExpert) && details.consiglioScommessaExpert.length > 0 && (
            <Section title="Consigli Scommessa Expert (Matrice)" icon={<CurrencyDollarIcon />} sectionClass="bg-gradient-to-br from-brand-primary/10 to-surface-section">
              <div className="space-y-3 p-3">
                {details.consiglioScommessaExpert.map((tip: BettingTip, index: number) => (
                  <div key={index} className="bg-surface-highlight/40 p-4 rounded-lg shadow-md border border-brand-primary/30 hover:shadow-lg transition-shadow duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2.5 pb-2 border-b border-brand-primary/20">
                        <h4 className="text-md font-bold text-brand-primary mr-2 truncate flex-1">{tip.mercato}</h4>
                        <p className="text-sm text-text-accent font-semibold bg-brand-primary/10 px-2 py-0.5 rounded-full mt-1 sm:mt-0">{tip.valoreFiducia}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm mb-2.5">
                        <div>
                            <span className="text-text-secondary font-medium">Selezione: </span>
                            <span className="text-text-primary font-semibold">{tip.selezione}</span>
                        </div>
                        {tip.lineaConsigliata && tip.lineaConsigliata.toLowerCase() !== 'n/a' && (
                             <div>
                                <span className="text-text-secondary font-medium">Linea: </span>
                                <span className="text-text-primary font-semibold">{tip.lineaConsigliata}</span>
                            </div>
                        )}
                    </div>
                    {tip.statisticaCorrelata && tip.statisticaCorrelata.nomeStatistica && tip.statisticaCorrelata.valoreStatistica && (
                      <div className="my-2.5 p-2.5 bg-surface-section/50 border border-border-primary/20 rounded-md flex items-start space-x-2 text-xs">
                        <LinkIcon />
                        <div>
                            <span className="font-semibold text-text-accent">{tip.statisticaCorrelata.nomeStatistica}: </span>
                            <span className="text-text-secondary">{tip.statisticaCorrelata.valoreStatistica}</span>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-text-secondary leading-relaxed">{tip.motivazioneBreve}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {details.overUnderGoals && details.overUnderGoals.length > 0 && (
            <Section title="Probabilità Linee Over/Under Goals" icon={<ListBulletIcon />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {details.overUnderGoals.map((item: OverUnderGoalLine, index: number) => (
                  <DetailItem key={index} label={item.linea} value={item.probabilita} className={`text-sm rounded-md ${index % 2 === 0 ? 'bg-surface-highlight/25' : 'bg-surface-highlight/15'} hover:bg-surface-highlight/40`} isPercentage />
                ))}
              </div>
            </Section>
          )}

          {details.risultatiEsatti && details.risultatiEsatti.length > 0 && (
            <Section title="Probabilità Risultati Esatti (Top)" icon={<ListBulletIcon />}>
              {details.risultatiEsatti.slice(0, 5).map((item: ExactScoreProbability, index: number) => (
                <DetailItem key={index} label={item.risultato} value={item.probabilita} isPercentage  className={`${index % 2 === 0 ? 'bg-surface-highlight/25' : 'bg-surface-highlight/15'} hover:bg-surface-highlight/40 rounded-md`}/>
              ))}
            </Section>
          )}

          {details.probabiliMarcatori && details.probabiliMarcatori.length > 0 && (
            <Section title="Probabili Marcatori" icon={<UserGroupIcon />}>
               {details.probabiliMarcatori.slice(0,5).map((item: ProbableScorer, index: number) => (
                  <DetailItem key={index} label={item.nomeGiocatore} value={item.probabilitaGol} isPercentage={item.probabilitaGol.includes('%')} className={`${index % 2 === 0 ? 'bg-surface-highlight/25' : 'bg-surface-highlight/15'} hover:bg-surface-highlight/40 rounded-md`} />
              ))}
            </Section>
          )}

          {/* NUOVA SEZIONE MATRICE STATISTICHE */}
          {details.statisticheMediePreviste && (
            <StatisticsMatrix 
              statistiche={details.statisticheMediePreviste}
              homeTeamName={extractHomeTeamName(details.partitaIdentificata)}
              awayTeamName={extractAwayTeamName(details.partitaIdentificata)}
            />
          )}
          
          {details.ragionamentoAnalitico && (
             <Section title="Ragionamento Analitico Dettagliato" icon={<ChatBubbleLeftRightIcon />}>
                <div className="p-4 bg-surface-highlight/30 rounded-lg m-2 shadow-inner border border-border-primary/10">
                    <p className="text-md text-text-secondary whitespace-pre-wrap leading-relaxed">{details.ragionamentoAnalitico}</p>
                </div>
            </Section>
          )}
          
           {/* Fallback per vecchi formati se necessario */}
           {!(details.partitaIdentificata || details.squadraVincente || details.risultatoFinaleProbabilita) && details.risultatoFinale && (
             <Section title="Pronostico (Legacy)" icon={<ClipboardDocumentListIcon />}>
                <DetailItem label="Risultato Finale (1X2)" value={details.risultatoFinale} className="even:bg-surface-highlight/20 hover:bg-surface-highlight/40 rounded-md"/>
                {details.overUnder25 && <DetailItem label="Over/Under 2.5 Goals" value={details.overUnder25} className="odd:bg-surface-highlight/20 hover:bg-surface-highlight/40 rounded-md"/> }
                {details.risultatoEsatto && <DetailItem label="Risultato Esatto" value={details.risultatoEsatto} className="even:bg-surface-highlight/20 hover:bg-surface-highlight/40 rounded-md"/> }
                {details.marcatoreProbabile && <DetailItem label="Marcatore Probabile" value={details.marcatoreProbabile} className="odd:bg-surface-highlight/20 hover:bg-surface-highlight/40 rounded-md"/> }
                {details.consiglioScommessa && <DetailItem label="Consiglio Scommessa" value={details.consiglioScommessa} className="even:bg-surface-highlight/20 hover:bg-surface-highlight/40 rounded-md"/> }
                {details.ragionamentoGenerale && (
                    <div className="p-3 bg-surface-highlight/30 rounded-lg m-1 shadow-inner border border-border-primary/10">
                        <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{details.ragionamentoGenerale}</p>
                    </div>
                )}
            </Section>
           )}

        </>
      ) : (
         <div className="mt-8 p-6 bg-surface-card rounded-xl shadow-lg border border-border-primary/30">
            <p className="text-xl font-bold text-text-accent mb-2">Risposta Testuale (Potenziale Output Grezzo):</p>
            <p className="text-sm text-text-secondary mb-4">Non è stato possibile interpretare una struttura JSON completa dalla risposta dell'AI, oppure l'analisi collaborativa non è finalizzata. Viene visualizzato il testo grezzo disponibile per il debug.</p>
            <textarea
              readOnly
              className="w-full h-96 p-4 text-xs font-mono text-text-primary bg-surface-base border border-border-primary/40 rounded-md shadow-inner focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none resize-y"
              value={rawText || "Nessun testo grezzo disponibile dall'AI."}
              aria-label="Raw text response from AI"
            />
         </div>
      )}
    </div>
  );
};
