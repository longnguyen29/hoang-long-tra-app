# Research panel — isolated preview

This is a static, offline-only Vietnamese interaction mock for the future manager research panel. It is **not wired to Next.js, the app, Supabase, a worker, a real customer, or any external URL**. All names, observations and transitions are fictitious and reset on reload. The state picker is for demonstration only. Its restrictive Content Security Policy blocks all network connections. No application route or real data is changed by opening this file.

Run `python3 -m http.server 39871 --bind 127.0.0.1 --directory tools/intelligence-preview`, then open `http://127.0.0.1:39871/` on the same machine. Stop the server afterward. It can also be opened directly as a local file.

It depicts disabled, ready, pending/cancel, processing, evidence/review, approved/rejected and failure states. Before implementation, verify real RLS/auth on staging, add accurate status and error handling, validate and safely display untrusted source URLs and excerpts, preserve idempotency, test mobile/keyboard access, and connect only to the existing saved-prospect workflow behind disabled-by-default flags. This prototype is not an approval to ship or activate a feature.
