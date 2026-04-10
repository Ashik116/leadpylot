const mongoose = require('mongoose');
const queryEngine = require('../services/queryEngine');
const logger = require('../utils/logger');
const SchemaRegistry = require('./SchemaRegistry');

/**
 * Model Loader for Search Service
 *
 * Loads models from the centralized Schema Registry to enable cross-service querying.
 * This approach works across separate servers since schemas are stored in MongoDB.
 *
 * How it works:
 * 1. Each microservice publishes its schemas to SchemaRegistry on startup
 * 2. Search-service reads from SchemaRegistry and creates mongoose models
 * 3. Priority system ensures the correct service's schema is used for duplicates
 *
 * Priority order for duplicate models:
 *   1. lead-offer-service (priority: 100)
 *   2. user-auth-service (priority: 90)
 *   3. configuration-service (priority: 80)
 *   4. Other services (priority: 50-70)
 */

/**
 * Create a mongoose schema from the stored schema definition
 */
const createSchemaFromDefinition = (schemaDefinition, schemaOptions = {}) => {
  const schemaDef = {};

  for (const [fieldName, fieldDef] of Object.entries(schemaDefinition)) {
    // Skip _id as mongoose handles it automatically
    if (fieldName === '_id') continue;

    const field = {};

    // Map type string back to mongoose type
    switch (fieldDef.type) {
      case 'String':
        field.type = String;
        break;
      case 'Number':
        field.type = Number;
        break;
      case 'Boolean':
        field.type = Boolean;
        break;
      case 'Date':
        field.type = Date;
        break;
      case 'ObjectId':
      case 'ObjectID':
        field.type = mongoose.Schema.Types.ObjectId;
        break;
      case 'Mixed':
        field.type = mongoose.Schema.Types.Mixed;
        break;
      case 'Array':
        // Handle array types
        if (fieldDef.arrayType === 'ObjectId' || fieldDef.arrayType === 'ObjectID') {
          field.type = [mongoose.Schema.Types.ObjectId];
        } else if (fieldDef.arrayType === 'String') {
          field.type = [String];
        } else if (fieldDef.arrayType === 'Number') {
          field.type = [Number];
        } else if (fieldDef.arrayType === 'Mixed') {
          field.type = [mongoose.Schema.Types.Mixed];
        } else {
          field.type = Array;
        }
        break;
      case 'Buffer':
        field.type = Buffer;
        break;
      case 'Map':
        field.type = Map;
        break;
      case 'Decimal128':
        field.type = mongoose.Schema.Types.Decimal128;
        break;
      default:
        field.type = mongoose.Schema.Types.Mixed;
    }

    // Add ref if present
    if (fieldDef.ref) {
      field.ref = fieldDef.ref;
    }

    // Add enum if present
    if (fieldDef.enum) {
      field.enum = fieldDef.enum;
    }

    // Add default if present
    if (fieldDef.default !== undefined) {
      field.default = fieldDef.default;
    }

    // Add required if present
    if (fieldDef.required) {
      field.required = fieldDef.required;
    }

    // Add index if present
    if (fieldDef.index) {
      field.index = fieldDef.index;
    }

    // Add unique if present
    if (fieldDef.unique) {
      field.unique = fieldDef.unique;
    }

    schemaDef[fieldName] = field;
  }

  return new mongoose.Schema(schemaDef, {
    strict: false, // Allow fields not in schema for flexibility
    ...schemaOptions,
  });
};

/**
 * Load models from Schema Registry (Database-based approach)
 * This is the primary method for production use
 */
const loadModelsFromRegistry = async () => {
  try {
    logger.info('📥 Loading models from Schema Registry...');

    // Get all active schemas, sorted by priority (highest first)
    const schemas = await SchemaRegistry.find({ active: true })
      .sort({ priority: -1, modelName: 1 })
      .lean();

    if (schemas.length === 0) {
      logger.warn('⚠️ No schemas found in registry. Services may not have published yet.');
      logger.info('   Falling back to local model definitions...');
      return loadModelsLocally();
    }

    let loadedCount = 0;
    let skippedCount = 0;
    const loadedModels = new Set();

    for (const schemaDoc of schemas) {
      const { modelName, schemaDefinition, schemaOptions, service, priority } = schemaDoc;

      // Skip if we already loaded this model (higher priority version)
      if (loadedModels.has(modelName)) {
        skippedCount++;
        continue;
      }

      try {
        // Check if model already exists in mongoose
        if (mongoose.models[modelName]) {
          // Use existing model's schema
          queryEngine.registerModel(modelName, mongoose.models[modelName].schema);
          loadedModels.add(modelName);
          loadedCount++;
          logger.debug(`Using existing mongoose model: ${modelName}`);
          continue;
        }

        // Create schema from definition
        const schema = createSchemaFromDefinition(schemaDefinition, schemaOptions);

        // Register with query engine
        queryEngine.registerModel(modelName, schema);
        loadedModels.add(modelName);
        loadedCount++;

        logger.info(`✅ Loaded model: ${modelName} (from ${service}, priority: ${priority})`);
      } catch (err) {
        logger.error(`Failed to load model ${modelName}:`, err.message);
      }
    }

    logger.info(`📊 Model loading complete: ${loadedCount} loaded, ${skippedCount} skipped (duplicates)`);
    
    // List all loaded models
    logger.info(`📋 Loaded models: ${Array.from(loadedModels).join(', ')}`);

    return {
      loaded: loadedCount,
      skipped: skippedCount,
      models: Array.from(loadedModels),
    };
  } catch (error) {
    logger.error('Failed to load models from registry:', error);
    logger.info('Falling back to local model definitions...');
    return loadModelsLocally();
  }
};

/**
 * Load models locally (fallback for development or when registry is empty)
 * This uses the local model files in the search-service itself
 */
const loadModelsLocally = () => {
  try {
    logger.info('📥 Loading models locally (fallback mode)...');

    // Load the Role model that exists locally
    const Role = require('./Role');
    if (Role && Role.schema) {
      queryEngine.registerModel('Role', Role.schema);
      logger.info('Registered local model: Role');
    }

    // Add any other local models here as needed
    // This is mainly for development/testing when registry is not populated

    logger.info('Local model loading complete');
    return { loaded: 1, models: ['Role'] };
  } catch (error) {
    logger.error('Failed to load local models:', error);
    return { loaded: 0, models: [] };
  }
};

/**
 * Wait for schemas to be available in registry
 * Useful for service startup coordination
 */
const waitForSchemas = async (requiredModels = [], maxWaitMs = 30000, checkIntervalMs = 2000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const schemas = await SchemaRegistry.find({ 
      active: true,
      modelName: { $in: requiredModels }
    }).lean();
    
    const foundModels = schemas.map(s => s.modelName);
    const missingModels = requiredModels.filter(m => !foundModels.includes(m));
    
    if (missingModels.length === 0) {
      logger.info(`✅ All required schemas available: ${requiredModels.join(', ')}`);
      return true;
    }
    
    logger.info(`⏳ Waiting for schemas: ${missingModels.join(', ')}...`);
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
  }
  
  logger.warn(`⚠️ Timeout waiting for schemas. Some may be missing.`);
  return false;
};

/**
 * Main loader function
 * Automatically chooses between registry and local based on availability
 */
const loadModels = async () => {
  try {
    // Check if we have schemas in the registry
    const schemaCount = await SchemaRegistry.countDocuments({ active: true });
    
    if (schemaCount > 0) {
      logger.info(`Found ${schemaCount} schemas in registry`);
      return await loadModelsFromRegistry();
    } else {
      logger.warn('Schema registry is empty');
      logger.info('Make sure other microservices have started and published their schemas');
      return loadModelsLocally();
    }
  } catch (error) {
    logger.error('Error in model loader:', error);
    return loadModelsLocally();
  }
};

// Export both sync wrapper and async function
module.exports = loadModels;
module.exports.loadModelsFromRegistry = loadModelsFromRegistry;
module.exports.loadModelsLocally = loadModelsLocally;
module.exports.waitForSchemas = waitForSchemas;
module.exports.createSchemaFromDefinition = createSchemaFromDefinition;
