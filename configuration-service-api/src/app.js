/**
 * Configuration Service
 * Main Express application
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDatabase = require('./config/database');
const logger = require('./utils/logger');
const { errorMiddleware, notFoundHandler } = require('./utils/errorHandler');
const universalQueryMiddleware = require('./middleware/universalQuery');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4006;

// Connect to MongoDB
connectDatabase();

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3001',
  'http://3.76.250.176:3001',
  'http://3.76.250.176',
  'http://18.184.6.146:3001',
  'http://18.184.6.146',
  'null', // Allow file:// protocol for testing
  'http://18.184.6.146:3001',
  'http://18.184.6.146',
  process.env.CORS_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

//  TODO: Uncomment this when we have a proper authentication system
// app.use('/', limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// API Routes (without /api/config prefix to match monolith)
// universalQueryMiddleware enables domain filtering via search-service
const apiRoutes = require('./routes');
app.use('/banks', universalQueryMiddleware);
app.use('/sources', universalQueryMiddleware);
app.use('/projects', universalQueryMiddleware);
app.use('/assignments', universalQueryMiddleware);
app.use('/column-preference', universalQueryMiddleware);
app.use('/closed-leads', universalQueryMiddleware);
app.use('/', apiRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Configuration Service API',
    version: '1.0.0',
    status: 'Active',
    endpoints: {
      health: '/health',
      stages: '/api/config/stages',
      settings: '/api/config/settings/:type',
      banks: '/api/config/banks',
      projects: '/api/config/projects',
      sources: '/api/config/sources',
      columnPreference: '/column-preference',
      assignments: '/api/config/assignments',
      closedLeads: '/closed-leads/projects',
      savedFilters: '/saved-filters',
    },
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'configuration-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorMiddleware);

const { setupNotificationListeners } = require('./listeners/notificationListeners');
setupNotificationListeners();

// Async startup for schema publishing
const startServer = async () => {
  try {
    // Publish schemas to Schema Registry (for search-service)
    try {
      const { publishAllSchemas } = require('./services/schemaPublisher');
      await publishAllSchemas();
      logger.info('✅ Schemas published to registry');
    } catch (schemaError) {
      logger.warn('⚠️ Failed to publish schemas:', schemaError.message);
    }

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Configuration Service started on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Phase: Phase 1 - Settings Service`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
let server;
startServer().then(s => { server = s; });

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;
