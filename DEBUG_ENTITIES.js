// Run this in your browser console to see what the API is returning:

fetch('/api/user/entities', {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6Ilg1ZVhrNHh5b2pORnVtMWtsMll0djhkbE5QNC1jNTdkTzZRR1RWQndhTmsiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOiJjZThkMzE0Yi0xZDM1LTRiYTktOWI4Yi04YjljY2RlYWJkNmYiLCJpc3MiOiJodHRwczovL3NjZW5lZ2VuaW8uYjJjbG9naW4uY29tLzk1NDAxMzNlLTgwNmItNDQ1NS1hYTE3LTJjODUzOTA1M2NlNS92Mi4wLyIsImV4cCI6MTc2OTYzNTI2MiwibmJmIjoxNzY5NjMxNjYyLCJvaWQiOiIzMWFiY2ZmYi02YzhjLTQ5ODgtYmJiZi1mZDU5MzUwZDQwMzgiLCJzdWIiOiIzMWFiY2ZmYi02YzhjLTQ5ODgtYmJiZi1mZDU5MzUwZDQwMzgiLCJmYW1pbHlfbmFtZSI6IkRhdmlzIiwiZ2l2ZW5fbmFtZSI6IkpvbiIsIm5hbWUiOiJKb24gRGF2aXMiLCJlbWFpbHMiOlsiam9uQHNjZW5lZ2VuLmlvIl0sInRmcCI6IkIyQ18xX1NVU0kiLCJzY3AiOiJhcHBsaWNhdGlvblNjb3BlIiwiYXpwIjoiNzBmZjgwNDItMTQ4ZC00MWRlLTg0MDktNDI3MmUzYjNmODI1IiwidmVyIjoiMS4wIiwiaWF0IjoxNzY5NjMxNjYyfQ.XSXHg5FvMzzscIaDbGGLfm6iTgBkgmENaoeXKKKUHa96CzsX5qUYWAhVNILRX6VIDe25YuXeWz_3y2Per9sMPqrVXOLYVE_NWvoIAnn9vl2RoRQwFOo7FVDa_5gqrYykOwW7u2EwcJqYJIC5qzvlTkJR7Oo6GQUSBXq4aWN8SO3xOplllo2k6CzGMWYmth38A6T8nR5XLRTKrZqkVHczy2_OxI0BCLYrYBfaVgEZRgWEf0pmRWgDtMKGOTxq1EQOGxlP_XOibajKCIKo_pAbyEfmtHw3okRU45oiN7_vLZ2qncAW0HjeVYky094Yu_RC966PAqpxJmDqtgiAMrT5SA'
  }
}).then(r => r.json()).then(data => {
  console.log('===== USER ENTITIES RESPONSE =====');
  console.log('Raw data:', data);
  console.log('Is array?', Array.isArray(data));
  if (Array.isArray(data)) {
    console.log('Number of entities:', data.length);
    data.forEach((entity, i) => {
      console.log(`\nEntity ${i + 1}:`, {
        id: entity.id,
        name: entity.name,
        entityType: entity.entityType,
        administratorId: entity.administratorId || '❌ MISSING!',
        hasAdministratorId: !!entity.administratorId
      });
    });
  }
  console.log('Your user ID:', '31abcffb-6c8c-4988-bbbf-fd59350d4038');
  console.log('=================================');
});
