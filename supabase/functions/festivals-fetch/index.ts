import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type Fest = {
  name: string;
  datePattern?: string;
  short_desc?: string;
  significance?: string;
  recommended_attire_or_conduct?: string;
  media_links?: string[];
};

async function callGemini(state: string): Promise<Fest[]> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
  const systemPrompt = `You are a travel-data assistant. Provide a JSON array of notable festivals in ${state}, India. Each item: {name, datePattern, short_desc, significance, recommended_attire_or_conduct, media_links}. Strict JSON only.`;
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: systemPrompt }] }], generationConfig: { maxOutputTokens: 900 } })
  });
  if (!res.ok) throw new Error('Gemini request failed: ' + (await res.text()));
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
  try { return JSON.parse(text); } catch { return []; }
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return new Response('Server not configured', { status: 500 });
  const { state } = await req.json().catch(() => ({ state: 'Jharkhand' }));

  const festivals = await callGemini(state);
  for (const f of festivals) {
    const upsert = await fetch(`${url}/rest/v1/festivals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'apiKey': key, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        state,
        short_desc: f.short_desc,
        long_desc: f.significance,
        date_pattern: f.datePattern,
        video_360_link: (f.media_links && f.media_links[0]) || null
      })
    });
    if (!upsert.ok) {
      const t = await upsert.text();
      console.log('Festival upsert failed', f.name, t);
    }
  }
  return new Response(JSON.stringify({ state, count: festivals.length }), { headers: { 'content-type': 'application/json' } });
});


