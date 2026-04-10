const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const userRoutes = require('./users');
const securityRoutes = require('./security');
const deviceSecurityRoutes = require('./deviceSecurity');
const unifiedSecurityRoutes = require('./unifiedSecurity');
const roleRoutes = require('./roles');
const permissionRoutes = require('./permissions');
const credentialRoutes = require('./credentials');
const officeRoutes = require('./offices');
const telegramBotRoutes = require('./telegramBots');
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/login-security', securityRoutes);
router.use('/device-security', deviceSecurityRoutes);
router.use('/unified-security', unifiedSecurityRoutes);

// RBAC Routes
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/permission-templates', roleRoutes);

// Credential Management Routes
router.use('/credentials', credentialRoutes);

// Office Routes
router.use('/offices', officeRoutes);

// Telegram Bot Routes
router.use('/telegram-bots', telegramBotRoutes);

module.exports = router;