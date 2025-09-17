// Node script to create test users using Supabase Admin API (service role)
// Usage: node server/create_test_users.js
require('dotenv').config();
// Use undici's fetch for CommonJS compatibility
const { fetch } = require('undici');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OFFICIAL_ALLOW_DOMAIN } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function createUser(email, password, name) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'apiKey': SUPABASE_SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ email, password, user_metadata: { name }, email_confirm: true })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function upsertProfile(user_id, email, name, role) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'apiKey': SUPABASE_SERVICE_ROLE_KEY,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({ user_id, email, name, role })
  });
  if (!res.ok) throw new Error(await res.text());
}

(async () => {
  async function getUserIdByEmail(email) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apiKey': SUPABASE_SERVICE_ROLE_KEY
      }
    });
    if (!r.ok) return null;
    const j = await r.json();
    // Response format may differ; try common shapes
    return j?.users?.[0]?.id || j?.id || null;
  }

  try {
    const users = [
      { email: 'user1@example.com', pass: 'Passw0rd!', name: 'User One', role: 'user' },
      { email: 'artisan1@example.com', pass: 'Passw0rd!', name: 'Artisan One', role: 'artisan' },
      { email: `official@${OFFICIAL_ALLOW_DOMAIN || 'gov.local'}`, pass: 'Passw0rd!', name: 'Official One', role: 'official' },
    ];

    for (const u of users) {
      let id = null;
      try {
        const created = await createUser(u.email, u.pass, u.name);
        id = created?.id || created?.user?.id || null;
      } catch (e) {
        id = await getUserIdByEmail(u.email);
        if (!id) throw e;
      }
      if (!id) throw new Error('Missing user id after create/lookup');
      await upsertProfile(id, u.email, u.name, u.role);
      console.log('Upserted profile:', u.email, id, u.role);
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();


