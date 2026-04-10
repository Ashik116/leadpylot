/**
 * Settings Routes
 * API routes for settings management
 */

const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate, adminOnly } = require('../middleware/authenticate');
const multer = require('multer');
const storageConfig = require('../config/storage');
const path = require('path');
const crypto = require('crypto');


// Configure multer for email signature uploads (image only, max 500KB)
const signatureStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Use storageConfig to get the signatures directory path
        // Directory creation is handled by storageConfig
        const storageDir = storageConfig.getPath('signatures');
        cb(null, storageDir);
    },
    filename: function (req, file, cb) {
        // Generate a unique filename using MD5 hash of file content + timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(
            null,
            crypto
                .createHash('md5')
                .update(uniqueSuffix + file.originalname)
                .digest('hex') + ext
        );
    },
});

// Email signature upload with restrictions
const uploadSignature = multer({
    storage: signatureStorage,
    limits: {
        fileSize: 500 * 1024, // 500KB file size limit
    },
    fileFilter: function (req, file, cb) {
        // Only allow image files
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG and PNG images are allowed for email signatures'), false);
        }
    },
});


/**
 * @route   GET /stages
 * @desc    Get all stages with statuses
 * @access  Authenticated
 */
router.get('/stages', authenticate, settingsController.getAllStages);

/**
 * @route   GET /settings/:type
 * @desc    Get all settings of a specific type
 * @access  Authenticated
 */
router.get('/settings/:type', authenticate, settingsController.getSettingsByType);

/**
 * @route   GET /api/config/settings/:type/:id
 * @desc    Get specific setting by ID
 * @access  Authenticated
 */
router.get('/settings/:type/:id', authenticate, settingsController.getSettingById);

/**
 * @route   GET /api/config/settings/:type/paginated
 * @desc    Get settings by type with pagination
 * @access  Authenticated
 */
router.get('/settings/:type/paginated', authenticate, settingsController.getSettingsByTypeWithPagination);

/**
 * @route   POST /api/config/settings/:type
 * @desc    Create new setting
 * @access  Admin only
 */
router.post('/settings/:type', authenticate, adminOnly, (req, res) => {
    if (req.params.type === 'email_templates') {
        // Apply multer middleware for signature upload
        uploadSignature.single('signature')(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    error: err.message,
                });
            }
            return settingsController.createEmailTemplate(req, res);
        });
    } else {
        return settingsController.createOrUpdateSetting(req, res);
    }
});
/**
 * @route   PUT /api/config/settings/:type/:id
 * @desc    Update setting
 * @access  Admin only
 */
router.put('/settings/:type/:id', authenticate, adminOnly, (req, res) => {
    if (req.params.type === 'email_templates') {
        // Apply multer middleware for signature upload
        uploadSignature.single('signature')(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    error: err.message,
                });
            }
            return settingsController.updateEmailTemplate(req, res);
        });
    } else {
        return settingsController.createOrUpdateSetting(req, res);
    }
});
/**
 * @route   DELETE /api/config/settings/:type/:id
 * @desc    Delete setting
 * @access  Admin only
 */
router.delete('/settings/:type/:id', authenticate, adminOnly, settingsController.deleteSetting);

/**
 * @route   DELETE /api/config/settings/:type
 * @desc    Bulk delete settings
 * @access  Admin only
 */
router.delete('/settings/:type', authenticate, adminOnly, settingsController.bulkDeleteSettings);

module.exports = router;


