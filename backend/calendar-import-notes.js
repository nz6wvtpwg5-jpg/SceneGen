'use strict';

// Older Google Calendar imports stored their machine metadata at the beginning
// of the user-editable Notes field. New imports use calendar_import_sources.
const SOURCE_LINE = /^\[Google Calendar event: [^\]\r\n]+\]$/;
const TITLE_LINE = /^Imported calendar entry:\s*(.*)$/i;

function legacyCalendarImportTitle(notes) {
  if (typeof notes !== 'string') return null;
  const lines = notes.replace(/\r\n?/g, '\n').split('\n');
  if (!SOURCE_LINE.test((lines[0] || '').trim())) return null;
  const match = (lines[1] || '').trim().match(TITLE_LINE);
  return match?.[1]?.trim() || null;
}

function userShowNotes(notes) {
  if (typeof notes !== 'string') return '';
  const normalized = notes.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  if (!SOURCE_LINE.test((lines[0] || '').trim())) return notes;
  lines.shift();
  if (TITLE_LINE.test((lines[0] || '').trim())) lines.shift();
  while (lines.length && !lines[0].trim()) lines.shift();
  return lines.join('\n').trimEnd();
}

module.exports = { legacyCalendarImportTitle, userShowNotes };
