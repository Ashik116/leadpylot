/**
 * Database Initializer
 * Creates default admin user if it doesn't exist
 */

const User = require('../models/User');
const { hashPassword } = require('../auth/services/passwordService');
const { ROLES } = require('../auth/roles/roleDefinitions');
const logger = require('./logger');

/**
 * Initialize the database with default admin user
 * Creates an admin user with login "itadmin" if no admin exists
 */
const initializeDatabase = async () => {
  try {
    logger.info('🔄 Initializing database...');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ login: 'itadmin' });

    if (existingAdmin) {
      logger.info('✅ Admin user "itadmin" already exists. Skipping initialization.');
      return { success: true, message: 'Admin user already exists' };
    }

    // Create default admin user
    logger.info('🔧 Creating default admin user...');

    const hashedPassword = await hashPassword('itadmin');

    const adminUser = new User({
      login: 'itadmin',
      password: hashedPassword,
      role: ROLES.ADMIN,
      active: true,
      create_date: new Date(),
      write_date: new Date(),
      unmask: true, // Admin can see raw contact info
      backoffice: true,
      notification_type: 'email',
    });

    await adminUser.save();

    logger.info('✅ Default admin user created successfully!');
    logger.info('📋 Login credentials:');
    logger.info('   Username: itadmin');
    logger.info('   Password: itadmin');
    logger.info('⚠️  IMPORTANT: Please change the default password after first login!');

    return {
      success: true,
      message: 'Default admin user created successfully',
      credentials: {
        username: 'itadmin',
        password: 'itadmin',
      },
    };
  } catch (error) {
    logger.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

/**
 * Create a custom admin user
 * @param {string} login - Username for admin
 * @param {string} password - Password for admin
 * @param {Object} additionalFields - Additional user fields
 * @returns {Promise<Object>} - Created user info
 */
const createAdminUser = async (login, password, additionalFields = {}) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ login });

    if (existingUser) {
      logger.warn(`⚠️  User "${login}" already exists`);
      return {
        success: false,
        message: `User "${login}" already exists`,
      };
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create admin user
    const adminUser = new User({
      login,
      password: hashedPassword,
      role: ROLES.ADMIN,
      active: true,
      create_date: new Date(),
      write_date: new Date(),
      unmask: true,
      backoffice: true,
      notification_type: 'email',
      ...additionalFields,
    });

    await adminUser.save();

    logger.info(`✅ Admin user "${login}" created successfully!`);

    return {
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: adminUser._id,
        login: adminUser.login,
        role: adminUser.role,
      },
    };
  } catch (error) {
    logger.error(`❌ Failed to create admin user "${login}":`, error);
    throw error;
  }
};

/**
 * Check if any admin user exists in the system
 * @returns {Promise<boolean>}
 */
const adminExists = async () => {
  try {
    const adminCount = await User.countDocuments({ role: ROLES.ADMIN });
    return adminCount > 0;
  } catch (error) {
    logger.error('❌ Failed to check for admin users:', error);
    throw error;
  }
};

module.exports = {
  initializeDatabase,
  createAdminUser,
  adminExists,
};
