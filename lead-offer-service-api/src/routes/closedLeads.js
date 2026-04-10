const express = require('express');
const router = express.Router();
const ClosedLead = require('../models/ClosedLead');
const { authenticate } = require('../middleware');
const { authorizeAny } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const logger = require('../helpers/logger');
const { enrichClosedLeadsWithCurrentStatus } = require('../utils/closedLeadCurrentStatus');

const authPerms = [PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL];

/**
 * @route GET /closed-leads
 * @desc List closed leads with pagination, filtering, and sorting.
 *       Also supports universalQuery middleware for grouping/domain filtering
 *       when groupBy or domain query params are present.
 */
router.get('/', authorizeAny(authPerms), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 80,
      sortBy = 'closed_at',
      sortOrder = 'desc',
      search,
      closeLeadStatus,
      closed_project_id,
      is_reverted,
    } = req.query;

    const query = {};

    if (is_reverted === undefined || is_reverted === null) {
      query.is_reverted = false;
    } else {
      query.is_reverted = is_reverted === 'true';
    }

    if (closeLeadStatus) {
      query.closeLeadStatus = closeLeadStatus.toLowerCase();
    }

    if (closed_project_id) {
      const mongoose = require('mongoose');
      query.closed_project_id = new mongoose.Types.ObjectId(closed_project_id);
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { contact_name: searchRegex },
        { email_from: searchRegex },
        { phone: searchRegex },
        { lead_source_no: searchRegex },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [leads, total] = await Promise.all([
      ClosedLead.find(query)
        .populate('team_id', '_id name')
        .populate('user_id', '_id login')
        .populate('source_id', '_id name price active color')
        .populate('closed_project_id', '_id name')
        .populate('closed_by_user_id', '_id login')
        .populate('prev_team_id', '_id name')
        .populate('prev_user_id', '_id login')
        .populate('source_user_id', '_id login')
        .populate('source_team_id', '_id name')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ClosedLead.countDocuments(query),
    ]);

    const data = await enrichClosedLeadsWithCurrentStatus(leads);

    res.json({
      success: true,
      data,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Error listing closed leads:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /closed-leads/:id
 * @desc Get a single closed lead by ID
 */
router.get('/:id', authorizeAny(authPerms), async (req, res) => {
  try {
    const lead = await ClosedLead.findById(req.params.id)
      .populate('team_id', '_id name')
      .populate('user_id', '_id login')
      .populate('source_id', '_id name price active color')
      .populate('closed_project_id', '_id name')
      .populate('closed_by_user_id', '_id login')
      .populate('prev_team_id', '_id name')
      .populate('prev_user_id', '_id login')
      .populate('source_user_id', '_id login')
      .populate('source_team_id', '_id name')
      .lean();

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Closed lead not found' });
    }

    const [enriched] = await enrichClosedLeadsWithCurrentStatus([lead]);
    res.json({ success: true, data: enriched });
  } catch (error) {
    logger.error('Error fetching closed lead:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
