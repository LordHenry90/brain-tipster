# Dockerfile per Railway Deploy
FROM node:18-alpine

# Crea directory di lavoro
WORKDIR /app

# Copia e installa dipendenze backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --production

# Copia il codice del backend
COPY backend/ ./

# Esponi la porta
EXPOSE 3001

# Comando di avvio
CMD ["npm", "start"]