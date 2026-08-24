// Must match ORDER_STAGES ids in public/ops/index.html exactly — the DB's `stage` check
// constraint (supabase/migrations/0028_v3_ops_stage.sql) uses the same list.
export const OPS_STAGES = [
  "new_order", "confirm_details", "prepare_materials", "production", "packing", "shipping", "completed",
];
