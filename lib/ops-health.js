// Must match the check constraints in supabase/migrations/0029_v3_order_health.sql exactly.
export const OPS_HEALTH_STATES = ["on_track", "waiting", "blocked"];
export const OPS_WAITING_ON = ["us", "customer", "supplier", "production", "carrier"];
