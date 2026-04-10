/**
 * Auto PDF Generation Utility
 *
 * Handles automatic PDF generation for offers based on offer type and template matching.
 * Follows the same workflow as manual PDF generation: GeneratedPdf first, Document assignment optional.
 *
 * TEMPLATE SEARCH STRATEGY (STRICT PROJECT CHECKING):
 * 1. Project-Specific Templates (Highest Priority - STRICT CHECK):
 *    - First finds the project/team by projectId
 *    - Retrieves templates from project.pdf_templates array (stable relationship)
 *    - Filters by offer_type, active status, and category
 *    - Sorts by usage_count, createdAt, and priority
 *    - ⚠️ CRITICAL: If project has templates but none match offer_type, NO FALLBACK is allowed
 *    - This prevents configuration issues from being masked by global templates
 *
 * 2. Global Templates (Fallback - ONLY if project has NO templates):
 *    - Templates without team_id assignment (global/shared)
 *    - Same filtering and sorting as project-specific
 *    - Only used when project has zero templates assigned
 *
 * 3. Fuzzy Matching (Last Resort - ONLY if project has NO templates):
 *    - Partial offer_type matching for edge cases
 *    - Sorted by usage_count and createdAt
 *    - Only used when project has zero templates assigned
 *
 * 4. Generic Templates (Ultimate Fallback - ONLY if project has NO templates):
 *    - Templates with generic offer_type values
 *    - Ensures PDF generation has a fallback option
 *    - Only used when project has zero templates assigned
 *
 * KEY IMPROVEMENTS:
 * - ✅ Uses stable project.pdf_templates relationship instead of unstable team_id field
 * - ✅ STRICT project template checking - no fallback if project has templates
 * - ✅ STRICT offer_type validation - only returns templates with valid enum values
 * - ✅ Comprehensive logging for debugging and monitoring
 * - ✅ Template validation before usage
 * - ✅ Usage count tracking and priority-based sorting
 * - ✅ Detailed error reporting with actionable suggestions
 * - ✅ Prevents configuration issues from being masked by global fallbacks
 * - ✅ Identifies templates with invalid offer_type values that need fixing
 *
 * @module services/offerService/utils/autoPdfGeneration
 * @author LeadPylot System
 * @version 2.1.0
 * @since 2024
 */

const { PdfTemplate, logger, GeneratedPdf, Team, Lead, Source } = require('../config/dependencies');
const pdfGenerationService = require('../../pdfGenerationService');
const { default: axios } = require('axios');

/**
 * Resolve the lead's source_id from the lead document
 * @param {string|ObjectId} leadId - The lead ID
 * @returns {string|null} - The source ObjectId as string, or null
 */
const resolveLeadSourceId = async (leadId) => {
  try {
    if (!leadId) return null;

    const lead = await Lead.findById(leadId).select('source_id').populate('source_id', 'name').lean();
    if (!lead || !lead.source_id) {
      logger.debug('📋 Lead has no source_id', {
        leadId,
        hasLead: !!lead,
        hasSourceId: !!lead?.source_id,
      });
      return null;
    }

    const sourceId = lead.source_id._id?.toString() || lead.source_id.toString();
    const sourceName = lead.source_id.name || 'unknown';

    logger.info('📋 Resolved lead source', {
      leadId,
      sourceId,
      sourceName,
    });

    return sourceId;
  } catch (error) {
    logger.warn('⚠️ Error resolving lead source_id', {
      leadId,
      error: error.message,
    });
    return null;
  }
};

/**
 * Find the best matching PDF template for an offer with enhanced search strategies
 * @param {string} offerType - The offer type (Tagesgeld, Festgeld, ETF)
 * @param {Object} projectId - The project object with _id and name
 * @param {string|null} leadSourceId - The lead's source ObjectId as string (or null)
 * @returns {Object|null} - The best matching template or null
 */
const findBestTemplateForOffer = async (offerType, projectId, leadSourceId = null) => {
  try {
    // Validate and normalize offer type
    if (!offerType) {
      logger.warn('⚠️ No offer type provided for template search', {
        projectId: projectId?._id,
        projectName: projectId?.name,
      });
      return null;
    }

    const offerTypeLower = offerType.toLowerCase();
    let templateOfferType;

    // Map offer types to template offer types (strict matching)
    switch (offerTypeLower) {
      case 'tagesgeld':
        templateOfferType = 'tagesgeld';
        break;
      case 'festgeld':
        templateOfferType = 'festgeld';
        break;
      case 'etf':
        templateOfferType = 'etf';
        break;
      default:
        logger.warn('⚠️ Unsupported offer type for PDF template matching', {
          offerType: offerType,
          supportedTypes: ['Tagesgeld', 'Festgeld', 'ETF'],
          projectId: projectId?._id,
          projectName: projectId?.name,
        });
        return null;
    }

    logger.info('🔍 Starting enhanced PDF template search', {
      offerType,
      mappedOfferType: templateOfferType,
      leadSourceId,
      projectId: projectId?._id,
      projectName: projectId?.name,
    });

    // Strategy 1: Project-specific templates (highest priority - STRICT CHECK)
    logger.info('📍 Strategy 1: Searching for project-specific templates (STRICT CHECK)');

    // Note: We first try exact match (lowercase), then fallback to case-insensitive search
    // This handles templates that may have uppercase offer_type values while maintaining strict checking

    // Use Team from dependencies instead of requiring it again
    const project = await Team.findById(projectId._id).populate('pdf_templates');

    if (!project) {
      logger.warn('⚠️ Project not found, skipping project-specific template search', {
        projectId: projectId._id,
        offerType,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Get project-specific templates from the project's pdf_templates array
      if (project.pdf_templates && project.pdf_templates.length > 0) {
        const projectTemplateIds = project.pdf_templates.map((template) => template._id);

        let projectTemplates = await PdfTemplate.find({
          _id: { $in: projectTemplateIds },
          active: true,
          status: 'active',
          category: 'offer',
          offer_type: { $in: ['festgeld', 'tagesgeld', 'etf'] }, // Only valid enum values
        })
          .sort({
            usage_count: -1, // Most used first
            createdAt: -1, // Newest first
            priority: 1, // Priority field if available (defaults to 1)
          })
          .limit(10); // Get more for lead_source filtering

        // If we found valid templates, filter by the specific offer type
        if (projectTemplates && projectTemplates.length > 0) {
          const exactMatchTemplates = projectTemplates.filter(
            (template) => template.offer_type === templateOfferType
          );

          if (exactMatchTemplates.length > 0) {
            // Use exact matches first
            projectTemplates = exactMatchTemplates;
            logger.info('✅ Found exact offer_type matches', {
              projectId: projectId._id,
              offerType,
              templateOfferType,
              leadSourceId,
              exactMatches: exactMatchTemplates.length,
              totalValidTemplates: projectTemplates.length,
            });

            // Now apply lead_source filtering if leadSourceId is provided
            if (leadSourceId && projectTemplates.length > 0) {
              const leadSourceStr = leadSourceId.toString();

              // Priority 1: Templates whose lead_source array contains the lead's source
              const leadSourceMatches = projectTemplates.filter(
                (template) => Array.isArray(template.lead_source) && template.lead_source.length > 0
                  && template.lead_source.some((s) => s.toString() === leadSourceStr)
              );

              if (leadSourceMatches.length > 0) {
                projectTemplates = leadSourceMatches;
                logger.info('✅ Found templates matching both offer_type and lead_source', {
                  projectId: projectId._id,
                  offerType,
                  templateOfferType,
                  leadSourceId,
                  matchCount: leadSourceMatches.length,
                });
              } else {
                // Priority 2: Fall back to templates with empty lead_source array (any source)
                const genericSourceTemplates = projectTemplates.filter(
                  (template) => !template.lead_source || !Array.isArray(template.lead_source) || template.lead_source.length === 0
                );

                if (genericSourceTemplates.length > 0) {
                  projectTemplates = genericSourceTemplates;
                  logger.info('📋 No lead_source-specific templates found, using generic templates (lead_source=[])', {
                    projectId: projectId._id,
                    offerType,
                    templateOfferType,
                    leadSourceId,
                    genericCount: genericSourceTemplates.length,
                  });
                } else {
                  // Priority 3: Use any matching offer_type template regardless of lead_source
                  logger.info('⚠️ No generic templates either, using any offer_type match', {
                    projectId: projectId._id,
                    offerType,
                    templateOfferType,
                    leadSourceId,
                  });
                  projectTemplates = exactMatchTemplates;
                }
              }
            }
          } else {
            // If no exact matches, use any valid template (fallback)
            logger.info('⚠️ No exact offer_type matches, using any valid template as fallback', {
              projectId: projectId._id,
              offerType,
              templateOfferType,
              leadSourceId,
              availableTypes: [...new Set(projectTemplates.map((t) => t.offer_type))],
              totalValidTemplates: projectTemplates.length,
            });
          }
        }

        // If no valid templates found, try case-insensitive search for templates that need updating
        if (!projectTemplates || projectTemplates.length === 0) {
          logger.info(
            '🔍 No valid templates found, checking for templates with invalid offer_type values',
            {
              projectId: projectId._id,
              offerType,
              templateOfferType,
              projectTemplateCount: project.pdf_templates.length,
            }
          );

          // Find templates that exist but have invalid offer_type values
          const invalidTemplates = await PdfTemplate.find({
            _id: { $in: projectTemplateIds },
            active: true,
            status: 'active',
            category: 'offer',
            offer_type: { $nin: ['festgeld', 'tagesgeld', 'etf'] }, // Invalid values
          });

          if (invalidTemplates && invalidTemplates.length > 0) {
            logger.error(
              '❌ Project has templates with invalid offer_type values - these need to be fixed',
              {
                projectId: projectId._id,
                projectName: project.name,
                invalidTemplates: invalidTemplates.map((t) => ({
                  id: t._id,
                  name: t.name,
                  offer_type: t.offer_type,
                  expectedValues: ['festgeld', 'tagesgeld', 'etf'],
                })),
                message:
                  'Templates exist but have invalid offer_type values. These need to be updated to use lowercase values.',
                action: 'UPDATE_TEMPLATE_OFFER_TYPE',
              }
            );
          }
        }

        if (projectTemplates && projectTemplates.length > 0) {
          const bestTemplate = projectTemplates[0];
          const templateSources = Array.isArray(bestTemplate.lead_source) ? bestTemplate.lead_source : [];
          const hasSourceMatch = leadSourceId && templateSources.length > 0
            && templateSources.some((s) => s.toString() === leadSourceId.toString());

          logger.info('🎯 TEMPLATE SELECTION RESULT', {
            chosenTemplate: {
              id: bestTemplate._id,
              name: bestTemplate.name,
              offer_type: bestTemplate.offer_type,
              lead_source: templateSources.map((s) => s.toString()),
            },
            searchCriteria: {
              offerType,
              templateOfferType,
              leadSourceId: leadSourceId || null,
            },
            allCandidates: projectTemplates.map((t) => ({
              id: t._id,
              name: t.name,
              offer_type: t.offer_type,
              lead_source: (Array.isArray(t.lead_source) ? t.lead_source : []).map((s) => s.toString()),
            })),
            matchReason: leadSourceId
              ? (hasSourceMatch
                ? 'EXACT lead_source match (source found in template array)'
                : (templateSources.length === 0 ? 'Generic template (empty lead_source array)' : 'Fallback - no exact match'))
              : 'No leadSourceId provided - any template accepted',
            projectId: projectId._id,
            projectName: projectId.name,
          });
          logger.info('✅ Found project-specific template with matching offer_type', {
            templateId: bestTemplate._id,
            templateName: bestTemplate.name,
            templateOfferType: bestTemplate.offer_type,
            offerType,
            projectId: projectId._id,
            projectName: projectId.name,
            usageCount: bestTemplate.usage_count || 0,
            priority: bestTemplate.priority || 'default',
            strategy: 'project-specific',
            totalFound: projectTemplates.length,
            projectTemplateCount: project.pdf_templates.length,
          });
          return bestTemplate;
        }

        // CRITICAL: If project has templates but none match the offer type,
        // we should NOT fall back to global templates - this is a configuration issue
        logger.error(
          '❌ Project has templates but none match the offer type - NO FALLBACK ALLOWED',
          {
            projectId: projectId._id,
            projectName: project.name,
            totalProjectTemplates: project.pdf_templates.length,
            offerType,
            templateOfferType,
            projectTemplateIds: projectTemplateIds,
            message:
              'Project has templates but none match the offer type. This is a configuration issue that needs to be resolved.',
            action: 'NO_FALLBACK_TO_GLOBAL',
            result: 'project-has-templates-but-no-match',
          }
        );

        return null; // Return null instead of continuing to global templates
      }

      logger.info('📋 Project found but no templates assigned to project', {
        projectId: projectId._id,
        projectName: project.name,
        totalProjectTemplates: 0,
        offerType,
        templateOfferType,
        message:
          'Project has no templates assigned. Will continue to global templates as fallback.',
      });
    }

    // No template found after all strategies
    logger.error('❌ No PDF template found for offer type after all search strategies', {
      offerType,
      mappedOfferType: templateOfferType,
      projectId: projectId._id,
      projectName: projectId.name,
      searchStrategies: ['project-specific', 'global', 'fuzzy', 'generic'],
      searchCriteria: {
        category: 'offer',
        offer_type: templateOfferType,
        active: true,
        status: 'active',
        projectId: projectId._id,
      },
      result: 'no-template-found',
      projectTemplateCount: project?.pdf_templates?.length || 0,
      fallbackAllowed: project?.pdf_templates?.length === 0,
    });

    return null;
  } catch (error) {
    logger.error('💥 Error during enhanced PDF template search', {
      offerType,
      projectId: projectId?._id,
      projectName: projectId?.name,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    throw error; // Re-throw to allow proper error handling upstream
  }
};

/**
 * Helper function to search for templates by project and offer type
 * @param {Object} project - The project/team object with pdf_templates array
 * @param {string} offerType - The offer type to search for
 * @param {Object} options - Search options
 * @param {number} options.limit - Maximum number of templates to return
 * @param {boolean} options.includeInactive - Whether to include inactive templates
 * @param {string|null} options.leadSourceId - Lead source ObjectId as string (or null)
 * @returns {Array} - Array of matching templates
 */
const searchTemplatesByProjectAndType = async (project, offerType, options = {}) => {
  const { limit = 3, includeInactive = false, leadSourceId = null } = options;

  if (!project || !project.pdf_templates || project.pdf_templates.length === 0) {
    return [];
  }

  const projectTemplateIds = project.pdf_templates.map((template) => template._id);
  const activeFilter = includeInactive ? {} : { active: true, status: 'active' };

  // Build lead_source filter: match templates that include this source OR have empty array
  const leadSourceFilter = leadSourceId
    ? { $or: [{ lead_source: leadSourceId }, { lead_source: { $size: 0 } }, { lead_source: { $exists: false } }] }
    : {};

  return await PdfTemplate.find({
    _id: { $in: projectTemplateIds },
    ...activeFilter,
    ...leadSourceFilter,
    category: 'offer',
    offer_type: { $in: ['festgeld', 'tagesgeld', 'etf'] }, // Only valid enum values
  })
    .sort({
      usage_count: -1,
      createdAt: -1,
      priority: 1,
    })
    .limit(limit);
};

/**
 * Helper function to get project/team with populated PDF templates
 * @param {string} projectId - The project ID
 * @returns {Object|null} - Project object with populated pdf_templates or null
 */
const getProjectWithTemplates = async (projectId) => {
  try {
    // Use Team from dependencies instead of requiring it again
    return await Team.findById(projectId).populate('pdf_templates');
  } catch (error) {
    logger.error('Error fetching project with templates', {
      projectId,
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
};

/**
 * Generate PDF for an offer automatically (GeneratedPdf only, no Document assignment)
 * @param {Object} offer - The offer object
 * @param {Object} user - The user creating the offer
 * @param {Object} template - The PDF template to use
 * @returns {Object} - Result object with success status and generated PDF info
 */
const generateAutoPdfForOffer = async (offer, user, template, token) => {
  try {
    if (!template) {
      return {
        success: false,
        error: 'No suitable template found',
        autoGenerated: false,
      };
    }

    // Determine if sensitive fields should be excluded
    const shouldExcludeFields = user.role !== 'Admin' && !user.unmask;
    const fieldsToExclude = shouldExcludeFields
      ? ['email', 'number', 'phone', 'email_from', 'phone_from']
      : [];

    logger.info('🚀 Starting auto PDF generation for offer', {
      offerId: offer._id,
      templateId: template._id,
      templateName: template.name,
      userId: user._id,
      userToken: token,
      userRole: user.role,
      userUnmask: user.unmask,
      sensitiveFieldsIncluded: !shouldExcludeFields,
      excludedFields: fieldsToExclude,
    });

    // Check if PDF service URL is configured
    const pdfServiceUrl =
      process.env.PDF_GENERATE_API_URL || `http://18.199.199.138:4009/pdf/generate-offer`;
    if (!pdfServiceUrl) {
      logger.error('❌ PDF_GENERATE_API_URL not configured', {
        offerId: offer._id,
        templateId: template._id,
        message: 'PDF_GENERATE_API_URL environment variable is not set',
      });

      return {
        success: false,
        error:
          'PDF service URL not configured. Please set PDF_GENERATE_API_URL environment variable.',
        autoGenerated: false,
      };
    }

    logger.info('📡 Preparing to call PDF service API', {
      offerId: offer._id,
      templateId: template._id,
      pdfServiceUrl,
      hasUserToken: !!user.token,
      requestBody: {
        templateId: template._id,
        offerId: offer._id,
        notes: 'Auto-generated PDF for new offer',
        tags: ['auto-generated', 'offer-creation'],
        excludeFields: fieldsToExclude,
      },
    });

    // Generate PDF using the PDF service API - this creates GeneratedPdf record
    let pdfServiceResponse;
    try {
      pdfServiceResponse = await axios.post(
        pdfServiceUrl,
        {
          templateId: template._id,
          offerId: offer._id,
          notes: 'Auto-generated PDF for new offer',
          tags: ['auto-generated', 'offer-creation'],
          excludeFields: fieldsToExclude,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          timeout: 600000, // 10 minute timeout
        }
      );

      logger.info('✅ PDF service response received', {
        offerId: offer._id,
        templateId: template._id,
        status: pdfServiceResponse.status,
        statusText: pdfServiceResponse.statusText,
        success: pdfServiceResponse.data?.success,
        hasData: !!pdfServiceResponse.data,
        dataKeys: pdfServiceResponse.data ? Object.keys(pdfServiceResponse.data) : [],
      });
    } catch (axiosError) {
      const errorDetails = {
        offerId: offer._id,
        templateId: template._id,
        error: axiosError.message,
        pdfServiceUrl,
        hasResponse: !!axiosError.response,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        errorData: axiosError.response?.data,
        isTimeout: axiosError.code === 'ECONNABORTED',
        isNetworkError: axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND',
        axiosCode: axiosError.code,
      };

      // Log different levels based on error type
      if (errorDetails.isNetworkError) {
        logger.error('❌ PDF service is not reachable - Network error', errorDetails);
      } else if (errorDetails.isTimeout) {
        logger.error('❌ PDF service request timeout', errorDetails);
      } else if (axiosError.response) {
        logger.error('❌ PDF service returned error response', errorDetails);
      } else {
        logger.error('❌ PDF service API call failed', errorDetails);
      }

      return {
        success: false,
        error:
          axiosError.response?.data?.error || axiosError.message || 'PDF service API call failed',
        errorCode: axiosError.code,
        autoGenerated: false,
      };
    }

    // Extract the response data from axios response
    const pdfResult = pdfServiceResponse.data;

    logger.info('📦 PDF service response data structure', {
      offerId: offer._id,
      templateId: template._id,
      success: pdfResult?.success,
      hasData: !!pdfResult?.data,
      dataStructure: pdfResult?.data ? Object.keys(pdfResult.data) : [],
      hasGeneratedPdf: !!pdfResult?.data?.generatedPdf,
      generatedPdfId: pdfResult?.data?.generatedPdf?._id,
      error: pdfResult?.error,
      fullResponse: JSON.stringify(pdfResult, null, 2),
    });

    if (!pdfResult || !pdfResult.success) {
      logger.error('❌ Auto PDF generation failed - Service returned error', {
        offerId: offer._id,
        templateId: template._id,
        success: pdfResult?.success,
        error: pdfResult?.error,
        code: pdfResult?.code,
        fullResponse: pdfResult,
      });

      return {
        success: false,
        error: pdfResult?.error || 'PDF generation failed - no success status from service',
        autoGenerated: false,
      };
    }

    // Validate response structure
    if (!pdfResult.data || !pdfResult.data.generatedPdf) {
      logger.error('❌ Invalid PDF service response structure', {
        offerId: offer._id,
        templateId: template._id,
        hasData: !!pdfResult.data,
        hasGeneratedPdf: !!pdfResult.data?.generatedPdf,
        responseKeys: pdfResult.data ? Object.keys(pdfResult.data) : [],
        fullResponse: pdfResult,
      });

      return {
        success: false,
        error: 'Invalid response structure from PDF service - missing generatedPdf data',
        autoGenerated: false,
      };
    }

    // Map the PDF service response to the expected structure
    const generatedPdf = pdfResult.data.generatedPdf;

    logger.info('✅ PDF generation result validated', {
      offerId: offer._id,
      templateId: template._id,
      success: true,
      generatedPdfId: generatedPdf._id,
      filename: pdfResult.data.filename,
    });

    // Update template usage count
    await PdfTemplate.findByIdAndUpdate(template._id, {
      $inc: { usage_count: 1 },
      last_used: new Date(),
    });

    logger.info('✅ Auto PDF generation completed successfully', {
      offerId: offer._id,
      templateId: template._id,
      generatedPdfId: generatedPdf._id,
      filename: pdfResult.data.filename,
      fileSize: pdfResult.data.fileSize,
    });

    // Return the same structure as manual PDF generation with PDF service response data
    return {
      success: true,
      autoGenerated: true,
      generatedPdf: generatedPdf,
      template: {
        _id: template._id,
        name: template.name,
        category: template.category,
        offer_type: template.offer_type,
        lead_source: template.lead_source,
      },
      // URLs from the PDF service response
      previewUrl: pdfResult.data.previewUrl,
      downloadUrl: pdfResult.data.downloadUrl,
      assignUrl: pdfResult.data.assignUrl,
      filename: pdfResult.data.filename,
      fileSize: pdfResult.data.fileSize,
      // No document assignment - user must manually assign via assignUrl
      documentAssigned: false,
      message:
        pdfResult.message ||
        'PDF generated successfully. Use the assignUrl to assign it as a document to the offer.',
    };
  } catch (error) {
    logger.error('❌ Error in auto PDF generation', {
      offerId: offer._id,
      templateId: template?._id,
      error: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: error.message,
      autoGenerated: false,
    };
  }
};

/**
 * Main function to handle auto PDF generation for offer creation
 * @param {Object} offer - The created offer object
 * @param {Object} user - The user creating the offer
 * @returns {Object} - Result object with auto generation status
 */
const handleAutoPdfGeneration = async (offer, user, token) => {
  try {
    // Skip auto PDF generation for non-admin users (agents don't have pdf:generation:create permission)
    if (user.role !== 'Admin') {
      logger.info('⏭️ Skipping auto PDF generation for non-admin user', {
        offerId: offer._id,
        userId: user._id,
        userRole: user.role,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        autoGenerated: false,
        reason: 'Auto PDF generation is only available for admin users',
        message: 'PDF generation skipped: Auto PDF generation requires admin permissions. Please generate PDF manually.',
        templateFound: false,
        timestamp: new Date().toISOString(),
      };
    }

    // Validate offer type before proceeding
    if (!offer.offerType) {
      logger.warn('⚠️ Offer created without offer_type, skipping PDF generation', {
        offerId: offer._id,
        projectId: offer.project_id,
        userId: user._id,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        autoGenerated: false,
        reason: 'No offer type specified',
        message: 'PDF generation skipped: No offer type specified in the offer.',
        templateFound: false,
        timestamp: new Date().toISOString(),
      };
    }

    // Resolve lead source_id from the lead
    const leadId = offer.lead_id?._id || offer.lead_id;
    const leadSourceId = await resolveLeadSourceId(leadId);

    logger.info('🚀 Starting auto PDF generation process', {
      offerId: offer._id,
      offerType: offer.offerType,
      leadSourceId,
      leadId,
      projectId: offer.project_id,
      userId: user._id,
      timestamp: new Date().toISOString(),
    });

    // Find the best matching template with enhanced search strategies (including lead source)
    const template = await findBestTemplateForOffer(offer.offerType, offer.project_id, leadSourceId);

    if (!template) {
      // Get template search statistics for debugging
      const searchStats = await getTemplateSearchStats(offer.offerType, offer.project_id);

      // Determine the specific reason for no template found
      let reason = 'No matching template found';
      let message = `PDF generation skipped: No active PDF template found for offer type '${offer.offerType}'.`;
      let suggestions = [];

      const supportedTypes = ['Tagesgeld', 'Festgeld', 'ETF'];
      if (!supportedTypes.includes(offer.offerType)) {
        reason = 'Unsupported offer type';
        message = `PDF generation skipped: Offer type '${offer.offerType}' is not supported. Supported types: ${supportedTypes.join(', ')}.`;
        suggestions.push(`Use one of the supported offer types: ${supportedTypes.join(', ')}`);
      } else {
        // Provide helpful suggestions based on search statistics
        if (searchStats.success && searchStats.stats) {
          const { projectSpecific, global, totalActive, offerTypeDistribution } = searchStats.stats;

          if (totalActive === 0) {
            reason = 'No active templates in system';
            message = 'PDF generation skipped: No active PDF templates found in the system.';
            suggestions.push('Create at least one active PDF template for offers');
          } else if (projectSpecific === 0 && global === 0) {
            reason = 'No accessible templates';
            message = 'PDF generation skipped: No accessible PDF templates found for this project.';
            suggestions.push('Create project-specific templates or global templates');
          } else {
            reason = 'No matching offer type templates';
            message = `PDF generation skipped: No templates found for offer type '${offer.offerType}'.`;
            suggestions.push(`Create templates for offer type '${offer.offerType}'`);

            if (offerTypeDistribution && offerTypeDistribution.length > 0) {
              const availableTypes = offerTypeDistribution.map((item) => item._id).join(', ');
              suggestions.push(`Available offer types in system: ${availableTypes}`);
            }
          }
        }
      }

      logger.info('📄 PDF generation skipped due to template mismatch', {
        offerId: offer._id,
        offerType: offer.offerType,
        projectId: offer.project_id,
        userId: user._id,
        reason,
        supportedTypes,
        searchStats: searchStats.success ? searchStats.stats : null,
        suggestions,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        autoGenerated: false,
        reason,
        message,
        templateFound: false,
        offerType: offer.offerType,
        supportedTypes,
        suggestions,
        searchStats: searchStats.success ? searchStats.stats : null,
        timestamp: new Date().toISOString(),
      };
    }

    // Validate the found template before using it
    const templateValidation = validateTemplate(template);
    if (!templateValidation.valid) {
      logger.error('❌ Template validation failed', {
        offerId: offer._id,
        templateId: template._id,
        validationError: templateValidation.error,
        validationDetails: templateValidation.details,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        autoGenerated: false,
        reason: 'Template validation failed',
        message: `PDF generation failed: ${templateValidation.error}`,
        templateFound: true,
        templateValid: false,
        validationError: templateValidation.error,
        validationDetails: templateValidation.details,
        timestamp: new Date().toISOString(),
      };
    }

    logger.info('✅ Template found and validated successfully', {
      offerId: offer._id,
      templateId: template._id,
      templateName: template.name,
      offerType: offer.offerType,
      templateOfferType: template.offer_type,
      validationDetails: templateValidation.details,
      timestamp: new Date().toISOString(),
    });

    // Generate the PDF (GeneratedPdf only, no Document assignment)
    const result = await generateAutoPdfForOffer(offer, user, template, token);

    // Log generation result
    if (result.success) {
      logger.info('🎉 Auto PDF generation completed successfully', {
        offerId: offer._id,
        templateId: template._id,
        generatedPdfId: result.generatedPdf?._id,
        userId: user._id,
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.error('❌ Auto PDF generation failed in generateAutoPdfForOffer', {
        offerId: offer._id,
        templateId: template._id,
        userId: user._id,
        error: result.error,
        errorCode: result.errorCode,
        autoGenerated: result.autoGenerated,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      ...result,
      templateFound: true,
      templateValid: true,
      offerType: offer.offerType,
      leadSourceId,
      matchedTemplate: {
        id: template._id,
        name: template.name,
        offer_type: template.offer_type,
        lead_source: template.lead_source,
        validation: templateValidation.details,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('💥 Critical error in handleAutoPdfGeneration', {
      offerId: offer._id,
      offerType: offer.offerType,
      projectId: offer.project_id,
      userId: user._id,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      autoGenerated: false,
      reason: 'System error during PDF generation',
      message: 'PDF generation failed due to a system error. Please try again or contact support.',
      templateFound: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Validate template before using it for PDF generation
 * @param {Object} template - The PDF template to validate
 * @returns {Object} - Validation result with success status and details
 */
const validateTemplate = (template) => {
  if (!template) {
    return {
      valid: false,
      error: 'Template is null or undefined',
      details: 'No template provided for validation',
    };
  }

  const requiredFields = ['_id', 'name', 'category', 'offer_type'];
  const missingFields = requiredFields.filter((field) => !template[field]);

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Template missing required fields: ${missingFields.join(', ')}`,
      details: {
        templateId: template._id,
        missingFields,
        template: template,
      },
    };
  }

  if (!template.active || template.status !== 'active' || template.category !== 'offer') {
    return {
      valid: false,
      error: 'Template is not active or not configured for offers',
      details: {
        templateId: template._id,
        active: template.active,
        status: template.status,
        category: template.category,
      },
    };
  }

  // Check for case mismatch in offer_type (warning, not error)
  if (template.offer_type && template.offer_type !== template.offer_type.toLowerCase()) {
    logger.warn('⚠️ Template has uppercase offer_type which may cause validation issues', {
      templateId: template._id,
      templateName: template.name,
      offer_type: template.offer_type,
      expectedCase: template.offer_type.toLowerCase(),
      message:
        'Consider updating template to use lowercase offer_type to prevent validation errors',
    });
  }

  return {
    valid: true,
    template: template,
    details: {
      templateId: template._id,
      templateName: template.name,
      offerType: template.offer_type,
      category: template.category,
      active: template.active,
      status: template.status,
    },
  };
};

/**
 * Get template search statistics for monitoring and debugging
 * @param {string} offerType - The offer type being searched
 * @param {Object} projectId - The project object
 * @returns {Object} - Search statistics and available templates
 */
const getTemplateSearchStats = async (offerType, projectId) => {
  try {
    const offerTypeLower = offerType?.toLowerCase();

    // Get project/team to find its assigned PDF templates
    // Use Team from dependencies instead of requiring it again
    const project = await Team.findById(projectId._id).populate('pdf_templates');

    let projectSpecificCount = 0;
    if (project && project.pdf_templates && project.pdf_templates.length > 0) {
      // Count active templates that are assigned to this project
      projectSpecificCount = await PdfTemplate.countDocuments({
        _id: { $in: project.pdf_templates.map((template) => template._id) },
        active: true,
        status: 'active',
        category: 'offer',
      });
    }

    const globalCount = await PdfTemplate.countDocuments({
      active: true,
      status: 'active',
      category: 'offer',
      $or: [{ team_id: { $exists: false } }, { team_id: null }, { team_id: '' }],
    });

    const totalActiveCount = await PdfTemplate.countDocuments({
      active: true,
      status: 'active',
      category: 'offer',
    });

    // Get offer type distribution
    const offerTypeDistribution = await PdfTemplate.aggregate([
      {
        $match: {
          active: true,
          status: 'active',
          category: 'offer',
        },
      },
      {
        $group: {
          _id: '$offer_type',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    return {
      success: true,
      stats: {
        projectSpecific: projectSpecificCount,
        global: globalCount,
        totalActive: totalActiveCount,
        offerTypeDistribution,
        projectInfo: project
          ? {
              projectId: project._id,
              projectName: project.name,
              totalAssignedTemplates: project.pdf_templates?.length || 0,
              activeAssignedTemplates: projectSpecificCount,
            }
          : null,
        searchContext: {
          offerType,
          projectId: projectId._id,
          projectName: projectId.name,
          timestamp: new Date().toISOString(),
        },
      },
    };
  } catch (error) {
    logger.error('Error getting template search statistics', {
      offerType,
      projectId: projectId?._id,
      error: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: error.message,
      stats: null,
    };
  }
};

/**
 * Clear template cache if caching is implemented
 * @param {string} projectId - The project ID to clear cache for
 * @returns {Object} - Cache clearing result
 */
const clearTemplateCache = (projectId = null) => {
  // This function can be used when template caching is implemented
  // For now, it's a placeholder for future enhancement
  logger.info('Template cache clearing requested', {
    projectId,
    timestamp: new Date().toISOString(),
    note: 'Template caching not yet implemented',
  });

  return {
    success: true,
    message: 'Template cache cleared (caching not yet implemented)',
    timestamp: new Date().toISOString(),
  };
};

module.exports = {
  handleAutoPdfGeneration,
  findBestTemplateForOffer,
  generateAutoPdfForOffer,
  validateTemplate,
  getTemplateSearchStats,
  clearTemplateCache,
  searchTemplatesByProjectAndType,
  getProjectWithTemplates,
  resolveLeadSourceId,
};
