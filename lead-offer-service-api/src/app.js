const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const logger = require('./utils/logger');
const connectDatabase = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');
const { authenticate } = require('./middleware');
const { eventEmitter, EVENT_TYPES } = require('./services/events');
const axios = require('axios');

const leadsRoutes = require('./routes/leads');
const offersRoutes = require('./routes/offers');
const reclamationsRoutes = require('./routes/reclamations');
const confirmationsRoutes = require('./routes/confirmations');
const assignLeadsRoutes = require('./routes/assignLeads');
const openingsRoutes = require('./routes/openings');
const paymentVouchersRoutes = require('./routes/paymentVouchers');
const appointmentsRoutes = require('./routes/appointments');
const lostOffersRoutes = require('./routes/lostOffers');
const filtersRoutes = require('./routes/filters');
const dynamicFiltersRoutes = require('./routes/dynamicFilters');
const todosRoutes = require('./routes/todos');
const transferRoutes = require('./routes/transfer');
const leadGroupingRoutes = require('./routes/leadGrpuping');
const closedLeadGroupingRoutes = require('./routes/closedLeadGrouping');
const closedLeadsRoutes = require('./routes/closedLeads');
const activitiesRoutes = require('./routes/activities');
const searchRoutes = require('./routes/search');
const commissionsRoutes = require('./routes/commissions');
const documentSlotsRoutes = require('./routes/documentSlots');
const { setupNotificationListeners } = require('./listeners/notificationListeners');
const { setupActivityListeners } = require('./listeners/activityListeners');

// Universal Query Middleware - adds filtering/grouping to all endpoints
const universalQueryMiddleware = require('./middleware/universalQuery');

// Import routes

const app = express();
const PORT = process.env.PORT || 4003;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3001',
  'http://18.156.171.230:3001',
  'http://18.156.171.230',
  'https://core.supercrm247.com',
  'https://dev.leadpylot.com',
  'http://18.156.171.230:3001',
  'http://18.156.171.230',
  'null', // Allow file:// protocol for testing
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : []),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or file://)
      if (!origin || origin === 'null') return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);
      try {
        const originHost = new URL(origin).hostname;
        if (['localhost', '127.0.0.1', '18.156.171.230', '18.199.199.138', '192.168.1.129', 'core.supercrm247.com', 'dev.leadpylot.com'].includes(originHost)) {
          return callback(null, true);
        }
      } catch (_) {}
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        // In development, allow all origins (comment out in production)
        callback(null, true); // Allow all for testing
        // callback(new Error('Not allowed by CORS')); // Uncomment for production
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Pragma',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    optionsSuccessStatus: 200,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'lead-offers-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Public endpoints (no authentication required)
app.get('/', (req, res) => {
  res.json({
    message: 'Lead-Offers Service API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/auth (login, logout, me, refresh)',
      leads: '/leads (requires authentication)',
      offers: '/offers (requires authentication)',
      openings: '/openings (requires authentication)',
      confirmations: '/confirmations (requires authentication)',
      paymentVouchers: '/payment-vouchers (requires authentication)',
      appointments: '/appointments (requires authentication)',
      assignLeads: '/assign-leads (requires authentication)',
      reclamations: '/reclamations (requires authentication)',
      todos: '/todos (requires authentication)',
      activities: '/activities (requires authentication)',
      dynamicFilters: '/dynamic-filters/apply (POST)',
      groupBy: '/filters/group-by (POST)',
      leadGrouping: '/leads/group (multilevel grouping, options, summary)',
    },
    timestamp: new Date().toISOString(),
  });
});

// Public service info endpoint
app.get('/info', (req, res) => {
  res.json({
    service: 'lead-offers-service',
    version: '1.0.0',
    status: 'running',
    port: process.env.PORT || 4003,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// API routes with Universal Query Middleware
// The middleware intercepts requests with domain/groupBy params
// and provides filtering/grouping transparently
app.use('/leads', authenticate, universalQueryMiddleware, leadsRoutes);
app.use('/assign-leads', authenticate, assignLeadsRoutes);
app.use('/reclamations', authenticate, universalQueryMiddleware, reclamationsRoutes);
app.use('/confirmations', authenticate, universalQueryMiddleware, confirmationsRoutes);
app.use('/offers', authenticate, universalQueryMiddleware, offersRoutes);
app.use('/lost-offers', authenticate, lostOffersRoutes);
app.use('/openings', authenticate, universalQueryMiddleware, openingsRoutes);
app.use('/payment-vouchers', authenticate, universalQueryMiddleware, paymentVouchersRoutes);
app.use('/appointments', authenticate, universalQueryMiddleware, appointmentsRoutes);
app.use('/filters', filtersRoutes);
app.use('/dynamic-filters', authenticate, dynamicFiltersRoutes);
app.use('/todos', authenticate, universalQueryMiddleware, todosRoutes);
app.use('/transfer', authenticate, transferRoutes);
app.use('/leads/group', authenticate, leadGroupingRoutes);
app.use('/closed-leads/group', authenticate, closedLeadGroupingRoutes);
app.use('/closed-leads', authenticate, universalQueryMiddleware, closedLeadsRoutes);
app.use('/activities', authenticate, activitiesRoutes);
app.use('/search', authenticate, searchRoutes);
app.use('/commissions', authenticate, commissionsRoutes);
app.use('/document-slots', documentSlotsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`,
  });
});

// Error handling middleware
app.use(errorHandler);

// Notification listeners are provided by listeners/notificationListeners module


// Create HTTP server and Socket.io instance
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) {
    logger.warn('Socket connection rejected: No token provided');
    return next(new Error('Authentication required'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id || decoded._id || decoded.userId;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    logger.warn('Socket connection rejected: Invalid token', { error: err.message });
    next(new Error('Invalid token'));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}, user: ${socket.userId}`);
  
  // Join user-specific room for targeted updates
  socket.join(`user:${socket.userId}`);
  
  // Subscribe to import progress updates
  socket.on('subscribe:import', (importId) => {
    socket.join(`import:${importId}`);
    logger.info(`Socket ${socket.id} subscribed to import:${importId}`);
  });
  
  // Unsubscribe from import progress updates
  socket.on('unsubscribe:import', (importId) => {
    socket.leave(`import:${importId}`);
    logger.info(`Socket ${socket.id} unsubscribed from import:${importId}`);
  });
  
  socket.on('disconnect', (reason) => {
    logger.info(`Socket disconnected: ${socket.id}, reason: ${reason}`);
  });
  
  socket.on('error', (error) => {
    logger.error(`Socket error: ${socket.id}`, { error: error.message });
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Setup event listeners
    setupNotificationListeners();
    setupActivityListeners();
    
    // Initialize import queue with Socket.io instance
    const importQueue = require('./services/importQueue');
    importQueue.setSocketIO(io);

    // Publish schemas to Schema Registry (for search-service)
    try {
      const { publishAllSchemas } = require('./services/schemaPublisher');
      await publishAllSchemas();
      logger.info('✅ Schemas published to registry');
    } catch (schemaError) {
      logger.warn('⚠️ Failed to publish schemas (search-service may not work):', schemaError.message);
      // Don't fail startup if schema publishing fails
    }

    // Start cron jobs
    const { startAppointmentReminderCron } = require('./cron/appointmentReminder');
    startAppointmentReminderCron();

    // Start the HTTP server with Socket.io
    server.listen(PORT, () => {
      logger.info(`🚀 Lead & Offers Service started on port ${PORT}`);
      logger.info(`🔌 WebSocket server ready for connections`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
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

module.exports = { app, io, server };
