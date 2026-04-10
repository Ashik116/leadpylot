/**
 * Project Controller
 * HTTP request handlers for project management
 * RESPONSE FORMAT: Matches monolith exactly
 */

const { PERMISSIONS } = require('../middleware/roles/permissions');
// const { hasPermission } = require('../middleware/roles/rolePermissions');
const { hasPermission } = require('../middleware/authorize');
const projectService = require('../services/projectService');
const logger = require('../utils/logger');

/**
 * Get all projects
 * Matches monolith: Returns { data: [...], meta: {...} }
 */
async function getAllProjects(req, res, next) {
  try {
    const { page, limit, search, showInactive, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;
    

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search,
      showInactive: showInactive === 'true',
      sortBy,
      sortOrder,
    };
    // Pass user info to service for role-based filtering
    const result = await projectService.getAllUserProjects(req.user, hasPermission, PERMISSIONS, options);
    
    // Monolith returns { data: [...], meta: {...} } directly
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get project by ID
 * Matches frontend expectation: Returns { data: project } structure
 */
async function getProjectById(req, res, next) {
  try {
    const { id } = req.params;
    
    const result = await projectService.getProjectById(id);
    
    // Frontend expects { data: project } structure
    res.status(200).json( result );
  } catch (error) {
    next(error);
  }
}

/**
 * Create project
 * Matches monolith: Returns project object directly (201 status)
 */
async function createProject(req, res, next) {
  try {
    const projectData = req.body;
    const creatorId = req.user._id;
    
    const project = await projectService.createProject(projectData, creatorId);
    
    // Monolith returns project object directly (no wrapper, no message)
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
}

/**
 * Update project
 * Matches monolith: Returns project object directly
 */
async function updateProject(req, res, next) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updaterId = req.user._id;
    
    const project = await projectService.updateProject(id, updateData, updaterId);
    
    // Monolith returns project object directly (no wrapper, no message)
    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete project (soft delete)
 * Matches monolith: Returns { message: "..." }
 */
async function deleteProject(req, res, next) {
  try {
    const { id } = req.params;
    const deleterId = req.user._id;
    
    await projectService.deleteProject(id, deleterId);
    
    // Monolith returns { message: "..." }
    res.status(200).json({
      message: 'Project deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Bulk delete projects (soft delete)
 * Accepts { ids: ["id1", "id2", ...] }
 */
async function bulkDeleteProjects(req, res, next) {
  try {
    const { ids } = req.body;
    const deleterId = req.user._id;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    
    const results = [];
    for (const projectId of ids) {
      await projectService.deleteProject(projectId, deleterId);
      results.push({ projectId, status: 'deactivated' });
    }
    
    res.status(200).json({ message: 'Projects deleted successfully', results });
  } catch (error) {
    next(error);
  }
}

/**
 * Restore project
 * Matches monolith: Returns result object
 */
async function restoreProject(req, res, next) {
  try {
    const { id } = req.params;
    
    const result = await projectService.restoreProject(id);
    
    // Return result as-is
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get project agents
 * Matches monolith: Returns ARRAY directly (no wrapper)
 */
async function getProjectAgents(req, res, next) {
  try {
    const { id } = req.params;
    
    const agents = await projectService.getProjectAgents(id);
    
    // Monolith returns agents array directly (no wrapper!)
    res.status(200).json(agents);
  } catch (error) {
    next(error);
  }
}

/**
 * Add agent to project
 * Matches monolith: Returns { message, agents }
 */
async function addAgentToProject(req, res, next) {
  try {
    const { id } = req.params;
    const { agents } = req.body;
    
    if (!agents || !Array.isArray(agents) || agents.length === 0) {
      return res.status(400).json({
        error: 'Agents array is required and must not be empty'
      });
    }
    
    const results = [];
    for (const agentData of agents) {
      const result = await projectService.addAgentToProject(id, agentData);
      results.push(result);
    }
    
    // Monolith returns { message, agents: [...] }
    res.status(200).json({
      message: 'Agents added to project successfully',
      agents: results
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update agent in project
 * Matches monolith: Returns result object
 * Supports multipart/form-data with file uploads
 */
async function updateAgentInProject(req, res, next) {
  try {
    const { id, agentId } = req.params;
    
    // Parse multipart form data
    // When using multer.any(), files are in req.files array
    // Text fields are in req.body, but may need JSON parsing for complex objects
    const updateData = { ...req.body };
    
    logger.info('updateAgentInProjectBody', { 
      body: req.body,
      keys: Object.keys(req.body),
      rawData: JSON.stringify(req.body)
    });

    // Handle file uploads if present
    if (req.files && req.files.length > 0) {
      updateData.files = req.files.map(file => ({
        fieldname: file.fieldname,
        originalname: file.originalname,
        filename: file.filename,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size,
      }));
    }
    
    // Parse JSON strings in form data (common with multipart/form-data)
    // For example, if frontend sends complex objects as JSON strings
    Object.keys(updateData).forEach(key => {
      if (typeof updateData[key] === 'string' && 
          (updateData[key].startsWith('{') || updateData[key].startsWith('['))) {
        try {
          updateData[key] = JSON.parse(updateData[key]);
        } catch (e) {
          // If it's not valid JSON, keep it as string
        }
      }
    });
    
    // Remove 'files' key from updateData if it's coming from form data to avoid confusion
    if (updateData.files && !req.files) {
      delete updateData.files;
    }
    
    logger.info('updateAgentInProject', { 
      body: req.body, 
      files: req.files?.map(f => ({ fieldname: f.fieldname, filename: f.filename })),
      parsedData: updateData,
      updateDataKeys: Object.keys(updateData)
    });
    
    const result = await projectService.updateAgentInProject(id, agentId, updateData);
    
    // Return result as-is
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Remove agent from project
 * Matches monolith: Returns { message: "..." }
 */
async function removeAgentFromProject(req, res, next) {
  try {
    const { id, agentId } = req.params;
    
    await projectService.removeAgentFromProject(id, agentId);
    
    // Monolith returns { message: "..." }
    res.status(200).json({
      message: 'Agent removed from project successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get projects for an agent
 * Matches monolith: Returns { data: [...], meta: {...} }
 */
async function getAgentProjects(req, res, next) {
  try {
    const { userId } = req.params;
    const { page, limit, showInactive } = req.query;
    
    const result = await projectService.getAgentProjects(userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      showInactive: showInactive === 'true',
    });
    
    // Monolith returns { data: [...], meta: {...} }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  bulkDeleteProjects,
  restoreProject,
  getProjectAgents,
  addAgentToProject,
  updateAgentInProject,
  removeAgentFromProject,
  getAgentProjects,
};
