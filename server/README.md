Server / Edge Functions

This directory is reserved for secure server-side functions. Use one of:
- Supabase Edge Functions (TypeScript)
- Small FastAPI/Express service if needed

Rules:
- Never expose secrets to the client. Read from environment only.
- Implement Gemini calls and image ingestion here; cache results in Supabase.


