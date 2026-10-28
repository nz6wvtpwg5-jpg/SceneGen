const FLIGHT_NUMBER = /^[A-Z0-9]{2,3}\s?\d{1,4}[A-Z]?$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function normalizedFlightNumber(value) {
  const flightNumber = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  return FLIGHT_NUMBER.test(flightNumber) ? flightNumber : null;
}

function normalizedDate(value) {
  const date = String(value || '').trim();
  if (!DATE.test(date)) return null;
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ? null : date;
}

module.exports = { normalizedDate, normalizedFlightNumber };
