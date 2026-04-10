require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDatabase = require('./config/database');
const { errorMiddleware } = require('./utils/errorHandler');
const logger = require('./utils/logger');
const apiRoutes = require('./routes');
const { initializeDatabase } = require('./utils/dbInitializer');
const { initRedis } = require('./config/redis');
const universalQueryMiddleware = require('./middleware/universalQuery');
const { setupNotificationListeners } = require('./listeners/notificationListeners');

const app = express();
const PORT = process.env.PORT || 4000;

// CORS configuration
const allowedOrigins = [
  'http://localhost:3001',
  'http://3.76.250.176:3001',
  'http://3.76.250.176',
  'null', // Allow file:// protocol for testing
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : []),
].filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, or curl)
      if (!origin) return callback(null, true);

      // Check if the origin is in the allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization',
      'X-Tenant-API-Key',
      'X-Gateway-Secret',
      'X-Tenant-Id',
      'X-Tenant-Type',
      'X-Request-Id',
    ],
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { service: 'user-auth-service' });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'user-auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Readiness check endpoint
app.get('/ready', async (req, res) => {
  const mongoose = require('mongoose');
  const dbReady = mongoose.connection.readyState === 1;

  if (dbReady) {
    res.status(200).json({ status: 'ready', database: 'connected' });
  } else {
    res.status(503).json({ status: 'not ready', database: 'disconnected' });
  }
});



// API routes
// universalQueryMiddleware enables domain filtering via search-service
app.use('/users', universalQueryMiddleware);
app.use('/sessions', universalQueryMiddleware);
app.use('/', apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handling middleware (last)
app.use(errorMiddleware);

// Event listeners moved to ./listeners/notificationListeners and initialized during startup

// Initialize RBAC system
const initializeRbac = async () => {
  try {
    const { loadRolePermissionsFromDb } = require('./auth/middleware/authorize');

    // Load role permissions from database and cache them in memory
    await loadRolePermissionsFromDb();

    logger.info('✅ RBAC system initialized');
  } catch (error) {
    logger.warn('⚠️ RBAC initialization skipped:', error.message);
    // Continue with static permissions fallback
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDatabase(); // Connect to MongoDB

    // voip_extension: replace legacy unique index (duplicate null E11000) with partial unique + clean data
    try {
      const User = require('./models/User');
      const cleared = await User.collection.updateMany(
        { $or: [{ voip_extension: null }, { voip_extension: '' }] },
        { $unset: { voip_extension: '' } }
      );
      if (cleared.modifiedCount > 0) {
        logger.info(`✅ Cleared null/empty voip_extension on ${cleared.modifiedCount} user(s)`);
      }
      await User.syncIndexes();
      logger.info('✅ User collection indexes synced');
    } catch (idxErr) {
      logger.warn('⚠️ User voip / index sync:', idxErr.message);
    }

    // Initialize database with default admin user if needed
    await initializeDatabase();

    // Initialize Redis
    await initRedis();

    // Seed RBAC (permissions and roles) from seedRbac.js
    try {
      const { seedPermissions, seedRoles, syncSystemRolePermissions } = require('./scripts/seedRbac');
      await seedPermissions();
      await seedRoles();
      // Full sync of system role permissions to match ROLE_PERMISSIONS exactly
      await syncSystemRolePermissions();
      logger.info('✅ RBAC seeded and synced successfully');
    } catch (error) {
      logger.warn('⚠️ RBAC seeding failed:', error.message);
    }

    // Initialize RBAC system with Redis cache (reloads cache after sync)
    await initializeRbac();

    // Seed permissions to ensure DB is up to date
    try {
      const { seedPermissionsv2 } = require('./services/permissionService');
      await seedPermissionsv2('system'); // 'system' as userId
      logger.info('✅ Permissions seeded successfully');
    } catch (error) {
      logger.warn('⚠️ Permission seeding failed:', error.message);
    }

    // Setup notification event listeners
    setupNotificationListeners();

    // Initialize Telegram bot - trigger webhook to reload bot configurations
    try {
      const { triggerNotificationServiceWebhook } = require('./services/telegramBotService');
      await triggerNotificationServiceWebhook('reload', null);
      logger.info('✅ Telegram bot initialization webhook triggered');
    } catch (error) {
      logger.warn('⚠️ Failed to trigger Telegram bot initialization webhook:', error.message);
    }

    // Publish schemas to Schema Registry (for search-service)
    try {
      const { publishAllSchemas } = require('./services/schemaPublisher');
      await publishAllSchemas();
      logger.info('✅ Schemas published to registry');
    } catch (schemaError) {
      logger.warn('⚠️ Failed to publish schemas:', schemaError.message);
    }

    app.listen(PORT, () => {
      logger.info(`🚀 User & Auth Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
['SIGTERM', 'SIGINT'].forEach((signal) => {
  process.on(signal, () => {
    logger.info(`${signal} received, shutting down gracefully...`);
    process.exit(0);
  });
});

// Start the application
startServer();

module.exports = app;
