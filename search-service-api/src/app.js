const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDatabase = require('./config/database');
const searchRoutes = require('./routes/searchRoutes');
const metadataRoutes = require('./routes/metadataRoutes');
const logger = require('./utils/logger');
const loadModels = require('./models/loader');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();


// CORS configuration - allow file:// protocol for local testing
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:4003',
  'http://3.76.250.176:3000',
  'http://18.156.171.230:3001',
  'http://18.156.171.230',
  'https://core.supercrm247.com',
  'https://dev.leadpylot.com',
  'http://18.156.171.230:3001',
  'http://18.156.171.230',
  'null', // Allow file:// protocol for testing
  process.env.CORS_ORIGIN,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || origin === 'null') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    try {
      const originHost = new URL(origin).hostname;
      if (['localhost', '127.0.0.1', '18.156.171.230', '18.199.199.138', '192.168.1.129', 'core.supercrm247.com', 'dev.leadpylot.com'].includes(originHost)) {
        return callback(null, true);
      }
    } catch (_) {}
    callback(null, true);
  },
  credentials: true,
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Routes
app.use('/api/search', searchRoutes);
app.use('/api/metadata', metadataRoutes);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'search-service' });
});

// Schema registry status endpoint
app.get('/api/schema-status', async (req, res) => {
    try {
        const SchemaRegistry = require('./models/SchemaRegistry');
        const schemas = await SchemaRegistry.find({ active: true })
            .select('modelName service priority lastPublished')
            .sort({ modelName: 1 });
        res.json({
            success: true,
            count: schemas.length,
            schemas: schemas.map(s => ({
                model: s.modelName,
                service: s.service,
                priority: s.priority,
                lastPublished: s.lastPublished,
            })),
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Error handling
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server with async initialization
const startServer = async () => {
    try {
        const PORT = process.env.PORT || 3010;

        // 1. Connect to Database
        await connectDatabase();
        logger.info('✅ Database connected');

        // 2. Load Models from Schema Registry
        logger.info('📥 Loading models from Schema Registry...');
        const result = await loadModels();
        logger.info(`✅ Models loaded: ${result.loaded} models`);

        // 3. Start Express server
        app.listen(PORT, () => {
            logger.info(`🚀 Search Service running on port ${PORT}`);
            logger.info(`   Health check: http://localhost:${PORT}/health`);
            logger.info(`   Schema status: http://localhost:${PORT}/api/schema-status`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});

startServer();

module.exports = app;
