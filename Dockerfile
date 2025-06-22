# Dockerfile per Railway Deploy - BrainTipster Backend
FROM node:18-alpine

# Imposta directory di lavoro
WORKDIR /app

# Copia package.json e package-lock.json
COPY backend/package*.json ./

# Installa solo dipendenze di produzione
RUN npm ci --only=production && npm cache clean --force

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
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "http.get('http://localhost:' + (process.env.PORT || 3001) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando di avvio
CMD ["node", "server.js"]