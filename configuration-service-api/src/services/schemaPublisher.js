const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Schema Publisher Service for Configuration Service
 */

const SERVICE_NAME = process.env.SERVICE_NAME || 'configuration-service';
const SERVICE_VERSION = process.env.SERVICE_VERSION || '1.0.0';

const SERVICE_PRIORITIES = {
  'lead-offer-service': 100,
  'user-auth-service': 90,
  'configuration-service': 80,
  'notification-service': 70,
  'email-service': 70,
  'pdf-service': 60,
  'cashflow-service': 55,         // Primary for CashflowEntry, CashflowTransaction
  'document-service': 55,
  'reporting-service': 50,
  'call-service': 50,
  'search-service': 40,
};

const getSchemaRegistryModel = () => {
  if (mongoose.models.SchemaRegistry) {
    return mongoose.models.SchemaRegistry;
  }

  const SchemaRegistrySchema = new mongoose.Schema(
    {
      modelName: { type: String, required: true, unique: true, index: true },
      service: { type: String, required: true, index: true },
      schemaDefinition: { type: mongoose.Schema.Types.Mixed, required: true },
      schemaOptions: { type: mongoose.Schema.Types.Mixed, default: {} },
      version: { type: String, default: '1.0.0' },
      priority: { type: Number, default: 50 },
      active: { type: Boolean, default: true },
      metadata: {
        collectionName: String,
        indexes: [mongoose.Schema.Types.Mixed],
        virtuals: [String],
        fieldCount: Number,
      },
      lastPublished: { type: Date, default: Date.now },
    },
    { timestamps: true, collection: 'schema_registry' }
  );

  return mongoose.model('SchemaRegistry', SchemaRegistrySchema);
};

const extractSchemaDefinition = (schema) => {
  const definition = {};
  
  schema.eachPath((pathname, schemaType) => {
    if (pathname.startsWith('_') && pathname !== '_id') return;
    
    const pathDef = {};
    
    if (schemaType.instance) {
      pathDef.type = schemaType.instance;
    }
    
    if (schemaType.options) {
      if (schemaType.options.ref) pathDef.ref = schemaType.options.ref;
      if (schemaType.options.enum) pathDef.enum = schemaType.options.enum;
      if (schemaType.options.default !== undefined && typeof schemaType.options.default !== 'function') {
        pathDef.default = schemaType.options.default;
      }
      if (schemaType.options.required) pathDef.required = true;
      if (schemaType.options.index) pathDef.index = true;
      if (schemaType.options.unique) pathDef.unique = true;
    }
    
    if (schemaType.instance === 'Array' && schemaType.caster) {
      pathDef.arrayType = schemaType.caster.instance || 'Mixed';
      if (schemaType.caster.options?.ref) pathDef.ref = schemaType.caster.options.ref;
    }
    
    definition[pathname] = pathDef;
  });
  
  return definition;
};

const publishAllSchemas = async (options = {}) => {
  const { excludeModels = ['SchemaRegistry'] } = options;

  try {
    const SchemaRegistry = getSchemaRegistryModel();
    const models = mongoose.models;
    const modelNames = Object.keys(models);
    const priority = SERVICE_PRIORITIES[SERVICE_NAME] || 50;
    
    logger.info(`📤 Publishing schemas from ${SERVICE_NAME}...`);

    const results = { published: [], skipped: [], errors: [] };

    for (const modelName of modelNames) {
      if (excludeModels.includes(modelName)) {
        results.skipped.push(modelName);
        continue;
      }

      try {
        const model = models[modelName];
        const schemaDefinition = extractSchemaDefinition(model.schema);

        const existing = await SchemaRegistry.findOne({ modelName });
        if (existing && existing.priority > priority) {
          results.skipped.push(modelName);
          continue;
        }

        await SchemaRegistry.findOneAndUpdate(
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
            metadata: {
              collectionName: model.collection?.name || modelName.toLowerCase() + 's',
              fieldCount: Object.keys(model.schema.paths || {}).length,
            },
            lastPublished: new Date(),
          },
          { upsert: true, new: true }
        );

        results.published.push(modelName);
      } catch (error) {
        results.errors.push({ modelName, error: error.message });
      }
    }

    logger.info(`✅ Published: ${results.published.length}, Skipped: ${results.skipped.length}, Errors: ${results.errors.length}`);
    return results;
  } catch (error) {
    logger.error('Failed to publish schemas:', error);
    throw error;
  }
};

module.exports = { publishAllSchemas, getSchemaRegistryModel, SERVICE_NAME };
