export type PrivateContactInput = {
  kind?: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  organization?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  preferredContactMethod?: string;
  city?: string;
  region?: string;
  country?: string;
  roles?: string[];
  territories?: string[];
  tags?: string[];
  notes?: string;
};

const list = (value = '') => value.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
const keyName = (value: string) => value.trim().toLowerCase().replace(/[\s-]+/g, '_');

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = []; cell = '';
    } else cell += character;
  }
  if (quoted) throw new Error('The CSV contains an unclosed quoted value');
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export function contactsFromCsv(text: string): PrivateContactInput[] {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('The CSV contains no contact rows');
  const keys = rows[0].map(keyName);
  if (!keys.some((key) => key === 'name' || key === 'display_name')) {
    throw new Error('The CSV needs a name or display_name column');
  }
  const contacts = rows.slice(1).filter((row) => row.some((value) => value.trim())).map((row) => {
    const values = Object.fromEntries(keys.map((key, index) => [key, row[index]?.trim() || '']));
    return {
      displayName: values.name || values.display_name,
      kind: values.kind,
      givenName: values.given_name,
      surname: values.surname,
      organization: values.organization || values.organisation,
      jobTitle: values.job_title,
      email: values.email,
      phone: values.phone,
      preferredContactMethod: values.preferred_contact_method,
      city: values.city,
      region: values.region || values.state,
      country: values.country,
      notes: values.notes,
      roles: list(values.roles), territories: list(values.territories), tags: list(values.tags),
    };
  });
  if (!contacts.length || contacts.length > 500) throw new Error('CSV imports must contain between 1 and 500 contacts');
  return contacts;
}
