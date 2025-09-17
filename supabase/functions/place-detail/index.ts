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

async function callGemini(placeName: string, state: string) {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
  const prompt = `
You are a travel writer and itinerary planner. For the place "${placeName}", "${state}", output ONLY valid JSON with fields:
{
  "name": string,
  "long_desc": string,
  "history_summary": string,
  "visiting_tips": string[],
  "best_time_to_visit": string,
  "safety_notes": string[],
  "suggested_itinerary_snippet": [{"time": string, "activity": string}],
  "detailed_itinerary": [
    { "day": 1, "summary": string, "activities": [ { "time": string, "title": string, "details": string, "transport": string, "difficulty": "easy"|"moderate"|"hard" } , {"time": string, "title": string, "details": string, "transport": string, "difficulty": "easy"|"moderate"|"hard" }, {"time": string, "title": string, "details": string, "transport": string, "difficulty": "easy"|"moderate"|"hard" }, {"time": string, "title": string, "details": string, "transport": string, "difficulty": "easy"|"moderate"|"hard" } ] },
    { "day": 2, "summary": string, "activities": [ { "time": string, "title": string, "details": string, "transport": string, "difficulty": "easy"|"moderate"|"hard" }, {"time": string, "title": string, "details": string, "transport": string, "difficulty": "easy"|"moderate"|"hard" }, {"time": string, "title": string, "details": string, "transport": string, "difficulty": "easy"|"moderate"|"hard" }, {"time": string, "title": string, "details": string, "transport": string, "difficulty": "easy"|"moderate"|"hard" } ] },
    { "day": 3, "summary": string, "activities": [ { "time": string, "title": string, "details": string, "transport": string, "difficulty": "easy"|"moderate"|"hard" }, {"time": string, "title": string, "details": string, "transport": string, "difficulty": "easy"|"moderate"|"hard" }, {"time": string, "title": string, "details": string, "transport": string, "difficulty": "easy"|"moderate"|"hard" }, {"time": string, "title": string, "details": string, "transport": string, "difficulty": "easy"|"moderate"|"hard" } ] }
  ]
}
Constraints: JSON only (no markdown/backticks). Ensure detailed_itinerary has 3 days, each with >=4 activities.`;
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1600 } })
  });
  if (!res.ok) throw new Error('Gemini request failed: ' + (await res.text()));
  const data = await res.json();
  let text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  const fence = text.match(/```json[\s\S]*?```/i) || text.match(/```[\s\S]*?```/);
  if (fence && fence[0]) text = fence[0].replace(/```json|```/gi, '').trim();
  try { return JSON.parse(text); } catch { return {}; }
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const cors = makeCorsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { ...cors } });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { ...cors } });
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return new Response('Server not configured', { status: 500, headers: { ...cors } });
  const { place_id, state } = await req.json().catch(() => ({}));
  if (!place_id) return new Response('place_id required', { status: 400, headers: { ...cors } });

  const pr = await fetch(`${url}/rest/v1/places?place_id=eq.${place_id}&select=name,state,long_desc,images,lat,lon`, {
    headers: { 'Authorization': `Bearer ${key}`, 'apiKey': key }
  });
  const arr = await pr.json();
  const place = arr?.[0];
  if (!place) return new Response('Not found', { status: 404, headers: { ...cors } });

  let gemini: any = {};
  if (!place.long_desc) {
    gemini = await callGemini(place.name, place.state || state || '');
    const upd = await fetch(`${url}/rest/v1/places?place_id=eq.${place_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'apiKey': key },
      body: JSON.stringify({ long_desc: gemini.long_desc || place.long_desc })
    });
    if (upd.ok) place.long_desc = gemini.long_desc || place.long_desc;
  } else {
    // still get structured info, but do not overwrite cached long_desc
    gemini = await callGemini(place.name, place.state || state || '');
  }

  return new Response(JSON.stringify({ ...place, gemini }), { headers: { 'content-type': 'application/json', ...cors } });
});


