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

type ChatBody = { user_id: string; prompt: string; session_id?: string; language?: string };

async function callGemini(prompt: string, language?: string) {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
  const sys = language ? `Reply in ${language}. ` : '';
  const body = {
    contents: [{ role: 'user', parts: [{ text: sys + prompt }]}],
    generationConfig: { maxOutputTokens: 1024 }
  };
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return text;
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const cors = makeCorsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { ...cors } });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { ...cors } });
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return new Response('Server not configured', { status: 500, headers: { ...cors } });

  const body = await req.json().catch(() => null) as ChatBody | null;
  if (!body?.user_id || !body?.prompt) return new Response('user_id and prompt required', { status: 400, headers: { ...cors } });

  const reply = await callGemini(body.prompt, body.language);

  const ins = await fetch(`${url}/rest/v1/chats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'apiKey': key },
    body: JSON.stringify({ user_id: body.user_id, role: 'user', prompt: body.prompt, gemini_response: reply, session_id: body.session_id || crypto.randomUUID() })
  });
  if (!ins.ok) return new Response(await ins.text(), { status: 400, headers: { ...cors } });

  return new Response(JSON.stringify({ response: reply }), { headers: { 'content-type': 'application/json', ...cors } });
});


