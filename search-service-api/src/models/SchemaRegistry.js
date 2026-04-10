const mongoose = require('mongoose');

/**
 * Schema Registry Model
 * 
 * Stores model schemas from all microservices in a centralized location.
 * Each microservice publishes its schemas on startup, and the search-service
 * reads from this registry to enable cross-service querying.
 * 
 * This eliminates the need for file-based model loading across separate servers.
 */
const SchemaRegistrySchema = new mongoose.Schema(
  {
    // Model name (e.g., 'Lead', 'Offer', 'User')
    modelName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    
    // The service that owns/published this schema
    service: {
      type: String,
      required: true,
      index: true,
    },
    
    // Schema definition as JSON object
    // This is the schema.obj from mongoose models
    schemaDefinition: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    
    // Schema options (timestamps, collection name, etc.)
    schemaOptions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    
    // Version for tracking schema updates
    version: {
      type: String,
      default: '1.0.0',
    },
    
    // Priority for resolving duplicate models across services
    // Higher priority takes precedence (e.g., lead-offer-service = 100, others = 50)
    priority: {
      type: Number,
      default: 50,
    },
    
    // Whether this schema is active
    active: {
      type: Boolean,
      default: true,
    },
    
    // Metadata about the schema
    metadata: {
      // Collection name in MongoDB
      collectionName: String,
      // Fields that are indexed
      indexes: [mongoose.Schema.Types.Mixed],
      // Virtual fields
      virtuals: [String],
      // Total field count
      fieldCount: Number,
    },
    
    // Last time this schema was published/updated
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

// Index for efficient lookups
SchemaRegistrySchema.index({ modelName: 1, service: 1 });
SchemaRegistrySchema.index({ service: 1, active: 1 });
SchemaRegistrySchema.index({ priority: -1 });

// Static method to get all active schemas
SchemaRegistrySchema.statics.getActiveSchemas = async function() {
  return this.find({ active: true }).sort({ priority: -1, modelName: 1 });
};

// Static method to get schema by model name (highest priority)
SchemaRegistrySchema.statics.getSchemaByName = async function(modelName) {
  return this.findOne({ modelName, active: true }).sort({ priority: -1 });
};

// Static method to upsert a schema (used by publisher)
SchemaRegistrySchema.statics.publishSchema = async function({
  modelName,
  service,
  schemaDefinition,
  schemaOptions = {},
  version = '1.0.0',
  priority = 50,
  metadata = {},
}) {
  return this.findOneAndUpdate(
    { modelName },
    {
      modelName,
      service,
      schemaDefinition,
      schemaOptions,
      version,
      priority,
      active: true,
      metadata,
      lastPublished: new Date(),
    },
    { upsert: true, new: true }
  );
};

// Static method to get schemas by service
SchemaRegistrySchema.statics.getSchemasByService = async function(service) {
  return this.find({ service, active: true });
};

// Static method to deactivate all schemas from a service
SchemaRegistrySchema.statics.deactivateServiceSchemas = async function(service) {
  return this.updateMany({ service }, { active: false });
};

const SchemaRegistry = mongoose.model('SchemaRegistry', SchemaRegistrySchema);

module.exports = SchemaRegistry;
