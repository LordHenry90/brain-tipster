# Dockerfile per Railway Deploy - BrainTipster Backend
FROM node:18-alpine

# Installa curl per health check
RUN apk add --no-cache curl

# Imposta directory di lavoro
WORKDIR /app

# Copia package.json
COPY backend/package.json ./

# Installa dipendenze (usa npm install invece di npm ci per essere più flessibile)
RUN npm install --only=production --no-audit --no-fund && \
    npm cache clean --force

# Copia tutto il codice del backend
COPY backend/ ./

# Crea utente non-root per sicurezza
RUN addgroup -g 1001 -S nodejs && \
    adduser -S braintipster -u 1001 && \
    chown -R braintipster:nodejs /app

# Cambia all'utente non-root
USER braintipster

# Esponi porta (Railway assegna automaticamente)
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3001}/health || exit 1

# Comando di avvio
CMD ["node", "server.js"]