Step 6 — Place detail, routes & view

1) In Streamlit → Explore Places, after fetching places, click Details on a card.
2) Server calls `place-detail` to fetch/cache long description via Gemini; UI shows route and map view links.
3) Click “Save Offline (JSON)” to download text + image URLs.

Step 5 — Nearby places & sorting

1) In Streamlit → Nearby: enter your coordinates (or defaults), choose filters and sort.
2) Results are ranked by Haversine distance on client; you can filter by type and radius.
3) Save to wishlist requires your auth `user_id`. It upserts into `wishlists.place_ids`.
4) For server-keyed wishlist actions in Streamlit, set `SUPABASE_SERVICE_ROLE_KEY` temporarily for local testing only.

Smart Tourism Platform (Prototype) for Jharkhand

Overview

This repository contains a local-first prototype for the Smart Tourism Platform for Jharkhand. It uses Streamlit for the rapid prototype UI, Supabase (Postgres) for auth/data/storage (via Supabase CLI locally), and server-only calls for LLM/image APIs. No remote GitHub actions are configured; everything is local by design.

Tech Stack (prototype)

- Frontend (prototype): Streamlit (Python 3.10+)
- Backend/services: Supabase (local via Supabase CLI + Docker), Supabase Edge Functions (TypeScript)
- LLM: Google Gemini API (server-side only)
- Images: Unsplash API (free) or placeholder; cache to Supabase Storage
- Maps: Leaflet + OpenStreetMap embeds, Google Maps URL scheme for directions
- Monitoring (optional): Sentry, simple analytics events table in Postgres

Monorepo Layout

- app/: Streamlit prototype
- supabase/: Supabase local project (config, seed, edge functions)
- server/: (optional) Node helpers for local dev, if needed later
- .env.example: Environment variables template (copy to .env files as needed)

Environment Variables

Copy the following into an .env file for local development. Do not commit secrets.

- SUPABASE_URL: Supabase project URL (local dev URL provided by Supabase CLI)
- SUPABASE_ANON_KEY: Supabase anon key (from Supabase CLI or project settings)
- SUPABASE_SERVICE_ROLE_KEY: Service role key (server-only; never exposed client-side)
- GEMINI_API_KEY: Google Gemini API key (server-only)
- IMAGE_API_KEY: Unsplash Access Key (or other image API key; server-only)
- OFFICIAL_ALLOW_DOMAIN: Allowed email domain for self-service official accounts (e.g., gov.local)
- SENTRY_DSN: (optional) Sentry DSN for error tracking
- GA_MEASUREMENT_ID: (optional) Google Analytics Measurement ID

Setup — Prerequisites

1) Windows 10/11, WSL2 optional
2) Python 3.10+ and pip
3) Node.js 18+
4) Docker Desktop (for Supabase local services)
5) Supabase CLI: https://supabase.com/docs/guides/cli

First-Time Local Setup

1) Clone/create the folder locally (no GitHub required). Optionally initialize a local git repo.
2) Python env for Streamlit

   - py -3 -m venv .venv
   - .\.venv\Scripts\activate
   - pip install -r requirements.txt

3) Supabase local stack (Docker required)

   - supabase init
   - supabase start
   - supabase status  | note API URL and keys
   - Update .env files with local Supabase URL/keys (anon/service role)

4) Edge Functions (TypeScript)

   - cd supabase/functions
   - npm install
   - npm run build
   - (Deploy locally) supabase functions serve --env-file ../../.env.local

Run the Prototype

1) Ensure Supabase is running locally: supabase start
2) Start Streamlit UI from repo root:

   - .\.venv\Scripts\activate
   - streamlit run app/streamlit_app.py

Step 2 — Artisan onboarding & marketplace data model

1) Ensure hosted Supabase env is set in .env (URL, anon key).
2) In SQL Editor, run migrations in order if not yet: 0001, 0002, 0003 (storage).
3) Create product images bucket policy is in 0003_storage.sql.
4) Start Streamlit and use tabs:
   - Artisan Onboarding: fill user_id (from your auth user), basic info, submit. Status defaults to pending.
   - Post Product: enter artisan_id, details, upload an image; it uploads to bucket `product-images` under path `{user_id}/...` and creates a product row.
5) Officials can later verify artisans (UI to be added in Step 2 dashboard subsection).

Step 3 — State selection & Gemini-driven place list

1) Ensure env has: GEMINI_API_KEY, IMAGE_API_KEY set (server-side).
2) Apply migrations: 0004_places_cache.sql.
3) Serve Edge Functions (hosted): deploy or test locally via Supabase CLI (if available); otherwise call the HTTPS endpoint in your project.
4) In Streamlit → Explore Places: select a state, click Fetch Places. This calls the `places-fetch` function to query Gemini, fetch images, and upsert `places`. Cards render from DB.
5) Cost control: responses cached into `places.gemini_cache_json` with `gemini_cached_at`. TTL handling can be added later.

Step 4 — Festival calendar & hover preview (prototype)

1) Ensure `GEMINI_API_KEY` is set. The function `festivals-fetch` uses Gemini to populate `festivals` for a state.
2) In Streamlit → Explore Places, click "Fetch Festivals for State" after choosing a state.
3) Festivals appear in a list (expanders). A calendar widget can be added later or integrated with a React client.


Step 1 — Supabase provisioning & basic auth (local)

1) Start Supabase: supabase start
2) Apply schema: supabase db reset (or supabase db push) to run migrations in supabase/migrations
3) Serve Edge Functions: supabase functions serve --env-file ../.env (in supabase/functions)
4) Test role-based register endpoint:

   - curl -X POST http://localhost:54321/functions/v1/register -H "Content-Type: application/json" -d '{"email":"user1@example.com","password":"Passw0rd!","name":"User One","role":"user"}'

5) Create test users via Node:

   - npm i node-fetch dotenv
   - node server/create_test_users.js

Configuration Notes

- Secrets must only be referenced in server contexts (Edge Functions or backend). The Streamlit app should avoid embedding API keys; it will call server endpoints/functions.
- For maps, use Leaflet with OSM and open Google Maps direction links to avoid paid APIs.
- Images should be cached to Supabase Storage and served via the local Supabase storage emulator.

Next Steps Roadmap (per step plan)

- Step 1: Supabase provisioning & auth roles (users/profiles, RLS, seed test users)
- Step 2: Artisan onboarding + product posting flow (storage uploads)
- Step 3: State selection + Gemini-driven places + image caching
- Steps 4–12: Festivals, nearby, details, chatbot, marketplace, dashboards, caching, analytics, security & deploy

Local Branching (suggested — local only)

- main: stable local branch
- feat/supabase-auth: Step 1 work
- feat/artisan-marketplace: Step 2 work
- feat/places-gemini: Step 3 work

Troubleshooting

- If Supabase CLI cannot start, confirm Docker Desktop is running and WSL2 integration is enabled.
- Regenerate keys with supabase status and update .env.
- For Windows PowerShell execution policy issues, run: Set-ExecutionPolicy -Scope Process RemoteSigned

License

Prototype code for internal evaluation. Ensure third-party image licensing compliance before distribution.


