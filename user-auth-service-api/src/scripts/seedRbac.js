/**
 * RBAC Seeding Script
 * Seeds permissions and default roles into the database
 * 
 * Usage: node src/scripts/seedRbac.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Permission, PERMISSION_GROUPS } = require('../models/Permission');
const Role = require('../models/Role');
const { AuditLog, AUDIT_ACTIONS } = require('../models/AuditLog');
const { PERMISSIONS } = require('../auth/roles/permissions');
const { ROLE_PERMISSIONS } = require('../auth/roles/rolePermissions');
const { PERMISSION_METADATA } = require('../services/permissionService');
const logger = require('../utils/logger');

// Default role permissions for seeding
const DEFAULT_ROLE_PERMISSIONS = ROLE_PERMISSIONS;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/leadpylot';

/**
 * Seed all permissions
 */
const seedPermissions = async () => {
  console.log('📝 Seeding permissions...');
  
  const existingPermissions = await Permission.find({}).lean();
  const existingKeys = new Set(existingPermissions.map(p => p.key));
  
  const permissionsToCreate = [];
  let order = 0;
  
  for (const [constName, permKey] of Object.entries(PERMISSIONS)) {
    const normalizedKey = permKey.toLowerCase();
    
    if (!existingKeys.has(normalizedKey)) {
      const metadata = PERMISSION_METADATA[permKey] || {};
      
      permissionsToCreate.push({
        key: normalizedKey,
        name: metadata.name || constName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: metadata.description || `Permission for ${constName.toLowerCase().replace(/_/g, ' ')}`,
        resource: metadata.resource || normalizedKey.split(':')[0],
        action: metadata.action || normalizedKey.split(':')[1] || 'access',
        scope: metadata.scope || null,
        group: metadata.group || 'Other',
        isSystem: true,
        active: true,
        displayOrder: order++,
      });
    }
  }
  
  if (permissionsToCreate.length > 0) {
    await Permission.insertMany(permissionsToCreate);
    console.log(`✅ Created ${permissionsToCreate.length} permissions`);
  } else {
    console.log('ℹ️  All permissions already exist');
  }
  
  return {
    created: permissionsToCreate.length,
    existing: existingKeys.size,
    total: existingKeys.size + permissionsToCreate.length,
  };
};

/**
 * Sync new permissions to existing roles based on ROLE_PERMISSIONS
 * @deprecated Use syncSystemRolePermissions() for full sync
 */
const syncPermissionsToRoles = async () => {
  console.log('🔄 Syncing permissions to existing roles...');
  
  const existingRoles = await Role.find({}).lean();
  let syncedCount = 0;
  let totalPermissionsAdded = 0;
  
  for (const role of existingRoles) {
    const expectedPermissions = DEFAULT_ROLE_PERMISSIONS[role.name] || [];
    if (expectedPermissions.length === 0) {
      continue; // Skip roles not in DEFAULT_ROLE_PERMISSIONS
    }
    
    const normalizedExpected = expectedPermissions.map(p => p.toLowerCase());
    const currentPermissions = new Set(role.permissions.map(p => p.toLowerCase()));
    const missingPermissions = normalizedExpected.filter(p => !currentPermissions.has(p));
    
    if (missingPermissions.length > 0) {
      const roleDoc = await Role.findOne({ name: role.name });
      if (roleDoc) {
        // Add missing permissions
        const updatedPermissions = [...new Set([...roleDoc.permissions, ...missingPermissions])];
        roleDoc.permissions = updatedPermissions.map(p => p.toLowerCase());
        await roleDoc.save();
        
        syncedCount++;
        totalPermissionsAdded += missingPermissions.length;
        console.log(`  ↻ Synced ${missingPermissions.length} new permission(s) to role: ${role.name}`);
      }
    }
  }
  
  if (syncedCount > 0) {
    console.log(`✅ Synced permissions to ${syncedCount} role(s), added ${totalPermissionsAdded} permission(s) total`);
  } else {
    console.log('ℹ️  All roles already have their expected permissions');
  }
  
  return { syncedCount, totalPermissionsAdded };
};

/**
 * Sync system roles' permissions to match ROLE_PERMISSIONS exactly
 * Only affects system roles (isSystem: true) to preserve custom roles
 * Performs full sync: adds missing permissions AND removes permissions not in ROLE_PERMISSIONS
 * 
 * @returns {Promise<Object>} Sync statistics
 */
const syncSystemRolePermissions = async () => {
  console.log('🔄 Syncing system role permissions to match ROLE_PERMISSIONS...');
  
  // Get all active permissions from database for validation
  const dbPermissions = await Permission.find({ active: true }).select('key').lean();
  const validPermissionKeys = new Set(dbPermissions.map(p => p.key.toLowerCase()));
  
  // Get all system roles
  const systemRoles = await Role.find({ isSystem: true, active: true }).lean();
  
  if (systemRoles.length === 0) {
    console.log('ℹ️  No system roles found to sync');
    return {
      syncedCount: 0,
      totalPermissionsAdded: 0,
      totalPermissionsRemoved: 0,
      rolesUpdated: [],
      warnings: [],
    };
  }
  
  let syncedCount = 0;
  let totalPermissionsAdded = 0;
  let totalPermissionsRemoved = 0;
  const rolesUpdated = [];
  const warnings = [];
  
  // Process each system role
  for (const role of systemRoles) {
    let normalizedExpected;
    
    // Admin role gets all permissions
    if (role.name === 'Admin') {
      const allPermissions = Object.values(PERMISSIONS).map(p => p.toLowerCase());
      normalizedExpected = allPermissions;
    } else {
      // Other roles get permissions from ROLE_PERMISSIONS
      const expectedPermissions = DEFAULT_ROLE_PERMISSIONS[role.name] || [];
      
      // Skip roles not defined in ROLE_PERMISSIONS
      if (expectedPermissions.length === 0) {
        continue;
      }
      
      // Normalize expected permissions
      normalizedExpected = expectedPermissions.map(p => p.toLowerCase());
    }
    
    // Validate permissions exist in DB
    const validExpected = normalizedExpected.filter(p => validPermissionKeys.has(p));
    const invalidPermissions = normalizedExpected.filter(p => !validPermissionKeys.has(p));
    
    if (invalidPermissions.length > 0) {
      warnings.push(`Role "${role.name}": ${invalidPermissions.length} expected permission(s) not found in DB: ${invalidPermissions.slice(0, 5).join(', ')}${invalidPermissions.length > 5 ? '...' : ''}`);
    }
    
    // Compare current vs expected
    const currentPermissions = new Set(role.permissions.map(p => p.toLowerCase()));
    const permissionsToAdd = validExpected.filter(p => !currentPermissions.has(p));
    const permissionsToRemove = Array.from(currentPermissions).filter(p => !validExpected.includes(p));
    
    // Only update if there are changes
    if (permissionsToAdd.length > 0 || permissionsToRemove.length > 0) {
      const roleDoc = await Role.findOne({ _id: role._id });
      if (roleDoc) {
        // Update to match expected exactly
        roleDoc.permissions = validExpected.map(p => p.toLowerCase());
        await roleDoc.save();
        
        syncedCount++;
        totalPermissionsAdded += permissionsToAdd.length;
        totalPermissionsRemoved += permissionsToRemove.length;
        rolesUpdated.push({
          roleName: role.name,
          added: permissionsToAdd.length,
          removed: permissionsToRemove.length,
        });
        
        logger.info(`Synced role "${role.name}": +${permissionsToAdd.length} -${permissionsToRemove.length} permissions`);
        console.log(`  ↻ Synced role "${role.name}": +${permissionsToAdd.length} added, -${permissionsToRemove.length} removed`);
      }
    }
  }
  
  // Log summary
  if (syncedCount > 0) {
    console.log(`✅ Synced ${syncedCount} system role(s): +${totalPermissionsAdded} added, -${totalPermissionsRemoved} removed`);
  } else {
    console.log('ℹ️  All system roles already have correct permissions');
  }
  
  // Log warnings if any
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  // Clear RBAC cache if roles were updated
  if (syncedCount > 0) {
    try {
      const { clearPermissionsCache } = require('../auth/middleware/authorize');
      if (clearPermissionsCache) {
        await clearPermissionsCache();
        console.log('  🗑️  Cleared RBAC cache');
      }
    } catch (cacheError) {
      logger.warn('Failed to clear RBAC cache after sync:', cacheError.message);
    }
  }
  
  return {
    syncedCount,
    totalPermissionsAdded,
    totalPermissionsRemoved,
    rolesUpdated,
    warnings,
  };
};

/**
 * Seed default roles
 * Creates system roles if they don't exist
 * Note: Permission syncing is handled by syncSystemRolePermissions()
 */
const seedRoles = async () => {
  console.log('📝 Seeding roles...');
  
  const defaultRoles = [
    {
      name: 'Admin',
      displayName: 'Administrator',
      description: 'Full system access with all permissions',
      color: '#ef4444',
      icon: 'shield',
      hierarchyLevel: 0,
      isSystem: true,
    },
    {
      name: 'Agent',
      displayName: 'Agent',
      description: 'Sales agent with limited access to assigned resources',
      color: '#3b82f6',
      icon: 'user',
      hierarchyLevel: 2,
      isSystem: true,
    },
    {
      name: 'Manager',
      displayName: 'Manager',
      description: 'Manager with read access to all resources and limited updates',
      color: '#8b5cf6',
      icon: 'users',
      hierarchyLevel: 1,
      isSystem: true,
    },
    {
      name: 'Banker',
      displayName: 'Banker',
      description: 'Bank partner with access to financial data',
      color: '#10b981',
      icon: 'building',
      hierarchyLevel: 1,
      isSystem: true,
    },
    {
      name: 'Client',
      displayName: 'Client',
      description: 'External client with limited read access',
      color: '#f59e0b',
      icon: 'briefcase',
      hierarchyLevel: 2,
      isSystem: true,
    },
    {
      name: 'Provider',
      displayName: 'Provider',
      description: 'Service provider with extended read access',
      color: '#06b6d4',
      icon: 'globe',
      hierarchyLevel: 1,
      isSystem: true,
    },
  ];
  
  const existingRoles = await Role.find({}).lean();
  const existingNames = new Set(existingRoles.map(r => r.name));
  
  let created = 0;
  let skipped = 0;
  
  // Get all active permissions for validation
  const dbPermissions = await Permission.find({ active: true }).select('key').lean();
  const validPermissionKeys = new Set(dbPermissions.map(p => p.key.toLowerCase()));
  
  for (const roleData of defaultRoles) {
    const expectedPermissions = DEFAULT_ROLE_PERMISSIONS[roleData.name] || [];
    
    // For Admin role, use all permissions
    const permissions = roleData.name === 'Admin' 
      ? Object.values(PERMISSIONS).map(p => p.toLowerCase())
      : expectedPermissions.map(p => p.toLowerCase());
    
    // Validate permissions exist in DB
    const validPermissions = permissions.filter(p => validPermissionKeys.has(p));
    
    if (existingNames.has(roleData.name)) {
      // Role already exists - skip creation (permissions will be synced by syncSystemRolePermissions)
      skipped++;
      console.log(`  ⊘ Role "${roleData.name}" already exists (permissions will be synced separately)`);
    } else {
      // Create new role with validated permissions
      const role = new Role({
        ...roleData,
        permissions: validPermissions,
        active: true,
      });
      await role.save();
      created++;
      console.log(`  ✓ Created role: ${roleData.name} with ${validPermissions.length} permission(s)`);
      
      // Log warning if some permissions were invalid
      if (validPermissions.length < permissions.length) {
        const invalidCount = permissions.length - validPermissions.length;
        logger.warn(`Role "${roleData.name}": ${invalidCount} permission(s) not found in DB during creation`);
      }
    }
  }
  
  console.log(`✅ Roles seeded: ${created} created, ${skipped} already exist`);
  
  return { created, skipped, total: defaultRoles.length };
};

/**
 * Create audit log for seeding
 */
const logSeeding = async (permissionStats, roleStats) => {
  await AuditLog.log({
    action: AUDIT_ACTIONS.PERMISSIONS_SEEDED,
    entityType: 'system',
    entityId: 'seed',
    entityName: 'RBAC Seed',
    metadata: {
      permissions: permissionStats,
      roles: roleStats,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Main seeding function
 */
const seedRbac = async () => {
  try {
    console.log('🚀 Starting RBAC seeding...\n');
    
    // Connect to database
    console.log(`📡 Connecting to MongoDB: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');
    
    // Seed permissions first
    const permissionStats = await seedPermissions();
    console.log('');
    
    // Then seed roles (creates new roles if missing)
    const roleStats = await seedRoles();
    console.log('');
    
    // Full sync of system role permissions to match ROLE_PERMISSIONS exactly
    const syncStats = await syncSystemRolePermissions();
    console.log('');
    
    // Create audit log
    await logSeeding(permissionStats, { ...roleStats, ...syncStats });
    
    console.log('🎉 RBAC seeding completed successfully!\n');
    console.log('Summary:');
    console.log(`  Permissions: ${permissionStats.created} created, ${permissionStats.existing} existing`);
    console.log(`  Roles: ${roleStats.created} created, ${roleStats.skipped} already exist`);
    if (syncStats.syncedCount > 0) {
      console.log(`  Permission Sync: ${syncStats.totalPermissionsAdded} added, ${syncStats.totalPermissionsRemoved} removed from ${syncStats.syncedCount} system role(s)`);
      if (syncStats.warnings && syncStats.warnings.length > 0) {
        console.log(`  Warnings: ${syncStats.warnings.length} permission validation warning(s)`);
      }
    }
    
    // Close connection
    await mongoose.connection.close();
    console.log('\n📡 Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedRbac();
}

module.exports = { 
  seedPermissions, 
  seedRoles, 
  seedRbac, 
  syncPermissionsToRoles,
  syncSystemRolePermissions,
};
