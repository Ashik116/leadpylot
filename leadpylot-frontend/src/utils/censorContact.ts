/**
 * Censors an email address or phone number by replacing parts with asterisks
 * @param contact - Email address or phone number to censor
 * @returns Censored string
 */
export function censorContact(contact: string): string {
  if (!contact) return '';

  // Check if it's an email
  if (contact.includes('@')) {
    const [localPart, domain] = contact.split('@');
    const censoredLocal =
      localPart.length <= 2
        ? '*'.repeat(localPart.length)
        : localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1];
    return `${censoredLocal}@${domain}`;
  }

  // Assume it's a phone number - remove any non-digit characters
  const digits = contact.replace(/\D/g, '');
  const length = digits.length;

  // Keep first and last 2 digits visible
  if (length <= 4) {
    return '*'.repeat(length);
  }

  return digits.slice(0, 2) + '*'.repeat(length - 4) + digits.slice(-2);
}
