Smart Tourism Platform (Prototype) for Jharkhand

Overview
This repository contains a rapid prototype of the Smart Tourism Platform for Jharkhand. The prototype uses Streamlit for a fast, mobile-friendly web UI, Supabase for authentication/data/storage, and Gemini for LLM tasks. The goal is to iterate step-by-step per the project plan.

Tech Stack (Prototype)
- Frontend (prototype): Streamlit (Python)
- Backend/data: Supabase (Postgres, Auth, Storage)
- LLM: Gemini API (server-side only)
- Maps: Leaflet + OpenStreetMap (via streamlit-folium) and Google Maps URL scheme for routing
- Monitoring: Sentry (optional in prototype)

Repository Structure
```
app/
  app.py                # Streamlit entrypoint
server/
  README.md             # Placeholder for Edge/Server functions (Node/TS or Python)
supabase/
  README.md             # Placeholder for SQL schemas, policies, migrations
.env.example            # Environment variable template (copy to .env locally)
requirements.txt        # Python dependencies
README.md               # This file
```

Environment Variables
Copy env/.env.example to .env and fill the values. Do NOT commit secrets.
- SUPABASE_URL: Supabase project URL
- SUPABASE_ANON_KEY: Supabase anon key (client); keep service role key server-side only
- SUPABASE_SERVICE_ROLE_KEY: Service role key (server functions only, NEVER in client)
- GEMINI_API_KEY: Google Generative AI (Gemini) API key (server-side only)
- IMAGE_API_KEY: Image search provider key (e.g., Unsplash/Bing) (server-side only)
- SENTRY_DSN: Optional Sentry DSN for error tracking

Prerequisites
- Python >= 3.10
- Node.js >= 18 (optional for Edge Functions)
- Git
- Supabase account and project (https://supabase.com)

Local Setup (Quick Start)
1) Clone and create virtual environment
```
git clone <your-repo-url>
cd <repo>
python -m venv .venv
.venv\\Scripts\\activate   # Windows
# source .venv/bin/activate  # macOS/Linux
```

2) Install dependencies
```
pip install -r requirements.txt
```

3) Configure environment
```
cp env/.env.example .env
# Edit .env with your values
```

4) Run Streamlit app
```
streamlit run app/app.py
```

5) (Optional) Supabase CLI & migrations
- Install Supabase CLI if desired and manage SQL schemas/policies under supabase/.

Security Notes
- Do not expose secrets in the frontend or commit .env files.
- All calls to Gemini or paid image APIs must happen server-side only.

Development Workflow
- main: stable branch
- feature/*: feature branches per step (e.g., feature/step-0-setup)
- Use PRs to merge into main.

License and Attribution
- Use open-license images where possible and record attribution in DB when importing.


