const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Schema Publisher Service
 * 
 * Publishes all registered mongoose models to the centralized Schema Registry.
 * This enables the search-service to query across all microservices without
 * needing direct file access to model definitions.
 * 
 * Usage:
 *   // In your app.js after connecting to database and loading models:
 *   const { publishAllSchemas } = require('./services/schemaPublisher');
 *   await publishAllSchemas();
 */

// Service configuration
const SERVICE_NAME = process.env.SERVICE_NAME || 'lead-offer-service';
const SERVICE_VERSION = process.env.SERVICE_VERSION || '1.0.0';

// Priority mapping for services (higher = takes precedence for duplicate models)
const SERVICE_PRIORITIES = {
  'lead-offer-service': 100,      // Primary source for Lead, Offer, etc.
  'user-auth-service': 90,        // Primary for User, Session, etc.
  'configuration-service': 80,    // Primary for Settings, Bank, etc.
  'notification-service': 70,
  'email-service': 70,
  'pdf-service': 60,
  'cashflow-service': 55,         // Primary for CashflowEntry, CashflowTransaction
  'document-service': 55,
  'reporting-service': 50,
  'call-service': 50,
  'search-service': 40,
};

/**
 * Schema Registry Model Definition
 * This is defined inline so the publisher doesn't depend on external files
 */
const getSchemaRegistryModel = () => {
  // Check if model already exists
  if (mongoose.models.SchemaRegistry) {
    return mongoose.models.SchemaRegistry;
  }

  const SchemaRegistrySchema = new mongoose.Schema(
    {
      modelName: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },
      service: {
        type: String,
        required: true,
        index: true,
      },
      schemaDefinition: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },
      schemaOptions: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
      version: {
        type: String,
        default: '1.0.0',
      },
      priority: {
        type: Number,
        default: 50,
      },
      active: {
        type: Boolean,
        default: true,
      },
      metadata: {
        collectionName: String,
        indexes: [mongoose.Schema.Types.Mixed],
        virtuals: [String],
        fieldCount: Number,
      },
      lastPublished: {
        type: Date,
        default: Date.now,
      },
    },
    {
      timestamps: true,
      collection: 'schema_registry',
    }
  );

  return mongoose.model('SchemaRegistry', SchemaRegistrySchema);
};

/**
 * Extract schema definition in a serializable format
 * Handles nested schemas, refs, and complex types
 */
const extractSchemaDefinition = (schema) => {
  const definition = {};
  
  schema.eachPath((pathname, schemaType) => {
    // Skip internal mongoose paths
    if (pathname.startsWith('_') && pathname !== '_id') return;
    
    const pathDef = {};
    
    // Get the type
    if (schemaType.instance) {
      pathDef.type = schemaType.instance;
    }
    
    // Get options
    if (schemaType.options) {
      if (schemaType.options.ref) {
        pathDef.ref = schemaType.options.ref;
      }
      if (schemaType.options.enum) {
        pathDef.enum = schemaType.options.enum;
      }
      if (schemaType.options.default !== undefined) {
        // Don't include function defaults
        if (typeof schemaType.options.default !== 'function') {
          pathDef.default = schemaType.options.default;
        }
      }
      if (schemaType.options.required) {
        pathDef.required = true;
      }
      if (schemaType.options.index) {
        pathDef.index = true;
      }
      if (schemaType.options.unique) {
        pathDef.unique = true;
      }
    }
    
    // Handle array types
    if (schemaType.instance === 'Array' && schemaType.caster) {
      pathDef.arrayType = schemaType.caster.instance || 'Mixed';
      if (schemaType.caster.options?.ref) {
        pathDef.ref = schemaType.caster.options.ref;
      }
    }
    
    definition[pathname] = pathDef;
  });
  
  return definition;
};

/**
 * Get schema metadata
 */
const getSchemaMetadata = (model) => {
  const schema = model.schema;
  
  return {
    collectionName: model.collection?.name || model.modelName.toLowerCase() + 's',
    indexes: schema.indexes().map(([fields, options]) => ({ fields, options })),
    virtuals: Object.keys(schema.virtuals || {}),
    fieldCount: Object.keys(schema.paths || {}).length,
  };
};

/**
 * Publish a single model's schema to the registry
 */
const publishSchema = async (modelName, model, SchemaRegistry) => {
  try {
    const schemaDefinition = extractSchemaDefinition(model.schema);
    const metadata = getSchemaMetadata(model);
    const priority = SERVICE_PRIORITIES[SERVICE_NAME] || 50;

    // Check if a higher priority service already published this schema
    const existing = await SchemaRegistry.findOne({ modelName });
    
    if (existing && existing.priority > priority) {
      logger.debug(`Schema ${modelName} already exists with higher priority (${existing.service}), skipping`);
      return { skipped: true, reason: 'higher_priority_exists' };
    }

    const result = await SchemaRegistry.findOneAndUpdate(
      { modelName },
      {
        modelName,
        service: SERVICE_NAME,
        schemaDefinition,
        schemaOptions: {
          timestamps: model.schema.options?.timestamps || false,
          collection: model.schema.options?.collection,
        },
        version: SERVICE_VERSION,
        priority,
        active: true,
        metadata,
        lastPublished: new Date(),
      },
      { upsert: true, new: true }
    );

    logger.debug(`Published schema: ${modelName} (priority: ${priority})`);
    return { published: true, schema: result };
  } catch (error) {
    logger.error(`Failed to publish schema ${modelName}:`, error.message);
    return { error: error.message };
  }
};

/**
 * Publish all registered mongoose models to the Schema Registry
 */
const publishAllSchemas = async (options = {}) => {
  const {
    excludeModels = ['SchemaRegistry'], // Don't publish the registry itself
    onlyModels = null, // If provided, only publish these models
  } = options;

  try {
    const SchemaRegistry = getSchemaRegistryModel();
    const models = mongoose.models;
    const modelNames = Object.keys(models);
    
    logger.info(`📤 Publishing schemas from ${SERVICE_NAME}...`);
    logger.info(`   Found ${modelNames.length} models`);

    const results = {
      published: [],
      skipped: [],
      errors: [],
    };

    for (const modelName of modelNames) {
      // Skip excluded models
      if (excludeModels.includes(modelName)) {
        results.skipped.push({ modelName, reason: 'excluded' });
        continue;
      }

      // If onlyModels is specified, skip models not in the list
      if (onlyModels && !onlyModels.includes(modelName)) {
        results.skipped.push({ modelName, reason: 'not_in_list' });
        continue;
      }

      const model = models[modelName];
      const result = await publishSchema(modelName, model, SchemaRegistry);

      if (result.published) {
        results.published.push(modelName);
      } else if (result.skipped) {
        results.skipped.push({ modelName, reason: result.reason });
      } else if (result.error) {
        results.errors.push({ modelName, error: result.error });
      }
    }

    logger.info(`✅ Schema publishing complete:`);
    logger.info(`   Published: ${results.published.length}`);
    logger.info(`   Skipped: ${results.skipped.length}`);
    logger.info(`   Errors: ${results.errors.length}`);

    if (results.errors.length > 0) {
      logger.warn('Schema publishing errors:', results.errors);
    }

    return results;
  } catch (error) {
    logger.error('Failed to publish schemas:', error);
    throw error;
  }
};

/**
 * Deactivate all schemas from this service
 * Useful for cleanup or service shutdown
 */
const deactivateAllSchemas = async () => {
  try {
    const SchemaRegistry = getSchemaRegistryModel();
    const result = await SchemaRegistry.updateMany(
      { service: SERVICE_NAME },
      { active: false }
    );
    logger.info(`Deactivated ${result.modifiedCount} schemas from ${SERVICE_NAME}`);
    return result;
  } catch (error) {
    logger.error('Failed to deactivate schemas:', error);
    throw error;
  }
};

module.exports = {
  publishAllSchemas,
  publishSchema,
  deactivateAllSchemas,
  getSchemaRegistryModel,
  SERVICE_NAME,
  SERVICE_PRIORITIES,
};
