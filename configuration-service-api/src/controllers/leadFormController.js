const leadFormService = require('../services/leadFormService');
const logger = require('../utils/logger');

/**
 * Parse a European/German-formatted currency string to a number.
 * "25.000 €" → 25000, "100.000,50 €" → 100000.5, "50000" → 50000
 */
function parseEuroAmount(raw) {
  if (raw == null) return 0;
  const str = String(raw).replace(/[€\s]/g, '').trim();
  if (!str) return 0;
  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  if (hasComma && hasDot) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (hasComma) {
    return parseFloat(str.replace(',', '.')) || 0;
  }
  if (hasDot && /\.\d{3}($|\D)/.test(str)) {
    return parseFloat(str.replace(/\./g, '')) || 0;
  }
  return parseFloat(str) || 0;
}

/**
 * Parse revenue/investment amount: supports European format and k/m/b suffixes.
 * "25.000 €" → 25000, "30k" → 30000, "1.5M" → 1500000, "1.5m" → 1500000
 */
function parseRevenue(raw) {
  if (raw == null) return 0;
  let strValue = String(raw).toLowerCase().trim();
  if (!strValue) return 0;
  strValue = strValue.replace(/[$€£¥₹\s]/g, '');
  if (!strValue) return 0;
  const hasSuffix = /[kmb]$/.test(strValue);
  if (!hasSuffix) {
    return parseEuroAmount(raw);
  }
  let multiplier = 1;
  let numericPart = strValue;
  if (strValue.includes('k')) {
    multiplier = 1000;
    numericPart = strValue.replace('k', '');
  } else if (strValue.includes('m')) {
    multiplier = 1000000;
    numericPart = strValue.replace('m', '');
  } else if (strValue.includes('b')) {
    multiplier = 1000000000;
    numericPart = strValue.replace('b', '');
  }
  numericPart = numericPart.replace(/,/g, '.');
  const parsed = parseFloat(numericPart);
  if (isNaN(parsed)) return 0;
  return parsed * multiplier;
}

async function getAllLeadForms(req, res, next) {
  try {
    const { page, limit, search, sortBy, sortOrder, source, site_link } = req.query;

    const result = await leadFormService.getAllLeadForms({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search,
      sortBy,
      sortOrder,
      source,
      site_link,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function getLeadFormById(req, res, next) {
  try {
    const { id } = req.params;
    const lead = await leadFormService.getLeadFormById(id);
    res.status(200).json(lead);
  } catch (error) {
    next(error);
  }
}

async function createLeadForm(req, res, next) {
  try {
    const { fields, form } = req.body;
    let leadData;

    const siteLink = resolveSiteLink(req);

    if (fields) {
      // Elementor Advanced Data ON: { form: {...}, fields: { fisrt_name: { raw_value, value }, ... }, meta: {...} }
      leadData = {
        first_name: fields.fisrt_name?.raw_value || fields.first_name?.raw_value || fields.fisrt_name?.value || fields.first_name?.value || '',
        last_name: fields.last_name?.raw_value || fields.last_name?.value || '',
        email: fields.email?.raw_value || fields.email?.value || '',
        phone: fields.phone?.raw_value || fields.phone?.value || '',
        expected_revenue: Math.round(parseRevenue(fields.investment_amount?.raw_value || fields.investment_amount?.value)),
        site_link: siteLink,
        source: form?.name || req.body.source || '',
      };
    } else if (req.body.form_name || req.body.form_id) {
      // Elementor Advanced Data OFF: flat body { "First Name": "John", "Last Name": "Doe", ... }
      leadData = {
        first_name: req.body['First Name'] || req.body['first_name'] || req.body.fisrt_name || '',
        last_name: req.body['Last Name'] || req.body['last_name'] || '',
        email: req.body['Email'] || req.body['email'] || '',
        phone: req.body['Phone'] || req.body['phone'] || '',
        expected_revenue: Math.round(parseRevenue(req.body['Investment Amount'] || req.body['investment_amount'])),
        site_link: siteLink,
        source: req.body.form_name || '',
      };
    } else {
      leadData = req.body;
      if (!leadData.site_link) leadData.site_link = siteLink;
    }

    const lead = await leadFormService.createLeadForm(leadData);
    res.status(200).json(lead);
  } catch (error) {
    next(error);
  }
}

/**
 * Extract the string value from an Elementor meta field.
 * Advanced Data ON sends objects like { title: "Page URL", value: "https://..." }
 */
function unwrapField(field) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field.raw_value || field.value || '';
}

/**
 * Resolve the originating site URL from available request data.
 * WordPress server-to-server calls lack Origin/Referer, so we fall back to
 * the WordPress User-Agent, Elementor meta, or body fields.
 */
function resolveSiteLink(req) {
  if (req.headers.origin) return req.headers.origin;
  if (req.headers.referer) return req.headers.referer;
  const metaPageUrl = unwrapField(req.body?.meta?.page_url);
  if (metaPageUrl) return metaPageUrl;
  const bodyLink = unwrapField(req.body?.site_link);
  if (bodyLink) return bodyLink;
  const ua = req.headers['user-agent'] || '';
  const wpMatch = ua.match(/WordPress\/[\d.]+;\s*(https?:\/\/[^\s;]+)/i);
  if (wpMatch) return wpMatch[1];
  return '';
}

async function updateLeadForm(req, res, next) {
  try {
    const { id } = req.params;
    const lead = await leadFormService.updateLeadForm(id, req.body);
    res.status(200).json(lead);
  } catch (error) {
    next(error);
  }
}

async function deleteLeadForm(req, res, next) {
  try {
    const { ids } = req.body;
    const { id } = req.params;
    const leadIds = ids || id;

    if (!leadIds) {
      return res.status(400).json({ error: 'Lead form ID(s) required' });
    }

    const result = await leadFormService.deleteLeadForm(leadIds);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllLeadForms,
  getLeadFormById,
  createLeadForm,
  updateLeadForm,
  deleteLeadForm,
};
