export function convertLangCode(langCode: string) {
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
    const parts = langCode.split('_');
    const language = parts[0];
    const region = parts[1] ? parts[1] : undefined;

    if (region) {
      return `${displayNames.of(language)} (${new Intl.DisplayNames(['en'], { type: 'region' }).of(region)})`;
    } else {
      return displayNames.of(language);
    }
  } catch (error) {
    console.error('Error converting language code:', error);
    return langCode; // Return the original code as a fallback
  }
}
