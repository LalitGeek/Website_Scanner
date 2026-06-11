/**
 * Lightweight Phone Number Formatter
 * Handles basic formatting for major countries and falls back to a clean international format.
 */

export function formatPhoneNumber(phone, countryHint) {
  // Clean the number
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  if (!cleaned.startsWith('+')) {
    // Attempt to add country code based on hint if it's a local number
    const countryCodes = {
      'United States': '1',
      'India': '91',
      'United Kingdom': '44',
      'Germany': '49',
      'France': '33',
      'Canada': '1',
      'Australia': '61'
    };
    const code = countryCodes[countryHint];
    if (code && cleaned.length >= 10) {
      cleaned = '+' + code + cleaned;
    } else if (cleaned.length >= 10) {
      // Guess +1 for 10 digit numbers if no hint
      cleaned = '+' + (cleaned.length === 10 ? '1' : '') + cleaned;
    }
  }

  // Basic formatting rules
  if (cleaned.startsWith('+1')) { // US/Canada
    const match = cleaned.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
    if (match) return `+1 (${match[1]}) ${match[2]}-${match[3]}`;
  } else if (cleaned.startsWith('+91')) { // India
    const match = cleaned.match(/^\+91(\d{5})(\d{5})$/);
    if (match) return `+91 ${match[1]}-${match[2]}`;
  } else if (cleaned.startsWith('+44')) { // UK
    const match = cleaned.match(/^\+44(\d{4})(\d{6})$/);
    if (match) return `+44 ${match[1]} ${match[2]}`;
  }

  // Fallback: Group by 3s and 4s
  if (cleaned.startsWith('+')) {
    return cleaned.replace(/(\+\d{1,3})(\d{3,4})(\d{4,})/, '$1 $2 $3');
  }

  return phone; // Return original if we can't format cleanly
}
