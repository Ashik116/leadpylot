const mongoose = require('mongoose');
const { filterRestrictedBanks } = require('./FilterRestrictedBanks');
const { Settings } = require('../models');


const transformTeamToProject = async (
  team,
  currentUser = null,
  hasPermissionFn = null,
  permissions = null
) => {
  try {
    // Create base project object from team
    const project = {
      _id: team._id,
      id: team.id || team._id,
      name: team.name || '',
      description: team.description || '',
      active: team.active,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      project_website: team.project_website || '',
      deport_link: team.deport_link || '',
      inbound_email: team.inbound_email || '',
      inbound_number: team.inbound_number || '',
      contract: team.contract || null,
      confirmation_email: team.confirmation_email || null,
      color_code: team.color_code || null,
    };

    // Add additional fields if they exist
    if (team.mailserver_id) {
      // Check if mailserver_id is an object with name property (populated)
      if (typeof team.mailserver_id === 'object' && team.mailserver_id !== null) {
        project.mailserver_id = team.mailserver_id._id || team.mailserver_id;
        project.mailserver_name = team.mailserver_id.name || '';
      } else {
        project.mailserver_id = team.mailserver_id;
        project.mailserver_name = '';
      }
    }

    if (team.voipserver_id) {
      // Check if voipserver_id is an object with name property (populated)
      if (typeof team.voipserver_id === 'object' && team.voipserver_id !== null) {
        project.voipserver_id = team.voipserver_id._id || team.voipserver_id;
        project.voipserver_name = team.voipserver_id.name || '';
      } else {
        // If not populated, fetch the voipserver name
        project.voipserver_id = team.voipserver_id;
        try {
          const voipserver = await Settings.findById(team.voipserver_id).select('name').lean();
          project.voipserver_name = voipserver?.name || '';
        } catch (error) {
          project.voipserver_name = '';
        }
      }
    }

    // Add banks array if it exists
    if (team.banks && team.banks.length > 0) {
      // Apply agent access filtering only for agents (not admins)
      let filteredBanks = team.banks;
      if (currentUser && currentUser.role === 'Agent') {
        filteredBanks = filterRestrictedBanks(team.banks, currentUser);
      }
      
      // Banks should already be populated at this point
      // Sort banks by state: active banks first, blocked/stop banks last
      const sortedBanks = filteredBanks.sort((a, b) => {
        const stateA = a.state || 'active';
        const stateB = b.state || 'active';

        // Active banks first
        if (stateA === 'active' && stateB !== 'active') return -1;
        if (stateB === 'active' && stateA !== 'active') return 1;

        // If both are active or both are non-active, sort by bank name
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB);
      });

      project.banks = sortedBanks.map((bank) => ({
        _id: bank._id ? bank._id.toString() : null,
        id: bank.id || (bank._id ? bank._id.toString() : null),
        name: bank.name || '',
        nickName: bank.nickName || null,
        iban: bank.iban || null,
        Ref: bank.Ref || null,
        provider: bank.provider && typeof bank.provider === 'object'
          ? { name: bank.provider.name || null, login: bank.provider.login || null }
          : null,
        is_default: !!bank.is_default,
        is_allow: bank.is_allow !== undefined ? bank.is_allow : true,
        min_limit: bank.min_limit || null,
        max_limit: bank.max_limit || null,
        state: bank.state || 'active',
        bank_country_flag: bank.bank_country_flag || null,
        bank_country_code: bank.bank_country_code || null,
        country: bank.country || null,
        logo: bank.logo || null,
      }));
    } else {
      project.banks = [];
    }

    // Process agents if the field exists
    if (team.agents && team.agents.length > 0) {
      let agentsToProcess = team.agents;

      // Filter agents based on user permissions
      if (currentUser && hasPermissionFn && permissions) {
        if (await hasPermissionFn(currentUser.role, permissions.PROJECT_READ_ALL)) {
          // Admin can see all agents
          agentsToProcess = team.agents;
        } else if (await hasPermissionFn(currentUser.role, permissions.PROJECT_READ)) {
          // Agent can only see their own agent data
          const userObjectId = mongoose.Types.ObjectId.isValid(currentUser._id)
            ? new mongoose.Types.ObjectId(currentUser._id)
            : currentUser._id;
          agentsToProcess = team.agents.filter(
            (agent) =>
              agent.user && agent.user._id && agent.user._id.toString() === userObjectId.toString()
          );
        }
      }

      project.agents = await Promise.all(
        agentsToProcess.map(async (agent) => {
          // Ensure user data is properly formatted
          if (agent.user) {
            // Just use _id for id to avoid Buffer issues
            if (agent.user._id) {
              const idStr = agent.user._id.toString();
              agent.user._id = idStr;
              agent.user.id = idStr; // Set id to be the same as _id string
            } else {
              // If no _id, set both to null
              agent.user._id = null;
              agent.user.id = null;
            }
          }

          // Create agent object with user data if possible
          return createAgentResponse(agent, agent.user);
        })
      );

      // Add agent count - use original count for admins, filtered count for agents
      if (
        currentUser &&
        hasPermissionFn &&
        permissions &&
        !await hasPermissionFn(currentUser.role, permissions.PROJECT_READ_ALL)
      ) {
        project.agentsCount = agentsToProcess.length;
      } else {
        project.agentsCount = team.agents.length;
      }
    } else {
      project.agents = [];
      project.agentsCount = 0;
    }

    // Add mailservers info
    if (team.mailservers && team.mailservers.length > 0) {
      // Check if mailservers are populated or just IDs
      const mailserverIdsToFetch = [];
      const mailserverMap = new Map();
      
      team.mailservers.forEach((ms, idx) => {
        if (typeof ms === 'object' && ms !== null && ms._id) {
          // Already populated
          mailserverMap.set(idx, {
            _id: ms._id.toString(),
            name: ms.name || '',
            info: ms.info || {},
          });
        } else {
          // Need to fetch - collect the ID
          const mailId = ms.toString();
          mailserverIdsToFetch.push({ idx, id: mailId });
        }
      });
      
      // Fetch unpopulated mailservers in batch if needed
      if (mailserverIdsToFetch.length > 0) {
        try {
          const mailserverIds = mailserverIdsToFetch.map(item => new mongoose.Types.ObjectId(item.id));
          const mailservers = await Settings.find({
            _id: { $in: mailserverIds }
          }).select('name info').lean();
          
          const mailserverDataMap = new Map();
          mailservers.forEach(mail => {
            mailserverDataMap.set(mail._id.toString(), {
              _id: mail._id.toString(),
              name: mail.name || '',
              info: mail.info || {},
            });
          });
          
          // Map fetched data to indices
          mailserverIdsToFetch.forEach(({ idx, id }) => {
            mailserverMap.set(idx, mailserverDataMap.get(id) || {
              _id: id,
              name: '',
              info: {},
            });
          });
        } catch (error) {
          // If fetch fails, create empty entries
          mailserverIdsToFetch.forEach(({ idx, id }) => {
            if (!mailserverMap.has(idx)) {
              mailserverMap.set(idx, {
                _id: id,
                name: '',
                info: {},
              });
            }
          });
        }
      }
      
      // Build the mailservers array in order
      project.mailservers = team.mailservers.map((ms, idx) => {
        if (mailserverMap.has(idx)) {
          return mailserverMap.get(idx);
        }
        // Fallback if something went wrong
        return {
          _id: typeof ms === 'object' && ms?._id ? ms._id.toString() : ms.toString(),
          name: '',
          info: {},
        };
      });
    } else {
      project.mailservers = [];
    }

    // Add pdf templates info
    if (team.pdf_templates && team.pdf_templates.length > 0) {
      project.pdf_templates = team.pdf_templates.map((pdf) => ({
        _id: pdf._id?.toString() || null,
        name: pdf.name || '',
        description: pdf.description || '',
        category: pdf.category || '',
        status: pdf.status || '',
      }));
    } else {
      project.pdf_templates = [];
    }

    // Add email templates info
    if (team.email_templates && team.email_templates.length > 0) {
      project.email_templates = team.email_templates
        .filter(Boolean)
        .map((et) => ({
          _id: et._id?.toString() || null,
          name: et.name || '',
          gender_type: et.gender_type || null,
        }));
    } else {
      project.email_templates = [];
    }

    return project;
  } catch (error) {
    console.error('Error transforming team to project:', error);
    throw error;
  }
};



const createAgentResponse = (agent, user) => {
    const response = {
      _id: agent._id,
      active: agent.active,
    };
  
    // Add user information if available
    if (user) {
      if (typeof user === 'object') {
        response.user = {
          _id: user._id || agent.user,
          id: user.id || agent.user_id,
          name: user.name || user.login || 'Unknown',
          email: user.email || null,
          role: user.role || 'agent',
        };
      } else {
        response.user = {
          _id: agent.user,
          id: agent.user_id,
          name: 'Unknown',
        };
      }
    } else {
      response.user_id = agent.user_id;
      response.user = agent.user;
    }
  
    // Add attachment information if available
    if (agent.attachment) {
      response.attachment = agent.attachment;
    }
  
    // Add all additional agent fields
    const additionalFields = [
      'alias_name',
      'email_address',
      'email_password',
      'voip_username',
      'voip_password',
      'alias_phone_number',
    ];
  
    additionalFields.forEach((field) => {
      if (agent[field] !== undefined) {
        response[field] = agent[field];
      }
    });

    // Add populated mailservers (full objects with name, info)
    if (agent.mailservers && Array.isArray(agent.mailservers)) {
      response.mailservers = agent.mailservers.map((ms) => {
        const isPopulated = ms && typeof ms === 'object' && 'name' in ms;
        if (isPopulated) {
          return {
            _id: ms._id?.toString?.() || ms._id,
            id: (ms._id || ms)?.toString?.() || '',
            name: ms.name || '',
            info: ms.info || {},
          };
        }
        return {
          _id: (ms._id || ms)?.toString?.() || '',
          id: (ms._id || ms)?.toString?.() || '',
          name: '',
          info: {},
        };
      });
    } else {
      response.mailservers = [];
    }
  
    return response;
  };
  


  module.exports = {
    transformTeamToProject,
    createAgentResponse,
  };
  