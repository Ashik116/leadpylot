const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class QueryEngine {
    constructor() {
        this.models = {};
        // Field name mappings for aliases (used in frontend/metadata but different in schema)
        this.fieldMappings = {
            'Lead': {
                'source_user_id': 'source_agent',
                'source_team_id': 'source_project',
                'partner_id': 'lead_source_no'
            },
            'ClosedLead': {
                'partner_id': 'lead_source_no',
                'project_id': 'team_id',
                'agent_id': 'user_id',
                // Schema fields are source_user_id / source_team_id; API uses same names as Lead
                'source_agent': 'source_user_id',
                'source_project': 'source_team_id',
            }
        };
        
        // Date granularity formats for grouping
        // Supports: day (default), week, month, year
        this.dateGranularityFormats = {
            'day': '%Y-%m-%d',
            'week': '%Y-W%V',      // ISO week: 2024-W52
            'month': '%Y-%m',      // 2024-12
            'year': '%Y'           // 2024
        };
    }

    /**
     * Parse field name with optional granularity suffix
     * Supports format: "fieldName:granularity" (e.g., "lead_date:month", "createdAt:year")
     * @param {string} field - Field name, optionally with :granularity suffix
     * @returns {Object} - { baseField: string, granularity: string|null }
     */
    _parseFieldGranularity(field) {
        if (!field || typeof field !== 'string') {
            return { baseField: field, granularity: null };
        }
        
        // Check for granularity suffix (colon-separated)
        const colonIndex = field.lastIndexOf(':');
        if (colonIndex === -1) {
            return { baseField: field, granularity: null };
        }
        
        const potentialGranularity = field.substring(colonIndex + 1).toLowerCase();
        const validGranularities = ['day', 'week', 'month', 'year'];
        
        if (validGranularities.includes(potentialGranularity)) {
            return {
                baseField: field.substring(0, colonIndex),
                granularity: potentialGranularity
            };
        }
        
        // Not a valid granularity suffix, treat entire string as field name
        return { baseField: field, granularity: null };
    }

    /**
     * Get date format string for a given granularity
     * @param {string} granularity - 'day', 'week', 'month', or 'year'
     * @returns {string} - MongoDB date format string
     */
    _getDateFormat(granularity) {
        return this.dateGranularityFormats[granularity] || this.dateGranularityFormats['day'];
    }

    /**
     * Format date string for display as groupName based on granularity
     * Converts raw date strings to human-readable format
     * @param {string} dateStr - Raw date string from $dateToString (e.g., "2024-12-15", "2024-W51", "2024-12", "2024")
     * @param {string} granularity - 'day', 'week', 'month', or 'year' (null defaults to 'day')
     * @returns {string} - Formatted date string for display
     */
    _formatDateGroupName(dateStr, granularity) {
        if (!dateStr) return 'None';
        
        const effectiveGranularity = granularity || 'day';
        
        try {
            switch (effectiveGranularity) {
                case 'year':
                    // Input: "2024" -> Output: "2024"
                    return dateStr;
                    
                case 'month':
                    // Input: "2024-12" -> Output: "December 2024"
                    const [year, month] = dateStr.split('-');
                    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                       'July', 'August', 'September', 'October', 'November', 'December'];
                    const monthIndex = parseInt(month, 10) - 1;
                    if (monthIndex >= 0 && monthIndex < 12) {
                        return `${monthNames[monthIndex]} ${year}`;
                    }
                    return dateStr;
                    
                case 'week':
                    // Input: "2024-W51" -> Output: "Week 51, 2024"
                    const weekMatch = dateStr.match(/^(\d{4})-W(\d{1,2})$/);
                    if (weekMatch) {
                        return `Week ${parseInt(weekMatch[2], 10)}, ${weekMatch[1]}`;
                    }
                    return dateStr;
                    
                case 'day':
                default:
                    // Input: "2024-12-15" -> Output: "Dec 15, 2024"
                    const dateParts = dateStr.split('-');
                    if (dateParts.length === 3) {
                        const [y, m, d] = dateParts;
                        const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const mIndex = parseInt(m, 10) - 1;
                        if (mIndex >= 0 && mIndex < 12) {
                            return `${shortMonths[mIndex]} ${parseInt(d, 10)}, ${y}`;
                        }
                    }
                    return dateStr;
            }
        } catch (e) {
            // If formatting fails, return original string
            return dateStr;
        }
    }

    /**
     * Parse formatted date group name back to date range
     * Converts human-readable format back to MongoDB date range query
     * @param {string} formattedValue - Formatted date string (e.g., "December 2025", "Week 51, 2024", "2024")
     * @param {string} granularity - 'day', 'week', 'month', or 'year'
     * @returns {Object|null} - { $gte: Date, $lt: Date } for range query, or null if parsing fails
     */
    _parseDateGroupValue(formattedValue, granularity) {
        if (!formattedValue || formattedValue === 'None') return null;
        
        try {
            // Strip field name prefix if present (e.g., "createdAt_2024-01-15" -> "2024-01-15", "lead_date_month_2024-12" -> "2024-12")
            let cleanValue = formattedValue;
            
            // Check if the value is already in human-readable format (e.g., "December 2021", "Week 51, 2024", "Dec 30, 2021")
            // If so, skip the date pattern extraction to preserve the format
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                               'July', 'August', 'September', 'October', 'November', 'December'];
            // Day format: "Dec 30, 2021" or "Dec 19, 2023"
            const isHumanReadableDay = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s*\d{4}$/i.test(cleanValue.trim());
            const isHumanReadableMonth = monthNames.some(m => cleanValue.includes(m));
            const isHumanReadableWeek = /Week\s+\d{1,2}/i.test(cleanValue);
            const isHumanReadableFormat = isHumanReadableMonth || isHumanReadableWeek || isHumanReadableDay;
            
            if (!isHumanReadableFormat) {
                // First, try to extract date part from groupId format: fieldName_dateValue or fieldName_granularity_dateValue
                // Common patterns:
                // - createdAt_2024-01-15 (day)
                // - createdAt_2024-12 (month)
                // - createdAt_2024-W02 (week)
                // - createdAt_2024 (year)
                // - lead_date_day_2024-01-15 (with granularity prefix)
                
                // Pattern 1: fieldName_granularity_dateValue (e.g., "createdAt_day_2024-01-15")
                const fieldGranDateMatch = cleanValue.match(/^[a-zA-Z_]+_(year|month|week|day)_(.+)$/);
                if (fieldGranDateMatch) {
                    cleanValue = fieldGranDateMatch[2];
                } else {
                    // Pattern 2: fieldName_dateValue where dateValue is recognizable date format
                    // Extract the last part that looks like a date
                    // Year: YYYY (4 digits)
                    // Month: YYYY-MM
                    // Week: YYYY-WNN
                    // Day: YYYY-MM-DD
                    const datePatterns = [
                        /(\d{4}-\d{2}-\d{2})$/,  // Day: YYYY-MM-DD (must come before month)
                        /(\d{4}-W\d{1,2})$/,     // Week: YYYY-WNN
                        /(\d{4}-\d{2})$/,        // Month: YYYY-MM
                        /(\d{4})$/               // Year: YYYY
                    ];
                    
                    for (const pattern of datePatterns) {
                        const match = cleanValue.match(pattern);
                        if (match) {
                            cleanValue = match[1];
                            break;
                        }
                    }
                }
                
                // Also handle standalone granularity prefix (legacy format)
                const granPrefixMatch = cleanValue.match(/^(year|month|week|day)_(.+)$/);
                if (granPrefixMatch) {
                    cleanValue = granPrefixMatch[2];
                }
            }
            
            switch (granularity) {
                case 'year': {
                    // Input: "2024" or "2025"
                    const year = parseInt(cleanValue, 10);
                    if (isNaN(year)) return null;
                    
                    const startDate = new Date(Date.UTC(year, 0, 1)); // Jan 1
                    const endDate = new Date(Date.UTC(year + 1, 0, 1)); // Jan 1 next year
                    return { $gte: startDate, $lt: endDate };
                }
                    
                case 'month': {
                    // Input: "December 2025" or "January 2024" or "2025-12"
                    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                       'July', 'August', 'September', 'October', 'November', 'December'];
                    
                    // Try parsing "Month Year" format
                    const parts = cleanValue.trim().split(' ');
                    if (parts.length !== 2) {
                        // Try parsing "YYYY-MM" format as fallback
                        const dashParts = cleanValue.split('-');
                        if (dashParts.length === 2) {
                            const year = parseInt(dashParts[0], 10);
                            const month = parseInt(dashParts[1], 10) - 1;
                            if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
                                const startDate = new Date(Date.UTC(year, month, 1));
                                const endDate = new Date(Date.UTC(year, month + 1, 1));
                                return { $gte: startDate, $lt: endDate };
                            }
                        }
                        return null;
                    }
                    
                    const monthName = parts[0];
                    const year = parseInt(parts[1], 10);
                    const monthIndex = monthNames.indexOf(monthName);
                    
                    if (monthIndex === -1 || isNaN(year)) return null;
                    
                    const startDate = new Date(Date.UTC(year, monthIndex, 1)); // 1st of month
                    const endDate = new Date(Date.UTC(year, monthIndex + 1, 1)); // 1st of next month
                    return { $gte: startDate, $lt: endDate };
                }
                    
                case 'week': {
                    // Input: "Week 51, 2024" or "2024-W51" or "2025-W51"
                    let year, weekNum;
                    
                    // Try "Week N, YYYY" format
                    const weekMatch = cleanValue.match(/Week\s+(\d{1,2}),?\s*(\d{4})/i);
                    if (weekMatch) {
                        weekNum = parseInt(weekMatch[1], 10);
                        year = parseInt(weekMatch[2], 10);
                    } else {
                        // Try "YYYY-WNN" format
                        const isoMatch = cleanValue.match(/^(\d{4})-W(\d{1,2})$/);
                        if (isoMatch) {
                            year = parseInt(isoMatch[1], 10);
                            weekNum = parseInt(isoMatch[2], 10);
                        } else {
                            return null;
                        }
                    }
                    
                    if (isNaN(year) || isNaN(weekNum) || weekNum < 1 || weekNum > 53) return null;
                    
                    // Calculate ISO week start (Monday) and end (Sunday)
                    // ISO week 1 is the week containing the first Thursday of the year
                    const jan4 = new Date(Date.UTC(year, 0, 4));
                    const dayOfWeek = jan4.getUTCDay() || 7; // Convert Sunday (0) to 7
                    const firstMonday = new Date(Date.UTC(year, 0, 4 - dayOfWeek + 1));
                    
                    const weekStart = new Date(firstMonday);
                    weekStart.setUTCDate(weekStart.getUTCDate() + (weekNum - 1) * 7);
                    
                    const weekEnd = new Date(weekStart);
                    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
                    
                    return { $gte: weekStart, $lt: weekEnd };
                }
                    
                case 'day':
                default: {
                    // Input: "Dec 15, 2024" or "Dec 19, 2023" or "2024-12-15" or "2025-12-16"
                    let year, month, day;
                    
                    // Ensure cleanValue is a string and trimmed
                    cleanValue = String(cleanValue).trim();
                    
                    // Try "Mon DD, YYYY" format (e.g., "Dec 19, 2023")
                    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const dayMatch = cleanValue.match(/^(\w+)\s+(\d{1,2}),?\s*(\d{4})$/);
                    if (dayMatch) {
                        const monthName = dayMatch[1];
                        const monthIdx = shortMonths.indexOf(monthName);
                        if (monthIdx !== -1) {
                            month = monthIdx;
                            day = parseInt(dayMatch[2], 10);
                            year = parseInt(dayMatch[3], 10);
                        } else {
                            logger.warn(`Invalid month name: ${monthName} in date value: ${formattedValue}`);
                        }
                    }
                    
                    // Try "YYYY-MM-DD" format
                    if (year === undefined) {
                        const isoParts = cleanValue.split('-');
                        if (isoParts.length === 3) {
                            year = parseInt(isoParts[0], 10);
                            month = parseInt(isoParts[1], 10) - 1;
                            day = parseInt(isoParts[2], 10);
                        }
                    }
                    
                    if (year === undefined || isNaN(year) || isNaN(month) || isNaN(day)) return null;
                    
                    const startDate = new Date(Date.UTC(year, month, day));
                    const endDate = new Date(Date.UTC(year, month, day + 1));
                    return { $gte: startDate, $lt: endDate };
                }
            }
        } catch (e) {
            logger.warn(`Failed to parse date group value: ${formattedValue} with granularity ${granularity}`, e);
            return null;
        }
    }

    registerModel(name, schema) {
        if (!this.models[name]) {
            this.models[name] = mongoose.model(name, schema);
        }
    }

    getModel(name) {
        return mongoose.models[name] || this.models[name];
    }

    /**
     * Map field alias to actual field name in schema
     * @param {string} field - Field name (may be an alias)
     * @param {string} modelName - Model name
     * @returns {string} - Actual field name in schema
     */
    _mapFieldName(field, modelName) {
        const mappings = this.fieldMappings[modelName];
        if (mappings && mappings[field]) {
            return mappings[field];
        }
        return field;
    }

    /**
     * Handle special lead_transfer grouping
     * Groups leads by their transfer history with hierarchical structure:
     * - First level: Date (day/month/week/year)
     * - SubGroups: Transfer pairs (from_agent → to_agent) on that date
     * 
     * This allows combining with other groupings like:
     * - [lead_transfer:day] → Dates with transfer pair subGroups
     * - [user_id, lead_transfer:day] → Agent with date subGroups (showing transfers TO that agent)
     * 
     * @param {Object} options - Grouping options
     * @returns {Object} - Grouped results with hierarchical transfer info
     */
    async _handleLeadTransferGrouping({ modelName, domain, groupBy, includeIds, limit, offset, matchStage, lookups }) {
        const LeadTransfer = this.getModel('LeadTransfer');
        const Lead = this.getModel('Lead');
        
        if (!LeadTransfer) {
            throw new Error('LeadTransfer model not found');
        }
        
        // lead_transfer should always be the last field after reordering
        const leadTransferField = groupBy[groupBy.length - 1];
        const otherFields = groupBy.slice(0, -1);
        const granularity = leadTransferField.split(':')[1] || 'day';
        const dateFormat = this._getDateFormat(granularity);
        
        // Build base pipeline for LeadTransfer
        const basePipeline = [];
        
        // 1. Match only completed transfers (exclude failed/reversed)
        basePipeline.push({
            $match: {
                transfer_status: 'completed',
                is_reversed: { $ne: true }
            }
        });
        
        // 2. Lookup from_agent_id to get agent name
        basePipeline.push({
            $lookup: {
                from: 'users',
                localField: 'from_agent_id',
                foreignField: '_id',
                as: 'from_agent'
            }
        });
        basePipeline.push({
            $unwind: {
                path: '$from_agent',
                preserveNullAndEmptyArrays: true
            }
        });
        
        // 3. Lookup to_agent_id to get agent name
        basePipeline.push({
            $lookup: {
                from: 'users',
                localField: 'to_agent_id',
                foreignField: '_id',
                as: 'to_agent'
            }
        });
        basePipeline.push({
            $unwind: {
                path: '$to_agent',
                preserveNullAndEmptyArrays: true
            }
        });
        
        // 4. Add formatted date field for grouping
        basePipeline.push({
            $addFields: {
                transfer_date_formatted: {
                    $dateToString: {
                        format: dateFormat,
                        date: '$createdAt',
                        onNull: null
                    }
                },
                from_agent_name: { $ifNull: ['$from_agent.login', 'Unassigned'] },
                to_agent_name: { $ifNull: ['$to_agent.login', 'Unknown'] }
            }
        });
        
        // 4.1 Filter out null dates to prevent "None" groups
        basePipeline.push({
            $match: {
                transfer_date_formatted: { $ne: null }
            }
        });
        
        // 5. Lookup lead to filter by active status and use_status
        basePipeline.push({
            $lookup: {
                from: 'leads',
                localField: 'lead_id',
                foreignField: '_id',
                as: 'lead'
            }
        });
        basePipeline.push({
            $unwind: {
                path: '$lead',
                preserveNullAndEmptyArrays: false
            }
        });
        
        // 5.1 Filter to only include active leads that are not pending
        basePipeline.push({
            $match: {
                'lead.active': true,
                'lead.use_status': { $ne: 'pending' }
            }
        });
        
        // 5.2 Apply domain filters to leads if provided
        if (matchStage && Object.keys(matchStage).length > 0) {
            const leadMatch = {};
            for (const [key, value] of Object.entries(matchStage)) {
                if (key === '_id') {
                    leadMatch['lead._id'] = value;
                } else {
                    leadMatch[`lead.${key}`] = value;
                }
            }
            if (Object.keys(leadMatch).length > 0) {
                basePipeline.push({ $match: leadMatch });
            }
        }
        
        // 5.3 Add lead field values for grouping by other fields (if any)
        if (otherFields.length > 0) {
            const addFieldsStage = {
                $addFields: {
                    transfer_date_formatted: {
                        $dateToString: {
                            format: dateFormat,
                            date: '$createdAt',
                            onNull: null
                        }
                    },
                    from_agent_name: { $ifNull: ['$from_agent.login', 'Unassigned'] },
                    to_agent_name: { $ifNull: ['$to_agent.login', 'Unknown'] }
                }
            };
            
            // Add lead field values for grouping
            otherFields.forEach(field => {
                const { baseField } = this._parseFieldGranularity(field);
                const actualField = this._mapFieldName(baseField, 'Lead');
                const safeKey = `lead_${baseField.replace(/\./g, '_')}`;
                addFieldsStage.$addFields[safeKey] = `$lead.${actualField}`;
            });
            
            basePipeline.push(addFieldsStage);
            
            // Filter out null dates after adding fields
            basePipeline.push({
                $match: {
                    transfer_date_formatted: { $ne: null }
                }
            });
        } else {
            // No other fields - just add date formatting
            basePipeline.push({
                $addFields: {
                    transfer_date_formatted: {
                        $dateToString: {
                            format: dateFormat,
                            date: '$createdAt',
                            onNull: null
                        }
                    },
                    from_agent_name: { $ifNull: ['$from_agent.login', 'Unassigned'] },
                    to_agent_name: { $ifNull: ['$to_agent.login', 'Unknown'] }
                }
            });
            
            // Filter out null dates
            basePipeline.push({
                $match: {
                    transfer_date_formatted: { $ne: null }
                }
            });
        }
        
        // === HIERARCHICAL GROUPING ===
        // Group by: otherFields (if any) + transfer_date + transfer_pair
        const pairPipeline = [...basePipeline];
        
        // 6. Group by transfer pairs (including other fields if present)
        const pairGroupIdFields = {};
        otherFields.forEach(field => {
            const safeKey = field.replace(/\./g, '_').replace(/:/g, '_');
            pairGroupIdFields[safeKey] = `$lead_${field.replace(/\./g, '_')}`;
        });
        pairGroupIdFields.transfer_date = '$transfer_date_formatted';
        pairGroupIdFields.from_agent_id = '$from_agent_id';
        pairGroupIdFields.to_agent_id = '$to_agent_id';
        pairGroupIdFields.from_agent_name = '$from_agent_name';
        pairGroupIdFields.to_agent_name = '$to_agent_name';
        
        pairPipeline.push({
            $group: {
                _id: pairGroupIdFields,
                unique_lead_ids: { $addToSet: '$lead_id' }
            }
        });
        
        // 6.1 Add count
        pairPipeline.push({
            $addFields: {
                count: { $size: '$unique_lead_ids' }
            }
        });
        
        // 7. Regroup by all otherFields + transfer_date (aggregate transfer pairs)
        // First, group by transfer_date within each combination of otherFields
        const dateGroupIdFields = {};
        otherFields.forEach(field => {
            const safeKey = field.replace(/\./g, '_').replace(/:/g, '_');
            dateGroupIdFields[safeKey] = `$_id.${safeKey}`;
        });
        dateGroupIdFields.transfer_date = '$_id.transfer_date';
        
        pairPipeline.push({
            $group: {
                _id: dateGroupIdFields,
                total_count: { $sum: '$count' },
                all_lead_ids: { $push: '$unique_lead_ids' },
                transfer_pairs: {
                    $push: {
                        from_agent_id: '$_id.from_agent_id',
                        to_agent_id: '$_id.to_agent_id',
                        from_agent_name: '$_id.from_agent_name',
                        to_agent_name: '$_id.to_agent_name',
                        count: '$count',
                        lead_ids: '$unique_lead_ids'
                    }
                }
            }
        });
        
        // 7.1 Flatten lead_ids arrays and sort transfer pairs by count
        pairPipeline.push({
            $addFields: {
                lead_ids: {
                    $reduce: {
                        input: '$all_lead_ids',
                        initialValue: [],
                        in: { $setUnion: ['$$value', '$$this'] }
                    }
                },
                transfer_pairs: {
                    $sortArray: {
                        input: '$transfer_pairs',
                        sortBy: { count: -1 }
                    }
                }
            }
        });
        
        // 8. Group by all otherFields together (aggregation groups all fields at once)
        // We'll build nested structure in result formatting
        let finalPipeline = pairPipeline;
        if (otherFields.length > 0) {
            // Group by all other fields together
            const otherGroupIdFields = {};
            otherFields.forEach(field => {
                const safeKey = field.replace(/\./g, '_').replace(/:/g, '_');
                otherGroupIdFields[safeKey] = `$_id.${safeKey}`;
            });
            
            finalPipeline.push({
                $group: {
                    _id: otherGroupIdFields,
                    total_count: { $sum: '$total_count' },
                    all_lead_ids: { $push: '$lead_ids' },
                    transfer_dates: {
                        $push: {
                            transfer_date: '$_id.transfer_date',
                            count: '$total_count',
                            lead_ids: '$lead_ids',
                            transfer_pairs: '$transfer_pairs'
                        }
                    }
                }
            });
            
            // Sort transfer dates within each group (descending by date)
            finalPipeline.push({
                $addFields: {
                    lead_ids: {
                        $reduce: {
                            input: '$all_lead_ids',
                            initialValue: [],
                            in: { $setUnion: ['$$value', '$$this'] }
                        }
                    },
                    transfer_dates: {
                        $sortArray: {
                            input: '$transfer_dates',
                            sortBy: { transfer_date: -1 }
                        }
                    }
                }
            });
            
            // Sort by first other field
            const firstOtherField = otherFields[0];
            const firstSafeKey = firstOtherField.replace(/\./g, '_').replace(/:/g, '_');
            finalPipeline.push({ $sort: { [`_id.${firstSafeKey}`]: 1 } });
        } else {
            // No other fields - just sort by date descending
            finalPipeline.push({ $sort: { '_id.transfer_date': -1 } });
        }
        
        // 9. Get total count before pagination
        const countPipeline = [...finalPipeline, { $count: 'total' }];
        const countResult = await LeadTransfer.aggregate(countPipeline);
        const total = countResult.length > 0 ? countResult[0].total : 0;
        
        // 10. Apply pagination
        finalPipeline.push({ $skip: parseInt(offset) });
        finalPipeline.push({ $limit: parseInt(limit) });
        
        // Execute aggregation
        const results = await LeadTransfer.aggregate(finalPipeline);
        
        // Format results with proper nested structure
        // First, format all results with transfer dates and pairs
        const preFormattedResults = results.map(result => {
            // Format transfer dates with transfer pairs
            const transferDateSubGroups = (result.transfer_dates || []).map(dateGroup => {
                const dateStr = dateGroup.transfer_date;
                if (!dateStr) return null;
                
                const formattedDate = this._formatDateGroupName(dateStr, granularity);
                
                // Build transfer pairs
                const transferPairSubGroups = (dateGroup.transfer_pairs || []).map(pair => {
                    const leadIds = (pair.lead_ids || []).map(id => {
                        if (id && id.toString) return id.toString();
                        return id;
                    }).filter(Boolean);
                    
                    return {
                        groupId: `${pair.from_agent_id}_${pair.to_agent_id}_${dateStr}`,
                        groupName: `${pair.from_agent_name} → ${pair.to_agent_name}`,
                        fieldName: 'transfer_pair',
                        count: pair.count,
                        from_agent: { _id: pair.from_agent_id, login: pair.from_agent_name },
                        to_agent: { _id: pair.to_agent_id, login: pair.to_agent_name },
                        _recordIds: leadIds
                    };
                });
                
                const dateLeadIds = (dateGroup.lead_ids || []).map(id => {
                    if (id && id.toString) return id.toString();
                    return id;
                }).filter(Boolean);
                
                return {
                    groupId: `transfer_date_${dateStr}`,
                    groupName: formattedDate,
                    fieldName: leadTransferField,
                    count: dateGroup.count,
                    transfer_date: dateStr,
                    _recordIds: dateLeadIds,
                    subGroups: transferPairSubGroups,
                    isSpecialGrouping: true
                };
            }).filter(Boolean);
            
            // Store field values for building nested structure
            const fieldValues = {};
            otherFields.forEach(field => {
                const safeKey = field.replace(/\./g, '_').replace(/:/g, '_');
                fieldValues[field] = result._id[safeKey];
            });
            
            return {
                fieldValues,
                transferDateSubGroups,
                total_count: result.total_count,
                lead_ids: result.lead_ids || []
            };
        });
        
        // Build nested groups by grouping results at each field level
        let formattedResults = [];
        if (otherFields.length > 0) {
            // Group results by first field
            const groupedByFirstField = new Map();
            
            preFormattedResults.forEach(preResult => {
                const firstField = otherFields[0];
                const firstFieldValue = preResult.fieldValues[firstField];
                const firstFieldKey = firstFieldValue ? firstFieldValue.toString() : 'none';
                
                if (!groupedByFirstField.has(firstFieldKey)) {
                    groupedByFirstField.set(firstFieldKey, {
                        fieldValue: firstFieldValue,
                        results: []
                    });
                }
                groupedByFirstField.get(firstFieldKey).results.push(preResult);
            });
            
            // Build nested structure for each first field group
            formattedResults = Array.from(groupedByFirstField.values()).map(firstFieldGroup => {
                const firstField = otherFields[0];
                const firstFieldValue = firstFieldGroup.fieldValue;
                const firstSafeKey = firstField.replace(/\./g, '_').replace(/:/g, '_');
                
                // Build nested subgroups for remaining fields
                const self = this; // Capture 'this' for use in nested function
                function buildSubGroups(fieldIndex, parentResults) {
                    if (fieldIndex >= otherFields.length) {
                        // Last level: return transfer dates
                        const allTransferDates = [];
                        parentResults.forEach(pr => {
                            allTransferDates.push(...pr.transferDateSubGroups);
                        });
                        return allTransferDates;
                    }
                    
                    const currentField = otherFields[fieldIndex];
                    const groupedByField = new Map();
                    
                    parentResults.forEach(pr => {
                        const fieldValue = pr.fieldValues[currentField];
                        const fieldKey = fieldValue ? fieldValue.toString() : 'none';
                        
                        if (!groupedByField.has(fieldKey)) {
                            groupedByField.set(fieldKey, []);
                        }
                        groupedByField.get(fieldKey).push(pr);
                    });
                    
                    // Build groups for this field level
                    const groups = Array.from(groupedByField.entries()).map(([fieldKey, results]) => {
                        const fieldValue = results[0].fieldValues[currentField];
                        const safeKey = currentField.replace(/\./g, '_').replace(/:/g, '_');
                        
                        // Build groupId for this level
                        const groupIdParts = [];
                        for (let i = 0; i <= fieldIndex; i++) {
                            const f = otherFields[i];
                            const fValue = results[0].fieldValues[f];
                            groupIdParts.push(`${f}_${fValue ? fValue.toString() : 'none'}`);
                        }
                        const groupId = groupIdParts.join('_');
                        
                        // Get subgroups for next level
                        const subGroups = buildSubGroups(fieldIndex + 1, results);
                        
                        // Calculate count and lead_ids
                        const count = subGroups.reduce((sum, sg) => sum + (sg.count || 0), 0);
                        const leadIds = new Set();
                        subGroups.forEach(sg => {
                            if (sg._recordIds) {
                                sg._recordIds.forEach(id => leadIds.add(id));
                            }
                        });
                        results.forEach(pr => {
                            if (pr.lead_ids) {
                                pr.lead_ids.forEach(id => {
                                    if (id && id.toString) leadIds.add(id.toString());
                                    else leadIds.add(id);
                                });
                            }
                        });
                        
                        return {
                            groupId: groupId,
                            groupName: self._formatOtherFieldGroupName([currentField], { [safeKey]: fieldValue }),
                            fieldName: currentField,
                            count: count,
                            _recordIds: Array.from(leadIds),
                            subGroups: subGroups,
                            isSpecialGrouping: true
                        };
                    });
                    
                    return groups;
                }
                
                const subGroups = buildSubGroups(1, firstFieldGroup.results);
                
                // Calculate top-level count and lead_ids
                const topLevelLeadIds = new Set();
                firstFieldGroup.results.forEach(pr => {
                    if (pr.lead_ids) {
                        pr.lead_ids.forEach(id => {
                            if (id && id.toString) topLevelLeadIds.add(id.toString());
                            else topLevelLeadIds.add(id);
                        });
                    }
                });
                subGroups.forEach(sg => {
                    if (sg._recordIds) {
                        sg._recordIds.forEach(id => topLevelLeadIds.add(id));
                    }
                });
                
                const topGroupId = `${firstField}_${firstFieldValue ? firstFieldValue.toString() : 'none'}`;
                
                return {
                    groupId: topGroupId,
                    groupName: this._formatOtherFieldGroupName([firstField], { [firstSafeKey]: firstFieldValue }),
                    fieldName: firstField,
                    count: firstFieldGroup.results.reduce((sum, pr) => sum + pr.total_count, 0),
                    _recordIds: Array.from(topLevelLeadIds),
                    subGroups: subGroups,
                    isSpecialGrouping: true
                };
            });
        } else {
            // No other fields - just format transfer dates
            formattedResults = preFormattedResults[0] ? preFormattedResults[0].transferDateSubGroups : [];
        }
        
        // Handle single result case (no other fields)
        if (otherFields.length === 0 && results.length > 0) {
            const result = results[0];
            const dateStr = result._id.transfer_date || result._id;
            if (dateStr) {
                const formattedDate = this._formatDateGroupName(dateStr, granularity);
                
                const subGroups = (result.transfer_pairs || []).map(pair => {
                    const leadIds = (pair.lead_ids || []).map(id => {
                        if (id && id.toString) return id.toString();
                        return id;
                    }).filter(Boolean);
                    
                    return {
                        groupId: `${pair.from_agent_id}_${pair.to_agent_id}_${dateStr}`,
                        groupName: `${pair.from_agent_name} → ${pair.to_agent_name}`,
                        fieldName: 'transfer_pair',
                        count: pair.count,
                        from_agent: { _id: pair.from_agent_id, login: pair.from_agent_name },
                        to_agent: { _id: pair.to_agent_id, login: pair.to_agent_name },
                        _recordIds: leadIds
                    };
                });
                
                const dateLeadIds = (result.lead_ids || []).map(id => {
                    if (id && id.toString) return id.toString();
                    return id;
                }).filter(Boolean);
                
                formattedResults = [{
                    groupId: `transfer_date_${dateStr}`,
                    groupName: formattedDate,
                    fieldName: leadTransferField,
                    count: result.total_count,
                    transfer_date: dateStr,
                    _recordIds: dateLeadIds,
                    subGroups: subGroups,
                    isSpecialGrouping: true
                }];
            }
        }
        
        
        // Populate group names for reference fields (e.g., team_id -> project name)
        if (otherFields.length > 0) {
            await this._populateOtherFieldGroupNames(formattedResults, otherFields, Lead.schema);
        }
        
        return {
            success: true,
            grouped: true,
            data: formattedResults,
            meta: {
                totalGroups: total,
                total: total,
                page: Math.floor(offset / limit) + 1,
                limit: parseInt(limit),
                pages: Math.ceil(total / limit),
                offset: parseInt(offset)
            }
        };
    }

    /**
     * Handle nested lead_transfer grouping with multiple granularities
     * Creates a hierarchy following the order specified: year -> month -> day -> week (or any order)
     */
    async _handleNestedLeadTransferGrouping({ modelName, domain, groupBy, leadTransferFields, otherFields, includeIds, limit, offset, matchStage, lookups }) {
        const LeadTransfer = this.getModel('LeadTransfer');
        const Lead = this.getModel('Lead');
        
        if (!LeadTransfer) {
            throw new Error('LeadTransfer model not found');
        }
        
        // Preserve the order of granularities as they appear in leadTransferFields (from frontend)
        const orderedGranularities = leadTransferFields.map(f => f.split(':')[1] || 'day');
        
        // Build base pipeline
        const basePipeline = [];
        
        // 1. Match only completed transfers
        basePipeline.push({
            $match: {
                transfer_status: 'completed',
                is_reversed: { $ne: true }
            }
        });
        
        // 2. Lookup agents
        basePipeline.push({
            $lookup: {
                from: 'users',
                localField: 'from_agent_id',
                foreignField: '_id',
                as: 'from_agent'
            }
        });
        basePipeline.push({
            $unwind: {
                path: '$from_agent',
                preserveNullAndEmptyArrays: true
            }
        });
        basePipeline.push({
            $lookup: {
                from: 'users',
                localField: 'to_agent_id',
                foreignField: '_id',
                as: 'to_agent'
            }
        });
        basePipeline.push({
            $unwind: {
                path: '$to_agent',
                preserveNullAndEmptyArrays: true
            }
        });
        
        // 3. Add formatted date fields for ALL granularities
        const dateFormats = {};
        orderedGranularities.forEach(gran => {
            dateFormats[gran] = this._getDateFormat(gran);
        });
        
        const addFieldsStage = {
            $addFields: {
                from_agent_name: { $ifNull: ['$from_agent.login', 'Unassigned'] },
                to_agent_name: { $ifNull: ['$to_agent.login', 'Unknown'] }
            }
        };
        
        Object.entries(dateFormats).forEach(([gran, format]) => {
            addFieldsStage.$addFields[`transfer_date_${gran}`] = {
                $dateToString: {
                    format: format,
                    date: '$createdAt',
                    onNull: null
                }
            };
        });
        
        basePipeline.push(addFieldsStage);
        
        // 4. Filter out null dates to prevent "None" groups
        const nullDateMatch = {
            $or: orderedGranularities.map(gran => ({
                [`transfer_date_${gran}`]: { $ne: null }
            }))
        };
        basePipeline.push({ $match: nullDateMatch });
        
        // 5. Lookup lead and filter
        basePipeline.push({
            $lookup: {
                from: 'leads',
                localField: 'lead_id',
                foreignField: '_id',
                as: 'lead'
            }
        });
        basePipeline.push({
            $unwind: {
                path: '$lead',
                preserveNullAndEmptyArrays: false
            }
        });
        basePipeline.push({
            $match: {
                'lead.active': true,
                'lead.use_status': { $ne: 'pending' }
            }
        });
        
        // 5.2 Apply domain filters
        if (matchStage && Object.keys(matchStage).length > 0) {
            const leadMatch = {};
            for (const [key, value] of Object.entries(matchStage)) {
                if (key === '_id') {
                    leadMatch['lead._id'] = value;
                } else {
                    leadMatch[`lead.${key}`] = value;
                }
            }
            if (Object.keys(leadMatch).length > 0) {
                basePipeline.push({ $match: leadMatch });
            }
        }
        
        // 5.3 Add lead field values for grouping by other fields
        if (otherFields.length > 0) {
            const addLeadFieldsStage = {
                $addFields: {
                    from_agent_name: { $ifNull: ['$from_agent.login', 'Unassigned'] },
                    to_agent_name: { $ifNull: ['$to_agent.login', 'Unknown'] }
                }
            };
            
            Object.entries(dateFormats).forEach(([gran, format]) => {
                addLeadFieldsStage.$addFields[`transfer_date_${gran}`] = {
                    $dateToString: {
                        format: format,
                        date: '$createdAt',
                        onNull: null
                    }
                };
            });
            
            otherFields.forEach(field => {
                const { baseField } = this._parseFieldGranularity(field);
                const actualField = this._mapFieldName(baseField, 'Lead');
                const safeKey = `lead_${baseField.replace(/\./g, '_')}`;
                addLeadFieldsStage.$addFields[safeKey] = `$lead.${actualField}`;
            });
            
            basePipeline.push(addLeadFieldsStage);
            basePipeline.push({ $match: nullDateMatch });
        }
        
        // 6. Group by transfer pairs with all date granularities
        const pairPipeline = [...basePipeline];
        const pairGroupIdFields = {};
        otherFields.forEach(field => {
            const safeKey = field.replace(/\./g, '_').replace(/:/g, '_');
            pairGroupIdFields[safeKey] = `$lead_${field.replace(/\./g, '_')}`;
        });
        
        orderedGranularities.forEach(gran => {
            pairGroupIdFields[`transfer_date_${gran}`] = `$transfer_date_${gran}`;
        });
        
        pairGroupIdFields.from_agent_id = '$from_agent_id';
        pairGroupIdFields.to_agent_id = '$to_agent_id';
        pairGroupIdFields.from_agent_name = '$from_agent_name';
        pairGroupIdFields.to_agent_name = '$to_agent_name';
        
        pairPipeline.push({
            $group: {
                _id: pairGroupIdFields,
                unique_lead_ids: { $addToSet: '$lead_id' }
            }
        });
        
        pairPipeline.push({
            $addFields: {
                count: { $size: '$unique_lead_ids' }
            }
        });
        
        // 7. Group by otherFields + all date granularities
        const dateGroupIdFields = {};
        otherFields.forEach(field => {
            const safeKey = field.replace(/\./g, '_').replace(/:/g, '_');
            dateGroupIdFields[safeKey] = `$_id.${safeKey}`;
        });
        orderedGranularities.forEach(gran => {
            dateGroupIdFields[`transfer_date_${gran}`] = `$_id.transfer_date_${gran}`;
        });
        
        pairPipeline.push({
            $group: {
                _id: dateGroupIdFields,
                total_count: { $sum: '$count' },
                all_lead_ids: { $push: '$unique_lead_ids' },
                transfer_pairs: {
                    $push: {
                        from_agent_id: '$_id.from_agent_id',
                        to_agent_id: '$_id.to_agent_id',
                        from_agent_name: '$_id.from_agent_name',
                        to_agent_name: '$_id.to_agent_name',
                        count: '$count',
                        lead_ids: '$unique_lead_ids'
                    }
                }
            }
        });
        
        pairPipeline.push({
            $addFields: {
                lead_ids: {
                    $reduce: {
                        input: '$all_lead_ids',
                        initialValue: [],
                        in: { $setUnion: ['$$value', '$$this'] }
                    }
                },
                transfer_pairs: {
                    $sortArray: {
                        input: '$transfer_pairs',
                        sortBy: { count: -1 }
                    }
                }
            }
        });
        
        // 8. Group by otherFields (if any)
        let finalPipeline = pairPipeline;
        if (otherFields.length > 0) {
            const otherGroupIdFields = {};
            otherFields.forEach(field => {
                const safeKey = field.replace(/\./g, '_').replace(/:/g, '_');
                otherGroupIdFields[safeKey] = `$_id.${safeKey}`;
            });
            
            finalPipeline.push({
                $group: {
                    _id: otherGroupIdFields,
                    total_count: { $sum: '$total_count' },
                    all_lead_ids: { $push: '$lead_ids' },
                    transfer_dates: {
                        $push: {
                            ...orderedGranularities.reduce((acc, gran) => {
                                acc[`transfer_date_${gran}`] = `$_id.transfer_date_${gran}`;
                                return acc;
                            }, {}),
                            count: '$total_count',
                            lead_ids: '$lead_ids',
                            transfer_pairs: '$transfer_pairs'
                        }
                    }
                }
            });
            
            finalPipeline.push({
                $addFields: {
                    lead_ids: {
                        $reduce: {
                            input: '$all_lead_ids',
                            initialValue: [],
                            in: { $setUnion: ['$$value', '$$this'] }
                        }
                    }
                }
            });
            
            const firstOtherField = otherFields[0];
            const firstSafeKey = firstOtherField.replace(/\./g, '_').replace(/:/g, '_');
            finalPipeline.push({ $sort: { [`_id.${firstSafeKey}`]: 1 } });
        } else {
            finalPipeline.push({ $sort: { [`_id.transfer_date_${orderedGranularities[0]}`]: -1 } });
        }
        
        // 9. Get total count
        const countPipeline = [...finalPipeline, { $count: 'total' }];
        const countResult = await LeadTransfer.aggregate(countPipeline);
        const total = countResult.length > 0 ? countResult[0].total : 0;
        
        // 10. Apply pagination
        finalPipeline.push({ $skip: parseInt(offset) });
        finalPipeline.push({ $limit: parseInt(limit) });
        
        // Execute aggregation
        const results = await LeadTransfer.aggregate(finalPipeline);
        
        // Format results with nested structure
        const formattedResults = this._buildNestedLeadTransferHierarchy(
            results,
            otherFields,
            leadTransferFields,
            orderedGranularities
        );
        
        // Populate group names for reference fields
        if (otherFields.length > 0) {
            await this._populateOtherFieldGroupNames(formattedResults, otherFields, Lead.schema);
        }
        
        return {
            success: true,
            grouped: true,
            data: formattedResults,
            meta: {
                totalGroups: total,
                total: total,
                page: Math.floor(offset / limit) + 1,
                limit: parseInt(limit),
                pages: Math.ceil(total / limit),
                offset: parseInt(offset)
            }
        };
    }

    /**
     * Build nested hierarchy for multiple lead_transfer granularities
     */
    _buildNestedLeadTransferHierarchy(results, otherFields, leadTransferFields, orderedGranularities) {
        if (otherFields.length === 0) {
            return this._buildDateHierarchy(results, leadTransferFields, orderedGranularities);
        }
        
        const groupedByFirstField = new Map();
        
        results.forEach(result => {
            const firstField = otherFields[0];
            const firstSafeKey = firstField.replace(/\./g, '_').replace(/:/g, '_');
            const firstFieldValue = result._id[firstSafeKey];
            const firstFieldKey = firstFieldValue ? firstFieldValue.toString() : 'none';
            
            if (!groupedByFirstField.has(firstFieldKey)) {
                groupedByFirstField.set(firstFieldKey, {
                    fieldValue: firstFieldValue,
                    results: []
                });
            }
            groupedByFirstField.get(firstFieldKey).results.push(result);
        });
        
        const self = this;
        function buildSubGroups(fieldIndex, parentResults) {
            if (fieldIndex >= otherFields.length) {
                const allTransferDates = [];
                parentResults.forEach(pr => {
                    allTransferDates.push(...(pr.transfer_dates || []));
                });
                return self._buildDateHierarchy(allTransferDates, leadTransferFields, orderedGranularities);
            }
            
            const currentField = otherFields[fieldIndex];
            const groupedByField = new Map();
            
            parentResults.forEach(pr => {
                const safeKey = currentField.replace(/\./g, '_').replace(/:/g, '_');
                const fieldValue = pr._id[safeKey];
                const fieldKey = fieldValue ? fieldValue.toString() : 'none';
                
                if (!groupedByField.has(fieldKey)) {
                    groupedByField.set(fieldKey, []);
                }
                groupedByField.get(fieldKey).push(pr);
            });
            
            const groups = Array.from(groupedByField.entries()).map(([fieldKey, results]) => {
                const fieldValue = results[0]._id[currentField.replace(/\./g, '_').replace(/:/g, '_')];
                const safeKey = currentField.replace(/\./g, '_').replace(/:/g, '_');
                
                const groupIdParts = [];
                for (let i = 0; i <= fieldIndex; i++) {
                    const f = otherFields[i];
                    const fValue = results[0]._id[f.replace(/\./g, '_').replace(/:/g, '_')];
                    groupIdParts.push(`${f}_${fValue ? fValue.toString() : 'none'}`);
                }
                const groupId = groupIdParts.join('_');
                
                const subGroups = buildSubGroups(fieldIndex + 1, results);
                
                const count = subGroups.reduce((sum, sg) => sum + (sg.count || 0), 0);
                const leadIds = new Set();
                subGroups.forEach(sg => {
                    if (sg._recordIds) {
                        sg._recordIds.forEach(id => leadIds.add(id));
                    }
                });
                results.forEach(pr => {
                    if (pr.lead_ids) {
                        pr.lead_ids.forEach(id => {
                            if (id && id.toString) leadIds.add(id.toString());
                            else leadIds.add(id);
                        });
                    }
                });
                
                return {
                    groupId: groupId,
                    groupName: self._formatOtherFieldGroupName([currentField], { [safeKey]: fieldValue }),
                    fieldName: currentField,
                    count: count,
                    _recordIds: Array.from(leadIds),
                    subGroups: subGroups,
                    isSpecialGrouping: true
                };
            });
            
            return groups;
        }
        
        return Array.from(groupedByFirstField.values()).map(firstFieldGroup => {
            const firstField = otherFields[0];
            const firstFieldValue = firstFieldGroup.fieldValue;
            const firstSafeKey = firstField.replace(/\./g, '_').replace(/:/g, '_');
            
            const subGroups = buildSubGroups(1, firstFieldGroup.results);
            
            const topLevelLeadIds = new Set();
            firstFieldGroup.results.forEach(pr => {
                if (pr.lead_ids) {
                    pr.lead_ids.forEach(id => {
                        if (id && id.toString) topLevelLeadIds.add(id.toString());
                        else topLevelLeadIds.add(id);
                    });
                }
            });
            subGroups.forEach(sg => {
                if (sg._recordIds) {
                    sg._recordIds.forEach(id => topLevelLeadIds.add(id));
                }
            });
            
            const topGroupId = `${firstField}_${firstFieldValue ? firstFieldValue.toString() : 'none'}`;
            
            return {
                groupId: topGroupId,
                groupName: this._formatOtherFieldGroupName([firstField], { [firstSafeKey]: firstFieldValue }),
                fieldName: firstField,
                count: firstFieldGroup.results.reduce((sum, pr) => sum + pr.total_count, 0),
                _recordIds: Array.from(topLevelLeadIds),
                subGroups: subGroups,
                isSpecialGrouping: true
            };
        });
    }

    /**
     * Build date hierarchy from first to last granularity (preserving order)
     */
    _buildDateHierarchy(dateGroups, leadTransferFields, orderedGranularities) {
        if (orderedGranularities.length === 0 || !dateGroups || dateGroups.length === 0) return [];
        
        // Group by first granularity
        const firstGran = orderedGranularities[0];
        const firstField = leadTransferFields.find(f => f.endsWith(`:${firstGran}`));
        
        const groupedByFirst = new Map();
        
        dateGroups.forEach(dg => {
            const dateValue = (dg[`transfer_date_${firstGran}`] !== undefined) ? 
                dg[`transfer_date_${firstGran}`] : 
                (dg.transfer_date || (dg._id && dg._id[`transfer_date_${firstGran}`] ? dg._id[`transfer_date_${firstGran}`] : null));
            
            if (!dateValue) return;
            
            const dateKey = dateValue.toString();
            if (!groupedByFirst.has(dateKey)) {
                groupedByFirst.set(dateKey, []);
            }
            groupedByFirst.get(dateKey).push(dg);
        });
        
        return Array.from(groupedByFirst.entries()).map(([dateKey, groups]) => {
            const formattedDate = this._formatDateGroupName(dateKey, firstGran);
            const subGroups = this._buildDateSubHierarchy(groups, leadTransferFields, orderedGranularities, 1);
            
            const count = subGroups.reduce((sum, sg) => sum + (sg.count || 0), 0);
            const leadIds = new Set();
            subGroups.forEach(sg => {
                if (sg._recordIds) {
                    sg._recordIds.forEach(id => leadIds.add(id));
                }
            });
            groups.forEach(g => {
                const gLeadIds = g.lead_ids || (g._id && g._id.lead_ids) || [];
                gLeadIds.forEach(id => {
                    if (id && id.toString) leadIds.add(id.toString());
                    else leadIds.add(id);
                });
            });
            
            return {
                groupId: `transfer_date_${firstGran}_${dateKey}`,
                groupName: formattedDate,
                fieldName: firstField,
                count: count,
                transfer_date: dateKey,
                _recordIds: Array.from(leadIds),
                subGroups: subGroups,
                isSpecialGrouping: true
            };
        });
    }

    /**
     * Recursively build date sub-hierarchy for remaining granularities
     */
    _buildDateSubHierarchy(dateGroups, leadTransferFields, orderedGranularities, granIndex) {
        if (granIndex >= orderedGranularities.length) {
            // Last level: return transfer pairs
            const allPairs = [];
            dateGroups.forEach(dg => {
                allPairs.push(...(dg.transfer_pairs || []));
            });
            
            const pairMap = new Map();
            allPairs.forEach(pair => {
                const pairKey = `${pair.from_agent_id}_${pair.to_agent_id}`;
                if (!pairMap.has(pairKey)) {
                    pairMap.set(pairKey, {
                        from_agent_id: pair.from_agent_id,
                        to_agent_id: pair.to_agent_id,
                        from_agent_name: pair.from_agent_name,
                        to_agent_name: pair.to_agent_name,
                        count: 0,
                        lead_ids: []
                    });
                }
                const existing = pairMap.get(pairKey);
                existing.count += pair.count || 0;
                if (pair.lead_ids) {
                    existing.lead_ids.push(...pair.lead_ids);
                }
            });
            
            return Array.from(pairMap.values()).map(pair => {
                const leadIds = (pair.lead_ids || []).map(id => {
                    if (id && id.toString) return id.toString();
                    return id;
                }).filter(Boolean);
                
                const dateStr = dateGroups[0] ? 
                    (dateGroups[0][`transfer_date_${orderedGranularities[granIndex - 1]}`] || 
                     dateGroups[0].transfer_date || '') : '';
                
                return {
                    groupId: `${pair.from_agent_id}_${pair.to_agent_id}_${dateStr}`,
                    groupName: `${pair.from_agent_name} → ${pair.to_agent_name}`,
                    fieldName: 'transfer_pair',
                    count: pair.count,
                    from_agent: { _id: pair.from_agent_id, login: pair.from_agent_name },
                    to_agent: { _id: pair.to_agent_id, login: pair.to_agent_name },
                    _recordIds: leadIds,
                    isSpecialGrouping: true
                };
            });
        }
        
        const currentGran = orderedGranularities[granIndex];
        const currentField = leadTransferFields.find(f => f.endsWith(`:${currentGran}`));
        
        const groupedByGran = new Map();
        
        dateGroups.forEach(dg => {
            const dateValue = (dg[`transfer_date_${currentGran}`] !== undefined) ? 
                dg[`transfer_date_${currentGran}`] : 
                (dg.transfer_date || (dg._id && dg._id[`transfer_date_${currentGran}`] ? dg._id[`transfer_date_${currentGran}`] : null));
            
            if (!dateValue) return;
            
            const dateKey = dateValue.toString();
            if (!groupedByGran.has(dateKey)) {
                groupedByGran.set(dateKey, []);
            }
            groupedByGran.get(dateKey).push(dg);
        });
        
        return Array.from(groupedByGran.entries()).map(([dateKey, groups]) => {
            const formattedDate = this._formatDateGroupName(dateKey, currentGran);
            const subGroups = this._buildDateSubHierarchy(groups, leadTransferFields, orderedGranularities, granIndex + 1);
            
            const count = subGroups.reduce((sum, sg) => sum + (sg.count || 0), 0);
            const leadIds = new Set();
            subGroups.forEach(sg => {
                if (sg._recordIds) {
                    sg._recordIds.forEach(id => leadIds.add(id));
                }
            });
            groups.forEach(g => {
                const gLeadIds = g.lead_ids || (g._id && g._id.lead_ids) || [];
                gLeadIds.forEach(id => {
                    if (id && id.toString) leadIds.add(id.toString());
                    else leadIds.add(id);
                });
            });
            
            const parentDate = dateGroups[0] && granIndex > 0 ? 
                (dateGroups[0][`transfer_date_${orderedGranularities[granIndex - 1]}`] || '') : '';
            
            return {
                groupId: `transfer_date_${currentGran}_${dateKey}${parentDate ? `_${parentDate}` : ''}`,
                groupName: formattedDate,
                fieldName: currentField,
                count: count,
                transfer_date: dateKey,
                _recordIds: Array.from(leadIds),
                subGroups: subGroups,
                isSpecialGrouping: true
            };
        });
    }
    
    /**
     * Populate group names for other fields (non-lead_transfer fields) that are references
     * @param {Array} formattedResults - Formatted results with groups
     * @param {Array} otherFields - Array of field names (e.g., ['team_id'])
     * @param {Object} schema - Lead schema
     * @private
     */
    async _populateOtherFieldGroupNames(formattedResults, otherFields, schema) {
        const firstField = otherFields[0];
        const { baseField } = this._parseFieldGranularity(firstField);
        const actualField = this._mapFieldName(baseField, 'Lead');
        
        // Check if it's a reference field
        const schemaPath = schema.path(actualField);
        if (!schemaPath || !schemaPath.options || !schemaPath.options.ref) {
            // Not a reference field, skip population
            return;
        }
        
        const refCollection = schemaPath.options.ref;
        
        // Collect all groupIds from top-level groups
        const referenceIds = formattedResults
            .map(r => {
                // Extract the field value from groupId (format: "team_id_<id>" or "field1_value1_field2_value2")
                const groupIdStr = r.groupId || '';
                
                // For single field: "field_name_<id>"
                // For multiple fields: "field1_id1_field2_id2_..."
                // We need to extract the value for the first field
                const fieldPrefix = `${firstField.replace(/\./g, '_').replace(/:/g, '_')}_`;
                
                if (groupIdStr.startsWith(fieldPrefix)) {
                    // Single field case: extract everything after the prefix
                    let valueStr = groupIdStr.substring(fieldPrefix.length);
                    
                    // If there are multiple fields, we need to stop at the next field prefix
                    // For now, assume single field or extract until next underscore pattern
                    // Actually, for ObjectIds (24 hex chars), we can try to extract them
                    // Try to match ObjectId pattern (24 hex characters)
                    const objectIdMatch = valueStr.match(/^([a-f0-9]{24})/i);
                    if (objectIdMatch) {
                        try {
                            return new mongoose.Types.ObjectId(objectIdMatch[1]);
                        } catch {
                            return null;
                        }
                    }
                    
                    // If not ObjectId, try to extract until next underscore or end
                    const nextUnderscore = valueStr.indexOf('_');
                    if (nextUnderscore > 0) {
                        valueStr = valueStr.substring(0, nextUnderscore);
                    }
                    
                    try {
                        return new mongoose.Types.ObjectId(valueStr);
                    } catch {
                        return null;
                    }
                }
                
                return null;
            })
            .filter(id => id !== null);
        
        if (referenceIds.length === 0) {
            return;
        }
        
        try {
            const RefModel = mongoose.models[refCollection] || this.getModel(refCollection);
            if (!RefModel) {
                logger.warn(`Model ${refCollection} not found for field ${actualField}`);
                return;
            }
            
            // Select appropriate fields based on collection type
            let selectFields = '_id';
            if (refCollection === 'User') {
                selectFields = '_id login';
            } else if (refCollection === 'Team' || refCollection === 'Source' || refCollection === 'Bank') {
                selectFields = '_id name';
            } else {
                selectFields = '_id name login';
            }
            
            const refDocs = await RefModel.find({ _id: { $in: referenceIds } })
                .select(selectFields)
                .lean();
            
            const nameMap = new Map();
            refDocs.forEach(doc => {
                const id = doc._id.toString();
                let name = 'Unknown';
                
                if (refCollection === 'User') {
                    name = doc.login || 'Unknown User';
                } else if (refCollection === 'Team') {
                    name = doc.name || 'Unknown Project';
                } else if (refCollection === 'Source') {
                    name = doc.name || 'Unknown Source';
                } else if (refCollection === 'Bank') {
                    name = doc.name || 'Unknown Bank';
                } else {
                    name = doc.name || doc.login || 'Unknown';
                }
                
                nameMap.set(id, name);
            });
            
            // Update group names
            formattedResults.forEach(result => {
                const groupIdStr = result.groupId || '';
                const fieldPrefix = `${firstField.replace(/\./g, '_').replace(/:/g, '_')}_`;
                
                if (groupIdStr.startsWith(fieldPrefix)) {
                    let valueStr = groupIdStr.substring(fieldPrefix.length);
                    
                    // Try to match ObjectId pattern (24 hex characters)
                    const objectIdMatch = valueStr.match(/^([a-f0-9]{24})/i);
                    if (objectIdMatch) {
                        const idStr = objectIdMatch[1];
                        const name = nameMap.get(idStr);
                        if (name) {
                            result.groupName = name;
                        }
                    } else {
                        // If not ObjectId, try to extract until next underscore
                        const nextUnderscore = valueStr.indexOf('_');
                        if (nextUnderscore > 0) {
                            valueStr = valueStr.substring(0, nextUnderscore);
                        }
                        const name = nameMap.get(valueStr);
                        if (name) {
                            result.groupName = name;
                        }
                    }
                }
            });
        } catch (error) {
            logger.error(`Error populating group names for ${actualField}:`, error);
        }
    }

    /**
     * Format group name for other fields (non-lead_transfer fields)
     * @param {Array} fields - Array of field names (e.g., ['team_id'])
     * @param {Object} idValues - Object containing field values from aggregation _id
     * @returns {string} - Formatted group name
     * @private
     */
    _formatOtherFieldGroupName(fields, idValues) {
        // For now, return the first field's value as string
        // This can be enhanced to lookup reference fields (e.g., team name for team_id)
        const firstField = fields[0];
        const safeKey = firstField.replace(/\./g, '_').replace(/:/g, '_');
        const value = idValues[safeKey];
        
        // Handle null/undefined values
        if (value === null || value === undefined) {
            return 'None';
        }
        
        // Handle ObjectId values - convert to string
        if (value && value.toString && typeof value.toString === 'function') {
            return value.toString();
        }
        
        return String(value);
    }
    
    /**
     * Helper to build date formatting for aggregation pipeline
     * Returns a $cond expression that formats the date string
     */
    _formatDateForAggregate(dateField, granularity) {
        // In aggregation, we'll format the date in post-processing
        // Just return the date field here, actual formatting happens in JavaScript
        return dateField;
    }

    /**
     * Parse lead_transfer filter value and return matching lead IDs
     * @param {string} field - Field name (e.g., "lead_transfer:day")
     * @param {string} operator - Operator (usually "=")
     * @param {string} value - Group ID or group name
     *   Supported formats:
     *   - Date level groupId: "transfer_date_2025-12-10" (all transfers on that date)
     *   - Transfer pair groupId: "fromAgentId_toAgentId_2025-12-10" (specific transfer pair)
     *   - Date level groupName: "Dec 10, 2025" (parsed date)
     *   - Transfer pair groupName: "Elvis → Panda" (without date, for subGroups)
     * @returns {Object} - Filter info object for async resolution
     */
    _parseLeadTransferFilter(field, operator, value) {
        const granularity = field.split(':')[1] || 'day';
        
        // Format 1a: Date level groupId with granularity prefix - "transfer_date_year_2025", "transfer_date_month_2025-12", etc.
        // May also include parent dates: "transfer_date_week_2025-W51_2025-12" or "transfer_date_day_2025-12-16_2025-W51"
        const dateLevelWithGranMatch = value.match(/^transfer_date_(year|month|week|day)_(.+)$/);
        if (dateLevelWithGranMatch) {
            const [, granPrefix, dateStr] = dateLevelWithGranMatch;
            
            // Extract only the date part for this granularity (remove parent dates if present)
            // Parent dates are separated by underscores and follow different patterns
            let cleanDateStr = dateStr.trim();
            
            // For nested hierarchies, the date string might contain parent dates
            // Extract only the part that matches the current granularity's format
            if (granPrefix === 'year') {
                // Year format: YYYY (4 digits)
                const yearMatch = cleanDateStr.match(/^(\d{4})/);
                if (yearMatch) cleanDateStr = yearMatch[1];
            } else if (granPrefix === 'month') {
                // Month format: YYYY-MM
                const monthMatch = cleanDateStr.match(/^(\d{4}-\d{2})/);
                if (monthMatch) cleanDateStr = monthMatch[1];
            } else if (granPrefix === 'week') {
                // Week format: YYYY-WNN
                const weekMatch = cleanDateStr.match(/^(\d{4}-W\d{1,2})/);
                if (weekMatch) cleanDateStr = weekMatch[1];
            } else if (granPrefix === 'day') {
                // Day format: YYYY-MM-DD
                const dayMatch = cleanDateStr.match(/^(\d{4}-\d{2}-\d{2})/);
                if (dayMatch) cleanDateStr = dayMatch[1];
            }
            
            logger.info(`Parsed lead_transfer filter (date level with granularity): granularity=${granPrefix}, date=${cleanDateStr} (extracted from ${dateStr})`);
            
            return {
                _leadTransferFilter: true,
                dateStr: cleanDateStr,
                granularity: granPrefix, // Use the granularity from the value, not the field
                format: 'dateOnly'
            };
        }
        
        // Format 1b: Date level groupId - "transfer_date_2025-12-10" (legacy format without granularity prefix)
        const dateLevelMatch = value.match(/^transfer_date_(.+)$/);
        if (dateLevelMatch) {
            const dateStr = dateLevelMatch[1];
            logger.info(`Parsed lead_transfer filter (date level): date=${dateStr}`);
            
            return {
                _leadTransferFilter: true,
                dateStr: dateStr.trim(),
                granularity: granularity,
                format: 'dateOnly'
            };
        }
        
        // Format 2: Transfer pair groupId - "fromAgentId_toAgentId_date" or "fromAgentId_toAgentId_" or "fromAgentId_toAgentId"
        // ObjectIds are 24 hex chars, so pattern is: 24chars_24chars_date or 24chars_24chars_ or 24chars_24chars
        // First try to match with date part
        const groupIdWithDateMatch = value.match(/^([a-f0-9]{24})_([a-f0-9]{24})_(.+)$/i);
        if (groupIdWithDateMatch) {
            const [, fromAgentId, toAgentId, dateStr] = groupIdWithDateMatch;
            logger.info(`Parsed lead_transfer filter (groupId with date): from=${fromAgentId}, to=${toAgentId}, date=${dateStr}`);
            
            return {
                _leadTransferFilter: true,
                fromAgentId: fromAgentId,
                toAgentId: toAgentId,
                dateStr: dateStr.trim(),
                granularity: granularity,
                format: 'groupId'
            };
        }
        
        // Format 2b: Transfer pair groupId without date - "fromAgentId_toAgentId_" or "fromAgentId_toAgentId"
        // This handles cases where the groupId doesn't have a date suffix
        const groupIdWithoutDateMatch = value.match(/^([a-f0-9]{24})_([a-f0-9]{24})_?$/i);
        if (groupIdWithoutDateMatch) {
            const [, fromAgentId, toAgentId] = groupIdWithoutDateMatch;
            logger.info(`Parsed lead_transfer filter (groupId without date): from=${fromAgentId}, to=${toAgentId}`);
            
            return {
                _leadTransferFilter: true,
                fromAgentId: fromAgentId,
                toAgentId: toAgentId,
                dateStr: null,
                granularity: granularity,
                format: 'groupId'
            };
        }
        
        // Format 3: Transfer pair groupName - "FromAgent → ToAgent" (without date)
        const pairNameMatch = value.match(/^(.+?)\s*→\s*(.+?)$/);
        if (pairNameMatch && !value.includes('(')) {
            const [, fromAgentName, toAgentName] = pairNameMatch;
            logger.info(`Parsed lead_transfer filter (pair only): from=${fromAgentName}, to=${toAgentName}`);
            
            return {
                _leadTransferFilter: true,
                fromAgentName: fromAgentName.trim(),
                toAgentName: toAgentName.trim(),
                granularity: granularity,
                format: 'pairOnly'
            };
        }
        
        // Format 4: Transfer pair groupName with date - "FromAgent → ToAgent (Date)"
        const groupNameMatch = value.match(/^(.+?)\s*→\s*(.+?)\s*\((.+)\)$/);
        if (groupNameMatch) {
            const [, fromAgentName, toAgentName, dateStr] = groupNameMatch;
            logger.info(`Parsed lead_transfer filter (groupName format): from=${fromAgentName}, to=${toAgentName}, date=${dateStr}`);
            
            return {
                _leadTransferFilter: true,
                fromAgentName: fromAgentName.trim(),
                toAgentName: toAgentName.trim(),
                dateStr: dateStr.trim(),
                granularity: granularity,
                format: 'groupName'
            };
        }
        
        // Format 5: Date only groupName - "Dec 10, 2025" or "December 2025" etc.
        // Try to parse as a date format
        const dateRange = this._parseDateGroupValue(value, granularity);
        if (dateRange) {
            logger.info(`Parsed lead_transfer filter (date groupName): value=${value}`);
            return {
                _leadTransferFilter: true,
                dateStr: value.trim(),
                granularity: granularity,
                format: 'dateOnly'
            };
        }
        
        logger.warn(`Failed to parse lead_transfer filter value: ${value}`);
        return null;
    }

    /**
     * Async method to resolve lead_transfer filter to actual lead IDs
     * Called from middleware/service layer
     * @param {Object} filterInfo - Parsed filter info from _parseLeadTransferFilter
     * @returns {Promise<Array>} - Array of matching lead IDs
     */
    async resolveLeadTransferFilter(filterInfo) {
        const { dateStr, granularity, format } = filterInfo;
        
        const LeadTransfer = this.getModel('LeadTransfer');
        const User = this.getModel('User');
        
        if (!LeadTransfer) {
            logger.error('LeadTransfer model not found');
            return [];
        }
        
        try {
            // Build base query
            const query = {
                transfer_status: 'completed',
                is_reversed: { $ne: true }
            };
            
            // Handle different formats
            if (format === 'dateOnly') {
                // Date level filter - all transfers on that date
                const dateRange = this._parseDateGroupValue(dateStr, granularity);
                if (!dateRange) {
                    logger.warn(`Failed to parse date: ${dateStr} with granularity ${granularity}`);
                    return [];
                }
                query.createdAt = dateRange;
                logger.info(`Lead transfer filter (dateOnly):`, { dateRange, granularity });
                
            } else if (format === 'pairOnly') {
                // Transfer pair only - all transfers between these agents (any date)
                const { fromAgentName, toAgentName } = filterInfo;
                
                if (!User) {
                    logger.error('User model not found');
                    return [];
                }
                
                const fromAgent = fromAgentName !== 'Unassigned' 
                    ? await User.findOne({ login: { $regex: new RegExp(`^${fromAgentName}$`, 'i') } }).select('_id').lean()
                    : null;
                const toAgent = await User.findOne({ login: { $regex: new RegExp(`^${toAgentName}$`, 'i') } }).select('_id').lean();
                
                if (!toAgent) {
                    logger.warn(`To agent not found: ${toAgentName}`);
                    return [];
                }
                
                if (fromAgent) {
                    query.from_agent_id = fromAgent._id;
                }
                query.to_agent_id = toAgent._id;
                logger.info(`Lead transfer filter (pairOnly):`, { from: fromAgentName, to: toAgentName });
                
            } else if (format === 'groupId') {
                // Direct ObjectId format with date
                let fromAgentId = filterInfo.fromAgentId;
                let toAgentId = filterInfo.toAgentId;
                
                // Validate ObjectIds
                if (!mongoose.Types.ObjectId.isValid(fromAgentId) || !mongoose.Types.ObjectId.isValid(toAgentId)) {
                    logger.warn(`Invalid ObjectIds in lead_transfer filter: from=${fromAgentId}, to=${toAgentId}`);
                    return [];
                }
                
                query.from_agent_id = new mongoose.Types.ObjectId(fromAgentId);
                query.to_agent_id = new mongoose.Types.ObjectId(toAgentId);
                
                // dateStr might be null if the groupId format was "fromAgentId_toAgentId_" (without date)
                if (dateStr) {
                    const dateRange = this._parseDateGroupValue(dateStr, granularity);
                    if (dateRange) {
                        query.createdAt = dateRange;
                    }
                }
                logger.info(`Lead transfer filter (groupId):`, { fromAgentId, toAgentId, dateStr: dateStr || 'none' });
                
            } else if (format === 'groupName') {
                // Name-based format with date - need to look up agents
                const { fromAgentName, toAgentName } = filterInfo;
                
                if (!User) {
                    logger.error('User model not found');
                    return [];
                }
                
                const fromAgent = fromAgentName !== 'Unassigned' 
                    ? await User.findOne({ login: { $regex: new RegExp(`^${fromAgentName}$`, 'i') } }).select('_id').lean()
                    : null;
                const toAgent = await User.findOne({ login: { $regex: new RegExp(`^${toAgentName}$`, 'i') } }).select('_id').lean();
                
                if (!toAgent) {
                    logger.warn(`To agent not found: ${toAgentName}`);
                    return [];
                }
                
                if (fromAgent) {
                    query.from_agent_id = fromAgent._id;
                }
                query.to_agent_id = toAgent._id;
                
                if (dateStr) {
                    const dateRange = this._parseDateGroupValue(dateStr, granularity);
                    if (dateRange) {
                        query.createdAt = dateRange;
                    }
                }
                logger.info(`Lead transfer filter (groupName):`, { from: fromAgentName, to: toAgentName, dateStr });
                
            } else {
                logger.warn(`Unknown lead_transfer filter format: ${format}`);
                return [];
            }
            
            logger.info(`Lead transfer filter query:`, query);
            
            // Find matching transfers and get lead IDs
            const transfers = await LeadTransfer.find(query)
                .select('lead_id')
                .lean();
            
            // Get unique lead IDs (same lead might have multiple transfers)
            const allLeadIds = transfers.map(t => t.lead_id).filter(Boolean);
            const uniqueLeadIds = [...new Set(allLeadIds.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));
            
            logger.info(`Lead transfer filter resolved: ${transfers.length} transfers found, ${uniqueLeadIds.length} unique leads`);
            
            return uniqueLeadIds;
        } catch (error) {
            logger.error('Error resolving lead transfer filter:', error);
            return [];
        }
    }

    /**
     * Main entry point to build and execute a search query
     * @param {Object} options - Search options
     * @param {string} options.modelName - Model name to search
     * @param {Array} options.domain - Domain filter array
     * @param {Array} options.groupBy - Fields to group by
     * @param {boolean} options.includeIds - Include record IDs in grouped results
     * @param {number} options.limit - Result limit
     * @param {number} options.offset - Result offset
     * @param {string} options.orderBy - Sort order
     */
    async search({ modelName, domain = [], groupBy = [], includeIds = false, limit = 80, offset = 0, orderBy = 'createdAt desc', includeAll = false }) {
        const Model = this.getModel(modelName);
        if (!Model) {
            throw new Error(`Model ${modelName} not found`);
        }

        const pipeline = [];
        const lookups = new Map(); // Changed from Set to Map for proper deduplication

        // 1. Parse Domain into Match Stage
        let matchStage = this._parseDomain(domain, Model.schema, lookups, modelName);
        
        // 1.1 Resolve any lead_transfer filters (async)
        if (matchStage.$and) {
            for (let i = 0; i < matchStage.$and.length; i++) {
                const condition = matchStage.$and[i];
                if (condition._leadTransferFilter) {
                    const leadIds = await this.resolveLeadTransferFilter(condition._leadTransferFilter);
                    if (leadIds.length > 0) {
                        matchStage.$and[i] = { _id: { $in: leadIds } };
                    } else {
                        // No matching leads, force empty result
                        matchStage.$and[i] = { _id: { $eq: null } };
                    }
                }
            }
        }
        
        // 1.2 For Lead grouping: always exclude inactive leads (active: false) from counts
        // This ensures grouping summary never counts inactive leads, regardless of caller
        const hasActiveFilter = domain.some(
            condition => Array.isArray(condition) && condition[0] === 'active'
        );
        const hasLeadTransferGrouping = groupBy.some(
            f => typeof f === 'string' && f.startsWith('lead_transfer:')
        );
        if (modelName === 'Lead' && groupBy.length > 0 && !includeAll && !hasActiveFilter && !hasLeadTransferGrouping) {
            if (matchStage.$and) {
                matchStage.$and.push({ active: true });
            } else {
                matchStage = { ...matchStage, active: true };
            }
            logger.debug('Search: Added active: true for Lead grouping to exclude inactive leads from counts');
        }

        // 1.3 For Offer grouping: exclude inactive offers so summary count matches detail list
        // Details API adds active: true when includeAll=false; summary uses includeAll=true
        // So we must add Offer.active = true for grouping to match
        if (modelName === 'Offer' && groupBy.length > 0 && !hasActiveFilter) {
            if (matchStage.$and) {
                matchStage.$and.push({ active: true });
            } else {
                matchStage = { ...matchStage, active: true };
            }
            logger.debug('Search: Added active: true for Offer grouping to match detail list counts');
        }

        // 1.4 For Offer grouping: exclude offers from inactive leads (status=out or active=false)
        // Done here to avoid huge lead_id arrays in request payload (causes 500 on production)
        const hasLeadIdExclusion = domain.some(
            c => Array.isArray(c) && c[0] === 'lead_id' && c[1] === 'not in'
        );
        if (modelName === 'Offer' && groupBy.length > 0 && !hasLeadIdExclusion) {
            try {
                const Lead = this.getModel('Lead');
                if (Lead) {
                    const inactiveLeads = await Lead.find({
                        $or: [
                            { status: { $regex: /^out$/i } },
                            { active: false }
                        ]
                    }).select('_id').lean();
                    const inactiveLeadIds = inactiveLeads.map(l => l._id);
                    if (inactiveLeadIds.length > 0) {
                        if (matchStage.$and) {
                            matchStage.$and.push({ lead_id: { $nin: inactiveLeadIds } });
                        } else {
                            matchStage = { ...matchStage, lead_id: { $nin: inactiveLeadIds } };
                        }
                        logger.debug(`Search: Excluded ${inactiveLeadIds.length} inactive leads from Offer grouping`);
                    }
                }
            } catch (err) {
                logger.warn('Search: Failed to exclude inactive leads from Offer grouping:', err.message);
            }
        }

        // Check if domain already has null exclusion for grouped fields
        // This helps us avoid redundant null filtering in the pipeline
        const hasNullExclusionInDomain = (field) => {
            return domain.some(
                condition => 
                    Array.isArray(condition) && 
                    condition[0] === field && 
                    condition[1] === '!=' &&
                    condition[2] === null
            );
        };

        // 2. Add Lookups (Left Joins)
        // Optimization: Only lookup what is needed.
        
        for (const [key, lookupStages] of lookups) {
             // lookupStages is an array of objects ($lookup, $unwind)
             pipeline.push(...lookupStages);
        }

        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }

        // 3. Handle Group By
        if (groupBy.length > 0) {
            /** When true, grouped pipeline already applied $sort (e.g. by project name); skip default count sort */
            let groupPresortedByName = false;
            // Special handling for lead_transfer grouping
            // Format: lead_transfer:day, lead_transfer:week, lead_transfer:month, lead_transfer:year
            // Check if lead_transfer is anywhere in the groupBy array
            const leadTransferFields = groupBy.filter(field => field.startsWith('lead_transfer:'));
            if (leadTransferFields.length > 0 && modelName === 'Lead') {
                // Separate other fields from lead_transfer fields
                const otherFields = groupBy.filter(field => !field.startsWith('lead_transfer:'));
                
                // Sort lead_transfer fields by granularity order: year > month > week > day
                // This ensures consistent hierarchy regardless of input order
                const granularityOrder = { 'year': 0, 'month': 1, 'week': 2, 'day': 3 };
                const sortedLeadTransferFields = leadTransferFields.sort((a, b) => {
                    const aGran = a.split(':')[1] || 'day';
                    const bGran = b.split(':')[1] || 'day';
                    return (granularityOrder[aGran] || 99) - (granularityOrder[bGran] || 99);
                });
                
                // Reorder: otherFields first, then lead_transfer fields sorted by granularity
                let reorderedGroupBy = [...otherFields, ...sortedLeadTransferFields];
                
                // Log if reordering happened
                if (JSON.stringify(groupBy) !== JSON.stringify(reorderedGroupBy)) {
                    logger.info(`Reordered groupBy: ${JSON.stringify(groupBy)} -> ${JSON.stringify(reorderedGroupBy)} (sorted lead_transfer by granularity: year > month > week > day)`);
                }
                
                // If multiple lead_transfer fields, use nested handler
                if (sortedLeadTransferFields.length > 1) {
                    return await this._handleNestedLeadTransferGrouping({
                        modelName,
                        domain,
                        groupBy: reorderedGroupBy,
                        leadTransferFields: sortedLeadTransferFields,
                        otherFields,
                        includeIds,
                        limit,
                        offset,
                        matchStage,
                        lookups
                    });
                } else {
                    // Single lead_transfer field - use standard handler
                    return await this._handleLeadTransferGrouping({
                        modelName,
                        domain,
                        groupBy: reorderedGroupBy,
                        includeIds,
                        limit,
                        offset,
                        matchStage,
                        lookups
                    });
                }
            }
            
            const firstField = groupBy[0];
            
            const groupStage = this._buildGroupStage(groupBy, Model.schema, lookups, includeIds, modelName);
            // If we group by a field that needs a lookup, ensure it's added
            // (The _buildGroupStage might add to lookups set, but we already pushed lookups. 
            //  We might need to re-order or push new lookups. 
            //  For simplicity, let's assume lookups are gathered from both domain and groupBy first)
            
            // RE-ADD lookups because _buildGroupStage might have added new ones
            // Since we use a Map, existing ones won't be duplicated, but new ones need to be inserted.
            // However, pipeline order matters: Lookups MUST be before Group.
            // The current pipeline array already has lookups pushed. We can't just push new ones at the end.
            
            // Hack fix for MVP: Clear pipeline and rebuild it correctly.
            // In a production refactor, we should gather all lookups first, then build pipeline.
            pipeline.length = 0; // Clear
            
            for (const [key, lookupStages] of lookups) {
                 pipeline.push(...lookupStages);
            }
            if (Object.keys(matchStage).length > 0) {
                pipeline.push({ $match: matchStage });
            }
            
            // For date fields, filter out null dates before grouping
            // Only if includeAll is false AND domain doesn't already exclude nulls
            // Note: firstField is already defined at the start of this block
            const actualFirstField = this._mapFieldName(firstField, modelName);
            if (!includeAll && this._isDateField(actualFirstField, Model.schema) && !firstField.includes('.')) {
                // Only add null filtering if domain doesn't already have it
                if (!hasNullExclusionInDomain(firstField) && !hasNullExclusionInDomain(actualFirstField)) {
                    const dateMatch = { [actualFirstField]: { $ne: null, $exists: true } };
                    pipeline.push({ $match: dateMatch });
                }
            }
            
            // For 'transferred_lead' grouping, compute is_transferred before $group
            // A lead is "Transferred" if either prev_team_id or prev_user_id has data
            if (groupBy.includes('transferred_lead') && modelName === 'Lead') {
                pipeline.push({
                    $addFields: {
                        is_transferred: {
                            $cond: {
                                if: {
                                    $or: [
                                        { $and: [
                                            { $ifNull: ['$prev_team_id', false] },
                                            { $ne: ['$prev_team_id', null] }
                                        ]},
                                        { $and: [
                                            { $ifNull: ['$prev_user_id', false] },
                                            { $ne: ['$prev_user_id', null] }
                                        ]}
                                    ]
                                },
                                then: true,
                                else: false
                            }
                        }
                    }
                });
            }

            pipeline.push(groupStage);

            // Offer + group by project_id + sortBy=projectName: sort groups by Team.name before projection/pagination
            const { baseField: gfBaseForSort } = this._parseFieldGranularity(firstField);
            const orderPartsForGroup = (orderBy && typeof orderBy === 'string') ? orderBy.trim().split(/\s+/) : [];
            const obFirstGroup = (orderPartsForGroup[0] || '').toLowerCase();
            const obDirGroupAsc = (orderPartsForGroup[1] || 'desc').toLowerCase() === 'asc';
            const sortDirNumGroup = obDirGroupAsc ? 1 : -1;
            if (modelName === 'Offer' && gfBaseForSort === 'project_id' && obFirstGroup === 'projectname') {
                pipeline.push({
                    $lookup: {
                        from: 'teams',
                        let: { pid: '$_id.project_id' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$pid'] } } },
                            { $project: { name: 1 } }
                        ],
                        as: '_grpSortRef'
                    }
                });
                pipeline.push({
                    $addFields: {
                        _grpSortKey: { $toLower: { $ifNull: [{ $arrayElemAt: ['$_grpSortRef.name', 0] }, ''] } }
                    }
                });
                pipeline.push({ $project: { _grpSortRef: 0 } });
                pipeline.push({ $sort: { _grpSortKey: sortDirNumGroup, count: -1 } });
                groupPresortedByName = true;
            }
            
            // Filter out null groups for date fields (after grouping)
            // Only if includeAll is false
            if (!includeAll && this._isDateField(firstField, Model.schema) && !firstField.includes('.')) {
                const idKey = firstField.includes('.') ? firstField.replace(/\./g, '_') : firstField;
                pipeline.push({ $match: { [`_id.${idKey}`]: { $ne: null } } });
            }
            
            // Add lookup and sort order field for status_id / current_status grouping (before projection)
            // Handle both direct status_id and related fields like lead_id.status_id
            const isStatusField = firstField === 'status_id' || firstField.endsWith('.status_id')
                || (firstField === 'current_status' && modelName === 'ClosedLead');
            if (isStatusField && (modelName === 'Lead' || modelName === 'Offer' || modelName === 'ClosedLead')) {
                const idKey = firstField.includes('.') ? firstField.replace(/\./g, '_') : firstField;
                
                // Lookup to get status names from Settings collection
                // Statuses are nested in info.statuses array within Settings documents of type 'stage'
                pipeline.push({
                    $lookup: {
                        from: 'settings',
                        let: { statusId: `$_id.${idKey}`, statusIdStr: { $toString: `$_id.${idKey}` } },
                        pipeline: [
                            { $match: { type: 'stage' } },
                            { $unwind: { path: '$info.statuses', preserveNullAndEmptyArrays: false } },
                            { $match: {
                                $expr: {
                                    $or: [
                                        // Match by _id field (ObjectId)
                                        { $eq: ['$info.statuses._id', '$$statusId'] },
                                        // Match by id field (string) - compare as strings
                                        { $eq: ['$info.statuses.id', '$$statusIdStr'] }
                                    ]
                                }
                            }},
                            { $project: { statusName: '$info.statuses.name' } }
                        ],
                        as: 'statusInfo'
                    }
                });
                
                // Add status name and sort order field
                pipeline.push({
                    $addFields: {
                        statusName: {
                            $arrayElemAt: ['$statusInfo.statusName', 0]
                        }
                    }
                });
                
                // Add sort order based on status name (case-insensitive comparison)
                pipeline.push({
                    $addFields: {
                        statusNameLower: { $toLower: '$statusName' },
                        sortOrder: {
                            $switch: {
                                branches: [
                                    { case: { $eq: [{ $toLower: '$statusName' }, 'new'] }, then: 1 },
                                    { case: { $eq: [{ $toLower: '$statusName' }, 'ne1'] }, then: 2 },
                                    { case: { $eq: [{ $toLower: '$statusName' }, 'ne2'] }, then: 3 },
                                    { case: { $eq: [{ $toLower: '$statusName' }, 'ne3'] }, then: 4 },
                                    { case: { $eq: [{ $toLower: '$statusName' }, 'ne4'] }, then: 5 },
                                    { case: { $eq: [{ $toLower: '$statusName' }, 'termin'] }, then: 6 },
                                    { case: { $eq: [{ $toLower: '$statusName' }, 'angebot'] }, then: 7 },
                                    { case: { $eq: [{ $toLower: '$statusName' }, 'contract'] }, then: 8 },
                                    { case: { $eq: [{ $toLower: '$statusName' }, 'confirmation'] }, then: 9 },
                                    { case: { $eq: [{ $toLower: '$statusName' }, 'payment'] }, then: 10 },
                                    { case: { $eq: [{ $toLower: '$statusName' }, 'netto1'] }, then: 11 },
                                    { case: { $eq: [{ $toLower: '$statusName' }, 'netto2'] }, then: 12 },
                                    { case: { $eq: [{ $toLower: '$statusName' }, 'lost'] }, then: 13 },
                                    { case: { $eq: [{ $toLower: '$statusName' }, 'out'] }, then: 14 }
                                ],
                                default: 999 // All other statuses go to the end
                            }
                        }
                    }
                });
            }
            
            // Add projection to transform grouped results: rename key to groupId and add groupName
            pipeline.push(this._buildGroupProjection(groupBy, includeIds));
            
            // Sort grouped results based on the groupBy field (skip if already sorted by project name, etc.)
            if (!groupPresortedByName) {
                const sortStage = this._buildGroupSortStage(groupBy, modelName);
                pipeline.push(sortStage);
            }
            
            // For multi-level grouping, we need ALL aggregation results to build the nested structure correctly
            // Pagination will be applied AFTER building the nested structure to the top-level groups
            // For single-level grouping, apply pagination here as usual
            if (groupBy.length === 1) {
                // Apply pagination to grouped results for single-level grouping
                pipeline.push({ $skip: parseInt(offset) });
                pipeline.push({ $limit: parseInt(limit) });
            }
            // For multi-level grouping, skip pagination here - it will be applied after nested structure is built
        }

        // 4. Sort, Skip, Limit (if not grouping)
        if (groupBy.length === 0) {
            // Ensure orderBy is a valid string before splitting
            if (!orderBy || typeof orderBy !== 'string') {
                orderBy = 'createdAt desc';
                logger.warn(`Invalid orderBy value provided, defaulting to: ${orderBy}`);
            }
            const [sortField, sortDir] = orderBy.split(' ');
            const normalizedSortField = sortField ? sortField.trim().toLowerCase() : '';
            const sortDirection = sortDir && sortDir.toLowerCase() === 'desc' ? -1 : 1;
            
            // Special handling for fields that need numerical sorting but are stored as strings
            // or date fields that need proper date sorting
            let needsNumericSort = false;
            let needsDateSort = false;
            let needsRevenueSort = false;
            let needsRefSort = false;

            // Reference field sorting configuration
            // Maps reference fields to their lookup collection and display field
            const REF_SORT_CONFIG = {
                'user_id':        { from: 'users',    displayField: 'login' },
                'agent_id':       { from: 'users',    displayField: 'login' },
                'source_agent':   { from: 'users',    displayField: 'login' },
                'created_by':     { from: 'users',    displayField: 'login' },
                'team_id':        { from: 'teams',    displayField: 'name' },
                'project_id':     { from: 'teams',    displayField: 'name' },
                'source_project': { from: 'teams',    displayField: 'name' },
                'bank_id':        { from: 'banks',    displayField: 'name' },
                'source_id':      { from: 'sources',  displayField: 'name' },
                'status_id':      { from: 'settings', displayField: 'name' },
                'stage_id':       { from: 'settings', displayField: 'name' },
                'lead_id':        { from: 'leads',    displayField: 'email_from' },
                'offer_id':       { from: 'offers',   displayField: 'reference_no' },
            };
            
            if (normalizedSortField === 'expected_revenue' && modelName === 'Lead') {
                needsRevenueSort = true;
                logger.info('Applying expected_revenue sorting logic', { sortField: normalizedSortField, modelName, sortDirection });
                // Add a computed numeric field for expected_revenue
                // Parse values like "29.56k" (thousands) and "1.5m" (millions) to numeric values
                // Convert expected_revenue to string first for consistent processing
                pipeline.push({
                    $addFields: {
                        revenueStr: { $toString: { $ifNull: ['$expected_revenue', '0'] } }
                    }
                });
                
                // Parse the revenue value
                pipeline.push({
                    $addFields: {
                        revenueNumeric: {
                            $cond: {
                                // Check if ends with 'k' (thousands) - case insensitive
                                if: {
                                    $eq: [
                                        { $toLower: { $substrCP: ['$revenueStr', { $subtract: [{ $strLenCP: '$revenueStr' }, 1] }, 1] } },
                                        'k'
                                    ]
                                },
                                then: {
                                    $multiply: [
                                        {
                                            $toDouble: {
                                                $substrCP: [
                                                    '$revenueStr',
                                                    0,
                                                    { $subtract: [{ $strLenCP: '$revenueStr' }, 1] }
                                                ]
                                            }
                                        },
                                        1000
                                    ]
                                },
                                else: {
                                    $cond: {
                                        // Check if ends with 'm' (millions) - case insensitive
                                        if: {
                                            $eq: [
                                                { $toLower: { $substrCP: ['$revenueStr', { $subtract: [{ $strLenCP: '$revenueStr' }, 1] }, 1] } },
                                                'm'
                                            ]
                                        },
                                        then: {
                                            $multiply: [
                                                {
                                                    $toDouble: {
                                                        $substrCP: [
                                                            '$revenueStr',
                                                            0,
                                                            { $subtract: [{ $strLenCP: '$revenueStr' }, 1] }
                                                        ]
                                                    }
                                                },
                                                1000000
                                            ]
                                        },
                                        else: {
                                            // Try to parse as plain number
                                            $ifNull: [
                                                { $toDouble: '$revenueStr' },
                                                0
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
                // Sort by the numeric revenue field
                pipeline.push({ $sort: { revenueNumeric: sortDirection } });
            } else if (normalizedSortField === 'lead_source_no' && modelName === 'Lead') {
                needsNumericSort = true;
                // Add a computed numeric field for lead_source_no
                // Convert string to number for proper numerical sorting
                pipeline.push({
                    $addFields: {
                        lead_source_no_numeric: {
                            $cond: {
                                if: { $and: [
                                    { $ne: ['$lead_source_no', null] },
                                    { $ne: ['$lead_source_no', ''] }
                                ]},
                                then: {
                                    $toDouble: {
                                        $ifNull: [
                                            { $trim: { input: { $toString: '$lead_source_no' } } },
                                            '0'
                                        ]
                                    }
                                },
                                else: 0
                            }
                        }
                    }
                });
                // Sort by the numeric field
                pipeline.push({ $sort: { lead_source_no_numeric: sortDirection } });
            } else if (normalizedSortField === 'lead_date' && modelName === 'Lead') {
                needsDateSort = true;
                // Add a computed timestamp field for lead_date
                // Normalize dates to ensure proper sorting - convert strings to dates, keep dates as-is
                pipeline.push({
                    $addFields: {
                        lead_date_normalized: {
                            $cond: {
                                if: { $ne: ['$lead_date', null] },
                                then: {
                                    $switch: {
                                        branches: [
                                            {
                                                case: { $eq: [{ $type: '$lead_date' }, 'date'] },
                                                then: '$lead_date'
                                            },
                                            {
                                                case: { $eq: [{ $type: '$lead_date' }, 'string'] },
                                                then: {
                                                    $ifNull: [
                                                        { $dateFromString: { dateString: '$lead_date', onError: null } },
                                                        { $dateFromString: { dateString: '1970-01-01T00:00:00.000Z' } }
                                                    ]
                                                }
                                            }
                                        ],
                                        default: { $dateFromString: { dateString: '1970-01-01T00:00:00.000Z' } }
                                    }
                                },
                                else: { $dateFromString: { dateString: '1970-01-01T00:00:00.000Z' } }
                            }
                        }
                    }
                });
                // Sort by the normalized date field, then by _id for consistent ordering
                pipeline.push({ $sort: { lead_date_normalized: sortDirection, _id: 1 } });
            } else if (sortField && REF_SORT_CONFIG[sortField.trim()]) {
                // Reference field sorting - lookup the referenced collection and sort by display name
                needsRefSort = true;
                const sortKeyApi = sortField.trim();
                const refConfig = REF_SORT_CONFIG[sortKeyApi];
                // ClosedLead stores source_user_id / source_team_id; API may use source_agent / source_project
                const sortFieldDb = modelName ? this._mapFieldName(sortKeyApi, modelName) : sortKeyApi;
                const sortAlias = `_sort_${sortKeyApi.replace(/\./g, '_')}`;
                pipeline.push({
                    $lookup: {
                        from: refConfig.from,
                        localField: sortFieldDb,
                        foreignField: '_id',
                        as: sortAlias
                    }
                });
                pipeline.push({
                    $unwind: {
                        path: `$${sortAlias}`,
                        preserveNullAndEmptyArrays: true
                    }
                });
                const sortKey = `${sortAlias}.${refConfig.displayField}`;
                pipeline.push({ $sort: { [sortKey]: sortDirection, _id: 1 } });
            } else {
                // Standard sorting for other fields
                pipeline.push({ $sort: { [sortField]: sortDirection } });
            }
            
            pipeline.push({ $skip: parseInt(offset) });
            pipeline.push({ $limit: parseInt(limit) });
            
            // 5. Remove lookup-added fields (*_joined) and temporary sort fields
            // This ensures filtered queries return the same structure as baseline queries
            if (lookups.size > 0 || needsNumericSort || needsDateSort || needsRevenueSort || needsRefSort) {
                const cleanupProjection = { $project: {} };
                // Remove lookup-added fields
                if (lookups.size > 0) {
                    for (const [key] of lookups) {
                        cleanupProjection.$project[`${key}_joined`] = 0;
                    }
                }
                // Remove temporary numeric sort field
                if (needsNumericSort) {
                    cleanupProjection.$project.lead_source_no_numeric = 0;
                }
                // Remove temporary revenue sort fields
                if (needsRevenueSort) {
                    cleanupProjection.$project.revenueNumeric = 0;
                    cleanupProjection.$project.revenueStr = 0;
                }
                // Remove temporary date sort field
                if (needsDateSort) {
                    cleanupProjection.$project.lead_date_normalized = 0;
                }
                // Remove temporary reference sort lookup field
                if (needsRefSort) {
                    const sortKeyApi = (orderBy && orderBy.split(' ')[0]) ? orderBy.split(' ')[0].trim() : '';
                    const sortAliasRm = sortKeyApi ? `_sort_${sortKeyApi.replace(/\./g, '_')}` : null;
                    if (sortAliasRm) {
                        cleanupProjection.$project[sortAliasRm] = 0;
                    }
                }
                pipeline.push(cleanupProjection);
            }
        }

        // Build count pipeline for total count (only for non-grouped queries)
        let totalCount = 0;
        if (groupBy.length === 0) {
            const countPipeline = [];
            for (const [key, lookupStages] of lookups) {
                countPipeline.push(...lookupStages);
            }
            if (Object.keys(matchStage).length > 0) {
                countPipeline.push({ $match: matchStage });
            }
            countPipeline.push({ $count: 'total' });
            
            const countResult = await Model.aggregate(countPipeline);
            totalCount = countResult.length > 0 ? countResult[0].total : 0;
        }

        // Execute main pipeline
        const startTime = Date.now();
        let results = await Model.aggregate(pipeline);
        const duration = Date.now() - startTime;

        // For grouped queries, total is the number of groups (after grouping but before any limit)
        if (groupBy.length > 0) {
            if (groupBy.length > 1) {
                // For multi-level grouping, we'll count top-level groups after building nested structure
                // Set to 0 for now, will be updated after transformation
                totalCount = 0;
            } else {
                // For single-level grouping, count groups from aggregation
                const groupCountPipeline = [];
                for (const [key, lookupStages] of lookups) {
                    groupCountPipeline.push(...lookupStages);
                }
                if (Object.keys(matchStage).length > 0) {
                    groupCountPipeline.push({ $match: matchStage });
                }
                
                // Rebuild group stage for counting
                const firstField = groupBy[0];
                const actualFirstField = this._mapFieldName(firstField, modelName);
                if (!includeAll && this._isDateField(actualFirstField, Model.schema) && !firstField.includes('.')) {
                    // Only add null filtering if domain doesn't already have it
                    if (!hasNullExclusionInDomain(firstField) && !hasNullExclusionInDomain(actualFirstField)) {
                        const dateMatch = { [actualFirstField]: { $ne: null, $exists: true } };
                        groupCountPipeline.push({ $match: dateMatch });
                    }
                }
                
                if (groupBy.includes('transferred_lead') && modelName === 'Lead') {
                    groupCountPipeline.push({
                        $addFields: {
                            is_transferred: {
                                $cond: {
                                    if: {
                                        $or: [
                                            { $and: [
                                                { $ifNull: ['$prev_team_id', false] },
                                                { $ne: ['$prev_team_id', null] }
                                            ]},
                                            { $and: [
                                                { $ifNull: ['$prev_user_id', false] },
                                                { $ne: ['$prev_user_id', null] }
                                            ]}
                                        ]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    });
                }

                groupCountPipeline.push(this._buildGroupStage(groupBy, Model.schema, lookups, false, modelName));
                
                if (!includeAll && this._isDateField(actualFirstField, Model.schema) && !firstField.includes('.')) {
                    const idKey = firstField.includes('.') ? firstField.replace(/\./g, '_') : firstField;
                    groupCountPipeline.push({ $match: { [`_id.${idKey}`]: { $ne: null } } });
                }
                
                groupCountPipeline.push({ $count: 'total' });
                const groupCountResult = await Model.aggregate(groupCountPipeline);
                totalCount = groupCountResult.length > 0 ? groupCountResult[0].total : 0;
            }
        }

        // Transform results: generate IDs for date fields and resolve groupName for reference fields
        if (groupBy.length > 0) {
            // Handle multilevel grouping
            if (groupBy.length > 1) {
                results = await this._transformMultilevelResults(results, groupBy, Model.schema, modelName);
                // For multi-level grouping, count total top-level groups before pagination
                totalCount = results.length;

                // Apply level-specific sorting when orderBy matches a groupBy field
                let sortApplied = false;
                if (orderBy && typeof orderBy === 'string' && orderBy.trim()) {
                    const parts = orderBy.trim().split(' ');
                    const sortField = parts[0];
                    const sortDir = (parts[1] || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

                    const sortLevel = groupBy.findIndex(field => {
                        const { baseField } = this._parseFieldGranularity(field);
                        return baseField === sortField || field === sortField;
                    });

                    if (sortLevel >= 0) {
                        this._applySortAtLevel(results, sortLevel, sortDir, groupBy);
                        sortApplied = true;
                        logger.info(`Multilevel sort: field=${sortField}, level=${sortLevel}, direction=${sortDir}`);
                    } else if (sortField === 'count') {
                        const mult = sortDir === 'asc' ? 1 : -1;
                        results.sort((a, b) => mult * ((a.count || 0) - (b.count || 0)));
                        sortApplied = true;
                        logger.info(`Multilevel sort by count: direction=${sortDir}`);
                    }
                }

                if (!sortApplied) {
                    results.sort((a, b) => (b.count || 0) - (a.count || 0));
                }

                // Apply pagination to top-level groups AFTER building nested structure
                const startIdx = parseInt(offset);
                const endIdx = startIdx + parseInt(limit);
                results = results.slice(startIdx, endIdx);
            } else {
                // Single level grouping
                const firstField = groupBy[0];
                
                // Parse granularity from field name (e.g., "lead_date:month" -> { baseField: "lead_date", granularity: "month" })
                const { baseField, granularity } = this._parseFieldGranularity(firstField);
                
                // Check if this is a related field (e.g., 'lead_id.status_id' or 'lead_id.lead_date:month')
                if (baseField.includes('.')) {
                    // Related field grouping - need to check the related model's schema
                    const parts = baseField.split('.');
                    const localField = parts[0]; // e.g., 'lead_id'
                    const foreignField = parts.slice(1).join('.'); // e.g., 'status_id' or 'lead_date'
                    
                    // Map the local field name (in case of aliases)
                    const actualLocalField = modelName ? this._mapFieldName(localField, modelName) : localField;
                    
                    logger.debug(`Related field grouping: ${firstField} -> ${actualLocalField}.${foreignField} (granularity: ${granularity || 'none'})`);
                    
                    // Get the reference model name from the schema
                    const schemaPath = Model.schema.path(actualLocalField);
                    const refModelName = schemaPath && schemaPath.options && schemaPath.options.ref;
                    
                    if (refModelName) {
                        logger.debug(`Related field ${actualLocalField} references ${refModelName}`);
                        
                        // Get the related model's schema to check field types
                        const RelatedModel = this.getModel(refModelName);
                        if (RelatedModel) {
                            const relatedSchema = RelatedModel.schema;
                            
                            // Check field type on the RELATED model's schema
                            const isDateField = this._isDateField(foreignField, relatedSchema);
                            const isReferenceField = this._isReferenceField(foreignField, relatedSchema);
                            const isSpecialReferenceField = this._isSpecialReferenceField(foreignField);
                            
                            logger.debug(`Related field type detection for ${foreignField}:`, {
                                isDateField,
                                isReferenceField,
                                isSpecialReferenceField
                            });
                            
                            // Handle based on the related field's type
                            if (isDateField || granularity) {
                                results = results.map(result => {
                                    if (result.groupId !== undefined && result.groupId !== null) {
                                        const dateStr = result.groupId;
                                        // Keep groupId as a parseable string format: fieldName_dateStr
                                        // This allows _parseDateGroupValue to extract and parse the date
                                        result.groupId = `${firstField}_${dateStr}`;
                                        // Format groupName for human-readable display
                                        result.groupName = this._formatDateGroupName(dateStr, granularity);
                                    } else {
                                        // Handle null dates - use hash for None values
                                        result.groupId = this._generateNoneGroupId(`${firstField}_none`, 0);
                                        result.groupName = 'None';
                                    }
                                    return result;
                                });
                            } else if (isReferenceField || isSpecialReferenceField) {
                                logger.info(`Populating group names for related reference field: ${firstField}`);
                                await this._populateGroupNames(results, foreignField, relatedSchema);
                            } else {
                                // Other field types (string, number, boolean, etc.)
                                results = results.map(result => {
                                    if (result.groupId === null || result.groupId === undefined) {
                                        result.groupName = 'None';
                                    } else {
                                        result.groupName = result.groupId.toString();
                                    }
                                    return result;
                                });
                            }
                        } else {
                            logger.warn(`Related model ${refModelName} not found, using groupId as groupName`);
                            results = results.map(result => {
                                result.groupName = result.groupId ? result.groupId.toString() : 'None';
                                return result;
                            });
                        }
                    } else {
                        logger.warn(`No reference found for ${actualLocalField}, using groupId as groupName`);
                        results = results.map(result => {
                            result.groupName = result.groupId ? result.groupId.toString() : 'None';
                            return result;
                        });
                    }
                } else {
                    // Direct field grouping (no dots)
                    // Map field alias to actual field name for schema checks (use baseField without granularity)
                    const actualBaseField = modelName ? this._mapFieldName(baseField, modelName) : baseField;
                    logger.debug(`Direct field grouping: ${firstField} -> ${actualBaseField} (granularity: ${granularity || 'none'})`);
                    
                    const isDateField = this._isDateField(actualBaseField, Model.schema);
                    const isReferenceField = this._isReferenceField(actualBaseField, Model.schema);
                    const isSpecialReferenceField = this._isSpecialReferenceField(baseField);
                    
                    logger.debug(`Field type detection for ${actualBaseField}:`, {
                        isDateField,
                        isReferenceField,
                        isSpecialReferenceField,
                        granularity
                    });
                    
                    // Handle transferred_lead virtual field
                    if (baseField === 'transferred_lead') {
                        results = results.map(result => {
                            result.groupName = result.groupId === true ? 'Transferred' : 'Fresh';
                            return result;
                        });
                    }
                    // Handle date fields (or any field with granularity specified)
                    else if (isDateField || granularity) {
                        results = results.map(result => {
                            if (result.groupId !== undefined && result.groupId !== null) {
                                // groupId is already a formatted date string from $dateToString (e.g., "2024-01-15")
                                const dateStr = result.groupId;
                                // Keep groupId as a parseable string format: fieldName_dateStr
                                // This allows _parseDateGroupValue to extract and parse the date
                                result.groupId = `${firstField}_${dateStr}`;
                                // Format groupName for human-readable display
                                result.groupName = this._formatDateGroupName(dateStr, granularity);
                            } else {
                                // Handle null dates - use hash for None values (these don't need to be parsed)
                                result.groupId = this._generateNoneGroupId(`${firstField}_none`, 0);
                                result.groupName = 'None';
                            }
                            return result;
                        });
                    } 
                    // Handle reference fields (status_id, user_id, team_id, source_id, etc.)
                    else if (isReferenceField || isSpecialReferenceField) {
                        logger.info(`Populating group names for reference field: ${actualBaseField}`);
                        await this._populateGroupNames(results, actualBaseField, Model.schema);
                    }
                    // Handle other fields (strings, numbers, etc.)
                    else {
                        logger.warn(`Field ${actualBaseField} is not a date or reference field, using groupId as groupName`);
                        results = results.map(result => {
                            if (result.groupId === null || result.groupId === undefined) {
                                result.groupName = 'None';
                            } else {
                                result.groupName = result.groupId.toString();
                            }
                            return result;
                        });
                    }
                }
            }
        }

        logger.info(`Search on ${modelName} completed in ${duration}ms`, {
            domain: JSON.stringify(domain),
            results: results.length,
            total: totalCount
        });

        // Normalize results for consistent structure (non-grouped queries only)
        if (groupBy.length === 0 && results.length > 0) {
            results = this._normalizeResults(results, Model.schema, lookups);
        }
        
        // Remove temporary sorting fields from grouped results (sortOrder, statusName, statusNameLower)
        if (groupBy.length > 0 && results.length > 0) {
            results = results.map(result => {
                // Remove sortOrder, statusName, statusNameLower, and statusInfo fields that were used for sorting
                const { sortOrder, statusName, statusNameLower, statusInfo, ...cleanResult } = result;
                return cleanResult;
            });
        }

        // Calculate page number from offset and limit
        const page = limit > 0 ? Math.floor(offset / limit) + 1 : 1;
        const pages = limit > 0 ? Math.ceil(totalCount / limit) : 1;

        return {
            data: results,
            meta: {
                total: totalCount,
                page: page,
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: pages
            }
        };
    }

    _parseDomain(domain, schema, lookups, modelName = null) {
        if (!Array.isArray(domain) || domain.length === 0) return {};

        const query = { $and: [] };

        // Flatten nested domain arrays (handle cases where domain is nested like [[[condition1], [condition2]]])
        // This happens when the frontend sends domain as a nested array structure
        const flattenDomain = (arr) => {
            const result = [];
            for (const item of arr) {
                if (Array.isArray(item)) {
                    // Check if this is a condition [field, operator, value] or a nested array of conditions
                    if (item.length === 3 && typeof item[0] === 'string' && typeof item[1] === 'string') {
                        // This is a condition: [field, operator, value]
                        result.push(item);
                    } else {
                        // This is a nested array, recurse to flatten it
                        result.push(...flattenDomain(item));
                    }
                } else {
                    result.push(item);
                }
            }
            return result;
        };
        
        const flattenedDomain = flattenDomain(domain);

        // Simple parser for [['field', 'op', 'val'], ...]
        // Does not yet handle complex nested logic like ['|', ...] fully recursively in this snippet
        // but gives the structure.

        for (const condition of flattenedDomain) {
            if (Array.isArray(condition)) {
                let [field, operator, value] = condition;
                
                // Skip "in" / "not in" with empty array - treat as no filter (return all)
                if ((operator === 'in' || operator === 'not in') && Array.isArray(value) && value.length === 0) {
                    continue;
                }
                
                // Store original field name for "None" groupId checking (before mapping)
                const originalField = field;
                
                // Special handling for transferred_lead virtual field
                // Transferred = either prev_team_id or prev_user_id has data
                if (field === 'transferred_lead' && modelName === 'Lead') {
                    const isTransferred = value === true || value === 'true';
                    if (isTransferred) {
                        query.$and.push({
                            $or: [
                                { prev_team_id: { $ne: null, $exists: true } },
                                { prev_user_id: { $ne: null, $exists: true } }
                            ]
                        });
                    } else {
                        query.$and.push({
                            $and: [
                                { $or: [{ prev_team_id: null }, { prev_team_id: { $exists: false } }] },
                                { $or: [{ prev_user_id: null }, { prev_user_id: { $exists: false } }] }
                            ]
                        });
                    }
                    continue;
                }

                // Special handling for lead_transfer filter
                // Format: ["lead_transfer:day", "=", "Elvis → Panda (Dec 15, 2025)"]
                if (field.startsWith('lead_transfer:') && modelName === 'Lead') {
                    const filterInfo = this._parseLeadTransferFilter(field, operator, value);
                    if (filterInfo && filterInfo._leadTransferFilter) {
                        // Store the filter info for async resolution
                        // The search method will detect this and resolve it
                        query.$and.push({ _leadTransferFilter: filterInfo });
                    } else {
                        // No matching transfers, return empty result
                        query.$and.push({ _id: { $eq: null } });
                    }
                    continue; // Move to next condition
                }
                
                // Special handling for transfer_pair filter (subGroup filtering)
                // Format: ["transfer_pair", "=", "fromAgentId_toAgentId_date"] or "fromAgentId_toAgentId_" or "fromAgentId_toAgentId"
                // This allows filtering on subGroups from lead_transfer hierarchical grouping
                if (field === 'transfer_pair' && modelName === 'Lead') {
                    // transfer_pair groupId format: "fromAgentId_toAgentId_date" or "fromAgentId_toAgentId_" or "fromAgentId_toAgentId"
                    // Reuse the lead_transfer filter parsing with a default granularity
                    // Extract the date part to determine granularity
                    const parts = value.split('_');
                    let granularity = 'day'; // default
                    let datePart = '';
                    
                    if (parts.length >= 3) {
                        // Check if value ends with underscore (no date)
                        if (value.endsWith('_')) {
                            datePart = ''; // No date part
                        } else {
                            datePart = parts.slice(2).join('_');
                            // Determine granularity from date format
                            if (/^\d{4}$/.test(datePart)) {
                                granularity = 'year';
                            } else if (/^\d{4}-\d{2}$/.test(datePart)) {
                                granularity = 'month';
                            } else if (/^\d{4}-W\d{1,2}$/.test(datePart)) {
                                granularity = 'week';
                            }
                        }
                    } else if (parts.length === 2) {
                        // Just "fromAgentId_toAgentId" - no date
                        datePart = '';
                    }
                    
                    const filterInfo = this._parseLeadTransferFilter(`lead_transfer:${granularity}`, operator, value);
                    if (filterInfo && filterInfo._leadTransferFilter) {
                        query.$and.push({ _leadTransferFilter: filterInfo });
                    } else {
                        logger.warn(`Failed to parse transfer_pair filter: ${value}`);
                        query.$and.push({ _id: { $eq: null } });
                    }
                    continue; // Move to next condition
                }
                
                // Check for date granularity suffix (e.g., lead_date:month, createdAt:year, lead_id.lead_date:month)
                const { baseField: fieldWithoutGranularity, granularity } = this._parseFieldGranularity(field);
                
                if (granularity) {
                    // This is a date field with granularity - convert formatted value to date range
                    
                    // Check if this is a related field (contains a dot, e.g., lead_id.lead_date)
                    if (fieldWithoutGranularity.includes('.')) {
                        const parts = fieldWithoutGranularity.split('.');
                        const localField = parts[0];
                        const actualLocalField = modelName ? this._mapFieldName(localField, modelName) : localField;
                        const schemaPath = schema.path(actualLocalField);
                        
                        if (schemaPath && schemaPath.options && schemaPath.options.ref) {
                            // This is a related field with date granularity (e.g., lead_id.lead_date:month)
                            const foreignField = parts.slice(1).join('.');
                            const matchField = `${actualLocalField}_joined.${foreignField}`;
                            
                            // Handle "None" groupId for related date granularity fields
                            const isNoneGroupId = this._isNoneGroupId(value, originalField) || this._isNoneGroupId(value, fieldWithoutGranularity);
                            if (isNoneGroupId) {
                                // Filter for null reference field
                                query.$and.push(this._buildCondition(actualLocalField, operator, null, schema));
                            } else {
                                // Add lookup for this relationship
                                this._addLookup(actualLocalField, schema, lookups);
                                
                                // Parse the formatted date value back to date range
                                const dateRange = this._parseDateGroupValue(value, granularity);
                                if (dateRange) {
                                    if (operator === '=' || operator === 'in') {
                                        query.$and.push({ [matchField]: dateRange });
                                    } else if (operator === '!=' || operator === 'not in') {
                                        query.$and.push({ 
                                            $or: [
                                                { [matchField]: { $lt: dateRange.$gte } },
                                                { [matchField]: { $gte: dateRange.$lt } }
                                            ]
                                        });
                                    } else {
                                        logger.warn(`Unsupported operator ${operator} for date granularity field ${field}`);
                                    }
                                } else {
                                    logger.warn(`Failed to parse date group value: ${value} for related field ${field} with granularity ${granularity}`);
                                }
                            }
                            continue; // Move to next condition
                        }
                    }
                    
                    // Simple field with date granularity (e.g., lead_date:month, createdAt:year)
                    const dateBaseField = modelName ? this._mapFieldName(fieldWithoutGranularity, modelName) : fieldWithoutGranularity;
                    
                    // Handle "None" groupId for date granularity fields
                    const isNoneGroupId = this._isNoneGroupId(value, originalField) || this._isNoneGroupId(value, fieldWithoutGranularity);
                    if (isNoneGroupId) {
                        // Filter for null/empty date field
                        query.$and.push(this._buildCondition(dateBaseField, operator, null, schema));
                    } else {
                        // Parse the formatted date value back to date range
                        const dateRange = this._parseDateGroupValue(value, granularity);
                        if (dateRange) {
                            if (operator === '=' || operator === 'in') {
                                // For equality, use date range
                                query.$and.push({ [dateBaseField]: dateRange });
                            } else if (operator === '!=' || operator === 'not in') {
                                // For not equals, use $not with date range
                                query.$and.push({ 
                                    $or: [
                                        { [dateBaseField]: { $lt: dateRange.$gte } },
                                        { [dateBaseField]: { $gte: dateRange.$lt } }
                                    ]
                                });
                            } else {
                                // For other operators, fall back to standard handling
                                logger.warn(`Unsupported operator ${operator} for date granularity field ${field}`);
                            }
                        } else {
                            logger.warn(`Failed to parse date group value: ${value} for field ${field} with granularity ${granularity}`);
                        }
                    }
                    continue; // Move to next condition
                }
                
                // Map field alias to actual field name
                const actualField = modelName ? this._mapFieldName(field, modelName) : field;
                
                // Special handling: Extract ObjectId from groupId-formatted values
                // Format: "fieldName_objectId" -> extract just the ObjectId
                // Also handles compound groupIds: "field1_id1_field2_id2" -> extract field2's ObjectId
                // Examples: 
                //   - team_id_69283a83f81b20f2f98a06be -> extract 69283a83f81b20f2f98a06be
                //   - team_id_xxx_user_id_yyy -> extract yyy for user_id field
                if (typeof value === 'string') {
                    const originalValue = value; // Store original for logging
                    const fieldPrefixes = [originalField, field, actualField].filter(Boolean);
                    let extracted = false;
                    
                    for (const fieldPrefix of fieldPrefixes) {
                        const normalizedPrefix = fieldPrefix.replace(/\./g, '_').replace(/:/g, '_');
                        const prefix = `${normalizedPrefix}_`;
                        
                        // Try direct prefix match first (simple case: field_id)
                        if (value.startsWith(prefix)) {
                            const objectIdPart = value.substring(prefix.length);
                            // Check if the remaining part looks like an ObjectId (24 hex chars)
                            if (/^[a-f0-9]{24}$/i.test(objectIdPart)) {
                                try {
                                    value = new mongoose.Types.ObjectId(objectIdPart);
                                    logger.debug(`Extracted ObjectId from groupId format: ${normalizedPrefix}_${objectIdPart} -> ${value}`);
                                    extracted = true;
                                    break;
                                } catch (e) {
                                    logger.warn(`Failed to convert ${objectIdPart} to ObjectId for field ${normalizedPrefix}`);
                                }
                            }
                        }
                        
                        // Try compound groupId format (e.g., "field1_id1_field2_id2")
                        // Split by underscores and look for the field name followed by an ObjectId
                        const parts = value.split('_');
                        for (let i = 0; i < parts.length - 1; i++) {
                            // Try to match the field name (might be split across parts)
                            let fieldMatch = false;
                            let matchedEndIndex = i;
                            
                            // Try exact single-part match
                            if (parts[i] === normalizedPrefix) {
                                fieldMatch = true;
                            } else {
                                // Try combining parts to match field name
                                let combinedPart = parts[i];
                                for (let j = i + 1; j < parts.length && combinedPart.length < normalizedPrefix.length; j++) {
                                    combinedPart += '_' + parts[j];
                                    if (combinedPart === normalizedPrefix) {
                                        fieldMatch = true;
                                        matchedEndIndex = j;
                                        break;
                                    }
                                    if (combinedPart.length > normalizedPrefix.length) {
                                        break;
                                    }
                                }
                            }
                            
                            if (fieldMatch && matchedEndIndex + 1 < parts.length) {
                                // The part after the matched field name should be the ObjectId
                                const potentialId = parts[matchedEndIndex + 1];
                                if (/^[a-f0-9]{24}$/i.test(potentialId)) {
                                    try {
                                        const extractedObjectId = new mongoose.Types.ObjectId(potentialId);
                                        value = extractedObjectId;
                                        logger.debug(`Extracted ObjectId from compound groupId: ${extractedObjectId} (field: ${normalizedPrefix}, original groupId: ${originalValue})`);
                                        extracted = true;
                                        break;
                                    } catch (e) {
                                        logger.warn(`Failed to convert ${potentialId} to ObjectId for field ${normalizedPrefix} in compound groupId`);
                                    }
                                }
                            }
                            if (extracted) break;
                        }
                        if (extracted) break;
                    }
                }
                
                field = actualField;

                // Check if field is a nested array path (e.g., progression.opening.files)
                if (field.includes('.')) {
                    const parts = field.split('.');
                    const lastPart = parts[parts.length - 1];
                    
                    // Check if the last part is 'files' (common pattern for array of objects)
                    // This handles paths like: progression.opening.files, progression.payment.files, etc.
                    if (lastPart === 'files' || lastPart === 'file') {
                        // This is a nested array of objects with document references
                        // For 'in' operator, check both _id and document fields
                        if (operator === 'in') {
                            // Cast value to ObjectId array for proper comparison
                            const arrayValue = Array.isArray(value) ? value : [value];
                            const castedArray = arrayValue.map(v => {
                                try {
                                    return new mongoose.Types.ObjectId(v);
                                } catch (e) {
                                    return v;
                                }
                            });
                            query.$and.push({
                                $or: [
                                    { [`${field}._id`]: { $in: castedArray } },
                                    { [`${field}.document`]: { $in: castedArray } }
                                ]
                            });
                        } else {
                            // For other operators, use standard condition
                            const castedValue = this._castValue(value, field, schema);
                            query.$and.push(this._buildCondition(field, operator, castedValue, schema));
                        }
                    } else {
                        // Check if it's a related field (e.g., 'user_id.name') that needs a lookup
                        const localField = parts[0];
                        // Map the local field name to actual field name (for aliases like source_user_id -> source_agent)
                        const actualLocalField = modelName ? this._mapFieldName(localField, modelName) : localField;
                        const schemaPath = schema.path(actualLocalField);
                        
                        // If the first part is a reference field, treat it as a related field lookup
                        if (schemaPath && schemaPath.options && schemaPath.options.ref) {
                            // Check if this is a "None" groupId (for null values) before processing
                            // Check both original and mapped field names (None groupId might be generated with either)
                            const isNoneGroupId = this._isNoneGroupId(value, localField) || this._isNoneGroupId(value, actualLocalField);
                            if (isNoneGroupId) {
                                // Convert "None" groupId to null filter for the reference field (use actual field name)
                                query.$and.push(this._buildCondition(actualLocalField, operator, null, schema));
                            } else {
                                const foreignField = parts.slice(1).join('.');

                                // Special case: refField._id with ilike/like - the local ref field already stores the _id.
                                // Use $expr + $toString to match ObjectId string representation (no lookup needed).
                                if (foreignField === '_id' && (operator === 'ilike' || operator === 'like')) {
                                    const regexPattern = this._escapeRegex(String(value));
                                    const regexOpts = operator === 'ilike' ? 'i' : '';
                                    query.$and.push({
                                        $expr: {
                                            $regexMatch: {
                                                input: { $toString: `$${actualLocalField}` },
                                                regex: new RegExp(regexPattern, regexOpts)
                                            }
                                        }
                                    });
                                } else if (foreignField === 'nickName' && actualLocalField === 'bank_id' && (operator === '=' || operator === '!=' || operator === 'in' || operator === 'not in')) {
                                    // bank_id.nickName with reference type: value is bank ObjectId from dropdown - filter by bank_id
                                    const isValidObjectId = (v) => {
                                        try { return mongoose.Types.ObjectId.isValid(v) && String(new mongoose.Types.ObjectId(v)) === String(v); } catch (e) { return false; }
                                    };
                                    if (operator === 'in' || operator === 'not in') {
                                        const arr = Array.isArray(value) ? value : [value];
                                        const validIds = arr.filter(isValidObjectId).map(v => new mongoose.Types.ObjectId(v));
                                        if (validIds.length > 0) {
                                            query.$and.push(this._buildCondition(actualLocalField, operator, validIds, schema));
                                        }
                                    } else if (isValidObjectId(value)) {
                                        query.$and.push(this._buildCondition(actualLocalField, operator, new mongoose.Types.ObjectId(value), schema));
                                    } else {
                                        this._addLookup(actualLocalField, schema, lookups);
                                        const matchField = `${actualLocalField}_joined.${foreignField}`;
                                        query.$and.push(this._buildCondition(matchField, operator, value, null));
                                    }
                                } else if (foreignField === 'bank_id.nickName' && actualLocalField === 'offer_id' && (operator === '=' || operator === '!=' || operator === 'in' || operator === 'not in')) {
                                    // offer_id.bank_id.nickName with reference type: value is bank ObjectId - filter by offer_id.bank_id
                                    const isValidObjectId = (v) => {
                                        try { return mongoose.Types.ObjectId.isValid(v) && String(new mongoose.Types.ObjectId(v)) === String(v); } catch (e) { return false; }
                                    };
                                    this._addLookup(actualLocalField, schema, lookups);
                                    const matchField = `${actualLocalField}_joined.bank_id`;
                                    if (operator === 'in' || operator === 'not in') {
                                        const arr = Array.isArray(value) ? value : [value];
                                        const validIds = arr.filter(isValidObjectId).map(v => new mongoose.Types.ObjectId(v));
                                        if (validIds.length > 0) {
                                            query.$and.push(this._buildCondition(matchField, operator, validIds, null));
                                        }
                                    } else if (isValidObjectId(value)) {
                                        query.$and.push(this._buildCondition(matchField, operator, new mongoose.Types.ObjectId(value), null));
                                    } else {
                                        query.$and.push(this._buildCondition(`${actualLocalField}_joined.bank_id.nickName`, operator, value, null));
                                    }
                                } else {
                                    // Add lookup for this relationship (use actual field name)
                                    this._addLookup(actualLocalField, schema, lookups);

                                    // The field in match becomes 'actualLocalField_joined.foreignField'
                                    const matchField = `${actualLocalField}_joined.${foreignField}`;

                                    // For ilike/like on ObjectId fields (e.g. _id), use $expr + $toString
                                    const isObjectIdField = foreignField === '_id' || (foreignField.endsWith('._id') && foreignField.split('.').length === 2);
                                    if (isObjectIdField && (operator === 'ilike' || operator === 'like')) {
                                        const regexPattern = this._escapeRegex(String(value));
                                        const regexOpts = operator === 'ilike' ? 'i' : '';
                                        query.$and.push({
                                            $expr: {
                                                $regexMatch: {
                                                    input: { $toString: `$${matchField}` },
                                                    regex: new RegExp(regexPattern, regexOpts)
                                                }
                                            }
                                        });
                                    } else {
                                        // Get the related model's schema to properly cast the value
                                        const refModelName = schemaPath.options.ref;
                                        const RelatedModel = this.getModel(refModelName);
                                        let castedValue = value;

                                        if (RelatedModel) {
                                            const relatedSchema = RelatedModel.schema;
                                            const relatedSchemaPath = relatedSchema.path(foreignField);

                                            // Check if the foreign field is a reference or special reference field
                                            const isRelatedRef = relatedSchemaPath && relatedSchemaPath.options && relatedSchemaPath.options.ref;
                                            const isSpecialRef = this._isSpecialReferenceField(foreignField);

                                            if (isRelatedRef || isSpecialRef) {
                                                // Cast to ObjectId for reference fields
                                                if (operator === 'in' || operator === 'not in') {
                                                    const arrayValue = Array.isArray(value) ? value : [value];
                                                    castedValue = arrayValue.map(v => {
                                                        try {
                                                            return new mongoose.Types.ObjectId(v);
                                                        } catch (e) {
                                                            return v;
                                                        }
                                                    });
                                                } else {
                                                    try {
                                                        castedValue = new mongoose.Types.ObjectId(value);
                                                    } catch (e) {
                                                        logger.warn(`Failed to cast ${value} to ObjectId for ${matchField}`);
                                                        castedValue = value;
                                                    }
                                                }
                                            } else {
                                                // Cast using the related model's schema
                                                castedValue = this._castValue(value, foreignField, relatedSchema);
                                            }
                                        } else {
                                            logger.warn(`Related model ${refModelName} not found, using raw value for ${matchField}`);
                                        }

                                        query.$and.push(this._buildCondition(matchField, operator, castedValue, null));
                                    }
                                }
                            }
                        } else {
                            // Regular nested field (not a reference, not a files array)
                            const castedValue = this._castValue(value, field, schema);
                            query.$and.push(this._buildCondition(field, operator, castedValue, schema));
                        }
                    }
                } else {
                    // Standard field (no dots)
                    // Check if field is an array of objects (like files array)
                    const schemaPath = schema.path(field);
                    if (schemaPath && schemaPath.instance === 'Array' && schemaPath.schema) {
                        // This is an array of objects (subdocument array)
                        // For 'in' operator, check both _id and document fields
                        if (operator === 'in') {
                            // Cast value to ObjectId array for proper comparison
                            const arrayValue = Array.isArray(value) ? value : [value];
                            const castedArray = arrayValue.map(v => {
                                try {
                                    return new mongoose.Types.ObjectId(v);
                                } catch (e) {
                                    return v;
                                }
                            });
                            query.$and.push({
                                $or: [
                                    { [`${field}._id`]: { $in: castedArray } },
                                    { [`${field}.document`]: { $in: castedArray } }
                                ]
                            });
                        } else {
                            // For other operators, use standard condition
                            const castedValue = this._castValue(value, field, schema);
                            query.$and.push(this._buildCondition(field, operator, castedValue, schema));
                        }
                    } else {
                        // Check if this is a reference field (ObjectId reference)
                        const isReferenceField = schemaPath && schemaPath.options && schemaPath.options.ref;
                        
                        // Regular field or simple array
                        // Check if this is a "None" groupId (for null values) before casting
                        // Check both original field name (used in groupBy) and mapped field name (actual schema field)
                        // The "None" groupId is generated using the original field name from groupBy
                        const isNoneGroupId = this._isNoneGroupId(value, originalField) || this._isNoneGroupId(value, field);
                        if (isNoneGroupId) {
                            // Convert "None" groupId to null filter (use actual mapped field name for the filter)
                            query.$and.push(this._buildCondition(field, operator, null, schema));
                        } else {
                            // For reference fields, ensure ObjectId is cast correctly
                            let castedValue;
                            if (isReferenceField && (operator === '=' || operator === 'in')) {
                                // Cast to ObjectId for reference fields
                                if (operator === 'in') {
                                    const arrayValue = Array.isArray(value) ? value : [value];
                                    castedValue = arrayValue.map(v => {
                                        try {
                                            return new mongoose.Types.ObjectId(v);
                                        } catch (e) {
                                            return v;
                                        }
                                    });
                                } else {
                                    try {
                                        castedValue = new mongoose.Types.ObjectId(value);
                                    } catch (e) {
                                        castedValue = this._castValue(value, field, schema);
                                    }
                                }
                            } else {
                                castedValue = this._castValue(value, field, schema);
                            }
                            query.$and.push(this._buildCondition(field, operator, castedValue, schema));
                        }
                    }
                }
            } else if (condition === '|') {
                // Handle OR operator - requires more complex stack-based parsing
                // For MVP, we'll assume implicit AND. 
                // TODO: Implement full Polish Notation parser for | and !
            }
        }

        if (query.$and.length === 0) return {};
        return query;
    }

    _escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    _buildCondition(field, operator, value, schema = null) {
        // Special handling for date equality: convert to date range (start of day to start of next day)
        if (operator === '=' && value instanceof Date && schema) {
            // Check if the field is a Date type in the schema
            const schemaPath = schema.path(field);
            if (schemaPath && schemaPath.instance === 'Date') {
                // Create start of day (00:00:00.000) in UTC to avoid timezone issues
                // Extract year, month, day from the date value
                const year = value.getUTCFullYear();
                const month = value.getUTCMonth();
                const day = value.getUTCDate();
                
                const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
                
                // Create start of next day (exclusive) in UTC
                const startOfNextDay = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
                
                // Return range query: >= start of day AND < start of next day
                return {
                    [field]: {
                        $gte: startOfDay,
                        $lt: startOfNextDay
                    }
                };
            }
        }
        
        // Special handling for date NOT equality: exclude the entire day
        if (operator === '!=' && value instanceof Date && schema) {
            // Check if the field is a Date type in the schema
            const schemaPath = schema.path(field);
            if (schemaPath && schemaPath.instance === 'Date') {
                // Create start of day (00:00:00.000) in UTC to avoid timezone issues
                const year = value.getUTCFullYear();
                const month = value.getUTCMonth();
                const day = value.getUTCDate();
                
                const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
                const startOfNextDay = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
                
                // Return: date < startOfDay OR date >= startOfNextDay (excludes the entire day)
                return {
                    $or: [
                        { [field]: { $lt: startOfDay } },
                        { [field]: { $gte: startOfNextDay } }
                    ]
                };
            }
        }
        
        // Special handling for date comparison operators
        // Ensures intuitive day-based comparisons: "> 2024-01-15" means "after Jan 15"
        if (['>', '>=', '<', '<='].includes(operator) && value instanceof Date && schema) {
            const schemaPath = schema.path(field);
            if (schemaPath && schemaPath.instance === 'Date') {
                const year = value.getUTCFullYear();
                const month = value.getUTCMonth();
                const day = value.getUTCDate();
                
                const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
                const startOfNextDay = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
                
                switch (operator) {
                    case '>':
                        // "after this day" = >= start of next day
                        return { [field]: { $gte: startOfNextDay } };
                    case '>=':
                        // "on or after this day" = >= start of this day
                        return { [field]: { $gte: startOfDay } };
                    case '<':
                        // "before this day" = < start of this day
                        return { [field]: { $lt: startOfDay } };
                    case '<=':
                        // "on or before this day" = < start of next day
                        return { [field]: { $lt: startOfNextDay } };
                }
            }
        }
        
        // Case-insensitive 'in' and 'not in' for string fields (order-independent, any case)
        if (operator === 'in' || operator === 'not in') {
            const arr = Array.isArray(value) ? value : [value];
            const allStrings = arr.length > 0 && arr.every(v => typeof v === 'string');
            const hasObjectIds = arr.some(v => v instanceof mongoose.Types.ObjectId);
            const schemaPath = schema && schema.path(field);
            const isStringField = schemaPath && schemaPath.instance === 'String';

            if ((isStringField || allStrings) && !hasObjectIds) {
                const regexConditions = arr.map(v => ({
                    [field]: { $regex: new RegExp('^' + this._escapeRegex(String(v)) + '$', 'i') }
                }));
                if (operator === 'in') {
                    return { $or: regexConditions };
                }
                return { $nor: regexConditions };
            }
        }

        switch (operator) {
            case '=': return { [field]: value };
            case '!=': return { [field]: { $ne: value } };
            case '>': return { [field]: { $gt: value } };
            case '>=': return { [field]: { $gte: value } };
            case '<': return { [field]: { $lt: value } };
            case '<=': return { [field]: { $lte: value } };
            case 'in': return { [field]: { $in: value } };
            case 'not in': return { [field]: { $nin: value } };
            case 'ilike': return { [field]: { $regex: this._escapeRegex(value), $options: 'i' } };
            case 'like': return { [field]: { $regex: this._escapeRegex(value) } };
            case 'between': {
                // For date fields, make the end date inclusive by extending to end of day
                // This ensures "between 2024-01-01 and 2024-01-15" includes all of 2024-01-15
                if (value[0] instanceof Date && value[1] instanceof Date && schema) {
                    const schemaPath = schema.path(field);
                    if (schemaPath && schemaPath.instance === 'Date') {
                        // Create start of first day in UTC
                        const startDate = new Date(Date.UTC(
                            value[0].getUTCFullYear(),
                            value[0].getUTCMonth(),
                            value[0].getUTCDate(),
                            0, 0, 0, 0
                        ));
                        // Create start of day AFTER end date in UTC (exclusive)
                        const endDate = new Date(Date.UTC(
                            value[1].getUTCFullYear(),
                            value[1].getUTCMonth(),
                            value[1].getUTCDate() + 1,
                            0, 0, 0, 0
                        ));
                        return { [field]: { $gte: startDate, $lt: endDate } };
                    }
                }
                // For non-date fields, use standard inclusive range
                return { [field]: { $gte: value[0], $lte: value[1] } };
            }
            case 'is_empty': 
            case 'is_null': 
                return { $or: [{ [field]: null }, { [field]: { $exists: false } }] };
            case 'is_not_empty': 
            case 'is_not_null': 
                return { [field]: { $exists: true, $ne: null } };
            default: return { [field]: value };
        }
    }

    _addLookup(field, schema, lookups) {
        // Prevent duplicate lookups
        if (lookups.has(field)) return;

        // Check schema to find ref
        const schemaPath = schema.path(field);
        if (!schemaPath) return;

        const ref = schemaPath.options.ref;
        if (!ref) return;

        // Convention: collection name is lowercase plural of ref
        // For robustness, this should ideally come from the model definition, 
        // but simple pluralization covers 90% of cases.
        const fromCollection = ref.toLowerCase() + 's'; 

        const stages = [
            {
                $lookup: {
                    from: fromCollection,
                    localField: field,
                    foreignField: '_id',
                    as: `${field}_joined`
                }
            },
            {
                $unwind: {
                    path: `$${field}_joined`,
                    preserveNullAndEmptyArrays: true
                }
            }
        ];

        lookups.set(field, stages);
    }

    _castValue(value, field, schema) {
        // Handle null values (including string "null" from URL params)
        if (value === null || value === 'null' || value === '') {
            return null;
        }
        
        const schemaPath = schema.path(field);
        if (!schemaPath) {
            logger.warn(`Field ${field} not found in schema, using raw value`);
            return value;
        }

        const instance = schemaPath.instance;
        logger.debug(`Casting field ${field}: type=${instance}, value=${value}`);

        if (instance === 'ObjectID' || instance === 'ObjectId') {
            try {
                // If value is already an ObjectId, return it
                if (value instanceof mongoose.Types.ObjectId) {
                    return Array.isArray(value) ? value : value;
                }
                
                // Try to extract ObjectId from compound groupId format if direct casting fails
                const extractObjectIdFromGroupId = (val, fieldName) => {
                    if (typeof val !== 'string') return null;
                    
                    const normalizedFieldName = fieldName.replace(/\./g, '_').replace(/:/g, '_');
                    const parts = val.split('_');
                    
                    // Look for the field name in the parts array
                    for (let i = 0; i < parts.length - 1; i++) {
                        let fieldMatch = false;
                        let matchedEndIndex = i;
                        
                        // Try exact single-part match
                        if (parts[i] === normalizedFieldName) {
                            fieldMatch = true;
                        } else {
                            // Try combining parts to match field name
                            let combinedPart = parts[i];
                            for (let j = i + 1; j < parts.length && combinedPart.length < normalizedFieldName.length; j++) {
                                combinedPart += '_' + parts[j];
                                if (combinedPart === normalizedFieldName) {
                                    fieldMatch = true;
                                    matchedEndIndex = j;
                                    break;
                                }
                                if (combinedPart.length > normalizedFieldName.length) {
                                    break;
                                }
                            }
                        }
                        
                        if (fieldMatch && matchedEndIndex + 1 < parts.length) {
                            const potentialId = parts[matchedEndIndex + 1];
                            if (/^[a-f0-9]{24}$/i.test(potentialId)) {
                                try {
                                    return new mongoose.Types.ObjectId(potentialId);
                                } catch (e) {
                                    return null;
                                }
                            }
                        }
                    }
                    return null;
                };
                
                const casted = Array.isArray(value) 
                    ? value.map(v => {
                        try {
                            return new mongoose.Types.ObjectId(v);
                        } catch (e) {
                            // Try extracting from compound groupId
                            const extracted = extractObjectIdFromGroupId(v, field);
                            return extracted || v;
                        }
                    })
                    : (() => {
                        try {
                            return new mongoose.Types.ObjectId(value);
                        } catch (e) {
                            // Try extracting from compound groupId
                            const extracted = extractObjectIdFromGroupId(value, field);
                            if (extracted) {
                                logger.debug(`Extracted ObjectId from compound groupId in _castValue: ${field} = ${extracted}`);
                                return extracted;
                            }
                            throw e; // Re-throw if extraction also fails
                        }
                    })();
                
                logger.debug(`Successfully casted ${field} to ObjectId`);
                return casted;
            } catch (error) {
                logger.error(`Failed to cast ${field} to ObjectId:`, error.message);
                return value;
            }
        }
        if (instance === 'Date') {
            if (Array.isArray(value)) {
                return value.map(v => this._parseDateValue(v));
            }
            return this._parseDateValue(value);
        }
        if (instance === 'Number') {
            const toNum = (v) => (typeof v === 'number' && !isNaN(v) ? v : (parseFloat(v) || 0));
            if (Array.isArray(value)) {
                return value.map(toNum);
            }
            return toNum(value);
        }
        return value;
    }

    _parseDateValue(value) {
        if (typeof value !== 'string') return new Date(value);

        const now = new Date();
        const lowerVal = value.toLowerCase();

        // Use UTC for "today" and "yesterday" to ensure consistency
        const startOfTodayUTC = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            0, 0, 0, 0
        ));

        if (lowerVal === 'today') {
            return startOfTodayUTC;
        }
        if (lowerVal === 'yesterday') {
            const yesterday = new Date(startOfTodayUTC);
            yesterday.setUTCDate(yesterday.getUTCDate() - 1);
            return yesterday;
        }

        // Parse date strings and normalize to UTC midnight
        // Handle various date formats consistently
        const parsed = new Date(value);
        if (isNaN(parsed.getTime())) {
            logger.warn(`Failed to parse date value: ${value}`);
            return new Date(value); // Return as-is, let MongoDB handle it
        }

        // If the date string is in ISO format (YYYY-MM-DD), it's already UTC midnight
        // If it's a different format, normalize to UTC midnight of that date
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            // ISO date format - already UTC midnight
            return parsed;
        }

        // For other formats, extract the date parts and create UTC date
        // This ensures "Jan 15, 2024" is treated as 2024-01-15 00:00:00 UTC
        return new Date(Date.UTC(
            parsed.getFullYear(),
            parsed.getMonth(),
            parsed.getDate(),
            0, 0, 0, 0
        ));
    }

    _buildGroupStage(groupBy, schema, lookups, includeIds = false, modelName = null) {
        const group = { _id: {} };

        groupBy.forEach(field => {
            // Parse granularity from field name (e.g., "lead_date:month" -> { baseField: "lead_date", granularity: "month" })
            const { baseField, granularity } = this._parseFieldGranularity(field);
            
            // Map field alias to actual field name
            const actualField = modelName ? this._mapFieldName(baseField, modelName) : baseField;
            
            // Use the original field (with granularity) as the key for consistency
            const fieldKey = field.includes('.') ? field.replace(/\./g, '_') : field;
            
            if (baseField.includes('.')) {
                // Handle grouping by related field (e.g., 'user_id.name' or 'lead_id.lead_date:month')
                const parts = baseField.split('.');
                const localField = parts[0];
                // Map the local field name too
                const actualLocalField = modelName ? this._mapFieldName(localField, modelName) : localField;
                const foreignField = parts.slice(1).join('.');

                // Ensure lookup exists (use actual field name)
                this._addLookup(actualLocalField, schema, lookups);

                // Check if the related field is a date type and has granularity
                // We need to get the related model's schema to check
                const schemaPath = schema.path(actualLocalField);
                const refModelName = schemaPath && schemaPath.options && schemaPath.options.ref;
                
                if (granularity && refModelName) {
                    // Apply date grouping with granularity to related field
                    const dateFormat = this._getDateFormat(granularity);
                    const safeKey = fieldKey.replace(/:/g, '_'); // Replace : with _ for safe MongoDB key
                    group._id[safeKey] = {
                        $dateToString: {
                            format: dateFormat,
                            date: `$${actualLocalField}_joined.${foreignField}`,
                            onNull: null
                        }
                    };
                } else {
                    // Use the joined field name without date formatting
                    const safeKey = fieldKey.replace(/:/g, '_');
                    group._id[safeKey] = `$${actualLocalField}_joined.${foreignField}`;
                }
            } else if (baseField === 'transferred_lead') {
                group._id['transferred_lead'] = '$is_transferred';
            } else {
                // Check if field is a date type - format appropriately (use actual field name)
                if (this._isDateField(actualField, schema)) {
                    // Determine date format based on granularity or field name
                    let dateFormat;
                    if (granularity) {
                        // Use specified granularity (day, week, month, year)
                        dateFormat = this._getDateFormat(granularity);
                    } else if (actualField.endsWith('_month')) {
                        // Legacy: fields ending with _month use month-level grouping
                        dateFormat = this._getDateFormat('month');
                    } else {
                        // Default to day-level grouping
                        dateFormat = this._getDateFormat('day');
                    }
                    
                    const safeKey = fieldKey.replace(/:/g, '_'); // Replace : with _ for safe MongoDB key
                    group._id[safeKey] = {
                        $dateToString: {
                            format: dateFormat,
                            date: `$${actualField}`,
                            onNull: null
                        }
                    };
                } else {
                    // Standard field - use actual field name in query, but keep original in _id key
                    const safeKey = fieldKey.replace(/:/g, '_');
                    group._id[safeKey] = `$${actualField}`;
                }
            }
        });

        // Add count
        group.count = { $sum: 1 };
        
        // Add record IDs if requested (for drill-down / expand group)
        if (includeIds) {
            group._recordIds = { $push: '$_id' };
        }

        return { $group: group };
    }

    _buildGroupProjection(groupBy, includeIds = false) {
        // For multilevel grouping, preserve all _id fields
        if (groupBy.length > 1) {
            const projection = {
                $project: {
                    _id: 0,
                    count: 1
                }
            };
            
            // Preserve all grouping fields from _id
            groupBy.forEach((field, index) => {
                // Convert dots and colons to underscores for safe MongoDB key
                const idKey = field.replace(/\./g, '_').replace(/:/g, '_');
                projection.$project[`level${index}`] = `$_id.${idKey}`;
                // Store original field with granularity for frontend reference
                projection.$project[`field${index}`] = field;
                // Parse and store granularity info separately
                const { baseField, granularity } = this._parseFieldGranularity(field);
                if (granularity) {
                    projection.$project[`granularity${index}`] = granularity;
                }
            });

            // Include recordIds if requested
            if (includeIds) {
                projection.$project._recordIds = 1;
            }

            return projection;
        }
        
        // Single level grouping - original logic
        const firstField = groupBy[0];
        // Convert dots and colons to underscores for safe MongoDB key
        const idKey = firstField.replace(/\./g, '_').replace(/:/g, '_');
        
        // Parse granularity info
        const { baseField, granularity } = this._parseFieldGranularity(firstField);
        
        const projection = {
            $project: {
                _id: 0,
                groupId: `$_id.${idKey}`,
                fieldName: firstField,           // Original field with granularity (e.g., "lead_date:month")
                baseFieldName: baseField,        // Base field without granularity (e.g., "lead_date")
                granularity: granularity || 'day', // Granularity level
                count: 1,
                // Preserve sortOrder, statusName, and statusNameLower if they exist (for status_id grouping)
                sortOrder: 1,
                statusName: 1,
                statusNameLower: 1
            }
        };

        // Include recordIds if requested
        if (includeIds) {
            projection.$project._recordIds = 1;
        }

        return projection;
    }

    /**
     * Build sort stage for grouped results based on groupBy field
     * @param {Array} groupBy - Fields to group by
     * @param {string} modelName - Model name
     * @returns {Object} - MongoDB sort stage
     * @private
     */
    _buildGroupSortStage(groupBy, modelName) {
        const firstField = groupBy[0];
        
        // Parse granularity from field name (e.g., "lead_date:month" -> baseField: "lead_date")
        const { baseField } = this._parseFieldGranularity(firstField);
        
        // For date field grouping (lead_date, createdAt, updatedAt, etc.), sort by date (most recent first)
        // Check both direct fields and related fields (e.g., lead_id.lead_date or lead_id.lead_date:month)
        const dateFieldName = baseField.includes('.') ? baseField.split('.').pop() : baseField;
        if (dateFieldName === 'lead_date' || dateFieldName === 'createdAt' || dateFieldName === 'updatedAt' || 
            dateFieldName === 'assigned_date' || dateFieldName.endsWith('_at') || dateFieldName.endsWith('_date')) {
            return { $sort: { groupId: -1 } };
        }
        
        // For status_id / current_status grouping, sort by custom order
        // Handle both direct status_id and related fields like lead_id.status_id
        const isStatusField = baseField === 'status_id' || baseField.endsWith('.status_id') || baseField === 'status'
            || (baseField === 'current_status' && modelName === 'ClosedLead');
        if (isStatusField && (modelName === 'Lead' || modelName === 'Offer' || modelName === 'ClosedLead')) {
            return { $sort: { sortOrder: 1, count: -1 } }; // Sort by custom order, then by count
        }
        
        // Default: sort by count (descending)
        return { $sort: { count: -1 } };
    }

    /**
     * Apply sorting at a specific level in the nested group structure.
     * When sortBy matches a groupBy field at level N, only that level is re-sorted;
     * all other levels keep their default order (count desc / date desc / status order).
     * @private
     */
    _applySortAtLevel(groups, targetLevel, sortDirection, groupBy, currentLevel = 0) {
        if (currentLevel === targetLevel) {
            const multiplier = sortDirection === 'asc' ? 1 : -1;

            groups.sort((a, b) => {
                if (a.groupName === 'None' && b.groupName !== 'None') return 1;
                if (a.groupName !== 'None' && b.groupName === 'None') return -1;
                if (a.groupName === 'None' && b.groupName === 'None') return 0;

                const nameA = (a.groupName || '').toString().toLowerCase();
                const nameB = (b.groupName || '').toString().toLowerCase();

                const numA = parseFloat(nameA);
                const numB = parseFloat(nameB);
                if (!isNaN(numA) && !isNaN(numB)) {
                    return multiplier * (numA - numB);
                }

                if (nameA < nameB) return -1 * multiplier;
                if (nameA > nameB) return 1 * multiplier;
                return 0;
            });
        } else if (currentLevel < targetLevel) {
            for (const group of groups) {
                if (group.subGroups && Array.isArray(group.subGroups)) {
                    this._applySortAtLevel(group.subGroups, targetLevel, sortDirection, groupBy, currentLevel + 1);
                }
            }
        }
    }

    /**
     * Check if a field is a Date type in the schema
     * @private
     */
    _isDateField(field, schema) {
        const schemaPath = schema.path(field);
        if (!schemaPath) return false;
        return schemaPath.instance === 'Date';
    }

    /**
     * Check if a field is a reference field (ObjectId with ref)
     * @private
     */
    _isReferenceField(field, schema) {
        const schemaPath = schema.path(field);
        if (!schemaPath) return false;
        return !!(schemaPath.options && schemaPath.options.ref);
    }

    /**
     * Check if a field is a special reference field (status_id, stage_id) that references Settings
     * but doesn't have a ref in the schema
     * @private
     */
    _isSpecialReferenceField(field) {
        const specialFields = ['status_id', 'stage_id', 'current_status'];
        return specialFields.includes(field);
    }

    /**
     * Populate group names for reference fields
     * @private
     */
    async _populateGroupNames(results, field, schema) {
        logger.debug(`Populating group names for field: ${field}`);
        
        // Special handling for status_id, stage_id, and current_status (they reference Settings but don't have ref in schema)
        if (field === 'status_id' || field === 'stage_id' || field === 'current_status') {
            const referenceIds = results
                .map(r => r.groupId)
                .filter(id => id !== null && id !== undefined)
                .map(id => {
                    // Handle if already ObjectId or string
                    if (id instanceof mongoose.Types.ObjectId) {
                        return id;
                    }
                    try {
                        return new mongoose.Types.ObjectId(id);
                    } catch {
                        return null;
                    }
                })
                .filter(id => id !== null);

            if (referenceIds.length === 0) {
                results.forEach(result => {
                    result.groupName = result.groupId === null || result.groupId === undefined ? 'None' : 'Unknown';
                });
                return;
            }

            await this._populateStatusStageNames(results, field, referenceIds);
            return;
        }

        const schemaPath = schema.path(field);
        logger.debug(`Schema path for ${field}:`, {
            exists: !!schemaPath,
            hasOptions: !!(schemaPath && schemaPath.options),
            hasRef: !!(schemaPath && schemaPath.options && schemaPath.options.ref),
            ref: schemaPath && schemaPath.options ? schemaPath.options.ref : null
        });
        
        if (!schemaPath || !schemaPath.options || !schemaPath.options.ref) {
            // If not a reference field, set default groupName
            logger.warn(`Field ${field} is not a reference field, using groupId as groupName`);
            results.forEach(result => {
                result.groupName = result.groupId === null || result.groupId === undefined ? 'None' : result.groupId.toString();
            });
            return;
        }

        const refCollection = schemaPath.options.ref;
        logger.debug(`Reference collection for ${field}: ${refCollection}`);
        
        const referenceIds = results
            .map(r => r.groupId)
            .filter(id => id !== null && id !== undefined)
            .map(id => {
                // Handle if already ObjectId or string
                if (id instanceof mongoose.Types.ObjectId) {
                    return id;
                }
                try {
                    return new mongoose.Types.ObjectId(id);
                } catch {
                    return null;
                }
            })
            .filter(id => id !== null);

        logger.debug(`Found ${referenceIds.length} reference IDs to populate for field ${field}`);

        if (referenceIds.length === 0) {
            // Set groupName to 'None' for all results
            results.forEach(result => {
                result.groupName = result.groupId === null || result.groupId === undefined ? 'None' : 'Unknown';
            });
            return;
        }

        try {
            // Special handling for status_id and stage_id (they reference Settings)
            if (field === 'status_id' || field === 'stage_id') {
                await this._populateStatusStageNames(results, field, referenceIds);
            } else {
                // For other reference fields, fetch directly from the referenced collection
                const RefModel = mongoose.models[refCollection] || this.getModel(refCollection);
                if (!RefModel) {
                    logger.warn(`Model ${refCollection} not found for field ${field}. Available models: ${Object.keys(mongoose.models).join(', ')}`);
                    results.forEach(result => {
                        result.groupName = result.groupId === null || result.groupId === undefined ? 'None' : 'Unknown';
                    });
                    return;
                }

                logger.debug(`Fetching ${referenceIds.length} documents from ${refCollection} collection`);
                
                // Select appropriate fields based on collection type
                let selectFields = '_id';
                if (refCollection === 'User') {
                    selectFields = '_id login';
                } else if (refCollection === 'Team' || refCollection === 'Source' || refCollection === 'Bank') {
                    selectFields = '_id name';
                } else if (refCollection === 'Lead') {
                    selectFields = '_id contact_name';
                } else {
                    selectFields = '_id name login';
                }
                
                const refDocs = await RefModel.find({ _id: { $in: referenceIds } })
                    .select(selectFields)
                    .lean();

                logger.debug(`Fetched ${refDocs.length} documents from ${refCollection}`);

                const nameMap = new Map();
                refDocs.forEach(doc => {
                    const id = doc._id.toString();
                    let name = 'Unknown';
                    
                    if (refCollection === 'User') {
                        // User model only has 'login' field, not first_name/last_name
                        name = doc.login || 'Unknown User';
                    } else if (refCollection === 'Team') {
                        name = doc.name || 'Unknown Project';
                    } else if (refCollection === 'Source') {
                        name = doc.name || 'Unknown Source';
                    } else if (refCollection === 'Bank') {
                        name = doc.name || 'Unknown Bank';
                    } else if (refCollection === 'Lead') {
                        name = doc.contact_name || 'Unknown Lead';
                    } else {
                        name = doc.name || doc.login || 'Unknown';
                    }
                    
                    nameMap.set(id, name);
                });

                logger.debug(`Created name map with ${nameMap.size} entries`);

                // Map groupId to groupName
                results.forEach(result => {
                    if (result.groupId === null || result.groupId === undefined) {
                        result.groupName = 'None';
                    } else {
                        const idStr = result.groupId.toString();
                        const name = nameMap.get(idStr);
                        result.groupName = name || 'Unknown';
                        if (!name) {
                            logger.warn(`No name found for ${field} with ID: ${idStr}`);
                        }
                    }
                });
            }
        } catch (error) {
            logger.error(`Error populating group names for field ${field}:`, error);
            results.forEach(result => {
                result.groupName = result.groupId === null || result.groupId === undefined ? 'None' : 'Unknown';
            });
        }
    }

    /**
     * Populate status/stage names from Settings collection
     * @private
     */
    async _populateStatusStageNames(results, field, referenceIds) {
        try {
            logger.info(`Populating ${field} names for ${referenceIds.length} IDs`);
            let Settings = mongoose.models['Settings'] || this.getModel('Settings');
            if (!Settings) {
                logger.warn('Settings model not found in mongoose.models, trying to load directly');
                // Try to load Settings model from different possible paths
                try {
                    const possiblePaths = [
                        path.resolve(__dirname, '../../../../models/mongo/settings.js'),
                        path.resolve(__dirname, '../../../models/mongo/settings.js'),
                        path.resolve(__dirname, '../../backend/models/mongo/settings.js'),
                    ];
                    
                    for (const settingsPath of possiblePaths) {
                        try {
                            if (fs.existsSync(settingsPath)) {
                                const { Settings: SettingsModel } = require(settingsPath);
                                if (SettingsModel) {
                                    Settings = SettingsModel;
                                    logger.info(`Settings model loaded from ${settingsPath}`);
                                    break;
                                }
                            }
                        } catch (e) {
                            // Continue to next path
                        }
                    }
                } catch (loadError) {
                    logger.error('Failed to load Settings model:', loadError);
                }
                
                if (!Settings) {
                    logger.error('Settings model could not be loaded from any path');
                    results.forEach(result => {
                        result.groupName = result.groupId === null || result.groupId === undefined ? 'None' : 'Unknown';
                    });
                    return;
                }
            }

            await this._fetchStatusStageNames(Settings, results, field, referenceIds);
        } catch (error) {
            logger.error(`Error populating status/stage names:`, error);
            results.forEach(result => {
                result.groupName = result.groupId === null || result.groupId === undefined ? 'None' : 'Unknown';
            });
        }
    }

    async _fetchStatusStageNames(Settings, results, field, referenceIds) {
        const nameMap = new Map();

        if (field === 'stage_id') {
            // For stage_id, fetch directly from Settings with type='stage'
            const stages = await Settings.find({ 
                _id: { $in: referenceIds },
                type: 'stage'
            })
                .select('_id name')
                .lean();
            
            logger.info(`Found ${stages.length} stages for ${referenceIds.length} IDs`);
            stages.forEach(stage => {
                nameMap.set(stage._id.toString(), stage.name || 'Unknown');
            });
        } else if (field === 'status_id' || field === 'current_status') {
            // For status_id / current_status, need to unwind the nested statuses array
            logger.info(`Searching for statuses with IDs: ${referenceIds.map(id => id.toString()).join(', ')}`);
            const statusResults = await Settings.aggregate([
                { $match: { type: 'stage' } },
                { $unwind: { path: '$info.statuses', preserveNullAndEmptyArrays: false } },
                { $match: {
                    $or: [
                        { 'info.statuses._id': { $in: referenceIds } },
                        { 'info.statuses.id': { $in: referenceIds.map(id => id.toString()) } }
                    ]
                }},
                { $project: { 
                    statusId: { 
                        $cond: {
                            if: { $ne: ['$info.statuses._id', null] },
                            then: '$info.statuses._id',
                            else: { $toObjectId: '$info.statuses.id' }
                        }
                    },
                    statusName: '$info.statuses.name'
                }}
            ]);

            logger.info(`Found ${statusResults.length} statuses from aggregation`);
            statusResults.forEach(status => {
                const idStr = status.statusId ? status.statusId.toString() : null;
                if (idStr) {
                    nameMap.set(idStr, status.statusName || 'Unknown');
                }
            });
        }

        // Map groupId to groupName
        results.forEach(result => {
            if (result.groupId === null || result.groupId === undefined) {
                result.groupName = 'None';
            } else {
                const idStr = result.groupId.toString();
                const name = nameMap.get(idStr);
                if (name) {
                    result.groupName = name;
                } else {
                    logger.warn(`No name found for ${field} with ID: ${idStr}`);
                    result.groupName = 'Unknown';
                }
            }
        });
    }

    /**
     * Transform flat multilevel aggregation results into nested structure with subGroups
     * @private
     */
    async _transformMultilevelResults(results, groupBy, schema, modelName = null) {
        logger.info(`Transforming ${results.length} multilevel results for fields: ${groupBy.join(', ')}`);
        
        // First, populate groupName for all levels
        for (let level = 0; level < groupBy.length; level++) {
            const field = groupBy[level];
            const levelKey = `level${level}`;
            
            // Parse granularity from field name (e.g., "lead_date:month" -> { baseField: "lead_date", granularity: "month" })
            const { baseField, granularity } = this._parseFieldGranularity(field);
            
            // Get unique IDs for this level (handle both ObjectId and string formats)
            const levelIds = [...new Set(
                results
                    .map(r => r[levelKey])
                    .filter(id => id !== null && id !== undefined)
                    .map(id => {
                        // Convert to ObjectId if it's a string
                        if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
                            try {
                                return new mongoose.Types.ObjectId(id);
                            } catch {
                                return id;
                            }
                        }
                        return id;
                    })
            )];
            
            logger.info(`Level ${level} (${field}): Found ${levelIds.length} unique IDs (granularity: ${granularity || 'none'})`);
            
            // Check if this is a related field (e.g., 'lead_id.status_id' or 'lead_id.lead_date:month')
            let checkSchema = schema;
            let checkField = baseField;
            let actualField = baseField;
            
            if (baseField.includes('.')) {
                // Related field - need to get the related model's schema
                const parts = baseField.split('.');
                const localField = parts[0]; // e.g., 'lead_id'
                const foreignField = parts.slice(1).join('.'); // e.g., 'status_id' or 'lead_date'
                
                // Map the local field name (in case of aliases)
                const actualLocalField = modelName ? this._mapFieldName(localField, modelName) : localField;
                actualField = `${actualLocalField}.${foreignField}`;
                
                logger.debug(`Related field at level ${level}: ${field} -> ${actualField}`);
                
                // Get the reference model name from the schema
                const schemaPath = schema.path(actualLocalField);
                const refModelName = schemaPath && schemaPath.options && schemaPath.options.ref;
                
                if (refModelName) {
                    logger.debug(`Related field ${actualLocalField} references ${refModelName}`);
                    
                    // Get the related model's schema
                    const RelatedModel = this.getModel(refModelName);
                    if (RelatedModel) {
                        checkSchema = RelatedModel.schema;
                        checkField = foreignField;
                        logger.debug(`Using ${refModelName} schema for field type checks on ${checkField}`);
                    } else {
                        logger.warn(`Related model ${refModelName} not found for ${field}`);
                    }
                } else {
                    logger.warn(`No reference found for ${actualLocalField} in ${field}`);
                }
            } else {
                // Direct field - map field alias to actual field name
                actualField = modelName ? this._mapFieldName(field, modelName) : field;
                checkField = actualField;
            }
            
            // Check field type on the appropriate schema
            const isDateField = this._isDateField(checkField, checkSchema);
            const isReferenceField = this._isReferenceField(checkField, checkSchema);
            const isSpecialReferenceField = this._isSpecialReferenceField(checkField);
            
            logger.debug(`Level ${level} field type for ${checkField}:`, {
                isDateField,
                isReferenceField,
                isSpecialReferenceField
            });
            
            if (baseField === 'transferred_lead') {
                results.forEach(result => {
                    const value = result[levelKey];
                    result[`groupName${level}`] = value === true ? 'Transferred' : 'Fresh';
                });
            } else if (isDateField || granularity) {
                // For date fields (or fields with granularity), use the formatted date string as groupName
                // IMPORTANT: For lead_date (and other date fields), use level 0 in groupId generation
                // to match single-level grouping behavior. This ensures the same date string
                // always generates the same groupId, regardless of grouping level.
                // The nested structure building will handle separation by parent groups correctly
                // since each parent group has its own subGroupsMap.
                logger.info(`Processing date field ${field} at level ${level} with ${results.length} results (granularity: ${granularity || 'day'})`);
                results.forEach(result => {
                    const dateValue = result[levelKey];
                    if (dateValue) {
                        // Format groupName for human-readable display
                        result[`groupName${level}`] = this._formatDateGroupName(dateValue, granularity);
                        // Keep groupId as a parseable string format: fieldName_dateValue
                        // This allows _parseDateGroupValue to extract and parse the date for filtering
                        result[levelKey] = `${field}_${dateValue}`;
                    } else {
                        result[`groupName${level}`] = 'None';
                        // For null dates, use hash since we don't need to parse these back
                        result[levelKey] = this._generateNoneGroupId(`${field}_none`, level);
                    }
                });
                logger.info(`Processed date field ${field}: ${results.filter(r => r[levelKey]).length} with dates, ${results.filter(r => !r[levelKey] || r[`groupName${level}`] === 'None').length} with null dates`);
            } else if (isReferenceField || isSpecialReferenceField) {
                // For reference fields, populate names (use the checkField which is correctly resolved)
                await this._populateMultilevelGroupNames(results, checkField, levelKey, level, checkSchema);
            } else {
                // For other fields, use the value as groupName
                results.forEach(result => {
                    const value = result[levelKey];
                    if (value === null || value === undefined) {
                        result[`groupName${level}`] = 'None';
                        // Generate deterministic ID for null values
                        result[levelKey] = this._generateNoneGroupId(`${field}_none`, level);
                    } else {
                        result[`groupName${level}`] = value.toString();
                        // Ensure value is ObjectId if it's a valid ObjectId string
                        if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
                            try {
                                result[levelKey] = new mongoose.Types.ObjectId(value);
                            } catch {
                                // Keep as string if conversion fails
                            }
                        }
                    }
                });
            }
        }
        
        // Now build nested structure
        const nestedResults = this._buildNestedStructure(results, groupBy);
        logger.info(`Built nested structure with ${nestedResults.length} top-level groups`);
        return nestedResults;
    }

    /**
     * Populate group names for a specific level in multilevel grouping
     * @private
     */
    async _populateMultilevelGroupNames(results, field, levelKey, level, schema) {
        const referenceIds = results
            .map(r => r[levelKey])
            .filter(id => id !== null && id !== undefined)
            .map(id => {
                if (id instanceof mongoose.Types.ObjectId) {
                    return id;
                }
                try {
                    return new mongoose.Types.ObjectId(id);
                } catch {
                    return null;
                }
            })
            .filter(id => id !== null);

        if (referenceIds.length === 0) {
            results.forEach(result => {
                result[`groupName${level}`] = result[levelKey] === null || result[levelKey] === undefined ? 'None' : 'Unknown';
            });
            return;
        }

        // Special handling for status_id, stage_id, and current_status
        if (field === 'status_id' || field === 'stage_id' || field === 'current_status') {
            const nameMap = await this._fetchStatusStageNameMap(field === 'current_status' ? 'status_id' : field, referenceIds);
            results.forEach(result => {
                const id = result[levelKey];
                if (id === null || id === undefined) {
                    result[`groupName${level}`] = 'None';
                } else {
                    const idStr = id.toString();
                    result[`groupName${level}`] = nameMap.get(idStr) || 'Unknown';
                }
            });
        } else {
            // For other reference fields
            const schemaPath = schema.path(field);
            if (!schemaPath || !schemaPath.options || !schemaPath.options.ref) {
                results.forEach(result => {
                    result[`groupName${level}`] = result[levelKey] === null || result[levelKey] === undefined ? 'None' : 'Unknown';
                });
                return;
            }

            const refCollection = schemaPath.options.ref;
            const RefModel = mongoose.models[refCollection] || this.getModel(refCollection);
            if (!RefModel) {
                logger.warn(`Model ${refCollection} not found for field ${field}`);
                results.forEach(result => {
                    result[`groupName${level}`] = result[levelKey] === null || result[levelKey] === undefined ? 'None' : 'Unknown';
                });
                return;
            }

            // Select appropriate fields based on collection type
            let selectFields = '_id';
            if (refCollection === 'User') {
                selectFields = '_id login';
            } else if (refCollection === 'Team' || refCollection === 'Source' || refCollection === 'Bank') {
                selectFields = '_id name';
            } else if (refCollection === 'Lead') {
                selectFields = '_id contact_name';
            } else {
                selectFields = '_id name login';
            }
            
            const refDocs = await RefModel.find({ _id: { $in: referenceIds } })
                .select(selectFields)
                .lean();

            const nameMap = new Map();
            refDocs.forEach(doc => {
                const id = doc._id.toString();
                let name = 'Unknown';
                
                if (refCollection === 'User') {
                    // User model only has 'login' field, not first_name/last_name
                    name = doc.login || 'Unknown User';
                } else if (refCollection === 'Team') {
                    name = doc.name || 'Unknown Project';
                } else if (refCollection === 'Source') {
                    name = doc.name || 'Unknown Source';
                } else if (refCollection === 'Bank') {
                    name = doc.name || 'Unknown Bank';
                } else if (refCollection === 'Lead') {
                    name = doc.contact_name || 'Unknown Lead';
                } else {
                    name = doc.name || doc.login || 'Unknown';
                }
                
                nameMap.set(id, name);
            });

            results.forEach(result => {
                const id = result[levelKey];
                if (id === null || id === undefined) {
                    result[`groupName${level}`] = 'None';
                } else {
                    const idStr = id.toString();
                    result[`groupName${level}`] = nameMap.get(idStr) || 'Unknown';
                }
            });
        }
    }

    /**
     * Fetch status/stage name map for multilevel grouping
     * @private
     */
    async _fetchStatusStageNameMap(field, referenceIds) {
        const nameMap = new Map();
        let Settings = mongoose.models['Settings'] || this.getModel('Settings');
        
        if (!Settings) {
            // Try to load Settings model
            const possiblePaths = [
                path.resolve(__dirname, '../../../../models/mongo/settings.js'),
                path.resolve(__dirname, '../../../models/mongo/settings.js'),
                path.resolve(__dirname, '../../backend/models/mongo/settings.js'),
            ];
            
            for (const settingsPath of possiblePaths) {
                try {
                    if (fs.existsSync(settingsPath)) {
                        const { Settings: SettingsModel } = require(settingsPath);
                        if (SettingsModel) {
                            Settings = SettingsModel;
                            break;
                        }
                    }
                } catch (e) {
                    // Continue to next path
                }
            }
        }

        if (!Settings) {
            return nameMap;
        }

        if (field === 'stage_id') {
            const stages = await Settings.find({ 
                _id: { $in: referenceIds },
                type: 'stage'
            })
                .select('_id name')
                .lean();
            
            stages.forEach(stage => {
                nameMap.set(stage._id.toString(), stage.name || 'Unknown');
            });
        } else if (field === 'status_id') {
            const statusResults = await Settings.aggregate([
                { $match: { type: 'stage' } },
                { $unwind: { path: '$info.statuses', preserveNullAndEmptyArrays: false } },
                { $match: {
                    $or: [
                        { 'info.statuses._id': { $in: referenceIds } },
                        { 'info.statuses.id': { $in: referenceIds.map(id => id.toString()) } }
                    ]
                }},
                { $project: { 
                    statusId: { 
                        $cond: {
                            if: { $ne: ['$info.statuses._id', null] },
                            then: '$info.statuses._id',
                            else: { $toObjectId: '$info.statuses.id' }
                        }
                    },
                    statusName: '$info.statuses.name'
                }}
            ]);

            statusResults.forEach(status => {
                if (status.statusId) {
                    const idStr = status.statusId.toString();
                    nameMap.set(idStr, status.statusName || 'Unknown');
                }
            });
        }

        return nameMap;
    }

    /**
     * Build nested structure from flat multilevel results
     * Each group gets a `domain` property containing the filter conditions needed to fetch its leads
     * @private
     */
    _buildNestedStructure(results, groupBy) {
        if (groupBy.length === 0) return [];
        
        // Build a tree structure
        const rootMap = new Map();
        
        // Helper to build domain filter for a group value
        const buildFilterCondition = (fieldName, groupId, groupName) => {
            // For date fields with granularity (e.g., lead_date:day, lead_date:month)
            if (fieldName.includes(':')) {
                return [fieldName, '=', groupName];
            }
            // For ObjectId fields (like status_id), use the ID
            if (groupId && mongoose.Types.ObjectId.isValid(groupId.toString())) {
                return [fieldName, '=', groupId.toString()];
            }
            // For other fields, use the groupName
            return [fieldName, '=', groupName];
        };
        
        results.forEach(result => {
            let currentMap = rootMap;
            const count = result.count || 0;
            
            // Track parent filters as we traverse levels
            const parentFilters = [];
            
            // Navigate/create tree structure
            for (let level = 0; level < groupBy.length; level++) {
                const levelKey = `level${level}`;
                const groupNameKey = `groupName${level}`;
                const fieldKey = `field${level}`;
                
                let groupId = result[levelKey];
                const groupName = result[groupNameKey] || 'None';
                const fieldName = result[fieldKey] || groupBy[level];
                
                // Handle null/undefined groupId - generate deterministic ID
                if (groupId === null || groupId === undefined) {
                    groupId = this._generateNoneGroupId(`${fieldName}_none`, level);
                }
                
                // Create key for this level - use string representation
                // Note: Each parent group has its own subGroupsMap, so even if the same groupId
                // appears in different parent groups, they will be in separate maps and thus separate groups
                const key = groupId instanceof mongoose.Types.ObjectId 
                    ? groupId.toString() 
                    : (groupId ? groupId.toString() : `null_${fieldName}_${level}`);
                
                // Build filter condition for this level
                const currentFilter = buildFilterCondition(fieldName, groupId, groupName);
                
                if (!currentMap.has(key)) {
                    // Build domain: parent filters + current filter
                    const domain = [...parentFilters, currentFilter];
                    
                    const group = {
                        groupId: groupId,
                        groupName: groupName,
                        fieldName: fieldName,
                        count: 0,
                        domain: domain,
                        subGroups: level < groupBy.length - 1 ? [] : undefined
                    };
                    currentMap.set(key, group);
                }
                
                const group = currentMap.get(key);
                
                // Add count to this level (all levels get the count from the leaf)
                group.count += count;
                
                // Add current filter to parent filters for next level
                parentFilters.push(currentFilter);
                
                // If not the last level, navigate to subGroups
                if (level < groupBy.length - 1) {
                    // Initialize subGroups map if needed
                    if (!group.subGroupsMap) {
                        group.subGroupsMap = new Map();
                    }
                    currentMap = group.subGroupsMap;
                }
            }
        });
        
        // Helper function to get sort order for status names (case-insensitive)
        const getStatusSortOrder = (groupName) => {
            const name = (groupName || '').toLowerCase();
            const statusOrder = {
                'new': 1, 'ne1': 2, 'ne2': 3, 'ne3': 4, 'ne4': 5,
                'termin': 6, 'angebot': 7, 'contract': 8, 'confirmation': 9,
                'payment': 10, 'netto1': 11, 'netto2': 12, 'lost': 13, 'out': 14
            };
            return statusOrder[name] || 999;
        };
        
        // Helper function to determine if a field is a date field
        const isDateField = (fieldName) => {
            const field = fieldName.includes('.') ? fieldName.split('.').pop() : fieldName;
            return field === 'lead_date' || field === 'createdAt' || field === 'updatedAt' ||
                   field.endsWith('_at') || field.endsWith('_date');
        };
        
        // Helper function to determine if a field is a status field
        const isStatusField = (fieldName) => {
            return fieldName === 'status_id' || fieldName.endsWith('.status_id') || fieldName === 'status';
        };
        
        // Helper function to sort groups based on field type
        const sortGroups = (groups, fieldName) => {
            if (isStatusField(fieldName)) {
                // Sort by custom status order
                return groups.sort((a, b) => {
                    const orderA = getStatusSortOrder(a.groupName);
                    const orderB = getStatusSortOrder(b.groupName);
                    if (orderA !== orderB) return orderA - orderB;
                    return (b.count || 0) - (a.count || 0); // Secondary sort by count
                });
            } else if (isDateField(fieldName)) {
                // Sort by date descending (most recent first)
                return groups.sort((a, b) => {
                    const dateA = a.groupName || '';
                    const dateB = b.groupName || '';
                    return dateB.localeCompare(dateA); // Descending order for dates
                });
            } else {
                // Default: sort by count descending
                return groups.sort((a, b) => (b.count || 0) - (a.count || 0));
            }
        };
        
        // Convert maps to arrays recursively, sort, and add pagination meta
        const convertToArray = (map, level = 0) => {
            const groups = Array.from(map.values());
            const fieldName = groupBy[level] || '';
            
            // Sort groups based on field type
            const sortedGroups = sortGroups(groups, fieldName);
            
            sortedGroups.forEach(group => {
                if (group.subGroupsMap) {
                    // Recursively convert and sort subGroups
                    group.subGroups = convertToArray(group.subGroupsMap, level + 1);
                    delete group.subGroupsMap;
                    
                    // Add pagination meta to each group that has subGroups
                    const totalSubGroups = group.subGroups.length;
                    group.meta = {
                        total: totalSubGroups,
                        totalGroups: totalSubGroups,
                        page: 1,
                        limit: totalSubGroups, // Show all by default, can be paginated later
                        pages: 1,
                        offset: 0
                    };
                }
            });
            return sortedGroups;
        };
        
        return convertToArray(rootMap, 0);
    }

    /**
     * Generate a deterministic ObjectId (same as groupHelpers.generateNoneGroupId)
     * @param {string} field - The field/seed string
     * @param {number} level - The grouping level (optional, for multilevel grouping)
     * @returns {mongoose.Types.ObjectId} - Deterministic ObjectId
     */
    _generateNoneGroupId(field, level = 0) {
        const seed = level === 0 ? field : `${field}_level_${level}`;
        const hash = crypto.createHash('md5').update(seed).digest('hex');
        const objectIdHex = hash.substring(0, 24);

        try {
            return new mongoose.Types.ObjectId(objectIdHex);
        } catch (error) {
            const fallbackSeed = `${field}_${level}`.padEnd(24, '0').substring(0, 24);
            return new mongoose.Types.ObjectId(fallbackSeed);
        }
    }

    /**
     * Check if a groupId is a "None" groupId (generated for null values)
     * Checks all possible levels (0-10) to support multilevel grouping
     * @param {string|ObjectId} groupId - The groupId to check
     * @param {string} field - The field name
     * @returns {boolean} - True if this is a "None" groupId at any level
     */
    _isNoneGroupId(groupId, field) {
        if (!groupId) return false;
        
        try {
            const groupIdStr = groupId.toString();
            if (!mongoose.Types.ObjectId.isValid(groupIdStr)) return false;
            
            // Check all possible levels (0-10) to support multilevel grouping
            // For multilevel grouping, each level has its own "None" groupId
            for (let level = 0; level <= 10; level++) {
                const expectedNoneId = this._generateNoneGroupId(`${field}_none`, level);
                const expectedNoneIdStr = expectedNoneId.toString();
                
                if (groupIdStr === expectedNoneIdStr) {
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Normalize results to ensure consistent structure across all queries
     * This removes any lookup-added fields and ensures consistent field presence
     * @param {Array} results - Raw aggregation results
     * @param {Object} schema - Mongoose schema for the model
     * @param {Map} lookups - Map of lookups that were added during query
     * @returns {Array} - Normalized results with consistent structure
     */
    _normalizeResults(results, schema, lookups) {
        if (!results || results.length === 0) return results;

        // Get list of fields to remove (lookup-added fields)
        const fieldsToRemove = new Set();
        for (const [key] of lookups) {
            fieldsToRemove.add(`${key}_joined`);
        }

        // If no fields to remove, return as-is
        if (fieldsToRemove.size === 0) return results;

        // Normalize each result
        return results.map(result => {
            // Convert to plain object if it's a Mongoose document
            const normalized = result.toObject ? result.toObject() : { ...result };
            
            // Remove lookup-added fields
            for (const field of fieldsToRemove) {
                delete normalized[field];
            }

            return normalized;
        });
    }

    /**
     * Get consistent field list for a model based on its schema
     * This can be used to ensure all responses have the same fields
     * @param {Object} schema - Mongoose schema
     * @returns {Array} - List of field names
     */
    _getSchemaFields(schema) {
        const fields = [];
        schema.eachPath((path, type) => {
            // Skip internal fields
            if (path.startsWith('_') && path !== '_id') return;
            fields.push(path);
        });
        return fields;
    }
}

module.exports = new QueryEngine();
