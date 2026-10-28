# Currency Support Feature

## Overview
Shows now support multi-currency financial data with automatic currency detection based on venue country. The system suggests the appropriate currency (e.g., EUR for Netherlands, GBP for UK) but allows manual override.

## Features

### 1. Auto-Detection by Country
When you enter or select a venue country, the currency is automatically detected:
- 🇳🇱 **Netherlands** → EUR (Euro)
- 🇬🇧 **United Kingdom** → GBP (British Pound)
- 🇺🇸 **United States** → USD (US Dollar)
- 🇨🇦 **Canada** → CAD (Canadian Dollar)
- 🇯🇵 **Japan** → JPY (Japanese Yen)
- 🇨🇭 **Switzerland** → CHF (Swiss Franc)
- And 40+ more countries...

### 2. Manual Override
You can change the currency using the dropdown selector:
- Default shows detected currency
- Dropdown lists 16 common currencies
- Each option shows: `CODE (Symbol)` e.g., `EUR (€)`

### 3. Currency Display
- **Guarantee field**: Amount input + Currency dropdown
- **Ticket prices**: Currency symbol prefix (€, $, £, etc.)
- **Helper text**: Shows auto-detected currency

## Supported Currencies

| Code | Symbol | Name | Countries |
|------|--------|------|-----------|
| USD | $ | US Dollar | USA, America |
| EUR | € | Euro | 19 EU countries (Germany, France, Italy, Spain, Netherlands, etc.) |
| GBP | £ | British Pound | UK, England, Scotland, Wales |
| CAD | CA$ | Canadian Dollar | Canada |
| AUD | A$ | Australian Dollar | Australia |
| JPY | ¥ | Japanese Yen | Japan |
| CHF | CHF | Swiss Franc | Switzerland |
| SEK | kr | Swedish Krona | Sweden |
| NOK | kr | Norwegian Krone | Norway |
| DKK | kr | Danish Krone | Denmark |
| MXN | MX$ | Mexican Peso | Mexico |
| BRL | R$ | Brazilian Real | Brazil |
| CNY | ¥ | Chinese Yuan | China |
| INR | ₹ | Indian Rupee | India |
| PLN | zł | Polish Zloty | Poland |
| CZK | Kč | Czech Koruna | Czech Republic |

## How It Works

### Auto-Detection Flow

```
1. USER SELECTS VENUE COUNTRY
   └─ Country: "Netherlands"

2. SYSTEM AUTO-DETECTS CURRENCY
   └─ Currency: "EUR" (from mapping)

3. UI UPDATES
   ├─ Guarantee dropdown: EUR (€)
   ├─ Ticket price prefix: €
   └─ Helper text: "Auto-detected EUR for Netherlands"

4. USER CAN OVERRIDE
   └─ Change dropdown to different currency if needed
```

### Country-Currency Mapping

```javascript
COUNTRY_CURRENCY_MAP = {
  // Eurozone (19 countries)
  'Netherlands': 'EUR',
  'Germany': 'EUR',
  'France': 'EUR',
  // ... etc

  // Other Europe
  'United Kingdom': 'GBP',
  'Switzerland': 'CHF',

  // Americas
  'USA': 'USD',
  'Canada': 'CAD',

  // Asia Pacific
  'Japan': 'JPY',
  'Australia': 'AUD',
}
```

## UI Examples

### Guarantee Field (with Currency)

```
┌────────────────────────────────────────┐
│ Guarantee                              │
│ ┌────────────────┬───────────────────┐ │
│ │ 1500           │ EUR (€)     ▼    │ │
│ └────────────────┴───────────────────┘ │
│ ℹ️ Auto-detected EUR for Netherlands   │
└────────────────────────────────────────┘
```

### Ticket Price Fields (with Symbol)

```
┌─────────────────────────────────────────┐
│ Advance Ticket Price | Door Ticket Price│
│ ┌──────────────────┐ ┌─────────────────┐│
│ │ € 25.00          │ │ € 30.00         ││
│ └──────────────────┘ └─────────────────┘│
└─────────────────────────────────────────┘
```

## Use Cases

### Use Case 1: European Tour
```
Show 1: Netherlands
└─ Auto-detects EUR ✅
└─ Guarantee: €1,500
└─ Ticket: €25

Show 2: Germany
└─ Auto-detects EUR ✅
└─ Guarantee: €1,800
└─ Ticket: €30

Show 3: UK
└─ Auto-detects GBP ✅
└─ Guarantee: £1,200
└─ Ticket: £22
```

### Use Case 2: North American Tour
```
Show 1: USA
└─ Auto-detects USD ✅
└─ Guarantee: $2,000
└─ Ticket: $35

Show 2: Canada
└─ Auto-detects CAD ✅
└─ Guarantee: CA$2,500
└─ Ticket: CA$40
```

### Use Case 3: Manual Override
```
Show: Netherlands (venue)
└─ Auto-detects EUR
└─ But band wants payment in USD
└─ Manually change to USD ✅
└─ Guarantee: $1,500 (in USD, not EUR)
```

## Database Storage

### Shows Table
```sql
ALTER TABLE shows
ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
```

- **Type**: VARCHAR(3) - ISO 4217 currency codes
- **Default**: USD
- **Examples**: 'EUR', 'GBP', 'JPY'
- **Nullable**: No (defaults to USD)

### Example Show Record
```json
{
  "id": "abc-123",
  "venueName": "Burgerweeshuis",
  "venueCountry": "Netherlands",
  "guarantee": 1500.00,
  "currency": "EUR",  // ← New field
  "advanceTicketPrice": 25.00,
  "doorTicketPrice": 30.00
}
```

## Technical Implementation

### 1. Currency Mapping (CreateShowForm.tsx)
```typescript
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  'Netherlands': 'EUR',
  'United Kingdom': 'GBP',
  'USA': 'USD',
  // ... 40+ more countries
};
```

### 2. Auto-Detection Hook
```typescript
useEffect(() => {
  if (formData.venueCountry) {
    const detectedCurrency = COUNTRY_CURRENCY_MAP[formData.venueCountry] || 'USD';
    setCurrency(detectedCurrency);
  }
}, [formData.venueCountry]);
```

### 3. Currency State
```typescript
const [currency, setCurrency] = useState<string>('USD');
```

### 4. Submission
```typescript
const showInput = {
  // ... other fields
  guarantee: formData.guarantee,
  currency: currency,  // Saved to database
};
```

## Benefits

### For Users
- ✅ **Automatic detection**: No manual currency selection needed
- ✅ **Correct symbols**: See € instead of $ for European shows
- ✅ **Clear display**: Know exactly what currency is being used
- ✅ **Flexible**: Can override auto-detection

### For Business
- ✅ **Accurate financials**: Each show has correct currency
- ✅ **Multi-market**: Support international tours
- ✅ **Reporting**: Can convert/aggregate by currency
- ✅ **Professional**: Shows understanding of international business

## Testing

### Test 1: Auto-Detection
1. Create show
2. Select country: "Netherlands"
3. **Expected**: Currency auto-selects to EUR
4. **Expected**: Helper text: "Auto-detected EUR for Netherlands"

### Test 2: Manual Override
1. Create show
2. Country auto-detects EUR
3. Change currency dropdown to USD
4. **Expected**: Currency changes to USD
5. **Expected**: Ticket prices show $ symbol

### Test 3: Different Countries
1. Create show in UK → GBP (£)
2. Create show in Japan → JPY (¥)
3. Create show in Canada → CAD (CA$)
4. **Expected**: Each show has correct currency

### Test 4: Save and Display
1. Create show with EUR
2. Save show
3. View show later
4. **Expected**: Currency persisted correctly

## Future Enhancements

### Potential Features
- 💱 **Currency conversion**: Convert between currencies
- 📊 **Tour totals**: Aggregate financials across currencies
- 🌍 **Exchange rates**: Live rates for conversions
- 💰 **Multi-currency payments**: Split payments by currency
- 📈 **Financial reports**: Currency-aware analytics

## Country-Currency Mapping (Complete)

### Europe - Eurozone (EUR)
Austria, Belgium, Cyprus, Estonia, Finland, France, Germany, Greece, Ireland, Italy, Latvia, Lithuania, Luxembourg, Malta, Netherlands, Portugal, Slovakia, Slovenia, Spain

### Europe - Other
- **GBP**: United Kingdom, UK, England, Scotland, Wales
- **CHF**: Switzerland
- **NOK**: Norway
- **SEK**: Sweden
- **DKK**: Denmark
- **PLN**: Poland
- **CZK**: Czech Republic
- **HUF**: Hungary
- **RON**: Romania

### Americas
- **USD**: USA, United States, US, America
- **CAD**: Canada
- **MXN**: Mexico
- **BRL**: Brazil
- **ARS**: Argentina
- **CLP**: Chile
- **COP**: Colombia

### Asia Pacific
- **JPY**: Japan
- **CNY**: China
- **KRW**: South Korea
- **INR**: India
- **AUD**: Australia
- **NZD**: New Zealand
- **SGD**: Singapore
- **THB**: Thailand
- **MYR**: Malaysia
- **IDR**: Indonesia

## Migration Details

### Migration Script
```javascript
// backend/add_currency_column.js
ALTER TABLE shows
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
```

### Running Migration
```bash
cd backend
node add_currency_column.js
```

### Result
```
✅ Currency column added successfully
```

## Git Commit
- **86eecfc** - feat: add currency support with auto-detection

## Status
✅ **COMPLETE AND DEPLOYED**

Currency support is now live with auto-detection, manual override, and proper database storage!
