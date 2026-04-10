const queryEngine = require('../services/queryEngine');
const logger = require('../utils/logger');

exports.search = async (req, res) => {
    try {
        let { model, domain, groupBy, limit, offset, orderBy, includeIds, includeAll } = req.body;

        if (!model) {
            return res.status(400).json({ success: false, message: 'Model is required' });
        }

        // Initialize domain if it doesn't exist
        if (!Array.isArray(domain)) {
            domain = [];
        }

        // --- ACCESS CONTROL ---
        // Agents can only see their own data
        // We assume 'Agent' is the role name (adjust if it's lowercase 'agent')
        // Using strict check for safety.
        const userRole = req.user.role;
        const userId = req.user._id;

        if (userRole === 'Agent' || userRole === 'agent') {
            // Force filter by user_id
            // This applies to Lead, Offer, etc. where user_id is the owner field.
            // TODO: If some models use 'agent_id' or similar, we need a mapping strategy.
            // For now, based on Lead/Offer models, 'user_id' or 'agent_id' is used.
            
            // Checking model to decide field name
            let ownerField = 'user_id';
            if (model === 'Offer' || model === 'Reclamation') ownerField = 'agent_id';
            
            // Add the condition to the domain
            domain.push([ownerField, '=', userId]);
            
            logger.info(`Restricted search for Agent ${req.user.login} on ${model} (filtered by ${ownerField})`);
        }
        // ----------------------

        const result = await queryEngine.search({
            modelName: model,
            domain,
            groupBy,
            includeIds: includeIds || false,
            limit,
            offset,
            orderBy,
            includeAll: includeAll || false
        });

        res.status(200).json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        logger.error(`Search error: ${error.message}`, {
            stack: error.stack,
            model: req.body?.model,
            domain: req.body?.domain?.length || 0,
            orderBy: req.body?.orderBy,
            groupBy: req.body?.groupBy?.length || 0
        });
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
