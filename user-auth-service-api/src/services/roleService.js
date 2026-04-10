/**
 * Role Service
 * Handles all role-related business logic
 */

const Role = require('../models/Role')
const { Permission } = require('../models/Permission')
const { AuditLog, AUDIT_ACTIONS } = require('../models/AuditLog')
const { ROLE_PERMISSIONS } = require('../auth/roles/rolePermissions')
const { PERMISSIONS } = require('../auth/roles/permissions')
const { clearPermissionsCache } = require('../auth/middleware/authorize')
const {
  setCache,
  deleteCache,
  deleteCachePattern,
  REDIS_KEYS,
} = require('../config/redis')
const permissionService = require('./permissionService')
const logger = require('../utils/logger')
const { ValidationError } = require('../utils/errorHandler')

// Default role permissions (fallback)
const DEFAULT_ROLE_PERMISSIONS = ROLE_PERMISSIONS

// Permission templates for quick role creation
const PERMISSION_TEMPLATES = {
  FULL_ADMIN: {
    name: 'Full Admin',
    description: 'All permissions - full system access',
    permissions: Object.values(PERMISSIONS),
  },
  SALES_AGENT: {
    name: 'Sales Agent',
    description: 'Lead and offer management for sales team',
    permissions: ROLE_PERMISSIONS['Agent'] || [],
  },
  MANAGER: {
    name: 'Manager',
    description: 'Read all with limited update capabilities',
    permissions: ROLE_PERMISSIONS['Manager'] || [],
  },
  READ_ONLY: {
    name: 'Read Only',
    description: 'View only access to all resources',
    permissions: [
      PERMISSIONS.USER_READ,
      PERMISSIONS.PROJECT_READ,
      PERMISSIONS.LEAD_READ_ASSIGNED,
      PERMISSIONS.OFFER_READ_OWN,
      PERMISSIONS.OPENING_READ,
      PERMISSIONS.CONFIRMATION_READ,
      PERMISSIONS.PAYMENT_VOUCHER_READ,
      PERMISSIONS.SETTINGS_READ,
      PERMISSIONS.BANK_READ_ALL,
      PERMISSIONS.ACTIVITY_READ_OWN,
      PERMISSIONS.NOTIFICATION_READ_OWN,
      PERMISSIONS.EMAIL_READ_OWN,
    ],
  },
  CUSTOM: {
    name: 'Custom',
    description: 'Start from scratch',
    permissions: [],
  },
}

// Simple in-memory cache for roles
const roleCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const cacheRole = async (role) => {
  roleCache.set(role.name, { role, timestamp: Date.now() })
}

const getCachedRoleByName = async (name) => {
  const cached = roleCache.get(name)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.role
  }
  return null
}

const invalidateRoleCache = async (roleName) => {
  // Clear in-memory cache for this role
  roleCache.delete(roleName)

  // Clear only this specific role's cache from Redis (not all roles)
  if (roleName) {
    await deleteCache(REDIS_KEYS.ROLE_PERMISSIONS + roleName)
    await deleteCache(REDIS_KEYS.ROLE_BY_NAME + roleName)
    await deleteCache(REDIS_KEYS.ROLE + roleName)

    // Also clear ALL user-specific caches to ensure they pick up the role change
    // User-specific caches store merged role + user override permissions
    await deleteCachePattern('rbac:user-permissions:*')
  }
}

const clearAllRbacCache = async () => {
  roleCache.clear()
  if (clearPermissionsCache) await clearPermissionsCache()
}

const cacheRolePermissions = async (roleName, permissions) => {
  // Cache role permissions in Redis
  if (roleName && permissions) {
    await setCache(REDIS_KEYS.ROLE_PERMISSIONS + roleName, permissions)
  }
}

/**
 * Calculate child permissions from source permissions and include/exclude overrides
 * Formula: (sourcePermissions + includePermissions) - excludePermissions
 * @param {string[]} sourcePermissions - Permissions from source role
 * @param {string[]} includePermissions - Permissions to add beyond source
 * @param {string[]} excludePermissions - Permissions to remove from source
 * @returns {string[]} - Final calculated permissions
 */
const calculateChildPermissions = (
  sourcePermissions,
  includePermissions,
  excludePermissions
) => {
  const permSet = new Set(sourcePermissions.map((p) => p.toLowerCase()))

  // Add includePermissions
  for (const perm of includePermissions || []) {
    permSet.add(perm.toLowerCase())
  }

  // Remove excludePermissions
  for (const perm of excludePermissions || []) {
    permSet.delete(perm.toLowerCase())
  }

  return Array.from(permSet)
}

/**
 * Propagate permission changes from a source role to all its descendants
 * This runs asynchronously after a role's permissions are updated
 * @param {Object} sourceRole - The role whose permissions were updated
 * @param {string} userId - User performing the operation
 */
const propagatePermissionsToDescendants = async (sourceRole, userId) => {
  try {
    const children = await Role.findChildren(sourceRole._id)

    for (const child of children) {
      // Calculate new permissions for child based on source + include - exclude
      const newPermissions = calculateChildPermissions(
        sourceRole.permissions,
        child.includePermissions || [],
        child.excludePermissions || []
      )

      // Only update if permissions actually changed
      const currentSorted = [...child.permissions].sort().join(',')
      const newSorted = [...newPermissions].sort().join(',')

      if (currentSorted !== newSorted) {
        child.permissions = newPermissions
        child.modifiedBy = userId
        await child.save()

        // Update Redis with final permissions (existing key structure)
        await invalidateRoleCache(child.name)
        await cacheRolePermissions(child.name, child.permissions)

        logger.info(`Propagated permissions to child role: ${child.name}`, {
          roleId: child._id,
          sourceRoleId: sourceRole._id,
          sourceRoleName: sourceRole.name,
          permissionsCount: newPermissions.length,
        })

        // Recursively propagate to grandchildren
        await propagatePermissionsToDescendants(child, userId)
      }
    }
  } catch (error) {
    logger.error('Error propagating permissions to descendants', {
      sourceRoleId: sourceRole._id,
      sourceRoleName: sourceRole.name,
      error: error.message,
    })
    throw error
  }
}

/**
 * Get all roles
 */
const getAllRoles = async (options = {}) => {
  const { includeInactive = false, page = 1, limit = 50 } = options

  const query = includeInactive ? {} : { active: true }
  const skip = (page - 1) * limit

  const [roles, total] = await Promise.all([
    Role.find(query)
      .sort({ isSystem: -1, hierarchyLevel: 1, name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Role.countDocuments(query),
  ])

  return {
    roles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Get role by ID
 */
const getRoleById = async (id) => {
  const role = await Role.findById(id).lean()
  if (!role) {
    throw new Error('Role not found')
  }
  return role
}

/**
 * Get role by name
 */
const getRoleByName = async (name) => {
  // Check cache first
  const cached = await getCachedRoleByName(name)
  if (cached) return cached

  const role = await Role.findOne({ name, active: true }).lean()
  if (role) {
    await cacheRole(role)
  }
  return role
}

/**
 * Create a new role
 */
const createRole = async (roleData, userId) => {
  const {
    name,
    displayName,
    description,
    color,
    icon,
    permissions,
    parentRole,
    templateId,
  } = roleData

  // Check if name exists
  const exists = await Role.nameExists(name)
  if (exists) {
    throw new Error(`Role with name "${name}" already exists`)
  }

  // Create role
  const role = new Role({
    name,
    displayName: displayName || name,
    description,
    color,
    icon,
    permissions: permissions || [],
    parentRole,
    templateId,
    isSystem: false,
    active: true,
    createdBy: userId,
    modifiedBy: userId,
  })

  await role.save()

  // Cache the role permissions
  await cacheRolePermissions(role.name, role.permissions)

  // Audit log
  await AuditLog.log({
    action: AUDIT_ACTIONS.ROLE_CREATED,
    entityType: 'role',
    entityId: role._id.toString(),
    entityName: role.name,
    performedBy: userId,
    newState: role.toObject(),
  })

  logger.info(`Role created: ${role.name}`, {
    roleId: role._id,
    createdBy: userId,
  })

  return role.toObject()
}

/**
 * Create role from template
 */
const createRoleFromTemplate = async (
  templateKey,
  name,
  displayName,
  userId
) => {
  const template = PERMISSION_TEMPLATES[templateKey]
  if (!template) {
    throw new Error(`Template "${templateKey}" not found`)
  }

  return createRole(
    {
      name,
      displayName: displayName || name,
      description: template.description,
      permissions: template.permissions,
      templateId: templateKey,
    },
    userId
  )
}

/**
 * Update role
 */
const updateRole = async (id, updateData, userId) => {
  const role = await Role.findById(id)
  if (!role) {
    throw new Error('Role not found')
  }

  // Store previous state for audit
  const previousState = role.toObject()

  // Check if trying to rename to existing name
  if (updateData.name && updateData.name !== role.name) {
    const exists = await Role.nameExists(updateData.name, id)
    if (exists) {
      throw new Error(`Role with name "${updateData.name}" already exists`)
    }
  }

  // Prevent modifying system role name
  if (role.isSystem && updateData.name && updateData.name !== role.name) {
    throw new Error('Cannot rename system roles')
  }

  // Track changes
  const changes = []
  const allowedFields = [
    'name',
    'displayName',
    'description',
    'color',
    'icon',
    'permissions',
    'parentRole',
    'hierarchyLevel',
  ]

  for (const field of allowedFields) {
    if (
      updateData[field] !== undefined &&
      JSON.stringify(updateData[field]) !== JSON.stringify(role[field])
    ) {
      changes.push({
        field,
        oldValue: role[field],
        newValue: updateData[field],
      })
      role[field] = updateData[field]
    }
  }

  if (changes.length === 0) {
    return role.toObject()
  }

  role.modifiedBy = userId
  await role.save()

  // Invalidate cache
  await invalidateRoleCache(previousState.name)
  if (updateData.name && updateData.name !== previousState.name) {
    await invalidateRoleCache(updateData.name)
  }

  // Re-cache with new permissions
  await cacheRolePermissions(role.name, role.permissions)

  // Audit log
  await AuditLog.log({
    action: AUDIT_ACTIONS.ROLE_UPDATED,
    entityType: 'role',
    entityId: role._id.toString(),
    entityName: role.name,
    performedBy: userId,
    previousState,
    newState: role.toObject(),
    changes,
  })

  logger.info(`Role updated: ${role.name}`, {
    roleId: role._id,
    updatedBy: userId,
    changes: changes.length,
  })

  return role.toObject()
}

/**
 * Delete role (soft delete)
 * Prevents deletion if role has child roles
 */
const deleteRole = async (id, userId) => {
  const role = await Role.findById(id)
  if (!role) {
    throw new Error('Role not found')
  }

  if (role.isSystem) {
    throw new Error('Cannot delete system roles')
  }

  // Check if role has children - prevent deletion
  const children = await Role.findChildren(id)
  if (children && children.length > 0) {
    const childNames = children.map((c) => c.name || c.displayName).join(', ')
    throw new ValidationError(
      `Cannot delete role that has ${children.length} child role(s). Delete or reassign child roles first.`,
      {
        childRoles: children.map((c) => ({
          id: c._id.toString(),
          name: c.name,
          displayName: c.displayName,
        })),
      }
    )
  }

  // Store previous state
  const previousState = role.toObject()

  // Soft delete
  role.active = false
  role.modifiedBy = userId
  await role.save()

  // Invalidate cache
  await invalidateRoleCache(role.name)

  // Audit log
  await AuditLog.log({
    action: AUDIT_ACTIONS.ROLE_DELETED,
    entityType: 'role',
    entityId: role._id.toString(),
    entityName: role.name,
    performedBy: userId,
    previousState,
  })

  logger.info(`Role deleted: ${role.name}`, {
    roleId: role._id,
    deletedBy: userId,
  })

  return { success: true, message: `Role "${role.name}" has been deleted` }
}

/**
 * Clone role
 * Creates a new role linked to the source role for permission propagation
 */
const cloneRole = async (id, newName, userId) => {
  const sourceRole = await Role.findById(id)
  if (!sourceRole) {
    throw new Error('Source role not found')
  }

  // Generate unique name if not provided
  const cloneName = newName || `${sourceRole.name}_copy`

  // Check if name exists
  let finalName = cloneName
  let counter = 1
  while (await Role.nameExists(finalName)) {
    finalName = `${cloneName}_${counter}`
    counter++
  }

  // Create cloned role with link to source for permission propagation
  const clonedRole = new Role({
    name: finalName,
    displayName: `${sourceRole.displayName} (Copy)`,
    description: sourceRole.description,
    color: sourceRole.color,
    icon: sourceRole.icon,
    permissions: [...sourceRole.permissions], // Copy current permissions
    sourceRole: sourceRole._id, // Link to source for propagation
    includePermissions: [], // Empty initially
    excludePermissions: [], // Empty initially
    parentRole: sourceRole.parentRole,
    hierarchyLevel: sourceRole.hierarchyLevel,
    isSystem: false,
    active: true,
    createdBy: userId,
    modifiedBy: userId,
  })

  await clonedRole.save()

  // Cache the role permissions
  await cacheRolePermissions(clonedRole.name, clonedRole.permissions)

  // Audit log
  await AuditLog.log({
    action: AUDIT_ACTIONS.ROLE_CLONED,
    entityType: 'role',
    entityId: clonedRole._id.toString(),
    entityName: clonedRole.name,
    performedBy: userId,
    newState: clonedRole.toObject(),
    metadata: {
      sourceRoleId: sourceRole._id.toString(),
      sourceRoleName: sourceRole.name,
    },
  })

  logger.info(`Role cloned: ${sourceRole.name} -> ${clonedRole.name}`, {
    sourceRoleId: sourceRole._id,
    newRoleId: clonedRole._id,
    clonedBy: userId,
  })

  return clonedRole.toObject()
}

/**
 * Update role permissions
 * Also triggers async propagation to all descendant roles
 */
const updateRolePermissions = async (id, permissions, userId) => {
  const role = await Role.findById(id)
  if (!role) {
    throw new Error('Role not found')
  }

  const previousPermissions = [...role.permissions]

  // Normalize permissions to lowercase
  role.permissions = permissions.map((p) => p.toLowerCase())
  role.modifiedBy = userId
  await role.save()

  // Invalidate and re-cache
  await invalidateRoleCache(role.name)
  await cacheRolePermissions(role.name, role.permissions)

  // Calculate added and removed permissions
  const added = role.permissions.filter((p) => !previousPermissions.includes(p))
  const removed = previousPermissions.filter(
    (p) => !role.permissions.includes(p)
  )

  // Audit log
  await AuditLog.log({
    action: AUDIT_ACTIONS.ROLE_UPDATED,
    entityType: 'role',
    entityId: role._id.toString(),
    entityName: role.name,
    performedBy: userId,
    changes: [
      {
        field: 'permissions',
        oldValue: previousPermissions,
        newValue: role.permissions,
      },
    ],
    metadata: { added, removed },
  })

  logger.info(`Role permissions updated: ${role.name}`, {
    roleId: role._id,
    added: added.length,
    removed: removed.length,
    updatedBy: userId,
  })

  // Trigger async propagation to all descendants
  setImmediate(async () => {
    try {
      await propagatePermissionsToDescendants(role, userId)
      logger.info('Permission propagation completed', {
        roleId: role._id,
        roleName: role.name,
      })
    } catch (error) {
      logger.error('Permission propagation failed', {
        roleId: role._id,
        error: error.message,
      })
    }
  })

  return role.toObject()
}

/**
 * Bulk add permissions to role
 */
const bulkAddPermissions = async (id, permissionsToAdd, userId) => {
  const role = await Role.findById(id)
  if (!role) {
    throw new Error('Role not found')
  }

  const normalizedNew = permissionsToAdd.map((p) => p.toLowerCase())
  const existingSet = new Set(role.permissions)
  const added = normalizedNew.filter((p) => !existingSet.has(p))

  if (added.length === 0) {
    return role.toObject()
  }

  role.permissions = [...role.permissions, ...added]
  role.modifiedBy = userId
  await role.save()

  // Invalidate and re-cache
  await invalidateRoleCache(role.name)
  await cacheRolePermissions(role.name, role.permissions)

  // Audit log
  await AuditLog.log({
    action: AUDIT_ACTIONS.PERMISSION_BULK_ADDED,
    entityType: 'role',
    entityId: role._id.toString(),
    entityName: role.name,
    performedBy: userId,
    metadata: { added },
  })

  return role.toObject()
}

/**
 * Bulk remove permissions from role
 */
const bulkRemovePermissions = async (id, permissionsToRemove, userId) => {
  const role = await Role.findById(id)
  if (!role) {
    throw new Error('Role not found')
  }

  const normalizedRemove = new Set(
    permissionsToRemove.map((p) => p.toLowerCase())
  )
  const removed = role.permissions.filter((p) => normalizedRemove.has(p))

  if (removed.length === 0) {
    return role.toObject()
  }

  role.permissions = role.permissions.filter((p) => !normalizedRemove.has(p))
  role.modifiedBy = userId
  await role.save()

  // Invalidate and re-cache
  await invalidateRoleCache(role.name)
  await cacheRolePermissions(role.name, role.permissions)

  // Audit log
  await AuditLog.log({
    action: AUDIT_ACTIONS.PERMISSION_BULK_REMOVED,
    entityType: 'role',
    entityId: role._id.toString(),
    entityName: role.name,
    performedBy: userId,
    metadata: { removed },
  })

  return role.toObject()
}

/**
 * Get all role permissions as a map (for caching)
 */
const getAllRolePermissionsMap = async () => {
  const roles = await Role.find({ active: true }).lean()
  const map = {}

  for (const role of roles) {
    map[role.name] = role.permissions
  }

  return map
}

/**
 * Refresh all role caches
 */
const refreshAllRoleCaches = async (userId) => {
  await clearAllRbacCache()

  const roles = await Role.find({ active: true }).lean()
  for (const role of roles) {
    await cacheRolePermissions(role.name, role.permissions)
    await cacheRole(role)
  }

  const permissionsCache = await permissionService.seedPermissionsv2(userId)

  if (permissionsCache.created > 0) {
    logger.info('Permissions cached successfully', {
      created: permissionsCache.created,
      existing: permissionsCache.existing,
      total: permissionsCache.total,
    })
  } else {
    logger.info('No permissions were created, skipping cache refresh', {
      created: permissionsCache.created,
      existing: permissionsCache.existing,
      total: permissionsCache.total,
    })
  }

  logger.info('All role caches refreshed', { rolesCount: roles.length })

  return { success: true, rolesRefreshed: roles.length }
}

/**
 * Update include permissions for a child role
 * These permissions are added on top of the source role's permissions
 * @param {string} id - Role ID
 * @param {string[]} permissions - Permissions to include
 * @param {string} userId - User performing the operation
 */
const updateChildIncludePermissions = async (id, permissions, userId) => {
  const role = await Role.findById(id)
  if (!role) {
    throw new Error('Role not found')
  }

  if (!role.sourceRole) {
    throw new Error(
      'Role is not a child role (no source role). Use updateRolePermissions for standalone roles.'
    )
  }

  const previousInclude = [...(role.includePermissions || [])]
  role.includePermissions = permissions.map((p) => p.toLowerCase())

  // Recalculate final permissions based on source + include - exclude
  const sourceRole = await Role.findById(role.sourceRole)
  if (!sourceRole) {
    throw new Error('Source role not found')
  }

  const previousPermissions = [...role.permissions]
  role.permissions = calculateChildPermissions(
    sourceRole.permissions,
    role.includePermissions,
    role.excludePermissions || []
  )

  role.modifiedBy = userId
  await role.save()

  // Update Redis with final permissions
  await invalidateRoleCache(role.name)
  await cacheRolePermissions(role.name, role.permissions)

  // Audit log
  await AuditLog.log({
    action: AUDIT_ACTIONS.ROLE_UPDATED,
    entityType: 'role',
    entityId: role._id.toString(),
    entityName: role.name,
    performedBy: userId,
    changes: [
      {
        field: 'includePermissions',
        oldValue: previousInclude,
        newValue: role.includePermissions,
      },
      {
        field: 'permissions',
        oldValue: previousPermissions,
        newValue: role.permissions,
      },
    ],
  })

  logger.info(`Child role include permissions updated: ${role.name}`, {
    roleId: role._id,
    sourceRoleId: role.sourceRole,
    includeCount: role.includePermissions.length,
    updatedBy: userId,
  })

  // Propagate to any children of this role
  setImmediate(async () => {
    try {
      await propagatePermissionsToDescendants(role, userId)
    } catch (error) {
      logger.error('Permission propagation failed', {
        roleId: role._id,
        error: error.message,
      })
    }
  })

  return role.toObject()
}

/**
 * Update exclude permissions for a child role
 * These permissions are removed from the source role's permissions
 * @param {string} id - Role ID
 * @param {string[]} permissions - Permissions to exclude
 * @param {string} userId - User performing the operation
 */
const updateChildExcludePermissions = async (id, permissions, userId) => {
  const role = await Role.findById(id)
  if (!role) {
    throw new Error('Role not found')
  }

  if (!role.sourceRole) {
    throw new Error(
      'Role is not a child role (no source role). Use updateRolePermissions for standalone roles.'
    )
  }

  const previousExclude = [...(role.excludePermissions || [])]
  role.excludePermissions = permissions.map((p) => p.toLowerCase())

  // Recalculate final permissions based on source + include - exclude
  const sourceRole = await Role.findById(role.sourceRole)
  if (!sourceRole) {
    throw new Error('Source role not found')
  }

  const previousPermissions = [...role.permissions]
  role.permissions = calculateChildPermissions(
    sourceRole.permissions,
    role.includePermissions || [],
    role.excludePermissions
  )

  role.modifiedBy = userId
  await role.save()

  // Update Redis with final permissions
  await invalidateRoleCache(role.name)
  await cacheRolePermissions(role.name, role.permissions)

  // Audit log
  await AuditLog.log({
    action: AUDIT_ACTIONS.ROLE_UPDATED,
    entityType: 'role',
    entityId: role._id.toString(),
    entityName: role.name,
    performedBy: userId,
    changes: [
      {
        field: 'excludePermissions',
        oldValue: previousExclude,
        newValue: role.excludePermissions,
      },
      {
        field: 'permissions',
        oldValue: previousPermissions,
        newValue: role.permissions,
      },
    ],
  })

  logger.info(`Child role exclude permissions updated: ${role.name}`, {
    roleId: role._id,
    sourceRoleId: role.sourceRole,
    excludeCount: role.excludePermissions.length,
    updatedBy: userId,
  })

  // Propagate to any children of this role
  setImmediate(async () => {
    try {
      await propagatePermissionsToDescendants(role, userId)
    } catch (error) {
      logger.error('Permission propagation failed', {
        roleId: role._id,
        error: error.message,
      })
    }
  })

  return role.toObject()
}

/**
 * Force recalculate permissions for a child role from its source
 * Useful when source role's permissions have changed and need to sync
 * @param {string} id - Role ID
 * @param {string} userId - User performing the operation
 */
const recalculateFromSource = async (id, userId) => {
  const role = await Role.findById(id)
  if (!role) {
    throw new Error('Role not found')
  }

  if (!role.sourceRole) {
    throw new Error(
      'Role is not a child role (no source role). Cannot recalculate.'
    )
  }

  const sourceRole = await Role.findById(role.sourceRole)
  if (!sourceRole) {
    throw new Error('Source role not found')
  }

  const previousPermissions = [...role.permissions]
  role.permissions = calculateChildPermissions(
    sourceRole.permissions,
    role.includePermissions || [],
    role.excludePermissions || []
  )

  role.modifiedBy = userId
  await role.save()

  // Update Redis with final permissions
  await invalidateRoleCache(role.name)
  await cacheRolePermissions(role.name, role.permissions)

  // Audit log
  await AuditLog.log({
    action: AUDIT_ACTIONS.ROLE_UPDATED,
    entityType: 'role',
    entityId: role._id.toString(),
    entityName: role.name,
    performedBy: userId,
    changes: [
      {
        field: 'permissions',
        oldValue: previousPermissions,
        newValue: role.permissions,
      },
    ],
    metadata: {
      action: 'recalculate_from_source',
      sourceRoleId: sourceRole._id.toString(),
    },
  })

  logger.info(`Child role permissions recalculated from source: ${role.name}`, {
    roleId: role._id,
    sourceRoleId: role.sourceRole,
    sourceRoleName: sourceRole.name,
    permissionsCount: role.permissions.length,
    updatedBy: userId,
  })

  // Propagate to any children of this role
  setImmediate(async () => {
    try {
      await propagatePermissionsToDescendants(role, userId)
    } catch (error) {
      logger.error('Permission propagation failed', {
        roleId: role._id,
        error: error.message,
      })
    }
  })

  return role.toObject()
}

/**
 * Get all child roles of a given role
 * @param {string} id - Role ID
 * @returns {Promise<Array>} - Array of child roles
 */
const getChildRoles = async (id) => {
  const role = await Role.findById(id)
  if (!role) {
    throw new Error('Role not found')
  }

  const children = await Role.find({ sourceRole: id, active: true })
    .populate('sourceRole', 'name displayName')
    .lean()

  return children
}

module.exports = {
  getAllRoles,
  getRoleById,
  getRoleByName,
  createRole,
  createRoleFromTemplate,
  updateRole,
  deleteRole,
  cloneRole,
  updateRolePermissions,
  bulkAddPermissions,
  bulkRemovePermissions,
  getAllRolePermissionsMap,
  refreshAllRoleCaches,
  // Child role permission management
  updateChildIncludePermissions,
  updateChildExcludePermissions,
  recalculateFromSource,
  getChildRoles,
}
