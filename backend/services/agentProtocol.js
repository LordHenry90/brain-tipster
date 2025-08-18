// Definisce la struttura dei messaggi e i tipi di "atti linguistici" (performatives)
// che gli agenti possono usare per comunicare, ispirato a FIPA-ACL.

// Tipi di atti linguistici (Performatives)
export const Performative = {
  REQUEST: 'REQUEST', // Un agente chiede a un altro di eseguire un'azione.
  INFORM: 'INFORM',   // Un agente fornisce informazioni in risposta a una richiesta.
  FAILURE: 'FAILURE', // Un agente comunica che non è riuscito a completare un'azione.
};

/**
 * Crea un messaggio standardizzato per la comunicazione tra agenti.
 * @param {string} sender - L'ID dell'agente che invia il messaggio.
 * @param {string} receiver - L'ID dell'agente che riceve il messaggio.
 * @param {string} performative - L'intenzione del messaggio (es. REQUEST, INFORM).
 * @param {any} content - Il payload di dati del messaggio.
 * @returns {object} Il messaggio formattato.
 */
export const createMessage = (sender, receiver, performative, content) => {
  return {
    sender,
    receiver,
    performative,
    content,
    timestamp: new Date().toISOString(),
  };
};