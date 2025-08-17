import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import servizi
import { getMatchPrediction } from './services/geminiService.js';

// Configurazione ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carica variabili d'ambiente
dotenv.config();

const app = express();

// Specifica di fidarsi del primo hop del proxy (standard per Railway)
app.set('trust proxy', 1);

// Porta dinamica per Railway (Railway assegna automaticamente la porta)
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware di sicurezza
app.use(helmet({
    contentSecurityPolicy: false, // Per permettere il frontend
    crossOriginEmbedderPolicy: false
}));

// Configurazione CORS per Railway
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://braintipster.vercel.app',
    process.env.FRONTEND_URL,
    process.env.RAILWAY_STATIC_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Permetti richieste senza origin (come app mobile o Postman)
        if (!origin) return callback(null, true);
        
        // Permetti tutte le origin in development
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }
        
        // In produzione, controlla la whitelist
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        // Permetti domini Railway
        if (origin.includes('railway.app')) {
            return callback(null, true);
        }
        
        callback(new Error('Non autorizzato da CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-KEY']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Richieste per IP
    message: 'Troppe richieste da questo IP, riprova più tardi.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Middleware per parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware per logging delle richieste
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// Middleware di autenticazione per le API protette
const authenticateAPI = (req, res, next) => {
    const providedKey = req.headers['x-api-key'];
    const expectedKey = process.env.FRONTEND_API_KEY;
    
    // Se non è configurata una chiave API, salta l'autenticazione (per development)
    if (!expectedKey) {
        console.warn('⚠️ FRONTEND_API_KEY non configurata - autenticazione disabilitata');
        return next();
    }
    
    if (!providedKey) {
        return res.status(401).json({
            error: 'API key richiesta',
            message: 'Includi X-API-KEY nell\'header della richiesta'
        });
    }
    
    if (providedKey !== expectedKey) {
        return res.status(403).json({
            error: 'API key non valida',
            message: 'L\'API key fornita non è autorizzata'
        });
    }
    
    next();
};

// Servi file statici del frontend (se buildati in public/)
app.use(express.static(path.join(__dirname, 'public')));

// ===== ROUTES =====

// Health check (senza autenticazione)
app.get('/health', (req, res) => {
    const healthData = {
        status: 'UP',
        message: 'BrainTipster Backend is running.',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
        version: '1.0.0',
        port: PORT,
        features: {
            geminiAI: !!process.env.API_KEY,
            sportsAPI: !!process.env.SPORTS_API_KEY,
            openRouter: !!process.env.OPENROUTER_API_KEY && process.env.DISABLE_OPENROUTER !== 'true',
            authentication: !!process.env.FRONTEND_API_KEY
        }
    };
    
    res.json(healthData);
});

// API per predizioni (con autenticazione)
app.post('/api/predict', authenticateAPI, async (req, res) => {
    try {
        console.log('🚀 Richiesta predizione ricevuta:', req.body);
        
        const { homeTeam, awayTeam, league, matchDate } = req.body;
        
        // Validazione input
        if (!homeTeam || !awayTeam) {
            return res.status(400).json({
                error: 'Dati mancanti',
                message: 'homeTeam e awayTeam sono richiesti',
                required: ['homeTeam', 'awayTeam'],
                optional: ['league', 'matchDate']
            });
        }
        
        // Validazione lunghezza
        if (homeTeam.length > 50 || awayTeam.length > 50) {
            return res.status(400).json({
                error: 'Input troppo lungo',
                message: 'I nomi delle squadre devono essere sotto i 50 caratteri'
            });
        }
        
        console.log(`🏆 Elaborazione: ${homeTeam} vs ${awayTeam} (${league || 'Campionato non specificato'})`);
        
        // CORREZIONE: Crea oggetto matchInput per la chiamata al servizio
        const matchInput = {
            homeTeam,
            awayTeam,
            league,
            matchDate
        };
        
        // Chiamata al servizio di predizione con oggetto matchInput
        const startTime = Date.now();
        const result = await getMatchPrediction(matchInput);
        const processingTime = Date.now() - startTime;
        
        console.log(`✅ Predizione completata in ${processingTime}ms`);
        
        // Aggiungi metadati di performance
        if (result.parsed && result.parsed._metadata) {
            result.parsed._metadata.processingTimeMs = processingTime;
            result.parsed._metadata.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        } else if (result.parsed) {
            // Crea l'oggetto _metadata se non esiste
            result.parsed._metadata = {
                processingTimeMs: processingTime,
                requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
        }
        
        res.json(result);
        
    } catch (error) {
        console.error('❌ Errore nella predizione:', error);
        
        res.status(500).json({
            error: 'Errore interno del server',
            message: 'Si è verificato un errore durante l\'elaborazione della predizione',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        });
    }
});

// Catch-all per il frontend (SPA routing)
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    
    // Se index.html esiste, servilo (per SPA)
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // Altrimenti mostra una pagina di benvenuto
        res.status(404).json({
            message: 'BrainTipster Backend API',
            status: 'running',
            availableEndpoints: {
                health: 'GET /health',
                predict: 'POST /api/predict'
            },
            documentation: 'Controlla la documentazione per maggiori dettagli'
        });
    }
});

// Gestione errori globale
app.use((error, req, res, next) => {
    console.error('❌ Errore non gestito:', error);
    
    res.status(500).json({
        error: 'Errore interno del server',
        message: 'Si è verificato un errore imprevisto',
        timestamp: new Date().toISOString()
    });
});

// Avvio del server
const server = app.listen(PORT, HOST, () => {
    console.log('\n🧠 ================================');
    console.log('   BrainTipster Backend');
    console.log('================================');
    console.log(`🚀 Server in ascolto su: ${HOST}:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 Health check: http://${HOST}:${PORT}/health`);
    console.log(`🎯 API endpoint: http://${HOST}:${PORT}/api/predict`);
    console.log('\n🔧 Configurazione:');
    console.log(`   📊 Gemini AI: ${process.env.API_KEY ? '✅ Configurato' : '❌ MANCANTE (CRITICO!)'}`);
    console.log(`   ⚽ Sports API: ${process.env.SPORTS_API_KEY ? '✅ Presente' : '⚠️ NON PRESENTE'}`);
    console.log(`   🤖 OpenRouter: ${process.env.OPENROUTER_API_KEY && process.env.DISABLE_OPENROUTER !== 'true' ? '✅ Attivo' : '⚠️ Disabilitato'}`);
    console.log(`   🔐 Auth Frontend: ${process.env.FRONTEND_API_KEY ? '✅ Attiva' : '⚠️ DISATTIVATA'}`);
    console.log('================================\n');
});

// Gestione graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM ricevuto, arresto graceful del server...');
    server.close(() => {
        console.log('✅ Server chiuso correttamente');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT ricevuto, arresto graceful del server...');
    server.close(() => {
        console.log('✅ Server chiuso correttamente');
        process.exit(0);
    });
});

// Gestione errori non catturati
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

export default app;
