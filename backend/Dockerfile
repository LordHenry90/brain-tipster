# Usa un'immagine Node.js ufficiale come base
FROM node:20-slim
# o una versione più recente se preferisci, es. node:20-slim

# Crea e imposta la directory di lavoro nell'immagine
WORKDIR /usr/src/app
# Puoi scegliere un percorso diverso, ma /usr/src/app è una convenzione comune.

# Copia PRIMA package.json e package-lock.json (se lo usi)
# Questo sfrutta la cache di Docker: se questi file non cambiano,
# Docker non rieseguirà 'npm install' inutilmente.
#
# ASSICURATI CHE I PERCORSI SORGENTE ('backend/package.json') siano corretti
# rispetto alla directory da cui esegui 'docker build' (il tuo build context).
# Se il Dockerfile è nella root del progetto e package.json è in 'backend/':
COPY backend/package.json backend/package-lock.json* ./
#
# Se il Dockerfile è già DENTRO la directory 'backend/':
# COPY package.json package-lock.json* ./
#
# Il './' come destinazione significa che i file verranno copiati nella WORKDIR (/usr/src/app)

# Installa le dipendenze di produzione
# L'opzione --only=production è corretta per immagini di produzione.
# --no-package-lock potrebbe non essere necessaria se hai già copiato package-lock.json
RUN npm install --only=production

# Copia il resto del codice dell'applicazione backend
# Anche qui, adatta il percorso sorgente 'backend/.' se necessario.
# Se il Dockerfile è nella root del progetto:
COPY backend/. .
# Se il Dockerfile è già DENTRO la directory 'backend/':
# COPY . .

# Specifica la porta su cui l'app ascolterà (se non già fatto in server.js o tramite ENV)
# EXPOSE 3001 # o process.env.PORT

# Comando per avviare l'applicazione
CMD [ "node", "server.js" ]