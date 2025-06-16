
// Assumendo sintassi ESM. Usa 'require' per CommonJS se necessario.
// 'fetch' è globale in Node.js >= v18. Altrimenti, installa 'node-fetch'.

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export const callOpenRouterLLM = async (
    modelIdentifier,
    userPrompt,
    apiKey,
    systemPrompt
) => {
    console.log(`Tentativo di chiamata a OpenRouter con il modello: ${modelIdentifier} (backend)`);

    const messages = [];
    if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: userPrompt });

    const body = {
        model: modelIdentifier,
        messages: messages,
        temperature: 0.25, 
        max_tokens: 16384,
    };
    
    console.log(`Lunghezza del prompt utente per OpenRouter: ${userPrompt.length} caratteri (backend).`);

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                // Riferimenti HTTP non sono necessari per chiamate server-to-server
            },
            body: JSON.stringify(body),
        });

        const responseText = await response.text();
        // console.log(`Risposta grezza da OpenRouter (Status: ${response.status}) (backend):`, responseText.substring(0,500));


        if (!response.ok) {
            console.error(`Errore API OpenRouter (${response.status}) (backend): ${responseText}`);
            // Fornisci un messaggio più specifico se la chiave è probabilmente il problema
            if (response.status === 401) {
                 throw new Error(`Errore OpenRouter: ${response.status} - Autenticazione fallita. Controlla la OPENROUTER_API_KEY nel backend.`);
            }
            throw new Error(`Errore OpenRouter: ${response.status} - ${responseText}`);
        }

        const data = JSON.parse(responseText);

        if (!data.choices || data.choices.length === 0) {
            throw new Error("Formato risposta OpenRouter inatteso: 'choices' mancante o vuoto (backend).");
        }
        
        const firstChoice = data.choices[0];
        if (!firstChoice.message) {
            throw new Error("Formato risposta OpenRouter inatteso: 'message' mancante (backend).");
        }

        const content = firstChoice.message.content;
        // console.log(`OpenRouter finish_reason: ${firstChoice.finish_reason} (backend)`);
        // console.log("Contenuto del messaggio ricevuto da OpenRouter (backend, primi 300 caratteri):", content ? content.substring(0,300) : content);


        if (content === null || content === undefined || content.trim() === "") {
            return "Il modello OpenRouter non ha fornito un output testuale significativo (backend)."; 
        }
        
        return content.trim();

    } catch (error) {
        console.error("Errore durante la chiamata a OpenRouter (backend):", error);
        if (error instanceof Error) {
            throw error; 
        }
        throw new Error("Errore sconosciuto durante la chiamata a OpenRouter (backend)."); 
    }
};
