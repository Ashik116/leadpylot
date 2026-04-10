/**
 * Import Queue Service
 * In-memory job queue for background processing of lead imports
 * Provides real-time progress updates via Socket.io
 */

const { ImportHistory } = require('../models');
const logger = require('../utils/logger');

// In-memory job queue (no Redis needed)
const importJobs = new Map();

// Socket.io instance reference
let io = null;

// Progress update throttling (update DB every N leads or every N ms)
const PROGRESS_UPDATE_INTERVAL_LEADS = 1000;
const PROGRESS_UPDATE_INTERVAL_MS = 2000;

/**
 * Set the Socket.io instance for real-time updates
 * @param {Object} socketIO - Socket.io server instance
 */
const setSocketIO = (socketIO) => {
  io = socketIO;
  logger.info('Import queue initialized with Socket.io');
};

/**
 * Get the Socket.io instance
 * @returns {Object} Socket.io server instance
 */
const getSocketIO = () => io;

/**
 * Emit progress update via WebSocket
 * @param {string} importId - Import ID
 * @param {string} userId - User ID
 * @param {Object} progressData - Progress data to emit
 */
const emitProgress = (importId, userId, progressData) => {
  if (!io) {
    logger.debug('Socket.io not initialized, skipping progress emit');
    return;
  }
  
  const payload = {
    importId,
    timestamp: new Date().toISOString(),
    ...progressData
  };
  
  // Emit to import-specific room
  io.to(`import:${importId}`).emit('import:progress', payload);
  
  // Also emit to user room for dashboard updates
  if (userId) {
    io.to(`user:${userId}`).emit('import:progress', payload);
  }
};

/**
 * Update progress in database and emit via WebSocket
 * Throttled to avoid excessive database writes
 * @param {string} importId - Import ID
 * @param {string} userId - User ID
 * @param {Object} progressData - Progress data
 */
const updateProgress = async (importId, userId, progressData) => {
  const job = importJobs.get(importId);
  const now = Date.now();
  
  // Check if we should update the database (throttling)
  const shouldUpdateDb = !job?.lastDbUpdate || 
    (now - job.lastDbUpdate) >= PROGRESS_UPDATE_INTERVAL_MS ||
    progressData.phase !== job?.lastPhase ||
    progressData.percentage === 100;
  
  try {
    if (shouldUpdateDb) {
      await ImportHistory.findByIdAndUpdate(importId, {
        $set: {
          'progress.current_phase': progressData.phase,
          'progress.phase_description': progressData.description,
          'progress.processed_count': progressData.processedCount || 0,
          'progress.percentage': progressData.percentage || 0,
          'progress.current_batch': progressData.currentBatch || 0,
          'progress.total_batches': progressData.totalBatches || 0,
          'progress.estimated_time_remaining_ms': progressData.estimatedTimeRemaining || null,
          'progress.last_updated': new Date()
        }
      });
      
      if (job) {
        job.lastDbUpdate = now;
        job.lastPhase = progressData.phase;
      }
    }
    
    // Always emit via WebSocket for real-time updates
    emitProgress(importId, userId, progressData);
    
  } catch (error) {
    logger.error(`Failed to update progress for import ${importId}:`, error);
  }
};

/**
 * Add a new import job to the queue
 * @param {string} importId - Import ID
 * @param {string} userId - User ID
 * @param {Object} jobData - Job data (file, user, sourceId, leadPrice)
 * @returns {string} Import ID
 */
const addJob = async (importId, userId, jobData) => {
  const job = {
    id: importId,
    userId,
    status: 'queued',
    createdAt: Date.now(),
    lastDbUpdate: null,
    lastPhase: null,
    ...jobData
  };
  
  importJobs.set(importId, job);
  
  logger.info(`Import job ${importId} added to queue`, {
    userId,
    filename: jobData.file?.originalname
  });
  
  // Process immediately in background (non-blocking)
  setImmediate(() => processJob(importId));
  
  return importId;
};

/**
 * Process an import job
 * @param {string} importId - Import ID to process
 */
const processJob = async (importId) => {
  const job = importJobs.get(importId);
  if (!job) {
    logger.error(`Job ${importId} not found in queue`);
    return;
  }
  
  try {
    job.status = 'processing';
    job.startedAt = Date.now();
    
    // Update import record status
    await ImportHistory.findByIdAndUpdate(importId, {
      status: 'processing',
      'progress.current_phase': 'validating',
      'progress.phase_description': 'Starting import process...',
      'progress.started_at': new Date()
    });
    
    emitProgress(importId, job.userId, {
      phase: 'validating',
      description: 'Starting import process...',
      percentage: 0
    });
    
    // Import the optimized import function
    const { importLeadsFromExcelOptimized } = require('./leadService/excel');
    
    // Create progress callback
    const progressCallback = (progressData) => {
      updateProgress(importId, job.userId, progressData);
    };
    
    // Run the import with progress callback
    const result = await importLeadsFromExcelOptimized(
      job.file,
      job.user,
      job.sourceId,
      job.leadPrice,
      importId,
      progressCallback
    );
    
    job.status = 'completed';
    job.completedAt = Date.now();
    job.result = result;
    
    // Emit completion event
    emitProgress(importId, job.userId, {
      phase: 'completed',
      description: `Import completed: ${result.successCount || 0} leads imported successfully`,
      percentage: 100,
      processedCount: result.successCount || 0,
      result: {
        successCount: result.successCount,
        failureCount: result.failureCount,
        enhancedCount: result.enhancedCount,
        autoAssignedCount: result.autoAssignedCount,
        downloadLink: result.downloadLink,
        duplicateStatusSummary: result.duplicateStatusSummary || {
          new: result.successCount || 0,
          oldDuplicate: 0,
          duplicate: 0
        }
      }
    });
    
    logger.info(`Import job ${importId} completed successfully`, {
      successCount: result.successCount,
      failureCount: result.failureCount,
      processingTime: job.completedAt - job.startedAt
    });
    
  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    job.completedAt = Date.now();
    
    // Update import record with failure
    await ImportHistory.findByIdAndUpdate(importId, {
      status: 'failed',
      error_message: error.message,
      'progress.current_phase': 'failed',
      'progress.phase_description': `Error: ${error.message}`
    });
    
    // Emit failure event
    emitProgress(importId, job.userId, {
      phase: 'failed',
      description: `Import failed: ${error.message}`,
      error: error.message,
      percentage: 0
    });
    
    logger.error(`Import job ${importId} failed:`, {
      error: error.message,
      stack: error.stack
    });
  } finally {
    // Clean up job from memory after 1 hour
    setTimeout(() => {
      importJobs.delete(importId);
      logger.debug(`Import job ${importId} removed from memory`);
    }, 60 * 60 * 1000);
  }
};

/**
 * Get job status
 * @param {string} importId - Import ID
 * @returns {Object|null} Job status or null if not found
 */
const getJobStatus = (importId) => {
  const job = importJobs.get(importId);
  if (!job) return null;
  
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    error: job.error,
    result: job.result
  };
};

/**
 * Get all active jobs for a user
 * @param {string} userId - User ID
 * @returns {Array} Array of active jobs
 */
const getActiveJobsForUser = (userId) => {
  const activeJobs = [];
  
  for (const [importId, job] of importJobs.entries()) {
    if (job.userId === userId && (job.status === 'queued' || job.status === 'processing')) {
      activeJobs.push({
        id: importId,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt
      });
    }
  }
  
  return activeJobs;
};

/**
 * Cancel a job (if still queued)
 * @param {string} importId - Import ID
 * @returns {boolean} True if cancelled, false otherwise
 */
const cancelJob = async (importId) => {
  const job = importJobs.get(importId);
  
  if (!job || job.status !== 'queued') {
    return false;
  }
  
  job.status = 'cancelled';
  importJobs.delete(importId);
  
  await ImportHistory.findByIdAndUpdate(importId, {
    status: 'failed',
    error_message: 'Import cancelled by user',
    'progress.current_phase': 'failed',
    'progress.phase_description': 'Import cancelled by user'
  });
  
  emitProgress(importId, job.userId, {
    phase: 'failed',
    description: 'Import cancelled by user',
    percentage: 0
  });
  
  return true;
};

module.exports = {
  setSocketIO,
  getSocketIO,
  addJob,
  getJobStatus,
  getActiveJobsForUser,
  cancelJob,
  updateProgress,
  emitProgress,
  PROGRESS_UPDATE_INTERVAL_LEADS
};
