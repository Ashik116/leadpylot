const User = require('../models/User');
const Office = require('../models/Office.model');
const { Settings } = require('../models/Settings');
const Document = require('../models/Document'); // Register Document model for population
const mongoose = require('mongoose');
const { ROLES } = require('../auth/roles/roleDefinitions');
const { hashPassword } = require('../auth/services/passwordService');
const { eventEmitter, EVENT_TYPES } = require('../utils/events');
const { DatabaseError } = require('../utils/errorHandler');
const { 
  encryptPlatformCredentials, 
  decryptPlatformCredentials,
  decryptSingleCredential,
} = require('../utils/credentialEncryption');

class UserService {
  /**
   * Get all users
   */
  async getAllUsers(options = {}) {
    try {
      const { page = 1, limit = 20, role, showInactive = false, search, sortBy, sortOrder } = options;
      const skip = (page - 1) * limit;

      // Create query based on filters
      const query = { active: showInactive ? { $in: [false] } : true };
      if (role) {
        // Handle case-insensitive role matching
        const normalizedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
        if (Object.values(ROLES).includes(normalizedRole)) {
          query.role = normalizedRole;
        }
      }

      // Add search functionality
      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i'); // Case-insensitive search
        query.$or = [
          { login: searchRegex },
          { 'info.name': searchRegex },
          { 'info.firstName': searchRegex },
          { 'info.lastName': searchRegex },
          { 'info.email': searchRegex },
        ];
      }

      // Handle sorting
      let sortOptions = { createdAt: -1 }; // Default sort
      const sortDirection = sortOrder === 'asc' ? 1 : -1;
      
      if (sortBy && sortOrder) {
        const allowedSortFields = {
          'login': 'login',
          'name': 'info.name',
          'email': 'info.email', 
          'role': 'role',
          'status': 'active',
          'createdAt': 'createdAt',
          'updatedAt': 'updatedAt'
        };
        
        const sortField = allowedSortFields[sortBy.toLowerCase()];
        
        if (sortField) {
          // Special handling for name field to support firstName/lastName fallback
          if (sortBy.toLowerCase() === 'name') {
            // Sort by name, with fallback to firstName, then lastName
            sortOptions = {
              'info.name': sortDirection,
              'info.firstName': sortDirection,
              'info.lastName': sortDirection,
              'login': sortDirection // Final fallback
            };
          } else {
            // Standard sorting for other fields
            sortOptions = { [sortField]: sortDirection };
          }
        } else {
          // Invalid sort field, use default
          sortOptions = { createdAt: -1 };
        }
      }

      // Execute query with pagination
      const [users, total] = await Promise.all([
        User.find(query)
          .select('-password') // Exclude password field
          .populate('image_id') // Populate image document
          .populate('offices') // Populate office refs
          .populate('primary_office')
          .populate('mail_servers') // Populate mail server refs
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        User.countDocuments(query),
      ]);

      return {
        data: users,
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - The ID of the user to retrieve
   * @param {boolean} includeInactive - Whether to include inactive users (default: false)
   */
  async getUserById(userId, includeInactive = false) {
    try {
      const query = { _id: userId };

      // Only include active users by default
    //   if (!includeInactive) {
    //     query.active = true;
    //   }

      const user = await User.findOne(query)
        .select('-password')
        .populate('image_id') // Populate image document
        .populate('offices') // Populate office refs
        .populate('primary_office')
        .populate('mail_servers') // Populate mail server refs
        .lean();

      if (!user) {
        throw new Error('User not found');
      }

      // Note: In a full microservices setup, we'd call other services (Project, Source)
      // via REST APIs to get additional user data. For now, return basic user info.
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create new user
   */
  async createUser(userData) {
    try {
      // Validate role
      // if (userData.role && !Object.values(ROLES).includes(userData.role)) {
      //   throw new Error(`Invalid role. Role must be one of: ${Object.values(ROLES).join(', ')}`);
      // }

      // Set default role if not provided
      if (!userData.role) {
        userData.role = ROLES.AGENT;
      }

      // Check if login already exists
      const existingUser = await User.findOne({ login: userData.login });
      if (existingUser) {
        throw new Error('User with this login already exists');
      }

      // Hash password if provided
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }

      // Encrypt passwords in other_platform_credentials if provided
      if (userData.other_platform_credentials) {
        userData.other_platform_credentials = encryptPlatformCredentials(
          userData.other_platform_credentials
        );
      }

      // Convert image_id from string to ObjectId if provided
      if (userData.image_id && typeof userData.image_id === 'string') {
        if (mongoose.Types.ObjectId.isValid(userData.image_id)) {
          userData.image_id = new mongoose.Types.ObjectId(userData.image_id);
        } else {
          throw new Error('Invalid image_id format. Must be a valid ObjectId.');
        }
      }

      // Normalize mail_servers: array of IDs (strings or ObjectIds)
      if (userData.mail_servers !== undefined) {
        const rawMailServers = Array.isArray(userData.mail_servers) ? userData.mail_servers : [];
        userData.mail_servers = rawMailServers
          .filter((id) => id != null && mongoose.Types.ObjectId.isValid(id))
          .map((id) => (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id));
      }

      // Normalize offices and primary_office (frontend sends office IDs)
      if (userData.offices !== undefined) {
        const raw = Array.isArray(userData.offices) ? userData.offices : [];
        userData.offices = raw
          .filter((id) => id != null && mongoose.Types.ObjectId.isValid(id))
          .map((id) => (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id));
      }
      if (userData.primary_office !== undefined && userData.primary_office != null) {
        const pid =
          typeof userData.primary_office === 'string'
            ? new mongoose.Types.ObjectId(userData.primary_office)
            : userData.primary_office;
        if (mongoose.Types.ObjectId.isValid(pid)) {
          userData.primary_office = pid;
          if (Array.isArray(userData.offices) && !userData.offices.some((o) => o.toString() === pid.toString())) {
            userData.offices = [...(userData.offices || []), pid];
          }
        }
      }

      // VoIP: omit null/empty — unique index + null caused E11000 duplicate key for many users
      if (userData.voip_extension !== undefined) {
        const ext =
          typeof userData.voip_extension === 'string'
            ? userData.voip_extension.trim()
            : userData.voip_extension;
        if (ext == null || ext === '') {
          delete userData.voip_extension;
          delete userData.voip_password;
        } else {
          userData.voip_extension = ext;
        }
      }

      // Create new user
      const newUser = new User(userData);
      const savedUser = await newUser.save();
      const userId = savedUser._id;

      // Sync Office.employees: add this user to each assigned office
      const officeIds = (userData.offices || []).map((id) => id.toString()).filter(Boolean);
      if (officeIds.length > 0) {
        await Office.updateMany(
          { _id: { $in: officeIds } },
          { $addToSet: { employees: userId } }
        );
      }

      // Sync Settings.assigned_users: add this user to each assigned mail server
      const mailServerIds = (userData.mail_servers || []).map((id) => id.toString()).filter(Boolean);
      if (mailServerIds.length > 0) {
        await Settings.updateMany(
          { _id: { $in: mailServerIds }, type: 'mailservers' },
          { $addToSet: { assigned_users: userId } }
        );
      }

      // Populate image_id, offices, and mail_servers, then return user without password
      await savedUser.populate(['image_id', 'offices', 'primary_office', 'mail_servers']);
      const userObject = savedUser.toObject();
      delete userObject.password;

      // Emit event for activity logging
      eventEmitter.emit(EVENT_TYPES.USER.CREATED, {
        user: userObject,
        creator: userData.createdBy || { _id: 'system' },
      });

      return userObject;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(userId, updateData, requestingUser) {
    try {
      // Validate role if provided
      // if (updateData.role && !Object.values(ROLES).includes(updateData.role)) {
      //   throw new Error(`Invalid role. Role must be one of: ${Object.values(ROLES).join(', ')}`);
      // }

      // Get current user
      const user = await this.getUserById(userId);

      // Only admin can change roles
      if (requestingUser.role !== ROLES.ADMIN && updateData.role && updateData.role !== user.role) {
        throw new Error('Only administrators can change user roles');
      }

      // Handle password updates through a separate method
      // Don't allow password updates through this endpoint
      if (updateData.password) {
        console.warn(
          'Password update attempted through updateUser. This should use the changePassword endpoint instead.'
        );
        delete updateData.password;
      }

      // Encrypt passwords in other_platform_credentials if provided
      if (updateData.other_platform_credentials) {
        updateData.other_platform_credentials = encryptPlatformCredentials(
          updateData.other_platform_credentials
        );
      }

      // Convert image_id from string to ObjectId if provided
      if (updateData.image_id && typeof updateData.image_id === 'string') {
        if (mongoose.Types.ObjectId.isValid(updateData.image_id)) {
          updateData.image_id = new mongoose.Types.ObjectId(updateData.image_id);
        } else {
          throw new Error('Invalid image_id format. Must be a valid ObjectId.');
        }
      }

      // Normalize mail_servers: array of IDs (strings or ObjectIds)
      if (updateData.mail_servers !== undefined) {
        const rawMailServers = Array.isArray(updateData.mail_servers) ? updateData.mail_servers : [];
        updateData.mail_servers = rawMailServers
          .filter((id) => id != null && mongoose.Types.ObjectId.isValid(id))
          .map((id) => (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id));
      }

      // Normalize offices: array of IDs (strings or ObjectIds) for user office assignment
      if (updateData.offices !== undefined) {
        const raw = Array.isArray(updateData.offices) ? updateData.offices : [];
        updateData.offices = raw
          .filter((id) => id != null && mongoose.Types.ObjectId.isValid(id))
          .map((id) => (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id));
      }

      // Normalize primary_office and ensure it exists in offices
      if (updateData.primary_office !== undefined && updateData.primary_office != null) {
        const pid =
          typeof updateData.primary_office === 'string'
            ? new mongoose.Types.ObjectId(updateData.primary_office)
            : updateData.primary_office;
        if (mongoose.Types.ObjectId.isValid(pid)) {
          updateData.primary_office = pid;
          if (Array.isArray(updateData.offices)) {
            if (!updateData.offices.some((o) => o.toString() === pid.toString())) {
              updateData.offices = [...updateData.offices, pid];
            }
          } else {
            // Only primary_office sent: add it to existing offices so invariant holds
            const existing = (user.offices || []).map((o) => (o && (o._id || o)) || o);
            const existingIds = existing.map((id) => (id && id.toString && id.toString()) || String(id));
            if (!existingIds.includes(pid.toString())) {
              const existingObjectIds = existing.map((id) =>
                typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
              );
              updateData.offices = [...existingObjectIds.filter(Boolean), pid];
            }
          }
        }
      }

      // VoIP: use $unset when clearing — setting null duplicates under legacy unique indexes
      const voipUnset = {};
      if (Object.prototype.hasOwnProperty.call(updateData, 'voip_extension')) {
        const raw = updateData.voip_extension;
        const ext = typeof raw === 'string' ? raw.trim() : raw;
        if (ext == null || ext === '') {
          voipUnset.voip_extension = '';
          voipUnset.voip_password = '';
          delete updateData.voip_extension;
          delete updateData.voip_password;
        } else {
          updateData.voip_extension = ext;
        }
      }

      let mongoUpdate = updateData;
      if (Object.keys(voipUnset).length > 0) {
        mongoUpdate =
          Object.keys(updateData).length > 0
            ? { $set: updateData, $unset: voipUnset }
            : { $unset: voipUnset };
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(userId, mongoUpdate, {
        new: true,
      })
        .select('-password')
        .populate('image_id') // Populate image document
        .populate('offices') // Populate office refs
        .populate('primary_office')
        .populate('mail_servers'); // Populate mail server refs

      if (!updatedUser) {
        throw new Error('User not found');
      }

      // Sync Office.employees: add this user to new offices, remove from offices no longer assigned
      const previousOfficeIds = (user.offices || [])
        .map((o) => {
          const id = o && (o._id || o);
          return id ? id.toString() : null;
        })
        .filter(Boolean);
      const newOfficeIds = (updateData.offices || []).map((id) => id.toString());
      const toAdd = newOfficeIds.filter((id) => !previousOfficeIds.includes(id));
      const toRemove = previousOfficeIds.filter((id) => !newOfficeIds.includes(id));
      if (toRemove.length > 0) {
        await Office.updateMany(
          { _id: { $in: toRemove } },
          { $pull: { employees: userId } }
        );
      }
      if (toAdd.length > 0) {
        await Office.updateMany(
          { _id: { $in: toAdd } },
          { $addToSet: { employees: userId } }
        );
      }

      // Sync Settings.assigned_users: add this user to new mail servers, remove from old ones
      if (updateData.mail_servers !== undefined) {
        const previousMailServerIds = (user.mail_servers || [])
          .map((ms) => {
            const id = ms && (ms._id || ms);
            return id ? id.toString() : null;
          })
          .filter(Boolean);
        const newMailServerIds = (updateData.mail_servers || []).map((id) => id.toString());
        const msToAdd = newMailServerIds.filter((id) => !previousMailServerIds.includes(id));
        const msToRemove = previousMailServerIds.filter((id) => !newMailServerIds.includes(id));
        if (msToRemove.length > 0) {
          await Settings.updateMany(
            { _id: { $in: msToRemove }, type: 'mailservers' },
            { $pull: { assigned_users: new mongoose.Types.ObjectId(userId) } }
          );
        }
        if (msToAdd.length > 0) {
          await Settings.updateMany(
            { _id: { $in: msToAdd }, type: 'mailservers' },
            { $addToSet: { assigned_users: new mongoose.Types.ObjectId(userId) } }
          );
        }
      }

      // Emit event for activity logging
      eventEmitter.emit(EVENT_TYPES.USER.UPDATED, {
        user: updatedUser,
        creator: requestingUser,
        changes: updateData,
      });

      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Soft delete user by setting active=false
   * @param {string} userId - The ID of the user to soft delete
   */
  async deleteUser(userId, requestingUser) {
    try {
      // Get user data before update for activity logging
      const user = await User.findById(userId).lean();

      if (!user) {
        throw new Error('User not found');
      }

      const result = await User.findByIdAndUpdate(userId, { active: false }, { new: true });

      // Emit event for activity logging
      eventEmitter.emit(EVENT_TYPES.USER.DELETED, {
        user: result,
        creator: requestingUser || { _id: 'system' },
      });

      return {
        message: 'User deactivated successfully',
        user: {
          _id: result._id,
          login: result.login,
          active: result.active,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Restore a previously soft-deleted user
   * @param {string} userId - The ID of the user to restore
   */
  async restoreUser(userId) {
    try {
      const result = await User.findByIdAndUpdate(userId, { active: true }, { new: true });

      if (!result) {
        throw new Error('User not found');
      }

      return {
        message: 'User restored successfully',
        user: {
          _id: result._id,
          login: result.login,
          active: result.active,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk soft delete users
   * @param {Array} ids - Array of user IDs
   * @param {Object} requestingUser - User performing the deletion
   * @returns {Object} Result with success and failure counts
   */
  async bulkDeleteUsers(ids, requestingUser) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('IDs must be a non-empty array');
      }

      // Validate all IDs are valid MongoDB ObjectIds
      const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length !== ids.length) {
        throw new Error('All IDs must be valid MongoDB ObjectIds');
      }

      const results = {
        successful: [],
        failed: [],
        totalProcessed: 0,
        successCount: 0,
        failureCount: 0,
      };

      // Find all users that exist and are active
      const users = await User.find({
        _id: { $in: validIds },
        active: true,
      });

      // Track which users were found
      const foundIds = users.map(user => user._id.toString());
      const notFoundIds = validIds.filter(id => !foundIds.includes(id));

      // Add not found IDs to failed results
      notFoundIds.forEach(id => {
        results.failed.push({
          id,
          error: 'User not found or already inactive',
        });
      });

      // Process each found user
      for (const user of users) {
        try {
          // Prevent self-deletion
          if (user._id.toString() === requestingUser._id.toString()) {
            results.failed.push({
              id: user._id.toString(),
              error: 'Cannot delete your own account',
            });
            continue;
          }

          // Store user data before deletion for activity logging
          const userData = user.toObject();

          // Soft delete the user
          user.active = false;
          await user.save({ validateBeforeSave: false });
          results.successful.push({
            _id: user._id,
            login: user.login,
            role: user.role,
            active: user.active,
          });

          // Emit event for individual user deletion activity logging
          eventEmitter.emit(EVENT_TYPES.USER.DELETED, {
            user: userData,
            creator: requestingUser,
            bulkDelete: true,
          });

        } catch (error) {
          results.failed.push({
            id: user._id.toString(),
            error: error.message,
          });

          console.error('Failed to delete user in bulk operation', {
            userId: user._id,
            error: error.message,
          });
        }
      }

      // Update counters
      results.totalProcessed = validIds.length;
      results.successCount = results.successful.length;
      results.failureCount = results.failed.length;

      // Emit bulk delete event for activity logging
      if (results.successCount > 0) {
        eventEmitter.emit(EVENT_TYPES.USER.BULK_DELETED, {
          userIds: validIds,
          successCount: results.successCount,
          failureCount: results.failureCount,
          user: requestingUser,
        });
      }

      // Build response message
      let message = `Bulk delete completed. ${results.successCount} users deactivated, ${results.failureCount} failed.`;

      return {
        message,
        results,
      };
    } catch (error) {
      console.error('Error in bulk delete users:', error);
      throw new DatabaseError(`Error in bulk delete users: ${error.message}`);
    }
  }

  /**
   * Add or update bot credential for a user
   */
  async addBotCredential(userId, credentialData) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      const { platform_type, platform_name, chat_id, bot_enabled } = credentialData;

      // Remove existing credential for same platform if exists
      user.other_platform_credentials = user.other_platform_credentials.filter(
        (cred) => cred.platform_type !== platform_type
      );

      // Add new credential
      user.other_platform_credentials.push({
        platform_type,
        platform_name,
        chat_id,
        bot_enabled: bot_enabled !== undefined ? bot_enabled : true,
        linked_at: new Date(),
      });

      await user.save({ validateModifiedOnly: true });

      return {
        success: true,
        message: 'Bot credential added successfully',
        user,
      };
    } catch (error) {
      console.error('Error adding bot credential:', error);
      throw error;
    }
  }

  /**
   * Update bot credential (enable/disable notifications)
   */
  async updateBotCredential(userId, credentialId, updates) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      const credential = user.other_platform_credentials.id(credentialId);

      if (!credential) {
        throw new Error('Credential not found');
      }

      // Update only allowed fields
      if (updates.bot_enabled !== undefined) {
        credential.bot_enabled = updates.bot_enabled;
      }

      await user.save({ validateModifiedOnly: true });

      return {
        success: true,
        message: 'Bot credential updated successfully',
        credential,
      };
    } catch (error) {
      console.error('Error updating bot credential:', error);
      throw error;
    }
  }

  /**
   * Remove bot credential
   */
  async removeBotCredential(userId, credentialId) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      user.other_platform_credentials = user.other_platform_credentials.filter(
        (cred) => cred._id.toString() !== credentialId
      );

      await user.save({ validateModifiedOnly: true });

      return {
        success: true,
        message: 'Bot credential removed successfully',
      };
    } catch (error) {
      console.error('Error removing bot credential:', error);
      throw error;
    }
  }

  /**
   * Link Telegram account via bot /start command
   */
  async linkTelegramAccount(identifier, password, chat_id, identifierType = 'email', bot_id = null) {
    try {
      const User = mongoose.model('User');
      let user = null;
      let lookupField = '';

      // Find user based on identifier type
      switch (identifierType) {
        case 'login':
          // Search by system login name
          user = await User.findOne({ login: identifier, active: true });
          lookupField = identifier;
          break;
        case 'email':
          user = await User.findOne({ email: identifier.toLowerCase() });
          lookupField = identifier;
          break;
        case 'username':
          // Search in other_platform_credentials for telegram_username
          user = await User.findOne({
            'other_platform_credentials.platform_type': 'telegram',
            'other_platform_credentials.userEmail': identifier,
          });
          lookupField = `@${identifier}`;
          break;
        case 'phone':
          // Normalize phone number (remove spaces, dashes, etc.)
          const normalizedPhone = identifier.replace(/[\s\-\(\)]/g, '');
          // Search in other_platform_credentials for telegram_phone
          user = await User.findOne({
            'other_platform_credentials': {
              $elemMatch: {
                platform_type: 'telegram',
                userEmail: normalizedPhone,
              },
            },
          });
          lookupField = identifier;
          break;
        default:
          throw new Error('Invalid identifier type');
      }

      if (!user) {
        throw new Error('User not found');
      }

      // Verify password if provided
      if (password) {
        const { verifyPassword } = require('../auth/services/passwordService');

        // Check if user has a password field
        if (!user.password) {
          throw new Error('User account does not have a password set. Please contact administrator.');
        }

        const isPasswordValid = await verifyPassword(password, user.password);
        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }
      }

      // Get the telegram credential data from the user's existing credentials
      const existingCred = user.other_platform_credentials.find(
        (cred) => cred.platform_type === 'telegram'
      );

      // Remove existing Telegram credential
      user.other_platform_credentials = user.other_platform_credentials.filter(
        (cred) => cred.platform_type !== 'telegram'
      );

      // Add new Telegram credential with additional info
      user.other_platform_credentials.push({
        platform_type: 'telegram',
        platform_name: 'Telegram',
        chat_id: String(chat_id),
        userName: identifierType === 'login' ? identifier : (existingCred?.userName || null),
        userEmail: existingCred?.userEmail || (identifierType === 'email' ? identifier.toLowerCase() : null),
        telegram_username: identifierType === 'username' ? identifier.replace('@', '') : null,
        telegram_phone: identifierType === 'phone' ? identifier.replace(/[\s\-\(\)]/g, '') : null,
        bot_enabled: true,
        linked_at: new Date(),
        bot_id: bot_id,
      });

      await user.save({ validateModifiedOnly: true });

      // Update bot statistics
      if (bot_id) {
        const telegramBotService = require('./telegramBotService');
        await telegramBotService.updateBotStats(bot_id, {
          user_linked: true,
          last_used: true,
        });
      }

      return {
        success: true,
        message: 'Telegram account linked successfully',
        user: {
          name: user.info?.name || user.login,
          email: user.info?.email,
          login: user.login,
          lookupField,
        },
      };
    } catch (error) {
      console.error('Error linking Telegram account:', error);
      throw error;
    }
  }

  /**
   * Unlink Telegram account via bot /stop command
   */
  async unlinkTelegramAccount(chat_id) {
    try {
      const User = mongoose.model('User');
      const user = await User.findOne({
        'other_platform_credentials.chat_id': String(chat_id),
        'other_platform_credentials.platform_type': 'telegram',
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get the bot_id from the credential before removing it
      const telegramCred = user.other_platform_credentials.find(
        (cred) => cred.platform_type === 'telegram' && cred.chat_id === String(chat_id)
      );
      const bot_id = telegramCred?.bot_id;

      // Remove Telegram credential
      user.other_platform_credentials = user.other_platform_credentials.filter(
        (cred) => !(cred.platform_type === 'telegram' && cred.chat_id === String(chat_id))
      );

      await user.save({ validateModifiedOnly: true });

      // Update bot statistics (decrement user linked count)
      if (bot_id) {
        const telegramBotService = require('./telegramBotService');
        await telegramBotService.updateBotStats(bot_id, {
          user_linked: -1, // Decrement counter
        });
      }

      return {
        success: true,
        message: 'Telegram account unlinked successfully',
      };
    } catch (error) {
      console.error('Error unlinking Telegram account:', error);
      throw error;
    }
  }

  /**
   * Get users with bot notifications enabled
   */
  async getUsersWithBotNotifications({ role, platform_type }) {
    try {
      const User = mongoose.model('User');

      const query = {
        active: true,
        'other_platform_credentials.bot_enabled': true,
      };

      if (role) {
        query.role = role;
      }

      if (platform_type) {
        query['other_platform_credentials.platform_type'] = platform_type;
      }

      const users = await User.find(query)
        .select('name email role other_platform_credentials')
        .lean();

      // Filter to only include users with the specified platform type
      const filteredUsers = users
        .map((user) => ({
          ...user,
          other_platform_credentials: user.other_platform_credentials.filter(
            (cred) =>
              platform_type ? cred.platform_type === platform_type : cred.bot_enabled
          ),
        }))
        .filter((user) => user.other_platform_credentials.length > 0);

      return {
        success: true,
        data: filteredUsers,
        count: filteredUsers.length,
      };
    } catch (error) {
      console.error('Error getting users with bot notifications:', error);
      throw error;
    }
  }
}

// Create instance of service
const userService = new UserService();

// Export all methods
module.exports = userService;

