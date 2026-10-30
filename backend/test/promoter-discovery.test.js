const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  PROFILE_SQL, HISTORICAL_PROMOTERS_SQL, normalizeGenres, discoverPromoters, publicPromoterName,
} = require('../promoter-discovery');

const id = '00000000-0000-4000-8000-0000000000aa';
const profiles = [
  { id, name: 'Example Productions', tags: ['#sludgemetal', '#jazz'] },
  { id: '00000000-0000-4000-8000-0000000000bb', name: 'Unrelated Festival', tags: ['#folk'] },
];
const history = [
  { internal_email_key: 'alex.private@example.test', promoter_name: 'Alex Smith Email: alex.private@example.test',
    verified_profile_ids: [], band_tag_groups: [['#doommetal', '#sludgemetal'], ['#doommetal', '#stonermetal']] },
  { internal_email_key: 'claimed@example.test', promoter_name: 'Example Productions',
    verified_profile_ids: [id], band_tag_groups: [['#doommetal']] },
  { internal_email_key: 'other@example.test', promoter_name: 'Another Promoter',
    verified_profile_ids: [], band_tag_groups: [['#ambient']] },
];

test('matching is ANY common hashtag, either artist-history or promoter-declared', () => {
  const rows = discoverPromoters(profiles, history, { genres: ['#doommetal'] });
  assert.deepEqual(rows.map(r => r.name).sort(), ['Example Productions', 'Promoter']);
  assert.equal(rows[0].associatedBandGenres.includes('#doommetal'), true);
  assert.ok(rows.every(r => r.matchingGenres.includes('#doommetal')));
  const declaredOnly = discoverPromoters(profiles, history, { genres: ['#jazz'] });
  assert.equal(declaredOnly.length, 1);
  assert.equal(declaredOnly[0].profileId, id);
  assert.equal(declaredOnly[0].matchBasis, 'promoter_selected');
});

test('one verified profile is merged with linked show evidence, not linked on name alone', () => {
  const rows = discoverPromoters(profiles, history, { genres: ['doom metal', '#sludge-metal'] });
  const verified = rows.filter(r => r.profileId === id);
  assert.equal(verified.length, 1);
  assert.ok(verified[0].declaredGenres.includes('#sludgemetal'));
  assert.ok(verified[0].associatedBandGenres.includes('#doommetal'));
});

test('unregistered contacts expose no email, phone, private notes, or address-book identifiers', () => {
  const rows = discoverPromoters(profiles, history, { genres: ['#doommetal'] });
  const inferred = rows.find(r => r.registrationStatus === 'not_registered');
  assert.equal(inferred.name, 'Promoter');
  assert.equal(inferred.profileId, null);
  assert.doesNotMatch(JSON.stringify(rows), /alex.private@example.test|claimed@example.test|other@example.test|phone|notes|internal_email_key|contact_id/i);
  assert.equal(publicPromoterName('Email: jane@private.test'), '');
});

test('genre matching is canonical and requires a real overlap; name search alone still works', () => {
  assert.deepEqual(normalizeGenres(['#doom metal', 'DOOM-METAL', '#doommetal', '#jazz']), ['#doommetal', '#jazz']);
  assert.equal(discoverPromoters(profiles, history, { genres: ['#deathmetal'] }).length, 0);
  assert.equal(discoverPromoters(profiles, history, { query: 'Alex' }).length, 0);
  assert.deepEqual(discoverPromoters(profiles, history, {}), []);
});

test('route filters out future, cancelled and non-performing dates and reads live artist genres', () => {
  assert.match(HISTORICAL_PROMOTERS_SQL, /s\.date<CURRENT_DATE/);
  assert.match(HISTORICAL_PROMOTERS_SQL, /NOT IN \('off_day','travel_day'\)/);
  assert.match(HISTORICAL_PROMOTERS_SQL, /IN \('confirmed','completed','performed'\)/);
  assert.match(HISTORICAL_PROMOTERS_SQL, /band\.tags/);
  assert.match(HISTORICAL_PROMOTERS_SQL, /pc\.id=pcs\.contact_id AND pc\.entity_id=pcs\.entity_id/);
  assert.match(HISTORICAL_PROMOTERS_SQL, /s\.entity_id::text=pcs\.entity_id::text/);
  assert.match(PROFILE_SQL, /entity_type='promoter'/);
  const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  const start = server.indexOf("app.get('/api/contacts/discover-promoters'");
  const end = server.indexOf("app.post('/api/contacts/private'", start);
  const route = server.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(route, /req\.entityId/);
  assert.match(route, /entity_type !== 'artist'/);
  assert.match(route, /normalizeGenres\(workspace\.rows\[0\]\.tags\)/);
  assert.doesNotMatch(route, /res\.json\(.*profiles\.rows|res\.json\(.*history\.rows/);
});

test('contact discovery route keeps original signed workspace context', () => {
  const proxy = fs.readFileSync(path.join(__dirname, '../../src/app/api/contacts/discover-promoters/route.ts'), 'utf8');
  assert.match(proxy, /daySheetProxy\(request, '\/contacts\/discover-promoters'/);
  assert.match(proxy, /incoming\.getAll\('genre'\)\.slice\(0, 12\)/);
});

test('unclaimed names are never returned, while past bands and show cities remain discoverable', () => {
  const results = discoverPromoters([], [{
    internal_email_key:'secret@example.test',promoter_name:'Top Secret Promoter',
    verified_profile_ids:[],band_tag_groups:[['#doommetal']],
    bands_worked_with:[{name:'CONAN',date:'2026-09-15'}],
    known_locations:[{city:'Houston',country:'USA'}],
  }],{genres:['#doommetal']});
  assert.equal(results.length,1);
  assert.equal(results[0].name,'Promoter');
  assert.deepEqual(results[0].bandsWorkedWith,['CONAN']);
  assert.deepEqual(results[0].knownLocations,[{city:'Houston',country:'USA'}]);
  assert.doesNotMatch(JSON.stringify(results),/Top Secret|secret@example.test/);
});

test('city and country filters match recorded promoter show locations', () => {
  const evidence = [{
    internal_email_key:'location@example.test', promoter_name:'Example private promoter',
    verified_profile_ids:[], band_tag_groups:[['#doommetal']],
    known_locations:[{city:'Phoenix',country:'USA'},{city:'London',country:'United Kingdom'}],
    bands_worked_with:[{name:'Example Band',date:'2026-01-01'}],
  }];
  assert.equal(discoverPromoters([],evidence,{city:'Phoenix',country:'USA'}).length,1);
  assert.equal(discoverPromoters([],evidence,{city:'Phoenix',country:'United Kingdom'}).length,0);
  assert.equal(discoverPromoters([],evidence,{country:'United States'}).length,1);
  assert.equal(discoverPromoters([],evidence,{city:'Paris'}).length,0);
  assert.equal(discoverPromoters([],evidence,{country:'United Kingdom'}).length,1);
});

test('unregistered promoters become discoverable by location without a show, without exposing private identity', () => {
  const { CONTACT_ONLY_PROMOTERS_SQL } = require('../promoter-discovery');
  assert.match(CONTACT_ONLY_PROMOTERS_SQL, /FROM private_contacts pc/);
  assert.match(CONTACT_ONLY_PROMOTERS_SQL, /owner.entity_type='artist'/);
  assert.match(CONTACT_ONLY_PROMOTERS_SQL, /pc.linked_entity_id IS NULL/);
  assert.doesNotMatch(CONTACT_ONLY_PROMOTERS_SQL, /pc\.(?:given_name|surname|organization|phone|notes)\b/);
  const rows = discoverPromoters([], [{
    internal_email_key:'private-location@example.test',
    promoter_name:'Promoter', source_entity_id:'11111111-1111-4111-8111-111111111111',
    contact_only:true, verified_profile_ids:[], band_tag_groups:[], bands_worked_with:[],
    known_locations:[{city:'Liverpool',country:'United Kingdom'}]
  }], {city:'Liverpool',viewerEntityId:'22222222-2222-4222-8222-222222222222'});
  assert.equal(rows.length,1);
  assert.equal(rows[0].name,'Promoter');
  assert.equal(rows[0].discoverySource,'contact_only');
  const withUnmatchedDefaultGenre = discoverPromoters([], [{
    internal_email_key:'private-location@example.test',promoter_name:'Promoter',
    source_entity_id:'11111111-1111-4111-8111-111111111111',contact_only:true,
    known_locations:[{city:'Liverpool',country:'United Kingdom'}],
  }], {city:'Liverpool',genres:['#doommetal'],viewerEntityId:'22222222-2222-4222-8222-222222222222'});
  assert.equal(withUnmatchedDefaultGenre.length,1);
  assert.deepEqual(withUnmatchedDefaultGenre[0].matchingGenres,[]);
  assert.deepEqual(rows[0].knownLocations,[{city:'Liverpool',country:'United Kingdom'}]);
  assert.deepEqual(rows[0].bandsWorkedWith,[]);
  assert.doesNotMatch(JSON.stringify(rows),/private-location|example.test|organization|notes|phone|source_entity_id/);
  assert.equal(discoverPromoters([], [{
    internal_email_key:'private-location@example.test',promoter_name:'Promoter',contact_only:true,
    source_entity_id:'11111111-1111-4111-8111-111111111111',
    known_locations:[{city:'Liverpool',country:'United Kingdom'}]
  }],{city:'Liverpool',viewerEntityId:'11111111-1111-4111-8111-111111111111'}).length,0);
});
