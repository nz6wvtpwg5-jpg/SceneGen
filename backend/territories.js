const REGIONS = {
  Europe: ['Albania','Andorra','Austria','Belarus','Belgium','Bosnia and Herzegovina','Bulgaria','Croatia','Cyprus','Czech Republic','Denmark','Estonia','Finland','France','Germany','Greece','Hungary','Iceland','Ireland','Italy','Kosovo','Latvia','Liechtenstein','Lithuania','Luxembourg','Malta','Moldova','Monaco','Montenegro','Netherlands','North Macedonia','Norway','Poland','Portugal','Romania','Russia','San Marino','Serbia','Slovakia','Slovenia','Spain','Sweden','Switzerland','Ukraine','Vatican City'],
  Asia: ['Afghanistan','Armenia','Azerbaijan','Bahrain','Bangladesh','Bhutan','Brunei','Cambodia','China','Georgia','India','Indonesia','Iran','Iraq','Israel','Japan','Jordan','Kazakhstan','Kuwait','Kyrgyzstan','Laos','Lebanon','Malaysia','Maldives','Mongolia','Myanmar','Nepal','North Korea','Oman','Pakistan','Palestine','Philippines','Qatar','Saudi Arabia','Singapore','South Korea','Sri Lanka','Syria','Taiwan','Tajikistan','Thailand','Timor-Leste','Turkey','Turkmenistan','United Arab Emirates','Uzbekistan','Vietnam','Yemen'],
  Africa: ['Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cabo Verde','Cameroon','Central African Republic','Chad','Comoros','Congo (DRC)','Congo (Republic)','Djibouti','Egypt','Equatorial Guinea','Eritrea','Eswatini','Ethiopia','Gabon','Gambia','Ghana','Guinea','Guinea-Bissau','Ivory Coast','Kenya','Lesotho','Liberia','Libya','Madagascar','Malawi','Mali','Mauritania','Mauritius','Morocco','Mozambique','Namibia','Niger','Nigeria','Rwanda','Sao Tome and Principe','Senegal','Seychelles','Sierra Leone','Somalia','South Africa','South Sudan','Sudan','Tanzania','Togo','Tunisia','Uganda','Zambia','Zimbabwe'],
  'North America': ['Antigua and Barbuda','Bahamas','Barbados','Belize','Canada','Costa Rica','Cuba','Dominica','Dominican Republic','El Salvador','Grenada','Guatemala','Haiti','Honduras','Jamaica','Mexico','Nicaragua','Panama','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Trinidad and Tobago','United States'],
  'South America': ['Argentina','Bolivia','Brazil','Chile','Colombia','Ecuador','Guyana','Paraguay','Peru','Suriname','Uruguay','Venezuela'],
  Oceania: ['Australia','Fiji','Kiribati','Marshall Islands','Micronesia','Nauru','New Zealand','Palau','Papua New Guinea','Samoa','Solomon Islands','Tonga','Tuvalu','Vanuatu'],
};

const aliases = { usa: 'unitedstates', us: 'unitedstates', unitedstatesofamerica: 'unitedstates', ca: 'canada', can: 'canada', uk: 'unitedkingdom', gb: 'unitedkingdom', czechia: 'czechrepublic', southkorea: 'southkorea', koreasouth: 'southkorea' };
const key = (value) => { const raw = String(value || '').toLowerCase().replace(/[^a-z]/g, ''); return aliases[raw] || raw; };
const regionName = (value) => {
  const raw = String(value || '').trim();
  if (raw.startsWith('@region:')) return raw.slice(8);
  return Object.hasOwn(REGIONS, raw) ? raw : null;
};
const validTerritory = (value) => { const region = regionName(value); return region === null || Object.hasOwn(REGIONS, region); };
const territoryLabel = (value) => regionName(value) || String(value || '');
const expand = (territories) => new Set((territories || []).flatMap((item) => {
  const region = regionName(item);
  return region && REGIONS[region] ? REGIONS[region] : [item];
}).map(key));
const overlaps = (left, right) => { const leftSet = expand(left); return [...expand(right)].some((item) => leftSet.has(item)); };
const matches = (territories, country) => expand(territories).has(key(country));

const canonicalCountries = new Map([
  ...Object.values(REGIONS).flat(),
  'United Kingdom',
].map((country) => [key(country), country]));
const countryAliases = new Map([
  ['england', 'United Kingdom'], ['scotland', 'United Kingdom'],
  ['wales', 'United Kingdom'], ['northernireland', 'United Kingdom'],
  ['greatbritain', 'United Kingdom'], ['gbr', 'United Kingdom'], ['uk', 'United Kingdom'],
]);

function canonicalCountry(value) {
  const normalized = key(value);
  return canonicalCountries.get(normalized) || countryAliases.get(normalized) || '';
}

const resolveShowCountry = (country, venueAddress) => {
  const direct = canonicalCountry(country);
  if (direct) return direct;
  const segments = String(venueAddress || '').split(',').map((part) => part.trim()).filter(Boolean).reverse();
  for (const segment of segments.slice(0, 2)) {
    const resolved = canonicalCountry(segment);
    if (resolved) return resolved;
  }
  return '';
};

module.exports = { REGIONS, canonicalCountry, expand, overlaps, matches, resolveShowCountry, regionName, territoryLabel, validTerritory };
