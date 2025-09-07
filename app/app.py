import os
from pathlib import Path

import streamlit as st

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass


st.set_page_config(page_title="Smart Tourism - Jharkhand", page_icon="🗺️", layout="wide")

st.title("Smart Tourism Platform (Prototype) — Jharkhand")
st.caption("Rapid prototype using Streamlit + Supabase + Gemini")

with st.expander("Environment status", expanded=False):
    env_keys = [
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "GEMINI_API_KEY",
        "IMAGE_API_KEY",
        "SENTRY_DSN",
    ]
    for key in env_keys:
        st.write(f"{key}: {'SET' if os.getenv(key) else 'NOT SET'}")

st.markdown("---")
st.subheader("Welcome")
st.write(
    "This is the base shell for the Smart Tourism Platform. Proceed with Step 1 to provision Supabase and auth."
)

st.info(
    "Navigate through future tabs/pages once implemented: onboarding, places, festivals, marketplace, chatbot, and officials dashboard.",
)


