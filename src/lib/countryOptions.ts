/** Country-only options built from ISO 3166 alpha-2 region names. */
const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const excluded = new Set(['EU', 'UN', 'XA', 'XB', 'ZZ', 'QO']);
export const countries = Array.from(new Set(
  [...alphabet].flatMap(a => [...alphabet].map(b => a + b))
    .filter(code => !excluded.has(code))
    .map(code => ({code, name: displayNames.of(code) || code}))
    .filter(entry => entry.name !== entry.code && !/^Unknown Region$/i.test(entry.name))
    .map(entry => entry.name)
)).sort((a,b) => a.localeCompare(b));

export function countrySuggestions(query: string, max = 8): string[] {
  const needle = query.trim().toLocaleLowerCase();
  const aliases: Record<string, string> = { uk: 'United Kingdom', gb: 'United Kingdom', usa: 'United States', us: 'United States' };
  if (aliases[needle]) return [aliases[needle]];
  if (!needle) return [];
  return countries.filter(name => name.toLocaleLowerCase().startsWith(needle)).slice(0,max);
}
