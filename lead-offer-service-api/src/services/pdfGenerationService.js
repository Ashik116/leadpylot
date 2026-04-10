const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const storageConfig = require('../config/storageConfig');
const logger = require('../utils/logger');
const { PdfTemplate, GeneratedPdf, Lead, Offer, Bank, User, Team } = require('../models');

/**
 * PDF Generation Service
 * Handles PDF generation from templates with actual data
 */
class PdfGenerationService {
  constructor() {
    this.transformations = {
      uppercase: (value) => String(value).toUpperCase(),
      lowercase: (value) => String(value).toLowerCase(),
      currency: (value) => this.formatCurrency(value),
      bonus_currency: (value) => this.formatBonusCurrency(value),
      percentage: (value) => this.formatPercentage(value),
      number: (value) => this.formatNumber(value),
      date: (value) => this.formatDate(value),
      phone: (value) => this.formatPhone(value),
      iban: (value) => this.formatIban(value),
    };
  }

  /**
   * Convert hex color to RGB values for pdf-lib
   * @param {string} hex - Hex color string (e.g., "#0000FF" or "0000FF")
   * @returns {object} - RGB object with r, g, b values (0-1 range)
   */
  hexToRgb(hex) {
    if (!hex) return null;

    // Remove # if present
    hex = hex.replace('#', '');

    // Validate hex format
    if (!/^[0-9A-F]{6}$/i.test(hex)) {
      logger.warn('Invalid hex color format', { hex });
      return null;
    }

    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;

    return { r, g, b };
  }

  /**
   * Format currency amount in German format
   * @param {number} amount - Amount to format
   * @returns {string} - Formatted currency string
   */
  formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '0,00 €';
    }

    const number = parseFloat(amount);
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  }

  /**
   * Format bonus currency amount without decimal places
   * @param {number} amount - Amount to format
   * @returns {string} - Formatted currency string without decimals
   */
  formatBonusCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '0 €';
    }

    const number = parseFloat(amount);
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(number);
  }

  /**
   * Format percentage in German format
   * @param {number} percentage - Percentage to format (already as percentage, e.g., 12 for 12%)
   * @returns {string} - Formatted percentage string
   */
  formatPercentage(percentage) {
    if (percentage === null || percentage === undefined || isNaN(percentage)) {
      return '0,00 %';
    }

    const number = parseFloat(percentage);
    // Don't divide by 100 since the input is already in percentage format
    return (
      new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(number) + ' %'
    );
  }

  /**
   * Format number with German thousands separator
   * @param {number} number - Number to format
   * @returns {string} - Formatted number string
   */
  formatNumber(number) {
    if (number === null || number === undefined || isNaN(number)) {
      return '0';
    }

    const num = parseFloat(number);
    return new Intl.NumberFormat('de-DE').format(num);
  }

  /**
   * Format date in German format
   * @param {Date|string} date - Date to format
   * @returns {string} - Formatted date string
   */
  formatDate(date) {
    if (!date) return '';

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return String(date);

    return new Intl.DateTimeFormat('de-DE').format(dateObj);
  }

  /**
   * Format phone number
   * @param {string} phone - Phone number to format
   * @returns {string} - Formatted phone string
   */
  formatPhone(phone) {
    if (!phone) return '';

    // Simple phone formatting - remove spaces and format
    const cleaned = String(phone).replace(/\s+/g, '');
    return cleaned;
  }

  /**
   * Format IBAN
   * @param {string} iban - IBAN to format
   * @returns {string} - Formatted IBAN string
   */
  formatIban(iban) {
    if (!iban) return '';

    // Format IBAN with spaces every 4 characters
    const cleaned = String(iban).replace(/\s+/g, '').toUpperCase();
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  }

  /**
   * Format a filename component (lead name or template name)
   * Preserves proper capitalization and allows dots for version numbers
   * @param {string} name - Name to format
   * @param {Object} options - Formatting options
   * @returns {string} - Formatted filename component
   */
  formatFilenameComponent(name, options = {}) {
    if (!name || typeof name !== 'string') {
      return 'unknown';
    }

    let formatted = name;

    // Remove .pdf extension if requested
    if (options.removeExtension) {
      formatted = formatted.replace(/\.pdf$/i, '');
    }

    // Convert to Title_Case while preserving version numbers like V5.11
    formatted = formatted
      .trim()
      // Split by spaces and capitalize each word
      .split(/\s+/)
      .map(word => {
        // Special handling for version numbers (e.g., v511 -> V5.11, V511 -> V5.11)
        const versionMatch = word.match(/^[vV](\d+)(\d{2})$/);
        if (versionMatch) {
          return `V${versionMatch[1]}.${versionMatch[2]}`;
        }

        // Regular word capitalization
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('_')
      // Allow alphanumeric, underscores, dots (for versions), and German/European characters
      .replace(/[^a-zA-Z0-9_.äöüßÄÖÜàáâãåèéêëìíîïòóôõùúûçñÀÁÂÃÅÈÉÊËÌÍÎÏÒÓÔÕÙÚÛÇÑ]/g, '')
      // Clean up multiple underscores
      .replace(/_+/g, '_')
      // Remove leading/trailing underscores
      .replace(/^_|_$/g, '');

    // Ensure we don't have an empty result
    return formatted || 'unknown';
  }

  /**
   * Load and register custom fonts in PDF document
   * @param {PDFDocument} pdfDoc - PDF document
   * @param {Object} template - PDF template with font settings
   * @returns {Object} - Font registry with embedded fonts
   */
  async loadCustomFonts(pdfDoc, template) {
    const fontRegistry = {};

    try {
      // Register fontkit for custom font support
      pdfDoc.registerFontkit(fontkit);

      // Add standard fonts
      fontRegistry['Helvetica'] = StandardFonts.Helvetica;
      fontRegistry['Times-Roman'] = StandardFonts.TimesRoman;
      fontRegistry['Courier'] = StandardFonts.Courier;

      // Load uploaded fonts from database if template uses default font or has custom fonts
      const defaultFont = template.settings?.default_font;
      if (
        defaultFont ||
        (template.settings?.custom_fonts && template.settings.custom_fonts.length > 0)
      ) {
        try {
          const Font = require('../models/font');
          const uploadedFonts = await Font.getActiveFonts();

          for (const font of uploadedFonts) {
            try {
              // Download font file from storage
              const storageConfig = require('../configs/storageConfig');
              const fontBuffer = await storageConfig.downloadFile(font.storage_filename, 'fonts');

              if (fontBuffer) {
                const embeddedFont = await pdfDoc.embedFont(fontBuffer);
                fontRegistry[font.font_family] = embeddedFont;

                logger.debug('✅ Uploaded font loaded successfully', {
                  fontName: font.name,
                  fontFamily: font.font_family,
                  storage: font.storage_type,
                });
              } else {
                logger.warn('⚠️ Uploaded font file not found in storage', {
                  fontName: font.name,
                  fontFamily: font.font_family,
                  storageFilename: font.storage_filename,
                });
              }
            } catch (fontError) {
              logger.warn('❌ Failed to load uploaded font', {
                fontName: font.name,
                fontFamily: font.font_family,
                error: fontError.message,
              });
            }
          }
        } catch (dbError) {
          logger.warn('Failed to load fonts from database', { error: dbError.message });
        }
      }

      // Load custom fonts if defined in template settings (legacy support)
      if (template.settings?.custom_fonts && template.settings.custom_fonts.length > 0) {
        for (const customFont of template.settings.custom_fonts) {
          if (!customFont.active) continue;

          try {
            // Check if font file exists
            const fontPath = path.resolve(process.cwd(), customFont.file_path);
            if (fs.existsSync(fontPath)) {
              const fontBytes = fs.readFileSync(fontPath);
              const embeddedFont = await pdfDoc.embedFont(fontBytes);
              fontRegistry[customFont.font_family] = embeddedFont;

              logger.info('✅ Legacy custom font loaded successfully', {
                fontName: customFont.name,
                fontFamily: customFont.font_family,
                fontPath: customFont.file_path,
              });
            } else {
              logger.warn('⚠️ Legacy custom font file not found', {
                fontName: customFont.name,
                fontPath: customFont.file_path,
              });
            }
          } catch (fontError) {
            logger.error('❌ Failed to load legacy custom font', {
              fontName: customFont.name,
              error: fontError.message,
            });
          }
        }
      }

      logger.info('🎯 Font registry initialized', {
        availableFonts: Object.keys(fontRegistry),
        defaultFont: defaultFont,
        totalFonts: Object.keys(fontRegistry).length,
        templateHasDefaultFont: !!defaultFont,
        templateHasCustomFonts: !!(
          template.settings?.custom_fonts && template.settings.custom_fonts.length > 0
        ),
      });
    } catch (error) {
      logger.error('Failed to initialize font registry', { error: error.message });
    }

    return fontRegistry;
  }

  /**
   * Extract bonus amount value from bonus object or raw value
   * @param {Object|String|Number} bonusAmount - Bonus amount (could be populated object or raw value)
   * @returns {Number} - Extracted bonus amount value
   */
  extractBonusAmount(bonusAmount) {
    // Handle case where bonus_amount is not set
    if (!bonusAmount) {
      return 0;
    }

    // Handle case where bonus_amount is already a number
    if (typeof bonusAmount === 'number') {
      return bonusAmount;
    }

    // Handle case where bonus_amount is a string number
    if (typeof bonusAmount === 'string' && !isNaN(bonusAmount)) {
      return parseFloat(bonusAmount);
    }

    // Handle case where bonus_amount is a populated bonus object
    if (typeof bonusAmount === 'object' && bonusAmount.info) {
      const amount =
        bonusAmount.info.amount || (bonusAmount.info.info && bonusAmount.info.info.amount) || 0;
      logger.debug('📦 Extracted bonus from populated object', {
        bonusId: bonusAmount._id,
        extractedAmount: amount,
        bonusName: bonusAmount.name,
        infoStructure: bonusAmount.info,
      });
      return amount;
    }

    // Handle case where bonus_amount object has amount directly
    if (typeof bonusAmount === 'object' && bonusAmount.amount) {
      return bonusAmount.amount;
    }

    // Fallback: try to parse as number
    const parsed = parseFloat(bonusAmount);
    if (isNaN(parsed)) {
      logger.warn('⚠️ Could not extract bonus amount', {
        bonusAmount,
        type: typeof bonusAmount,
      });
      return 0;
    }
    return parsed;
  }

  /**
   * Extract term months value from payment terms object or raw value
   * @param {Object|String|Number} paymentTerms - Payment terms (could be populated object or raw value)
   * @returns {Number} - Extracted term months value
   */
  extractTermMonths(paymentTerms) {
    // Handle case where payment_terms is not set
    if (!paymentTerms) {
      return 0;
    }

    // Handle case where payment_terms is already a number
    if (typeof paymentTerms === 'number') {
      return paymentTerms;
    }

    // Handle case where payment_terms is a string number
    if (typeof paymentTerms === 'string' && !isNaN(paymentTerms)) {
      return parseFloat(paymentTerms);
    }

    // Handle case where payment_terms is a populated payment terms object
    if (typeof paymentTerms === 'object' && paymentTerms.info) {
      // Try different possible fields in info object, including nested structure
      const termMonths =
        paymentTerms.info.months ||
        paymentTerms.info.term_months ||
        paymentTerms.info.amount ||
        (paymentTerms.info.info && paymentTerms.info.info.months) ||
        (paymentTerms.info.info && paymentTerms.info.info.term_months) ||
        0;
      logger.debug('📦 Extracted term months from populated object', {
        paymentTermsId: paymentTerms._id,
        extractedTermMonths: termMonths,
        paymentTermsName: paymentTerms.name,
        infoStructure: paymentTerms.info,
      });
      return termMonths;
    }

    // Handle case where payment_terms object has months directly
    if (typeof paymentTerms === 'object' && paymentTerms.months) {
      return paymentTerms.months;
    }

    // Fallback: try to parse as number
    const parsed = parseFloat(paymentTerms);
    if (isNaN(parsed)) {
      logger.warn('⚠️ Could not extract term months', {
        paymentTerms,
        type: typeof paymentTerms,
      });
      return 0;
    }
    return parsed;
  }

  /**
   * Generate PDF from template for an offer
   * @param {string} templateId - Template ID
   * @param {string} offerId - Offer ID
   * @param {string} userId - User ID requesting generation
   * @param {Object} options - Generation options
   * @returns {Object} - Generation result
   */
  async generateOfferPdf(templateId, offerId, userId, options = {}) {
    try {
      logger.info('🚀 Starting PDF generation', {
        templateId,
        offerId,
        userId,
        options,
      });

      // Load template
      const template = await PdfTemplate.findOne({
        _id: templateId,
        active: true,
        status: 'active',
      });

      if (!template) {
        throw new Error('PDF template not found or not active');
      }

      // Load offer with related data
      const offer = await Offer.findById(offerId)
        .populate('lead_id')
        .populate({
          path: 'bank_id',
          populate: {
            path: 'provider',
            select: 'name login',
          },
        })
        .populate('agent_id')
        .populate('project_id')
        .populate('bonus_amount')
        .populate('payment_terms');

      if (!offer) {
        throw new Error('Offer not found');
      }

      // Prepare data for PDF generation
      const pdfData = await this.prepareDataForGeneration(offer, template, {
        excludeFields: options.excludeFields || [],
      });
      logger.info('📋 PDF data prepared', {
        offerTitle: offer.title,
        bonusAmount: pdfData.offer_data.bonus_amount,
        termMonths: pdfData.offer_data.term_months,
        investmentVolume: pdfData.offer_data.investment_volume,
      });

      try {
        // Generate unique temp ID for PDF generation
        const tempGeneratedPdfId = new mongoose.Types.ObjectId();

        // Generate the actual PDF first
        const pdfResult = await this.fillPdfTemplate(template, pdfData, tempGeneratedPdfId);

        // Create generated PDF record with all required fields
        const generatedPdf = new GeneratedPdf({
          template_id: templateId,
          offer_id: offerId,
          lead_id: offer.lead_id._id,
          agent_id: offer.agent_id._id,
          project_id: offer.project_id._id,
          filename: pdfResult.filename,
          storage_path: pdfResult.storagePath,
          file_size: pdfResult.fileSize,
          file_hash: pdfResult.fileHash,
          status: 'completed',
          generation_type: options.type || 'manual',
          generation_source: options.source || 'admin_panel',
          data_snapshot: pdfData,
          field_mappings_snapshot: pdfResult.appliedMappings,
          created_by: userId,
        });

        await generatedPdf.save();

        // Update template usage
        template.usage_count += 1;
        template.last_used = new Date();
        await template.save();

        // Add generation action
        await generatedPdf.addAction('generated', userId, {
          template_name: template.name,
          offer_title: offer.title,
        });

        logger.info('✅ PDF generated successfully', {
          generatedPdfId: generatedPdf._id,
          templateId,
          offerId,
          filename: pdfResult.filename,
          fileSize: pdfResult.fileSize,
          formsRemainEditable: true, // Forms are NOT flattened - they remain fillable
        });

        return {
          success: true,
          generatedPdf: generatedPdf.toResponse(),
          downloadUrl: `/api/admin/generated-pdfs/${generatedPdf._id}/download`,
        };
      } catch (pdfError) {
        // PDF generation failed - don't create a GeneratedPdf record
        logger.error('❌ PDF generation failed during creation', {
          templateId,
          offerId,
          userId,
          error: pdfError.message,
        });

        throw pdfError;
      }
    } catch (error) {
      logger.error('❌ PDF generation failed', {
        templateId,
        offerId,
        userId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Prepare data for PDF generation
   * @param {Object} offer - Offer document with populated relations
   * @param {Object} template - PDF template
   * @param {Object} options - Options for data preparation
   * @param {Array} options.excludeFields - Fields to exclude from the data
   * @returns {Object} - Prepared data object
   */
  async prepareDataForGeneration(offer, template, options = {}) {
    const lead = offer.lead_id;
    const bank = offer.bank_id;
    const agent = offer.agent_id;
    const project = offer.project_id;

    // Helper function to filter out excluded fields
    const filterExcludedFields = (obj, excludeFields = []) => {
      if (!excludeFields || excludeFields.length === 0) return obj;

      const filtered = {};
      for (const [key, value] of Object.entries(obj)) {
        if (!excludeFields.includes(key)) {
          filtered[key] = value;
        }
      }
      return filtered;
    };

    const excludeFields = options.excludeFields || [];

    return {
      lead_data: filterExcludedFields(
        {
          contact_name: lead.contact_name,
          nametitle: lead.nametitle,
          email_from: lead.email_from,
          phone: lead.phone,
          expected_revenue: lead.expected_revenue,
          lead_date: lead.lead_date,
          notes: lead.notes,
          system_id: lead.system_id,
          ...lead.toObject(),
        },
        excludeFields
      ),
      offer_data: {
        title: offer.title,
        nametitle: offer.nametitle, // Add nametitle from offer
        investment_volume: offer.investment_volume,
        interest_rate: offer.interest_rate,
        bonus_amount: this.extractBonusAmount(offer.bonus_amount),
        term_months: this.extractTermMonths(offer.payment_terms),
        status: offer.status,
        offerType: offer.offerType,
        created_at: offer.created_at,
        // Add raw settings objects for debugging
        _raw_bonus_amount: offer.bonus_amount,
        _raw_payment_terms: offer.payment_terms,
        ...offer.toObject(),
      },
      bank_data: bank
        ? filterExcludedFields(
          {
            name: bank.name,
            iban: bank.iban,
            bic: bank.bic,
            lei_code: bank.lei_code,
            swift_code: bank.swift_code,
            account_number: bank.account_number,
            address: bank.address,
            contact_person: bank.contact_person,
            phone: bank.phone,
            email: bank.email,
            country: bank.country,
            state: bank.state,
            code: bank.code,
            website: bank.website,
            ...bank.toObject(),
          },
          excludeFields
        )
        : null,
      agent_data: filterExcludedFields(
        {
          login: agent.login,
          email: agent.email,
          role: agent.role,
          ...agent.toObject(),
        },
        excludeFields
      ),
      project_data: project
        ? filterExcludedFields(
          {
            name: project.name,
            description: project.description,
            project_email: project.project_email,
            project_phone: project.project_phone,
            project_address1: project.project_address1,
            project_company_id: project.project_company_id,
            ...project.toObject(),
          },
          excludeFields
        )
        : null,
      computed_data: {
        current_date: new Date(),
        formatted_investment: this.formatCurrency(offer.investment_volume),
        formatted_bonus: this.formatBonusCurrency(this.extractBonusAmount(offer.bonus_amount)),
        formatted_interest_rate: this.formatPercentage(offer.interest_rate),
        formatted_term_months: `${this.extractTermMonths(offer.payment_terms)} Monate`,
        total_amount: offer.investment_volume + (this.extractBonusAmount(offer.bonus_amount) || 0),
        generation_timestamp: new Date().toISOString(),
      },
      // static_data: {
      //   template_name: template.name,
      //   template_id: template._id,
      //   template_version: template.version,
      //   template_created_at: template.created_at,
      //   template_updated_at: template.updated_at,
      //   template_status: template.status,
      //   template_active: template.active,
      // },
    };
  }

  /**
   * Fill PDF template with actual data
   * @param {Object} template - PDF template
   * @param {Object} data - Data object
   * @param {string} generatedPdfId - Generated PDF ID for unique filename
   * @returns {Object} - PDF generation result
   */
  async fillPdfTemplate(template, data, generatedPdfId) {
    try {
      // Download original PDF template
      const templateBuffer = await storageConfig.downloadFile(
        template.storage_path.split('/').pop(),
        'documents'
      );

      if (!templateBuffer) {
        throw new Error('Template PDF file not found in storage');
      }

      // Load PDF document
      const pdfDoc = await PDFDocument.load(templateBuffer);
      const form = pdfDoc.getForm();

      // Load custom fonts
      const fontRegistry = await this.loadCustomFonts(pdfDoc, template);

      const appliedMappings = [];
      // Process each field mapping (first pass: fill values only)
      for (const mapping of template.field_mappings) {
        if (!mapping.active) continue;

        try {
          const value = this.extractDataValue(data, mapping);

          if (value !== null && value !== undefined) {
            // Handle grouped fields (character-box fields)
            if (mapping.field_group_id) {
              await this.fillGroupedFieldValueOnly(
                form,
                template,
                mapping,
                value,
                appliedMappings
              );
            } else {
              await this.fillSingleFieldValueOnly(
                form,
                mapping,
                value,
                appliedMappings
              );
            }
          }
        } catch (fieldError) {
          logger.warn('Failed to fill field', {
            fieldName: mapping.pdf_field_name,
            error: fieldError.message,
          });
        }
      }

      // Apply individual field styling (font and size) without global updates
      logger.info('🔤 Applying individual field fonts and sizes...');
      const defaultFontName = template.settings?.default_font;
      const customFont = defaultFontName && fontRegistry[defaultFontName] ? fontRegistry[defaultFontName] : null;

      for (const mapping of template.field_mappings) {
        if (!mapping.active) continue;

        try {
          const value = this.extractDataValue(data, mapping);

          if (value !== null && value !== undefined) {
            // Apply font and sizing for grouped fields (character-box fields)
            if (mapping.field_group_id) {
              await this.applyFontAndSizingToGroupedField(
                form,
                template,
                mapping,
                value,
                fontRegistry,
                customFont
              );
            } else {
              await this.applyFontAndSizingToSingleField(
                form,
                mapping,
                value,
                fontRegistry,
                template,
                customFont
              );
            }
          }
        } catch (fieldError) {
          logger.warn('Failed to apply font and sizing to field', {
            fieldName: mapping.pdf_field_name,
            error: fieldError.message,
          });
        }
      }

      // Update field appearances ONLY for fields that don't have custom sizing
      // This preserves our individual field font sizes
      logger.info('📝 Updating appearances for non-customized fields only...');
      if (customFont) {
        // We'll handle field appearances manually per field to preserve custom sizes
        logger.info('✅ Individual field styling completed with custom font');
      } else {
        // Only update appearances globally if no custom font is used
        form.updateFieldAppearances();
        logger.info('✅ Global field appearances updated with standard font');
      }

      // Generate filename using lead name + template name + incremental index
      const leadName = data.lead_data?.contact_name || 'unknown';
      const templateName = template.name || 'template';

      // Clean and format the names (preserve capitalization, allow dots for versions)
      const cleanLeadName = this.formatFilenameComponent(leadName);
      const cleanTemplateName = this.formatFilenameComponent(templateName, { removeExtension: true });

      // Generate filename based on context - temp for preview, final for approval
      const isApprovalGeneration = data.computed_data?.generation_source === 'approval';

      let filename;
      if (isApprovalGeneration) {
        // For final PDFs, check existing count and add index if needed
        const baseFilename = `${cleanLeadName}_${cleanTemplateName}`;
        const leadId = data.lead_data?._id;
        const templateId = template._id;

        // Count existing GeneratedPdf records for same lead + template
        // Escape special regex characters in names for safe pattern matching
        const escapedLeadName = cleanLeadName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedTemplateName = cleanTemplateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const existingCount = await GeneratedPdf.countDocuments({
          lead_id: leadId,
          template_id: templateId,
          active: true,
          filename: { $regex: `^${escapedLeadName}(_\\d+)?_${escapedTemplateName}\\.pdf$` }
        });

        // Generate filename with index if needed
        filename = existingCount === 0
          ? `${baseFilename}.pdf`
          : `${cleanLeadName}_${existingCount}_${cleanTemplateName}.pdf`;

        logger.debug('📝 Generated unique filename with indexing', {
          leadId,
          templateId,
          leadName: cleanLeadName,
          templateName: cleanTemplateName,
          existingCount,
          finalFilename: filename,
          isIndexed: existingCount > 0
        });
      } else {
        // For temp files, keep the generatedPdfId for uniqueness
        filename = `temp_${generatedPdfId}_${cleanLeadName}_${cleanTemplateName}.pdf`;
      }

      // Ensure all field appearances are properly updated before saving
      logger.info('🔄 Final appearance update for all fields...');
      try {
        form.updateFieldAppearances();
        logger.info('✅ All field appearances updated successfully');
      } catch (appearanceError) {
        logger.warn('⚠️ Could not update all field appearances', {
          error: appearanceError.message,
        });
      }

      // Save PDF - keep form fields editable but with proper appearances
      const pdfBytes = await pdfDoc.save({
        updateFieldAppearances: true, // Force appearance updates to ensure visibility
        useObjectStreams: false, // Better compatibility across PDF readers
      });
      const fileHash = crypto.createHash('md5').update(pdfBytes).digest('hex');

      // Save PDF based on context - temp storage for preview, permanent for approval
      let storagePath;

      if (isApprovalGeneration) {
        // For approved PDFs, save directly to permanent AWS storage
        const storageConfig = require('../configs/storageConfig');
        const uploadResult = await storageConfig.uploadFile(pdfBytes, filename, 'documents', {
          originalFilename: filename,
          source: 'pdf_approval_generation',
          generatedPdfId: generatedPdfId,
          approvedGeneration: true,
          generatedAt: new Date().toISOString(),
        });

        if (!uploadResult.success) {
          throw new Error(`Failed to upload PDF to permanent storage: ${uploadResult.errors?.join(', ')}`);
        }

        storagePath = uploadResult.webPath;
        logger.info('✅ Final PDF saved directly to AWS permanent storage', {
          filename,
          awsPath: storagePath,
          fileSize: pdfBytes.length,
        });
      } else {
        // For preview PDFs, save to temporary local storage
        storagePath = await this.savePdfToTempStorage(pdfBytes, filename);

        if (!storagePath) {
          throw new Error('Failed to save PDF to temporary storage');
        }
      }

      logger.info(`📄 PDF filled and saved to ${isApprovalGeneration ? 'permanent AWS' : 'temporary'} storage`, {
        filename,
        storagePath: storagePath,
        fileSize: pdfBytes.length,
        appliedMappings: appliedMappings.length,
        isApprovalGeneration,
      });

      return {
        filename,
        storagePath: storagePath,
        fileSize: pdfBytes.length,
        fileHash,
        appliedMappings,
        isTemporary: !isApprovalGeneration, // Temp only for preview PDFs
      };
    } catch (error) {
      logger.error('❌ Error filling PDF template', { error: error.message });
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Extract data value from data object based on mapping
   * @param {Object} data - Data object
   * @param {Object} mapping - Field mapping
   * @returns {*} - Extracted value
   */
  extractDataValue(data, mapping) {
    const { data_source, data_field, transform_rules, validation } = mapping;

    let value = null;

    // Extract value from data source
    switch (data_source) {
      case 'lead':
        value = data.lead_data?.[data_field];

        // Special handling for nametitle: prefer offer nametitle if available
        if (data_field === 'nametitle' && (!value || value === '') && data.offer_data?.nametitle) {
          value = data.offer_data.nametitle;
          logger.debug('📝 Using nametitle from offer instead of lead', {
            leadNametitle: data.lead_data?.nametitle,
            offerNametitle: data.offer_data.nametitle,
            finalValue: value,
          });
        }
        break;
      case 'offer':
        value = data.offer_data?.[data_field];

        // Special handling for nametitle: fallback to lead nametitle if offer doesn't have it
        if (data_field === 'nametitle' && (!value || value === '') && data.lead_data?.nametitle) {
          value = data.lead_data.nametitle;
          logger.debug('📝 Using nametitle from lead as fallback', {
            offerNametitle: data.offer_data?.nametitle,
            leadNametitle: data.lead_data.nametitle,
            finalValue: value,
          });
        }
        break;
      case 'bank':
        value = data.bank_data?.[data_field];
        break;
      case 'agent':
        value = data.agent_data?.[data_field];
        break;
      case 'computed':
        value = data.computed_data?.[data_field];
        break;
      case 'static':
        value = transform_rules?.default_value || data_field;
        break;
    }

    // Apply transformations
    if (value !== null && value !== undefined && transform_rules) {
      value = this.applyTransformations(value, transform_rules);
    }

    // Apply validation
    if (validation?.required && (value === null || value === undefined || value === '')) {
      logger.warn('Required field is empty', {
        dataSource: data_source,
        dataField: data_field,
      });
    }

    return value;
  }

  /**
   * Apply transformations to a value
   * @param {*} value - Original value
   * @param {Object} transformRules - Transformation rules
   * @returns {*} - Transformed value
   */
  applyTransformations(value, transformRules) {
    let result = value;

    // Apply format pattern first while value is still in original type
    if (transformRules.format_pattern) {
      result = this.applyFormatPattern(result, transformRules.format_pattern);
    }

    // Convert to string for other transformations
    result = String(result);

    if (transformRules.prefix) {
      result = transformRules.prefix + result;
    }

    if (transformRules.suffix) {
      result = result + transformRules.suffix;
    }

    if (transformRules.uppercase) {
      result = result.toUpperCase();
    }

    if (transformRules.lowercase) {
      result = result.toLowerCase();
    }

    return result;
  }

  /**
   * Map field value for radio/checkbox fields based on common patterns
   * @param {string} value - Original value
   * @param {string} fieldType - Field type (radio/checkbox)
   * @param {Array} availableOptions - Available options in PDF field
   * @returns {string} - Mapped value
   */
  mapFieldValue(value, fieldType, availableOptions = []) {
    if (!value || !fieldType) return value;

    const stringValue = String(value).toLowerCase();

    // Mapping for radio fields
    if (fieldType === 'radio') {
      // Boolean mappings for flex options and similar fields
      // true -> Choice1 (first option), false -> Choice2 (second option)
      const booleanMappings = {
        'true': availableOptions[0] || 'Choice1',
        '1': availableOptions[0] || 'Choice1',
        'yes': availableOptions[0] || 'Choice1',
        'ja': availableOptions[0] || 'Choice1',
        'false': availableOptions[1] || 'Choice2',
        '0': availableOptions[1] || 'Choice2',
        'no': availableOptions[1] || 'Choice2',
        'nein': availableOptions[1] || 'Choice2',
      };

      // Check boolean mappings first
      if (booleanMappings.hasOwnProperty(stringValue)) {
        const mappedValue = booleanMappings[stringValue];

        // Verify the mapped value exists in available options
        if (availableOptions.length === 0 || availableOptions.includes(mappedValue)) {
          logger.debug('✅ Boolean value mapped for radio field', {
            originalValue: value,
            mappedValue: mappedValue,
            availableOptions: availableOptions,
          });
          return mappedValue;
        }
      }

      // Mapping for common German titles to PDF radio choices
      // Note: Herr -> Choice2, Frau -> Choice1, Famillie -> no selection (null)
      const titleMappings = {
        herr: 'Choice2', // Male title -> Choice2
        frau: 'Choice1', // Female title -> Choice1
        famillie: null, // Family title -> no selection
        mr: 'Choice2', // Male title -> Choice2
        mrs: 'Choice1', // Female title -> Choice1
        miss: 'Choice1', // Female title -> Choice1
        dr: 'Choice2', // Doctor title -> Choice2 (assuming male default)
      };

      // Check if we have a direct title mapping
      if (titleMappings.hasOwnProperty(stringValue)) {
        const mappedValue = titleMappings[stringValue];

        // Handle null mapping (no selection for Famillie)
        if (mappedValue === null) {
          return null;
        }

        // Verify the mapped value exists in available options
        if (availableOptions.length === 0 || availableOptions.includes(mappedValue)) {
          return mappedValue;
        }
      }

      // If no direct mapping and we have available options, try to match
      if (availableOptions.length > 0) {
        // Look for partial matches
        const match = availableOptions.find(
          (option) =>
            option.toLowerCase().includes(stringValue) || stringValue.includes(option.toLowerCase())
        );
        if (match) return match;

        // Default fallback for common patterns
        if (['frau', 'mrs', 'miss'].includes(stringValue)) {
          return availableOptions[0]; // First choice (Choice1) for female titles
        }
        if (['herr', 'mr', 'dr'].includes(stringValue)) {
          return availableOptions[1] || availableOptions[0]; // Second choice (Choice2) for male titles
        }
        if (['famillie'].includes(stringValue)) {
          return null; // No selection for family titles
        }
      }
    }

    return value; // Return original value if no mapping found
  }

  /**
   * Calculate optimal font size for text to fit in PDF field (maximizes space usage)
   * @param {Object} textField - PDF text field
   * @param {string} text - Text to fit
   * @param {number} initialFontSize - Starting font size
   * @param {number} minFontSize - Minimum allowed font size
   * @param {Object} font - Font object for width calculation
   * @returns {number} - Optimal font size
   */
  calculateOptimalFontSize(textField, text, initialFontSize = 12, minFontSize = 6, font = null) {
    try {
      // Get field dimensions
      const fieldRect = textField.acroField.getWidgets()[0]?.getRectangle();
      if (!fieldRect) {
        logger.debug('Could not get field dimensions, using initial font size');
        return initialFontSize;
      }

      const fieldWidth = Math.abs(fieldRect.x2 - fieldRect.x1);
      // Use 95% of field width for minimal padding - maximize space usage
      const availableWidth = fieldWidth * 0.95;

      // Use binary search for precise font sizing to maximize space usage
      let minSize = minFontSize;
      let maxSize = Math.max(initialFontSize, 20); // Cap at reasonable maximum
      let optimalFontSize = minFontSize;

      // Binary search with fine precision (0.1pt increments)
      while (maxSize - minSize > 0.1) {
        const currentFontSize = (minSize + maxSize) / 2;
        let textWidth = 0;

        if (!font) {
          // Improved character width estimation based on common fonts
          // Use more accurate estimation: ~0.55 for typical condensed PDF fonts
          textWidth = text.length * (currentFontSize * 0.55);
        } else {
          try {
            textWidth = font.widthOfTextAtSize(text, currentFontSize);
          } catch (fontError) {
            // Fallback to improved character estimation
            textWidth = text.length * (currentFontSize * 0.55);
          }
        }

        if (textWidth <= availableWidth) {
          // Text fits, try larger font
          optimalFontSize = currentFontSize;
          minSize = currentFontSize;
        } else {
          // Text too large, try smaller font
          maxSize = currentFontSize;
        }
      }

      // Round to 1 decimal place for cleaner output
      optimalFontSize = Math.round(optimalFontSize * 10) / 10;

      // Ensure we don't go below minimum
      optimalFontSize = Math.max(optimalFontSize, minFontSize);

      logger.debug('🔤 Optimized font size calculation', {
        fieldWidth: fieldWidth,
        availableWidth: availableWidth,
        textLength: text.length,
        initialFontSize: initialFontSize,
        optimalFontSize: optimalFontSize,
        spaceUtilization: `${Math.round((optimalFontSize / Math.max(initialFontSize, 12)) * 100)}%`,
        text: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
      });

      return optimalFontSize;
    } catch (error) {
      logger.debug('Error calculating optimal font size, using initial', {
        error: error.message,
        initialFontSize,
      });
      return initialFontSize;
    }
  }

  /**
   * Fill a single PDF field
   * @param {Object} form - PDF form
   * @param {Object} mapping - Field mapping
   * @param {*} value - Value to fill
   * @param {Array} appliedMappings - Array to track applied mappings
   * @param {Object} fontRegistry - Available fonts
   * @param {Object} template - PDF template
   */
  async fillSingleField(form, mapping, value, appliedMappings, fontRegistry = {}, template = {}) {
    const { pdf_field_name, pdf_field_type } = mapping;
    let stringValue = String(value);

    try {
      let finalValue = stringValue;

      switch (pdf_field_type) {
        case 'text':
          const textField = form.getTextField(pdf_field_name);
          textField.setText(stringValue);

          // Apply custom font and size settings with auto-sizing
          try {
            const fieldLength = stringValue.length;
            const systemFieldKey = `${mapping.data_source}.${mapping.data_field}`;

            // Determine initial font size (custom override, template default, or system default)
            let initialFontSize =
              mapping.transform_rules?.font_size || template.settings?.default_font_size || 10;

            // Get font object for accurate width calculations
            let font = null;
            const fontName = template.settings?.default_font;
            if (fontName && fontRegistry[fontName]) {
              font = fontRegistry[fontName];
            }

            // Define minimum font sizes for different field types
            let minFontSize = 12; // Global minimum

            // Set field-specific minimums (but keep 12pt default for all content types)
            if (systemFieldKey.includes('email') || stringValue.includes('@')) {
              minFontSize = 12; // Emails can be smaller if needed by auto-sizing
            } else if (systemFieldKey.includes('phone') || stringValue.match(/^\+?[\d\s\-\(\)]{8,}$/)) {
              minFontSize = 12; // Phone numbers minimum
            } else if (systemFieldKey.includes('iban') || systemFieldKey.includes('account')) {
              minFontSize = 12; // Bank codes minimum
            } else if (fieldLength > 25) {
              minFontSize = 12; // Long text fields minimum
            }

            // All fields now start with 12pt default (no content-type overrides)

            // Determine final font size - respect explicit settings or auto-calculate
            let finalFontSize;
            if (mapping.transform_rules?.font_size) {
              // User explicitly set font size - use it directly without optimization
              finalFontSize = mapping.transform_rules.font_size;
              logger.debug('📝 Using explicit font size', {
                pdfFieldName: pdf_field_name,
                explicitFontSize: finalFontSize,
                content: stringValue.substring(0, 30) + (fieldLength > 30 ? '...' : ''),
              });
            } else {
              // No explicit font size - calculate optimal size to fit the field
              finalFontSize = this.calculateOptimalFontSize(
                textField,
                stringValue,
                initialFontSize,
                minFontSize,
                font
              );
            }

            // Set the final font size
            textField.setFontSize(finalFontSize);

            // Ensure field visibility for all text fields (even without custom colors)
            if (!mapping.transform_rules?.text_color) {
              try {
                // Force appearance update for fields without custom colors
                textField.enableReadOnly();
                textField.disableReadOnly();
                textField.defaultUpdateAppearances();
              } catch (visibilityError) {
                logger.debug('Could not force visibility for field', {
                  fieldName: pdf_field_name,
                  error: visibilityError.message,
                });
              }
            }

            // Apply text color if specified
            if (mapping.transform_rules?.text_color) {
              const colorRgb = this.hexToRgb(mapping.transform_rules.text_color);
              if (colorRgb) {
                try {
                  // Set text color and ensure field appearance is updated properly
                  const color = rgb(colorRgb.r, colorRgb.g, colorRgb.b);

                  // Apply color using the proper method for text fields
                  textField.updateAppearances(color);

                  // Ensure field visibility by forcing appearance generation
                  textField.enableReadOnly();
                  textField.disableReadOnly();

                  // Additional appearance update to ensure visibility
                  textField.defaultUpdateAppearances(color);

                  logger.debug('🎨 Text color applied', {
                    pdfFieldName: pdf_field_name,
                    hexColor: mapping.transform_rules.text_color,
                    rgbColor: colorRgb,
                  });
                } catch (colorError) {
                  logger.warn('Could not apply text color', {
                    fieldName: pdf_field_name,
                    color: mapping.transform_rules.text_color,
                    error: colorError.message,
                  });
                }
              }
            }

            logger.debug('📝 Text field configured', {
              pdfFieldName: pdf_field_name,
              systemFieldKey: systemFieldKey,
              contentLength: fieldLength,
              initialFontSize: initialFontSize,
              finalFontSize: finalFontSize,
              minFontSize: minFontSize,
              content: stringValue.substring(0, 30) + (fieldLength > 30 ? '...' : ''),
              wasExplicitSize: !!mapping.transform_rules?.font_size,
              hasTextColor: !!mapping.transform_rules?.text_color,
            });

          } catch (fontError) {
            logger.debug('Could not adjust font size, using default', {
              fieldName: pdf_field_name,
              error: fontError.message,
            });
            // Fallback to a reasonable small size for long content
            if (stringValue.length > 25) {
              try {
                textField.setFontSize(8);
              } catch (fallbackError) {
                logger.debug('Could not set fallback font size', {
                  fieldName: pdf_field_name,
                  error: fallbackError.message,
                });
              }
            }
          }

          finalValue = stringValue;
          break;

        case 'checkbox':
          const checkbox = form.getCheckBox(pdf_field_name);
          const isChecked = ['true', '1', 'yes', 'on', 'checked'].includes(
            stringValue.toLowerCase()
          );
          if (isChecked) {
            checkbox.check();
          } else {
            checkbox.uncheck();
          }
          finalValue = isChecked.toString();
          break;

        case 'radio':
          const radioGroup = form.getRadioGroup(pdf_field_name);
          // Get available options for better mapping
          let availableOptions = [];
          try {
            availableOptions = radioGroup.getOptions();
          } catch (optionError) {
            logger.debug('Could not get radio options', { fieldName: pdf_field_name });
          }

          // Apply value mapping for radio fields
          const mappedValue = this.mapFieldValue(stringValue, 'radio', availableOptions);
          finalValue = mappedValue;

          // Handle null mapping (no selection for Famillie)
          if (mappedValue === null) {
            logger.debug('✅ Radio field intentionally left unselected', {
              fieldName: pdf_field_name,
              originalValue: stringValue,
              reason: 'Famillie title should not select any radio option',
            });
            finalValue = 'no_selection';
            break;
          }

          try {
            radioGroup.select(mappedValue);
            logger.debug('✅ Radio field successfully mapped', {
              fieldName: pdf_field_name,
              originalValue: stringValue,
              mappedValue: mappedValue,
              availableOptions: availableOptions,
            });
          } catch (selectError) {
            logger.warn('⚠️ Failed to select radio option, trying fallback', {
              fieldName: pdf_field_name,
              originalValue: stringValue,
              mappedValue: mappedValue,
              availableOptions: availableOptions,
              error: selectError.message,
            });

            // Fallback: try to select first available option if mapping failed
            // But only if it's not a Famillie case
            if (availableOptions.length > 0 && !['famillie'].includes(stringValue.toLowerCase())) {
              try {
                radioGroup.select(availableOptions[0]);
                finalValue = availableOptions[0];
                logger.info('📌 Used fallback radio option', {
                  fieldName: pdf_field_name,
                  fallbackValue: availableOptions[0],
                });
              } catch (fallbackError) {
                logger.error('❌ Complete radio field failure', {
                  fieldName: pdf_field_name,
                  error: fallbackError.message,
                });
              }
            }
          }
          break;

        case 'dropdown':
          const dropdown = form.getDropdown(pdf_field_name);
          // Get available options for dropdown
          let dropdownOptions = [];
          try {
            dropdownOptions = dropdown.getOptions();
          } catch (optionError) {
            logger.debug('Could not get dropdown options', { fieldName: pdf_field_name });
          }

          // Try to find exact match first, then mapped value
          const dropdownMappedValue = dropdownOptions.includes(stringValue)
            ? stringValue
            : this.mapFieldValue(stringValue, 'dropdown', dropdownOptions);

          dropdown.select(dropdownMappedValue);
          finalValue = dropdownMappedValue;
          break;
      }

      appliedMappings.push({
        pdf_field_name,
        data_source: mapping.data_source,
        data_field: mapping.data_field,
        original_value: stringValue,
        final_value: finalValue,
        transform_applied: mapping.transform_rules,
      });
    } catch (error) {
      logger.warn('Failed to fill single field', {
        fieldName: pdf_field_name,
        fieldType: pdf_field_type,
        value: stringValue,
        error: error.message,
      });
    }
  }

  /**
   * Fill grouped fields (character-box fields like IBAN)
   * @param {Object} form - PDF form
   * @param {Object} template - PDF template
   * @param {Object} mapping - Field mapping
   * @param {*} value - Value to distribute
   * @param {Array} appliedMappings - Array to track applied mappings
   * @param {Object} fontRegistry - Available fonts
   */
  async fillGroupedField(form, template, mapping, value, appliedMappings, fontRegistry = {}) {
    try {
      // Find the field group
      const fieldGroup = template.field_groups.find(
        (group) => group._id.toString() === mapping.field_group_id.toString()
      );

      if (!fieldGroup) {
        logger.warn('Field group not found', { groupId: mapping.field_group_id });
        return;
      }

      const stringValue = String(value).replace(/\s/g, ''); // Remove spaces
      const characters = stringValue.split('');

      // Calculate optimal font size for character boxes
      let characterFontSize = mapping.transform_rules?.font_size || template.settings?.default_font_size || 10;

      // Get font object for accurate width calculations
      let font = null;
      const fontName = template.settings?.default_font;
      if (fontName && fontRegistry[fontName]) {
        font = fontRegistry[fontName];
      }

      // Define minimum font sizes for character-box fields
      let minFontSize = 6;

      // Set field type-specific settings
      const systemFieldKey = `${mapping.data_source}.${mapping.data_field}`;
      if (systemFieldKey.includes('iban') || fieldGroup.logical_name === 'IBAN') {
        minFontSize = 5; // IBAN characters can be smaller
        if (!mapping.transform_rules?.font_size && !template.settings?.default_font_size) {
          characterFontSize = 10; // Start smaller for IBAN
        }
      } else if (systemFieldKey.includes('phone') || fieldGroup.logical_name === 'PHONE') {
        minFontSize = 6; // Phone numbers
        if (!mapping.transform_rules?.font_size && !template.settings?.default_font_size) {
          characterFontSize = 11; // Start smaller for phones
        }
      }

      // Fill each character position
      for (let i = 0; i < fieldGroup.field_names.length && i < characters.length; i++) {
        const fieldName = fieldGroup.field_names[i];
        const character = characters[i];

        try {
          const textField = form.getTextField(fieldName);
          textField.setText(character);

          // Calculate optimal font size for this character box
          try {
            const optimalFontSize = this.calculateOptimalFontSize(
              textField,
              character,
              characterFontSize,
              minFontSize,
              font
            );

            textField.setFontSize(optimalFontSize);

            logger.debug('📝 Character field auto-sized', {
              fieldName: fieldName,
              character: character,
              position: i,
              groupName: fieldGroup.logical_name,
              initialFontSize: characterFontSize,
              optimalFontSize: optimalFontSize,
              wasAutoSized: optimalFontSize !== characterFontSize,
            });

          } catch (fontError) {
            logger.debug('Could not adjust character field font size', {
              fieldName: fieldName,
              error: fontError.message,
            });
            // Fallback to smaller size for character boxes
            try {
              textField.setFontSize(Math.max(characterFontSize * 0.8, minFontSize));
            } catch (fallbackError) {
              logger.debug('Could not set fallback font size for character field', {
                fieldName: fieldName,
                error: fallbackError.message,
              });
            }
          }

          appliedMappings.push({
            pdf_field_name: fieldName,
            data_source: mapping.data_source,
            data_field: mapping.data_field,
            final_value: character,
            transform_applied: mapping.transform_rules,
            group_info: {
              group_name: fieldGroup.logical_name,
              position: i,
              total_value: stringValue,
            },
          });
        } catch (fieldError) {
          logger.warn('Failed to fill grouped field character', {
            fieldName,
            character,
            position: i,
            error: fieldError.message,
          });
        }
      }

      logger.debug('🔤 Grouped field filled with auto-sizing', {
        groupName: fieldGroup.logical_name,
        totalCharacters: characters.length,
        fieldCount: fieldGroup.field_names.length,
        value: stringValue,
        systemFieldKey,
      });

    } catch (error) {
      logger.warn('Failed to fill grouped field', {
        groupId: mapping.field_group_id,
        value,
        error: error.message,
      });
    }
  }

  /**
   * Generate filename for generated PDF
   * @param {Object} offer - Offer document
   * @param {Object} template - PDF template
   * @returns {string} - Generated filename
   */
  generateFilename(offer, template) {
    const leadName = offer.lead_id.contact_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Unknown';
    const templateName = template.name.replace(/[^a-zA-Z0-9]/g, '_');
    const date = new Date().toISOString().split('T')[0];

    return `${templateName}_${leadName}_${date}.pdf`;
  }

  /**
   * Format currency value
   * @param {number} value - Numeric value
   * @returns {string} - Formatted currency
   */
  formatCurrency(value) {
    const numValue = parseFloat(value) || 0;
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(numValue);
  }

  /**
   * Format date value
   * @param {Date|string} value - Date value
   * @returns {string} - Formatted date
   */
  formatDate(value) {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('de-DE').format(date);
  }

  /**
   * Format phone number
   * @param {string} value - Phone number
   * @returns {string} - Formatted phone
   */
  formatPhone(value) {
    const cleaned = String(value).replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('49')) {
      return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8)}`;
    }
    return value;
  }

  /**
   * Format IBAN
   * @param {string} value - IBAN value
   * @returns {string} - Formatted IBAN
   */
  formatIban(value) {
    const cleaned = String(value).replace(/\s/g, '').toUpperCase();
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  }

  /**
   * Apply format pattern
   * @param {string} value - Value to format
   * @param {string} pattern - Format pattern
   * @returns {string} - Formatted value
   */
  applyFormatPattern(value, pattern) {
    // Format patterns for German localization
    switch (pattern) {
      case 'currency':
        return this.formatCurrency(value);
      case 'bonus_currency':
        return this.formatBonusCurrency(value);
      case 'percentage':
        return this.formatPercentage(value);
      case 'number':
        return this.formatNumber(value);
      case 'date':
        return this.formatDate(value);
      case 'phone':
        return this.formatPhone(value);
      case 'iban':
        return this.formatIban(value);
      default:
        return value;
    }
  }

  /**
   * Fill a single PDF field with value only (no font sizing)
   * @param {Object} form - PDF form
   * @param {Object} mapping - Field mapping
   * @param {*} value - Value to fill
   * @param {Array} appliedMappings - Array to track applied mappings
   */
  async fillSingleFieldValueOnly(form, mapping, value, appliedMappings) {
    const { pdf_field_name, pdf_field_type } = mapping;
    let stringValue = String(value);

    try {
      let finalValue = stringValue;

      switch (pdf_field_type) {
        case 'text':
          const textField = form.getTextField(pdf_field_name);
          textField.setText(stringValue);
          finalValue = stringValue;
          break;

        case 'checkbox':
          const checkbox = form.getCheckBox(pdf_field_name);
          const isChecked = ['true', '1', 'yes', 'on', 'checked'].includes(
            stringValue.toLowerCase()
          );
          if (isChecked) {
            checkbox.check();
          } else {
            checkbox.uncheck();
          }
          finalValue = isChecked.toString();
          break;

        case 'radio':
          const radioGroup = form.getRadioGroup(pdf_field_name);
          let availableOptions = [];
          try {
            availableOptions = radioGroup.getOptions();
          } catch (optionError) {
            logger.debug('Could not get radio options', { fieldName: pdf_field_name });
          }

          const mappedValue = this.mapFieldValue(stringValue, 'radio', availableOptions);
          finalValue = mappedValue;

          if (mappedValue === null) {
            finalValue = 'no_selection';
            break;
          }

          try {
            radioGroup.select(mappedValue);
          } catch (selectError) {
            if (availableOptions.length > 0 && !['famillie'].includes(stringValue.toLowerCase())) {
              try {
                radioGroup.select(availableOptions[0]);
                finalValue = availableOptions[0];
              } catch (fallbackError) {
                logger.error('❌ Complete radio field failure', {
                  fieldName: pdf_field_name,
                  error: fallbackError.message,
                });
              }
            }
          }
          break;

        case 'dropdown':
          const dropdown = form.getDropdown(pdf_field_name);
          let dropdownOptions = [];
          try {
            dropdownOptions = dropdown.getOptions();
          } catch (optionError) {
            logger.debug('Could not get dropdown options', { fieldName: pdf_field_name });
          }

          const dropdownMappedValue = dropdownOptions.includes(stringValue)
            ? stringValue
            : this.mapFieldValue(stringValue, 'dropdown', dropdownOptions);

          dropdown.select(dropdownMappedValue);
          finalValue = dropdownMappedValue;
          break;
      }

      appliedMappings.push({
        pdf_field_name,
        data_source: mapping.data_source,
        data_field: mapping.data_field,
        final_value: finalValue,
        transform_applied: mapping.transform_rules,
      });
    } catch (error) {
      logger.warn('Failed to fill field value', {
        fieldName: pdf_field_name,
        error: error.message,
      });
    }
  }

  /**
   * Fill grouped character-box field with values only (no font sizing)
   * @param {Object} form - PDF form
   * @param {Object} template - PDF template
   * @param {Object} mapping - Field mapping
   * @param {*} value - Value to distribute
   * @param {Array} appliedMappings - Array to track applied mappings
   */
  async fillGroupedFieldValueOnly(form, template, mapping, value, appliedMappings) {
    try {
      const fieldGroup = template.field_groups.find(
        (group) => group._id.toString() === mapping.field_group_id.toString()
      );

      if (!fieldGroup) {
        logger.warn('Field group not found', { groupId: mapping.field_group_id });
        return;
      }

      const stringValue = String(value).replace(/\s/g, '');
      const characters = stringValue.split('');

      for (let i = 0; i < fieldGroup.field_names.length && i < characters.length; i++) {
        const fieldName = fieldGroup.field_names[i];
        const character = characters[i];

        try {
          const textField = form.getTextField(fieldName);
          textField.setText(character);

          appliedMappings.push({
            pdf_field_name: fieldName,
            data_source: mapping.data_source,
            data_field: mapping.data_field,
            final_value: character,
            transform_applied: mapping.transform_rules,
            group_info: {
              group_name: fieldGroup.logical_name,
              position: i,
              total_value: stringValue,
            },
          });
        } catch (fieldError) {
          logger.warn('Failed to fill grouped field character value', {
            fieldName,
            character,
            position: i,
            error: fieldError.message,
          });
        }
      }
    } catch (error) {
      logger.warn('Failed to fill grouped field values', {
        groupId: mapping.field_group_id,
        value,
        error: error.message,
      });
    }
  }

  /**
   * Apply font and sizing to a single PDF field
   * @param {Object} form - PDF form
   * @param {Object} mapping - Field mapping
   * @param {*} value - Value to size for
   * @param {Object} fontRegistry - Available fonts
   * @param {Object} template - PDF template
   * @param {Object} customFont - Custom font object
   */
  async applyFontAndSizingToSingleField(form, mapping, value, fontRegistry, template, customFont) {
    const { pdf_field_name, pdf_field_type } = mapping;

    if (pdf_field_type !== 'text') return; // Only apply font sizing to text fields

    let stringValue = String(value);

    try {
      const textField = form.getTextField(pdf_field_name);

      const fieldLength = stringValue.length;
      const systemFieldKey = `${mapping.data_source}.${mapping.data_field}`;

      // Determine initial font size
      let initialFontSize =
        mapping.transform_rules?.font_size || template.settings?.default_font_size || 10;

      // Get font object for accurate width calculations
      let font = null;
      const fontName = template.settings?.default_font;
      if (fontName && fontRegistry[fontName]) {
        font = fontRegistry[fontName];
      }

      // Define minimum font sizes for different field types
      let minFontSize = 12;

      // Set field-specific minimums (but keep 12pt default for all content types)
      if (systemFieldKey.includes('email') || stringValue.includes('@')) {
        minFontSize = 12; // Emails can be smaller if needed by auto-sizing
      } else if (systemFieldKey.includes('phone') || stringValue.match(/^\+?[\d\s\-\(\)]{8,}$/)) {
        minFontSize = 12; // Phone numbers minimum
      } else if (systemFieldKey.includes('iban') || systemFieldKey.includes('account')) {
        minFontSize = 12; // Bank codes minimum
      } else if (fieldLength > 25) {
        minFontSize = 12; // Long text fields minimum
      }

      // All fields now start with 12pt default (no content-type overrides)

      // Determine final font size - respect explicit settings or auto-calculate
      let finalFontSize;
      if (mapping.transform_rules?.font_size) {
        // User explicitly set font size - use it directly
        finalFontSize = mapping.transform_rules.font_size;
      } else {
        // Calculate optimal font size to fit the field
        finalFontSize = this.calculateOptimalFontSize(
          textField,
          stringValue,
          initialFontSize,
          minFontSize,
          font
        );
      }

      // Apply custom font if available
      if (customFont) {
        try {
          // Apply the custom font to this specific field
          textField.updateAppearances(customFont);
          logger.debug('🎨 Custom font applied to field', {
            pdfFieldName: pdf_field_name,
            fontName: template.settings?.default_font,
          });
        } catch (fontAppError) {
          logger.debug('Could not apply custom font to field', {
            fieldName: pdf_field_name,
            error: fontAppError.message,
          });
        }
      }

      // Set the final font size (this must come after font application)
      textField.setFontSize(finalFontSize);

      // Ensure field visibility for all text fields (even without custom colors)
      if (!mapping.transform_rules?.text_color) {
        try {
          // Force appearance update for fields without custom colors
          textField.enableReadOnly();
          textField.disableReadOnly();
          textField.defaultUpdateAppearances();
        } catch (visibilityError) {
          logger.debug('Could not force visibility for field in font sizing', {
            fieldName: pdf_field_name,
            error: visibilityError.message,
          });
        }
      }

      // Apply text color if specified
      if (mapping.transform_rules?.text_color) {
        const colorRgb = this.hexToRgb(mapping.transform_rules.text_color);
        if (colorRgb) {
          try {
            // Set text color and ensure field appearance is updated properly
            const color = rgb(colorRgb.r, colorRgb.g, colorRgb.b);

            // Apply color using the proper method for text fields
            textField.updateAppearances(color);

            // Ensure field visibility by forcing appearance generation
            textField.enableReadOnly();
            textField.disableReadOnly();

            // Additional appearance update to ensure visibility
            textField.defaultUpdateAppearances(color);

            logger.debug('🎨 Text color applied in font sizing', {
              pdfFieldName: pdf_field_name,
              hexColor: mapping.transform_rules.text_color,
            });
          } catch (colorError) {
            logger.warn('Could not apply text color in font sizing', {
              fieldName: pdf_field_name,
              color: mapping.transform_rules.text_color,
              error: colorError.message,
            });
          }
        }
      }

      logger.debug('📝 Font and size applied to field', {
        pdfFieldName: pdf_field_name,
        systemFieldKey: systemFieldKey,
        contentLength: fieldLength,
        initialFontSize: initialFontSize,
        finalFontSize: finalFontSize,
        customFontApplied: !!customFont,
        content: stringValue.substring(0, 30) + (fieldLength > 30 ? '...' : ''),
        wasExplicitSize: !!mapping.transform_rules?.font_size,
        hasTextColor: !!mapping.transform_rules?.text_color,
      });

    } catch (fontError) {
      logger.debug('Could not apply font sizing to field', {
        fieldName: pdf_field_name,
        error: fontError.message,
      });
      // Fallback to a reasonable small size for long content
      if (stringValue.length > 25) {
        try {
          const textField = form.getTextField(pdf_field_name);
          textField.setFontSize(8);
        } catch (fallbackError) {
          logger.debug('Could not set fallback font size', {
            fieldName: pdf_field_name,
            error: fallbackError.message,
          });
        }
      }
    }
  }

  /**
   * Apply font and sizing to grouped character-box fields
   * @param {Object} form - PDF form
   * @param {Object} template - PDF template
   * @param {Object} mapping - Field mapping
   * @param {*} value - Value to size for
   * @param {Object} fontRegistry - Available fonts
   * @param {Object} customFont - Custom font object
   */
  async applyFontAndSizingToGroupedField(form, template, mapping, value, fontRegistry, customFont) {
    try {
      const fieldGroup = template.field_groups.find(
        (group) => group._id.toString() === mapping.field_group_id.toString()
      );

      if (!fieldGroup) {
        logger.warn('Field group not found for font sizing', { groupId: mapping.field_group_id });
        return;
      }

      const stringValue = String(value).replace(/\s/g, '');
      const characters = stringValue.split('');

      // Calculate optimal font size for character boxes
      let characterFontSize = mapping.transform_rules?.font_size || template.settings?.default_font_size || 10;

      // Get font object
      let font = null;
      const fontName = template.settings?.default_font;
      if (fontName && fontRegistry[fontName]) {
        font = fontRegistry[fontName];
      }

      let minFontSize = 6;

      const systemFieldKey = `${mapping.data_source}.${mapping.data_field}`;
      if (systemFieldKey.includes('iban') || fieldGroup.logical_name === 'IBAN') {
        minFontSize = 5;
        if (!mapping.transform_rules?.font_size && !template.settings?.default_font_size) {
          characterFontSize = 10;
        }
      } else if (systemFieldKey.includes('phone') || fieldGroup.logical_name === 'PHONE') {
        minFontSize = 6;
        if (!mapping.transform_rules?.font_size && !template.settings?.default_font_size) {
          characterFontSize = 11;
        }
      }

      // Apply font sizing to each character position
      for (let i = 0; i < fieldGroup.field_names.length && i < characters.length; i++) {
        const fieldName = fieldGroup.field_names[i];
        const character = characters[i];

        try {
          const textField = form.getTextField(fieldName);

          // Apply custom font to this character field if available
          if (customFont) {
            try {
              textField.updateAppearances(customFont);
              logger.debug('🎨 Custom font applied to character field', {
                fieldName: fieldName,
                character: character,
                fontName: template.settings?.default_font,
              });
            } catch (fontAppError) {
              logger.debug('Could not apply custom font to character field', {
                fieldName: fieldName,
                error: fontAppError.message,
              });
            }
          }

          const optimalFontSize = this.calculateOptimalFontSize(
            textField,
            character,
            characterFontSize,
            minFontSize,
            font
          );

          textField.setFontSize(optimalFontSize);

          logger.debug('📝 Font and size applied to character field', {
            fieldName: fieldName,
            character: character,
            position: i,
            groupName: fieldGroup.logical_name,
            initialFontSize: characterFontSize,
            optimalFontSize: optimalFontSize,
            customFontApplied: !!customFont,
            wasAutoSized: optimalFontSize !== characterFontSize,
          });

        } catch (fontError) {
          logger.debug('Could not apply font size to character field', {
            fieldName: fieldName,
            error: fontError.message,
          });
          try {
            const textField = form.getTextField(fieldName);
            textField.setFontSize(Math.max(characterFontSize * 0.8, minFontSize));
          } catch (fallbackError) {
            logger.debug('Could not set fallback font size for character field', {
              fieldName: fieldName,
              error: fallbackError.message,
            });
          }
        }
      }

    } catch (error) {
      logger.warn('Failed to apply font sizing to grouped field', {
        groupId: mapping.field_group_id,
        value,
        error: error.message,
      });
    }
  }

  /**
   * Save PDF to temporary storage
   * @param {Buffer} pdfBytes - PDF buffer
   * @param {string} filename - Filename
   * @returns {string} - Temporary file path
   */
  async savePdfToTempStorage(pdfBytes, filename) {
    try {
      const tempPath = storageConfig.getFilePath(filename, 'temp');

      // Ensure temp directory exists
      const tempDir = path.dirname(tempPath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Write PDF to temp file
      fs.writeFileSync(tempPath, pdfBytes);

      logger.debug('📁 PDF saved to temp storage', {
        filename,
        tempPath,
        size: pdfBytes.length,
        storageType: 'temp',
      });

      // Return a web path that indicates this is temporary storage
      return `/storage/temp/${filename}`;
    } catch (error) {
      logger.error('❌ Failed to save PDF to temp storage', {
        filename,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Move PDF from temporary storage to permanent AWS storage
   * @param {Object} generatedPdf - GeneratedPdf record
   * @returns {Object} - Result with permanent storage path
   */
  async movePdfToPermanentStorage(generatedPdf) {
    try {
      const tempFilename = generatedPdf.filename;
      // Get the temp file path using the actual filename (includes temp prefix)
      const tempPath = storageConfig.getFilePath(tempFilename, 'temp');

      if (!fs.existsSync(tempPath)) {
        throw new Error(`Temporary PDF file not found at: ${tempPath}`);
      }

      // Read PDF from temp storage
      const pdfBuffer = fs.readFileSync(tempPath);

      // Generate permanent filename (remove temp prefix and ID)
      const permanentFilename = tempFilename.replace(/^temp_[^_]+_/, '');

      // Upload to permanent storage (AWS)
      const uploadResult = await storageConfig.uploadFile(pdfBuffer, permanentFilename, 'documents', {
        originalFilename: permanentFilename,
        source: 'pdf_approval',
        generatedPdfId: generatedPdf._id,
        movedFromTemp: true,
        approvedAt: new Date().toISOString(),
      });

      if (!uploadResult.success) {
        throw new Error(`Failed to upload PDF to permanent storage: ${uploadResult.errors?.join(', ')}`);
      }

      // Clean up temp file
      try {
        fs.unlinkSync(tempPath);
        logger.debug('🗑️ Temp PDF file cleaned up', { tempPath });
      } catch (cleanupError) {
        logger.warn('⚠️ Failed to cleanup temp file', {
          tempPath,
          error: cleanupError.message,
        });
      }

      logger.info('📄 PDF moved to permanent storage', {
        generatedPdfId: generatedPdf._id,
        from: tempPath,
        to: uploadResult.webPath,
        filename: permanentFilename,
      });

      return {
        success: true,
        permanentPath: uploadResult.webPath,
        permanentFilename: permanentFilename,
      };
    } catch (error) {
      logger.error('❌ Failed to move PDF to permanent storage', {
        generatedPdfId: generatedPdf._id,
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Clean up temporary PDF file
   * @param {Object} generatedPdf - GeneratedPdf record
   * @returns {boolean} - Success status
   */
  async cleanupTempPdf(generatedPdf) {
    try {
      const tempFilename = generatedPdf.filename;
      // Get the temp file path using the actual filename (includes temp prefix)
      const tempPath = storageConfig.getFilePath(tempFilename, 'temp');

      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
        logger.info('🗑️ Temporary PDF cleaned up', {
          generatedPdfId: generatedPdf._id,
          tempPath,
          filename: tempFilename,
        });
        return true;
      } else {
        logger.debug('📁 Temp file already removed or not found', {
          generatedPdfId: generatedPdf._id,
          tempPath,
          filename: tempFilename,
        });
        return true;
      }
    } catch (error) {
      logger.error('❌ Failed to cleanup temporary PDF', {
        generatedPdfId: generatedPdf._id,
        tempPath: storageConfig.getFilePath(tempFilename, 'temp'),
        error: error.message,
      });
      return false;
    }
  }
}

module.exports = new PdfGenerationService();
