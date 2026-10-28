// PASTE THIS IN YOUR BROWSER CONSOLE TO DEBUG:

console.log('===== DEBUGGING DASHBOARD =====');

// 1. Check your session
fetch('/api/auth/session')
  .then(r => r.json())
  .then(session => {
    console.log('1. YOUR SESSION:');
    console.log('   User ID:', session.user?.id);
    console.log('   Name:', session.user?.name);
    console.log('   Email:', session.user?.email);
    console.log('   Has token:', !!session.access_token);
    return session;
  })
  .then(session => {
    // 2. Check your entities
    return fetch('/api/user/entities', {
      headers: {
        'Authorization': 'Bearer ' + session.access_token
      }
    })
    .then(r => r.json())
    .then(entities => {
      console.log('\n2. YOUR ENTITIES:');
      console.log('   Raw response:', entities);
      console.log('   Is array?', Array.isArray(entities));
      console.log('   Count:', Array.isArray(entities) ? entities.length : 0);
      if (Array.isArray(entities) && entities.length > 0) {
        entities.forEach((e, i) => {
          console.log(`\n   Entity ${i + 1}:`);
          console.log('     ID:', e.id);
          console.log('     Name:', e.name);
          console.log('     Type:', e.entityType);
          console.log('     Admin ID:', e.administratorId || '❌ MISSING');
        });
      } else {
        console.log('   ❌ NO ENTITIES RETURNED FROM BACKEND!');
      }
    });
  })
  .catch(err => {
    console.error('❌ ERROR:', err);
  });

console.log('\n3. WHAT THE DASHBOARD SHOWS:');
console.log('   The dashboard page is just a static welcome message.');
console.log('   It does NOT display shows, tours, contacts, etc.');
console.log('   Those features are on separate pages:');
console.log('   - Shows: /shows');
console.log('   - Tours: /tours');
console.log('   - Contacts: /contacts');
console.log('   - Profile: /profile');

console.log('\n4. WHY SIDEBAR IS EMPTY:');
console.log('   Backend is returning 0 entities in GET /user/entities');
console.log('   Either:');
console.log('   a) Entity creation failed (check Network tab for artist/add)');
console.log('   b) Entity was created but backend query is wrong');
console.log('   c) Entity was created for a different user');

console.log('=====================================');
