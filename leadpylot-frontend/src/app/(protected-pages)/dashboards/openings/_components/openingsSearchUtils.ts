/**
 * Utility functions for frontend search in OpeningsMultiTable
 */

/**
 * Recursively searches through an object/array to find if any value matches the search term
 * @param obj - The object or array to search through
 * @param searchTerm - The search term (case-insensitive)
 * @returns true if any value matches the search term
 */
function deepSearchValue(obj: any, searchTerm: string): boolean {
  if (obj === null || obj === undefined) {
    return false;
  }

  // Convert search term to lowercase for case-insensitive search
  const lowerSearchTerm = searchTerm.toLowerCase().trim();

  // If search term is empty, return true (show all)
  if (!lowerSearchTerm) {
    return true;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.some((item) => deepSearchValue(item, searchTerm));
  }

  // Handle objects
  if (typeof obj === 'object') {
    return Object.values(obj).some((value) => deepSearchValue(value, searchTerm));
  }

  // Handle primitive values
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    const stringValue = String(obj).toLowerCase();
    return stringValue.includes(lowerSearchTerm);
  }

  return false;
}

/**
 * Searches through opening/confirmation/payment/netto/lost data items
 * Searches in common fields like:
 * - title
 * - lead_id.contact_name, lead_id.email_from, lead_id.phone, lead_id.lead_source_no
 * - project_id.name
 * - bank_id.name
 * - agent_id.login
 * - investment_volume
 * - interest_rate
 * - offerType
 * - status
 * - And any other nested fields
 * 
 * @param items - Array of data items to search through
 * @param searchTerm - The search term
 * @returns Filtered array of items that match the search term
 */
export function searchOpeningsData(items: any[], searchTerm: string): any[] {
  if (!items || items.length === 0) {
    return [];
  }

  // If search term is empty, return all items
  if (!searchTerm || !searchTerm.trim()) {
    return items;
  }

  const lowerSearchTerm = searchTerm.toLowerCase().trim();

  return items.filter((item) => {
    if (!item) return false;

    // Search through all fields recursively
    return deepSearchValue(item, searchTerm);
  });
}

/**
 * Searches through a single data item
 * @param item - The data item to search
 * @param searchTerm - The search term
 * @returns true if the item matches the search term
 */
export function matchesSearchTerm(item: any, searchTerm: string): boolean {
  if (!item) return false;
  if (!searchTerm || !searchTerm.trim()) return true;

  return deepSearchValue(item, searchTerm);
}

