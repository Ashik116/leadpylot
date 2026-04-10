/**
 * Office Service
 * Business logic for office CRUD and user-office assignments (functional)
 */
const Office = require('../models/Office.model');
const User = require('../models/User');
const mongoose = require('mongoose');
const { eventEmitter, EVENT_TYPES } = require('../utils/events');

const OPTIONAL_OFFICE_FIELDS = [
  'country',
  'timezone',
  'capacity',
  'address',
  'contact',
  'manager_id',
  'notes',
  'weekend_days',
  'working_hours',
  'special_dates',
];

/**
 * Create office. Only name is required; all other fields optional.
 */
async function createOffice(data, createdBy = null) {
  if (!data.name || !String(data.name).trim()) {
    throw new Error('Office name is required');
  }
  const officeData = { name: data.name.trim() };
  OPTIONAL_OFFICE_FIELDS.forEach((field) => {
    if (data[field] !== undefined && data[field] !== null) {
      officeData[field] = data[field];
    }
  });
  if (createdBy) officeData.created_by = createdBy;
  const office = await Office.create(officeData);
  eventEmitter.emit(EVENT_TYPES.OFFICE.CREATED, {
    office,
    createdBy,
  });
  return office;
}

/**
 * Assign user to office (and optionally set as primary).
 * No transaction (works on standalone MongoDB; transactions require replica set).
 */
async function assignUserToOffice(userId, officeId, setPrimary = false) {
  const office = await Office.findOne({ _id: officeId, active: true });
  if (!office) {
    throw new Error('Office not found or inactive');
  }
  if (office.capacity != null && office.employees.length >= office.capacity) {
    throw new Error('Office is at capacity');
  }
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  if (office.hasEmployee(userId)) {
    const updatedOffice = await Office.findById(officeId).populate('employees', 'login email role');
    const updatedUser = await User.findById(userId).populate('offices', 'name');
    return { success: true, office: updatedOffice, user: updatedUser, alreadyAssigned: true };
  }
  await Office.findByIdAndUpdate(officeId, { $addToSet: { employees: userId } });
  const userUpdate = setPrimary
    ? { $addToSet: { offices: officeId }, $set: { primary_office: officeId } }
    : { $addToSet: { offices: officeId } };
  await User.findByIdAndUpdate(userId, userUpdate);
  const updatedOffice = await Office.findById(officeId).populate('employees', 'login email role');
  const updatedUser = await User.findById(userId).populate('offices', 'name');
  return { success: true, office: updatedOffice, user: updatedUser };
}

/**
 * Remove user from office.
 * No transaction (works on standalone MongoDB; transactions require replica set).
 */
async function removeUserFromOffice(userId, officeId) {
  await Office.findByIdAndUpdate(officeId, { $pull: { employees: userId } });
  const user = await User.findById(userId).select('primary_office offices').lean();
  if (user && user.primary_office && user.primary_office.toString() === officeId.toString()) {
    await User.findByIdAndUpdate(userId, { $pull: { offices: officeId }, $set: { primary_office: null } });
  } else {
    await User.findByIdAndUpdate(userId, { $pull: { offices: officeId } });
  }
  return { success: true };
}

/**
 * Bulk assign users to office.
 * No transaction (works on standalone MongoDB; transactions require replica set).
 */
async function bulkAssignUsers(userIds, officeId) {
  const office = await Office.findOne({ _id: officeId, active: true });
  if (!office) {
    throw new Error('Office not found or inactive');
  }
  const capacity = office.capacity == null ? Infinity : office.capacity;
  const currentCount = office.employees.length;
  const slots = Math.max(0, capacity - currentCount);
  const toAdd = userIds.slice(0, slots);
  if (toAdd.length === 0 && userIds.length > 0) {
    throw new Error('Office is at capacity');
  }
  await Office.findByIdAndUpdate(officeId, { $addToSet: { employees: { $each: toAdd } } });
  await User.updateMany({ _id: { $in: toAdd } }, { $addToSet: { offices: officeId } });
  const updatedOffice = await Office.findById(officeId).select('_id name').lean();
  return { success: true, assigned: toAdd.length, assignedUserIds: toAdd, office: updatedOffice };
}

/**
 * Get user's offices (populated).
 */
async function getUserOffices(userId) {
  const user = await User.findById(userId).populate('offices').populate('primary_office', 'name');
  return user ? user.offices || [] : [];
}

/**
 * Get office employees with pagination and optional filters.
 */
async function getOfficeEmployees(officeId, options = {}) {
  const { page = 1, limit = 20, role, sortBy = 'login', sortOrder = 'asc' } = options;
  const office = await Office.findById(officeId);
  if (!office) throw new Error('Office not found');
  const query = { _id: { $in: office.employees || [] }, active: true };
  if (role) query.role = role;
  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
  const [users, total] = await Promise.all([
    User.find(query).select('login email role').sort(sort).skip(skip).limit(limit).lean(),
    User.countDocuments(query),
  ]);
  return {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Update office working hours.
 */
async function updateOfficeWorkingHours(officeId, workingHours) {
  const office = await Office.findByIdAndUpdate(
    officeId,
    { $set: { working_hours: workingHours } },
    { new: true, runValidators: true }
  );
  if (!office) throw new Error('Office not found');
  return office;
}

/**
 * Get office statistics (permission-based: caller should check OFFICE_READ_ALL or similar).
 */
async function getOfficeStatistics(officeId) {
  const office = await Office.findById(officeId).populate('employees', 'role');
  if (!office) throw new Error('Office not found');
  const employees = office.employees || [];
  const roleCounts = {};
  employees.forEach((e) => {
    const r = e.role || 'Unknown';
    roleCounts[r] = (roleCounts[r] || 0) + 1;
  });
  const total = employees.length;
  const capacity = office.capacity == null ? 0 : office.capacity;
  const utilization = capacity > 0 ? Math.round((total / capacity) * 100) : 0;
  return {
    totalEmployees: total,
    capacity,
    utilizationPercent: utilization,
    roleDistribution: roleCounts,
  };
}

/** Fields allowed for limited (assigned-only) scope */
const LIMITED_OFFICE_FIELDS = [
  '_id',
  'name',
  'country',
  'timezone',
  'active',
  'employee_count',
  'capacity',
  'createdAt',
];

/**
 * Reduce office document(s) to limited fields for permission-based response.
 */
function toLimitedOfficeFields(doc) {
  if (!doc) return doc;
  const plain = doc.toObject ? doc.toObject({ virtuals: true }) : doc;
  const limited = {};
  LIMITED_OFFICE_FIELDS.forEach((key) => {
    if (plain[key] !== undefined) limited[key] = plain[key];
  });
  if (limited.employee_count === undefined && Array.isArray(plain.employees)) {
    limited.employee_count = plain.employees.length;
  }
  return limited;
}

/**
 * Get offices list with optional permission-based filter (assigned only), search, and field scope.
 */
async function getOfficesList(filter, options = {}) {
  const { page = 1, limit = 20, assignedOnly = false, userId = null, search } = options;
  const query = { ...filter };
  if (assignedOnly && userId) {
    const user = await User.findById(userId).select('offices').lean();
    const officeIds = (user && user.offices) || [];
    if (officeIds.length === 0) return { offices: [], pagination: { page: 1, limit, total: 0, pages: 0 } };
    query._id = { $in: officeIds };
  }
  if (search && String(search).trim()) {
    const term = String(search).trim();
    const regex = new RegExp(term, 'i');
    query.$or = [
      { name: regex },
      { country: regex },
      { timezone: regex },
    ];
  }
  const skip = (page - 1) * limit;
  const [offices, total] = await Promise.all([
    Office.find(query)
      .populate('manager_id', 'login email')
      .populate('employees', 'login info.name info.email')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Office.countDocuments(query),
  ]);
  return {
    offices,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

/**
 * Check if user is assigned to office (by employees or user.offices).
 */
async function isUserInOffice(userId, officeId) {
  const [office, user] = await Promise.all([
    Office.findById(officeId).select('employees').lean(),
    User.findById(userId).select('offices').lean(),
  ]);
  if (!office || !user) return false;
  const inEmployees = (office.employees || []).some((id) => id.toString() === userId.toString());
  const inUserOffices = (user.offices || []).some((id) => id.toString() === officeId.toString());
  return inEmployees || inUserOffices;
}

module.exports = {
  createOffice,
  assignUserToOffice,
  removeUserFromOffice,
  bulkAssignUsers,
  getUserOffices,
  getOfficeEmployees,
  updateOfficeWorkingHours,
  getOfficeStatistics,
  toLimitedOfficeFields,
  getOfficesList,
  isUserInOffice,
};
