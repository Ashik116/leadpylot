const mongoose = require('mongoose');
const logger = require('../../../helpers/logger') || console;

class ClosedLeadQueryBuilder {
  constructor(user, filters = [], search = '') {
    this.user = user;
    this.filters = filters;
    this.search = search;
    this.query = {};
  }

  build() {
    this._applyBaseFilters();
    this._applyUserFilters();
    this._applySearch();
    return this.query;
  }

  _applyBaseFilters() {
    this.query.is_reverted = { $ne: true };

    for (const filter of this.filters) {
      if (!filter || !filter.field) continue;
      const { field, operator, value } = filter;

      if (field === 'closeLeadStatus' && value) {
        this.query.closeLeadStatus = value;
      } else if (field === 'closed_project_id' && value) {
        this.query.closed_project_id = new mongoose.Types.ObjectId(value);
      } else if (field === 'team_id' && value) {
        this.query.team_id = new mongoose.Types.ObjectId(value);
      } else if (field === 'user_id' && value) {
        this.query.user_id = new mongoose.Types.ObjectId(value);
      } else if (field === 'source_id' && value) {
        this.query.source_id = new mongoose.Types.ObjectId(value);
      } else if (field === 'status' && value) {
        this.query.status = value;
      } else if (field === 'stage' && value) {
        this.query.stage = value;
      } else if (field === 'lead_source_no' && value) {
        this.query.lead_source_no = value;
      } else if (field === 'closed_at' && value) {
        this._applyDateFilter('closed_at', operator, value);
      } else if (field === 'createdAt' && value) {
        this._applyDateFilter('createdAt', operator, value);
      } else if (field === 'lead_date' && value) {
        this._applyDateFilter('lead_date', operator, value);
      }
    }
  }

  _applyDateFilter(field, operator, value) {
    if (operator === 'between' && Array.isArray(value) && value.length === 2) {
      this.query[field] = { $gte: new Date(value[0]), $lte: new Date(value[1]) };
    } else if (operator === 'gte') {
      this.query[field] = { ...this.query[field], $gte: new Date(value) };
    } else if (operator === 'lte') {
      this.query[field] = { ...this.query[field], $lte: new Date(value) };
    }
  }

  _applyUserFilters() {
    if (!this.user) return;
    if (this.user.role === 'agent') {
      this.query.user_id = new mongoose.Types.ObjectId(this.user._id);
    }
  }

  _applySearch() {
    if (!this.search || this.search.trim() === '') return;
    const searchRegex = new RegExp(this.search.trim(), 'i');
    this.query.$or = [
      { contact_name: searchRegex },
      { email_from: searchRegex },
      { phone: searchRegex },
      { lead_source_no: searchRegex },
    ];
  }
}

module.exports = ClosedLeadQueryBuilder;
