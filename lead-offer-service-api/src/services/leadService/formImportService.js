/**
 * Form Import Service
 * Imports leads from WordPress form submissions to the main Lead schema.
 * Applies same validation as Excel import with import_source logic:
 * - excel_import > form_import (Excel always wins)
 * - Form vs Excel in DB → reject form lead
 * - Form vs Form in DB → update existing with new form data
 * - Excel vs Form in DB → replace form lead with Excel data (handled in excel.js)
 */

const logger = require('../../utils/logger');
const { Lead } = require('../../models');
const LeadForm = require('../../models/LeadForm');
const { createLeads } = require('./crud');
const { findStageAndStatusIdsByName } = require('./utils');

// ============ HELPERS (same logic as excel.js) ============

const normalizeData = (lead) => ({
  name: lead.contact_name?.toString().toLowerCase().trim() || '',
  email: (lead.email_from || lead.email)?.toString().toLowerCase().trim() || '',
  phone: (lead.phone?.toString().replace(/\D/g, '') || '').trim(),
  partnerId: lead.lead_source_no?.toString().trim() || '',
});

const parseRevenue = (value) => {
  if (!value) return 0;
  let strValue = value.toString().toLowerCase().trim();
  if (!isNaN(parseFloat(strValue)) && isFinite(strValue)) return parseFloat(strValue);
  strValue = strValue.replace(/[$€£¥₹,\s]/g, '');
  let multiplier = 1;
  let numericPart = strValue;
  if (strValue.includes('k')) {
    multiplier = 1000;
    numericPart = strValue.replace('k', '');
  } else if (strValue.includes('m')) {
    multiplier = 1000000;
    numericPart = strValue.replace('m', '');
  }
  const parsed = parseFloat(numericPart);
  return isNaN(parsed) ? 0 : parsed * multiplier;
};

/**
 * Transform form lead data to Lead schema format
 * @param {Object} formLead - Lead from LeadForm (email, phone, contact_name, etc.)
 * @returns {Object} Lead data in schema format
 */
const transformFormLeadToLead = (formLead) => {
  const email = (formLead.email || formLead.email_from || '').toString().trim().toLowerCase();
  const phone = (formLead.phone || '').toString().trim();
  const contactName =
    formLead.contact_name ||
    [formLead.first_name, formLead.last_name].filter(Boolean).join(' ').trim() ||
    '';

  return {
    contact_name: contactName,
    email_from: email,
    phone,
    lead_source_no: formLead.lead_source_no?.toString().trim() || null,
    expected_revenue: parseRevenue(formLead.expected_revenue),
    lead_date: formLead.lead_date ? new Date(formLead.lead_date) : new Date(),
    use_status: 'pending',
    import_source: 'form_import',
    duplicate_status: 0,
    source_id: formLead.source_id || null,
  };
};

/**
 * Validate single form lead (email or phone required)
 */
const validateFormLead = (lead) => {
  const hasEmail = lead.email_from && /^\S+@\S+\.\S+$/.test(lead.email_from);
  const hasPhone = lead.phone && lead.phone.replace(/\D/g, '').length >= 5;
  return hasEmail || hasPhone;
};

/**
 * Form import: check database for existing leads and apply import_source logic
 * - Match + excel_import → reject
 * - Match + form_import → update in place
 * - No match → create new
 */
const processFormLeadsImport = async (leadsData, user) => {
  const results = {
    created: [],
    updated: [],
    rejected: [],
  };

  if (leadsData.length === 0) return results;

  // Extract unique values for batch lookup
  const allPartnerIds = new Set();
  const allEmails = new Set();
  const allPhones = new Set();
  const normalizedMap = new Map();

  leadsData.forEach((lead, i) => {
    const n = normalizeData(lead);
    normalizedMap.set(i, n);
    if (n.partnerId) allPartnerIds.add(n.partnerId);
    if (n.email) allEmails.add(n.email);
    if (n.phone) allPhones.add(n.phone);
  });

  const partnerIds = Array.from(allPartnerIds);
  const emails = Array.from(allEmails);
  const phones = Array.from(allPhones);

  // Batch query - include import_source
  const selectFields =
    'contact_name email_from phone lead_source_no lead_date import_source expected_revenue';
  const dbLeads = [];
  const existingIds = new Set();

  if (partnerIds.length > 0) {
    const byPartner = await Lead.find({ lead_source_no: { $in: partnerIds } })
      .select(selectFields)
      .lean();
    byPartner.forEach((l) => {
      if (!existingIds.has(l._id.toString())) {
        dbLeads.push(l);
        existingIds.add(l._id.toString());
      }
    });
  }

  if (emails.length > 0) {
    const lowercaseEmails = emails.map((e) => e.toLowerCase());
    const byEmail = await Lead.find({
      $expr: { $in: [{ $toLower: '$email_from' }, lowercaseEmails] },
    })
      .select(selectFields)
      .lean();
    byEmail.forEach((l) => {
      if (!existingIds.has(l._id.toString())) {
        dbLeads.push(l);
        existingIds.add(l._id.toString());
      }
    });
  }

  if (phones.length > 0) {
    const CHUNK_SIZE = 5000;
    for (let i = 0; i < phones.length; i += CHUNK_SIZE) {
      const chunk = phones.slice(i, i + CHUNK_SIZE);
      const byPhone = await Lead.find({ phone: { $in: chunk } })
        .select(selectFields)
        .lean();
      byPhone.forEach((l) => {
        if (!existingIds.has(l._id.toString())) {
          dbLeads.push(l);
          existingIds.add(l._id.toString());
        }
      });
    }
  }

  // Build lookup maps
  const dbByPartnerId = new Map();
  const dbByEmail = new Map();
  const dbByPhone = new Map();
  dbLeads.forEach((l) => {
    const pid = l.lead_source_no?.toString().trim() || '';
    const email = l.email_from?.toString().toLowerCase().trim() || '';
    const phone = (l.phone || '').toString().replace(/\D/g, '') || '';
    if (pid) {
      if (!dbByPartnerId.has(pid)) dbByPartnerId.set(pid, []);
      dbByPartnerId.get(pid).push(l);
    }
    if (email) {
      if (!dbByEmail.has(email)) dbByEmail.set(email, []);
      dbByEmail.get(email).push(l);
    }
    if (phone) {
      if (!dbByPhone.has(phone)) dbByPhone.set(phone, []);
      dbByPhone.get(phone).push(l);
    }
  });

  // Process each lead
  for (let i = 0; i < leadsData.length; i++) {
    const lead = leadsData[i];
    const normalized = normalizedMap.get(i);

    // 1. Partner ID match (highest priority)
    if (normalized.partnerId && dbByPartnerId.has(normalized.partnerId)) {
      const existing = dbByPartnerId.get(normalized.partnerId)[0];
      const importSource = existing.import_source || 'excel_import';

      if (importSource === 'excel_import') {
        results.rejected.push({
          lead,
          error: `Partner ID '${normalized.partnerId}' already exists (excel_import). Form lead rejected.`,
        });
        continue;
      }

      // form_import: update existing
      const updates = {};
      if (lead.contact_name && lead.contact_name !== existing.contact_name)
        updates.contact_name = lead.contact_name;
      if (lead.email_from && lead.email_from !== existing.email_from)
        updates.email_from = lead.email_from;
      if (lead.phone && lead.phone !== existing.phone) updates.phone = lead.phone;
      if (lead.expected_revenue != null && lead.expected_revenue !== existing.expected_revenue)
        updates.expected_revenue = lead.expected_revenue;
      if (lead.lead_source_no && lead.lead_source_no !== existing.lead_source_no)
        updates.lead_source_no = lead.lead_source_no;

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        const updated = await Lead.findByIdAndUpdate(
          existing._id,
          { $set: updates },
          { new: true }
        );
        results.updated.push(updated);
      } else {
        results.updated.push(existing); // No changes but counted as processed
      }
      continue;
    }

    // 2. Email/phone match
    const matches = new Set();
    if (normalized.email && dbByEmail.has(normalized.email)) {
      dbByEmail.get(normalized.email).forEach((m) => matches.add(m._id.toString()));
    }
    if (normalized.phone && dbByPhone.has(normalized.phone)) {
      dbByPhone.get(normalized.phone).forEach((m) => matches.add(m._id.toString()));
    }

    const matchLeads = dbLeads.filter((l) => matches.has(l._id.toString()));

    if (matchLeads.length > 0) {
      // Check import_source: if any match is excel_import, reject
      const hasExcel = matchLeads.some(
        (m) => (m.import_source || 'excel_import') === 'excel_import'
      );
      if (hasExcel) {
        results.rejected.push({
          lead,
          error: `Lead already exists (excel_import). Form lead rejected.`,
        });
        continue;
      }

      // All matches are form_import: update first match
      const existing = matchLeads[0];
      const updates = {};
      if (lead.contact_name && lead.contact_name !== existing.contact_name)
        updates.contact_name = lead.contact_name;
      if (lead.email_from && lead.email_from !== existing.email_from)
        updates.email_from = lead.email_from;
      if (lead.phone && lead.phone !== existing.phone) updates.phone = lead.phone;
      if (lead.expected_revenue != null) updates.expected_revenue = lead.expected_revenue;
      if (lead.lead_source_no) updates.lead_source_no = lead.lead_source_no;

      updates.updatedAt = new Date();
      const updated = await Lead.findByIdAndUpdate(
        existing._id,
        { $set: updates },
        { new: true }
      );
      results.updated.push(updated);
      continue;
    }

    // 3. No match: create new
    try {
      const createResult = await createLeads(lead, user);
      if (createResult.created && createResult.created.length > 0) {
        results.created.push(createResult.created[0]);
      } else if (createResult.failed && createResult.failed.length > 0) {
        results.rejected.push({
          lead,
          error: createResult.failed[0].error || 'Create failed',
        });
      }
    } catch (err) {
      logger.error('Form import create lead error:', err);
      results.rejected.push({
        lead,
        error: err.message || 'Create failed',
      });
    }
  }

  return results;
};

/**
 * In-file duplicate check for batch (same logic as excel Phase 1)
 */
const checkInFileDuplicates = (leadsData) => {
  const validLeads = [];
  const rejected = [];
  const partnerIdMap = new Map();
  const contactMap = new Map();

  leadsData.forEach((lead, index) => {
    const normalized = normalizeData(lead);

    if (!normalized.email && !normalized.phone) {
      rejected.push({
        lead,
        index,
        error: 'Missing required contact information (email or phone required)',
      });
      return;
    }

    if (normalized.partnerId && partnerIdMap.has(normalized.partnerId)) {
      const existing = partnerIdMap.get(normalized.partnerId);
      rejected.push({
        lead,
        index,
        error: `Duplicate Partner ID '${normalized.partnerId}' in batch (first at index ${existing.index})`,
      });
      return;
    }
    if (normalized.partnerId) partnerIdMap.set(normalized.partnerId, { lead, index });

    const contactKey = `${normalized.email}|${normalized.phone}`;
    if (contactMap.has(contactKey)) {
      const existing = contactMap.get(contactKey);
      const existingNorm = normalizeData(existing.lead);
      if (existingNorm.partnerId === normalized.partnerId) {
        rejected.push({
          lead,
          index,
          error: `Complete duplicate contact with same Partner ID in batch`,
        });
        return;
      }
      // Same contact, different Partner ID: keep both, mark duplicate_status later if needed
    }
    contactMap.set(contactKey, { lead, index });
    validLeads.push(lead);
  });

  return { validLeads, rejected };
};

/**
 * Mark LeadForms as converted in shared DB (direct model update)
 * @param {string[]} lead_source_nos - Array of lead_source_no values
 */
const markLeadFormsAsConverted = async (lead_source_nos) => {
  if (!Array.isArray(lead_source_nos) || lead_source_nos.length === 0) return;

  const validNos = lead_source_nos
    .map((no) => (no && typeof no === 'string' ? no.toString().trim() : ''))
    .filter(Boolean);
  if (validNos.length === 0) return;

  try {
    const result = await LeadForm.updateMany(
      { lead_source_no: { $in: validNos }, is_deleted: { $ne: true } },
      { $set: { use_status: 'converted' } }
    );
    const updatedCount = result.modifiedCount ?? result.nModified ?? 0;
    logger.info('Marked LeadForms as converted', { count: updatedCount, lead_source_nos: validNos });
  } catch (err) {
    logger.error('Failed to mark LeadForms as converted', {
      error: err.message,
      lead_source_nos: validNos,
    });
    // Non-fatal: don't throw - import succeeded, only the status update failed
  }
};

/**
 * Main entry: import form leads (single or batch)
 * @param {Object|Array} formLeads - Single form lead or array of form leads
 * @param {Object} user - User performing the import
 * @returns {Promise<Object>} Results with created, updated, rejected
 */
const importFormLeads = async (formLeads, user) => {
  const isBatch = Array.isArray(formLeads);
  const leadsArray = isBatch ? formLeads : [formLeads];

  if (leadsArray.length === 0) {
    return {
      created: [],
      updated: [],
      rejected: [],
      message: 'No leads to import',
    };
  }

  // Transform to Lead format
  const transformed = leadsArray.map((f) => transformFormLeadToLead(f));

  // Validate each
  const validTransformed = [];
  const validationRejected = [];
  transformed.forEach((lead, i) => {
    if (validateFormLead(lead)) {
      validTransformed.push(lead);
    } else {
      validationRejected.push({
        lead: leadsArray[i],
        error: 'Missing required contact information (valid email or phone with 5+ digits required)',
      });
    }
  });

  if (validTransformed.length === 0) {
    return {
      created: [],
      updated: [],
      rejected: validationRejected,
      message: 'All leads failed validation',
    };
  }

  // In-file duplicate check (for batch)
  const { validLeads, rejected: inFileRejected } = checkInFileDuplicates(validTransformed);

  if (validLeads.length === 0) {
    return {
      created: [],
      updated: [],
      rejected: [...validationRejected, ...inFileRejected.map((r) => ({ lead: r.lead, error: r.error }))],
      message: 'All leads failed in-file duplicate check',
    };
  }

  // Ensure import_source is set for creates
  validLeads.forEach((l) => {
    l.import_source = 'form_import';
    l.use_status = 'pending';
  });

  const results = await processFormLeadsImport(validLeads, user);

  // Collect lead_source_nos from successfully created/updated leads and mark LeadForms as converted
  const convertedLeadSourceNos = [
    ...results.created.map((l) => l.lead_source_no).filter(Boolean),
    ...results.updated.map((l) => l.lead_source_no).filter(Boolean),
  ];
  if (convertedLeadSourceNos.length > 0) {
    await markLeadFormsAsConverted(convertedLeadSourceNos);
  }

  return {
    created: results.created,
    updated: results.updated,
    rejected: [
      ...validationRejected,
      ...inFileRejected.map((r) => ({ lead: r.lead, error: r.error })),
      ...results.rejected,
    ],
    message: `Import complete: ${results.created.length} created, ${results.updated.length} updated, ${results.rejected.length + validationRejected.length + inFileRejected.length} rejected`,
  };
};

module.exports = {
  importFormLeads,
  transformFormLeadToLead,
  validateFormLead,
};
