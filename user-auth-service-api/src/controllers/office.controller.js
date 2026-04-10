/**
 * Office Controller
 * Handles office CRUD and employee assignment API requests (functional).
 * Responses are permission-based: data and included permissions reflect the user's role.
 */
const Office = require('../models/Office.model');
const officeService = require('../services/office.service');
const { hasPermission } = require('../auth/middleware/authorize');
const { PERMISSIONS } = require('../auth/roles/permissions');
const { eventEmitter, EVENT_TYPES } = require('../utils/events');

/**
 * Resolve office-related permissions for the current user.
 */
async function getOfficePermissions(req) {
  const role = req.user && req.user.role;
  if (!role) {
    return {
      canReadAll: false,
      canReadAssigned: false,
      canUpdate: false,
      canDelete: false,
      canManageEmployees: false,
      canManageWorkingHours: false,
    };
  }
  const [
    canReadAll,
    canReadAssigned,
    canUpdate,
    canDelete,
    canManageEmployees,
    canManageWorkingHours,
  ] = await Promise.all([
    hasPermission(role, PERMISSIONS.OFFICE_READ_ALL),
    hasPermission(role, PERMISSIONS.OFFICE_READ_ASSIGNED),
    hasPermission(role, PERMISSIONS.OFFICE_UPDATE),
    hasPermission(role, PERMISSIONS.OFFICE_DELETE),
    hasPermission(role, PERMISSIONS.OFFICE_MANAGE_EMPLOYEES),
    hasPermission(role, PERMISSIONS.OFFICE_MANAGE_WORKING_HOURS),
  ]);
  return {
    canReadAll,
    canReadAssigned,
    canUpdate,
    canDelete,
    canManageEmployees,
    canManageWorkingHours,
  };
}

/**
 * Build permissions object for API response (what the user can do).
 */
function buildResponsePermissions(perms) {
  return {
    office: {
      readAll: perms.canReadAll,
      readAssigned: perms.canReadAssigned,
      update: perms.canUpdate,
      delete: perms.canDelete,
      manageEmployees: perms.canManageEmployees,
      manageWorkingHours: perms.canManageWorkingHours,
    },
  };
}

async function create(req, res) {
  try {
    const office = await officeService.createOffice(req.body, req.user && req.user._id);
    const permissions = await getOfficePermissions(req);
    return res.status(201).json({
      success: true,
      message: 'Office created successfully',
      data: office,
      permissions: buildResponsePermissions(permissions),
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
}

async function getAll(req, res) {
  try {
    const permissions = await getOfficePermissions(req);
    const { country, active, page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (country != null && country !== '') filter.country = country.toUpperCase();
    if (active !== undefined) filter.active = active === 'true';

    const pageNum = Number.parseInt(page, 10) || 1;
    const limitNum = Number.parseInt(limit, 10) || 20;
    const assignedOnly = permissions.canReadAssigned && !permissions.canReadAll;
    const userId = req.user && req.user._id;

    const { offices, pagination } = await officeService.getOfficesList(filter, {
      page: pageNum,
      limit: limitNum,
      assignedOnly,
      userId,
      search: search != null && search !== '' ? search : undefined,
    });

    const useLimitedFields = assignedOnly;
    const data = useLimitedFields
      ? offices.map((o) => officeService.toLimitedOfficeFields(o))
      : offices;

    return res.status(200).json({
      success: true,
      data,
      pagination,
      permissions: buildResponsePermissions(permissions),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getById(req, res) {
  try {
    const permissions = await getOfficePermissions(req);
    const office = await Office.findById(req.params.id)
      .populate('employees', 'login email role')
      .populate('manager_id', 'login email');
    if (!office) {
      return res.status(404).json({ success: false, error: 'Office not found' });
    }

    const canAccessAll = permissions.canReadAll;
    const canAccessAssigned = permissions.canReadAssigned;
    if (!canAccessAll && !canAccessAssigned) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (!canAccessAll && canAccessAssigned) {
      const inOffice = await officeService.isUserInOffice(req.user._id, req.params.id);
      if (!inOffice) {
        return res.status(403).json({
          success: false,
          error: 'You can only view offices you are assigned to',
        });
      }
    }

    const useLimitedFields = canAccessAssigned && !canAccessAll;
    const fullData = office.toObject ? office.toObject() : office;
    const data = useLimitedFields ? officeService.toLimitedOfficeFields(office) : fullData;

    return res.status(200).json({
      success: true,
      data,
      permissions: buildResponsePermissions(permissions),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function update(req, res) {
  try {
    const updatePayload = { ...req.body, updated_by: req.user && req.user._id };
    delete updatePayload._id;
    delete updatePayload.created_at;
    delete updatePayload.createdAt;
    const office = await Office.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    });
    if (!office) {
      return res.status(404).json({ success: false, error: 'Office not found' });
    }
    const permissions = await getOfficePermissions(req);
    return res.status(200).json({
      success: true,
      data: office,
      permissions: buildResponsePermissions(permissions),
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
}

async function deleteOffice(req, res) {
  try {
    const office = await Office.findByIdAndUpdate(
      req.params.id,
      { active: false, updated_by: req.user && req.user._id },
      { new: true }
    );
    if (!office) {
      return res.status(404).json({ success: false, error: 'Office not found' });
    }
    const permissions = await getOfficePermissions(req);
    return res.status(200).json({
      success: true,
      message: 'Office deactivated successfully',
      permissions: buildResponsePermissions(permissions),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function assignEmployee(req, res) {
  try {
    const { officeId } = req.params;
    const { userId, userIds, setPrimary } = req.body;

    // Multiple users: { userIds: string[] }
    const ids = Array.isArray(userIds) && userIds.length > 0
      ? userIds.filter((id) => id != null && String(id).trim())
      : null;

    if (ids && ids.length > 0) {
      const result = await officeService.bulkAssignUsers(ids, officeId);
      if (result.assigned > 0 && result.office) {
        eventEmitter.emit(EVENT_TYPES.OFFICE.MEMBER_ASSIGNED, {
          office: result.office,
          assignedUserIds: result.assignedUserIds || [],
          assignedBy: req.user,
        });
      }
      const permissions = await getOfficePermissions(req);
      return res.status(200).json({
        success: true,
        assigned: result.assigned,
        message: result.assigned === 1
          ? '1 member assigned'
          : `${result.assigned} members assigned`,
        permissions: buildResponsePermissions(permissions),
      });
    }

    // Single user: { userId: string, setPrimary?: boolean }
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId or userIds (array) is required',
      });
    }
    const result = await officeService.assignUserToOffice(
      userId,
      officeId,
      setPrimary === true || setPrimary === 'true'
    );
    if (result.success && result.user && result.office && !result.alreadyAssigned) {
      eventEmitter.emit(EVENT_TYPES.OFFICE.MEMBER_ASSIGNED, {
        office: result.office,
        user: result.user,
        assignedBy: req.user,
      });
    }
    const permissions = await getOfficePermissions(req);
    return res.status(200).json({
      success: true,
      ...result,
      permissions: buildResponsePermissions(permissions),
    });
  } catch (error) {
    const status =
      error.message === 'Office not found or inactive' ||
      error.message === 'User not found' ||
      error.message === 'Office is at capacity'
        ? 400
        : 500;
    return res.status(status).json({ success: false, error: error.message });
  }
}

async function removeEmployee(req, res) {
  try {
    const { officeId, userId } = req.params;
    await officeService.removeUserFromOffice(userId, officeId);
    const permissions = await getOfficePermissions(req);
    return res.status(200).json({
      success: true,
      message: 'Employee removed from office',
      permissions: buildResponsePermissions(permissions),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getEmployees(req, res) {
  try {
    const permissions = await getOfficePermissions(req);
    const { officeId } = req.params;
    if (permissions.canReadAssigned && !permissions.canReadAll) {
      const inOffice = await officeService.isUserInOffice(req.user._id, officeId);
      if (!inOffice) {
        return res.status(403).json({
          success: false,
          error: 'You can only view employees of offices you are assigned to',
        });
      }
    }
    const { page, limit, role, sortBy, sortOrder } = req.query;
    const result = await officeService.getOfficeEmployees(officeId, {
      page,
      limit,
      role,
      sortBy,
      sortOrder,
    });
    return res.status(200).json({
      success: true,
      ...result,
      permissions: buildResponsePermissions(permissions),
    });
  } catch (error) {
    const status = error.message === 'Office not found' ? 404 : 500;
    return res.status(status).json({ success: false, error: error.message });
  }
}

async function updateWorkingHours(req, res) {
  try {
    const { officeId } = req.params;
    const office = await officeService.updateOfficeWorkingHours(officeId, req.body);
    const permissions = await getOfficePermissions(req);
    return res.status(200).json({
      success: true,
      data: office,
      permissions: buildResponsePermissions(permissions),
    });
  } catch (error) {
    const status = error.message === 'Office not found' ? 404 : 400;
    return res.status(status).json({ success: false, error: error.message });
  }
}

async function getStatistics(req, res) {
  try {
    const permissions = await getOfficePermissions(req);
    if (!permissions.canReadAll) {
      return res.status(403).json({
        success: false,
        error: 'You need read-all permission to view office statistics',
      });
    }
    const stats = await officeService.getOfficeStatistics(req.params.officeId);
    return res.status(200).json({
      success: true,
      data: stats,
      permissions: buildResponsePermissions(permissions),
    });
  } catch (error) {
    const status = error.message === 'Office not found' ? 404 : 500;
    return res.status(status).json({ success: false, error: error.message });
  }
}

module.exports = {
  create,
  getAll,
  getById,
  update,
  delete: deleteOffice,
  assignEmployee,
  removeEmployee,
  getEmployees,
  updateWorkingHours,
  getStatistics,
};
