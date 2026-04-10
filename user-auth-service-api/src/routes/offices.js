/**
 * Office Routes
 * All routes require authentication. Create/update/delete require Admin or Manager permissions.
 */
const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/office.controller');
const { authenticate } = require('../auth/middleware/authenticate');
const { authorize, authorizeAny } = require('../auth/middleware/authorize');
const { PERMISSIONS } = require('../auth/roles/permissions');

const OFFICE_READ_PERMISSIONS = [
  PERMISSIONS.OFFICE_READ_ASSIGNED,
  PERMISSIONS.OFFICE_READ,
  PERMISSIONS.OFFICE_READ_ALL,
];

router.use(authenticate);

// List offices – permission-based: READ_ALL sees all, READ_ASSIGNED sees only assigned offices
router.get('/', authorizeAny(OFFICE_READ_PERMISSIONS), getAll);

// Nested routes first (/:officeId/...)
router.get(
  '/:officeId/employees',
  authorizeAny(OFFICE_READ_PERMISSIONS),
  getEmployees
);
router.get(
  '/:officeId/statistics',
  authorize(PERMISSIONS.OFFICE_READ_ALL),
  getStatistics
);

router.put(
  '/:officeId/working-hours',
  authorize(PERMISSIONS.OFFICE_MANAGE_WORKING_HOURS),
  updateWorkingHours
);
router.post(
  '/:officeId/employees',
  authorize(PERMISSIONS.OFFICE_MANAGE_EMPLOYEES),
  assignEmployee
);
router.delete(
  '/:officeId/employees/:userId',
  authorize(PERMISSIONS.OFFICE_MANAGE_EMPLOYEES),
  removeEmployee
);

// Single office by :id – permission-based response (full vs limited fields)
router.get(
  '/:id',
  authorizeAny(OFFICE_READ_PERMISSIONS),
  getById
);
router.post('/', authorize(PERMISSIONS.OFFICE_CREATE), create);
router.put(
  '/:id',
  authorize(PERMISSIONS.OFFICE_UPDATE),
  update
);
router.delete(
  '/:id',
  authorize(PERMISSIONS.OFFICE_DELETE),
  deleteOffice
);

module.exports = router;
