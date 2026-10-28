const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { encryptCalendarToken, decryptCalendarToken } = require('../calendar-crypto');
test('calendar tokens round-trip through authenticated encryption', () => { process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64'); const encrypted = encryptCalendarToken('refresh-secret'); assert.notEqual(encrypted, 'refresh-secret'); assert.equal(decryptCalendarToken(encrypted), 'refresh-secret'); });
test('tampered calendar ciphertext is rejected', () => { process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64'); const parts = encryptCalendarToken('access-secret').split('.'); const bytes = Buffer.from(parts[2], 'base64url'); bytes[0] ^= 1; parts[2] = bytes.toString('base64url'); assert.throws(() => decryptCalendarToken(parts.join('.'))); });
test('calendar ciphertext cannot be decrypted with another key', () => { process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64'); const encrypted = encryptCalendarToken('access-secret'); process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64'); assert.throws(() => decryptCalendarToken(encrypted)); });
test('calendar encryption rejects incorrectly sized keys', () => { process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(16).toString('base64'); assert.throws(() => encryptCalendarToken('access-secret'), /must be 32 bytes/); });
