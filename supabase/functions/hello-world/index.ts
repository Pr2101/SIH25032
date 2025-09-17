// Minimal Edge Function placeholder (TypeScript)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { name = "world" } = (await req.json().catch(() => ({}))) as {
    name?: string;
  };
  return new Response(JSON.stringify({ message: `Hello, ${name}!` }), {
    headers: { "content-type": "application/json" },
  });
});


