import os
from dotenv import load_dotenv
import streamlit as st
from supabase import create_client, Client
from uuid import uuid4
import math

load_dotenv()

st.set_page_config(page_title="Smart Tourism - Jharkhand", layout="wide")

st.title("Smart Tourism Platform (Prototype) — Jharkhand")
st.caption("Local prototype using Streamlit + Supabase (auth/data) + server-only APIs")

with st.sidebar:
    st.header("Environment")
    st.write("SUPABASE_URL", os.getenv("SUPABASE_URL", "<not set>"))
    st.write("GEMINI_API_KEY set:", bool(os.getenv("GEMINI_API_KEY")))
    st.write("IMAGE_API_KEY set:", bool(os.getenv("IMAGE_API_KEY")))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
sb: Client | None = None
if SUPABASE_URL and SUPABASE_ANON_KEY:
    sb = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

tab1, tab2, tab3, tab4 = st.tabs(["Artisan Onboarding", "Post Product", "Explore Places", "Nearby"])

with tab1:
    st.subheader("Artisan Onboarding")
    if not sb:
        st.warning("Supabase client not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.")
    else:
        name = st.text_input("Display Name")
        address = st.text_area("Address")
        col1, col2 = st.columns(2)
        with col1:
            lat = st.number_input("Latitude", value=0.0, format="%f")
        with col2:
            lon = st.number_input("Longitude", value=0.0, format="%f")
        skills = st.text_input("Skills (comma separated)")
        story = st.text_area("Your Story")
        contact_phone = st.text_input("Contact Phone")
        contact_email = st.text_input("Contact Email")
        user_id = st.text_input("Your User ID (from Supabase auth)")
        if st.button("Submit Artisan Profile"):
            if not user_id:
                st.error("User ID is required")
            else:
                payload = {
                    "artisan_id": user_id,
                    "display_name": name,
                    "address": address,
                    "lat": float(lat) if lat else None,
                    "lon": float(lon) if lon else None,
                    "skills": [s.strip() for s in skills.split(',')] if skills else [],
                    "story": story,
                    "contact_info": {"phone": contact_phone, "email": contact_email}
                }
                res = sb.table("artisans").upsert(payload).execute()
                if getattr(res, 'error', None):
                    st.error(str(res.error))
                else:
                    st.success("Artisan profile submitted. Awaiting verification.")

with tab2:
    st.subheader("Post a Product")
    if not sb:
        st.warning("Supabase client not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.")
    else:
        artisan_id = st.text_input("Your User ID (artisan)")
        title = st.text_input("Product Title")
        description = st.text_area("Description")
        category = st.text_input("Category")
        price = st.number_input("Price", min_value=0.0, step=0.5)
        stock = st.number_input("Stock", min_value=0, step=1)
        file = st.file_uploader("Upload Image", type=["jpg","jpeg","png"])
        if st.button("Create Product"):
            if not artisan_id or not title:
                st.error("artisan_id and title are required")
            else:
                image_paths = []
                if file is not None:
                    ext = os.path.splitext(file.name)[1]
                    object_path = f"{artisan_id}/{uuid4().hex}{ext}"
                    storage = sb.storage()
                    bucket = storage.from_("product-images")
                    up = bucket.upload(object_path, file.read(), {
                        "contentType": file.type or "image/jpeg",
                        "upsert": True
                    })
                    if getattr(up, 'error', None):
                        st.error(str(up.error))
                    else:
                        public_url = bucket.get_public_url(object_path)
                        image_paths = [public_url]
                payload = {
                    "artisan_id": artisan_id,
                    "title": title,
                    "description": description,
                    "category": category,
                    "price": float(price) if price else None,
                    "stock": int(stock),
                    "images": image_paths
                }
                res = sb.table("products").insert(payload).execute()
                if getattr(res, 'error', None):
                    st.error(str(res.error))
                else:
                    st.success("Product posted.")

with tab3:
    st.subheader("Explore Places by State")
    if not sb:
        st.warning("Supabase client not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.")
    else:
        states = [
            "Jharkhand","Bihar","West Bengal","Odisha","Chhattisgarh","Uttar Pradesh","Maharashtra"
        ]
        state = st.selectbox("Select State", states, index=0)
        if st.button("Fetch Places"):
            service_url = os.getenv("SUPABASE_URL")
            service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if not service_url or not service_key:
                st.error("Service role key required server-side. For demo, set temporarily to test.")
            else:
                import requests
                fn = f"{service_url}/functions/v1/places-fetch"
                r = requests.post(fn, json={"state": state}, headers={"Authorization": f"Bearer {service_key}", "apikey": service_key})
                if r.ok:
                    st.success(f"Fetched: {r.json()}")
                else:
                    st.error(r.text)
        st.divider()
        if st.button("Fetch Festivals for State"):
            service_url = os.getenv("SUPABASE_URL")
            service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if not service_url or not service_key:
                st.error("Service role key required server-side.")
            else:
                import requests
                fn = f"{service_url}/functions/v1/festivals-fetch"
                r = requests.post(fn, json={"state": state}, headers={"Authorization": f"Bearer {service_key}", "apikey": service_key})
                if r.ok:
                    st.success(f"Festivals fetched: {r.json()}")
                else:
                    st.error(r.text)

        # Show places
        if sb:
            q = sb.table("places").select("name, short_desc, images").eq("state", state).limit(20).execute()
            if getattr(q, 'error', None):
                st.error(str(q.error))
            else:
                rows = getattr(q, 'data', []) or []
                for row in rows:
                    with st.container(border=True):
                        st.markdown(f"**{row.get('name')}**")
                        st.write(row.get('short_desc',''))
                        imgs = row.get('images') or []
                        if imgs:
                            st.image(imgs[0], use_column_width=True)
                        # Actions
                        cols = st.columns(3)
                        with cols[0]:
                            view_detail = st.button("Details", key=f"detail_{row.get('name')}")
                        if view_detail:
                            # fetch the selected record with id
                            dq = sb.table("places").select("place_id, name, state, lat, lon, images, long_desc").eq("name", row.get('name')).eq("state", state).limit(1).execute()
                            if getattr(dq, 'error', None) or not getattr(dq, 'data', None):
                                st.error("Failed to load place details")
                            else:
                                drow = dq.data[0]
                                import requests, json
                                service_url = os.getenv("SUPABASE_URL")
                                service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
                                if not service_url or not service_key:
                                    st.error("Server key required for detail fetch.")
                                else:
                                    fn = f"{service_url}/functions/v1/place-detail"
                                    r = requests.post(fn, json={"place_id": drow['place_id'], "state": drow.get('state')}, headers={"Authorization": f"Bearer {service_key}", "apikey": service_key})
                                    if r.ok:
                                        detail = r.json()
                                        st.markdown("---")
                                        st.markdown(f"### {detail.get('name')}")
                                        if detail.get('long_desc'):
                                            st.write(detail['long_desc'])
                                        # Actions: Route, View, Offline
                                        latv, lonv = detail.get('lat'), detail.get('lon')
                                        route_url = None
                                        if latv and lonv:
                                            route_url = f"https://www.google.com/maps/dir/?api=1&destination={latv},{lonv}"
                                            st.link_button("Open Route", route_url)
                                        # Street View / 360 (simplified: try Google Maps place URL)
                                        if latv and lonv:
                                            st.link_button("Open Map View", f"https://www.google.com/maps/@?api=1&map_action=pano&viewpoint={latv},{lonv}")
                                        # Offline bundle download
                                        bundle = {
                                            "place": detail,
                                            "images": detail.get('images') or []
                                        }
                                        st.download_button("Save Offline (JSON)", data=str(bundle).encode('utf-8'), file_name=f"{detail.get('name','place')}.json")
                                    else:
                                        st.error(r.text)

        # Show festivals (simple list; hover/tooltips approximated with expander)
        if sb:
            f = sb.table("festivals").select("date, date_pattern, short_desc, long_desc").eq("state", state).limit(50).execute()
            if getattr(f, 'error', None):
                st.error(str(f.error))
            else:
                frows = getattr(f, 'data', []) or []
                if frows:
                    st.subheader("Festivals")
                    for fr in frows:
                        with st.expander(fr.get('date') or fr.get('date_pattern') or 'Festival'):
                            st.write(fr.get('short_desc') or '')
                            if fr.get('long_desc'):
                                st.caption(fr['long_desc'])

with tab4:
    st.subheader("Nearby Places")
    if not sb:
        st.warning("Supabase client not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.")
    else:
        user_id_nb = st.text_input("Your User ID (for wishlist)")
        col = st.columns(2)
        with col[0]:
            lat0 = st.number_input("Your Latitude", value=23.36, format="%f")
        with col[1]:
            lon0 = st.number_input("Your Longitude", value=85.33, format="%f")
        radius_km = st.slider("Distance radius (km)", min_value=5, max_value=300, value=50, step=5)
        type_filter = st.multiselect("Filter by type", ["nature","historical","cultural"], default=[])
        sort_by = st.selectbox("Sort by", ["distance","name"], index=0)

        def haversine(lat1, lon1, lat2, lon2):
            R = 6371.0
            dlat = math.radians((lat2 or 0) - (lat1 or 0))
            dlon = math.radians((lon2 or 0) - (lon1 or 0))
            a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1 or 0)) * math.cos(math.radians(lat2 or 0)) * math.sin(dlon/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            return R * c

        q = sb.table("places").select("place_id, name, type, lat, lon, images, short_desc").not_.is_("lat", None).not_.is_("lon", None).limit(200).execute()
        if getattr(q, 'error', None):
            st.error(str(q.error))
        else:
            rows = getattr(q, 'data', []) or []
            # apply optional type filter
            if type_filter:
                rows = [r for r in rows if (r.get('type') or '') in type_filter]
            # compute distances
            for r in rows:
                r['distance_km'] = haversine(lat0, lon0, r.get('lat'), r.get('lon'))
            rows = [r for r in rows if r['distance_km'] <= radius_km]
            rows.sort(key=lambda x: (x['distance_km'] if sort_by == 'distance' else x.get('name','')))

            st.write(f"Results: {len(rows)} within {radius_km} km")
            for r in rows[:50]:
                with st.container(border=True):
                    st.markdown(f"**{r.get('name')}** — {r['distance_km']:.1f} km")
                    st.write(r.get('short_desc',''))
                    imgs = r.get('images') or []
                    if imgs:
                        st.image(imgs[0], use_column_width=True)
                    cols = st.columns(3)
                    with cols[0]:
                        wish = st.button("Save to wishlist", key=f"wish_{r['place_id']}")
                    if wish:
                        if not user_id_nb:
                            st.error("Enter your user ID to save wishlist.")
                        else:
                            # upsert into wishlists via service role
                            import requests
                            service_url = os.getenv("SUPABASE_URL")
                            service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
                            if not service_url or not service_key:
                                st.error("Server key not configured.")
                            else:
                                # fetch existing
                                getr = requests.get(f"{service_url}/rest/v1/wishlists?user_id=eq.{user_id_nb}", headers={"Authorization": f"Bearer {service_key}", "apikey": service_key})
                                place_ids = []
                                if getr.ok and getr.json():
                                    place_ids = getr.json()[0].get('place_ids') or []
                                if r['place_id'] not in place_ids:
                                    place_ids.append(r['place_id'])
                                upr = requests.post(f"{service_url}/rest/v1/wishlists", json={"user_id": user_id_nb, "place_ids": place_ids}, headers={"Authorization": f"Bearer {service_key}", "apikey": service_key, "Prefer": "resolution=merge-duplicates"})
                                if upr.ok:
                                    st.success("Saved to wishlist")
                                else:
                                    st.error(upr.text)


