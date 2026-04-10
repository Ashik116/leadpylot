const fs = require('fs');
const path = require('path');

const env = process.env.NODE_ENV || 'development';

// Determine the log file path - use logs directory if it exists
const logsDir = path.join(__dirname, '../../logs');
let logFilePath = path.join(logsDir, 'app.log');

// Ensure logs directory exists, if not fallback to console only
let canWriteToFile = false;
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  // Test write permissions
  fs.accessSync(logsDir, fs.constants.W_OK);
  canWriteToFile = true;
} catch (error) {
  console.warn(`[Logger] Cannot write to log file: ${error.message}. Logging to console only.`);
}

/**
 * Formats log message with timestamp and metadata
 */
const formatLogMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const formattedMeta = meta ? JSON.stringify(meta) : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${formattedMeta}`.trim();
};

/**
 * Safely write to log file
 */
const writeToFile = (logData) => {
  if (!canWriteToFile) return;

  try {
    fs.appendFileSync(logFilePath, JSON.stringify(logData, null, 2) + '\n');
  } catch (error) {
    // Silently fail - don't crash the application
    console.error(`[Logger] Failed to write to log file: ${error.message}`);
  }
};

const logger = {
  /**
   * Log informational messages
   */
  info: (message, meta = {}) => {
    const logMsg = formatLogMessage('info', message, meta);
    console.info(logMsg);
    writeToFile({ level: 'info', message, meta, timestamp: new Date().toISOString() });
  },

  /**
   * Log warning messages
   */
  warn: (message, meta = {}) => {
    console.warn(formatLogMessage('warn', message, meta));
  },

  /**
   * Log error messages
   */
  error: (message, meta = {}) => {
    console.error(formatLogMessage('error', message, meta));
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (message, meta = {}) => {
    if (env === 'development' || env === 'test') {
      console.debug(formatLogMessage('debug', message, meta));
    }
  },
};

module.exports = logger;
