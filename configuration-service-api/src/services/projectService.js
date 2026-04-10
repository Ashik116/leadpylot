/**
 * Project Service
 * Business logic for project (team) management
 */

const mongoose = require('mongoose');
const { Project, Bank } = require('../models');
const { Settings } = require('../models');
const { PdfTemplate } = require('../models');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError, AuthorizationError } = require('../utils/errorHandler');
const { eventEmitter, EVENT_TYPES } = require('../utils/events');
const { transformTeamToProject } = require('../helpers/transforTeamToProject');
const { ROLES } = require('../middleware/roles/roleDefinitions');

/**
 * Get allowed sort fields for projects
 * @returns {Object} - Map of allowed sort fields
 */
const getAllowedSortFields = () => {
  return {
    'name': 'name',
    'agentsCount': 'agent_count', // Computed field
    'voipserver_name': 'voipserver_name', // Computed field from lookup
    'mailserver_name': 'mailserver_name', // Computed field from lookup
    'description': 'description',
    'active': 'active',
    'project_email': 'project_email',
    'project_phone': 'project_phone',
    'project_alias': 'project_alias',
    'project_website': 'project_website',
    'createdAt': 'createdAt',
    'updatedAt': 'updatedAt',
  };
};

/**
 * Get all projects with pagination and filtering
 * Role-based access: Admin/Manager see all projects, Agents see only assigned projects
 */
const getAllUserProjects = async (user, hasPermissionFn, permissions, options = {}) => {
  const { showInactive = false, search = '', sortBy = 'updatedAt', sortOrder = 'desc', page = 1, limit = 20 } = options;

  const skip = (page - 1) * limit;

  // Only show active projects by default
  const activeFilter = showInactive ? {} : { active: true };

  // Check if user is an Agent - Agents should only see their assigned projects
  if (user.role === ROLES.AGENT) {
    // Agent can only see assigned projects with search and pagination
    return await getUserAssignedProjectsWithSearch(
      user,
      activeFilter,
      search,
      page,
      limit,
      skip,
      sortBy,
      sortOrder,
      hasPermissionFn,
      permissions
    );
  } else if (await hasPermissionFn(user.role, permissions.PROJECT_READ_ALL)) {
    // Admin/Manager can see all projects with search and pagination
    return await getAllProjectsWithSearch(
      activeFilter,
      search,
      page,
      limit,
      skip,
      sortBy,
      sortOrder,
      user,
      hasPermissionFn,
      permissions
    );
  } else if (await hasPermissionFn(user.role, permissions.PROJECT_READ)) {
    // Other roles with PROJECT_READ permission
    return await getUserAssignedProjectsWithSearch(
      user,
      activeFilter,
      search,
      page,
      limit,
      skip,
      sortBy,
      sortOrder,
      hasPermissionFn,
      permissions
    );
  }

  throw new AuthorizationError("You don't have permission to view projects");
};


// 2
const getAllProjectsWithSearch = async (
  activeFilter,
  search,
  page,
  limit,
  skip,
  sortBy,
  sortOrder,
  user,
  hasPermissionFn,
  permissions
) => {
  // Build aggregation pipeline for search functionality
  const pipeline = [];

  // Stage 1: Base matching (active filter)
  pipeline.push({ $match: activeFilter });

  // Stage 2: Lookup banks for search (if needed)
  pipeline.push({
    $lookup: {
      from: 'banks',
      localField: 'banks',
      foreignField: '_id',
      as: 'bank_details',
    },
  });

  // Stage 3: Lookup agents and their user details for search
  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'agents.user',
      foreignField: '_id',
      as: 'agent_users',
    },
  });

  // Stage 3.5: Lookup voipserver for sorting
  pipeline.push({
    $lookup: {
      from: 'settings',
      localField: 'voipserver_id',
      foreignField: '_id',
      as: 'voipserver_details',
    },
  });

  // Stage 3.6: Lookup mailserver for sorting
  pipeline.push({
    $lookup: {
      from: 'settings',
      localField: 'mailserver_id',
      foreignField: '_id',
      as: 'mailserver_details',
    },
  });

  // Stage 3.7: Add computed fields for sorting
  pipeline.push({
    $addFields: {
      agent_count: {
        $cond: {
          if: { $isArray: '$agents' },
          then: { $size: '$agents' },
          else: 0
        }
      },
      voipserver_name: {
        $ifNull: [
          { $arrayElemAt: ['$voipserver_details.name', 0] },
          ''
        ]
      },
      mailserver_name: {
        $ifNull: [
          { $arrayElemAt: ['$mailserver_details.name', 0] },
          ''
        ]
      },
    },
  });

  // Stage 4: Search filtering (if search term provided)
  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    pipeline.push({
      $match: {
        $or: [
          { name: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
          { project_email: { $regex: searchRegex } },
          { project_phone: { $regex: searchRegex } },
          { project_alias: { $regex: searchRegex } },
          { 'bank_details.name': { $regex: searchRegex } },
          { 'bank_details.account_number': { $regex: searchRegex } },
          { 'bank_details.iban': { $regex: searchRegex } },
          { 'agent_users.login': { $regex: searchRegex } },
          { 'agent_users.name': { $regex: searchRegex } },
          { 'agent_users.email': { $regex: searchRegex } },
          { 'pdf_templates.name': { $regex: searchRegex } },
          { 'pdf_templates.description': { $regex: searchRegex } },
          { 'pdf_templates.category': { $regex: searchRegex } },
          { 'pdf_templates.status': { $regex: searchRegex } },
        ],
      },
    });
  }

  // Stage 5: Add sorting
  const allowedSortFields = getAllowedSortFields();
  const sortField = allowedSortFields[sortBy] || 'updatedAt';
  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sortObj = {};
  sortObj[sortField] = sortDirection;
  
  // Debug logging for sorting
  logger.debug('Project sorting', {
    sortBy,
    sortField,
    sortDirection,
    sortObj,
  });
  
  pipeline.push({ $sort: sortObj });

  // Stage 6: Get total count and paginated data
  pipeline.push({
    $facet: {
      data: [
        { $skip: skip },
        { $limit: parseInt(limit) },
        {
          $project: {
            _id: 1,
            name: 1,
            description: 1,
            active: 1,
            project_email: 1,
            project_phone: 1,
            project_alias: 1,
            project_website: 1,
            deport_link: 1,
            inbound_email: 1,
            inbound_number: 1,
            contract: 1,
            confirmation_email: 1,
            banks: 1,
            agents: 1,
            mailserver_id: 1,
            mailservers: 1,
            voipserver_id: 1,
            pdf_templates: 1,
            email_templates: 1,
            color_code: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ],
      totalCount: [{ $count: 'count' }],
    },
  });

  // Execute aggregation
  const [result] = await Project.aggregate(pipeline);
  const projectIds = (result.data || []).map((project) => project._id);
  const total = result.totalCount.length > 0 ? result.totalCount[0].count : 0;

  // If no results found, return empty data
  if (projectIds.length === 0) {
    return {
      data: [],
      meta: {
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  // Get full project data with all populations for the found IDs
  const teams = await Project.find({ _id: { $in: projectIds } })
    .populate({
      path: 'agents.user',
      select: 'id login name email role',
    })
    .populate({ path: 'agents.mailservers', select: 'name info' })
    .populate({
      path: 'banks',
      match: { is_allow: true },
      select: '_id id name nickName iban Ref provider is_default is_allow min_limit max_limit state bank_country_flag bank_country_code country logo',
      populate: [
        {
          path: 'provider',
          select: 'name login',
        },
        {
          path: 'logo',
          select: 'filetype filename path size type createdAt',
        },
        {
          path: 'bank_country_flag',
          select: 'filetype filename path size type createdAt',
        },
      ],
    })
    .populate({
      path: 'mailserver_id',
      select: 'name',
    })
    .populate({
      path: 'voipserver_id',
      select: 'name',
    })
    .populate({
      path: 'mailservers',
      select: 'name info',
    })
    .populate({
      path: 'pdf_templates',
      select: 'name description category status',
    })
    .populate({
      path: 'email_templates',
      match: { type: 'email_templates' },
    })
    .populate({
      path: 'contract',
      select: 'filetype filename path size type createdAt',
    })
    .populate({
      path: 'confirmation_email',
      select: 'filetype filename path size type createdAt',
    });

  // Sort teams to match the order from aggregation
  const teamsMap = new Map(teams.map((team) => [team._id.toString(), team]));
  const sortedTeams = projectIds.map((id) => teamsMap.get(id.toString())).filter(Boolean);

  // Transform teams to projects with user context for agent filtering
  const projects = await Promise.all(
    sortedTeams.map(async (team) => {
      return transformTeamToProject(team, user, hasPermissionFn, permissions);
    })
  );

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);

  return {
    data: projects,
    meta: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

//3
const getUserAssignedProjectsWithSearch = async (
  user,
  activeFilter,
  search,
  page,
  limit,
  skip,
  sortBy,
  sortOrder,
  hasPermissionFn,
  permissions
) => {
  // Build aggregation pipeline for user's assigned projects with search
  const pipeline = [];

  // Stage 1: Base matching (active filter + user assignment)
  // Convert user._id to ObjectId to ensure proper matching with database
  const userObjectId = mongoose.Types.ObjectId.isValid(user._id)
    ? new mongoose.Types.ObjectId(user._id)
    : user._id;

  const baseMatch = {
    ...activeFilter,
    'agents.user': userObjectId,
  };
  pipeline.push({ $match: baseMatch });

  // Stage 2: Lookup banks for search
  pipeline.push({
    $lookup: {
      from: 'banks',
      localField: 'banks',
      foreignField: '_id',
      as: 'bank_details',
    },
  });

  // Stage 3: Lookup agents and their user details for search
  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'agents.user',
      foreignField: '_id',
      as: 'agent_users',
    },
  });

  // Stage 3.5: Lookup voipserver for sorting
  pipeline.push({
    $lookup: {
      from: 'settings',
      localField: 'voipserver_id',
      foreignField: '_id',
      as: 'voipserver_details',
    },
  });

  // Stage 3.6: Lookup mailserver for sorting
  pipeline.push({
    $lookup: {
      from: 'settings',
      localField: 'mailserver_id',
      foreignField: '_id',
      as: 'mailserver_details',
    },
  });

  // Stage 3.7: Add computed fields for sorting
  pipeline.push({
    $addFields: {
      agent_count: {
        $cond: {
          if: { $isArray: '$agents' },
          then: { $size: '$agents' },
          else: 0
        }
      },
      voipserver_name: {
        $ifNull: [
          { $arrayElemAt: ['$voipserver_details.name', 0] },
          ''
        ]
      },
      mailserver_name: {
        $ifNull: [
          { $arrayElemAt: ['$mailserver_details.name', 0] },
          ''
        ]
      },
    },
  });

  // Stage 4: Search filtering (if search term provided)
  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    pipeline.push({
      $match: {
        $or: [
          { name: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
          { project_email: { $regex: searchRegex } },
          { project_phone: { $regex: searchRegex } },
          { project_alias: { $regex: searchRegex } },
          { 'bank_details.name': { $regex: searchRegex } },
          { 'bank_details.account_number': { $regex: searchRegex } },
          { 'bank_details.iban': { $regex: searchRegex } },
          { 'agent_users.login': { $regex: searchRegex } },
          { 'agent_users.name': { $regex: searchRegex } },
          { 'agent_users.email': { $regex: searchRegex } },
        ],
      },
    });
  }

  // Stage 5: Add sorting
  const allowedSortFields = getAllowedSortFields();
  const sortField = allowedSortFields[sortBy] || 'updatedAt';
  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sortObj = {};
  sortObj[sortField] = sortDirection;
  
  // Debug logging for sorting
  logger.debug('Project sorting', {
    sortBy,
    sortField,
    sortDirection,
    sortObj,
  });
  
  pipeline.push({ $sort: sortObj });

  // Stage 6: Get total count and paginated data
  pipeline.push({
    $facet: {
      data: [
        { $skip: skip },
        { $limit: parseInt(limit) },
        {
          $project: {
            _id: 1,
            name: 1,
            description: 1,
            active: 1,
            project_email: 1,
            project_phone: 1,
            project_alias: 1,
            project_website: 1,
            deport_link: 1,
            inbound_email: 1,
            inbound_number: 1,
            contract: 1,
            confirmation_email: 1,
            banks: 1,
            agents: 1,
            mailserver_id: 1,
            mailservers: 1,
            voipserver_id: 1,
            email_templates: 1,
            color_code: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ],
      totalCount: [{ $count: 'count' }],
    },
  });

  // Execute aggregation
  const [result] = await Project.aggregate(pipeline);
  const projectIds = (result.data || []).map((project) => project._id);
  const total = result.totalCount.length > 0 ? result.totalCount[0].count : 0;

  // If no results found, return empty data
  if (projectIds.length === 0) {
    return {
      data: [],
      meta: {
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  // Get full project data with all populations for the found IDs
  const teams = await Project.find({ _id: { $in: projectIds } })
    .populate('agents.user', 'id login name email role')
    .populate({ path: 'agents.mailservers', select: 'name info' })
    .populate({
      path: 'mailserver_id',
      select: 'name',
    })
    .populate({
      path: 'voipserver_id',
      select: 'name',
    })
    .populate({
      path: 'mailservers',
      select: 'name info',
    })
    .populate({
      path: 'banks',
      match: { is_allow: true },
      select: '_id id name nickName iban Ref provider is_default is_allow min_limit max_limit state bank_country_flag bank_country_code country logo',
      populate: [
        {
          path: 'provider',
          select: 'name login',
        },
        {
          path: 'logo',
          select: 'filetype filename path size type createdAt',
        },
        {
          path: 'bank_country_flag',
          select: 'filetype filename path size type createdAt',
        },
      ],
    })
    .populate({
      path: 'email_templates',
      match: { type: 'email_templates' },
    })
    .populate({
      path: 'contract',
      select: 'filetype filename path size type createdAt',
    })
    .populate({
      path: 'confirmation_email',
      select: 'filetype filename path size type createdAt',
    });

  // Sort teams to match the order from aggregation
  const teamsMap = new Map(teams.map((team) => [team._id.toString(), team]));
  const sortedTeams = projectIds.map((id) => teamsMap.get(id.toString())).filter(Boolean);

  // Transform teams to projects with user context for agent filtering
  const userProjects = await Promise.all(
    sortedTeams.map(async (team) => {
      return transformTeamToProject(team, user, hasPermissionFn, permissions);
    })
  );

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);

  return {
    data: userProjects,
    meta: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};



/**
 * Get all projects with pagination and filtering
 * Role-based access: Admin/Manager see all projects, Agents see only assigned projects
 */
// async function getAllProjects({ page = 1, limit = 50, search = '', showInactive = false, sort = '-updatedAt', user }) {
//   const { hasPermission } = require('../middleware/roles/rolePermissions');
//   const { PERMISSIONS } = require('../middleware/roles/permissions');
  
//   const skip = (page - 1) * limit;

//   // Build query
//   const query = {};

//   // Filter by active status
//   if (!showInactive) {
//     query.active = true;
//   }

//   // Role-based filtering: Only show assigned projects for Agents without PROJECT_READ_ALL permission
//   if (user) {
//     const canReadAll = hasPermission(user.role, PERMISSIONS.PROJECT_READ_ALL);
    
//     if (!canReadAll) {
//       // For agents without PROJECT_READ_ALL, only show projects they're assigned to
//       // This matches the monolith's getUserAssignedProjectsWithSearch behavior
//       query['agents.user'] = user._id || user.id;
//     }
//   }

//   // Search filter
//   if (search && search.trim() !== '') {
//     const searchRegex = new RegExp(search.trim(), 'i');
//     query.$or = [
//       { name: { $regex: searchRegex } },
//       { description: { $regex: searchRegex } },
//       { project_email: { $regex: searchRegex } },
//       { project_phone: { $regex: searchRegex } },
//       { project_alias: { $regex: searchRegex } },
//     ];
//   }

//   // Get total count
//   const total = await Project.countDocuments(query);

//   // Get projects with population
//   const projects = await Project.find(query)
//     .populate({
//       path: 'banks',
//       match: { is_allow: true }, // Only include banks where is_allow is true
//       select: 'name is_allow is_default'
//     })
//     .populate('agents.user', 'login name email role active id')
//     .sort(sort)
//     .skip(skip)
//     .limit(parseInt(limit))
//     .lean({ virtuals: true });

//   // MATCH MONOLITH: Transform projects to match production format
//   projects.forEach(project => {
//     // Add id field
//     project.id = project._id.toString();

//     // Add id field to banks
//     if (project.banks && Array.isArray(project.banks)) {
//       project.banks = project.banks.map(bank => ({
//         ...bank,
//         id: bank._id.toString()
//       }));
//     }

//     let agentsCount = 0;
//     // Transform agents array to match monolith structure (simplified for list view)
//     if (project.agents && Array.isArray(project.agents)) {
//       project.agents = project.agents.map(agent => {
//         const transformedAgent = {
//           _id: agent._id,
//           active: agent.active
//         };

//         if (agent.user) {
//           transformedAgent.user = {
//             _id: agent.user._id,
//             id: agent.user.id,
//             name: agent.user.login ? agent.user.login.toLowerCase() : agent.user.name,
//             email: agent.user.email || null,
//             role: agent.user.role
//           };
//         }

//         transformedAgent.alias_name = agent.alias_name;

//         return transformedAgent;
//       });
//       agentsCount = project.agents.length;
//     }
//     project.agentsCount = agentsCount;
//   });

//   // Populate mailservers[] and display it in a field name mailservers
//   await Promise.all(projects.map(async (project) => {
//     if (project.mailservers && Array.isArray(project.mailservers)) {
//       project.mailservers = await Promise.all(project.mailservers.map(async (mailserver) => {
//         const mailserverDoc = await Settings.findById(mailserver).select('name info').lean();
//         if (mailserverDoc) {
//           return {
//             _id: mailserverDoc._id,
//             name: mailserverDoc.name,
//             info: mailserverDoc.info || {}
//           };
//         }
//         return null; // Handle case where mailserver document doesn't exist
//       }));
//       // Filter out null values in case some mailservers don't exist
//       project.mailservers = project.mailservers.filter(mailserver => mailserver !== null);
//     }

//     if (project.mailserver_id) {
//       const mailserverDoc = await Settings.findById(project.mailserver_id).select('name').lean();
//       if (mailserverDoc) {
//         project.mailserver_name = mailserverDoc.name;
//       }
//     }

//     if (project.pdf_templates && Array.isArray(project.pdf_templates)) {
//       project.pdf_templates = await Promise.all(project.pdf_templates.map(async (pdf_template) => {
//         const pdf_templateDoc = await PdfTemplate.findById(pdf_template).select('name description category status').lean();
//         if (pdf_templateDoc) {
//           return {
//             _id: pdf_templateDoc._id,
//             name: pdf_templateDoc.name,
//             description: pdf_templateDoc.description,
//             category: pdf_templateDoc.category,
//             status: pdf_templateDoc.status
//           };
//         }
//         return null; // Handle case where pdf template document doesn't exist
//       }));
//       // Filter out null values in case some pdf templates don't exist
//       project.pdf_templates = project.pdf_templates.filter(pdf_template => pdf_template !== null);
//     }

//     if (project.voipserver_id) {
//       const voipserverDoc = await Settings.findById(project.voipserver_id).select('name').lean();
//       if (voipserverDoc) {
//         project.voipserver_name = voipserverDoc.name;
//       }
//     }
//   }));

//   return {
//     data: projects,
//     meta: {
//       total,
//       page: parseInt(page),
//       limit: parseInt(limit),
//       totalPages: Math.ceil(total / limit),
//       hasNextPage: page < Math.ceil(total / limit),
//       hasPrevPage: page > 1,
//     },
//   };
// }

/**
 * Get project by ID
 * MATCHES MONOLITH: Returns exact same structure as production
 */
async function getProjectById(projectId) {
  const { Settings } = require('../models');

  const project = await Project.findById(projectId)
    .populate({
      path: 'banks',
      match: { is_allow: true }, // Only include banks where is_allow is true
      select: 'name nickName iban Ref provider is_allow is_default min_limit max_limit state bank_Country_Flag bank_country_code country logo',
      populate: [
        {
          path: 'provider',
          select: 'name login',
        },
        {
          path: 'logo',
          select: 'filetype filename path size type createdAt public_url public_slug',
        },
        {
          path: 'bank_country_flag',
          select: 'filetype filename path size type createdAt public_url public_slug',
        },
      ],
    })
    .populate('agents.user', 'login name email role active id info')
    .populate({ path: 'agents.mailservers', model: 'Settings', select: 'name info' })
    .populate({ path: 'agents.email_signature', select: 'filetype filename path size type public_url public_slug' })
    .populate('pdf_templates', 'name description category status')
    .populate({
      path: 'email_templates',
      match: { type: 'email_templates' },
    })
    .lean({ virtuals: true });

    logger.info('Project agents', project?.agents);
  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // MATCH MONOLITH: Add id field (same as _id)
  project.id = project._id.toString();

  // MATCH MONOLITH: Add id field to each bank
  if (project.banks && Array.isArray(project.banks)) {
    project.banks = project.banks.map(bank => ({
      ...bank,
      id: bank._id.toString()
    }));
  }

  // MATCH MONOLITH: Get mailserver name
  if (project.mailserver_id) {
    const mailserver = await Settings.findById(project.mailserver_id).lean();
    if (mailserver) {
      project.mailserver_name = mailserver.name;
    }
  }

  // MATCH MONOLITH: Get voipserver name
  if (project.voipserver_id) {
    const voipserver = await Settings.findById(project.voipserver_id).lean();
    if (voipserver) {
      project.voipserver_name = voipserver.name;
    }
  }

  // MATCH MONOLITH: Populate mailservers array with full objects (not just IDs)
  if (project.mailservers && Array.isArray(project.mailservers)) {
    const mailserverIds = project.mailservers.map(id => (id && id._id) ? id._id : id);
    const mailserverDocs = await Settings.find({
      _id: { $in: mailserverIds }
    }).select('name info').lean();

    project.mailservers = mailserverDocs.map(ms => ({
      _id: ms._id,
      id: ms._id?.toString?.() || ms._id,
      name: ms.name || '',
      info: ms.info || {}
    }));
  }

  // Collect agent mailserver IDs and email_signature IDs that may need manual population
  const agentMailserverIds = new Set();
  const agentEmailSignatureIds = [];

  // MATCH MONOLITH: Transform agents array to exact monolith structure
  if (project.agents && Array.isArray(project.agents)) {
    project.agents.forEach((agent, idx) => {
      if (agent.mailservers && Array.isArray(agent.mailservers)) {
        agent.mailservers.forEach(ms => {
          const isPopulated = ms && typeof ms === 'object' && 'name' in ms;
          if (!isPopulated && ms) {
            const id = (ms._id || ms).toString?.() || String(ms);
            if (mongoose.Types.ObjectId.isValid(id)) agentMailserverIds.add(id);
          }
        });
      }
      if (agent.email_signature && !agent.email_signature.filetype && !agent.email_signature.filename) {
        const id = (agent.email_signature._id || agent.email_signature).toString?.() || String(agent.email_signature);
        if (mongoose.Types.ObjectId.isValid(id)) {
          agentEmailSignatureIds.push(id);
        }
      }
    });

    // Batch fetch unpopulated agent mailservers
    let agentMailserverMap = new Map();
    if (agentMailserverIds.size > 0) {
      const agentMailserverDocs = await Settings.find({ _id: { $in: [...agentMailserverIds].map(id => new mongoose.Types.ObjectId(id)) } })
        .select('name info').lean();
      agentMailserverDocs.forEach(doc => {
        agentMailserverMap.set(doc._id.toString(), { _id: doc._id, id: doc._id.toString(), name: doc.name || '', info: doc.info || {} });
      });
    }

    // Batch fetch unpopulated agent email_signatures (ref Document)
    const { Document } = require('../models');
    let agentEmailSignatureMap = new Map();
    if (agentEmailSignatureIds.length > 0) {
      const agentEmailSignatureDocs = await Document.find({ _id: { $in: agentEmailSignatureIds.map(id => new mongoose.Types.ObjectId(id)) } })
        .select('filetype filename path size type public_url public_slug').lean();
      agentEmailSignatureDocs.forEach(doc => {
        agentEmailSignatureMap.set(doc._id.toString(), {
          _id: doc._id,
          id: doc._id.toString(),
          filetype: doc.filetype,
          filename: doc.filename,
          path: doc.path,
          size: doc.size,
          type: doc.type,
          public_url: doc.public_url || null,
          public_slug: doc.public_slug || null
        });
      });
    }

    project.agents = project.agents.map((agent, idx) => {
      // Transform to match monolith structure exactly
      const transformedAgent = {
        _id: agent._id,
        active: agent.active
      };

      // Add user object (monolith structure)
      if (agent.user) {
        transformedAgent.user = {
          _id: agent.user._id,
          id: agent.user.id,
          name: agent.user.login ? agent.user.login.toLowerCase() : agent.user.name,
          email: agent.user.info?.email || null,
          role: agent.user.role
        };
      }

      // Add alias_name
      transformedAgent.alias_name = agent.alias_name;

      // Add voip credentials if they exist (some agents have them)
      if (agent.voip_username !== undefined) {
        transformedAgent.voip_username = agent.voip_username || "";
      }
      if (agent.voip_password !== undefined) {
        transformedAgent.voip_password = agent.voip_password || "";
      }

      // Add populated mailservers (full objects with name, info) - use batch map if populate missed
      transformedAgent.mailservers = (agent.mailservers && Array.isArray(agent.mailservers))
        ? agent.mailservers.map(ms => {
            const isPopulated = ms && typeof ms === 'object' && 'name' in ms;
            if (isPopulated) {
              return {
                _id: ms._id,
                id: (ms._id || ms)?.toString?.() || '',
                name: ms.name || '',
                info: ms.info || {}
              };
            }
            const id = (ms._id || ms)?.toString?.() || '';
            return agentMailserverMap.get(id) || { _id: id, id, name: '', info: {} };
          })
        : [];

      // Add email_signature (populated Document ref) - use batch map if populate missed
      if (agent.email_signature) {
        const isPopulated = agent.email_signature.filetype != null || agent.email_signature.filename != null;
        if (isPopulated) {
          transformedAgent.email_signature = {
            _id: agent.email_signature._id,
            id: (agent.email_signature._id || agent.email_signature)?.toString?.() || '',
            filetype: agent.email_signature.filetype,
            filename: agent.email_signature.filename,
            path: agent.email_signature.path,
            size: agent.email_signature.size,
            type: agent.email_signature.type,
            public_url: agent.email_signature.public_url || null,
            public_slug: agent.email_signature.public_slug || null
          };
        } else {
          const id = (agent.email_signature._id || agent.email_signature)?.toString?.() || '';
          transformedAgent.email_signature = agentEmailSignatureMap.get(id) || {
            _id: id, id, filetype: null, filename: null, path: null, size: null, type: null, public_url: null, public_slug: null
          };
        }
      } else {
        transformedAgent.email_signature = null;
      }

      return transformedAgent;
    });
  }

  // MATCH MONOLITH: Add agentsCount field
  project.agentsCount = project.agents ? project.agents.length : 0;

  // Ensure email_templates is always present (may be missing for older documents)
  if (!project.email_templates) {
    project.email_templates = [];
  }

  return project;
}

/**
 * Create a new project
 */
async function createProject(projectData, creatorId) {
  // Handle mail servers - ensure primary is in array
  if (projectData.mailserver_id && !projectData.mailservers) {
    projectData.mailservers = [projectData.mailserver_id];
  } else if (projectData.mailserver_id && projectData.mailservers) {
    if (!projectData.mailservers.includes(projectData.mailserver_id)) {
      projectData.mailservers.push(projectData.mailserver_id);
    }
  }

  const project = new Project(projectData);
  await project.save();

  // Bidirectional sync: add this project to all selected email templates
  if (projectData.email_templates && projectData.email_templates.length > 0) {
    await Settings.updateMany(
      { _id: { $in: projectData.email_templates }, type: 'email_templates' },
      { $addToSet: { projects: project._id } }
    );
  }

  logger.info('Project created', { projectId: project._id, name: project.name, creatorId });

  // Emit event
  eventEmitter.emit(EVENT_TYPES.PROJECT.CREATED, {
    project: project.toObject(),
    creatorId,
  });

  // Return populated project
  return getProjectById(project._id);
}

/**
 * Update project
 */
async function updateProject(projectId, updateData, updaterId) {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Store original for comparison
  const original = project.toObject();

  // Parse banks if JSON string (from multipart form-data) - must be before field assignment
  if (updateData.banks !== undefined && typeof updateData.banks === 'string') {
    try {
      updateData.banks = JSON.parse(updateData.banks);
    } catch (e) {
      updateData.banks = updateData.banks ? [updateData.banks] : [];
    }
  }
  if (updateData.banks !== undefined && !Array.isArray(updateData.banks)) {
    updateData.banks = [];
  }

  // Update fields
  const allowedFields = [
    'name', 'description', 'active', 'project_alias', 'project_website',
    'project_email', 'project_phone', 'project_whatsapp', 'deport_link',
    'inbound_email', 'inbound_number', 'mailserver_id', 'mailservers',
    'voipserver_id', 'banks', 'pdf_templates', 'contract', 'confirmation_email',
    'color_code', 'email_templates',
    'outbound_cid', 'inbound_did', 'trunk_name'
  ];

  allowedFields.forEach(field => {
    if (updateData[field] !== undefined) {
      project[field] = updateData[field];
    }
  });

  // Handle mail servers sync
  if (updateData.mailservers) {
    if (!updateData.mailservers.includes(project.mailserver_id)) {
      project.mailserver_id = updateData.mailservers[0] || null;
    }
  }

  // Handle email_templates bidirectional sync
  if (updateData.email_templates !== undefined) {
    const oldTemplateIds = (original.email_templates || []).map(String);
    const newTemplateIds = (updateData.email_templates || []).map(String);

    const toAdd = newTemplateIds.filter(id => !oldTemplateIds.includes(id));
    const toRemove = oldTemplateIds.filter(id => !newTemplateIds.includes(id));

    if (toAdd.length > 0) {
      await Settings.updateMany(
        { _id: { $in: toAdd }, type: 'email_templates' },
        { $addToSet: { projects: projectId } }
      );
    }
    if (toRemove.length > 0) {
      await Settings.updateMany(
        { _id: { $in: toRemove }, type: 'email_templates' },
        { $pull: { projects: projectId } }
      );
    }
  }

  // Handle banks bidirectional sync (Project.banks <-> Bank.projects)
  if (updateData.banks !== undefined) {
    const banksArray = Array.isArray(updateData.banks) ? updateData.banks : [];
    const projectIdObj = typeof projectId === 'string' ? new mongoose.Types.ObjectId(projectId) : projectId;
    const oldBankIds = (original.banks || []).map((b) => (b && b.toString ? b.toString() : String(b)));
    const newBankIds = banksArray.map((b) => (b && b.toString ? b.toString() : String(b)));

    const banksToAdd = newBankIds.filter((id) => !oldBankIds.includes(id));
    const banksToRemove = oldBankIds.filter((id) => !newBankIds.includes(id));

    // Add project to new banks (bidirectional: update Bank.projects)
    if (banksToAdd.length > 0) {
      await Bank.updateMany(
        { _id: { $in: banksToAdd.map((id) => new mongoose.Types.ObjectId(id)) } },
        { $addToSet: { projects: projectIdObj } }
      );
      logger.debug(`Added project ${projectId} to ${banksToAdd.length} banks`);
    }
    // Remove project from removed banks (bidirectional: update Bank.projects)
    if (banksToRemove.length > 0) {
      await Bank.updateMany(
        { _id: { $in: banksToRemove.map((id) => new mongoose.Types.ObjectId(id)) } },
        { $pull: { projects: projectIdObj } }
      );
      logger.debug(`Removed project ${projectId} from ${banksToRemove.length} banks`);
    }
  }

  await project.save();

  logger.info('Project updated', { projectId, updaterId });

  // Emit event
  eventEmitter.emit(EVENT_TYPES.PROJECT.UPDATED, {
    projectId,
    changes: updateData,
    updaterId,
  });

  // Return populated project
  return getProjectById(projectId);
}

/**
 * Delete project (soft delete)
 */
async function deleteProject(projectId, deleterId) {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  project.active = false;
  await project.save();

  logger.info('Project deleted (soft)', { projectId, deleterId });

  // Emit event
  eventEmitter.emit(EVENT_TYPES.PROJECT.DELETED, {
    projectId,
    deleterId,
  });

  return { message: 'Project deactivated successfully', project: { _id: project._id, name: project.name, active: false } };
}

/**
 * Restore project
 */
async function restoreProject(projectId) {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  project.active = true;
  await project.save();

  logger.info('Project restored', { projectId });

  return { message: 'Project restored successfully', project: { _id: project._id, name: project.name, active: true } };
}

/**
 * Get agents for a project
 */
async function getProjectAgents(projectId) {
  const project = await Project.findById(projectId)
    .populate('agents.user', 'login name email role active')
    .populate('agents.attachment', 'filename path')
    .lean();

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  return {
    data: project.agents || [],
    meta: {
      total: project.agents ? project.agents.length : 0,
      projectId: project._id,
      projectName: project.name,
    },
  };
}

/**
 * Add agent to project
 */
async function addAgentToProject(projectId, agentData) {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Handle both user_id and user fields for compatibility
  const userId = agentData.user_id || agentData.user;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  // Check if agent already exists
  if (project.hasAgent(userId)) {
    throw new ValidationError('Agent already exists in this project');
  }

  if (!project.agents) {
    project.agents = [];
  }

  // Prepare agent data with proper user field
  const agentToAdd = {
    ...agentData,
    user: userId, // Ensure user field is set
    user_id: agentData.user_id, // Keep user_id for compatibility
    active: agentData.active !== false, // Default to true
  };

  project.agents.push(agentToAdd);
  await project.save();

  logger.info('Agent added to project', { projectId, userId });

  return { message: 'Agent added successfully', agent: agentToAdd };
}

/**
 * Update agent in project
 */
async function updateAgentInProject(projectId, agentId, updateData) {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  const agentIndex = project.agents.findIndex(
    a => a._id.toString() === agentId || a.user.toString() === agentId
  );

  if (agentIndex === -1) {
    throw new NotFoundError('Agent not found in project');
  }

  // Log the before state
  logger.info('Agent before update', { 
    projectId, 
    agentId, 
    agentIndex,
    currentAgent: project.agents[agentIndex].toObject(),
    updateData: updateData,
    updateKeys: Object.keys(updateData)
  });

  // Normalize mailserver_id -> agent.mailservers (array)
  if ('mailserver_id' in updateData) {
    const val = updateData.mailserver_id;
    if (val === null || val === undefined || val === '') {
      updateData.mailservers = [];
    } else if (mongoose.Types.ObjectId.isValid(val)) {
      updateData.mailservers = [new mongoose.Types.ObjectId(val)];
    } else {
      throw new ValidationError('mailserver_id must be a valid Settings ID');
    }
    delete updateData.mailserver_id; // Don't write to schema; we use mailservers
  }

  // Normalize email_signature: cast ID to ObjectId (ref Document), allow null to clear
  if ('email_signature' in updateData) {
    const val = updateData.email_signature;
    if (val === null || val === undefined || val === '') {
      updateData.email_signature = null;
    } else if (mongoose.Types.ObjectId.isValid(val)) {
      updateData.email_signature = new mongoose.Types.ObjectId(val);
    } else {
      throw new ValidationError('email_signature must be a valid Document ID');
    }
  }

  // Update agent fields
  Object.keys(updateData).forEach(key => {
    logger.info(`Updating field: ${key}`, { 
      oldValue: project.agents[agentIndex][key], 
      newValue: updateData[key],
      type: typeof updateData[key]
    });
    project.agents[agentIndex][key] = updateData[key];
  });

  // Mark the agents array as modified to ensure Mongoose detects the change
  project.markModified('agents');

  // Log the after state before save
  logger.info('Agent after update (before save)', { 
    projectId, 
    agentId,
    updatedAgent: project.agents[agentIndex].toObject()
  });

  await project.save();

  // Log the final state after save
  const savedProject = await Project.findById(projectId);
  const savedAgent = savedProject.agents.find(
    a => a._id.toString() === agentId || a.user.toString() === agentId
  );
  
  logger.info('Agent after save', { 
    projectId, 
    agentId,
    savedAgent: savedAgent.toObject()
  });

  return { message: 'Agent updated successfully', agent: project.agents[agentIndex] };
}

/**
 * Remove agent from project
 */
async function removeAgentFromProject(projectId, agentId) {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  const initialCount = project.agents.length;

  project.agents = project.agents.filter(
    a => a._id.toString() !== agentId && a.user.toString() !== agentId
  );

  if (project.agents.length === initialCount) {
    throw new NotFoundError('Agent not found in project');
  }

  await project.save();

  logger.info('Agent removed from project', { projectId, agentId });

  return { message: 'Agent removed successfully' };
}

/**
 * Get projects for a specific agent
 */
async function getAgentProjects(userId, { page = 1, limit = 50, showInactive = false }) {
  const skip = (page - 1) * limit;

  const query = {
    'agents.user': userId,
    'agents.active': true,
  };

  if (!showInactive) {
    query.active = true;
  }

  const total = await Project.countDocuments(query);

  const projects = await Project.find(query)
    .select('name description active project_email project_phone createdAt updatedAt')
    .sort('-updatedAt')
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  return {
    data: projects,
    meta: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  getAllUserProjects,
  // getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  restoreProject,
  getProjectAgents,
  addAgentToProject,
  updateAgentInProject,
  removeAgentFromProject,
  getAgentProjects,
};

