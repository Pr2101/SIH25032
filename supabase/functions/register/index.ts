// Role-based registration endpoint (server-only)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

function makeCorsHeaders(origin: string | null) {
  const allowOrigin = origin && origin.startsWith('http') ? origin : '*';
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  } as Record<string,string>;
}

type RegisterBody = {
  email: string;
  password: string;
  name?: string;
  role: 'user' | 'artisan' | 'official';
};

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = makeCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders } });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { ...corsHeaders } });
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  if (!serviceRoleKey || !url) {
    return new Response('Server not configured', { status: 500, headers: { ...corsHeaders } });
  }

  const body = (await req.json().catch(() => null)) as RegisterBody | null;
  if (!body || !body.email || !body.password || !body.role) {
    return new Response('Invalid body', { status: 400, headers: { ...corsHeaders } });
  }

  // Prevent self-creation of officials unless allowlisted (simple domain guard)
  if (body.role === 'official') {
    const allowedDomain = Deno.env.get('OFFICIAL_ALLOW_DOMAIN');
    const domain = body.email.split('@')[1] || '';
    if (!allowedDomain || domain.toLowerCase() !== allowedDomain.toLowerCase()) {
      return new Response('Official signups are restricted', { status: 403, headers: { ...corsHeaders } });
    }
  }

  // Create user via Admin API
  const createRes = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apiKey': serviceRoleKey,
    },
    body: JSON.stringify({
      email: body.email,
      password: body.password,
      user_metadata: { name: body.name ?? null },
      email_confirm: true
    })
  });

  if (!createRes.ok) {
    const txt = await createRes.text();
    return new Response(`User create failed: ${txt}`, { status: 400, headers: { ...corsHeaders } });
  }

  const user = await createRes.json();
  const userId = user.user?.id;
  if (!userId) return new Response('User ID missing', { status: 500, headers: { ...corsHeaders } });

  // Upsert profile with role
  const upsertRes = await fetch(`${url}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apiKey': serviceRoleKey,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      user_id: userId,
      email: body.email,
      name: body.name ?? null,
      role: body.role
    })
  });

  if (!upsertRes.ok) {
    const txt = await upsertRes.text();
    return new Response(`Profile upsert failed: ${txt}`, { status: 400, headers: { ...corsHeaders } });
  }

  return new Response(JSON.stringify({ user_id: userId, role: body.role }), {
    headers: { 'content-type': 'application/json', ...corsHeaders }
  });
});


